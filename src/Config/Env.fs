/// Loads and validates configuration from environment variables (.env file).
/// All required values are checked up front so the bot fails fast with a
/// helpful message instead of crashing mid-conversation later.
module Config.Env

open Fable.Core.JsInterop
open Bindings

// Reads the .env file into process.env before anything else touches config.
importSideEffects "dotenv/config"

[<Literal>]
let Version = "0.24.1"

type AppConfig =
    { BotToken: string
      DeepSeekApiKey: string
      DeepSeekBaseUrl: string
      DeepSeekModel: string
      Environment: string
      AdminUserId: float option
      // Optional OpenAI-compatible vision provider (photo food logging).
      VisionApiKey: string option
      VisionBaseUrl: string
      VisionModel: string }

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
                |> Option.defaultValue "development"
              AdminUserId =
                Node.tryGetEnv "ADMIN_USER_ID"
                |> Option.bind (fun raw ->
                    match System.Double.TryParse raw with
                    | true, v -> Some v
                    | _ -> None)
              VisionApiKey = Node.tryGetEnv "VISION_API_KEY"
              VisionBaseUrl =
                Node.tryGetEnv "VISION_BASE_URL"
                |> Option.defaultValue "https://generativelanguage.googleapis.com/v1beta/openai"
              VisionModel =
                Node.tryGetEnv "VISION_MODEL"
                // 2.0-flash has zero free-tier quota now; 2.5-flash works
                |> Option.defaultValue "gemini-2.5-flash" }
    | _ -> Error missing
