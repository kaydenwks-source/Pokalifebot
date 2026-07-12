/// Pluggable photo->text bridge. Talks to ANY OpenAI-compatible vision
/// endpoint (Gemini's compat API, Groq, OpenRouter...) configured via
/// VISION_API_KEY / VISION_BASE_URL / VISION_MODEL. The description it
/// returns feeds the existing DeepSeek FoodAnalyzer unchanged.
module Ai.Vision

open Fable.Core
open Fable.Core.JsInterop
open Config

type private FetchResponse =
    abstract ok: bool
    abstract status: int
    abstract json: unit -> JS.Promise<obj>
    abstract text: unit -> JS.Promise<string>
    abstract arrayBuffer: unit -> JS.Promise<obj>

[<Global>]
let private fetch (url: string) (options: obj) : JS.Promise<FetchResponse> = jsNative

[<Emit("Buffer.from($0).toString('base64')")>]
let private bufferToBase64 (buffer: obj) : string = jsNative

/// Photo features are on only when the user configured a provider.
let enabled (config: Env.AppConfig) = config.VisionApiKey.IsSome

/// Download an image (Telegram file URL) into a data: URI.
/// Telegram already compresses photos server-side (~1280px JPEG), so no
/// local image processing is needed.
let downloadAsDataUri (url: string) : JS.Promise<Result<string, string>> =
    promise {
        try
            let! response = fetch url (createObj [])

            if response.ok then
                let! buffer = response.arrayBuffer ()
                return Ok("data:image/jpeg;base64," + bufferToBase64 buffer)
            else
                return Error(sprintf "Image download failed: HTTP %d" response.status)
        with ex ->
            return Error("Image download failed: " + ex.Message)
    }

let private describePrompt =
    [ "Describe this photo of food for a nutritionist."
      "List every food and drink item you can identify, with estimated portion"
      "sizes (grams, pieces, cups) and preparation style (fried, steamed, grilled...)."
      "Be specific and concise — 2 to 4 sentences, no preamble."
      "If the photo contains no food or drink, reply exactly: NOT_FOOD" ]
    |> String.concat " "

/// Ask the vision model to describe the meal in the photo.
/// Returns Error "NOT_FOOD" when the image isn't food.
let describeImage
    (config: Env.AppConfig)
    (dataUri: string)
    (caption: string option)
    : JS.Promise<Result<string, string>> =
    promise {
        match config.VisionApiKey with
        | None -> return Error "No vision provider configured"
        | Some apiKey ->
            try
                let userText =
                    match caption with
                    | Some c when c.Trim() <> "" -> describePrompt + " The user added this note: " + c.Trim()
                    | _ -> describePrompt

                let body =
                    createObj
                        [ "model" ==> config.VisionModel
                          "messages"
                          ==> [| createObj
                                     [ "role" ==> "user"
                                       "content"
                                       ==> [| createObj [ "type" ==> "text"; "text" ==> userText ]
                                              createObj
                                                  [ "type" ==> "image_url"
                                                    "image_url" ==> createObj [ "url" ==> dataUri ] ] |] ] |]
                          "max_tokens" ==> 300
                          "temperature" ==> 0.2 ]

                let options =
                    createObj
                        [ "method" ==> "POST"
                          "headers"
                          ==> createObj
                                  [ "Content-Type" ==> "application/json"
                                    "Authorization" ==> ("Bearer " + apiKey) ]
                          "body" ==> JS.JSON.stringify body ]

                let! response = fetch (config.VisionBaseUrl.TrimEnd('/') + "/chat/completions") options

                if response.ok then
                    let! payload = response.json ()
                    let choices: obj[] = !!payload?choices

                    if isNull (box choices) || choices.Length = 0 then
                        return Error "Vision provider returned an empty response"
                    else
                        let content: string = !!(choices.[0]?message?content)
                        let text = content.Trim()

                        if text.Contains "NOT_FOOD" then
                            return Error "NOT_FOOD"
                        else
                            return Ok text
                else
                    let! errBody = response.text ()
                    return Error(sprintf "Vision HTTP %d: %s" response.status errBody)
            with ex ->
                return Error("Vision request failed: " + ex.Message)
    }
