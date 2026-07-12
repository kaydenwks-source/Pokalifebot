/// Goal persistence, progress math and milestone detection.
module Services.Goals

open Models.Goal

let private filePath = "database/goals.json"

let getAll () : Goal[] =
    Storage.load<Goal[]> filePath |> Option.defaultValue [||]

let private saveAll (goals: Goal[]) = Storage.save filePath goals

/// Active goals first (oldest first), completed ones after.
let forUser (userId: float) : Goal[] =
    getAll ()
    |> Array.filter (fun g -> g.UserId = userId)
    |> Array.sortBy (fun g -> (if g.CompletedAt.IsSome then 1 else 0), g.CreatedAt)

/// Display percent, capped 0..100.
let percentOf (g: Goal) : int =
    if g.TargetValue <= 0.0 then
        100
    else
        int (System.Math.Round(g.Progress * 100.0 / g.TargetValue))
        |> max 0
        |> min 100

let add (userId: float) (name: string) (target: float) (unit: string) : Goal =
    let goal =
        { Id = System.Guid.NewGuid().ToString().Substring(0, 8)
          UserId = userId
          Name = name.Trim()
          TargetValue = target
          Unit = unit.Trim()
          Progress = 0.0
          CreatedAt = System.DateTime.Now.ToString("yyyy-MM-dd")
          CompletedAt = None }

    saveAll (Array.append (getAll ()) [| goal |])
    goal

/// Delete by 1-based position in the user's sorted list (what /goals shows).
let deleteByIndex (userId: float) (index: int) : Goal option =
    let mine = forUser userId

    if index < 1 || index > mine.Length then
        None
    else
        let victim = mine.[index - 1]
        saveAll (getAll () |> Array.filter (fun g -> g.Id <> victim.Id))
        Some victim

let byIndex (userId: float) (index: int) : Goal option =
    let mine = forUser userId
    if index >= 1 && index <= mine.Length then Some mine.[index - 1] else None

/// The highest of 25/50/75/100 crossed between two percentages, if any.
let crossedMilestone (beforePct: int) (afterPct: int) : int option =
    [ 100; 75; 50; 25 ]
    |> List.tryFind (fun m -> beforePct < m && afterPct >= m)

type LogResult = { Goal: Goal; Milestone: int option }

/// Add progress (can be negative to correct mistakes; floors at 0).
/// Marks the goal complete when the target is reached.
let logProgress (goal: Goal) (amount: float) : LogResult =
    let beforePct = percentOf goal
    let newProgress = max 0.0 (goal.Progress + amount)
    let nowComplete = newProgress >= goal.TargetValue

    let updated =
        { goal with
            Progress = newProgress
            CompletedAt =
                if nowComplete && goal.CompletedAt.IsNone then
                    Some(System.DateTime.Now.ToString("yyyy-MM-dd"))
                elif not nowComplete then
                    None // corrected back below target
                else
                    goal.CompletedAt }

    saveAll (getAll () |> Array.map (fun g -> if g.Id = goal.Id then updated else g))

    { Goal = updated
      Milestone = crossedMilestone beforePct (percentOf updated) }

/// Feed progress into every ACTIVE goal measured in this unit —
/// e.g. a 5 km run advances every "km" goal automatically.
let autoProgress (userId: float) (unit: string) (amount: float) : LogResult[] =
    forUser userId
    |> Array.filter (fun g ->
        g.CompletedAt.IsNone
        && g.Unit.Trim().ToLowerInvariant() = unit.Trim().ToLowerInvariant())
    |> Array.map (fun g -> logProgress g amount)
