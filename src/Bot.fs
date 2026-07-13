/// Builds the Telegraf bot instance and wires commands to their handlers.
/// This is the ONLY place where routing lives — new phases add their
/// command registrations here and nowhere else.
module Bot

open Fable.Core
open Bindings
open Bindings.Telegraf
open Utils
open Config

let create (config: Env.AppConfig) : Telegraf =
    let bot = Telegraf.create config.BotToken

    // Phase 16 — usage analytics. Runs before every handler, records the
    // slash-command, then hands control on. Registered first so nothing is
    // missed; wrapped so a logging failure can never drop a real command.
    bot.``use`` (
        System.Func<_, _, _>(fun (ctx: Context) (next: unit -> JS.Promise<unit>) ->
            match ctx.from, ctx.message |> Option.bind (fun m -> m.text) with
            | Some from, Some text when text.StartsWith "/" ->
                let cmd = text.Substring(1).Split([| ' '; '@' |]).[0].ToLowerInvariant()
                if cmd <> "" then Services.Analytics.record from.id cmd
            | _ -> ()

            next ())
    )

    bot.start Commands.Basic.handleStart
    bot.help Commands.Basic.handleHelp
    bot.command ("ping", Commands.Basic.handlePing)
    bot.command ("version", Commands.Basic.handleVersion)

    // Phase 2 — morning motivation
    bot.command ("quote", Commands.Quotes.handleQuote config)
    bot.command ("category", Commands.Quotes.handleCategory)
    bot.command ("quotetime", Commands.Quotes.handleQuoteTime)

    // One button action per category (callback_data "cat:Gym" etc.)
    for category in Models.User.Categories.all do
        bot.action ("cat:" + category, Commands.Quotes.handleCategoryChosen category)

    // Phase 3 — sleep tracker + admin panel
    bot.command ("sleep", Commands.Sleep.handle config)
    bot.command ("admin", Commands.Admin.handle config)

    // Phase 4 — reminders (Telegram lowercases commands, so no camelCase)
    bot.command ("remind", Commands.Reminders.handleRemind config)
    bot.command ("reminders", Commands.Reminders.handleList)
    bot.command ("deletereminder", Commands.Reminders.handleDelete)

    // Phase 5 — habit tracker
    bot.command ("habit", Commands.Habits.handle config)
    bot.command ("habits", Commands.Habits.handleListShortcut)
    bot.command ("nudges", Commands.Habits.handleNudges)

    // Phase 6 — daily planner
    bot.command ("task", Commands.Tasks.handleTask)
    bot.command ("tasks", Commands.Tasks.handleTasks)
    bot.command ("today", Commands.Tasks.handleToday)
    bot.command ("plan", Commands.Tasks.handlePlan config)

    // Phase 7 — calorie tracker
    bot.command ("food", Commands.Food.handleFood config)
    bot.command ("calories", Commands.Food.handleCalories)
    bot.on (messageFilter "photo", Commands.Food.handlePhoto config)

    // Phase 8 — weight tracker
    bot.command ("weight", Commands.Body.handleWeight)
    bot.command ("bodyfat", Commands.Body.handleBodyFat)
    bot.command ("height", Commands.Body.handleHeight)
    bot.command ("progress", Commands.Body.handleProgress config)

    // Phase 9 — exercise tracker
    bot.command ("workout", Commands.Workouts.handle config)

    // Phase 9.5 — recurring busy blocks + weight/calorie targets
    bot.command ("busy", Commands.Busy.handle)
    bot.command ("target", Commands.Body.handleTarget)

    // Phase 10 — goal system
    bot.command ("goal", Commands.Goals.handle config)
    bot.command ("goals", Commands.Goals.handleListShortcut)

    // Phase 11/12 — reports
    bot.command ("report", Commands.Report.handle config)

    // Phase 13 — AI coach
    bot.command ("coach", Commands.Coach.handle config)

    // Phase 14 — settings (timezone + per-user nudge times)
    bot.command ("settings", Commands.Settings.handle)

    // Phase 19 — AI usage / budget
    bot.command ("usage", Commands.Account.handleUsage config)

    // Phase 20 — data safety: export and account deletion
    bot.command ("export", Commands.Account.handleExport)
    bot.command ("deleteme", Commands.Account.handleDeleteMe)

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
