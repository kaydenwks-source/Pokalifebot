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

                let lines =
                    [ Some(sprintf "⚖️ Logged: %.1f kg" kg)
                      deltaText "vs 7 days ago" (WeightLogs.weightDelta user.Id 7)
                      match user.HeightCm with
                      | Some h -> Some(sprintf "BMI: %.1f" (WeightLogs.bmi h kg))
                      | None -> Some "(Set /height 175 once and I'll compute your BMI)" ]
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

                // AI insight as a follow-up, cross-referencing calorie intake.
                ctx.sendChatAction "typing" |> ignore

                let avgKcal =
                    let days = Meals.recentDailyTotals user.Id 7

                    if days.Length = 0 then
                        None
                    else
                        Some((days |> Array.sumBy (fun d -> d.Calories)) / days.Length)

                let! analysis = Ai.Progress.analyse config logs user.HeightCm avgKcal

                match analysis with
                | Ok insight -> return! ctx.reply ("🧠 " + insight.Trim())
                | Error _ -> return! ctx.reply Common.aiUnavailable
    }
