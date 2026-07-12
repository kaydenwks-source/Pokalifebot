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
