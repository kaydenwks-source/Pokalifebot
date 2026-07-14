
import { FSharpRef, Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, obj_type, string_type, int32_type, float64_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { save, load } from "./Storage.js";
import { defaultOf } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { tryGetValue } from "../fable_modules/fable-library-js.5.7.0/MapUtil.js";
import { op_Subtraction, parse, toString, now as now_1 } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { FocusSession } from "../Models/Focus.js";
import { sumBy, append } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { Points_Focus, award } from "./Gamification.js";
import { max } from "../fable_modules/fable-library-js.5.7.0/Double.js";
import { totalMinutes } from "../fable_modules/fable-library-js.5.7.0/TimeSpan.js";

const filePath = "database/focus.json";

/**
 * An active, still-running session. `Timer` is the opaque setTimeout handle
 * so the command layer can cancel it on /focus stop.
 */
export class Active extends Record {
    constructor(UserId, Minutes, StartedAt, StartStamp, Timer) {
        super();
        this.UserId = UserId;
        this.Minutes = (Minutes | 0);
        this.StartedAt = StartedAt;
        this.StartStamp = StartStamp;
        this.Timer = Timer;
    }
}

export function Active_$reflection() {
    return record_type("Services.Focus.Active", [], Active, () => [["UserId", float64_type], ["Minutes", int32_type], ["StartedAt", string_type], ["StartStamp", string_type], ["Timer", obj_type]]);
}

const active = new Map([]);

export function getAll() {
    return defaultArg(load(filePath), []);
}

function saveAll(xs) {
    save(filePath, xs);
}

export function forUser(userId) {
    const array = getAll();
    return array.filter((s) => (s.UserId === userId));
}

export function activeFor(userId) {
    let matchValue;
    let outArg = defaultOf();
    matchValue = [tryGetValue(active, userId, new FSharpRef(() => outArg, (v) => {
        outArg = v;
    })), outArg];
    if (matchValue[0]) {
        return matchValue[1];
    }
    else {
        return undefined;
    }
}

/**
 * Register a new running session. The caller supplies the timer handle it
 * created so we can cancel it later.
 */
export function start(userId, minutes, timer) {
    const now = now_1();
    const a = new Active(userId, minutes, toString(now, "HH:mm"), toString(now, "yyyy-MM-dd HH:mm:ss"), timer);
    active.set(userId, a);
    return a;
}

function record(userId, a, minutes, completed) {
    const s = new FocusSession(userId, toString(now_1(), "yyyy-MM-dd"), a.StartedAt, minutes, completed);
    saveAll(append(getAll(), [s]));
    return s;
}

/**
 * The timer fired: persist a completed session and award XP for a real focus
 * block (>= 10 min) so tiny sessions can't farm points.
 */
export function complete(userId) {
    const matchValue = activeFor(userId);
    if (matchValue != null) {
        const a = matchValue;
        active.delete(userId);
        const s = record(userId, a, a.Minutes, true);
        if (a.Minutes >= 10) {
            award(userId, Points_Focus);
        }
        return s;
    }
    else {
        return undefined;
    }
}

/**
 * Stopped early: log the elapsed minutes as a partial session (no XP).
 */
export function stop(userId) {
    let started;
    const matchValue = activeFor(userId);
    if (matchValue != null) {
        const a = matchValue;
        active.delete(userId);
        return record(userId, a, (started = parse(a.StartStamp), max(0, ~~totalMinutes(op_Subtraction(now_1(), started)))), false);
    }
    else {
        return undefined;
    }
}

/**
 * Completed sessions and total minutes focused today.
 */
export function todayStats(userId) {
    const today = toString(now_1(), "yyyy-MM-dd");
    let mine;
    const array = forUser(userId);
    mine = array.filter((s) => {
        if (s.Date === today) {
            return s.Completed;
        }
        else {
            return false;
        }
    });
    return [mine.length, sumBy((s_1) => (s_1.Minutes | 0), mine, {
        GetZero: () => 0,
        Add: (x, y) => ((x + y) | 0),
    })];
}

