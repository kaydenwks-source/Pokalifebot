
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, option_type, int32_type, string_type, float64_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";

export class Reflection extends Record {
    constructor(UserId, Date$, Stamp, Mood, Text$) {
        super();
        this.UserId = UserId;
        this.Date = Date$;
        this.Stamp = Stamp;
        this.Mood = Mood;
        this.Text = Text$;
    }
}

export function Reflection_$reflection() {
    return record_type("Models.Reflection.Reflection", [], Reflection, () => [["UserId", float64_type], ["Date", string_type], ["Stamp", string_type], ["Mood", option_type(int32_type)], ["Text", option_type(string_type)]]);
}

