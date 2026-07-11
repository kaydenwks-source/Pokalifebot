/// Application entry point: load config, build the bot, connect to
/// Telegram, verify DeepSeek, then start long polling.
module Index

open Bindings
open Utils
open Config

let private start (config: Env.AppConfig) =
    promise {
        Logger.info (sprintf "Momentum AI v%s starting in %s mode" Env.Version config.Environment)

        let bot = Bot.create config
        Scheduler.DailyQuotes.start config bot
        Scheduler.Reminders.start bot

        // Graceful shutdown on Ctrl+C or a kill signal.
        Node.nodeProcess.once ("SIGINT", fun _ ->
            Logger.info "Received SIGINT — shutting down."
            bot.stop "SIGINT")

        Node.nodeProcess.once ("SIGTERM", fun _ ->
            Logger.info "Received SIGTERM — shutting down."
            bot.stop "SIGTERM")

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
