/// /usage — show how much of today's AI budget is left. Transparency is the
/// friendly face of the Phase 19 cost cap: users can see the limit, not just
/// hit it.
module Commands.Account

open Fable.Core
open Fable.Core.JsInterop
open Bindings
open Bindings.Telegraf
open Services
open Utils
open Config

[<Emit("JSON.stringify($0, null, 2)")>]
let private prettyJson (value: obj) : string = jsNative

let handleUsage (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        let body =
            match Entitlements.remaining config.AdminUserId user with
            | None ->
                [ "📊 AI usage"
                  ""
                  "Unlimited ✨ (admin)"
                  "Your trackers are always unlimited too." ]
            | Some left ->
                let used = Entitlements.FreeDailyAiCap - left

                [ "📊 AI usage today"
                  ""
                  sprintf "Used: %d of %d AI requests" used Entitlements.FreeDailyAiCap
                  sprintf "Remaining: %d" left
                  "Resets at midnight, your time."
                  ""
                  "Trackers (habits, tasks, weight, workouts…) are always unlimited — only AI features count here." ]

        body |> String.concat "\n" |> ctx.reply

let handleExport (ctx: Context) : JS.Promise<obj> =
    promise {
        match Common.ensureUser ctx with
        | None -> return! ctx.reply "Sorry, I couldn't identify you — please try again."
        | Some user ->
            Logger.info (sprintf "%s requested a data export" user.FirstName)
            let json = prettyJson (UserData.export user.Id)

            let doc =
                createObj [ "source" ==> Node.bufferFrom json; "filename" ==> "momentum-export.json" ]

            let! _ = ctx.replyWithDocument doc

            return!
                ctx.reply "📦 Here's everything I have on you — every tracker, in one JSON file. It's yours to keep, move, or check."
    }

let private deleteWarning =
    [ "⚠️ This permanently deletes EVERYTHING I have on you:"
      "habits, tasks, sleep, meals, weights, workouts, goals, reminders,"
      "coach history and your settings. It cannot be undone."
      ""
      "Want a copy first? Run /export."
      ""
      "To go ahead, type:  /deleteme CONFIRM" ]
    |> String.concat "\n"

let handleDeleteMe (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        match Common.commandArg ctx |> Option.map (fun s -> s.Trim().ToUpperInvariant()) with
        | Some "CONFIRM" ->
            UserData.wipe user.Id
            Logger.info (sprintf "%s (id %.0f) deleted their account" user.FirstName user.Id)

            ctx.reply "🧹 Done. Everything has been permanently deleted. Whenever you're ready, /start begins a fresh page."
        | _ -> ctx.reply deleteWarning
