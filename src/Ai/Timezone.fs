/// Turn a place (country, state, or city) into a UTC offset, via DeepSeek
/// JSON mode with F# validating the result. Lets onboarding ask the natural
/// question "what country are you in?" instead of demanding a raw offset.
module Ai.Timezone

open Fable.Core
open Fable.Core.JsInterop
open Config

let private systemPrompt =
    [ "You convert a place (country, state, or city) to its standard UTC offset."
      "Reply ONLY with JSON: {\"offset_minutes\": integer} — the place's"
      "STANDARD-time offset from UTC in minutes. Examples: Singapore 480,"
      "India 330, United Kingdom 0, New York -300, California -480, Japan 540."
      "Ignore daylight saving. For a country spanning multiple time zones, use"
      "its most populous / capital zone. If you cannot identify a real place,"
      "reply {\"error\": \"unknown place\"}." ]
    |> String.concat " "

/// Resolve a free-text location to UTC offset minutes (validated -720..+840,
/// on a 15-minute grid to reject nonsense).
let resolveOffset (config: Env.AppConfig) (place: string) : JS.Promise<Result<float, string>> =
    promise {
        let! result = DeepSeek.chatJson config systemPrompt ("Place: " + place)

        match result with
        | Error e -> return Error e
        | Ok raw ->
            try
                let json = JS.JSON.parse raw

                match (!!json?error: string option) with
                | Some e -> return Error e
                | None ->
                    match DeepSeek.jsonNumber json "offset_minutes" with
                    | Some m when m >= -720.0 && m <= 840.0 && (int m) % 15 = 0 -> return Ok m
                    | _ -> return Error "implausible offset"
            with ex ->
                return Error("Could not parse AI response: " + ex.Message)
    }
