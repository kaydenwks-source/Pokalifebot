/// Daily quote delivery: a cron job ticks once per minute and sends a
/// fresh AI quote to every user whose chosen time just arrived. The chosen
/// time is matched against each user's own local clock (Phase 14).
module Scheduler.DailyQuotes

open Fable.Core
open Bindings
open Bindings.Telegraf
open Models.User
open Services
open Utils
open Config

let private sendTo (config: Env.AppConfig) (bot: Telegraf) (user: UserProfile) =
    promise {
        let! result = Ai.Quotes.generate config user.QuoteCategory

        match result with
        | Ok quote ->
            let message = sprintf "🌅 Good morning, %s!\n\n%s" user.FirstName quote
            let! _ = bot.telegram.sendMessage (user.ChatId, message)
            Logger.info (sprintf "Daily quote sent to %s" user.FirstName)
        | Error err ->
            Logger.error (sprintf "Daily quote for %s failed: %s" user.FirstName err)
    }

let start (config: Env.AppConfig) (bot: Telegraf) =
    Cron.cron.schedule (
        "* * * * *",
        fun () ->
            Users.withDailyQuote ()
            |> Array.filter (fun u ->
                let now = (Time.userNow u.TzOffsetMinutes).ToString("HH:mm")
                u.QuoteTime = Some now)
            |> Array.iter (fun u -> sendTo config bot u |> ignore)
    )
    |> ignore

    Logger.info "Daily quote scheduler started (checks every minute)"
