/// Handlers for the Phase 1 commands: /start, /help, /ping, /version.
/// Each handler logs who invoked it, then replies. Handlers return the
/// reply promise so Telegraf can await them.
module Commands.Basic

open Fable.Core
open Bindings
open Bindings.Telegraf
open Utils
open Config

let private displayName (ctx: Context) =
    ctx.from
    |> Option.map (fun u -> u.first_name)
    |> Option.defaultValue "there"

let private logCommand (name: string) (ctx: Context) =
    let who =
        ctx.from
        |> Option.map (fun u ->
            let username =
                u.username
                |> Option.map (sprintf "@%s")
                |> Option.defaultValue "no username"

            sprintf "%s (%s, id %.0f)" u.first_name username u.id)
        |> Option.defaultValue "unknown user"

    Logger.info (sprintf "/%s from %s" name who)

let private helpText =
    [ "📋 Available commands"
      ""
      "/start — introduction and welcome"
      "/help — show this list"
      "/ping — check that I'm alive"
      "/version — current bot version"
      ""
      "Coming soon: daily quotes, habit tracking, sleep coaching and more." ]
    |> String.concat "\n"

let private startText name =
    [ sprintf "Hey %s, welcome to Momentum AI 👋" name
      ""
      "I'm your personal productivity coach. Over the coming updates I'll help you with:"
      "• Morning motivation and daily planning"
      "• Habit, sleep, meal and workout tracking"
      "• Personalised AI coaching and weekly reports"
      ""
      "Type /help to see what I can do right now." ]
    |> String.concat "\n"

let private formatUptime (totalSeconds: float) =
    let s = int totalSeconds
    sprintf "%dh %dm %ds" (s / 3600) ((s % 3600) / 60) (s % 60)

let handleStart (ctx: Context) =
    logCommand "start" ctx
    ctx.reply (startText (displayName ctx))

let handleHelp (ctx: Context) =
    logCommand "help" ctx
    ctx.reply helpText

let handlePing (ctx: Context) =
    logCommand "ping" ctx

    ctx.reply (
        sprintf "🏓 Pong! I'm alive.\nUptime: %s" (formatUptime (Node.nodeProcess.uptime ()))
    )

let handleVersion (ctx: Context) =
    logCommand "version" ctx
    ctx.reply (sprintf "Momentum AI v%s — Phase 1 (project setup)" Env.Version)
