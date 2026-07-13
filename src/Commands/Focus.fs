/// /focus — a Pomodoro timer. Start a session, get pinged when it's up.
///   /focus 25      start a 25-minute session (default 25 if no number)
///   /focus         status if one's running, else today's summary
///   /focus stop    end the current session early
module Commands.Focus

open Fable.Core
open Bindings
open Bindings.Telegraf
open Services
open Utils

let private defaultMin = 25
let private maxMin = 120

let private statusLine (a: Focus.Active) =
    sprintf "🍅 Focus running — %d min, started %s.\n\nStay with it. /focus stop to end early." a.Minutes a.StartedAt

let private todaySummary (userId: float) =
    let count, mins = Focus.todayStats userId
    sprintf "🍅 Focus\n\nToday: %d session(s) · %d min focused.\n\nStart one: /focus 25 (or any length up to 120)." count mins

let handle (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        let args = Common.commandArgs ctx
        let sub = if args.Length > 0 then args.[0].ToLowerInvariant() else ""

        match sub with
        | "" ->
            match Focus.activeFor user.Id with
            | Some a -> ctx.reply (statusLine a)
            | None -> ctx.reply (todaySummary user.Id)
        | "status" ->
            match Focus.activeFor user.Id with
            | Some a -> ctx.reply (statusLine a)
            | None -> ctx.reply "No focus session running. Start one: /focus 25"
        | "stop" ->
            match Focus.activeFor user.Id with
            | None -> ctx.reply "No focus session running. Start one: /focus 25"
            | Some a ->
                Node.clearTimeout a.Timer
                Focus.stop user.Id |> ignore
                Logger.info (sprintf "%s stopped a focus session early" user.FirstName)
                ctx.reply "⏹ Focus stopped — no worries, starting is the hard part. /focus 25 when you're ready to go again."
        | _ ->
            match System.Int32.TryParse sub with
            | true, m when m >= 1 && m <= maxMin ->
                match Focus.activeFor user.Id with
                | Some _ ->
                    ctx.reply "You already have a focus session running. Use /focus status, or /focus stop to end it first."
                | None ->
                    // Ping the user when the timer fires; ctx stays valid in the
                    // closure so ctx.reply reaches the same chat later.
                    let timer =
                        Node.setTimeout (m * 60 * 1000) (fun () ->
                            match Focus.complete user.Id with
                            | Some s ->
                                let count, mins = Focus.todayStats user.Id

                                ctx.reply (
                                    sprintf
                                        "⏰ Time's up — %d min of focus done! 🍅\n\nThat's %d session(s) and %d min today. Take a short break, then /focus again when you're ready."
                                        s.Minutes
                                        count
                                        mins
                                )
                                |> ignore
                            | None -> ())

                    Focus.start user.Id m timer |> ignore
                    Logger.info (sprintf "%s started a %d-min focus session" user.FirstName m)

                    ctx.reply (
                        sprintf
                            "🍅 Focus on — %d minutes. I'll ping you the moment it's up.\n\nPhone down, one task, go. /focus stop if you need to bail."
                            m
                    )
            | _ -> ctx.reply "Usage: /focus <minutes> (1–120), e.g. /focus 25.\nAlso: /focus status · /focus stop"
