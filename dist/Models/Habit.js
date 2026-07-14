
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, option_type, array_type, float64_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { tryFind, ofArray } from "../fable_modules/fable-library-js.5.7.0/List.js";

export class Habit extends Record {
    constructor(Id, UserId, Name, Cadence, CreatedAt, Completions, Frozen) {
        super();
        this.Id = Id;
        this.UserId = UserId;
        this.Name = Name;
        this.Cadence = Cadence;
        this.CreatedAt = CreatedAt;
        this.Completions = Completions;
        this.Frozen = Frozen;
    }
}

export function Habit_$reflection() {
    return record_type("Models.Habit.Habit", [], Habit, () => [["Id", string_type], ["UserId", float64_type], ["Name", string_type], ["Cadence", string_type], ["CreatedAt", string_type], ["Completions", array_type(string_type)], ["Frozen", option_type(array_type(string_type))]]);
}

export const Cadence_all = ofArray(["daily", "weekly", "monthly"]);

export function Cadence_tryNormalise(s) {
    return tryFind((c) => (c === s.trim().toLowerCase()), Cadence_all);
}

/**
 * Unit word for streak counts: daily -> "day(s)", weekly -> "week(s)".
 */
export function Cadence_streakUnit(cadence, n) {
    const unit = (cadence === "weekly") ? "week" : ((cadence === "monthly") ? "month" : "day");
    if (n === 1) {
        return unit;
    }
    else {
        return unit + "s";
    }
}

/**
 * "today" / "this week" / "this month" — the current check-in window.
 */
export function Cadence_periodPhrase(cadence) {
    switch (cadence) {
        case "weekly":
            return "this week";
        case "monthly":
            return "this month";
        default:
            return "today";
    }
}

