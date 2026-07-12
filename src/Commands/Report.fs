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
            let monthly =
                Common.commandArg ctx
                |> Option.map (fun a -> a.Trim().ToLowerInvariant() = "month" || a.Trim().ToLowerInvariant() = "monthly")
                |> Option.defaultValue false

            let window = if monthly then 30.0 else 7.0

            if not (Reports.hasActivity window user) then
                return!
                    ctx.reply
                        "Not much to report yet — log some sleep, meals, habits or workouts and I'll have a story to tell. (Weekly reports come automatically every Sunday at 20:00, monthly on the 1st.)"
            else
                Logger.info (sprintf "/report (%s) for %s" (if monthly then "monthly" else "weekly") user.FirstName)
                ctx.sendChatAction "typing" |> ignore

                let! result =
                    if monthly then
                        Ai.Reports.monthly config user.FirstName (Reports.monthlyData user)
                    else
                        Ai.Reports.weekly config user.FirstName (Reports.weeklyData user)

                let header =
                    if monthly then
                        sprintf "📊 Your month in review · score %d/100\n\n" (Reports.productivityScore user)
                    else
                        "📊 Your week in review\n\n"

                match result with
                | Ok text -> return! ctx.reply (header + text.Trim())
                | Error _ -> return! ctx.reply Common.aiUnavailable
    }
