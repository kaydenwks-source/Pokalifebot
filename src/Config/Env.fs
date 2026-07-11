/// Loads and validates configuration from environment variables (.env file).
/// All required values are checked up front so the bot fails fast with a
/// helpful message instead of crashing mid-conversation later.
module Config.Env

open Fable.Core.JsInterop
open Bindings

// Reads the .env file into process.env before anything else touches config.
importSideEffects "dotenv/config"

[<Literal>]
let Version = "0.2.0"

type AppConfig =
    { BotToken: string
      DeepSeekApiKey: string
      DeepSeekBaseUrl: string
      DeepSeekModel: string
      Environment: string }

/// Validates required variables, collecting ALL missing names at once
/// so the user can fix everything in a single pass.
let load () : Result<AppConfig, string list> =
    let botToken = Node.tryGetEnv "BOT_TOKEN"
    let apiKey = Node.tryGetEnv "DEEPSEEK_API_KEY"

    let missing =
        [ if botToken.IsNone then "BOT_TOKEN"
          if apiKey.IsNone then "DEEPSEEK_API_KEY" ]

    match botToken, apiKey with
    | Some token, Some key ->
        Ok
            { BotToken = token
              DeepSeekApiKey = key
              DeepSeekBaseUrl =
                Node.tryGetEnv "DEEPSEEK_BASE_URL"
                |> Option.defaultValue "https://api.deepseek.com"
              DeepSeekModel =
                Node.tryGetEnv "DEEPSEEK_MODEL"
                |> Option.defaultValue "deepseek-chat"
              Environment =
                Node.tryGetEnv "NODE_ENV"
                |> Option.defaultValue "development" }
    | _ -> Error missing
