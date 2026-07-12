/// Meal description -> nutrition estimate via DeepSeek JSON mode.
/// Same trust model as the reminder parser: AI proposes, we validate
/// every number before storing anything.
module Ai.FoodAnalyzer

open Fable.Core
open Fable.Core.JsInterop
open Models.Meal
open Config

let private systemPrompt =
    [ "You are a nutrition estimator inside a Telegram bot."
      "Given a meal description, reply ONLY with JSON:"
      "{\"name\": string (short cleaned-up meal name), \"calories\": number (kcal),"
      "\"protein\": number, \"carbs\": number, \"fat\": number, \"sugar\": number, \"fiber\": number}"
      "(macros in grams) or {\"error\": string} if the text does not describe food or drink."
      "Estimate for the described portion; assume one medium serving when unspecified."
      "The user is in Singapore — know local and hawker dishes well"
      "(chicken rice, laksa, mee goreng, cai fan, kaya toast, kopi/teh...)."
      "Round to sensible whole-ish numbers." ]
    |> String.concat " "

let analyse (config: Env.AppConfig) (description: string) : JS.Promise<Result<Nutrition, string>> =
    promise {
        let! result = DeepSeek.chatJson config systemPrompt ("Meal: " + description)

        match result with
        | Error e -> return Error e
        | Ok raw ->
            try
                let json = JS.JSON.parse raw

                match (!!json?error: string option) with
                | Some e -> return Error e
                | None ->
                    let gram key =
                        DeepSeek.jsonNumber json key
                        |> Option.defaultValue 0.0
                        |> max 0.0
                        |> min 1000.0

                    match DeepSeek.jsonString json "name", DeepSeek.jsonNumber json "calories" with
                    | Some name, Some kcal when kcal >= 0.0 && kcal <= 6000.0 ->
                        return
                            Ok
                                { Name = name
                                  Calories = int kcal
                                  Protein = gram "protein"
                                  Carbs = gram "carbs"
                                  Fat = gram "fat"
                                  Sugar = gram "sugar"
                                  Fiber = gram "fiber" }
                    | _ -> return Error "AI returned implausible nutrition data"
            with ex ->
                return Error("Could not parse AI response: " + ex.Message)
    }
