/// DeepSeek API client (OpenAI-compatible chat completions over HTTPS).
/// Uses Node's built-in global fetch — no extra HTTP library needed.
/// Every call returns Result so callers must handle failure explicitly.
module Ai.DeepSeek

open Fable.Core
open Fable.Core.JsInterop
open Utils
open Config

type private FetchResponse =
    abstract ok: bool
    abstract status: int
    abstract json: unit -> JS.Promise<obj>
    abstract text: unit -> JS.Promise<string>

[<Global>]
let private fetch (url: string) (options: obj) : JS.Promise<FetchResponse> = jsNative

/// Send one system+user message pair to DeepSeek and get the reply text.
let chat
    (config: Env.AppConfig)
    (systemPrompt: string)
    (userMessage: string)
    : JS.Promise<Result<string, string>> =
    promise {
        try
            let body =
                createObj
                    [ "model" ==> config.DeepSeekModel
                      "messages"
                      ==> [| createObj [ "role" ==> "system"; "content" ==> systemPrompt ]
                             createObj [ "role" ==> "user"; "content" ==> userMessage ] |]
                      "temperature" ==> 0.7
                      "max_tokens" ==> 1000 ]

            let options =
                createObj
                    [ "method" ==> "POST"
                      "headers"
                      ==> createObj
                              [ "Content-Type" ==> "application/json"
                                "Authorization" ==> ("Bearer " + config.DeepSeekApiKey) ]
                      "body" ==> JS.JSON.stringify body ]

            let! response = fetch (config.DeepSeekBaseUrl + "/chat/completions") options

            if response.ok then
                let! payload = response.json ()
                let choices: obj[] = !!payload?choices

                if isNull (box choices) || choices.Length = 0 then
                    return Error "DeepSeek returned an empty response"
                else
                    let content: string = !!(choices.[0]?message?content)
                    return Ok content
            else
                let! errorBody = response.text ()
                return Error(sprintf "DeepSeek HTTP %d: %s" response.status errorBody)
        with ex ->
            return Error("DeepSeek request failed: " + ex.Message)
    }

/// Tiny request fired at startup so a bad API key or network problem
/// shows up in the logs immediately, not on the user's first /quote.
let testConnection (config: Env.AppConfig) : JS.Promise<unit> =
    promise {
        Logger.info "Testing DeepSeek connection..."
        let! result = chat config "You are a connection test." "Reply with the single word: pong"

        match result with
        | Ok reply -> Logger.info (sprintf "DeepSeek connection OK (model replied: %s)" (reply.Trim()))
        | Error err -> Logger.warn ("DeepSeek connection failed: " + err)
    }
