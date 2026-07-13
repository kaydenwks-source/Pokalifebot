/// Guided first-run setup (Phase 21). A brand-new user's /start runs a short
/// 3-step wizard — timezone, first habit, daily quote — instead of dumping the
/// full command list on them. Each step accepts a typed reply OR a Skip button.
///
/// State lives on the profile (OnboardingStep). While a step is pending, the
/// natural-language handler routes plain text here instead of the AI router,
/// so answers aren't mistaken for "food"/"sleep"/etc.
module Commands.Onboarding

open Fable.Core
open Fable.Core.JsInterop
open Bindings.Telegraf
open Models.User
open Services
open Utils
open Config

/// A single-button inline keyboard used for the "skip this step" option.
let private skipKeyboard (data: string) (label: string) =
    createObj
        [ "reply_markup"
          ==> createObj [ "inline_keyboard" ==> [| [| createObj [ "text" ==> label; "callback_data" ==> data ] |] |] ] ]

/// Whether /start should launch the wizard: mid-flow users resume, and
/// genuinely fresh users (no timezone, no habits, never finished) start it.
/// Existing users with history are left with the normal welcome.
let needsOnboarding (user: UserProfile) : bool =
    user.OnboardingStep.IsSome
    || (user.OnboardingDone <> Some true
        && user.TzOffsetMinutes.IsNone
        && (Habits.forUser user.Id).Length = 0)

/// Persist the pending step and send its prompt.
let private sendStep (userId: float) (step: int) (ctx: Context) : JS.Promise<obj> =
    Users.setOnboardingStep userId (Some step)

    match step with
    | 1 ->
        ctx.reply (
            "🌍 First, what country are you in?\n\nJust tell me the country (or a city) — e.g. Singapore, United Kingdom, New York. I'll set your timezone from that so every reminder lands on your own clock.",
            skipKeyboard "onb:skip:1" "Skip for now"
        )
    | 2 ->
        ctx.reply (
            "🔥 Great! What's one habit you'd like to build?\n\nReply with a short name — e.g. gym, read, meditate. I'll track it daily.",
            skipKeyboard "onb:skip:2" "Skip"
        )
    | _ ->
        ctx.reply (
            "🌅 Last thing — want a daily boost?\n\nReply with a time like 07:00 and I'll send a motivational quote each morning. Or tap below.",
            skipKeyboard "onb:skip:3" "No thanks"
        )

let private finish (user: UserProfile) (ctx: Context) : JS.Promise<obj> =
    Users.completeOnboarding user.Id
    Logger.info (sprintf "Onboarding finished for %s" user.FirstName)

    ctx.reply (
        "🎉 You're all set! The quick version:\n\n"
        + "• Just talk to me — \"ate chicken rice\", \"slept 1am woke 8am\", \"gym done\". No commands needed.\n"
        + "• /focus 25 to lock in · /coach to talk something through · /stats for your progress.\n"
        + "• /help lists everything · /settings tweaks your preferences.\n\n"
        + "Let's build some momentum. 💪"
    )

/// Kick off the wizard from /start.
let launch (user: UserProfile) (ctx: Context) : JS.Promise<obj> =
    Logger.info (sprintf "Onboarding started for %s" user.FirstName)

    promise {
        let! _ =
            ctx.reply (
                sprintf
                    "Welcome to Momentum AI, %s! 👋\n\nI'm your personal productivity coach. Let's do a 30-second setup so I can help you properly."
                    user.FirstName
            )

        return! sendStep user.Id 1 ctx
    }

/// /start decides: onboard fresh users, otherwise the normal welcome.
let handleStart (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | Some user when needsOnboarding user -> launch user ctx
    | _ -> Commands.Basic.handleStart ctx

/// A typed reply while a step is pending. Called by the natural-language
/// handler before it reaches the AI router.
let handleText (config: Env.AppConfig) (user: UserProfile) (text: string) (ctx: Context) : JS.Promise<obj> =
    let t = text.Trim()

    match user.OnboardingStep with
    | Some 1 ->
        match Time.parseUtcOffset t with
        | Some mins ->
            // They typed a raw offset — take it directly, no AI needed.
            Users.setTimezone user.Id mins

            promise {
                let! _ = ctx.reply (sprintf "🌍 Timezone set to %s." (Time.formatOffset mins))
                return! sendStep user.Id 2 ctx
            }
        | None ->
            // Treat it as a place and let the AI resolve the offset.
            promise {
                ctx.sendChatAction "typing" |> ignore
                let! resolved = Ai.Timezone.resolveOffset config t

                match resolved with
                | Ok mins ->
                    Users.setTimezone user.Id mins

                    let! _ =
                        ctx.reply (
                            sprintf
                                "🌍 Got it — timezone set to %s. You can fine-tune it anytime with /settings timezone."
                                (Time.formatOffset mins)
                        )

                    return! sendStep user.Id 2 ctx
                | Error _ ->
                    return!
                        ctx.reply "I couldn't place that. Try your country name, a major city, or a UTC offset like +8 — or tap Skip above."
            }
    | Some 2 ->
        if t = "" || t.Length > 40 then
            ctx.reply "Give me a short habit name (under 40 characters), e.g. gym."
        else
            // Added or Duplicate — either way the habit now exists; move on.
            Habits.add user.Id t "daily" |> ignore

            promise {
                let! _ =
                    ctx.reply (
                        sprintf "🌱 Tracking \"%s\" daily. Check it off with /habit done %s, or just say \"%s done\"." t t t
                    )

                return! sendStep user.Id 3 ctx
            }
    | Some 3 ->
        match Time.parseTime t with
        | Some time ->
            Users.setQuoteTime user.Id (Some time)

            promise {
                let! _ = ctx.reply (sprintf "🌅 Daily quote scheduled for %s." time)
                return! finish user ctx
            }
        | None -> ctx.reply "Reply with a time like 07:00, or tap \"No thanks\" above."
    | _ ->
        // Not actually mid-onboarding — nothing to do.
        ctx.reply "Type /help to see what I can do."

/// A Skip button was tapped for the given step.
let handleSkip (step: int) (ctx: Context) : JS.Promise<obj> =
    promise {
        match ctx.from, ctx.chat with
        | Some from, Some chat ->
            let user = Users.upsert from.id chat.id from.first_name from.username
            let! _ = ctx.answerCbQuery ()
            let! _ = ctx.editMessageText "⏭ Skipped."

            if step >= 3 then
                return! finish user ctx
            else
                return! sendStep from.id (step + 1) ctx
        | _ -> return! ctx.answerCbQuery ()
    }
