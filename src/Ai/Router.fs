/// Natural-language intent router (Phase 22): turn a free-text message like
/// "slept 1am woke 8am" or "ate chicken rice" into a structured intent the
/// bot can act on. DeepSeek classifies and extracts (JSON mode); F# validates
/// every field before trusting it — the same "AI proposes, F# verifies"
/// pattern used for reminders and goals.
module Ai.Router

open Fable.Core
open Fable.Core.JsInterop
open Config
open Utils

type Intent =
    | Food of string // pass the original text to the nutrition analyser
    | Sleep of bed: string * wake: string // both normalised "HH:mm"
    | Weight of float // kilograms
    | Workout of string // pass the original text to the workout parser
    | Habit of string // the habit name they completed
    | Reminder of string // pass the original text to the reminder parser
    | Coach // conversational / advice / venting → the AI coach
    | Unknown

let private systemPrompt =
    [ "You are the intent router for a personal productivity bot. Classify the user's message into exactly ONE intent and extract any needed fields."
      "Reply ONLY with a JSON object, nothing else."
      "Shape: {\"intent\": \"food|sleep|weight|workout|habit|reminder|coach|unknown\", \"bed\": \"HH:mm\", \"wake\": \"HH:mm\", \"kg\": number, \"habit\": string}"
      "Intent meanings:"
      "food = they ate or drank something and are logging it."
      "sleep = they are reporting how they slept. Convert to 24h time: \"1am\"->01:00, \"8am\"->08:00, \"11.30pm\"->23:30. Set bed and wake."
      "weight = they are stating their own body weight. Set kg in kilograms (convert from lbs/pounds if needed)."
      "workout = they did exercise or training."
      "habit = they finished a routine/habit they track. Set habit to the short habit name only (e.g. \"reading\", \"gym\", \"meditation\")."
      "reminder = they want to be reminded about something in the future."
      "coach = they want advice or motivation, are venting, or asking a question — anything conversational."
      "unknown = not actionable or too unclear to route."
      "Prefer a tracker intent when something concrete is being logged; use coach only when nothing is being logged." ]
    |> String.concat " "

let classify (config: Env.AppConfig) (input: string) : JS.Promise<Result<Intent, string>> =
    promise {
        let! result = DeepSeek.chatJson config systemPrompt input

        match result with
        | Error e -> return Error e
        | Ok raw ->
            try
                let json = JS.JSON.parse raw

                let intent =
                    (!!json?intent: string option)
                    |> Option.defaultValue "unknown"
                    |> fun s -> s.ToLowerInvariant()

                // Unrecognised extractions fall back to Coach rather than failing
                // outright — a helpful reply beats an error for ambiguous input.
                match intent with
                | "food" -> return Ok(Food input)
                | "workout" -> return Ok(Workout input)
                | "reminder" -> return Ok(Reminder input)
                | "coach" -> return Ok Coach
                | "weight" ->
                    match DeepSeek.jsonNumber json "kg" with
                    | Some kg when kg > 20.0 && kg < 400.0 -> return Ok(Weight kg)
                    | _ -> return Ok Coach
                | "sleep" ->
                    let bed = (!!json?bed: string option) |> Option.defaultValue ""
                    let wake = (!!json?wake: string option) |> Option.defaultValue ""

                    match Time.parseTime bed, Time.parseTime wake with
                    | Some b, Some w -> return Ok(Sleep(b, w))
                    | _ -> return Ok Coach
                | "habit" ->
                    let name = (!!json?habit: string option) |> Option.defaultValue ""

                    if name.Trim() <> "" then
                        return Ok(Habit(name.Trim()))
                    else
                        return Ok Coach
                | _ -> return Ok Unknown
            with ex ->
                return Error("Router parse failed: " + ex.Message)
    }
