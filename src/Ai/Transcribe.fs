/// Speech-to-text bridge (Phase 27). Downloads a Telegram voice note and
/// transcribes it with any OpenAI-compatible /audio/transcriptions endpoint
/// (Whisper). Reuses the same provider creds as vision (VISION_API_KEY /
/// VISION_BASE_URL) — on this project that's Groq. The recognised text is fed
/// straight into the existing natural-language router.
module Ai.Transcribe

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

// Node 18+ ships global FormData / Blob; multipart is what the audio API wants.
[<Emit("new FormData()")>]
let private newFormData () : obj = jsNative

[<Emit("new Blob([$0], { type: 'audio/ogg' })")>]
let private oggBlob (buffer: obj) : obj = jsNative

[<Emit("$0.append($1, $2, $3)")>]
let private appendFile (form: obj) (name: string) (value: obj) (filename: string) : unit = jsNative

[<Emit("$0.append($1, $2)")>]
let private appendField (form: obj) (name: string) (value: string) : unit = jsNative

// Groq's multilingual Whisper. One-line change if the provider/model differs.
[<Literal>]
let private model = "whisper-large-v3-turbo"

/// Voice features are on only when a provider (VISION_API_KEY) is configured.
let enabled (config: Env.AppConfig) = config.VisionApiKey.IsSome

/// Download the voice file from `audioUrl` and transcribe it. Returns the text.
let transcribe (config: Env.AppConfig) (audioUrl: string) : JS.Promise<Result<string, string>> =
    promise {
        match config.VisionApiKey with
        | None -> return Error "No transcription provider configured"
        | Some apiKey ->
            try
                let! audio = fetch audioUrl (createObj [])

                if not audio.ok then
                    return Error(sprintf "Audio download failed: HTTP %d" audio.status)
                else
                    let! buffer = audio.arrayBuffer ()

                    let form = newFormData ()
                    appendFile form "file" (oggBlob buffer) "voice.ogg"
                    appendField form "model" model

                    let options =
                        createObj
                            [ "method" ==> "POST"
                              // No Content-Type header — fetch sets the multipart boundary itself.
                              "headers" ==> createObj [ "Authorization" ==> ("Bearer " + apiKey) ]
                              "body" ==> form ]

                    let! response = fetch (config.VisionBaseUrl.TrimEnd('/') + "/audio/transcriptions") options

                    if response.ok then
                        let! payload = response.json ()
                        let text: string = !!(payload?text)

                        if isNull (box text) || text.Trim() = "" then
                            return Error "Empty transcription"
                        else
                            return Ok(text.Trim())
                    else
                        let! errBody = response.text ()
                        return Error(sprintf "Transcription HTTP %d: %s" response.status errBody)
            with ex ->
                return Error("Transcription failed: " + ex.Message)
    }
