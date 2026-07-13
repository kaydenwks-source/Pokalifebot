/// Gamification (Phase 23): experience points and levels. Every tracked win
/// awards a little XP; XP maps to a named level. Badges are NOT stored here —
/// they're derived from the user's real tracker data at display time (see
/// Commands/Stats), so they can never drift out of sync with reality.
module Services.Gamification

open Utils

let private filePath = "database/xp.json"

type XpRecord = { UserId: float; Xp: int }

/// XP values per action. Kept small and workout/habit-weighted so the daily
/// loop (show up, tick a habit, log a workout) is what moves the needle.
module Points =
    let Habit = 10
    let Workout = 15
    let Task = 5
    let Sleep = 5
    let Meal = 3
    let Goal = 20 // logging progress on a goal
    let GoalComplete = 100
    let Focus = 10 // completing a focus session (>= 10 min)
    let Reflect = 5 // a mood/journal check-in, once per day

let private getAll () : XpRecord[] =
    Storage.load<XpRecord[]> filePath |> Option.defaultValue [||]

let private saveAll (xs: XpRecord[]) = Storage.save filePath xs

let xpFor (userId: float) : int =
    getAll ()
    |> Array.tryFind (fun r -> r.UserId = userId)
    |> Option.map (fun r -> r.Xp)
    |> Option.defaultValue 0

/// Add XP for an action. Fire-and-forget — a scoring failure must never break
/// the underlying log the user actually cares about.
let award (userId: float) (amount: int) : unit =
    try
        // Respect the user's opt-out (defaults ON). One gate here covers every
        // earn site — habits, workouts, tasks, meals, sleep, goals.
        let enabled =
            Users.find userId
            |> Option.forall (fun u -> u.GamificationEnabled <> Some false)

        if enabled then
            let all = getAll ()

            match all |> Array.tryFind (fun r -> r.UserId = userId) with
            | Some _ -> saveAll (all |> Array.map (fun x -> if x.UserId = userId then { x with Xp = x.Xp + amount } else x))
            | None -> saveAll (Array.append all [| { UserId = userId; Xp = amount } |])
    with ex ->
        Logger.error (sprintf "Gamification.award failed: %s" ex.Message)

// Level thresholds (minimum total XP, name), ascending.
let private levels =
    [| 0, "Starter"
       50, "Mover"
       150, "Regular"
       350, "Committed"
       700, "Disciplined"
       1200, "Relentless"
       2000, "Machine" |]

type Level =
    { Index: int
      Name: string
      Floor: int // XP at which this level starts
      Next: int option } // XP needed for the next level, None at the top

let levelFor (xp: int) : Level =
    let idx =
        levels
        |> Array.mapi (fun i (threshold, _) -> i, threshold)
        |> Array.filter (fun (_, t) -> xp >= t)
        |> Array.map fst
        |> Array.fold max 0

    let floor, name = levels.[idx]
    let next = if idx + 1 < levels.Length then Some(fst levels.[idx + 1]) else None

    { Index = idx
      Name = name
      Floor = floor
      Next = next }
