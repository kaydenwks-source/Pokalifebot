/// AI body-progress analysis — weight trend + calorie intake in one read.
/// The first feature where two trackers combine for real insight.
module Ai.Progress

open Fable.Core
open Models.Weight
open Config

let private systemPrompt =
    [ "You are Momentum AI's supportive body-progress coach inside a Telegram bot."
      "You get a user's recent weight/body-fat log (most recent first) and, when"
      "available, their average calorie intake."
      "Comment on the trend, connect it to the intake if provided, note something"
      "encouraging, and give ONE practical suggestion."
      "3–5 short sentences, plain text only — no emoji, no lists."
      "Never shame the user. Never give medical advice; for concerning patterns"
      "suggest talking to a doctor." ]
    |> String.concat " "

let analyse
    (config: Env.AppConfig)
    (logs: WeightLog[])
    (heightCm: float option)
    (avgDailyKcal: int option)
    : JS.Promise<Result<string, string>> =
    let entryLine (l: WeightLog) =
        let kg =
            l.Kg |> Option.map (sprintf "%.1f kg") |> Option.defaultValue "no weight"

        let fat =
            l.BodyFat
            |> Option.map (sprintf ", body fat %.1f%%")
            |> Option.defaultValue ""

        sprintf "%s: %s%s" l.Date kg fat

    let context =
        [ "My recent measurements (most recent first):"
          logs |> Array.truncate 14 |> Array.map entryLine |> String.concat "\n"
          match heightCm with
          | Some h -> sprintf "My height: %.0f cm." h
          | None -> ""
          match avgDailyKcal with
          | Some kcal -> sprintf "My average intake over the last 7 logged days: %d kcal/day." kcal
          | None -> "" ]
        |> List.filter (fun s -> s <> "")
        |> String.concat "\n"

    DeepSeek.chat config systemPrompt context
