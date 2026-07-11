/// Fires due reminders once a minute, sharing the same cron pattern as
/// the daily quotes scheduler.
module Scheduler.Reminders

open Fable.Core
open Bindings
open Bindings.Telegraf
open Models.Reminder
open Utils

let private fire (bot: Telegraf) (reminder: Reminder) =
    promise {
        try
            let! _ = bot.telegram.sendMessage (reminder.ChatId, "⏰ Reminder: " + reminder.Text)
            Logger.info (sprintf "Reminder fired for user %.0f: %s" reminder.UserId reminder.Text)
        with ex ->
            Logger.error (sprintf "Reminder send failed for user %.0f: %s" reminder.UserId ex.Message)

        // Advance/remove even if sending failed — a permanently broken chat
        // must not make the same reminder fire forever.
        Services.Reminders.completeOccurrence reminder
    }

let start (bot: Telegraf) =
    Cron.cron.schedule (
        "* * * * *",
        fun () ->
            let nowStamp = System.DateTime.Now.ToString("yyyy-MM-dd HH:mm")

            Services.Reminders.due nowStamp
            |> Array.iter (fun r -> fire bot r |> ignore)
    )
    |> ignore

    Logger.info "Reminder scheduler started (checks every minute)"
