/// AI quote generation — the prompt lives here so tone/rules are in one place.
module Ai.Quotes

open Fable.Core
open Config
open Utils

let private systemPrompt =
    [ "You are Momentum AI, an encouraging productivity coach inside a Telegram bot."
      "Write ONE original, punchy motivational message for the category the user gives."
      "Rules: 2–4 sentences, under 60 words total."
      "Tone: direct, warm, energising — never cheesy, never shaming."
      "No hashtags, no emoji, no quotation marks, no author attribution."
      "End with one concrete action the reader can take in the next hour." ]
    |> String.concat " "

let generate (config: Env.AppConfig) (category: string) : JS.Promise<Result<string, string>> =
    promise {
        let! result =
            DeepSeek.chat config systemPrompt (sprintf "Category: %s. Write today's message." category)

        match result with
        | Ok text -> return Ok(text.Trim())
        | Error err ->
            Logger.error ("Quote generation failed: " + err)
            return Error err
    }
