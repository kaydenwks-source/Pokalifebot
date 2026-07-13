/// Natural-language reminder parsing: "every monday 8am gym" ->
/// structured {text, date, time, repeat}. DeepSeek proposes (JSON mode),
/// our own validators verify — AI output is never trusted blindly.
module Ai.ReminderParser

open Fable.Core
open Fable.Core.JsInterop
open Config
open Utils

type ParsedReminder =
    { Text: string
      Date: string // "yyyy-MM-dd"
      Time: string // "HH:mm"
      Repeat: string } // once | daily | weekly | monthly | days:N

let private validRepeat (r: string) =
    match r with
    | "once"
    | "daily"
    | "weekly"
    | "monthly" -> true
    | s when s.StartsWith "days:" ->
        match System.Int32.TryParse (s.Substring 5) with
        | true, n -> n >= 1 && n <= 365
        | _ -> false
    | _ -> false

let private validDate (d: string) =
    try
        System.DateTime.Parse(d).ToString("yyyy-MM-dd") = d
    with _ ->
        false

let private systemPrompt (now: System.DateTime) =
    [ sprintf
          "You parse reminder requests into JSON. Current local datetime: %s (%s)."
          (now.ToString("yyyy-MM-dd HH:mm"))
          (Time.dayName now)
      "Reply ONLY with a JSON object, nothing else."
      "Shape: {\"text\": string, \"date\": \"yyyy-MM-dd\", \"time\": \"HH:mm\", \"repeat\": \"once\"|\"daily\"|\"weekly\"|\"monthly\"|\"days:N\"}"
      "or {\"error\": string} if the request contains no parseable schedule."
      "\"text\" is what to remind about, with the time expression removed; keep the user's wording."
      "\"date\" and \"time\" are the FIRST occurrence and must be in the future."
      "Rules: no time given -> 09:00. Time already passed today and no day given -> tomorrow."
      "\"every day/morning/night\" -> daily. \"every <weekday>\" -> weekly. \"every month\" -> monthly. \"every N days\" -> days:N."
      "Relative times like \"in 2 hours\" -> compute from the current datetime." ]
    |> String.concat " "

let parse (config: Env.AppConfig) (now: System.DateTime) (input: string) : JS.Promise<Result<ParsedReminder, string>> =
    promise {
        let! result = DeepSeek.chatJson config (systemPrompt now) input

        match result with
        | Error e -> return Error e
        | Ok raw ->
            try
                let json = JS.JSON.parse raw

                match (!!json?error: string option) with
                | Some e -> return Error e
                | None ->
                    let text: string = !!json?text
                    let date: string = !!json?date
                    let time: string = !!json?time

                    let repeat =
                        match (!!json?repeat: string option) with
                        | Some r -> r
                        | None -> "once"

                    match Time.parseTime time with
                    | Some normalisedTime when validDate date && validRepeat repeat && text.Trim() <> "" ->
                        return
                            Ok
                                { Text = text.Trim()
                                  Date = date
                                  Time = normalisedTime
                                  Repeat = repeat }
                    | _ -> return Error(sprintf "AI returned an invalid schedule (%s %s %s)" date time repeat)
            with ex ->
                return Error("Could not parse AI response: " + ex.Message)
    }
