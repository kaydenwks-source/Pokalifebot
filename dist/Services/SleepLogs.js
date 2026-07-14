
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { save, load } from "./Storage.js";
import { sumBy, append, tryFind, sortByDescending } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { comparePrimitives } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { addDays, now, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { toMinutes } from "../Utils/Time.js";
import { SleepLog } from "../Models/Sleep.js";
import { Points_Sleep, award } from "./Gamification.js";
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, int32_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";

const filePath = "database/sleep.json";

export const targetMinutes = 480;

export function getAll() {
    return defaultArg(load(filePath), []);
}

function saveAll(logs) {
    save(filePath, logs);
}

/**
 * A user's logs, newest first (ISO dates sort correctly as strings).
 */
export function forUser(userId) {
    let array;
    return sortByDescending((l_1) => l_1.Date, (array = getAll(), array.filter((l) => (l.UserId === userId))), {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    });
}

function todayDate() {
    return toString(now(), "yyyy-MM-dd");
}

export function todayLog(userId) {
    return tryFind((l) => (l.Date === todayDate()), forUser(userId));
}

/**
 * Log (or overwrite) today's sleep. Crossing midnight is handled:
 * bed 23:30 wake 07:00 = 7h30m. Returns the entry + whether it replaced
 * an earlier entry for today.
 */
export function logToday(userId, bedTime, wakeTime) {
    const bed = toMinutes(bedTime) | 0;
    const wake = toMinutes(wakeTime) | 0;
    const duration = ((wake > bed) ? (wake - bed) : ((wake - bed) + 1440)) | 0;
    const entry = new SleepLog(userId, todayDate(), bedTime, wakeTime, duration);
    const all = getAll();
    const replaced = all.some((l) => {
        if (l.UserId === userId) {
            return l.Date === entry.Date;
        }
        else {
            return false;
        }
    });
    saveAll(append(all.filter((l_1) => !((l_1.UserId === userId) && (l_1.Date === entry.Date))), [entry]));
    if (!replaced) {
        award(userId, Points_Sleep);
    }
    return [entry, replaced];
}

export class Stats extends Record {
    constructor(Count7, Avg7, Debt7, Count30, Avg30) {
        super();
        this.Count7 = (Count7 | 0);
        this.Avg7 = (Avg7 | 0);
        this.Debt7 = (Debt7 | 0);
        this.Count30 = (Count30 | 0);
        this.Avg30 = (Avg30 | 0);
    }
}

export function Stats_$reflection() {
    return record_type("Services.SleepLogs.Stats", [], Stats, () => [["Count7", int32_type], ["Avg7", int32_type], ["Debt7", int32_type], ["Count30", int32_type], ["Avg30", int32_type]]);
}

export function statsFor(userId) {
    const logs = forUser(userId);
    if (logs.length === 0) {
        return undefined;
    }
    else {
        const cutoff = (days) => toString(addDays(now(), -days), "yyyy-MM-dd");
        const last7 = logs.filter((l) => (l.Date > cutoff(7)));
        const last30 = logs.filter((l_1) => (l_1.Date > cutoff(30)));
        const avg = (xs) => {
            if (xs.length === 0) {
                return 0;
            }
            else {
                return ~~(sumBy((l_2) => (l_2.DurationMinutes | 0), xs, {
                    GetZero: () => 0,
                    Add: (x, y) => ((x + y) | 0),
                }) / xs.length) | 0;
            }
        };
        return new Stats(last7.length, avg(last7), sumBy((l_3) => ((targetMinutes - l_3.DurationMinutes) | 0), last7, {
            GetZero: () => 0,
            Add: (x_1, y_1) => ((x_1 + y_1) | 0),
        }), last30.length, avg(last30));
    }
}

