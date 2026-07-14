
import { equals } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { add, forUser } from "../Services/Habits.js";
import { upsert, setQuoteTime, setTimezone, completeOnboarding, setOnboardingStep } from "../Services/Users.js";
import { info } from "../Utils/Logger.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { ensureUser } from "./Common.js";
import { handleStart as handleStart_1 } from "./Basic.js";
import { parseTime, formatOffset, parseUtcOffset } from "../Utils/Time.js";
import { resolveOffset } from "../Ai/Timezone.js";

function skipKeyboard(data, label) {
    return {
        reply_markup: {
            inline_keyboard: [[{
                text: label,
                callback_data: data,
            }]],
        },
    };
}

/**
 * Whether /start should launch the wizard: mid-flow users resume, and
 * genuinely fresh users (no timezone, no habits, never finished) start it.
 * Existing users with history are left with the normal welcome.
 */
export function needsOnboarding(user) {
    if (user.OnboardingStep != null) {
        return true;
    }
    else if (!equals(user.OnboardingDone, true) && (user.TzOffsetMinutes == null)) {
        return forUser(user.Id).length === 0;
    }
    else {
        return false;
    }
}

function sendStep(userId, step, ctx) {
    setOnboardingStep(userId, step);
    switch (step) {
        case 1:
            return ctx.reply("🌍 First, what country are you in?\n\nJust tell me the country (or a city) — e.g. Singapore, United Kingdom, New York. I\'ll set your timezone from that so every reminder lands on your own clock.", skipKeyboard("onb:skip:1", "Skip for now"));
        case 2:
            return ctx.reply("🔥 Great! What\'s one habit you\'d like to build?\n\nReply with a short name — e.g. gym, read, meditate. I\'ll track it daily.", skipKeyboard("onb:skip:2", "Skip"));
        default:
            return ctx.reply("🌅 Last thing — want a daily boost?\n\nReply with a time like 07:00 and I\'ll send a motivational quote each morning. Or tap below.", skipKeyboard("onb:skip:3", "No thanks"));
    }
}

function finish(user, ctx) {
    completeOnboarding(user.Id);
    info(toText(printf("Onboarding finished for %s"))(user.FirstName));
    return ctx.reply("🎉 You\'re all set! The quick version:\n\n• Just talk to me — \"ate chicken rice\", \"slept 1am woke 8am\", \"gym done\". No commands needed.\n• /focus 25 to lock in · /coach to talk something through · /stats for your progress.\n• /help lists everything · /settings tweaks your preferences.\n\nLet\'s build some momentum. 💪");
}

/**
 * Kick off the wizard from /start.
 */
export function launch(user, ctx) {
    info(toText(printf("Onboarding started for %s"))(user.FirstName));
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (ctx.reply(toText(printf("Welcome to Momentum AI, %s! 👋\n\nI\'m your personal productivity coach. Let\'s do a 30-second setup so I can help you properly."))(user.FirstName)).then((_arg) => (sendStep(user.Id, 1, ctx))))));
}

/**
 * /start decides: onboard fresh users, otherwise the normal welcome.
 */
export function handleStart(ctx) {
    const matchValue = ensureUser(ctx);
    let matchResult, user_1;
    if (matchValue != null) {
        if (needsOnboarding(matchValue)) {
            matchResult = 0;
            user_1 = matchValue;
        }
        else {
            matchResult = 1;
        }
    }
    else {
        matchResult = 1;
    }
    switch (matchResult) {
        case 0:
            return launch(user_1, ctx);
        default:
            return handleStart_1(ctx);
    }
}

/**
 * A typed reply while a step is pending. Called by the natural-language
 * handler before it reaches the AI router.
 */
export function handleText(config, user, text, ctx) {
    const t = text.trim();
    const matchValue = user.OnboardingStep;
    let matchResult;
    if (matchValue != null) {
        switch (matchValue) {
            case 1: {
                matchResult = 0;
                break;
            }
            case 2: {
                matchResult = 1;
                break;
            }
            case 3: {
                matchResult = 2;
                break;
            }
            default:
                matchResult = 3;
        }
    }
    else {
        matchResult = 3;
    }
    switch (matchResult) {
        case 0: {
            const matchValue_1 = parseUtcOffset(t);
            if (matchValue_1 == null) {
                return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
                    ctx.sendChatAction("typing");
                    return resolveOffset(config, t).then((_arg_1) => {
                        let arg_1;
                        const resolved = _arg_1;
                        if (resolved.tag === 1) {
                            return ctx.reply("I couldn\'t place that. Try your country name, a major city, or a UTC offset like +8 — or tap Skip above.");
                        }
                        else {
                            const mins_1 = resolved.fields[0];
                            setTimezone(user.Id, mins_1);
                            return ctx.reply((arg_1 = formatOffset(mins_1), toText(printf("🌍 Got it — timezone set to %s. You can fine-tune it anytime with /settings timezone."))(arg_1))).then((_arg_2) => (sendStep(user.Id, 2, ctx)));
                        }
                    });
                }));
            }
            else {
                const mins = matchValue_1;
                setTimezone(user.Id, mins);
                return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
                    let arg;
                    return ctx.reply((arg = formatOffset(mins), toText(printf("🌍 Timezone set to %s."))(arg))).then((_arg) => (sendStep(user.Id, 2, ctx)));
                }));
            }
        }
        case 1:
            if ((t === "") ? true : (t.length > 40)) {
                return ctx.reply("Give me a short habit name (under 40 characters), e.g. gym.");
            }
            else {
                add(user.Id, t, "daily");
                return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (ctx.reply(toText(printf("🌱 Tracking \"%s\" daily. Check it off with /habit done %s, or just say \"%s done\"."))(t)(t)(t)).then((_arg_3) => (sendStep(user.Id, 3, ctx))))));
            }
        case 2: {
            const matchValue_2 = parseTime(t);
            if (matchValue_2 == null) {
                return ctx.reply("Reply with a time like 07:00, or tap \"No thanks\" above.");
            }
            else {
                const time = matchValue_2;
                setQuoteTime(user.Id, time);
                return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (ctx.reply(toText(printf("🌅 Daily quote scheduled for %s."))(time)).then((_arg_4) => (finish(user, ctx))))));
            }
        }
        default:
            return ctx.reply("Type /help to see what I can do.");
    }
}

/**
 * A Skip button was tapped for the given step.
 */
export function handleSkip(step, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const matchValue = ctx.from;
        const matchValue_1 = ctx.chat;
        let matchResult, chat, from;
        if (matchValue != null) {
            if (matchValue_1 != null) {
                matchResult = 0;
                chat = matchValue_1;
                from = matchValue;
            }
            else {
                matchResult = 1;
            }
        }
        else {
            matchResult = 1;
        }
        switch (matchResult) {
            case 0: {
                const user = upsert(from.id, chat.id, from.first_name, from.username);
                return ctx.answerCbQuery().then((_arg) => (ctx.editMessageText("⏭ Skipped.").then((_arg_1) => ((step >= 3) ? (finish(user, ctx)) : (sendStep(from.id, step + 1, ctx))))));
            }
            default:
                return ctx.answerCbQuery();
        }
    }));
}

