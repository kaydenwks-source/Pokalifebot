/// The /workout command family: log (natural language), history, PRs, tips.
module Commands.Workouts

open Fable.Core
open Bindings.Telegraf
open Models.User
open Models.Workout
open Services
open Utils
open Config

let private usage =
    [ "🏋️ Workout tracker"
      ""
      "/workout <what you did> — I'll parse and log it:"
      "• /workout bench press 3x8 60kg"
      "• /workout ran 5km in 30 minutes"
      "• /workout 45 min yoga session"
      ""
      "/workout history — your last sessions"
      "/workout prs — personal records per exercise"
      "/workout tips — AI look at your recent training" ]
    |> String.concat "\n"

/// Public so the natural-language router can log a workout from free text
/// and reuse the full PR / energy / goal-feed reply.
let logWorkout (config: Env.AppConfig) (user: UserProfile) (description: string) (ctx: Context) : JS.Promise<obj> =
    promise {
        ctx.sendChatAction "typing" |> ignore

        // Use the user's real weight for calorie estimates when we have it.
        let userWeight =
            WeightLogs.forUser user.Id
            |> Array.tryPick (fun l -> l.Kg)

        let! parsed = Ai.Workouts.parse config userWeight description

        match parsed with
        | Error err ->
            Logger.warn (sprintf "Workout parse failed for %s: %s" user.FirstName err)

            return!
                ctx.reply
                    "🤔 I couldn't read that as a workout. Try something like:\n/workout bench press 3x8 60kg\n/workout ran 5km in 30 minutes"
        | Ok p ->
            let entry = Workouts.add user.Id p
            let before = Workouts.bestsFor user.Id entry.Exercise entry.Id
            Logger.info (sprintf "%s logged workout: %s (%s)" user.FirstName entry.Exercise (details entry))

            let prLine =
                match entry.WeightKg, before.BestKg with
                | Some w, Some prev when w > prev -> Some(sprintf "🏆 NEW WEIGHT PR! Previous best: %.1f kg" prev)
                | _ ->
                    match entry.DistanceKm, before.BestKm with
                    | Some km, Some prev when km > prev -> Some(sprintf "🏆 Longest distance yet! Previous best: %.1f km" prev)
                    | _ ->
                        if before.BestKg.IsNone && before.BestKm.IsNone && (entry.WeightKg.IsSome || entry.DistanceKm.IsSome) then
                            Some "📘 First log for this exercise — baseline set."
                        else
                            None

            // Show the day's energy picture when it's meaningful.
            let energy = Energy.summary user entry.Date

            let energyLine =
                if user.DailyKcalTarget.IsSome || energy.Eaten > 0 then
                    Some("🔋 " + Energy.describe energy)
                else
                    None

            // Cardio distance auto-feeds any goals measured in km.
            let goalLines =
                match entry.DistanceKm with
                | Some km ->
                    Goals.autoProgress user.Id "km" km
                    |> Array.map (fun r ->
                        let g = r.Goal

                        let extra =
                            match r.Milestone with
                            | Some 100 -> " 🏆 GOAL COMPLETE!"
                            | Some m -> sprintf " 🎉 %d%%!" m
                            | None -> ""

                        sprintf "🎯 +%g km → %s (%g/%g km)%s" km g.Name g.Progress g.TargetValue extra)
                    |> Array.toList
                | None -> []

            let lines =
                ([ Some(sprintf "🏋️ Logged: %s" entry.Exercise)
                   (let d = details entry in if d = "" then None else Some d)
                   Some(sprintf "~%d kcal burned" entry.CaloriesBurned)
                   prLine
                   energyLine ]
                 |> List.choose id)
                @ goalLines

            return! ctx.reply (String.concat "\n" lines)
    }

let private showHistory (user: UserProfile) (ctx: Context) =
    let logs = Workouts.forUser user.Id |> Array.truncate 10

    if logs.Length = 0 then
        ctx.reply "No workouts logged yet. Start with: /workout bench press 3x8 60kg"
    else
        let line (l: WorkoutLog) =
            let d = details l
            sprintf
                "• %s %s — %s%s (~%d kcal)"
                (Time.dayName (System.DateTime.Parse l.Date))
                (l.Date.Substring 5)
                l.Exercise
                (if d = "" then "" else " · " + d)
                l.CaloriesBurned

        ctx.reply ("🗓 Your last workouts:\n\n" + (logs |> Array.map line |> String.concat "\n"))

let private showPrs (user: UserProfile) (ctx: Context) =
    let bests =
        Workouts.allBests user.Id
        |> Array.filter (fun b -> b.BestKg.IsSome || b.BestKm.IsSome)

    if bests.Length = 0 then
        ctx.reply "No records yet — log workouts with weights or distances and I'll track your bests."
    else
        let line (b: Workouts.Bests) =
            let parts =
                [ b.BestKg |> Option.map (sprintf "%.1f kg")
                  b.BestKm |> Option.map (sprintf "%.1f km") ]
                |> List.choose id
                |> String.concat " · "

            sprintf "🏆 %s — %s" b.Exercise parts

        ctx.reply ("Personal records:\n\n" + (bests |> Array.map line |> String.concat "\n"))

let private showTips (config: Env.AppConfig) (user: UserProfile) (ctx: Context) : JS.Promise<obj> =
    promise {
        let logs = Workouts.forUser user.Id

        if logs.Length = 0 then
            return! ctx.reply "Log a few workouts first, then I'll have something to work with!"
        else
            ctx.sendChatAction "typing" |> ignore
            let! result = Ai.Workouts.tips config logs

            match result with
            | Ok advice -> return! ctx.reply ("🧠 " + advice.Trim())
            | Error _ -> return! ctx.reply Common.aiUnavailable
    }

/// Dispatcher: /workout [history|prs|tips|add <desc>|<desc>]
let handle (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        let args = Common.commandArgs ctx

        if args.Length = 0 then
            let today = Workouts.onDate user.Id (System.DateTime.Now.ToString("yyyy-MM-dd"))

            if today.Length = 0 then
                ctx.reply usage
            else
                let summary =
                    today
                    |> Array.map (fun w -> sprintf "• %s (~%d kcal)" w.Exercise w.CaloriesBurned)
                    |> String.concat "\n"

                ctx.reply ("🏋️ Today so far:\n" + summary + "\n\n" + usage)
        else
            let rest = String.concat " " (Array.skip 1 args)

            match args.[0].ToLowerInvariant() with
            | "history" -> showHistory user ctx
            | "prs"
            | "records" -> showPrs user ctx
            | "tips" -> showTips config user ctx
            | "add" when rest.Trim() <> "" -> logWorkout config user rest ctx
            | "add" -> ctx.reply "What did you do? e.g. /workout add bench press 3x8 60kg"
            | _ -> logWorkout config user (String.concat " " args) ctx
