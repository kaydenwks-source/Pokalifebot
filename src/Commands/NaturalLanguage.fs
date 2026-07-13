/// The natural-language entry point (Phase 22). Any plain-text message that
/// isn't a command lands here: one AI call classifies the intent, then we
/// dispatch to the matching tracker — so users can just say "ate chicken rice"
/// or "slept 1am woke 8am" instead of remembering command syntax.
///
/// The core `route` is also reused by voice input (Phase 27): a transcribed
/// voice note is fed through the same intent router as typed text.
///
/// Budget note: this is the ONLY gate for the whole interaction. The router
/// call is metered once; the sub-parsers it may invoke (food, workout,
/// reminder, coach) are not double-counted.
module Commands.NaturalLanguage

open Fable.Core
open Bindings.Telegraf
open Models.User
open Services
open Utils
open Config

/// Route a piece of user text (typed or transcribed) to the right tracker.
/// Handles the onboarding intercept first, then the AI budget + classifier.
let route (config: Env.AppConfig) (user: UserProfile) (text: string) (ctx: Context) : JS.Promise<obj> =
    promise {
        // Mid-onboarding: the text is an answer to the setup wizard, not a
        // tracker command — hand it to the wizard and skip classification.
        if user.OnboardingStep.IsSome then
            return! Commands.Onboarding.handleText config user text ctx
        else
            match Entitlements.check config.AdminUserId user "nl" with
            | Error budgetMsg -> return! ctx.reply budgetMsg
            | Ok() ->
                ctx.sendChatAction "typing" |> ignore
                let! routed = Ai.Router.classify config text

                match routed with
                | Error _ -> return! ctx.reply Common.aiUnavailable
                | Ok intent ->
                    Entitlements.commit config.AdminUserId user "nl"

                    match intent with
                    | Ai.Router.Weight kg ->
                        WeightLogs.upsertToday user.Id (WeightLogs.Weight kg) |> ignore
                        return! ctx.reply (sprintf "⚖️ Logged: %.1f kg. Trends and BMI in /progress." kg)

                    | Ai.Router.Sleep(bed, wake) ->
                        let entry, replaced = SleepLogs.logToday user.Id bed wake
                        let verb = if replaced then "Updated" else "Logged"

                        return!
                            ctx.reply (
                                sprintf
                                    "😴 %s: %s → %s (%s). More in /sleep stats."
                                    verb
                                    bed
                                    wake
                                    (Time.formatDuration entry.DurationMinutes)
                            )

                    | Ai.Router.Habit name ->
                        match Habits.tryFind user.Id name with
                        | None ->
                            return!
                                ctx.reply (
                                    sprintf
                                        "🤔 I don't have a habit called \"%s\". Add it with /habit add %s, or see /habit list."
                                        name
                                        name
                                )
                        | Some h ->
                            match Habits.markDone h with
                            | Habits.AlreadyDone s ->
                                return! ctx.reply (sprintf "✅ \"%s\" was already done this period — 🔥 %d. Nice." h.Name s.Current)
                            | Habits.Marked(_, s) -> return! ctx.reply (sprintf "✅ Done: %s — 🔥 %d streak!" h.Name s.Current)
                            | Habits.MarkedWithFreeze(_, s) ->
                                return! ctx.reply (sprintf "🧊 Used your weekly streak freeze — ✅ %s, 🔥 %d streak safe!" h.Name s.Current)

                    | Ai.Router.Food _ ->
                        let! result = Ai.FoodAnalyzer.analyse config text

                        match result with
                        | Ok nutrition ->
                            let meal = Meals.add user.Id nutrition

                            return!
                                ctx.reply (
                                    sprintf
                                        "🍽 Logged: %s — %d kcal.\n🔋 %s"
                                        meal.Name
                                        meal.Calories
                                        (Energy.describe (Energy.summary user meal.Date))
                                )
                        | Error _ ->
                            return! ctx.reply "🤔 I thought that was a meal but couldn't break it down. Try /food with a little more detail."

                    | Ai.Router.Workout _ -> return! Commands.Workouts.logWorkout config user text ctx

                    | Ai.Router.Reminder _ ->
                        let! parsed = Ai.ReminderParser.parse config (Time.userNow user.TzOffsetMinutes) text

                        match parsed with
                        | Ok p ->
                            Reminders.add user.Id user.ChatId p.Text p.Date p.Time p.Repeat |> ignore
                            return! ctx.reply (sprintf "⏰ Reminder set: %s — %s at %s." p.Date p.Text p.Time)
                        | Error _ -> return! ctx.reply "🤔 I couldn't work out the timing. Try /remind tomorrow 7pm call mum."

                    | Ai.Router.Coach ->
                        let context = Reports.weeklyData user

                        let turns =
                            Array.append
                                (CoachHistory.historyFor user.Id |> Array.map (fun m -> m.Role, m.Content))
                                [| ("user", text) |]

                        let! reply = Ai.Coach.respond config user context turns

                        match reply with
                        | Ok r ->
                            CoachHistory.append user.Id "user" text
                            CoachHistory.append user.Id "assistant" (r.Trim())
                            return! ctx.reply ("🧠 " + r.Trim())
                        | Error _ -> return! ctx.reply Common.aiUnavailable

                    | Ai.Router.Unknown ->
                        return!
                            ctx.reply (
                                "🤔 I'm not sure what to do with that. You can just tell me things like:\n"
                                + "• ate chicken rice\n• slept 1am woke 8am\n• weighed 72\n• gym done\n"
                                + "…or ask for advice. /help lists every command."
                            )
    }

let handle (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    promise {
        match Common.ensureUser ctx, (ctx.message |> Option.bind (fun m -> m.text)) with
        | Some user, Some text when not (text.StartsWith "/") && text.Trim() <> "" -> return! route config user text ctx
        | _ -> return box () // commands, empty text, or unidentified user → ignore
    }
