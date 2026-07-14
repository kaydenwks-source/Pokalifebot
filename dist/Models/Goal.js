
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, bool_type, array_type, option_type, float64_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";

export class Goal extends Record {
    constructor(Id, UserId, Name, TargetValue, Unit, Progress, CreatedAt, CompletedAt, Steps, Absolute) {
        super();
        this.Id = Id;
        this.UserId = UserId;
        this.Name = Name;
        this.TargetValue = TargetValue;
        this.Unit = Unit;
        this.Progress = Progress;
        this.CreatedAt = CreatedAt;
        this.CompletedAt = CompletedAt;
        this.Steps = Steps;
        this.Absolute = Absolute;
    }
}

export function Goal_$reflection() {
    return record_type("Models.Goal.Goal", [], Goal, () => [["Id", string_type], ["UserId", float64_type], ["Name", string_type], ["TargetValue", float64_type], ["Unit", string_type], ["Progress", float64_type], ["CreatedAt", string_type], ["CompletedAt", option_type(string_type)], ["Steps", option_type(array_type(string_type))], ["Absolute", option_type(bool_type)]]);
}

