
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, float64_type, option_type, int32_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { ofArray, choose } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { map } from "../fable_modules/fable-library-js.5.7.0/Option.js";

/**
 * What the AI parser extracts from a workout description.
 */
export class ParsedWorkout extends Record {
    constructor(Exercise, Kind, Sets, Reps, WeightKg, DurationMin, DistanceKm, Calories) {
        super();
        this.Exercise = Exercise;
        this.Kind = Kind;
        this.Sets = Sets;
        this.Reps = Reps;
        this.WeightKg = WeightKg;
        this.DurationMin = DurationMin;
        this.DistanceKm = DistanceKm;
        this.Calories = (Calories | 0);
    }
}

export function ParsedWorkout_$reflection() {
    return record_type("Models.Workout.ParsedWorkout", [], ParsedWorkout, () => [["Exercise", string_type], ["Kind", string_type], ["Sets", option_type(int32_type)], ["Reps", option_type(int32_type)], ["WeightKg", option_type(float64_type)], ["DurationMin", option_type(float64_type)], ["DistanceKm", option_type(float64_type)], ["Calories", int32_type]]);
}

export class WorkoutLog extends Record {
    constructor(Id, UserId, Date$, Time, Exercise, Kind, Sets, Reps, WeightKg, DurationMin, DistanceKm, CaloriesBurned) {
        super();
        this.Id = Id;
        this.UserId = UserId;
        this.Date = Date$;
        this.Time = Time;
        this.Exercise = Exercise;
        this.Kind = Kind;
        this.Sets = Sets;
        this.Reps = Reps;
        this.WeightKg = WeightKg;
        this.DurationMin = DurationMin;
        this.DistanceKm = DistanceKm;
        this.CaloriesBurned = (CaloriesBurned | 0);
    }
}

export function WorkoutLog_$reflection() {
    return record_type("Models.Workout.WorkoutLog", [], WorkoutLog, () => [["Id", string_type], ["UserId", float64_type], ["Date", string_type], ["Time", string_type], ["Exercise", string_type], ["Kind", string_type], ["Sets", option_type(int32_type)], ["Reps", option_type(int32_type)], ["WeightKg", option_type(float64_type)], ["DurationMin", option_type(float64_type)], ["DistanceKm", option_type(float64_type)], ["CaloriesBurned", int32_type]]);
}

/**
 * "3 sets × 8 reps @ 60.0 kg · 45 min" — whichever parts exist.
 */
export function details(l) {
    let matchValue, matchValue_1, r_1, s_1, r, s, clo_4, clo_5, clo_6;
    return join(" · ", choose((x) => x, ofArray([(matchValue = l.Sets, (matchValue_1 = l.Reps, (matchValue == null) ? ((matchValue_1 != null) ? ((r_1 = (matchValue_1 | 0), toText(printf("%d reps"))(r_1))) : undefined) : ((matchValue_1 == null) ? ((s_1 = (matchValue | 0), toText(printf("%d sets"))(s_1))) : ((r = (matchValue_1 | 0), (s = (matchValue | 0), toText(printf("%d sets × %d reps"))(s)(r))))))), map((clo_4 = toText(printf("@ %.1f kg")), clo_4), l.WeightKg), map((clo_5 = toText(printf("%.1f km")), clo_5), l.DistanceKm), map((clo_6 = toText(printf("%.0f min")), clo_6), l.DurationMin)])));
}

