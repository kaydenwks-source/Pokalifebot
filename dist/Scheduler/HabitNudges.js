
import { Union } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { union_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { forUser, streaksForHabit } from "../Services/Habits.js";
import { join, printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { map } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { PromiseBuilder__For_1565554B, PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { error, info } from "../Utils/Logger.js";
import { nudgesOn, getAll } from "../Services/Users.js";
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import * as node_cron from "node-cron";
import { toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { userNow } from "../Utils/Time.js";
import { disposeSafe, getEnumerator } from "../fable_modules/fable-library-js.5.7.0/Util.js";

export class Kind extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Morning", "Evening"];
    }
    static Morning = new Kind(0, []);
    static Evening = new Kind(1, []);
}

export function Kind_$reflection() {
    return union_type("Scheduler.HabitNudges.Kind", [], Kind, () => [[], []]);
}

function habitLine(h) {
    const s = streaksForHabit(h);
    if (s.Current > 0) {
        return toText(printf("⬜ %s — 🔥 %d on the line"))(h.Name)(s.Current);
    }
    else {
        return toText(printf("⬜ %s"))(h.Name);
    }
}

function messageFor(kind, firstName, habits) {
    const pending = habits.filter((h) => !streaksForHabit(h).DoneThisPeriod);
    if (pending.length > 0) {
        const lines = join("\n", map(habitLine, pending));
        if (kind.tag === 1) {
            return toText(printf("🌙 Evening check-in — still open:\n\n%s\n\nStill time to close the day strong: /habit done <name>"))(lines);
        }
        else {
            return toText(printf("🌅 Morning, %s! On your plate today:\n\n%s\n\nCheck off with /habit done <name>"))(firstName)(lines);
        }
    }
    else if (kind.tag === 0) {
        return undefined;
    }
    else {
        return "🌙 All habits done — clean sweep! 🎉 Rest well.";
    }
}

function label(kind) {
    if (kind.tag === 1) {
        return "evening";
    }
    else {
        return "morning";
    }
}

/**
 * Send one user their nudge for this kind, if they have anything worth saying.
 */
export function sendNudgeTo(bot, kind, user) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const habits = forUser(user.Id);
        if (habits.length > 0) {
            const matchValue = messageFor(kind, user.FirstName, habits);
            if (matchValue == null) {
                return Promise.resolve();
            }
            else {
                const text = matchValue;
                return PromiseBuilder__Delay_62FBFDE1(promise, () => (bot.telegram.sendMessage(user.ChatId, text).then((_arg) => {
                    let arg;
                    info((arg = label(kind), toText(printf("Habit nudge (%s) sent to %s"))(arg)(user.FirstName)));
                    return Promise.resolve();
                }))).catch((_arg_1) => {
                    let arg_3;
                    error((arg_3 = _arg_1.message, toText(printf("Habit nudge to %s failed: %s"))(user.FirstName)(arg_3)));
                    return Promise.resolve();
                });
            }
        }
        else {
            return Promise.resolve();
        }
    }));
}

/**
 * Public so tests can trigger a nudge round without waiting for the cron.
 */
export function sendNudges(bot, kind) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        let array;
        return PromiseBuilder__For_1565554B(promise, (array = getAll(), array.filter(nudgesOn)), (_arg) => (sendNudgeTo(bot, kind, _arg).then(() => (Promise.resolve(undefined)))));
    }));
}

function timeFor(kind, user) {
    if (kind.tag === 1) {
        return defaultArg(user.NudgeEvening, "19:00");
    }
    else {
        return defaultArg(user.NudgeMorning, "08:00");
    }
}

export function start(bot) {
    node_cron.schedule("* * * * *", () => {
        let array_1;
        const array = getAll();
        array_1 = array.filter(nudgesOn);
        array_1.forEach((user_1) => {
            const now = toString(userNow(user_1.TzOffsetMinutes), "HH:mm");
            const enumerator = getEnumerator([Kind.Morning, Kind.Evening]);
            try {
                while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                    const kind = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                    if (timeFor(kind, user_1) === now) {
                        sendNudgeTo(bot, kind, user_1);
                    }
                }
            }
            finally {
                disposeSafe(enumerator);
            }
        });
    });
    info("Habit nudge scheduler started (per-user times, checks every minute)");
}

