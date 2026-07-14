
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { dayName, parseTime, formatDuration } from "../Utils/Time.js";
import { statsFor, forUser, todayLog, logToday } from "../Services/SleepLogs.js";
import { info } from "../Utils/Logger.js";
import { equalsWith, item, map, truncate } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { parse } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { op_UnaryNegation_Int32 } from "../fable_modules/fable-library-js.5.7.0/Int32.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { analyse } from "../Ai/Sleep.js";
import { commandArgs, ensureUser, aiUnavailable } from "./Common.js";
import { defaultOf } from "../fable_modules/fable-library-js.5.7.0/Util.js";

const usage = join("\n", ["😴 Sleep tracker", "", "/sleep 23:30 07:00 — log last night (bed time, then wake time)", "/sleep today — today\'s entry", "/sleep history — your last 7 nights", "/sleep stats — averages, sleep debt and AI analysis"]);

function describe(log) {
    const arg_2 = formatDuration(log.DurationMinutes);
    return toText(printf("%s → %s (%s)"))(log.BedTime)(log.WakeTime)(arg_2);
}

function logNight(user, bedRaw, wakeRaw, ctx) {
    let arg_1, arg_2;
    const matchValue = parseTime(bedRaw);
    const matchValue_1 = parseTime(wakeRaw);
    let matchResult, bed_1, wake_1;
    if (matchValue != null) {
        if (matchValue_1 != null) {
            if (matchValue !== matchValue_1) {
                matchResult = 0;
                bed_1 = matchValue;
                wake_1 = matchValue_1;
            }
            else {
                matchResult = 1;
            }
        }
        else {
            matchResult = 2;
        }
    }
    else {
        matchResult = 2;
    }
    switch (matchResult) {
        case 0: {
            const patternInput = logToday(user.Id, bed_1, wake_1);
            const entry = patternInput[0];
            info((arg_1 = describe(entry), toText(printf("%s logged sleep %s"))(user.FirstName)(arg_1)));
            const note = patternInput[1] ? "\n(Updated today\'s earlier entry.)" : "";
            const sanity = (entry.DurationMinutes < 240) ? "\nThat\'s a short night — be kind to yourself today." : ((entry.DurationMinutes > 840) ? "\nThat\'s a long one! If the times are wrong, just log again to overwrite." : "");
            return ctx.reply((arg_2 = describe(entry), toText(printf("✅ Sleep logged: %s%s%s"))(arg_2)(note)(sanity)));
        }
        case 1:
            return ctx.reply("Bed and wake times are identical — the order is: /sleep <bed time> <wake time>");
        default:
            return ctx.reply("One of those times doesn\'t look right. Use 24h HH:MM, e.g. /sleep 23:30 07:00");
    }
}

function showToday(user, ctx) {
    let arg;
    const matchValue = todayLog(user.Id);
    if (matchValue == null) {
        return ctx.reply("No sleep logged today yet. Log it like: /sleep 23:30 07:00");
    }
    else {
        const log = matchValue;
        return ctx.reply((arg = describe(log), toText(printf("😴 Today: %s"))(arg)));
    }
}

function showHistory(user, ctx) {
    const logs = truncate(7, forUser(user.Id));
    if (logs.length === 0) {
        return ctx.reply("No sleep logs yet. Start tonight: /sleep 23:30 07:00");
    }
    else {
        const lines = join("\n", map((l) => {
            const day = dayName(parse(l.Date));
            const arg_2 = describe(l);
            return toText(printf("• %s %s — %s"))(day)(l.Date)(arg_2);
        }, logs));
        return ctx.reply("🗓 Your last nights:\n\n" + lines);
    }
}

function showStats(config, user, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        let arg_3, arg_5;
        const matchValue = statsFor(user.Id);
        if (matchValue != null) {
            const s = matchValue;
            let debtLine;
            if (s.Debt7 > 0) {
                const arg = formatDuration(s.Debt7);
                debtLine = toText(printf("Sleep debt: %s short of the 8h target."))(arg);
            }
            else if (s.Debt7 < 0) {
                const arg_1 = formatDuration(op_UnaryNegation_Int32(s.Debt7));
                debtLine = toText(printf("Sleep surplus: %s ahead of the 8h target."))(arg_1);
            }
            else {
                debtLine = "You\'re exactly on the 8h target.";
            }
            const text = join("\n", ["📊 Sleep stats", "", (arg_3 = formatDuration(s.Avg7), toText(printf("Last 7 days: %d nights logged, avg %s"))(s.Count7)(arg_3)), (arg_5 = formatDuration(s.Avg30), toText(printf("Last 30 days: %d nights logged, avg %s"))(s.Count30)(arg_5)), debtLine]);
            return ctx.reply(text).then((_arg) => {
                ctx.sendChatAction("typing");
                return analyse(config, forUser(user.Id)).then((_arg_1) => {
                    const analysis = _arg_1;
                    return (analysis.tag === 1) ? (ctx.reply(aiUnavailable)) : (ctx.reply("🧠 " + analysis.fields[0]));
                });
            });
        }
        else {
            return ctx.reply("No sleep logs yet. Start tonight: /sleep 23:30 07:00");
        }
    }));
}

/**
 * Dispatcher: /sleep [today|history|stats|<bed> <wake>]
 */
export function handle(config, ctx) {
    let sub, sub_1, sub_2;
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const matchValue_1 = commandArgs(ctx);
        let matchResult;
        if (!equalsWith((x, y) => (x === y), matchValue_1, defaultOf()) && (matchValue_1.length === 0)) {
            matchResult = 0;
        }
        else if (!equalsWith((x_1, y_1) => (x_1 === y_1), matchValue_1, defaultOf()) && (matchValue_1.length === 1)) {
            if ((sub = item(0, matchValue_1), sub.toLowerCase() === "today")) {
                matchResult = 1;
            }
            else if ((sub_1 = item(0, matchValue_1), sub_1.toLowerCase() === "history")) {
                matchResult = 2;
            }
            else if ((sub_2 = item(0, matchValue_1), sub_2.toLowerCase() === "stats")) {
                matchResult = 3;
            }
            else {
                matchResult = 5;
            }
        }
        else if (!equalsWith((x_2, y_2) => (x_2 === y_2), matchValue_1, defaultOf()) && (matchValue_1.length === 2)) {
            matchResult = 4;
        }
        else {
            matchResult = 5;
        }
        switch (matchResult) {
            case 0:
                return ctx.reply(usage);
            case 1: {
                const sub_3 = item(0, matchValue_1);
                return showToday(user, ctx);
            }
            case 2: {
                const sub_4 = item(0, matchValue_1);
                return showHistory(user, ctx);
            }
            case 3: {
                const sub_5 = item(0, matchValue_1);
                return showStats(config, user, ctx);
            }
            case 4: {
                const wake = item(1, matchValue_1);
                return logNight(user, item(0, matchValue_1), wake, ctx);
            }
            default:
                return ctx.reply(usage);
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

