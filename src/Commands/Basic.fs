/// Handlers for the Phase 1 commands: /start, /help, /ping, /version.
/// Each handler logs who invoked it, then replies. Handlers return the
/// reply promise so Telegraf can await them.
module Commands.Basic

open Fable.Core
open Fable.Core.JsInterop
open Bindings
open Bindings.Telegraf
open Utils
open Config

/// A single inline button that opens the tap-first menu (Phase 28). Just emits
/// the callback_data the Menu module listens for — no module dependency.
let private openMenuButton: obj =
    createObj
        [ "reply_markup"
          ==> createObj
                  [ "inline_keyboard"
                    ==> [| [| createObj [ "text" ==> "📱 Open the tap menu"; "callback_data" ==> "menu:home" ] |] |] ] ]

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
      "📱 /menu — tap through everything, no typing needed"
      ""
      "/start — introduction and welcome"
      "/help — show this list"
      "/ping — check that I'm alive"
      "/version — current bot version"
      ""
      "🌅 Motivation"
      "/quote — get a motivational quote now (try: /quote gym)"
      "/category — choose your preferred quote category"
      "/quotetime — daily quote at your chosen time (e.g. /quotetime 07:00)"
      ""
      "😴 Sleep"
      "/sleep 23:30 07:00 — log last night's sleep"
      "/sleep today | history | stats — entries, trends and AI analysis"
      ""
      "⏰ Reminders"
      "/remind — plain English, e.g. /remind every monday 8am gym"
      "/reminders — list them; /deletereminder <number> — remove one"
      ""
      "🔥 Habits"
      "/habit add <name> [daily|weekly|monthly] — start tracking"
      "/habit done <name> — check off; /habit list · stats · remove"
      "/nudges on|off — daily habit reminders at 08:00 and 19:00"
      ""
      "📝 Planner"
      "/task add <text> [!high|!low] [@14:00-15:30] — add a task; /task done <n>"
      "/busy add sunday 10:00-12:00 church — recurring blocks /plan respects"
      "/tasks — open tasks · /today — day at a glance · /plan — AI schedule"
      ""
      "🍽 Calories"
      "/food <meal> — log food in plain words (or send a photo!)"
      "/calories — today · /calories week · /calories month · /food undo"
      ""
      "⚖️ Body"
      "/weight 72.5 — log weight · /bodyfat 18.5 · /height 175"
      "/target 68 in 10 weeks — goal + daily calorie target"
      "/progress — trends, BMI and AI analysis"
      ""
      "🏋️ Workouts"
      "/workout bench press 3x8 60kg — log in plain words"
      "/workout history · prs · tips"
      ""
      "🎯 Goals"
      "/goal add read 20 books — set any goal; /goals — progress"
      "/goal log <n> <amount> — km goals auto-fill from cardio!"
      ""
      "📊 Reports"
      "/report — week in review (auto Sundays 20:00)"
      "/report month — 30-day deep-dive with productivity score (auto 1st)"
      ""
      "🧠 Coach"
      "/coach <what's up> — talk it out, e.g. /coach I feel lazy"
      ""
      "🤝 Accountability"
      "/buddy — pair with a friend to see each other's streaks & cheer on"
      "/buddy invite · /buddy accept <code> · /buddy nudge"
      ""
      "🍅 Focus & journal"
      "/focus 25 — start a Pomodoro; I'll ping you when it's up"
      "/focus status · /focus stop — check or end the current session"
      "/mood 4 [note] — log how you feel (1–5) · /journal <text> — reflect"
      ""
      "⭐ Premium"
      "/premium — unlock unlimited AI + photo food logging + monthly deep-dives"
      "/status — your current plan and what's included"
      ""
      "💬 Or just talk to me — no command needed"
      "\"ate chicken rice\" · \"slept 1am woke 8am\" · \"weighed 72\" · \"gym done\""
      "🎙 …or send a voice note — I'll transcribe and log it."
      ""
      "⚙️ Settings"
      "/settings — see everything · /settings timezone +8"
      "/settings morning 07:30 · /settings evening 21:00"
      "/stats — your level, XP and badges"
      "/usage — how much of today's AI budget is left"
      "/export — download all your data · /deleteme — erase everything"
      ""
      "More coming soon." ]
    |> String.concat "\n"

let private startText name =
    [ sprintf "Hey %s, welcome to Momentum AI 👋" name
      ""
      "I'm your personal productivity coach. Over the coming updates I'll help you with:"
      "• Morning motivation and daily planning"
      "• Habit, sleep, meal and workout tracking"
      "• Personalised AI coaching and weekly reports"
      ""
      "Tap 📱 /menu (or the button below) to get started — no need to memorise anything." ]
    |> String.concat "\n"

let handleStart (ctx: Context) =
    logCommand "start" ctx
    ctx.reply (startText (displayName ctx), openMenuButton)

let handleHelp (ctx: Context) =
    logCommand "help" ctx
    ctx.reply (helpText, openMenuButton)

let handlePing (ctx: Context) =
    logCommand "ping" ctx

    ctx.reply (
        sprintf "🏓 Pong! I'm alive.\nUptime: %s" (Time.formatUptime (Node.nodeProcess.uptime ()))
    )

let handleVersion (ctx: Context) =
    logCommand "version" ctx
    ctx.reply (sprintf "Momentum AI v%s — Phase 18 (cloud deployment)" Env.Version)
