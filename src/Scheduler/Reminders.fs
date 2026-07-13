/// Fires due reminders once a minute, sharing the same cron pattern as
/// the daily quotes scheduler.
module Scheduler.Reminders

open Fable.Core
open Bindings
open Bindings.Telegraf
open Models.Reminder
open Services
open Utils

let private fire (bot: Telegraf) (nowStamp: string) (reminder: Reminder) =
    promise {
        try
            let! _ = bot.telegram.sendMessage (reminder.ChatId, "⏰ Reminder: " + reminder.Text)
            Logger.info (sprintf "Reminder fired for user %.0f: %s" reminder.UserId reminder.Text)
        with ex ->
            Logger.error (sprintf "Reminder send failed for user %.0f: %s" reminder.UserId ex.Message)

        // Advance/remove even if sending failed — a permanently broken chat
        // must not make the same reminder fire forever.
        Services.Reminders.completeOccurrence nowStamp reminder
    }

let start (bot: Telegraf) =
    Cron.cron.schedule (
        "* * * * *",
        fun () ->
            // Each reminder is judged against ITS OWNER'S local clock, so a
            // "9am" reminder fires at the user's 9am wherever the server runs.
            Services.Reminders.getAll ()
            |> Array.iter (fun r ->
                let tz =
                    Users.find r.UserId
                    |> Option.bind (fun u -> u.TzOffsetMinutes)

                let nowStamp = (Time.userNow tz).ToString("yyyy-MM-dd HH:mm")

                if r.DueDate + " " + r.DueTime <= nowStamp then
                    fire bot nowStamp r |> ignore)
    )
    |> ignore

    Logger.info "Reminder scheduler started (checks every minute)"
