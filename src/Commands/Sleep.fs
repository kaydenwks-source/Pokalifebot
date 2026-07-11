/// The /sleep command family: log a night, view today, history, stats + AI.
module Commands.Sleep

open Fable.Core
open Bindings.Telegraf
open Models.User
open Models.Sleep
open Services
open Utils
open Config

let private usage =
    [ "😴 Sleep tracker"
      ""
      "/sleep 23:30 07:00 — log last night (bed time, then wake time)"
      "/sleep today — today's entry"
      "/sleep history — your last 7 nights"
      "/sleep stats — averages, sleep debt and AI analysis" ]
    |> String.concat "\n"

let private describe (log: SleepLog) =
    sprintf "%s → %s (%s)" log.BedTime log.WakeTime (Time.formatDuration log.DurationMinutes)

let private logNight (user: UserProfile) (bedRaw: string) (wakeRaw: string) (ctx: Context) =
    match Time.parseTime bedRaw, Time.parseTime wakeRaw with
    | Some bed, Some wake when bed <> wake ->
        let entry, replaced = SleepLogs.logToday user.Id bed wake
        Logger.info (sprintf "%s logged sleep %s" user.FirstName (describe entry))

        let note =
            if replaced then
                "\n(Updated today's earlier entry.)"
            else
                ""

        let sanity =
            if entry.DurationMinutes < 240 then
                "\nThat's a short night — be kind to yourself today."
            elif entry.DurationMinutes > 840 then
                "\nThat's a long one! If the times are wrong, just log again to overwrite."
            else
                ""

        ctx.reply (sprintf "✅ Sleep logged: %s%s%s" (describe entry) note sanity)
    | Some _, Some _ ->
        ctx.reply "Bed and wake times are identical — the order is: /sleep <bed time> <wake time>"
    | _ -> ctx.reply "One of those times doesn't look right. Use 24h HH:MM, e.g. /sleep 23:30 07:00"

let private showToday (user: UserProfile) (ctx: Context) =
    match SleepLogs.todayLog user.Id with
    | Some log -> ctx.reply (sprintf "😴 Today: %s" (describe log))
    | None -> ctx.reply "No sleep logged today yet. Log it like: /sleep 23:30 07:00"

let private showHistory (user: UserProfile) (ctx: Context) =
    let logs = SleepLogs.forUser user.Id |> Array.truncate 7

    if logs.Length = 0 then
        ctx.reply "No sleep logs yet. Start tonight: /sleep 23:30 07:00"
    else
        let lines =
            logs
            |> Array.map (fun l ->
                let day = Time.dayName (System.DateTime.Parse l.Date)
                sprintf "• %s %s — %s" day l.Date (describe l))
            |> String.concat "\n"

        ctx.reply ("🗓 Your last nights:\n\n" + lines)

let private showStats (config: Env.AppConfig) (user: UserProfile) (ctx: Context) : JS.Promise<obj> =
    promise {
        match SleepLogs.statsFor user.Id with
        | None -> return! ctx.reply "No sleep logs yet. Start tonight: /sleep 23:30 07:00"
        | Some s ->
            let debtLine =
                if s.Debt7 > 0 then
                    sprintf "Sleep debt: %s short of the 8h target." (Time.formatDuration s.Debt7)
                elif s.Debt7 < 0 then
                    sprintf "Sleep surplus: %s ahead of the 8h target." (Time.formatDuration -s.Debt7)
                else
                    "You're exactly on the 8h target."

            let text =
                [ "📊 Sleep stats"
                  ""
                  sprintf "Last 7 days: %d nights logged, avg %s" s.Count7 (Time.formatDuration s.Avg7)
                  sprintf "Last 30 days: %d nights logged, avg %s" s.Count30 (Time.formatDuration s.Avg30)
                  debtLine ]
                |> String.concat "\n"

            let! _ = ctx.reply text

            // AI analysis as a follow-up message so the numbers arrive instantly.
            ctx.sendChatAction "typing" |> ignore
            let! analysis = Ai.Sleep.analyse config (SleepLogs.forUser user.Id)

            match analysis with
            | Ok advice -> return! ctx.reply ("🧠 " + advice)
            | Error _ -> return! ctx.reply Common.aiUnavailable
    }

/// Dispatcher: /sleep [today|history|stats|<bed> <wake>]
let handle (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        match Common.commandArgs ctx with
        | [||] -> ctx.reply usage
        | [| sub |] when sub.ToLowerInvariant() = "today" -> showToday user ctx
        | [| sub |] when sub.ToLowerInvariant() = "history" -> showHistory user ctx
        | [| sub |] when sub.ToLowerInvariant() = "stats" -> showStats config user ctx
        | [| bed; wake |] -> logNight user bed wake ctx
        | _ -> ctx.reply usage
