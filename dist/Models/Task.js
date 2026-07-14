
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, option_type, bool_type, float64_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { printf, toText, substring, split, trimStart } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { item, equalsWith } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { defaultOf } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { map } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { parseTime } from "../Utils/Time.js";

export class TaskItem extends Record {
    constructor(Id, UserId, Text$, Priority, Done, CreatedAt, DoneAt, At, Until) {
        super();
        this.Id = Id;
        this.UserId = UserId;
        this.Text = Text$;
        this.Priority = Priority;
        this.Done = Done;
        this.CreatedAt = CreatedAt;
        this.DoneAt = DoneAt;
        this.At = At;
        this.Until = Until;
    }
}

export function TaskItem_$reflection() {
    return record_type("Models.Task.TaskItem", [], TaskItem, () => [["Id", string_type], ["UserId", float64_type], ["Text", string_type], ["Priority", string_type], ["Done", bool_type], ["CreatedAt", string_type], ["DoneAt", option_type(string_type)], ["At", option_type(string_type)], ["Until", option_type(string_type)]]);
}

/**
 * Sort order: high first.
 */
export function Priority_rank(_arg) {
    switch (_arg) {
        case "high":
            return 0;
        case "medium":
            return 1;
        default:
            return 2;
    }
}

export function Priority_marker(_arg) {
    switch (_arg) {
        case "high":
            return "🔴";
        case "medium":
            return "🟡";
        default:
            return "🟢";
    }
}

/**
 * Accepts "!high", "high", "!h", "med", "!low", "l", ...
 */
export function Priority_tryParse(s) {
    const matchValue = trimStart(s.trim().toLowerCase(), "!");
    switch (matchValue) {
        case "high":
        case "h":
            return "high";
        case "medium":
        case "med":
        case "m":
            return "medium";
        case "low":
        case "l":
            return "low";
        default:
            return undefined;
    }
}

/**
 * "@14:00" -> Some("14:00", None); "@09:00-15:30" -> Some with end.
 * Anything else (including invalid times) -> None.
 */
export function Schedule_tryParseToken(token) {
    if (!token.startsWith("@")) {
        return undefined;
    }
    else {
        const matchValue = split(substring(token, 1), ["-"], undefined, 0);
        if (!equalsWith((x, y) => (x === y), matchValue, defaultOf()) && (matchValue.length === 1)) {
            return map((t) => [t, undefined], parseTime(item(0, matchValue)));
        }
        else if (!equalsWith((x_1, y_1) => (x_1 === y_1), matchValue, defaultOf()) && (matchValue.length === 2)) {
            const startRaw = item(0, matchValue);
            const endRaw = item(1, matchValue);
            const matchValue_1 = parseTime(startRaw);
            const matchValue_2 = parseTime(endRaw);
            let matchResult, e, s;
            if (matchValue_1 != null) {
                if (matchValue_2 != null) {
                    matchResult = 0;
                    e = matchValue_2;
                    s = matchValue_1;
                }
                else {
                    matchResult = 1;
                }
            }
            else {
                matchResult = 1;
            }
            switch (matchResult) {
                case 0:
                    return [s, e];
                default:
                    return undefined;
            }
        }
        else {
            return undefined;
        }
    }
}

/**
 * " 🕐 14:00–15:30" suffix for timed tasks, "" otherwise.
 */
export function timeLabel(t) {
    const matchValue = t.At;
    const matchValue_1 = t.Until;
    if (matchValue != null) {
        if (matchValue_1 == null) {
            const a_1 = matchValue;
            return toText(printf(" 🕐 %s"))(a_1);
        }
        else {
            const a = matchValue;
            const u = matchValue_1;
            return toText(printf(" 🕐 %s–%s"))(a)(u);
        }
    }
    else {
        return "";
    }
}

