
import { addMonths, addDays, toString, now as now_1, parse, month, year, dayOfWeek, date, op_Subtraction, create } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { equals, comparePrimitives, numberHash, round } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { totalDays } from "../fable_modules/fable-library-js.5.7.0/TimeSpan.js";
import { Union, Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { union_type, record_type, bool_type, int32_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { Array_distinct } from "../fable_modules/fable-library-js.5.7.0/Seq2.js";
import { tryFind as tryFind_1, sortBy, append, item, sort, map } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { maxElement, isEmpty, filter, FSharpSet__Contains, ofArray } from "../fable_modules/fable-library-js.5.7.0/Set.js";
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { save, load } from "./Storage.js";
import { Habit, Habit_$reflection } from "../Models/Habit.js";
import { substring } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { newGuid } from "../fable_modules/fable-library-js.5.7.0/Guid.js";
import { useFreeze, find } from "./Users.js";
import { Points_Habit, award } from "./Gamification.js";

const filePath = "database/habits.json";

const epoch = create(1970, 1, 1);

function daysSinceEpoch(d) {
    return ~~round(totalDays(op_Subtraction(date(d), epoch))) | 0;
}

function mondayBasedWeekday(d) {
    const matchValue = dayOfWeek(d);
    if (matchValue === 0) {
        return 6;
    }
    else {
        return (matchValue - 1) | 0;
    }
}

export function periodIndex(cadence, d) {
    switch (cadence) {
        case "weekly":
            return ~~((daysSinceEpoch(d) - mondayBasedWeekday(d)) / 7) | 0;
        case "monthly":
            return ((year(d) * 12) + (month(d) - 1)) | 0;
        default:
            return daysSinceEpoch(d) | 0;
    }
}

export class Streaks extends Record {
    constructor(Current, Longest, DoneThisPeriod) {
        super();
        this.Current = (Current | 0);
        this.Longest = (Longest | 0);
        this.DoneThisPeriod = DoneThisPeriod;
    }
}

export function Streaks_$reflection() {
    return record_type("Services.Habits.Streaks", [], Streaks, () => [["Current", int32_type], ["Longest", int32_type], ["DoneThisPeriod", bool_type]]);
}

export function streaksFor(cadence, completions) {
    const periods = Array_distinct(map((s) => (periodIndex(cadence, parse(s)) | 0), completions, Int32Array), {
        Equals: (x, y) => (x === y),
        GetHashCode: (x) => (numberHash(x) | 0),
    });
    if (periods.length === 0) {
        return new Streaks(0, 0, false);
    }
    else {
        const now = periodIndex(cadence, now_1()) | 0;
        const set$ = ofArray(periods, {
            Compare: (x_1, y_1) => (comparePrimitives(x_1, y_1) | 0),
        });
        const doneNow = FSharpSet__Contains(set$, now);
        const anchor = doneNow ? now : (FSharpSet__Contains(set$, now - 1) ? (now - 1) : undefined);
        let current;
        if (anchor != null) {
            let n = 0;
            let p = anchor;
            while (FSharpSet__Contains(set$, p)) {
                n = ((n + 1) | 0);
                p = ((p - 1) | 0);
            }
            current = n;
        }
        else {
            current = 0;
        }
        const asc = sort(periods, {
            Compare: (x_2, y_2) => (comparePrimitives(x_2, y_2) | 0),
        });
        let longest = 1;
        let run = 1;
        for (let i = 1; i <= (asc.length - 1); i++) {
            if (item(i, asc) === (item(i - 1, asc) + 1)) {
                run = ((run + 1) | 0);
                if (run > longest) {
                    longest = (run | 0);
                }
            }
            else {
                run = 1;
            }
        }
        return new Streaks(current, longest, doneNow);
    }
}

/**
 * Streak view that also counts periods protected by a spent freeze token.
 * Every display path should use this, not raw streaksFor, so freezes show.
 */
export function streaksForHabit(h) {
    return streaksFor(h.Cadence, append(h.Completions, defaultArg(h.Frozen, [])));
}

/**
 * The current ISO-week index — the freeze allowance resets each week.
 */
export function currentWeekIndex() {
    return periodIndex("weekly", now_1()) | 0;
}

export function getAll() {
    return defaultArg(load(filePath), []);
}

function saveAll(habits) {
    save(filePath, habits);
}

export function forUser(userId) {
    let array;
    return sortBy((h_1) => h_1.Name.toLowerCase(), (array = getAll(), array.filter((h) => (h.UserId === userId))), {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    });
}

export function tryFind(userId, name) {
    return tryFind_1((h) => (h.Name.toLowerCase() === name.trim().toLowerCase()), forUser(userId));
}

export class AddResult extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Added", "Duplicate"];
    }
    static Duplicate = new AddResult(1, []);
}

export function AddResult_$reflection() {
    return union_type("Services.Habits.AddResult", [], AddResult, () => [[["Item", Habit_$reflection()]], []]);
}

export function add(userId, name, cadence) {
    let copyOfStruct;
    const matchValue = tryFind(userId, name);
    if (matchValue == null) {
        const habit = new Habit(substring((copyOfStruct = newGuid(), copyOfStruct), 0, 8), userId, name.trim(), cadence, toString(now_1(), "yyyy-MM-dd"), [], undefined);
        saveAll(append(getAll(), [habit]));
        return new AddResult(/* Added */ 0, [habit]);
    }
    else {
        return AddResult.Duplicate;
    }
}

export function remove(habit) {
    let array;
    saveAll((array = getAll(), array.filter((h) => (h.Id !== habit.Id))));
}

export class DoneResult extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Marked", "MarkedWithFreeze", "AlreadyDone"];
    }
}

export function DoneResult_$reflection() {
    return union_type("Services.Habits.DoneResult", [], DoneResult, () => [[["Item1", Habit_$reflection()], ["Item2", Streaks_$reflection()]], [["Item1", Habit_$reflection()], ["Item2", Streaks_$reflection()]], [["Item", Streaks_$reflection()]]]);
}

function oneBefore(cadence, d) {
    switch (cadence) {
        case "weekly":
            return addDays(d, -7);
        case "monthly":
            return addMonths(d, -1);
        default:
            return addDays(d, -1);
    }
}

/**
 * Check a habit off for the current period (idempotent per period). If the
 * user completed right up to a single missed period, a weekly freeze token
 * is spent automatically to protect the streak through that one gap.
 */
export function markDone(habit) {
    const before = streaksForHabit(habit);
    if (before.DoneThisPeriod) {
        return new DoneResult(/* AlreadyDone */ 2, [before]);
    }
    else {
        const now = now_1();
        const nowP = periodIndex(habit.Cadence, now) | 0;
        const frozen = defaultArg(habit.Frozen, []);
        let maxPrev;
        const prior = filter((p) => (p < nowP), ofArray(map((s) => (periodIndex(habit.Cadence, parse(s)) | 0), append(habit.Completions, frozen), Int32Array), {
            Compare: (x, y) => (comparePrimitives(x, y) | 0),
        }));
        maxPrev = (isEmpty(prior) ? undefined : maxElement(prior));
        const weekIdx = currentWeekIndex() | 0;
        let freezeAvailable;
        const matchValue = find(habit.UserId);
        freezeAvailable = ((matchValue == null) ? false : !equals(matchValue.FreezeWeek, weekIdx));
        let patternInput;
        let matchResult, p_2;
        if (maxPrev != null) {
            if ((maxPrev === (nowP - 2)) && freezeAvailable) {
                matchResult = 0;
                p_2 = maxPrev;
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
                const repDate = toString(oneBefore(habit.Cadence, now), "yyyy-MM-dd");
                useFreeze(habit.UserId, weekIdx);
                patternInput = [new Habit(habit.Id, habit.UserId, habit.Name, habit.Cadence, habit.CreatedAt, habit.Completions, append(frozen, [repDate])), true];
                break;
            }
            default:
                patternInput = [habit, false];
        }
        const habitToSave = patternInput[0];
        const updated = new Habit(habitToSave.Id, habitToSave.UserId, habitToSave.Name, habitToSave.Cadence, habitToSave.CreatedAt, append(habitToSave.Completions, [toString(now, "yyyy-MM-dd")]), habitToSave.Frozen);
        saveAll(map((h) => {
            if (h.Id === habit.Id) {
                return updated;
            }
            else {
                return h;
            }
        }, getAll()));
        award(updated.UserId, Points_Habit);
        const after = streaksForHabit(updated);
        if (patternInput[1]) {
            return new DoneResult(/* MarkedWithFreeze */ 1, [updated, after]);
        }
        else {
            return new DoneResult(/* Marked */ 0, [updated, after]);
        }
    }
}

