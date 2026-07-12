/// Weight/body-fat persistence, trend deltas and BMI.
module Services.WeightLogs

open Models.Weight

let private filePath = "database/weights.json"

let getAll () : WeightLog[] =
    Storage.load<WeightLog[]> filePath |> Option.defaultValue [||]

let private saveAll (logs: WeightLog[]) = Storage.save filePath logs

/// A user's logs, newest first.
let forUser (userId: float) : WeightLog[] =
    getAll ()
    |> Array.filter (fun l -> l.UserId = userId)
    |> Array.sortByDescending (fun l -> l.Date)

/// Which measurement is being recorded.
type Field =
    | Weight of float
    | Fat of float

let private apply (field: Field) (log: WeightLog) =
    match field with
    | Weight kg -> { log with Kg = Some kg }
    | Fat pct -> { log with BodyFat = Some pct }

/// Record a measurement for today, merging into today's entry if one
/// exists (so /weight then /bodyfat land on the same row).
let upsertToday (userId: float) (field: Field) : WeightLog =
    let today = System.DateTime.Now.ToString("yyyy-MM-dd")
    let all = getAll ()

    match all |> Array.tryFind (fun l -> l.UserId = userId && l.Date = today) with
    | Some existing ->
        let updated = apply field existing

        saveAll (
            all
            |> Array.map (fun l -> if l.UserId = userId && l.Date = today then updated else l)
        )

        updated
    | None ->
        let fresh =
            apply
                field
                { UserId = userId
                  Date = today
                  Kg = None
                  BodyFat = None
                  MuscleKg = None }

        saveAll (Array.append all [| fresh |])
        fresh

/// Latest weight and the change vs the newest entry at least `daysAgo`
/// days old: Some (current, delta). None without enough history.
let weightDelta (userId: float) (daysAgo: int) : (float * float) option =
    let weighed = forUser userId |> Array.filter (fun l -> l.Kg.IsSome)

    match weighed |> Array.tryHead with
    | None -> None
    | Some latest ->
        let cutoff =
            System.DateTime.Now.AddDays(-(float daysAgo)).ToString("yyyy-MM-dd")

        weighed
        |> Array.filter (fun l -> l.Date <= cutoff)
        |> Array.tryHead
        |> Option.map (fun baseline -> latest.Kg.Value, latest.Kg.Value - baseline.Kg.Value)

let bmi (heightCm: float) (kg: float) : float =
    let metres = heightCm / 100.0
    kg / (metres * metres)
