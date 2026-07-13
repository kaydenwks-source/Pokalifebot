/// Voice input (Phase 27). A voice note is transcribed (Whisper via Groq) and
/// the recognised text is routed through the same natural-language intent
/// router as typed messages — so "ate chicken rice and did gym" logs a meal
/// and a workout hands-free.
module Commands.Voice

open Fable.Core
open Fable.Core.JsInterop
open Bindings.Telegraf
open Services
open Utils
open Config

[<Literal>]
let private maxDurationSeconds = 120.0

let handle (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    promise {
        match Common.ensureUser ctx, (ctx.message |> Option.bind (fun m -> m.voice)) with
        | Some user, Some voice ->
            if not (Ai.Transcribe.enabled config) then
                return!
                    ctx.reply "🎙 Voice notes aren't switched on yet (they need a transcription provider). Type it instead and I'll handle it."
            elif voice.duration > maxDurationSeconds then
                return! ctx.reply "🎙 That note's a bit long — keep voice messages under 2 minutes so I can transcribe them cleanly."
            else
                ctx.sendChatAction "typing" |> ignore

                let! linkObj = ctx.telegram.getFileLink voice.file_id
                let url: string = !!(linkObj?href)
                let! transcribed = Ai.Transcribe.transcribe config url

                match transcribed with
                | Error err ->
                    Logger.warn ("Voice transcription failed: " + err)
                    return! ctx.reply "🎙 I couldn't make out that voice note — try again, or type it instead."
                | Ok text ->
                    Logger.info (sprintf "%s voice → \"%s\"" user.FirstName text)
                    // Show what was heard, then route it exactly like typed text.
                    let! _ = ctx.reply (sprintf "🎙 Heard: \"%s\"" text)
                    return! Commands.NaturalLanguage.route config user text ctx
        | _ -> return box ()
    }
