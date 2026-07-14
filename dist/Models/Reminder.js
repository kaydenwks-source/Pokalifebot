
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, float64_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { printf, toText, substring } from "../fable_modules/fable-library-js.5.7.0/String.js";

export class Reminder extends Record {
    constructor(Id, UserId, ChatId, Text$, DueDate, DueTime, Repeat, CreatedAt) {
        super();
        this.Id = Id;
        this.UserId = UserId;
        this.ChatId = ChatId;
        this.Text = Text$;
        this.DueDate = DueDate;
        this.DueTime = DueTime;
        this.Repeat = Repeat;
        this.CreatedAt = CreatedAt;
    }
}

export function Reminder_$reflection() {
    return record_type("Models.Reminder.Reminder", [], Reminder, () => [["Id", string_type], ["UserId", float64_type], ["ChatId", float64_type], ["Text", string_type], ["DueDate", string_type], ["DueTime", string_type], ["Repeat", string_type], ["CreatedAt", string_type]]);
}

export function describeRepeat(repeat) {
    switch (repeat) {
        case "once":
            return "one-time";
        case "daily":
            return "repeats daily";
        case "weekly":
            return "repeats weekly";
        case "monthly":
            return "repeats monthly";
        default:
            if (repeat.startsWith("days:")) {
                const arg = substring(repeat, 5);
                return toText(printf("repeats every %s days"))(arg);
            }
            else {
                return repeat;
            }
    }
}

