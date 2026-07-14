
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { save, load } from "./Storage.js";
import { item as item_1, append, sortBy } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { Commitment, Days_fullName, Days_order } from "../Models/Commitment.js";
import { compareArrays } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { now, dayOfWeek } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { substring } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { newGuid } from "../fable_modules/fable-library-js.5.7.0/Guid.js";

const filePath = "database/busy.json";

export function getAll() {
    return defaultArg(load(filePath), []);
}

function saveAll(items) {
    save(filePath, items);
}

/**
 * A user's blocks sorted by day (daily first) then start time.
 */
export function forUser(userId) {
    let array;
    return sortBy((c_1) => [Days_order(c_1.Day), c_1.At], (array = getAll(), array.filter((c) => (c.UserId === userId))), {
        Compare: (x, y) => (compareArrays(x, y) | 0),
    });
}

/**
 * Blocks that apply to today (matching weekday or daily).
 */
export function forToday(userId) {
    const today = Days_fullName(dayOfWeek(now()));
    const array = forUser(userId);
    return array.filter((c) => {
        if (c.Day === "daily") {
            return true;
        }
        else {
            return c.Day === today;
        }
    });
}

export function add(userId, name, day, at, until) {
    let copyOfStruct;
    const item = new Commitment(substring((copyOfStruct = newGuid(), copyOfStruct), 0, 8), userId, name.trim(), day, at, until);
    saveAll(append(getAll(), [item]));
    return item;
}

/**
 * Delete by 1-based position in the user's sorted list (what /busy shows).
 */
export function deleteByIndex(userId, index) {
    let array;
    const mine = forUser(userId);
    if ((index < 1) ? true : (index > mine.length)) {
        return undefined;
    }
    else {
        const victim = item_1(index - 1, mine);
        saveAll((array = getAll(), array.filter((c) => (c.Id !== victim.Id))));
        return victim;
    }
}

