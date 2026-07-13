/// Body tracking commands: /weight, /bodyfat, /height, /progress.
module Commands.Body

open Fable.Core
open Bindings.Telegraf
open Models.User
open Services
open Services.WeightLogs
open Utils
open Config

let private usage =
    [ "⚖️ Body tracking"
      ""
      "/weight 72.5 — log today's weight (kg)"
      "/weight — latest weight and trend"
      "/bodyfat 18.5 — log today's body fat %"
      "/height 175 — set your height (cm) so I can compute BMI"
      "/target 68 in 10 weeks — weight goal + daily calorie target"
      "/progress — trends + AI analysis" ]
    |> String.concat "\n"

let private parseNumber (raw: string) : float option =
    match System.Double.TryParse (raw.Trim().Replace("kg", "").Replace("%", "").Trim()) with
    | true, v -> Some v
    | _ -> None

let private deltaText (label: string) (delta: (float * float) option) =
    match delta with
    | Some (_, d) when abs d < 0.05 -> Some(sprintf "%s: no change" label)
    | Some (_, d) when d > 0.0 -> Some(sprintf "%s: +%.1f kg" label d)
    | Some (_, d) -> Some(sprintf "%s: %.1f kg" label d)
    | None -> None

let handleWeight (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        match Common.commandArg ctx with
        | None ->
            match WeightLogs.weightDelta user.Id 0 with
            | None -> ctx.reply "No weight logged yet. Start with: /weight 72.5"
            | Some (current, _) ->
                let lines =
                    [ Some(sprintf "⚖️ Latest weight: %.1f kg" current)
                      deltaText "Last 7 days" (WeightLogs.weightDelta user.Id 7)
                      deltaText "Last 30 days" (WeightLogs.weightDelta user.Id 30)
                      user.HeightCm
                      |> Option.map (fun h -> sprintf "BMI: %.1f" (WeightLogs.bmi h current))
                      Some ""
                      Some "Log today: /weight 72.5 · full picture: /progress" ]
                    |> List.choose id

                ctx.reply (String.concat "\n" lines)
        | Some raw ->
            match parseNumber raw with
            | Some kg when kg >= 20.0 && kg <= 400.0 ->
                WeightLogs.upsertToday user.Id (Weight kg) |> ignore
                Logger.info (sprintf "%s logged weight %.1f kg" user.FirstName kg)

                let targetLine =
                    match user.TargetWeightKg with
                    | Some target when abs (kg - target) <= 0.2 ->
                        Some "🎉 You've hit your goal weight! Set a new one with /target, or /target off"
                    | Some target ->
                        Some(
                            sprintf
                                "🎯 %.1f kg to go (goal %.1f%s)"
                                (abs (kg - target))
                                target
                                (user.TargetDate
                                 |> Option.map (sprintf " by %s")
                                 |> Option.defaultValue "")
                        )
                    | None -> Some "🎯 Want a goal? /target 68 in 10 weeks — I'll compute your daily calories"

                let lines =
                    [ Some(sprintf "⚖️ Logged: %.1f kg" kg)
                      deltaText "vs 7 days ago" (WeightLogs.weightDelta user.Id 7)
                      match user.HeightCm with
                      | Some h -> Some(sprintf "BMI: %.1f" (WeightLogs.bmi h kg))
                      | None -> Some "(Set /height 175 once and I'll compute your BMI)"
                      targetLine ]
                    |> List.choose id

                ctx.reply (String.concat "\n" lines)
            | _ -> ctx.reply "That doesn't look like a weight in kg — e.g. /weight 72.5"

let handleBodyFat (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        match Common.commandArg ctx |> Option.bind parseNumber with
        | Some pct when pct >= 2.0 && pct <= 70.0 ->
            WeightLogs.upsertToday user.Id (Fat pct) |> ignore
            Logger.info (sprintf "%s logged body fat %.1f%%" user.FirstName pct)
            ctx.reply (sprintf "📏 Logged: %.1f%% body fat. Track the trend with /progress" pct)
        | Some _ -> ctx.reply "Body fat should be a percentage between 2 and 70 — e.g. /bodyfat 18.5"
        | None -> ctx.reply "Usage: /bodyfat 18.5"

let handleHeight (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        match Common.commandArg ctx |> Option.bind parseNumber with
        | Some cm when cm >= 80.0 && cm <= 250.0 ->
            Users.setHeight user.Id cm
            Logger.info (sprintf "%s set height %.0f cm" user.FirstName cm)

            let bmiNote =
                WeightLogs.weightDelta user.Id 0
                |> Option.map (fun (kg, _) -> sprintf " Your current BMI: %.1f." (WeightLogs.bmi cm kg))
                |> Option.defaultValue ""

            ctx.reply (sprintf "📐 Height saved: %.0f cm.%s" cm bmiNote)
        | Some _ -> ctx.reply "Height should be in cm between 80 and 250 — e.g. /height 175"
        | None ->
            let current =
                user.HeightCm
                |> Option.map (sprintf "Your height is set to %.0f cm.")
                |> Option.defaultValue "No height set yet."

            ctx.reply (current + "\nUsage: /height 175")

/// /target <kg> in <N> weeks|months — weight goal -> daily calorie target.
let handleTarget (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        match Common.commandArg ctx with
        | None ->
            match user.TargetWeightKg, user.TargetDate, user.DailyKcalTarget with
            | Some kg, Some date, Some kcal ->
                let current =
                    WeightLogs.weightDelta user.Id 0
                    |> Option.map (fun (c, _) -> sprintf "\nCurrent: %.1f kg (%.1f kg to go)" c (abs (c - kg)))
                    |> Option.defaultValue ""

                ctx.reply (
                    sprintf
                        "🎯 Goal: %.1f kg by %s · daily target ~%.0f kcal%s\n\nChange it: /target 68 in 10 weeks · stop: /target off"
                        kg
                        date
                        kcal
                        current
                )
            | _ ->
                ctx.reply
                    "No goal set yet. Try: /target 68 in 10 weeks\nI'll work out the daily calories to get you there."
        | Some arg when arg.Trim().ToLowerInvariant() = "off" ->
            Users.clearTarget user.Id
            Logger.info (sprintf "%s cleared weight target" user.FirstName)
            ctx.reply "🎯 Goal cleared — /calories is back to plain tracking."
        | Some arg ->
            let tokens = arg.Split(' ') |> Array.filter (fun t -> t.Trim() <> "")

            let numbers =
                tokens
                |> Array.choose (fun t ->
                    match System.Double.TryParse (t.Trim().ToLowerInvariant().Replace("kg", "")) with
                    | true, v -> Some v
                    | _ -> None)

            let inMonths =
                tokens |> Array.exists (fun t -> t.ToLowerInvariant().StartsWith "month")

            if numbers.Length = 0 then
                ctx.reply "Tell me the goal like: /target 68 in 10 weeks (or: /target 68 in 3 months)"
            else
                let targetKg = numbers.[0]

                let weeks =
                    let count = if numbers.Length > 1 then numbers.[1] else 12.0
                    let w = if inMonths then count * 4.345 else count
                    w |> max 2.0 |> min 104.0

                if targetKg < 20.0 || targetKg > 400.0 then
                    ctx.reply "That target doesn't look like a weight in kg — e.g. /target 68 in 10 weeks"
                else
                    match WeightLogs.weightDelta user.Id 0 with
                    | None -> ctx.reply "Log your current weight first (/weight 72.5), then set the goal."
                    | Some (current, _) ->
                        let plan = Energy.computeTarget current targetKg weeks

                        let targetDate =
                            System.DateTime.Now.AddDays(weeks * 7.0).ToString("yyyy-MM-dd")

                        Users.setTarget user.Id targetKg targetDate plan.DailyTargetKcal

                        Logger.info (
                            sprintf "%s set target %.1f kg in %.0f weeks (%.0f kcal/day)" user.FirstName targetKg weeks plan.DailyTargetKcal
                        )

                        let warnings =
                            [ if plan.Aggressive then
                                  Some "⚠️ That pace is faster than ~0.75 kg/week — a longer timeline is usually easier to keep."
                              else
                                  None
                              if plan.Floored then
                                  Some "⚠️ I've floored the target at 1200 kcal/day — going lower isn't sustainable."
                              else
                                  None ]
                            |> List.choose id

                        [ sprintf "🎯 Goal set: %.1f kg by %s (%.0f weeks)" targetKg targetDate weeks
                          sprintf "Current %.1f kg → %+.1f kg (%+.2f kg/week)" current (targetKg - current) plan.WeeklyChangeKg
                          sprintf "Estimated maintenance: ~%.0f kcal/day" plan.MaintenanceKcal
                          sprintf "Your daily target: ~%.0f kcal" plan.DailyTargetKcal
                          yield! warnings
                          ""
                          "/calories now tracks net intake against this (workouts add headroom)."
                          "Estimates only, not medical advice. /target off to stop." ]
                        |> String.concat "\n"
                        |> ctx.reply

let handleProgress (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    promise {
        match Common.ensureUser ctx with
        | None -> return! ctx.reply "Sorry, I couldn't identify you — please try again."
        | Some user ->
            let logs = WeightLogs.forUser user.Id

            if logs.Length = 0 then
                return! ctx.reply "No measurements yet. Start with /weight 72.5 (and /height 175 for BMI)."
            else
                let entryLine (l: Models.Weight.WeightLog) =
                    let kg =
                        l.Kg |> Option.map (sprintf "%.1f kg") |> Option.defaultValue "—"

                    let fat =
                        l.BodyFat
                        |> Option.map (sprintf " · %.1f%% fat")
                        |> Option.defaultValue ""

                    sprintf "%s %s: %s%s" (Time.dayName (System.DateTime.Parse l.Date)) (l.Date.Substring 5) kg fat

                let lines =
                    [ Some "📈 Recent measurements:"
                      Some ""
                      Some (logs |> Array.truncate 7 |> Array.map entryLine |> String.concat "\n")
                      Some ""
                      deltaText "Last 7 days" (WeightLogs.weightDelta user.Id 7)
                      deltaText "Last 30 days" (WeightLogs.weightDelta user.Id 30) ]
                    |> List.choose id

                let! _ = ctx.reply (String.concat "\n" lines)

                // AI insight as a follow-up, cross-referencing calorie intake —
                // the measurements above are always free; only this costs budget.
                match Entitlements.check config.AdminUserId user "progress" with
                | Error budgetMsg -> return! ctx.reply budgetMsg
                | Ok() ->
                    ctx.sendChatAction "typing" |> ignore

                    let avgKcal =
                        let days = Meals.recentDailyTotals user.Id 7

                        if days.Length = 0 then
                            None
                        else
                            Some((days |> Array.sumBy (fun d -> d.Calories)) / days.Length)

                    let! analysis = Ai.Progress.analyse config logs user.HeightCm avgKcal

                    match analysis with
                    | Ok insight ->
                        Entitlements.commit config.AdminUserId user "progress"
                        return! ctx.reply ("🧠 " + insight.Trim())
                    | Error _ -> return! ctx.reply Common.aiUnavailable
    }
