
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { option_type, int32_type, record_type, bool_type, float64_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { max } from "../fable_modules/fable-library-js.5.7.0/Double.js";
import { totalsOn } from "./Meals.js";
import { sumBy } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { onDate } from "./Workouts.js";
import { defaultArg, map } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { round } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { op_UnaryNegation_Int32 } from "../fable_modules/fable-library-js.5.7.0/Int32.js";

/**
 * ~7700 kcal per kg of body weight; maintenance ≈ 31 kcal/kg/day is a
 * rough moderate-activity estimate (real TDEE needs age/sex/activity —
 * good enough for a coaching target, and honestly labelled as estimate).
 */
export class TargetPlan extends Record {
    constructor(MaintenanceKcal, DailyTargetKcal, WeeklyChangeKg, Floored, Aggressive) {
        super();
        this.MaintenanceKcal = MaintenanceKcal;
        this.DailyTargetKcal = DailyTargetKcal;
        this.WeeklyChangeKg = WeeklyChangeKg;
        this.Floored = Floored;
        this.Aggressive = Aggressive;
    }
}

export function TargetPlan_$reflection() {
    return record_type("Services.Energy.TargetPlan", [], TargetPlan, () => [["MaintenanceKcal", float64_type], ["DailyTargetKcal", float64_type], ["WeeklyChangeKg", float64_type], ["Floored", bool_type], ["Aggressive", bool_type]]);
}

export function computeTarget(currentKg, targetKg, weeks) {
    const maintenance = currentKg * 31;
    const weeklyChange = (targetKg - currentKg) / weeks;
    const rawDaily = maintenance + (((targetKg - currentKg) * 7700) / (weeks * 7));
    return new TargetPlan(maintenance, max(1200, rawDaily), weeklyChange, rawDaily < 1200, Math.abs(weeklyChange) > 0.75);
}

export class DaySummary extends Record {
    constructor(Eaten, Burned, Net, Target, Remaining, PercentOfTarget) {
        super();
        this.Eaten = (Eaten | 0);
        this.Burned = (Burned | 0);
        this.Net = (Net | 0);
        this.Target = Target;
        this.Remaining = Remaining;
        this.PercentOfTarget = PercentOfTarget;
    }
}

export function DaySummary_$reflection() {
    return record_type("Services.Energy.DaySummary", [], DaySummary, () => [["Eaten", int32_type], ["Burned", int32_type], ["Net", int32_type], ["Target", option_type(int32_type)], ["Remaining", option_type(int32_type)], ["PercentOfTarget", option_type(int32_type)]]);
}

export function summary(user, date) {
    const eaten = totalsOn(user.Id, date).Calories | 0;
    const burned = sumBy((w) => (w.CaloriesBurned | 0), onDate(user.Id, date), {
        GetZero: () => 0,
        Add: (x, y) => ((x + y) | 0),
    }) | 0;
    const net = (eaten - burned) | 0;
    const target = map((value) => (~~value | 0), user.DailyKcalTarget);
    return new DaySummary(eaten, burned, net, target, map((t) => ((t - net) | 0), target), map((t_1) => {
        if (t_1 <= 0) {
            return 0;
        }
        else {
            return ~~round((net * 100) / t_1) | 0;
        }
    }, target));
}

/**
 * One-line human version of the day's energy picture.
 */
export function describe(s) {
    const matchValue = s.Target;
    if (matchValue == null) {
        if (s.Burned > 0) {
            return toText(printf("%d eaten − %d burned = %d kcal net (set a goal: /target 68 in 10 weeks)"))(s.Eaten)(s.Burned)(s.Net);
        }
        else {
            return toText(printf("%d kcal today (set a goal: /target 68 in 10 weeks)"))(s.Eaten);
        }
    }
    else {
        const target = matchValue | 0;
        let status;
        const matchValue_1 = s.Remaining;
        if (matchValue_1 == null) {
            status = "";
        }
        else if (matchValue_1 >= 0) {
            const r_1 = matchValue_1 | 0;
            status = toText(printf("%d kcal left"))(r_1);
        }
        else {
            const r_2 = matchValue_1 | 0;
            const arg_1 = op_UnaryNegation_Int32(r_2) | 0;
            status = toText(printf("%d kcal over"))(arg_1);
        }
        if (s.Burned > 0) {
            const arg_6 = defaultArg(s.PercentOfTarget, 0) | 0;
            return toText(printf("Net: %d eaten − %d burned = %d / %d kcal (%d%%) · %s"))(s.Eaten)(s.Burned)(s.Net)(target)(arg_6)(status);
        }
        else {
            const arg_10 = defaultArg(s.PercentOfTarget, 0) | 0;
            return toText(printf("%d / %d kcal (%d%%) · %s"))(s.Eaten)(target)(arg_10)(status);
        }
    }
}

