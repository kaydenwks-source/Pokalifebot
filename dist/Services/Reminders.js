
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { save, load } from "./Storage.js";
import { map, item, append, sortBy } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { comparePrimitives } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { substring } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { newGuid } from "../fable_modules/fable-library-js.5.7.0/Guid.js";
import { parse, addMonths, addDays, now, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { Reminder } from "../Models/Reminder.js";
import { tryParse } from "../fable_modules/fable-library-js.5.7.0/Int32.js";
import { FSharpRef } from "../fable_modules/fable-library-js.5.7.0/Types.js";

const filePath = "database/reminders.json";

export function getAll() {
    return defaultArg(load(filePath), []);
}

function saveAll(reminders) {
    save(filePath, reminders);
}

/**
 * A user's reminders sorted soonest-first (ISO stamps sort as strings).
 */
export function forUser(userId) {
    let array;
    return sortBy((r_1) => ((r_1.DueDate + " ") + r_1.DueTime), (array = getAll(), array.filter((r) => (r.UserId === userId))), {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    });
}

export function add(userId, chatId, text, date, time, repeat) {
    let copyOfStruct;
    const reminder = new Reminder(substring((copyOfStruct = newGuid(), copyOfStruct), 0, 8), userId, chatId, text, date, time, repeat, toString(now(), "yyyy-MM-dd HH:mm"));
    saveAll(append(getAll(), [reminder]));
    return reminder;
}

/**
 * Delete by 1-based position in the user's sorted list (what /reminders shows).
 */
export function deleteByIndex(userId, index) {
    let array;
    const mine = forUser(userId);
    if ((index < 1) ? true : (index > mine.length)) {
        return undefined;
    }
    else {
        const victim = item(index - 1, mine);
        saveAll((array = getAll(), array.filter((r) => (r.Id !== victim.Id))));
        return victim;
    }
}

function remove(id) {
    let array;
    saveAll((array = getAll(), array.filter((r) => (r.Id !== id))));
}

/**
 * Everything due now — or overdue (fires missed reminders after downtime).
 */
export function due(nowStamp) {
    const array = getAll();
    return array.filter((r) => (((r.DueDate + " ") + r.DueTime) <= nowStamp));
}

function nextDate(repeat, fromDate) {
    switch (repeat) {
        case "daily":
            return addDays(fromDate, 1);
        case "weekly":
            return addDays(fromDate, 7);
        case "monthly":
            return addMonths(fromDate, 1);
        default:
            if (repeat.startsWith("days:")) {
                let matchValue;
                let outArg = 0;
                matchValue = [tryParse(substring(repeat, 5), 511, false, 32, new FSharpRef(() => (outArg | 0), (v) => {
                    outArg = (v | 0);
                })), outArg];
                let matchResult;
                if (matchValue[0]) {
                    if (matchValue[1] >= 1) {
                        matchResult = 0;
                    }
                    else {
                        matchResult = 1;
                    }
                }
                else {
                    matchResult = 1;
                }
                switch (matchResult) {
                    case 0:
                        return addDays(fromDate, matchValue[1]);
                    default:
                        return undefined;
                }
            }
            else {
                return undefined;
            }
    }
}

/**
 * After a reminder fires: delete it if one-time, otherwise advance the
 * due date past now (looping covers multi-day offline gaps).
 * nowStamp is the user's local "yyyy-MM-dd HH:mm" so recurrence lands
 * correctly across timezones.
 */
export function completeOccurrence(nowStamp, reminder) {
    const matchValue = nextDate(reminder.Repeat, parse(reminder.DueDate));
    if (matchValue != null) {
        let next = matchValue;
        while (((toString(next, "yyyy-MM-dd") + " ") + reminder.DueTime) <= nowStamp) {
            next = defaultArg(nextDate(reminder.Repeat, next), addDays(next, 1));
        }
        const updated = new Reminder(reminder.Id, reminder.UserId, reminder.ChatId, reminder.Text, toString(next, "yyyy-MM-dd"), reminder.DueTime, reminder.Repeat, reminder.CreatedAt);
        saveAll(map((r) => {
            if (r.Id === reminder.Id) {
                return updated;
            }
            else {
                return r;
            }
        }, getAll()));
    }
    else {
        remove(reminder.Id);
    }
}

