/// /settings — the one place to see and change your personal preferences.
/// Timezone is the headline: set it once and every scheduled message
/// (quotes, nudges, reminders, reports) lands on your own local clock.
module Commands.Settings

open Fable.Core
open Bindings.Telegraf
open Models.User
open Services
open Utils

let private overview (user: UserProfile) : string =
    let tz =
        user.TzOffsetMinutes
        |> Option.map Time.formatOffset
        |> Option.defaultValue "server time (not set)"

    let morning = user.NudgeMorning |> Option.defaultValue "08:00"
    let evening = user.NudgeEvening |> Option.defaultValue "19:00"

    let quote =
        user.QuoteTime
        |> Option.map (sprintf "%s daily")
        |> Option.defaultValue "off"

    let target =
        user.DailyKcalTarget
        |> Option.map (sprintf "%.0f kcal/day")
        |> Option.defaultValue "not set"

    let height =
        user.HeightCm
        |> Option.map (sprintf "%.0f cm")
        |> Option.defaultValue "not set"

    [ "⚙️ Your settings"
      ""
      sprintf "🌍 Timezone: %s" tz
      sprintf "🔔 Habit nudges: %s (morning) · %s (evening)" morning evening
      sprintf "🌅 Daily quote: %s" quote
      sprintf "🎯 Calorie target: %s" target
      sprintf "📏 Height: %s" height
      sprintf "🎮 Gamification: %s" (if Users.gamificationOn user then "on" else "off")
      ""
      "Change things:"
      "/settings timezone +8 — set your UTC offset (e.g. +8, -5:30)"
      "/settings morning 07:30 — move the morning nudge"
      "/settings evening 21:00 — move the evening nudge"
      "/settings gamification on|off — XP, levels and badges"
      "/quotetime 07:00 — daily quote time · /nudges on|off"
      "/target 68 in 10 weeks — calorie goal · /height 175"
      ""
      "📐 Units are metric only (kg, cm, kcal) for now." ]
    |> String.concat "\n"

let private setTimezone (ctx: Context) (user: UserProfile) (raw: string) : JS.Promise<obj> =
    match Time.parseUtcOffset raw with
    | Some minutes ->
        Users.setTimezone user.Id minutes
        Logger.info (sprintf "%s set timezone to %s" user.FirstName (Time.formatOffset minutes))

        ctx.reply (
            sprintf
                "🌍 Timezone set to %s. Your scheduled quotes, nudges, reminders and reports now follow your local clock.\n\nYour local time is about %s."
                (Time.formatOffset minutes)
                ((Time.userNow (Some minutes)).ToString("ddd HH:mm"))
        )
    | None ->
        ctx.reply "That doesn't look like an offset. Try /settings timezone +8 or /settings timezone -5:30."

let private setNudge (ctx: Context) (user: UserProfile) (which: string) (raw: string) : JS.Promise<obj> =
    match Time.parseTime raw with
    | Some time ->
        if which = "morning" then
            Users.setNudgeMorning user.Id time
        else
            Users.setNudgeEvening user.Id time

        Logger.info (sprintf "%s set %s nudge to %s" user.FirstName which time)
        ctx.reply (sprintf "🔔 %s nudge moved to %s (your local time)." (which.Substring(0, 1).ToUpper() + which.Substring 1) time)
    | None ->
        ctx.reply (sprintf "Use a 24h time, e.g. /settings %s 07:30." which)

let handle (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        let args = Common.commandArgs ctx

        match args with
        | [||] -> ctx.reply (overview user)
        | _ ->
            let sub = args.[0].ToLowerInvariant()
            let rest = if args.Length > 1 then String.concat " " (Array.skip 1 args) else ""

            match sub with
            | "timezone"
            | "tz" ->
                if rest = "" then
                    ctx.reply "What offset? e.g. /settings timezone +8"
                else
                    setTimezone ctx user rest
            | "morning" ->
                if rest = "" then
                    ctx.reply "What time? e.g. /settings morning 07:30"
                else
                    setNudge ctx user "morning" rest
            | "evening" ->
                if rest = "" then
                    ctx.reply "What time? e.g. /settings evening 21:00"
                else
                    setNudge ctx user "evening" rest
            | "gamification"
            | "game"
            | "xp" ->
                match rest.Trim().ToLowerInvariant() with
                | "off" ->
                    Users.setGamification user.Id false
                    Logger.info (sprintf "%s turned gamification off" user.FirstName)
                    ctx.reply "🎮 Gamification off. XP, levels and badges are paused — your logs still count for everything else. Turn it back on: /settings gamification on"
                | "on" ->
                    Users.setGamification user.Id true
                    Logger.info (sprintf "%s turned gamification on" user.FirstName)
                    ctx.reply "🎮 Gamification on — you'll earn XP again for habits, workouts, meals, sleep and goals. See /stats."
                | _ ->
                    let state = if Users.gamificationOn user then "on" else "off"
                    ctx.reply (sprintf "Gamification is %s. Switch with /settings gamification on or /settings gamification off." state)
            | _ -> ctx.reply (overview user)
