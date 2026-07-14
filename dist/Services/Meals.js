
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { save, load } from "./Storage.js";
import { addDays, toString, now as now_1 } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { substring } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { newGuid } from "../fable_modules/fable-library-js.5.7.0/Guid.js";
import { Meal } from "../Models/Meal.js";
import { map, sortByDescending, sumBy, item, sortBy, append } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { Points_Meal, award } from "./Gamification.js";
import { stringHash, comparePrimitives } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, float64_type, int32_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { Array_groupBy } from "../fable_modules/fable-library-js.5.7.0/Seq2.js";

const filePath = "database/meals.json";

export function getAll() {
    return defaultArg(load(filePath), []);
}

function saveAll(meals) {
    save(filePath, meals);
}

export function add(userId, n) {
    let copyOfStruct;
    const now = now_1();
    const meal = new Meal(substring((copyOfStruct = newGuid(), copyOfStruct), 0, 8), userId, toString(now, "yyyy-MM-dd"), toString(now, "HH:mm"), n.Name, n.Calories, n.Protein, n.Carbs, n.Fat, n.Sugar, n.Fiber);
    saveAll(append(getAll(), [meal]));
    award(userId, Points_Meal);
    return meal;
}

export function onDate(userId, date) {
    let array;
    return sortBy((m_1) => m_1.Time, (array = getAll(), array.filter((m) => {
        if (m.UserId === userId) {
            return m.Date === date;
        }
        else {
            return false;
        }
    })), {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    });
}

/**
 * Remove the most recently logged meal from today (typo insurance).
 */
export function deleteLastToday(userId) {
    let array_1;
    const today = toString(now_1(), "yyyy-MM-dd");
    let todays;
    const array = getAll();
    todays = array.filter((m) => {
        if (m.UserId === userId) {
            return m.Date === today;
        }
        else {
            return false;
        }
    });
    if (todays.length === 0) {
        return undefined;
    }
    else {
        const last = item(todays.length - 1, todays);
        saveAll((array_1 = getAll(), array_1.filter((m_1) => (m_1.Id !== last.Id))));
        return last;
    }
}

export class DayTotals extends Record {
    constructor(Date$, Meals, Calories, Protein, Carbs, Fat, Sugar, Fiber) {
        super();
        this.Date = Date$;
        this.Meals = (Meals | 0);
        this.Calories = (Calories | 0);
        this.Protein = Protein;
        this.Carbs = Carbs;
        this.Fat = Fat;
        this.Sugar = Sugar;
        this.Fiber = Fiber;
    }
}

export function DayTotals_$reflection() {
    return record_type("Services.Meals.DayTotals", [], DayTotals, () => [["Date", string_type], ["Meals", int32_type], ["Calories", int32_type], ["Protein", float64_type], ["Carbs", float64_type], ["Fat", float64_type], ["Sugar", float64_type], ["Fiber", float64_type]]);
}

function totalsOf(date, meals) {
    return new DayTotals(date, meals.length, sumBy((m) => (m.Calories | 0), meals, {
        GetZero: () => 0,
        Add: (x, y) => ((x + y) | 0),
    }), sumBy((m_1) => m_1.Protein, meals, {
        GetZero: () => 0,
        Add: (x_1, y_1) => (x_1 + y_1),
    }), sumBy((m_2) => m_2.Carbs, meals, {
        GetZero: () => 0,
        Add: (x_2, y_2) => (x_2 + y_2),
    }), sumBy((m_3) => m_3.Fat, meals, {
        GetZero: () => 0,
        Add: (x_3, y_3) => (x_3 + y_3),
    }), sumBy((m_4) => m_4.Sugar, meals, {
        GetZero: () => 0,
        Add: (x_4, y_4) => (x_4 + y_4),
    }), sumBy((m_5) => m_5.Fiber, meals, {
        GetZero: () => 0,
        Add: (x_5, y_5) => (x_5 + y_5),
    }));
}

export function totalsOn(userId, date) {
    return totalsOf(date, onDate(userId, date));
}

/**
 * Per-day totals for the last N days (only days with logged meals),
 * newest first.
 */
export function recentDailyTotals(userId, days) {
    let array;
    const cutoff = toString(addDays(now_1(), -days), "yyyy-MM-dd");
    return sortByDescending((t) => t.Date, map((tupledArg) => totalsOf(tupledArg[0], tupledArg[1]), Array_groupBy((m_1) => m_1.Date, (array = getAll(), array.filter((m) => {
        if (m.UserId === userId) {
            return m.Date > cutoff;
        }
        else {
            return false;
        }
    })), {
        Equals: (x, y) => (x === y),
        GetHashCode: (x) => (stringHash(x) | 0),
    })), {
        Compare: (x_1, y_1) => (comparePrimitives(x_1, y_1) | 0),
    });
}

