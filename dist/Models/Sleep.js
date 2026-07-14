
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, int32_type, string_type, float64_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";

export class SleepLog extends Record {
    constructor(UserId, Date$, BedTime, WakeTime, DurationMinutes) {
        super();
        this.UserId = UserId;
        this.Date = Date$;
        this.BedTime = BedTime;
        this.WakeTime = WakeTime;
        this.DurationMinutes = (DurationMinutes | 0);
    }
}

export function SleepLog_$reflection() {
    return record_type("Models.Sleep.SleepLog", [], SleepLog, () => [["UserId", float64_type], ["Date", string_type], ["BedTime", string_type], ["WakeTime", string_type], ["DurationMinutes", int32_type]]);
}

