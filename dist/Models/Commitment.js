
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, option_type, float64_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { printf, toText, substring } from "../fable_modules/fable-library-js.5.7.0/String.js";

export class Commitment extends Record {
    constructor(Id, UserId, Name, Day, At, Until) {
        super();
        this.Id = Id;
        this.UserId = UserId;
        this.Name = Name;
        this.Day = Day;
        this.At = At;
        this.Until = Until;
    }
}

export function Commitment_$reflection() {
    return record_type("Models.Commitment.Commitment", [], Commitment, () => [["Id", string_type], ["UserId", float64_type], ["Name", string_type], ["Day", string_type], ["At", string_type], ["Until", option_type(string_type)]]);
}

/**
 * Sort key: daily first, then Monday..Sunday.
 */
export function Days_order(day) {
    switch (day) {
        case "daily":
            return 0;
        case "monday":
            return 1;
        case "tuesday":
            return 2;
        case "wednesday":
            return 3;
        case "thursday":
            return 4;
        case "friday":
            return 5;
        case "saturday":
            return 6;
        default:
            return 7;
    }
}

export function Days_tryParse(s) {
    const matchValue = s.trim().toLowerCase();
    switch (matchValue) {
        case "monday":
        case "mon":
            return "monday";
        case "tuesday":
        case "tue":
        case "tues":
            return "tuesday";
        case "wednesday":
        case "wed":
            return "wednesday";
        case "thursday":
        case "thu":
        case "thurs":
            return "thursday";
        case "friday":
        case "fri":
            return "friday";
        case "saturday":
        case "sat":
            return "saturday";
        case "sunday":
        case "sun":
            return "sunday";
        case "daily":
        case "everyday":
            return "daily";
        default:
            return undefined;
    }
}

export function Days_fullName(d) {
    switch (d) {
        case 1:
            return "monday";
        case 2:
            return "tuesday";
        case 3:
            return "wednesday";
        case 4:
            return "thursday";
        case 5:
            return "friday";
        case 6:
            return "saturday";
        default:
            return "sunday";
    }
}

/**
 * "Sunday" for display.
 */
export function Days_display(day) {
    if (day === "daily") {
        return "Every day";
    }
    else {
        return substring(day, 0, 1).toUpperCase() + substring(day, 1);
    }
}

export function describe(c) {
    let span;
    const matchValue = c.Until;
    if (matchValue == null) {
        span = c.At;
    }
    else {
        const u = matchValue;
        span = toText(printf("%s–%s"))(c.At)(u);
    }
    const arg_2 = Days_display(c.Day);
    return toText(printf("%s %s — %s"))(arg_2)(span)(c.Name);
}

