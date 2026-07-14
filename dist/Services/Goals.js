
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { save, load } from "./Storage.js";
import { item, map, append, sortBy } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { equals, round, compareArrays } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { max, min } from "../fable_modules/fable-library-js.5.7.0/Double.js";
import { substring } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { newGuid } from "../fable_modules/fable-library-js.5.7.0/Guid.js";
import { now, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { Goal_$reflection, Goal } from "../Models/Goal.js";
import { ofArray, tryFind } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, option_type, int32_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";

const filePath = "database/goals.json";

export function getAll() {
    return defaultArg(load(filePath), []);
}

function saveAll(goals) {
    save(filePath, goals);
}

/**
 * Active goals first (oldest first), completed ones after.
 */
export function forUser(userId) {
    let array;
    return sortBy((g_1) => [(g_1.CompletedAt != null) ? 1 : 0, g_1.CreatedAt], (array = getAll(), array.filter((g) => (g.UserId === userId))), {
        Compare: (x, y) => (compareArrays(x, y) | 0),
    });
}

/**
 * Display percent, capped 0..100.
 */
export function percentOf(g) {
    if (g.TargetValue <= 0) {
        return 100;
    }
    else {
        return min(100, max(0, ~~round((g.Progress * 100) / g.TargetValue))) | 0;
    }
}

export function add(userId, name, target, unit, absolute) {
    let copyOfStruct;
    const goal = new Goal(substring((copyOfStruct = newGuid(), copyOfStruct), 0, 8), userId, name.trim(), target, unit.trim(), 0, toString(now(), "yyyy-MM-dd"), undefined, undefined, absolute ? true : undefined);
    saveAll(append(getAll(), [goal]));
    return goal;
}

/**
 * Ordered/position goals (chapters, lessons) log by position reached.
 */
export function isAbsolute(g) {
    return equals(g.Absolute, true);
}

export function setSteps(goal, steps) {
    const updated = new Goal(goal.Id, goal.UserId, goal.Name, goal.TargetValue, goal.Unit, goal.Progress, goal.CreatedAt, goal.CompletedAt, steps, goal.Absolute);
    saveAll(map((g) => {
        if (g.Id === goal.Id) {
            return updated;
        }
        else {
            return g;
        }
    }, getAll()));
    return updated;
}

/**
 * Delete by 1-based position in the user's sorted list (what /goals shows).
 */
export function deleteByIndex(userId, index) {
    let array;
    const mine = forUser(userId);
    if ((index < 1) ? true : (index > mine.length)) {
        return undefined;
    }
    else {
        const victim = item(index - 1, mine);
        saveAll((array = getAll(), array.filter((g) => (g.Id !== victim.Id))));
        return victim;
    }
}

export function byIndex(userId, index) {
    const mine = forUser(userId);
    if ((index >= 1) && (index <= mine.length)) {
        return item(index - 1, mine);
    }
    else {
        return undefined;
    }
}

/**
 * The highest of 25/50/75/100 crossed between two percentages, if any.
 */
export function crossedMilestone(beforePct, afterPct) {
    return tryFind((m) => {
        if (beforePct < m) {
            return afterPct >= m;
        }
        else {
            return false;
        }
    }, ofArray([100, 75, 50, 25]));
}

export class LogResult extends Record {
    constructor(Goal, Milestone) {
        super();
        this.Goal = Goal;
        this.Milestone = Milestone;
    }
}

export function LogResult_$reflection() {
    return record_type("Services.Goals.LogResult", [], LogResult, () => [["Goal", Goal_$reflection()], ["Milestone", option_type(int32_type)]]);
}

function commit(goal, newProgress) {
    const beforePct = percentOf(goal) | 0;
    const nowComplete = newProgress >= goal.TargetValue;
    const updated = new Goal(goal.Id, goal.UserId, goal.Name, goal.TargetValue, goal.Unit, newProgress, goal.CreatedAt, (nowComplete && (goal.CompletedAt == null)) ? toString(now(), "yyyy-MM-dd") : (!nowComplete ? undefined : goal.CompletedAt), goal.Steps, goal.Absolute);
    saveAll(map((g) => {
        if (g.Id === goal.Id) {
            return updated;
        }
        else {
            return g;
        }
    }, getAll()));
    return new LogResult(updated, crossedMilestone(beforePct, percentOf(updated)));
}

/**
 * Add progress (can be negative to correct mistakes; floors at 0).
 * Marks the goal complete when the target is reached.
 */
export function logProgress(goal, amount) {
    return commit(goal, max(0, goal.Progress + amount));
}

/**
 * Set progress to an absolute position (chapter/lesson reached), clamped
 * to 0..target. Used for ordered goals: "chapter 3" -> 3/12.
 */
export function setProgress(goal, position) {
    return commit(goal, min(goal.TargetValue, max(0, position)));
}

/**
 * Apply a logged value the way the goal expects: ordered goals jump to the
 * position, cumulative goals add it up.
 */
export function applyLog(goal, value) {
    if (isAbsolute(goal)) {
        return setProgress(goal, value);
    }
    else {
        return logProgress(goal, value);
    }
}

/**
 * Feed progress into every ACTIVE goal measured in this unit —
 * e.g. a 5 km run advances every "km" goal automatically.
 */
export function autoProgress(userId, unit, amount) {
    let array;
    return map((g_1) => logProgress(g_1, amount), (array = forUser(userId), array.filter((g) => {
        if (g.CompletedAt == null) {
            return g.Unit.trim().toLowerCase() === unit.trim().toLowerCase();
        }
        else {
            return false;
        }
    })));
}

