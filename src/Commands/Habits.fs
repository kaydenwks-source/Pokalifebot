/// The /habit command family: add, remove, list, done, stats.
module Commands.Habits

open Fable.Core
open Bindings.Telegraf
open Models.User
open Models.Habit
open Services
open Utils
open Config

let private usage =
    [ "🔥 Habit tracker"
      ""
      "/habit add <name> [daily|weekly|monthly] — start tracking (daily if omitted)"
      "/habit done <name or number> — check it off"
      "/habit list — your habits and streaks"
      "/habit stats — streaks, records and totals"
      "/habit remove <name or number> — stop tracking"
      ""
      "Examples: /habit add gym · /habit add reading weekly · /habit done gym" ]
    |> String.concat "\n"

/// Find a habit by name (case-insensitive) or list number. With no
/// argument and exactly one habit, that habit is assumed.
let private resolve (user: UserProfile) (arg: string) : Habit option =
    let trimmed = arg.Trim()
    let mine = Habits.forUser user.Id

    if trimmed = "" then
        if mine.Length = 1 then Some mine.[0] else None
    else
        match System.Int32.TryParse trimmed with
        | true, i -> if i >= 1 && i <= mine.Length then Some mine.[i - 1] else None
        | _ -> Habits.tryFind user.Id trimmed

let private showList (user: UserProfile) (ctx: Context) =
    let mine = Habits.forUser user.Id

    if mine.Length = 0 then
        ctx.reply "No habits yet. Add one: /habit add gym  (or: /habit add reading weekly)"
    else
        let lines =
            mine
            |> Array.mapi (fun i h ->
                let s = Habits.streaksFor h.Cadence h.Completions
                let mark = if s.DoneThisPeriod then "✅" else "⬜"
                sprintf "%d. %s %s (%s) — 🔥 %d" (i + 1) mark h.Name h.Cadence s.Current)
            |> String.concat "\n"

        ctx.reply ("🔥 Your habits:\n\n" + lines + "\n\nCheck one off: /habit done <name or number>")

let private addHabit (user: UserProfile) (rest: string[]) (ctx: Context) =
    if rest.Length = 0 then
        ctx.reply "Usage: /habit add <name> [daily|weekly|monthly]\nExample: /habit add gym · /habit add reading weekly"
    else
        // Last word may be a cadence; everything else is the name.
        let cadence, nameParts =
            match Cadence.tryNormalise rest.[rest.Length - 1] with
            | Some c when rest.Length > 1 -> c, Array.sub rest 0 (rest.Length - 1)
            | _ -> "daily", rest

        let name = String.concat " " nameParts

        if name.Length > 40 then
            ctx.reply "That name is a bit long — keep it under 40 characters."
        else
            match Habits.add user.Id name cadence with
            | Habits.Duplicate -> ctx.reply (sprintf "You're already tracking \"%s\" — see /habit list" name)
            | Habits.Added h ->
                Logger.info (sprintf "%s added habit %s (%s)" user.FirstName h.Name h.Cadence)

                ctx.reply (
                    sprintf "🌱 Added \"%s\" (%s). First check-in: /habit done %s" h.Name h.Cadence h.Name
                )

let private removeHabit (user: UserProfile) (arg: string) (ctx: Context) =
    match resolve user arg with
    | Some h ->
        Habits.remove h
        Logger.info (sprintf "%s removed habit %s" user.FirstName h.Name)
        ctx.reply (sprintf "🗑 Removed \"%s\" and its history." h.Name)
    | None -> ctx.reply (sprintf "I couldn't find \"%s\" — check /habit list" (arg.Trim()))

let private checkOff
    (config: Env.AppConfig)
    (user: UserProfile)
    (arg: string)
    (ctx: Context)
    : JS.Promise<obj> =
    promise {
        match resolve user arg with
        | None ->
            return!
                ctx.reply (
                    sprintf "I couldn't find a habit called \"%s\" — check /habit list" (arg.Trim())
                )
        | Some habit ->
            match Habits.markDone habit with
            | Habits.AlreadyDone s ->
                return!
                    ctx.reply (
                        sprintf
                            "Already done %s — streak is %d. See you next time! 💪"
                            (Cadence.periodPhrase habit.Cadence)
                            s.Current
                    )
            | Habits.Marked (h, s) ->
                Logger.info (sprintf "%s checked off %s (streak %d)" user.FirstName h.Name s.Current)

                let record =
                    if s.Current >= 3 && s.Current = s.Longest then
                        " New personal best! 🏆"
                    else
                        ""

                let baseMsg =
                    sprintf
                        "✅ %s done! 🔥 Streak: %d %s.%s"
                        h.Name
                        s.Current
                        (Cadence.streakUnit h.Cadence s.Current)
                        record

                if Ai.Encourage.milestone s.Current then
                    ctx.sendChatAction "typing" |> ignore
                    let! encouragement = Ai.Encourage.generate config h.Name h.Cadence s.Current

                    let extra =
                        match encouragement with
                        | Ok text -> "\n\n" + text.Trim()
                        | Error _ -> ""

                    return! ctx.reply (baseMsg + extra)
                else
                    return! ctx.reply baseMsg
    }

let private showStats (user: UserProfile) (ctx: Context) =
    let mine = Habits.forUser user.Id

    if mine.Length = 0 then
        ctx.reply "No habits yet. Add one: /habit add gym"
    else
        let block (h: Habit) =
            let s = Habits.streaksFor h.Cadence h.Completions

            sprintf
                "%s (%s)\n  🔥 current %d · 🏆 longest %d · ✅ %d check-ins total"
                h.Name
                h.Cadence
                s.Current
                s.Longest
                h.Completions.Length

        ctx.reply ("📊 Habit stats\n\n" + (mine |> Array.map block |> String.concat "\n\n"))

/// Dispatcher: /habit [add|done|list|stats|remove] ...
let handle (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        let args = Common.commandArgs ctx

        if args.Length = 0 then
            showList user ctx
        else
            let rest = String.concat " " (Array.skip 1 args)

            match args.[0].ToLowerInvariant() with
            | "add" -> addHabit user (Array.skip 1 args) ctx
            | "done" -> checkOff config user rest ctx
            | "remove"
            | "delete" -> removeHabit user rest ctx
            | "list" -> showList user ctx
            | "stats" -> showStats user ctx
            | _ -> ctx.reply usage

/// /habits — quick alias for /habit list.
let handleListShortcut (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user -> showList user ctx

/// /nudges [on|off] — toggle the 08:00/19:00 habit reminders.
let handleNudges (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        match Common.commandArg ctx |> Option.map (fun s -> s.Trim().ToLowerInvariant()) with
        | Some "off" ->
            Users.setNudges user.Id false
            Logger.info (sprintf "%s turned habit nudges off" user.FirstName)
            ctx.reply "🔕 Habit nudges off. Re-enable anytime with /nudges on."
        | Some "on" ->
            Users.setNudges user.Id true
            Logger.info (sprintf "%s turned habit nudges on" user.FirstName)
            ctx.reply "🔔 Habit nudges on — I'll check in at 08:00 and 19:00 daily."
        | _ ->
            let state = if Users.nudgesOn user then "ON 🔔" else "OFF 🔕"
            ctx.reply (sprintf "Habit nudges are %s (08:00 & 19:00 daily). Switch with /nudges on or /nudges off." state)
