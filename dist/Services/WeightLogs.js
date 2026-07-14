
import { value as value_1, map as map_1, defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { save, load } from "./Storage.js";
import { tryHead, map, append, tryFind, sortByDescending } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { comparePrimitives } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { Union } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { union_type, float64_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { WeightLog } from "../Models/Weight.js";
import { addDays, now, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";

const filePath = "database/weights.json";

export function getAll() {
    return defaultArg(load(filePath), []);
}

function saveAll(logs) {
    save(filePath, logs);
}

/**
 * A user's logs, newest first.
 */
export function forUser(userId) {
    let array;
    return sortByDescending((l_1) => l_1.Date, (array = getAll(), array.filter((l) => (l.UserId === userId))), {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    });
}

/**
 * Which measurement is being recorded.
 */
export class Field extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Weight", "Fat"];
    }
}

export function Field_$reflection() {
    return union_type("Services.WeightLogs.Field", [], Field, () => [[["Item", float64_type]], [["Item", float64_type]]]);
}

function apply(field, log) {
    if (field.tag === 1) {
        return new WeightLog(log.UserId, log.Date, log.Kg, field.fields[0], log.MuscleKg);
    }
    else {
        return new WeightLog(log.UserId, log.Date, field.fields[0], log.BodyFat, log.MuscleKg);
    }
}

/**
 * Record a measurement for today, merging into today's entry if one
 * exists (so /weight then /bodyfat land on the same row).
 */
export function upsertToday(userId, field) {
    const today = toString(now(), "yyyy-MM-dd");
    const all = getAll();
    const matchValue = tryFind((l) => {
        if (l.UserId === userId) {
            return l.Date === today;
        }
        else {
            return false;
        }
    }, all);
    if (matchValue == null) {
        const fresh = apply(field, new WeightLog(userId, today, undefined, undefined, undefined));
        saveAll(append(all, [fresh]));
        return fresh;
    }
    else {
        const updated = apply(field, matchValue);
        saveAll(map((l_1) => {
            if ((l_1.UserId === userId) && (l_1.Date === today)) {
                return updated;
            }
            else {
                return l_1;
            }
        }, all));
        return updated;
    }
}

/**
 * Latest weight and the change vs the newest entry at least `daysAgo`
 * days old: Some (current, delta). None without enough history.
 */
export function weightDelta(userId, daysAgo) {
    let weighed;
    const array = forUser(userId);
    weighed = array.filter((l) => (l.Kg != null));
    const matchValue = tryHead(weighed);
    if (matchValue != null) {
        const latest = matchValue;
        const cutoff = toString(addDays(now(), -daysAgo), "yyyy-MM-dd");
        return map_1((baseline) => [value_1(latest.Kg), value_1(latest.Kg) - value_1(baseline.Kg)], tryHead(weighed.filter((l_1) => (l_1.Date <= cutoff))));
    }
    else {
        return undefined;
    }
}

export function bmi(heightCm, kg) {
    const metres = heightCm / 100;
    return kg / (metres * metres);
}

