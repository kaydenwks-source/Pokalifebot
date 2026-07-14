
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { markDone, remove, add, streaksForHabit, tryFind, forUser } from "../Services/Habits.js";
import { skip, map, getSubArray, mapIndexed, item } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { tryParse } from "../fable_modules/fable-library-js.5.7.0/Int32.js";
import { FSharpRef } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { Cadence_periodPhrase, Cadence_streakUnit, Cadence_tryNormalise } from "../Models/Habit.js";
import { info } from "../Utils/Logger.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { generate, milestone } from "../Ai/Encourage.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { commandArg, commandArgs, ensureUser } from "./Common.js";
import { map as map_1 } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { nudgesOn, setNudges } from "../Services/Users.js";

const usage = join("\n", ["🔥 Habit tracker", "", "/habit add <name> [daily|weekly|monthly] — start tracking (daily if omitted)", "/habit done <name or number> — check it off", "/habit list — your habits and streaks", "/habit stats — streaks, records and totals", "/habit remove <name or number> — stop tracking", "", "Examples: /habit add gym · /habit add reading weekly · /habit done gym"]);

function resolve(user, arg) {
    const trimmed = arg.trim();
    const mine = forUser(user.Id);
    if (trimmed === "") {
        if (mine.length === 1) {
            return item(0, mine);
        }
        else {
            return undefined;
        }
    }
    else {
        let matchValue;
        let outArg = 0;
        matchValue = [tryParse(trimmed, 511, false, 32, new FSharpRef(() => (outArg | 0), (v) => {
            outArg = (v | 0);
        })), outArg];
        if (matchValue[0]) {
            const i = matchValue[1] | 0;
            if ((i >= 1) && (i <= mine.length)) {
                return item(i - 1, mine);
            }
            else {
                return undefined;
            }
        }
        else {
            return tryFind(user.Id, trimmed);
        }
    }
}

function showList(user, ctx) {
    const mine = forUser(user.Id);
    if (mine.length === 0) {
        return ctx.reply("No habits yet. Add one: /habit add gym  (or: /habit add reading weekly)");
    }
    else {
        const lines = join("\n", mapIndexed((i, h) => {
            const s = streaksForHabit(h);
            const mark = s.DoneThisPeriod ? "✅" : "⬜";
            const arg = (i + 1) | 0;
            return toText(printf("%d. %s %s (%s) — 🔥 %d"))(arg)(mark)(h.Name)(h.Cadence)(s.Current);
        }, mine));
        return ctx.reply(("🔥 Your habits:\n\n" + lines) + "\n\nCheck one off: /habit done <name or number>");
    }
}

function addHabit(user, rest, ctx) {
    let c;
    if (rest.length === 0) {
        return ctx.reply("Usage: /habit add <name> [daily|weekly|monthly]\nExample: /habit add gym · /habit add reading weekly");
    }
    else {
        let patternInput;
        const matchValue = Cadence_tryNormalise(item(rest.length - 1, rest));
        let matchResult, c_1;
        if (matchValue != null) {
            if ((c = matchValue, rest.length > 1)) {
                matchResult = 0;
                c_1 = matchValue;
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
                patternInput = [c_1, getSubArray(rest, 0, rest.length - 1)];
                break;
            }
            default:
                patternInput = ["daily", rest];
        }
        const name = join(" ", patternInput[1]);
        if (name.length > 40) {
            return ctx.reply("That name is a bit long — keep it under 40 characters.");
        }
        else {
            const matchValue_1 = add(user.Id, name, patternInput[0]);
            if (matchValue_1.tag === 0) {
                const h = matchValue_1.fields[0];
                info(toText(printf("%s added habit %s (%s)"))(user.FirstName)(h.Name)(h.Cadence));
                return ctx.reply(toText(printf("🌱 Added \"%s\" (%s). First check-in: /habit done %s"))(h.Name)(h.Cadence)(h.Name));
            }
            else {
                return ctx.reply(toText(printf("You\'re already tracking \"%s\" — see /habit list"))(name));
            }
        }
    }
}

function removeHabit(user, arg, ctx) {
    let arg_4;
    const matchValue = resolve(user, arg);
    if (matchValue == null) {
        return ctx.reply((arg_4 = arg.trim(), toText(printf("I couldn\'t find \"%s\" — check /habit list"))(arg_4)));
    }
    else {
        const h = matchValue;
        remove(h);
        info(toText(printf("%s removed habit %s"))(user.FirstName)(h.Name));
        return ctx.reply(toText(printf("🗑 Removed \"%s\" and its history."))(h.Name));
    }
}

function checkOff(config, user, arg, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        let arg_9, arg_1;
        const matchValue = resolve(user, arg);
        if (matchValue != null) {
            const habit = matchValue;
            const respond = (h, s, froze) => PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
                let arg_7;
                info(toText(printf("%s checked off %s (streak %d)"))(user.FirstName)(h.Name)(s.Current));
                const record = ((s.Current >= 3) && (s.Current === s.Longest)) ? " New personal best! 🏆" : "";
                const baseMsg = (froze ? "🧊 Used your weekly streak freeze — the missed day is covered!\n\n" : "") + ((arg_7 = Cadence_streakUnit(h.Cadence, s.Current), toText(printf("✅ %s done! 🔥 Streak: %d %s.%s"))(h.Name)(s.Current)(arg_7)(record)));
                if (milestone(s.Current)) {
                    ctx.sendChatAction("typing");
                    return generate(config, h.Name, h.Cadence, s.Current).then((_arg) => {
                        const encouragement = _arg;
                        const extra = (encouragement.tag === 1) ? "" : ("\n\n" + encouragement.fields[0].trim());
                        return ctx.reply(baseMsg + extra);
                    });
                }
                else {
                    return ctx.reply(baseMsg);
                }
            }));
            const matchValue_1 = markDone(habit);
            return (matchValue_1.tag === 0) ? (respond(matchValue_1.fields[0], matchValue_1.fields[1], false)) : ((matchValue_1.tag === 1) ? (respond(matchValue_1.fields[0], matchValue_1.fields[1], true)) : (ctx.reply((arg_9 = Cadence_periodPhrase(habit.Cadence), toText(printf("Already done %s — streak is %d. See you next time! 💪"))(arg_9)(matchValue_1.fields[0].Current)))));
        }
        else {
            return ctx.reply((arg_1 = arg.trim(), toText(printf("I couldn\'t find a habit called \"%s\" — check /habit list"))(arg_1)));
        }
    }));
}

function showStats(user, ctx) {
    const mine = forUser(user.Id);
    if (mine.length === 0) {
        return ctx.reply("No habits yet. Add one: /habit add gym");
    }
    else {
        return ctx.reply("📊 Habit stats\n\n" + join("\n\n", map((h) => {
            const s = streaksForHabit(h);
            const arg_4 = h.Completions.length | 0;
            return toText(printf("%s (%s)\n  🔥 current %d · 🏆 longest %d · ✅ %d check-ins total"))(h.Name)(h.Cadence)(s.Current)(s.Longest)(arg_4);
        }, mine)));
    }
}

/**
 * Dispatcher: /habit [add|done|list|stats|remove] ...
 */
export function handle(config, ctx) {
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const args = commandArgs(ctx);
        if (args.length === 0) {
            return showList(user, ctx);
        }
        else {
            const rest = join(" ", skip(1, args));
            const matchValue_1 = item(0, args).toLowerCase();
            switch (matchValue_1) {
                case "add":
                    return addHabit(user, skip(1, args), ctx);
                case "done":
                    return checkOff(config, user, rest, ctx);
                case "remove":
                case "delete":
                    return removeHabit(user, rest, ctx);
                case "list":
                    return showList(user, ctx);
                case "stats":
                    return showStats(user, ctx);
                default:
                    return ctx.reply(usage);
            }
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

/**
 * /habits — quick alias for /habit list.
 */
export function handleListShortcut(ctx) {
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        return showList(matchValue, ctx);
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

/**
 * /nudges [on|off] — toggle the 08:00/19:00 habit reminders.
 */
export function handleNudges(ctx) {
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const matchValue_1 = map_1((s) => s.trim().toLowerCase(), commandArg(ctx));
        let matchResult;
        if (matchValue_1 != null) {
            switch (matchValue_1) {
                case "off": {
                    matchResult = 0;
                    break;
                }
                case "on": {
                    matchResult = 1;
                    break;
                }
                default:
                    matchResult = 2;
            }
        }
        else {
            matchResult = 2;
        }
        switch (matchResult) {
            case 0: {
                setNudges(user.Id, false);
                info(toText(printf("%s turned habit nudges off"))(user.FirstName));
                return ctx.reply("🔕 Habit nudges off. Re-enable anytime with /nudges on.");
            }
            case 1: {
                setNudges(user.Id, true);
                info(toText(printf("%s turned habit nudges on"))(user.FirstName));
                return ctx.reply("🔔 Habit nudges on — I\'ll check in at 08:00 and 19:00 daily.");
            }
            default: {
                const state = nudgesOn(user) ? "ON 🔔" : "OFF 🔕";
                return ctx.reply(toText(printf("Habit nudges are %s (08:00 & 19:00 daily). Switch with /nudges on or /nudges off."))(state));
            }
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

