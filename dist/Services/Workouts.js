
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { save, load } from "./Storage.js";
import { find, map, max, choose, append, sortBy, sortByDescending } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { stringHash, comparePrimitives } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { toString, now as now_1 } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { substring } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { newGuid } from "../fable_modules/fable-library-js.5.7.0/Guid.js";
import { WorkoutLog } from "../Models/Workout.js";
import { Points_Workout, award } from "./Gamification.js";
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, option_type, float64_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { Array_distinct } from "../fable_modules/fable-library-js.5.7.0/Seq2.js";

const filePath = "database/workouts.json";

export function getAll() {
    return defaultArg(load(filePath), []);
}

function saveAll(logs) {
    save(filePath, logs);
}

/**
 * A user's workouts, newest first.
 */
export function forUser(userId) {
    let array;
    return sortByDescending((l_1) => ((l_1.Date + " ") + l_1.Time), (array = getAll(), array.filter((l) => (l.UserId === userId))), {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    });
}

export function onDate(userId, date) {
    let array;
    return sortBy((l_1) => l_1.Time, (array = getAll(), array.filter((l) => {
        if (l.UserId === userId) {
            return l.Date === date;
        }
        else {
            return false;
        }
    })), {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    });
}

export function add(userId, p) {
    let copyOfStruct;
    const now = now_1();
    const log = new WorkoutLog(substring((copyOfStruct = newGuid(), copyOfStruct), 0, 8), userId, toString(now, "yyyy-MM-dd"), toString(now, "HH:mm"), p.Exercise, p.Kind, p.Sets, p.Reps, p.WeightKg, p.DurationMin, p.DistanceKm, p.Calories);
    saveAll(append(getAll(), [log]));
    award(userId, Points_Workout);
    return log;
}

export class Bests extends Record {
    constructor(Exercise, BestKg, BestKm) {
        super();
        this.Exercise = Exercise;
        this.BestKg = BestKg;
        this.BestKm = BestKm;
    }
}

export function Bests_$reflection() {
    return record_type("Services.Workouts.Bests", [], Bests, () => [["Exercise", string_type], ["BestKg", option_type(float64_type)], ["BestKm", option_type(float64_type)]]);
}

/**
 * Best weight/distance for an exercise, optionally excluding one log id
 * (so a fresh entry can be compared against "everything before it").
 */
export function bestsFor(userId, exercise, excludeId) {
    let history;
    const array = forUser(userId);
    history = array.filter((l) => {
        if (l.Exercise.toLowerCase() === exercise.trim().toLowerCase()) {
            return l.Id !== excludeId;
        }
        else {
            return false;
        }
    });
    const maxOf = (pick) => {
        const values = choose(pick, history, Float64Array);
        if (values.length === 0) {
            return undefined;
        }
        else {
            return max(values, {
                Compare: (x, y) => (comparePrimitives(x, y) | 0),
            });
        }
    };
    return new Bests(exercise, maxOf((l_1) => l_1.WeightKg), maxOf((l_2) => l_2.DistanceKm));
}

/**
 * Current personal bests across every exercise the user has logged.
 */
export function allBests(userId) {
    return map((ex) => bestsFor(userId, find((l_1) => (l_1.Exercise.toLowerCase() === ex), forUser(userId)).Exercise, ""), Array_distinct(map((l) => l.Exercise.toLowerCase(), forUser(userId)), {
        Equals: (x, y) => (x === y),
        GetHashCode: (x) => (stringHash(x) | 0),
    }));
}

