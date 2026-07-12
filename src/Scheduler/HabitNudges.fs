/// Twice-daily habit nudges: 08:00 lays out the day's habits, 19:00 is
/// the last call for anything still open (or a clean-sweep celebration).
/// Times are server-local; per-user times arrive with Phase 14 settings.
module Scheduler.HabitNudges

open Fable.Core
open Bindings
open Bindings.Telegraf
open Models.Habit
open Services
open Utils

type Kind =
    | Morning
    | Evening

let private habitLine (h: Habit) =
    let s = Habits.streaksFor h.Cadence h.Completions

    if s.Current > 0 then
        sprintf "⬜ %s — 🔥 %d on the line" h.Name s.Current
    else
        sprintf "⬜ %s" h.Name

let private messageFor (kind: Kind) (firstName: string) (habits: Habit[]) : string option =
    let pending =
        habits
        |> Array.filter (fun h -> not (Habits.streaksFor h.Cadence h.Completions).DoneThisPeriod)

    if pending.Length > 0 then
        let lines = pending |> Array.map habitLine |> String.concat "\n"

        match kind with
        | Morning ->
            Some(sprintf "🌅 Morning, %s! On your plate today:\n\n%s\n\nCheck off with /habit done <name>" firstName lines)
        | Evening ->
            Some(sprintf "🌙 Evening check-in — still open:\n\n%s\n\nStill time to close the day strong: /habit done <name>" lines)
    else
        match kind with
        | Evening -> Some "🌙 All habits done — clean sweep! 🎉 Rest well."
        | Morning -> None // nothing pending in the morning = nothing to say

/// Public so tests can trigger a nudge round without waiting for the cron.
let sendNudges (bot: Telegraf) (kind: Kind) : JS.Promise<unit> =
    promise {
        let label = match kind with Morning -> "morning" | Evening -> "evening"

        let users =
            Users.getAll () |> Array.filter Users.nudgesOn

        for user in users do
            let habits = Habits.forUser user.Id

            if habits.Length > 0 then
                match messageFor kind user.FirstName habits with
                | Some text ->
                    try
                        let! _ = bot.telegram.sendMessage (user.ChatId, text)
                        Logger.info (sprintf "Habit nudge (%s) sent to %s" label user.FirstName)
                    with ex ->
                        Logger.error (sprintf "Habit nudge to %s failed: %s" user.FirstName ex.Message)
                | None -> ()
    }

let start (bot: Telegraf) =
    Cron.cron.schedule ("0 8 * * *", fun () -> sendNudges bot Morning |> ignore) |> ignore
    Cron.cron.schedule ("0 19 * * *", fun () -> sendNudges bot Evening |> ignore) |> ignore
    Logger.info "Habit nudge scheduler started (08:00 and 19:00 daily)"
