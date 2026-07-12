/// /report — the weekly review on demand (same pipeline the Sunday
/// scheduler uses, minus the waiting).
module Commands.Report

open Fable.Core
open Bindings.Telegraf
open Services
open Utils
open Config

let handle (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    promise {
        match Common.ensureUser ctx with
        | None -> return! ctx.reply "Sorry, I couldn't identify you — please try again."
        | Some user ->
            if not (Reports.hasRecentActivity user) then
                return!
                    ctx.reply
                        "Not much to report yet — log some sleep, meals, habits or workouts this week and I'll have a story to tell. (Automatic reports come every Sunday at 20:00.)"
            else
                Logger.info (sprintf "/report for %s" user.FirstName)
                ctx.sendChatAction "typing" |> ignore
                let data = Reports.weeklyData user
                let! result = Ai.Reports.weekly config user.FirstName data

                match result with
                | Ok text -> return! ctx.reply ("📊 Your week in review\n\n" + text.Trim())
                | Error _ -> return! ctx.reply Common.aiUnavailable
    }
