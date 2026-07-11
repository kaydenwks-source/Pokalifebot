/// The reminder commands: /remind (natural language), /reminders, /deletereminder.
module Commands.Reminders

open Fable.Core
open Bindings.Telegraf
open Models.Reminder
open Services
open Utils
open Config

let private usage =
    [ "⏰ Reminders"
      ""
      "/remind <when> <what> — plain English works:"
      "• /remind tomorrow 7pm call mum"
      "• /remind every monday 8am gym session"
      "• /remind in 2 hours drink water"
      "• /remind every day 22:30 wind down for bed"
      ""
      "/reminders — list what's scheduled"
      "/deletereminder <number> — remove one (number from /reminders)" ]
    |> String.concat "\n"

let private describe (r: Reminder) =
    let day = Time.dayName (System.DateTime.Parse r.DueDate)
    sprintf "%s %s at %s — %s (%s)" day r.DueDate r.DueTime r.Text (describeRepeat r.Repeat)

let handleRemind (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    promise {
        match Common.ensureUser ctx with
        | None -> return! ctx.reply "Sorry, I couldn't identify you — please try again."
        | Some user ->
            match Common.commandArg ctx with
            | None -> return! ctx.reply usage
            | Some request ->
                ctx.sendChatAction "typing" |> ignore
                let! parsed = Ai.ReminderParser.parse config request

                match parsed with
                | Error err ->
                    Logger.warn (sprintf "Reminder parse failed for %s: %s" user.FirstName err)

                    return!
                        ctx.reply (
                            "🤔 I couldn't work out when you mean. Try something like:\n"
                            + "• /remind tomorrow 7pm call mum\n"
                            + "• /remind every monday 8am gym\n"
                            + "• /remind in 2 hours drink water"
                        )
                | Ok p ->
                    let reminder = Reminders.add user.Id user.ChatId p.Text p.Date p.Time p.Repeat
                    Logger.info (sprintf "%s created reminder: %s" user.FirstName (describe reminder))
                    return! ctx.reply ("✅ Got it! " + describe reminder)
    }

let handleList (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        let mine = Reminders.forUser user.Id

        if mine.Length = 0 then
            ctx.reply "No reminders scheduled. Create one like: /remind tomorrow 7pm call mum"
        else
            let lines =
                mine
                |> Array.mapi (fun i r -> sprintf "%d. %s" (i + 1) (describe r))
                |> String.concat "\n"

            ctx.reply ("⏰ Your reminders:\n\n" + lines + "\n\nRemove one with /deletereminder <number>")

let handleDelete (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        match Common.commandArg ctx with
        | None -> ctx.reply "Which one? /deletereminder <number> — see the numbers with /reminders"
        | Some arg ->
            match System.Int32.TryParse (arg.Trim()) with
            | true, index ->
                match Reminders.deleteByIndex user.Id index with
                | Some r ->
                    Logger.info (sprintf "%s deleted reminder: %s" user.FirstName r.Text)
                    ctx.reply ("🗑 Deleted: " + describe r)
                | None -> ctx.reply "That number isn't in your list — check /reminders"
            | _ -> ctx.reply "Use the number from /reminders, e.g. /deletereminder 2"
