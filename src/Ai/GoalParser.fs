/// Free-text goal -> {name, target, unit} via DeepSeek JSON mode.
module Ai.GoalParser

open Fable.Core
open Fable.Core.JsInterop
open Config

type ParsedGoal =
    { Name: string
      Target: float
      Unit: string
      Absolute: bool } // true = ordered progress logged by position reached (chapters, lessons, levels)

let private systemPrompt =
    [ "You parse personal goals into JSON so they can be tracked with an easy,"
      "countable scale. Reply ONLY with a JSON object:"
      "{\"name\": string (short display name, e.g. \"Read 20 books\"),"
      "\"target_value\": number, \"unit\": string, \"absolute\": boolean}"
      "or {\"error\": string} if the text is not a goal."
      "Pick the most naturally loggable scale for the goal:"
      "- Reading ONE specific book -> unit \"chapters\", target_value = your best"
      "  estimate of that book's chapter count, absolute true."
      "- Ordered/step progress done in sequence (a course's lessons, game levels,"
      "  a couch-to-5k style plan) -> count the steps, absolute true."
      "- Everything cumulative (distance in km, number of books, money, hours,"
      "  sessions, reps) -> absolute false."
      "\"absolute\": true means the user logs the POSITION they've reached (e.g."
      "chapter 3 -> 3 of 12), not a running total. false means each log adds up."
      "Units are short: chapters, books, km, $, pages, hours, sessions, lessons..."
      "For yes/no goals (get a certification) use target_value 1, unit \"\", absolute false."
      "Expand shorthand numbers: \"$5k\" -> 5000."
      "Weight-loss goals should be declined with"
      "{\"error\": \"use /target for weight goals\"}." ]
    |> String.concat " "

let parse (config: Env.AppConfig) (input: string) : JS.Promise<Result<ParsedGoal, string>> =
    promise {
        let! result = DeepSeek.chatJson config systemPrompt ("Goal: " + input)

        match result with
        | Error e -> return Error e
        | Ok raw ->
            try
                let json = JS.JSON.parse raw

                match (!!json?error: string option) with
                | Some e -> return Error e
                | None ->
                    match DeepSeek.jsonString json "name", DeepSeek.jsonNumber json "target_value" with
                    | Some name, Some target when target > 0.0 && target <= 10000000.0 ->
                        return
                            Ok
                                { Name = name
                                  Target = target
                                  Unit = DeepSeek.jsonString json "unit" |> Option.defaultValue ""
                                  Absolute = DeepSeek.jsonBool json "absolute" }
                    | _ -> return Error "AI returned an implausible goal"
            with ex ->
                return Error("Could not parse AI response: " + ex.Message)
    }

let private coachPrompt =
    [ "You are Momentum AI, a supportive productivity coach."
      "Break the user's goal into EXACTLY 5 progressive, concrete, achievable"
      "steps that build from an easy first win to the finish line."
      "When the goal has a numeric target, make the steps concrete checkpoints"
      "toward it — e.g. for 10 km: 2 km, 4 km, 6 km, 8 km, 10 km."
      "Each step is ONE short actionable sentence, max 12 words."
      "Reply ONLY with JSON: {\"steps\": [string, string, string, string, string]}" ]
    |> String.concat " "

/// Coach breakdown: big goal -> 5 achievable steps.
let breakdown
    (config: Env.AppConfig)
    (goalName: string)
    (target: float)
    (unit: string)
    : JS.Promise<Result<string[], string>> =
    promise {
        let described =
            if unit = "" then goalName else sprintf "%s (target: %g %s)" goalName target unit

        let! result = DeepSeek.chatJson config coachPrompt ("Goal: " + described)

        match result with
        | Error e -> return Error e
        | Ok raw ->
            try
                let json = JS.JSON.parse raw
                let steps: string[] = !!json?steps

                if isNull (box steps) || steps.Length < 3 then
                    return Error "AI returned no usable steps"
                else
                    return Ok(steps |> Array.truncate 5 |> Array.map (fun s -> s.Trim()))
            with ex ->
                return Error("Could not parse AI response: " + ex.Message)
    }
