/// Assembles a user's last-7-days data from every tracker into a plain
/// text block — the input for the AI weekly report (and, later, the
/// monthly report with a wider window).
module Services.Reports

open Models.User
open Utils

let private cutoffDaysAgo (days: float) =
    System.DateTime.Now.AddDays(-days).ToString("yyyy-MM-dd")

/// Whether there's anything worth reporting on (skip silent users).
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
                let s = Habits.streaksFor h.Cadence h.Completions
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
