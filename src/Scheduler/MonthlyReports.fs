/// Monthly deep-dive report, sent on the 1st of each month at 09:00.
module Scheduler.MonthlyReports

open Fable.Core
open Bindings
open Bindings.Telegraf
open Services
open Utils
open Config

let sendReport (config: Env.AppConfig) (bot: Telegraf) (user: Models.User.UserProfile) : JS.Promise<unit> =
    promise {
        let data = Reports.monthlyData user
        let! result = Ai.Reports.monthly config user.FirstName data

        match result with
        | Ok text ->
            try
                let header =
                    sprintf "📊 Your month in review · score %d/100\n\n" (Reports.productivityScore user)

                let! _ = bot.telegram.sendMessage (user.ChatId, header + text.Trim())
                Logger.info (sprintf "Monthly report sent to %s" user.FirstName)
            with ex ->
                Logger.error (sprintf "Monthly report send to %s failed: %s" user.FirstName ex.Message)
        | Error err -> Logger.error (sprintf "Monthly report for %s failed: %s" user.FirstName err)
    }

let start (config: Env.AppConfig) (bot: Telegraf) =
    Cron.cron.schedule (
        "* * * * *",
        fun () ->
            Users.getAll ()
            |> Array.filter (fun u ->
                let now = Time.userNow u.TzOffsetMinutes
                now.Day = 1 && now.ToString("HH:mm") = "09:00")
            |> Array.filter (fun u -> Users.nudgesOn u && Reports.hasActivity 30.0 u)
            |> Array.iter (fun u -> sendReport config bot u |> ignore)
    )
    |> ignore

    Logger.info "Monthly report scheduler started (per-user 1st of month, 09:00)"
