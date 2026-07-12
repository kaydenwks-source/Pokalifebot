/// One logged exercise session, persisted to database/workouts.json.
module Models.Workout

/// What the AI parser extracts from a workout description.
type ParsedWorkout =
    { Exercise: string // "Bench press", "Running"...
      Kind: string // "strength" | "cardio"
      Sets: int option
      Reps: int option
      WeightKg: float option
      DurationMin: float option
      DistanceKm: float option
      Calories: int } // estimated kcal burned for the session

type WorkoutLog =
    { Id: string
      UserId: float
      Date: string // "yyyy-MM-dd"
      Time: string // "HH:mm"
      Exercise: string
      Kind: string
      Sets: int option
      Reps: int option
      WeightKg: float option
      DurationMin: float option
      DistanceKm: float option
      CaloriesBurned: int }

/// "3 sets × 8 reps @ 60.0 kg · 45 min" — whichever parts exist.
let details (l: WorkoutLog) =
    [ (match l.Sets, l.Reps with
       | Some s, Some r -> Some(sprintf "%d sets × %d reps" s r)
       | Some s, None -> Some(sprintf "%d sets" s)
       | None, Some r -> Some(sprintf "%d reps" r)
       | _ -> None)
      l.WeightKg |> Option.map (sprintf "@ %.1f kg")
      l.DistanceKm |> Option.map (sprintf "%.1f km")
      l.DurationMin |> Option.map (sprintf "%.0f min") ]
    |> List.choose id
    |> String.concat " · "
