/// Sunday-evening weekly reports: every active user gets their week in
/// review, generated from real tracker data by the AI coach.
module Scheduler.WeeklyReports

open Fable.Core
open Bindings
open Bindings.Telegraf
open Services
open Utils
open Config

/// Public so /report and tests can reuse the exact same pipeline.
let sendReport (config: Env.AppConfig) (bot: Telegraf) (user: Models.User.UserProfile) : JS.Promise<unit> =
    promise {
        let data = Reports.weeklyData user
        let! result = Ai.Reports.weekly config user.FirstName data

        match result with
        | Ok text ->
            try
                let! _ =
                    bot.telegram.sendMessage (user.ChatId, "📊 Your week in review\n\n" + text.Trim())

                Logger.info (sprintf "Weekly report sent to %s" user.FirstName)
            with ex ->
                Logger.error (sprintf "Weekly report send to %s failed: %s" user.FirstName ex.Message)
        | Error err -> Logger.error (sprintf "Weekly report for %s failed: %s" user.FirstName err)
    }

let start (config: Env.AppConfig) (bot: Telegraf) =
    // Sundays 20:00 server time — end-of-week, before the new week starts.
    Cron.cron.schedule (
        "0 20 * * 0",
        fun () ->
            Users.getAll ()
            |> Array.filter (fun u -> Users.nudgesOn u && Reports.hasRecentActivity u)
            |> Array.iter (fun u -> sendReport config bot u |> ignore)
    )
    |> ignore

    Logger.info "Weekly report scheduler started (Sundays 20:00)"
