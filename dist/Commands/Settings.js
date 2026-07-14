
import { map, defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { parseTime, userNow, parseUtcOffset, formatOffset } from "../Utils/Time.js";
import { substring, join, printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { setGamification, setNudgeEvening, setNudgeMorning, setTimezone as setTimezone_1, gamificationOn } from "../Services/Users.js";
import { info } from "../Utils/Logger.js";
import { toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { commandArgs, ensureUser } from "./Common.js";
import { skip, item, equalsWith } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { defaultOf } from "../fable_modules/fable-library-js.5.7.0/Util.js";

function overview(user) {
    let clo, clo_1, clo_2, arg_9;
    const tz = defaultArg(map(formatOffset, user.TzOffsetMinutes), "server time (not set)");
    const morning = defaultArg(user.NudgeMorning, "08:00");
    const evening = defaultArg(user.NudgeEvening, "19:00");
    const quote = defaultArg(map((clo = toText(printf("%s daily")), clo), user.QuoteTime), "off");
    const target = defaultArg(map((clo_1 = toText(printf("%.0f kcal/day")), clo_1), user.DailyKcalTarget), "not set");
    const height = defaultArg(map((clo_2 = toText(printf("%.0f cm")), clo_2), user.HeightCm), "not set");
    return join("\n", ["⚙️ Your settings", "", toText(printf("🌍 Timezone: %s"))(tz), toText(printf("🔔 Habit nudges: %s (morning) · %s (evening)"))(morning)(evening), toText(printf("🌅 Daily quote: %s"))(quote), toText(printf("🎯 Calorie target: %s"))(target), toText(printf("📏 Height: %s"))(height), (arg_9 = (gamificationOn(user) ? "on" : "off"), toText(printf("🎮 Gamification: %s"))(arg_9)), "", "Change things:", "/settings timezone +8 — set your UTC offset (e.g. +8, -5:30)", "/settings morning 07:30 — move the morning nudge", "/settings evening 21:00 — move the evening nudge", "/settings gamification on|off — XP, levels and badges", "/quotetime 07:00 — daily quote time · /nudges on|off", "/target 68 in 10 weeks — calorie goal · /height 175", "", "📐 Units are metric only (kg, cm, kcal) for now."]);
}

function setTimezone(ctx, user, raw) {
    let arg_1, arg_2, arg_3;
    const matchValue = parseUtcOffset(raw);
    if (matchValue == null) {
        return ctx.reply("That doesn\'t look like an offset. Try /settings timezone +8 or /settings timezone -5:30.");
    }
    else {
        const minutes = matchValue;
        setTimezone_1(user.Id, minutes);
        info((arg_1 = formatOffset(minutes), toText(printf("%s set timezone to %s"))(user.FirstName)(arg_1)));
        return ctx.reply((arg_2 = formatOffset(minutes), (arg_3 = toString(userNow(minutes), "ddd HH:mm"), toText(printf("🌍 Timezone set to %s. Your scheduled quotes, nudges, reminders and reports now follow your local clock.\n\nYour local time is about %s."))(arg_2)(arg_3))));
    }
}

function setNudge(ctx, user, which, raw) {
    let arg_3;
    const matchValue = parseTime(raw);
    if (matchValue == null) {
        return ctx.reply(toText(printf("Use a 24h time, e.g. /settings %s 07:30."))(which));
    }
    else {
        const time = matchValue;
        if (which === "morning") {
            setNudgeMorning(user.Id, time);
        }
        else {
            setNudgeEvening(user.Id, time);
        }
        info(toText(printf("%s set %s nudge to %s"))(user.FirstName)(which)(time));
        return ctx.reply((arg_3 = (substring(which, 0, 1).toLocaleUpperCase() + substring(which, 1)), toText(printf("🔔 %s nudge moved to %s (your local time)."))(arg_3)(time)));
    }
}

export function handle(ctx) {
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const args = commandArgs(ctx);
        if (!equalsWith((x, y) => (x === y), args, defaultOf()) && (args.length === 0)) {
            return ctx.reply(overview(user));
        }
        else {
            const sub = item(0, args).toLowerCase();
            const rest = (args.length > 1) ? join(" ", skip(1, args)) : "";
            switch (sub) {
                case "timezone":
                case "tz":
                    if (rest === "") {
                        return ctx.reply("What offset? e.g. /settings timezone +8");
                    }
                    else {
                        return setTimezone(ctx, user, rest);
                    }
                case "morning":
                    if (rest === "") {
                        return ctx.reply("What time? e.g. /settings morning 07:30");
                    }
                    else {
                        return setNudge(ctx, user, "morning", rest);
                    }
                case "evening":
                    if (rest === "") {
                        return ctx.reply("What time? e.g. /settings evening 21:00");
                    }
                    else {
                        return setNudge(ctx, user, "evening", rest);
                    }
                case "gamification":
                case "game":
                case "xp": {
                    const matchValue_1 = rest.trim().toLowerCase();
                    switch (matchValue_1) {
                        case "off": {
                            setGamification(user.Id, false);
                            info(toText(printf("%s turned gamification off"))(user.FirstName));
                            return ctx.reply("🎮 Gamification off. XP, levels and badges are paused — your logs still count for everything else. Turn it back on: /settings gamification on");
                        }
                        case "on": {
                            setGamification(user.Id, true);
                            info(toText(printf("%s turned gamification on"))(user.FirstName));
                            return ctx.reply("🎮 Gamification on — you\'ll earn XP again for habits, workouts, meals, sleep and goals. See /stats.");
                        }
                        default: {
                            const state = gamificationOn(user) ? "on" : "off";
                            return ctx.reply(toText(printf("Gamification is %s. Switch with /settings gamification on or /settings gamification off."))(state));
                        }
                    }
                }
                default:
                    return ctx.reply(overview(user));
            }
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

