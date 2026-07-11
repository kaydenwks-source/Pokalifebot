/// Builds the Telegraf bot instance and wires commands to their handlers.
/// This is the ONLY place where routing lives — new phases add their
/// command registrations here and nowhere else.
module Bot

open Bindings
open Bindings.Telegraf
open Utils
open Config

let create (config: Env.AppConfig) : Telegraf =
    let bot = Telegraf.create config.BotToken

    bot.start Commands.Basic.handleStart
    bot.help Commands.Basic.handleHelp
    bot.command ("ping", Commands.Basic.handlePing)
    bot.command ("version", Commands.Basic.handleVersion)

    // Last-resort error handler: log the failure but keep the bot running.
    bot.catch (
        System.Func<_, _, _>(fun err ctx ->
            let who =
                ctx.from
                |> Option.map (fun u -> u.first_name)
                |> Option.defaultValue "unknown user"

            Logger.error (sprintf "Update handling failed for %s: %O" who err))
    )

    bot
