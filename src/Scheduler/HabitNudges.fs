/// Twice-daily habit nudges: morning lays out the day's habits, evening is
/// the last call for anything still open (or a clean-sweep celebration).
/// Each user picks their own two times (defaults 08:00 / 19:00), matched
/// against their own local clock (Phase 14).
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

let private label (kind: Kind) =
    match kind with
    | Morning -> "morning"
    | Evening -> "evening"

/// Send one user their nudge for this kind, if they have anything worth saying.
let sendNudgeTo (bot: Telegraf) (kind: Kind) (user: Models.User.UserProfile) : JS.Promise<unit> =
    promise {
        let habits = Habits.forUser user.Id

        if habits.Length > 0 then
            match messageFor kind user.FirstName habits with
            | Some text ->
                try
                    let! _ = bot.telegram.sendMessage (user.ChatId, text)
                    Logger.info (sprintf "Habit nudge (%s) sent to %s" (label kind) user.FirstName)
                with ex ->
                    Logger.error (sprintf "Habit nudge to %s failed: %s" user.FirstName ex.Message)
            | None -> ()
    }

/// Public so tests can trigger a nudge round without waiting for the cron.
let sendNudges (bot: Telegraf) (kind: Kind) : JS.Promise<unit> =
    promise {
        let users = Users.getAll () |> Array.filter Users.nudgesOn

        for user in users do
            do! sendNudgeTo bot kind user
    }

/// Each user's configured time, defaulting to the classic 08:00 / 19:00.
let private timeFor (kind: Kind) (user: Models.User.UserProfile) =
    match kind with
    | Morning -> user.NudgeMorning |> Option.defaultValue "08:00"
    | Evening -> user.NudgeEvening |> Option.defaultValue "19:00"

let start (bot: Telegraf) =
    Cron.cron.schedule (
        "* * * * *",
        fun () ->
            Users.getAll ()
            |> Array.filter Users.nudgesOn
            |> Array.iter (fun user ->
                let now = (Time.userNow user.TzOffsetMinutes).ToString("HH:mm")

                for kind in [ Morning; Evening ] do
                    if timeFor kind user = now then
                        sendNudgeTo bot kind user |> ignore)
    )
    |> ignore

    Logger.info "Habit nudge scheduler started (per-user times, checks every minute)"
