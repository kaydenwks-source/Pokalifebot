/// AI encouragement for habit milestones. Only milestone streaks get an
/// AI call — regular check-ins use instant local praise (fast + cheap).
module Ai.Encourage

open Fable.Core
open Config
open Models.Habit

/// Streaks worth celebrating with a personalised AI message.
/// (66 days is the average habit-formation time — a fun one to hit.)
let milestone (streak: int) =
    List.contains streak [ 3; 7; 14; 21; 30; 50; 66; 100 ]

let private systemPrompt =
    [ "You are Momentum AI, an encouraging productivity coach inside a Telegram bot."
      "A user just hit a habit streak milestone. Write ONE short congratulation."
      "Max 2 sentences. Energetic and specific to the habit and streak length."
      "No hashtags, at most one emoji, never cheesy corporate speak." ]
    |> String.concat " "

let generate
    (config: Env.AppConfig)
    (habitName: string)
    (cadence: string)
    (streak: int)
    : JS.Promise<Result<string, string>> =
    DeepSeek.chat
        config
        systemPrompt
        (sprintf "Habit: %s. Streak: %d %s in a row." habitName streak (Cadence.streakUnit cadence streak))
