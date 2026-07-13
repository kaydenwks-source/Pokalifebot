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

/// Shared request core. extraBody entries are appended last, so they
/// override the defaults (later keys win inside createObj).
let private request
    (config: Env.AppConfig)
    (extraBody: (string * obj) list)
    (messages: obj[])
    : JS.Promise<Result<string, string>> =
    promise {
        try
            let body =
                createObj (
                    [ "model" ==> config.DeepSeekModel
                      "messages" ==> messages
                      "temperature" ==> 0.7
                      "max_tokens" ==> 1000 ]
                    @ extraBody
                )

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

let private pair (systemPrompt: string) (userMessage: string) =
    [| createObj [ "role" ==> "system"; "content" ==> systemPrompt ]
       createObj [ "role" ==> "user"; "content" ==> userMessage ] |]

/// Send one system+user message pair to DeepSeek and get the reply text.
let chat (config: Env.AppConfig) (systemPrompt: string) (userMessage: string) =
    request config [] (pair systemPrompt userMessage)

/// Same, but forces a strict JSON object reply (for parsers/extractors).
/// Low temperature: parsing wants determinism, not creativity.
let chatJson (config: Env.AppConfig) (systemPrompt: string) (userMessage: string) =
    request
        config
        [ "response_format" ==> createObj [ "type" ==> "json_object" ]
          "temperature" ==> 0.2 ]
        (pair systemPrompt userMessage)

/// Multi-turn chat: `turns` are (role, content) pairs — "user"/"assistant"
/// alternating — appended after the system prompt. Powers /coach.
let chatMulti (config: Env.AppConfig) (systemPrompt: string) (turns: (string * string)[]) =
    let messages =
        Array.append
            [| createObj [ "role" ==> "system"; "content" ==> systemPrompt ] |]
            (turns
             |> Array.map (fun (role, content) -> createObj [ "role" ==> role; "content" ==> content ]))

    request config [] messages

// ── JSON field helpers shared by all parser modules ─────────────────

/// Read a numeric field from parsed JSON; rejects strings and NaN.
let jsonNumber (json: obj) (key: string) : float option =
    let v: obj = json?(key)

    if jsTypeof v = "number" then
        let f = unbox<float> v
        if f = f then Some f else None // NaN fails self-equality
    else
        None

/// Read a boolean field from parsed JSON; missing or non-bool -> false.
let jsonBool (json: obj) (key: string) : bool =
    let v: obj = json?(key)
    jsTypeof v = "boolean" && unbox<bool> v

/// Read a non-empty string field from parsed JSON.
let jsonString (json: obj) (key: string) : string option =
    let v: obj = json?(key)

    if jsTypeof v = "string" then
        let s = (unbox<string> v).Trim()
        if s = "" then None else Some s
    else
        None

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
