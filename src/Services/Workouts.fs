/// Workout persistence and personal-record math.
module Services.Workouts

open Models.Workout

let private filePath = "database/workouts.json"

let getAll () : WorkoutLog[] =
    Storage.load<WorkoutLog[]> filePath |> Option.defaultValue [||]

let private saveAll (logs: WorkoutLog[]) = Storage.save filePath logs

/// A user's workouts, newest first.
let forUser (userId: float) : WorkoutLog[] =
    getAll ()
    |> Array.filter (fun l -> l.UserId = userId)
    |> Array.sortByDescending (fun l -> l.Date + " " + l.Time)

let onDate (userId: float) (date: string) : WorkoutLog[] =
    getAll ()
    |> Array.filter (fun l -> l.UserId = userId && l.Date = date)
    |> Array.sortBy (fun l -> l.Time)

let add (userId: float) (p: ParsedWorkout) : WorkoutLog =
    let now = System.DateTime.Now

    let log =
        { Id = System.Guid.NewGuid().ToString().Substring(0, 8)
          UserId = userId
          Date = now.ToString("yyyy-MM-dd")
          Time = now.ToString("HH:mm")
          Exercise = p.Exercise
          Kind = p.Kind
          Sets = p.Sets
          Reps = p.Reps
          WeightKg = p.WeightKg
          DurationMin = p.DurationMin
          DistanceKm = p.DistanceKm
          CaloriesBurned = p.Calories }

    saveAll (Array.append (getAll ()) [| log |])
    log

type Bests =
    { Exercise: string
      BestKg: float option
      BestKm: float option }

/// Best weight/distance for an exercise, optionally excluding one log id
/// (so a fresh entry can be compared against "everything before it").
let bestsFor (userId: float) (exercise: string) (excludeId: string) : Bests =
    let history =
        forUser userId
        |> Array.filter (fun l ->
            l.Exercise.ToLowerInvariant() = exercise.Trim().ToLowerInvariant()
            && l.Id <> excludeId)

    let maxOf (pick: WorkoutLog -> float option) =
        let values = history |> Array.choose pick
        if values.Length = 0 then None else Some(Array.max values)

    { Exercise = exercise
      BestKg = maxOf (fun l -> l.WeightKg)
      BestKm = maxOf (fun l -> l.DistanceKm) }

/// Current personal bests across every exercise the user has logged.
let allBests (userId: float) : Bests[] =
    forUser userId
    |> Array.map (fun l -> l.Exercise.ToLowerInvariant())
    |> Array.distinct
    |> Array.map (fun ex ->
        // Use the original casing of the most recent log for display.
        let display =
            forUser userId
            |> Array.find (fun l -> l.Exercise.ToLowerInvariant() = ex)

        bestsFor userId display.Exercise "")
