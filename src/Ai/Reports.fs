/// AI weekly report writer: raw tracker data -> warm, honest review.
module Ai.Reports

open Fable.Core
open Config

let private systemPrompt =
    [ "You are Momentum AI writing a user's weekly review inside a Telegram bot."
      "You get their real tracker data for the last 7 days. Use the actual numbers."
      "Structure (plain text, exactly these section headers):"
      "🏆 Wins — 2 to 4 short bullet lines celebrating what went well."
      "🔍 Worth attention — 1 to 3 short bullet lines, honest but kind."
      "💡 Next week — 1 or 2 concrete, specific suggestions."
      "Bullets start with '• '. Maximum ~180 words total."
      "Warm and direct; never shaming; no medical advice."
      "If a tracker has no data, you may gently suggest using it — at most once." ]
    |> String.concat " "

let weekly
    (config: Env.AppConfig)
    (firstName: string)
    (data: string)
    : JS.Promise<Result<string, string>> =
    DeepSeek.chat config systemPrompt (sprintf "User: %s. Their last 7 days:\n%s" firstName data)

let private monthlyPrompt =
    [ "You are Momentum AI writing a user's monthly review inside a Telegram bot."
      "You get their real tracker data for the last 30 days, including week-by-week"
      "trends and a deterministic productivity score (0-100) computed from behaviour."
      "Structure (plain text, exactly these section headers):"
      "📈 Big picture — 2-3 lines on the overall trajectory; mention the score and what drives it."
      "🏆 Wins — 3-4 short bullet lines."
      "🔍 Patterns — 2-3 bullet lines about trends across the weeks (improving? slipping? consistent?)."
      "💡 Next month — 2 concrete, specific focuses."
      "Bullets start with '• '. Maximum ~220 words."
      "Use the actual numbers. Warm and honest, never shaming, no medical advice." ]
    |> String.concat " "

let monthly
    (config: Env.AppConfig)
    (firstName: string)
    (data: string)
    : JS.Promise<Result<string, string>> =
    DeepSeek.chat config monthlyPrompt (sprintf "User: %s. Their last 30 days:\n%s" firstName data)
