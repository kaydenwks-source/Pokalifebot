/// Assembles a user's last-7-days data from every tracker into a plain
/// text block — the input for the AI weekly report (and, later, the
/// monthly report with a wider window).
module Services.Reports

open Models.User
open Utils

let private cutoffDaysAgo (days: float) =
    System.DateTime.Now.AddDays(-days).ToString("yyyy-MM-dd")

/// Whether there's anything worth reporting on (skip silent users).
let hasActivity (days: float) (user: UserProfile) : bool =
    let cutoff = cutoffDaysAgo days

    SleepLogs.forUser user.Id |> Array.exists (fun l -> l.Date > cutoff)
    || Meals.recentDailyTotals user.Id (int days) |> Array.isEmpty |> not
    || Workouts.forUser user.Id |> Array.exists (fun w -> w.Date > cutoff)
    || Habits.forUser user.Id
       |> Array.exists (fun h -> h.Completions |> Array.exists (fun c -> c > cutoff))
    || Tasks.completedSince user.Id cutoff > 0

let hasRecentActivity (user: UserProfile) : bool =
    let cutoff = cutoffDaysAgo 7.0

    SleepLogs.forUser user.Id |> Array.exists (fun l -> l.Date > cutoff)
    || Meals.recentDailyTotals user.Id 7 |> Array.isEmpty |> not
    || Workouts.forUser user.Id |> Array.exists (fun w -> w.Date > cutoff)
    || Habits.forUser user.Id
       |> Array.exists (fun h -> h.Completions |> Array.exists (fun c -> c > cutoff))
    || Tasks.completedSince user.Id cutoff > 0

let weeklyData (user: UserProfile) : string =
    let cutoff = cutoffDaysAgo 7.0

    let sleepLine =
        match SleepLogs.statsFor user.Id with
        | Some s when s.Count7 > 0 ->
            sprintf
                "Sleep: %d nights logged, average %s, %s vs 8h target"
                s.Count7
                (Time.formatDuration s.Avg7)
                (if s.Debt7 > 0 then
                     sprintf "%s short" (Time.formatDuration s.Debt7)
                 else
                     sprintf "%s surplus" (Time.formatDuration -s.Debt7))
        | _ -> "Sleep: not logged this week"

    let habitLines =
        let habits = Habits.forUser user.Id

        if habits.Length = 0 then
            "Habits: none tracked"
        else
            habits
            |> Array.map (fun h ->
                let s = Habits.streaksForHabit h
                let thisWeek = h.Completions |> Array.filter (fun c -> c > cutoff) |> Array.length
                sprintf "Habit %s (%s): %d check-ins this week, current streak %d" h.Name h.Cadence thisWeek s.Current)
            |> String.concat "\n"

    let foodLine =
        let days = Meals.recentDailyTotals user.Id 7

        if days.Length = 0 then
            "Food: nothing logged this week"
        else
            let avgEaten = (days |> Array.sumBy (fun d -> d.Calories)) / days.Length

            let targetPart =
                user.DailyKcalTarget
                |> Option.map (fun t -> sprintf ", daily target %d kcal" (int t))
                |> Option.defaultValue ""

            sprintf "Food: %d days logged, average %d kcal eaten per logged day%s" days.Length avgEaten targetPart

    let workoutLine =
        let recent = Workouts.forUser user.Id |> Array.filter (fun w -> w.Date > cutoff)

        if recent.Length = 0 then
            "Workouts: none this week"
        else
            let km = recent |> Array.choose (fun w -> w.DistanceKm) |> Array.sum
            let kcal = recent |> Array.sumBy (fun w -> w.CaloriesBurned)

            sprintf
                "Workouts: %d sessions (%s), ~%d kcal burned%s"
                recent.Length
                (recent |> Array.map (fun w -> w.Exercise) |> Array.distinct |> String.concat ", ")
                kcal
                (if km > 0.0 then sprintf ", %.1f km covered" km else "")

    let weightLine =
        match WeightLogs.weightDelta user.Id 7 with
        | Some (current, delta) -> sprintf "Weight: %.1f kg (%+.1f kg over the week)" current delta
        | None ->
            match WeightLogs.weightDelta user.Id 0 with
            | Some (current, _) -> sprintf "Weight: %.1f kg (no earlier reading to compare)" current
            | None -> "Weight: not logged"

    let taskLine =
        sprintf
            "Tasks: %d completed this week, %d still open"
            (Tasks.completedSince user.Id cutoff)
            (Tasks.openFor user.Id |> Array.length)

    let goalLines =
        let active = Goals.forUser user.Id |> Array.filter (fun g -> g.CompletedAt.IsNone)

        if active.Length = 0 then
            "Goals: none active"
        else
            active
            |> Array.map (fun g -> sprintf "Goal %s: %d%% complete" g.Name (Goals.percentOf g))
            |> String.concat "\n"

    [ sleepLine; habitLines; foodLine; workoutLine; weightLine; taskLine; goalLines ]
    |> String.concat "\n"

// ── monthly (30-day) report data ─────────────────────────────────────

/// 0 = the most recent 7 days, 1 = the week before, ...
let private weekBucket (date: string) : int =
    let d = System.DateTime.Parse date
    int ((System.DateTime.Now.Date - d.Date).TotalDays / 7.0)

/// Deterministic 0–100 behaviour score — computed from data, never by
/// the AI, so it's consistent month to month. Weights: habits 30%,
/// sleep 20%, tasks 20%, workouts 15%, food logging 15%.
let productivityScore (user: UserProfile) : int =
    let cutoff = cutoffDaysAgo 30.0

    let habitPct =
        let habits = Habits.forUser user.Id

        if habits.Length = 0 then
            0.5 // neutral when untracked
        else
            habits
            |> Array.averageBy (fun h ->
                let expected =
                    match h.Cadence with
                    | "weekly" -> 4.0
                    | "monthly" -> 1.0
                    | _ -> 30.0

                let actual =
                    h.Completions |> Array.filter (fun c -> c > cutoff) |> Array.length |> float

                min 1.0 (actual / expected))

    let taskPct =
        let completed = Tasks.completedSince user.Id cutoff |> float
        let stillOpen = Tasks.openFor user.Id |> Array.length |> float

        if completed + stillOpen = 0.0 then
            0.5
        else
            completed / (completed + stillOpen)

    let workoutPct =
        let sessions =
            Workouts.forUser user.Id
            |> Array.filter (fun w -> w.Date > cutoff)
            |> Array.length

        min 1.0 (float sessions / 12.0) // ~3/week = full marks

    let sleepPct =
        let logs =
            SleepLogs.forUser user.Id |> Array.filter (fun l -> l.Date > cutoff)

        if logs.Length = 0 then
            0.3
        else
            let logRate = min 1.0 (float logs.Length / 20.0)

            let avg =
                float (logs |> Array.sumBy (fun l -> l.DurationMinutes)) / float logs.Length

            let quality = min 1.0 (avg / 480.0)
            (logRate + quality) / 2.0

    let foodPct =
        min 1.0 (float (Meals.recentDailyTotals user.Id 30).Length / 20.0)

    int (
        System.Math.Round(
            (habitPct * 0.3 + sleepPct * 0.2 + taskPct * 0.2 + workoutPct * 0.15 + foodPct * 0.15)
            * 100.0
        )
    )

let monthlyData (user: UserProfile) : string =
    let cutoff = cutoffDaysAgo 30.0

    let sleepLogs =
        SleepLogs.forUser user.Id |> Array.filter (fun l -> l.Date > cutoff)

    let sleepLine =
        if sleepLogs.Length = 0 then
            "Sleep: not logged this month"
        else
            let avg =
                (sleepLogs |> Array.sumBy (fun l -> l.DurationMinutes)) / sleepLogs.Length

            sprintf "Sleep: %d of 30 nights logged, average %s" sleepLogs.Length (Time.formatDuration avg)

    let sleepTrend =
        if sleepLogs.Length < 4 then
            None
        else
            [ 0..3 ]
            |> List.map (fun w ->
                let ls = sleepLogs |> Array.filter (fun l -> weekBucket l.Date = w)

                if ls.Length = 0 then
                    "—"
                else
                    Time.formatDuration ((ls |> Array.sumBy (fun l -> l.DurationMinutes)) / ls.Length))
            |> String.concat " · "
            |> sprintf "Sleep avg by week (most recent first): %s"
            |> Some

    let days = Meals.recentDailyTotals user.Id 30

    let foodLine =
        if days.Length = 0 then
            "Food: nothing logged this month"
        else
            let avgEaten = (days |> Array.sumBy (fun d -> d.Calories)) / days.Length

            let targetPart =
                user.DailyKcalTarget
                |> Option.map (fun t -> sprintf ", daily target %d kcal" (int t))
                |> Option.defaultValue ""

            sprintf "Food: %d of 30 days logged, average %d kcal per logged day%s" days.Length avgEaten targetPart

    let kcalTrend =
        if days.Length < 4 then
            None
        else
            [ 0..3 ]
            |> List.map (fun w ->
                let ds = days |> Array.filter (fun d -> weekBucket d.Date = w)

                if ds.Length = 0 then
                    "—"
                else
                    sprintf "%d kcal" ((ds |> Array.sumBy (fun d -> d.Calories)) / ds.Length))
            |> String.concat " · "
            |> sprintf "Calorie avg by week (most recent first): %s"
            |> Some

    let habitLines =
        let habits = Habits.forUser user.Id

        if habits.Length = 0 then
            "Habits: none tracked"
        else
            habits
            |> Array.map (fun h ->
                let s = Habits.streaksForHabit h

                let expected =
                    match h.Cadence with
                    | "weekly" -> 4
                    | "monthly" -> 1
                    | _ -> 30

                let actual =
                    h.Completions |> Array.filter (fun c -> c > cutoff) |> Array.length

                sprintf
                    "Habit %s (%s): %d of ~%d expected check-ins (%d%%), longest streak %d"
                    h.Name
                    h.Cadence
                    actual
                    expected
                    (actual * 100 / expected)
                    s.Longest)
            |> String.concat "\n"

    let workoutLine =
        let recent =
            Workouts.forUser user.Id |> Array.filter (fun w -> w.Date > cutoff)

        if recent.Length = 0 then
            "Workouts: none this month"
        else
            let km = recent |> Array.choose (fun w -> w.DistanceKm) |> Array.sum

            sprintf
                "Workouts: %d sessions in 30 days (~%.1f per week), ~%d kcal burned%s"
                recent.Length
                (float recent.Length / 4.3)
                (recent |> Array.sumBy (fun w -> w.CaloriesBurned))
                (if km > 0.0 then sprintf ", %.1f km covered" km else "")

    let weightLine =
        match WeightLogs.weightDelta user.Id 30 with
        | Some (current, delta) -> sprintf "Weight: %.1f kg (%+.1f kg over the month)" current delta
        | None ->
            match WeightLogs.weightDelta user.Id 0 with
            | Some (current, _) -> sprintf "Weight: %.1f kg (not enough history for a monthly trend)" current
            | None -> "Weight: not logged"

    let taskLine =
        sprintf
            "Tasks: %d completed in 30 days, %d still open"
            (Tasks.completedSince user.Id cutoff)
            (Tasks.openFor user.Id |> Array.length)

    let goalLines =
        let goals = Goals.forUser user.Id

        if goals.Length = 0 then
            "Goals: none set"
        else
            let completed =
                goals
                |> Array.filter (fun g ->
                    match g.CompletedAt with
                    | Some d -> d > cutoff
                    | None -> false)

            let active = goals |> Array.filter (fun g -> g.CompletedAt.IsNone)

            [ if completed.Length > 0 then
                  sprintf
                      "Goals completed this month: %s"
                      (completed |> Array.map (fun g -> g.Name) |> String.concat ", ")
              for g in active do
                  sprintf "Goal %s: %d%% complete" g.Name (Goals.percentOf g) ]
            |> String.concat "\n"

    let scoreLine =
        sprintf "Productivity score (deterministic 0-100 from behaviour data): %d" (productivityScore user)

    // New users must be judged against their tracking age, not 30 days.
    let newUserNote =
        let earliest =
            [ yield! sleepLogs |> Array.map (fun l -> l.Date)
              yield! days |> Array.map (fun d -> d.Date)
              yield! Workouts.forUser user.Id |> Array.map (fun w -> w.Date)
              yield! Habits.forUser user.Id |> Array.collect (fun h -> h.Completions)
              yield! Goals.forUser user.Id |> Array.map (fun g -> g.CreatedAt) ]
            |> List.sort
            |> List.tryHead

        match earliest with
        | Some first ->
            let daysTracking =
                (System.DateTime.Now.Date - System.DateTime.Parse(first).Date).TotalDays |> int

            if daysTracking < 25 then
                Some(
                    sprintf
                        "IMPORTANT: the user only started tracking %d day(s) ago — judge consistency against %d days, celebrate that they started, and do NOT treat the empty earlier weeks as slipping."
                        (max 1 daysTracking)
                        (max 1 daysTracking)
                )
            else
                None
        | None -> None

    [ Some sleepLine
      sleepTrend
      Some habitLines
      Some foodLine
      kcalTrend
      Some workoutLine
      Some weightLine
      Some taskLine
      Some goalLines
      Some scoreLine
      newUserNote ]
    |> List.choose id
    |> String.concat "\n"
