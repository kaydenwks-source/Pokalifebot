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

let add (userId: float) (name: string) (target: float) (unit: string) (absolute: bool) : Goal =
    let goal =
        { Id = System.Guid.NewGuid().ToString().Substring(0, 8)
          UserId = userId
          Name = name.Trim()
          TargetValue = target
          Unit = unit.Trim()
          Progress = 0.0
          CreatedAt = System.DateTime.Now.ToString("yyyy-MM-dd")
          CompletedAt = None
          Steps = None
          Absolute = (if absolute then Some true else None) }

    saveAll (Array.append (getAll ()) [| goal |])
    goal

/// Ordered/position goals (chapters, lessons) log by position reached.
let isAbsolute (g: Goal) : bool = g.Absolute = Some true

let setSteps (goal: Goal) (steps: string[]) : Goal =
    let updated = { goal with Steps = Some steps }
    saveAll (getAll () |> Array.map (fun g -> if g.Id = goal.Id then updated else g))
    updated

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

/// Persist a new progress value and detect completion + milestone crossing.
let private commit (goal: Goal) (newProgress: float) : LogResult =
    let beforePct = percentOf goal
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

/// Add progress (can be negative to correct mistakes; floors at 0).
/// Marks the goal complete when the target is reached.
let logProgress (goal: Goal) (amount: float) : LogResult =
    commit goal (max 0.0 (goal.Progress + amount))

/// Set progress to an absolute position (chapter/lesson reached), clamped
/// to 0..target. Used for ordered goals: "chapter 3" -> 3/12.
let setProgress (goal: Goal) (position: float) : LogResult =
    commit goal (position |> max 0.0 |> min goal.TargetValue)

/// Apply a logged value the way the goal expects: ordered goals jump to the
/// position, cumulative goals add it up.
let applyLog (goal: Goal) (value: float) : LogResult =
    if isAbsolute goal then setProgress goal value else logProgress goal value

/// Feed progress into every ACTIVE goal measured in this unit —
/// e.g. a 5 km run advances every "km" goal automatically.
let autoProgress (userId: float) (unit: string) (amount: float) : LogResult[] =
    forUser userId
    |> Array.filter (fun g ->
        g.CompletedAt.IsNone
        && g.Unit.Trim().ToLowerInvariant() = unit.Trim().ToLowerInvariant())
    |> Array.map (fun g -> logProgress g amount)
