/// Application entry point: load config, build the bot, connect to
/// Telegram, verify DeepSeek, then start long polling.
module Index

open Bindings
open Utils
open Config

let private start (config: Env.AppConfig) =
    promise {
        Logger.info (sprintf "Momentum AI v%s starting in %s mode" Env.Version config.Environment)

        // Restore the database from Neon BEFORE anything opens SQLite, so an
        // ephemeral-disk host (Render) comes back with the previous data.
        do! Services.Cloud.restore ()

        // Open the HTTP port the free host requires + the keep-alive pinger hits.
        Server.start ()

        let bot = Bot.create config
        Scheduler.DailyQuotes.start config bot
        Scheduler.Reminders.start bot
        Scheduler.HabitNudges.start bot
        Scheduler.WeeklyReports.start config bot
        Scheduler.MonthlyReports.start config bot
        Scheduler.Backups.start ()

        // In production, save a snapshot to Neon every 2 minutes so a crash
        // loses at most a couple of minutes. No-op locally.
        if Services.Cloud.enabled () then
            Node.setInterval 120000 (fun () -> Services.Cloud.snapshot () |> ignore)
            |> ignore

        // Graceful shutdown: snapshot to Neon first, then stop and exit. This
        // is the main durability guarantee — Render sends SIGTERM before every
        // restart, deploy and idle spin-down.
        let shutdown (reason: string) =
            promise {
                Logger.info (sprintf "Received %s — saving a final snapshot then shutting down." reason)
                do! Services.Cloud.snapshot ()
                bot.stop reason
                Node.nodeProcess.exit 0
            }
            |> ignore

        Node.nodeProcess.once ("SIGINT", fun _ -> shutdown "SIGINT")
        Node.nodeProcess.once ("SIGTERM", fun _ -> shutdown "SIGTERM")

        // Fail fast with a clear message if the Telegram token is bad.
        let! me = bot.telegram.getMe ()
        Logger.info (sprintf "Connected to Telegram as @%s" me.username)

        // Non-blocking: the bot starts even if DeepSeek is briefly down.
        Ai.DeepSeek.testConnection config |> ignore

        do! bot.launch (fun () ->
            Logger.info "Bot is live — send /start to it in Telegram. Press Ctrl+C to stop.")
    }

let private main () =
    // Surface every unhandled promise rejection in the logs.
    Node.nodeProcess.on ("unhandledRejection", fun reason ->
        Logger.error (sprintf "Unhandled promise rejection: %O" reason))

    match Env.load () with
    | Error missing ->
        Logger.error "Cannot start — missing required environment variables:"
        missing |> List.iter (fun name -> Logger.error ("  • " + name))
        Logger.error "Fix: copy .env.example to .env and fill in the values."
        Node.nodeProcess.exit 1
    | Ok config ->
        start config
        |> Promise.catch (fun ex ->
            Logger.error ("Fatal startup error: " + ex.Message)
            Node.nodeProcess.exit 1)
        |> ignore

main ()
