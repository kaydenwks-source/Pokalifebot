
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { save, load } from "./Storage.js";
import { sum, choose, append, sortByDescending } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { comparePrimitives } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { addDays, now, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { Points_Reflect, award } from "./Gamification.js";
import { Reflection } from "../Models/Reflection.js";
import { op_UnaryNegation_Int32 } from "../fable_modules/fable-library-js.5.7.0/Int32.js";

const filePath = "database/journal.json";

export function getAll() {
    return defaultArg(load(filePath), []);
}

function saveAll(xs) {
    save(filePath, xs);
}

/**
 * A user's entries, newest first.
 */
export function forUser(userId) {
    let array;
    return sortByDescending((r_1) => r_1.Stamp, (array = getAll(), array.filter((r) => (r.UserId === userId))), {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    });
}

function today() {
    return toString(now(), "yyyy-MM-dd");
}

function awardOncePerDay(userId) {
    let array;
    if (!((array = getAll(), array.some((r) => {
        if (r.UserId === userId) {
            return r.Date === today();
        }
        else {
            return false;
        }
    })))) {
        award(userId, Points_Reflect);
    }
}

export function add(userId, mood, text) {
    awardOncePerDay(userId);
    const r = new Reflection(userId, today(), toString(now(), "yyyy-MM-dd HH:mm"), mood, text);
    saveAll(append(getAll(), [r]));
    return r;
}

/**
 * Mood ratings logged in the last `days` days.
 */
export function recentMoods(userId, days) {
    let array;
    const cutoff = toString(addDays(now(), op_UnaryNegation_Int32(days)), "yyyy-MM-dd");
    return choose((r_1) => r_1.Mood, (array = forUser(userId), array.filter((r) => (r.Date > cutoff))), Int32Array);
}

export function avgMood7(userId) {
    const ms = recentMoods(userId, 7);
    if (ms.length === 0) {
        return undefined;
    }
    else {
        return sum(ms, {
            GetZero: () => 0,
            Add: (x, y) => ((x + y) | 0),
        }) / ms.length;
    }
}

