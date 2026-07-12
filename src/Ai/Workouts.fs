/// Workout AI: natural-language parsing (JSON mode) + training tips.
module Ai.Workouts

open Fable.Core
open Fable.Core.JsInterop
open Models.Workout
open Config

let private parserPrompt (userWeightKg: float option) =
    let weight =
        userWeightKg
        |> Option.map (sprintf "%.0f")
        |> Option.defaultValue "70"

    [ "You parse workout descriptions into JSON. Reply ONLY with a JSON object:"
      "{\"exercise\": string (short capitalised name), \"kind\": \"strength\"|\"cardio\","
      "\"sets\": int|null, \"reps\": int|null, \"weight_kg\": number|null,"
      "\"duration_min\": number|null, \"distance_km\": number|null,"
      "\"calories\": int (estimated kcal burned for the whole session)}"
      "or {\"error\": string} if the text does not describe physical exercise."
      sprintf "Assume the user weighs %s kg when estimating calories." weight
      "IMPORTANT: if the user states a measured calorie number (from a fitness"
      "tracker, smartwatch, or machine display), use that EXACT number instead of estimating."
      "Convert units: lbs -> kg, miles -> km. \"3x8\" means 3 sets of 8 reps."
      "For multi-exercise descriptions, use the main exercise and total calories." ]
    |> String.concat " "

let parse
    (config: Env.AppConfig)
    (userWeightKg: float option)
    (input: string)
    : JS.Promise<Result<ParsedWorkout, string>> =
    promise {
        let! result = DeepSeek.chatJson config (parserPrompt userWeightKg) ("Workout: " + input)

        match result with
        | Error e -> return Error e
        | Ok raw ->
            try
                let json = JS.JSON.parse raw

                match (!!json?error: string option) with
                | Some e -> return Error e
                | None ->
                    let num key lo hi =
                        DeepSeek.jsonNumber json key
                        |> Option.filter (fun v -> v >= lo && v <= hi)

                    let kind =
                        match DeepSeek.jsonString json "kind" with
                        | Some "cardio" -> "cardio"
                        | Some "strength" -> "strength"
                        | _ ->
                            // Fall back on the shape of the data.
                            if (DeepSeek.jsonNumber json "distance_km").IsSome then "cardio" else "strength"

                    match DeepSeek.jsonString json "exercise", num "calories" 0.0 3000.0 with
                    | Some exercise, Some kcal ->
                        return
                            Ok
                                { Exercise = exercise
                                  Kind = kind
                                  Sets = num "sets" 1.0 50.0 |> Option.map int
                                  Reps = num "reps" 1.0 500.0 |> Option.map int
                                  WeightKg = num "weight_kg" 0.5 600.0
                                  DurationMin = num "duration_min" 1.0 1000.0
                                  DistanceKm = num "distance_km" 0.1 500.0
                                  Calories = int kcal }
                    | _ -> return Error "AI returned an implausible workout"
            with ex ->
                return Error("Could not parse AI response: " + ex.Message)
    }

let private tipsPrompt =
    [ "You are Momentum AI's supportive fitness coach inside a Telegram bot."
      "You get a user's recent workout log (most recent first)."
      "Comment on their training balance (muscle groups, cardio vs strength mix),"
      "note something encouraging, and give ONE specific suggestion for the next session."
      "3–4 short sentences, plain text, no emoji, no lists."
      "Never shame the user; no medical advice." ]
    |> String.concat " "

let tips (config: Env.AppConfig) (logs: WorkoutLog[]) : JS.Promise<Result<string, string>> =
    let lines =
        logs
        |> Array.truncate 15
        |> Array.map (fun l -> sprintf "%s: %s (%s) %s, ~%d kcal" l.Date l.Exercise l.Kind (details l) l.CaloriesBurned)
        |> String.concat "\n"

    DeepSeek.chat config tipsPrompt ("My recent workouts (most recent first):\n" + lines)
