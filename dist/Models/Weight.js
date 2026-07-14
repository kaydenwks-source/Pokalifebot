
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, option_type, string_type, float64_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";

export class WeightLog extends Record {
    constructor(UserId, Date$, Kg, BodyFat, MuscleKg) {
        super();
        this.UserId = UserId;
        this.Date = Date$;
        this.Kg = Kg;
        this.BodyFat = BodyFat;
        this.MuscleKg = MuscleKg;
    }
}

export function WeightLog_$reflection() {
    return record_type("Models.Weight.WeightLog", [], WeightLog, () => [["UserId", float64_type], ["Date", string_type], ["Kg", option_type(float64_type)], ["BodyFat", option_type(float64_type)], ["MuscleKg", option_type(float64_type)]]);
}

