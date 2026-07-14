
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, bool_type, int32_type, string_type, float64_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";

export class FocusSession extends Record {
    constructor(UserId, Date$, StartedAt, Minutes, Completed) {
        super();
        this.UserId = UserId;
        this.Date = Date$;
        this.StartedAt = StartedAt;
        this.Minutes = (Minutes | 0);
        this.Completed = Completed;
    }
}

export function FocusSession_$reflection() {
    return record_type("Models.Focus.FocusSession", [], FocusSession, () => [["UserId", float64_type], ["Date", string_type], ["StartedAt", string_type], ["Minutes", int32_type], ["Completed", bool_type]]);
}

