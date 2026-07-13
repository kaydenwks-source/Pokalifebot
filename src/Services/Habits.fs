/// Habit persistence and streak mathematics.
///
/// Streak model: every check-in date maps to a "period index" — day number
/// for daily habits, ISO-week number for weekly, month number for monthly.
/// Consecutive periods differ by exactly 1, so a streak is just a run of
/// consecutive integers. One algorithm covers all three cadences.
module Services.Habits

open Models.Habit

let private filePath = "database/habits.json"

// ── period math (pure — unit-tested by tests/smoke-habits.mjs) ──────

let private epoch = System.DateTime(1970, 1, 1)

let private daysSinceEpoch (d: System.DateTime) : int =
    int (System.Math.Round (d.Date - epoch).TotalDays)

/// Monday=0 .. Sunday=6 (ISO weeks start on Monday).
let private mondayBasedWeekday (d: System.DateTime) =
    match d.DayOfWeek with
    | System.DayOfWeek.Sunday -> 6
    | dw -> int dw - 1

let periodIndex (cadence: string) (d: System.DateTime) : int =
    match cadence with
    | "weekly" -> (daysSinceEpoch d - mondayBasedWeekday d) / 7
    | "monthly" -> d.Year * 12 + (d.Month - 1)
    | _ -> daysSinceEpoch d // daily

type Streaks =
    { Current: int
      Longest: int
      DoneThisPeriod: bool }

let streaksFor (cadence: string) (completions: string[]) : Streaks =
    let periods =
        completions
        |> Array.map (fun s -> periodIndex cadence (System.DateTime.Parse s))
        |> Array.distinct

    if periods.Length = 0 then
        { Current = 0; Longest = 0; DoneThisPeriod = false }
    else
        let now = periodIndex cadence System.DateTime.Now
        let set = Set.ofArray periods
        let doneNow = set.Contains now

        // The current streak anchors at this period if done, else the
        // previous one — an unticked "today" shouldn't break the chain.
        let anchor =
            if doneNow then Some now
            elif set.Contains (now - 1) then Some(now - 1)
            else None

        let current =
            match anchor with
            | None -> 0
            | Some a ->
                let mutable n = 0
                let mutable p = a

                while set.Contains p do
                    n <- n + 1
                    p <- p - 1

                n

        let asc = Array.sort periods
        let mutable longest = 1
        let mutable run = 1

        for i in 1 .. asc.Length - 1 do
            if asc.[i] = asc.[i - 1] + 1 then
                run <- run + 1
                if run > longest then longest <- run
            else
                run <- 1

        { Current = current
          Longest = longest
          DoneThisPeriod = doneNow }

/// Streak view that also counts periods protected by a spent freeze token.
/// Every display path should use this, not raw streaksFor, so freezes show.
let streaksForHabit (h: Habit) : Streaks =
    let frozen = h.Frozen |> Option.defaultValue [||]
    streaksFor h.Cadence (Array.append h.Completions frozen)

/// The current ISO-week index — the freeze allowance resets each week.
let currentWeekIndex () = periodIndex "weekly" System.DateTime.Now

// ── persistence ─────────────────────────────────────────────────────

let getAll () : Habit[] =
    Storage.load<Habit[]> filePath |> Option.defaultValue [||]

let private saveAll (habits: Habit[]) = Storage.save filePath habits

let forUser (userId: float) : Habit[] =
    getAll ()
    |> Array.filter (fun h -> h.UserId = userId)
    |> Array.sortBy (fun h -> h.Name.ToLowerInvariant())

let tryFind (userId: float) (name: string) : Habit option =
    forUser userId
    |> Array.tryFind (fun h -> h.Name.ToLowerInvariant() = name.Trim().ToLowerInvariant())

type AddResult =
    | Added of Habit
    | Duplicate

let add (userId: float) (name: string) (cadence: string) : AddResult =
    match tryFind userId name with
    | Some _ -> Duplicate
    | None ->
        let habit =
            { Id = System.Guid.NewGuid().ToString().Substring(0, 8)
              UserId = userId
              Name = name.Trim()
              Cadence = cadence
              CreatedAt = System.DateTime.Now.ToString("yyyy-MM-dd")
              Completions = [||]
              Frozen = None }

        saveAll (Array.append (getAll ()) [| habit |])
        Added habit

let remove (habit: Habit) =
    saveAll (getAll () |> Array.filter (fun h -> h.Id <> habit.Id))

type DoneResult =
    | Marked of Habit * Streaks
    | MarkedWithFreeze of Habit * Streaks // a token bridged a single missed period
    | AlreadyDone of Streaks

/// A date one period before `d`, used to represent a frozen (protected) period.
let private oneBefore (cadence: string) (d: System.DateTime) =
    match cadence with
    | "weekly" -> d.AddDays -7.0
    | "monthly" -> d.AddMonths -1
    | _ -> d.AddDays -1.0

/// Check a habit off for the current period (idempotent per period). If the
/// user completed right up to a single missed period, a weekly freeze token
/// is spent automatically to protect the streak through that one gap.
let markDone (habit: Habit) : DoneResult =
    let before = streaksForHabit habit

    if before.DoneThisPeriod then
        AlreadyDone before
    else
        let now = System.DateTime.Now
        let nowP = periodIndex habit.Cadence now
        let frozen = habit.Frozen |> Option.defaultValue [||]

        let covered =
            Array.append habit.Completions frozen
            |> Array.map (fun s -> periodIndex habit.Cadence (System.DateTime.Parse s))
            |> Set.ofArray

        let maxPrev =
            let prior = covered |> Set.filter (fun p -> p < nowP)
            if Set.isEmpty prior then None else Some(Set.maxElement prior)

        let weekIdx = currentWeekIndex ()

        let freezeAvailable =
            match Users.find habit.UserId with
            | Some u -> u.FreezeWeek <> Some weekIdx
            | None -> false

        // Bridge only a single-period gap (the period immediately before now).
        let habitToSave, usedFreeze =
            match maxPrev with
            | Some p when p = nowP - 2 && freezeAvailable ->
                let repDate = (oneBefore habit.Cadence now).ToString("yyyy-MM-dd")
                Users.useFreeze habit.UserId weekIdx
                { habit with Frozen = Some(Array.append frozen [| repDate |]) }, true
            | _ -> habit, false

        let today = now.ToString("yyyy-MM-dd")

        let updated =
            { habitToSave with Completions = Array.append habitToSave.Completions [| today |] }

        saveAll (getAll () |> Array.map (fun h -> if h.Id = habit.Id then updated else h))
        Gamification.award updated.UserId Gamification.Points.Habit
        let after = streaksForHabit updated

        if usedFreeze then MarkedWithFreeze(updated, after) else Marked(updated, after)
