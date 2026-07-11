/// AI sleep analysis — turns raw sleep logs into a short, supportive
/// read on patterns, consistency, and one practical suggestion.
module Ai.Sleep

open Fable.Core
open Models.Sleep
open Config
open Utils

let private systemPrompt =
    [ "You are Momentum AI's supportive sleep coach inside a Telegram bot."
      "You get a user's recent sleep log (most recent first)."
      "Reply with: the main pattern you notice, how consistent their schedule is,"
      "and ONE practical suggestion for tonight."
      "3–5 short sentences, plain text only — no emoji, no lists, no headers."
      "Be encouraging and specific; never shame the user."
      "Never give medical advice — for serious sleep problems, suggest seeing a doctor." ]
    |> String.concat " "

let analyse (config: Env.AppConfig) (logs: SleepLog[]) : JS.Promise<Result<string, string>> =
    let lines =
        logs
        |> Array.truncate 14
        |> Array.map (fun l ->
            sprintf "%s: bed %s, wake %s, slept %s" l.Date l.BedTime l.WakeTime (Time.formatDuration l.DurationMinutes))
        |> String.concat "\n"

    DeepSeek.chat config systemPrompt ("My recent sleep log (most recent first):\n" + lines)
