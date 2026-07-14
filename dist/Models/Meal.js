
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, float64_type, int32_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";

/**
 * AI-estimated nutrition for one described meal.
 */
export class Nutrition extends Record {
    constructor(Name, Calories, Protein, Carbs, Fat, Sugar, Fiber) {
        super();
        this.Name = Name;
        this.Calories = (Calories | 0);
        this.Protein = Protein;
        this.Carbs = Carbs;
        this.Fat = Fat;
        this.Sugar = Sugar;
        this.Fiber = Fiber;
    }
}

export function Nutrition_$reflection() {
    return record_type("Models.Meal.Nutrition", [], Nutrition, () => [["Name", string_type], ["Calories", int32_type], ["Protein", float64_type], ["Carbs", float64_type], ["Fat", float64_type], ["Sugar", float64_type], ["Fiber", float64_type]]);
}

export class Meal extends Record {
    constructor(Id, UserId, Date$, Time, Name, Calories, Protein, Carbs, Fat, Sugar, Fiber) {
        super();
        this.Id = Id;
        this.UserId = UserId;
        this.Date = Date$;
        this.Time = Time;
        this.Name = Name;
        this.Calories = (Calories | 0);
        this.Protein = Protein;
        this.Carbs = Carbs;
        this.Fat = Fat;
        this.Sugar = Sugar;
        this.Fiber = Fiber;
    }
}

export function Meal_$reflection() {
    return record_type("Models.Meal.Meal", [], Meal, () => [["Id", string_type], ["UserId", float64_type], ["Date", string_type], ["Time", string_type], ["Name", string_type], ["Calories", int32_type], ["Protein", float64_type], ["Carbs", float64_type], ["Fat", float64_type], ["Sugar", float64_type], ["Fiber", float64_type]]);
}

