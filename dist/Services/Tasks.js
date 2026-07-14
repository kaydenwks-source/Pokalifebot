
import { map, defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { save, load } from "./Storage.js";
import { map as map_1, item, append, sortBy } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { TaskItem, Priority_rank } from "../Models/Task.js";
import { compareArrays } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { substring } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { newGuid } from "../fable_modules/fable-library-js.5.7.0/Guid.js";
import { now, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { Points_Task, award } from "./Gamification.js";

const filePath = "database/tasks.json";

export function getAll() {
    return defaultArg(load(filePath), []);
}

function saveAll(tasks) {
    save(filePath, tasks);
}

/**
 * Open tasks: highest priority first, oldest first within a priority.
 */
export function openFor(userId) {
    let array;
    return sortBy((t_1) => [Priority_rank(t_1.Priority), t_1.CreatedAt], (array = getAll(), array.filter((t) => {
        if (t.UserId === userId) {
            return !t.Done;
        }
        else {
            return false;
        }
    })), {
        Compare: (x, y) => (compareArrays(x, y) | 0),
    });
}

export function add(userId, text, priority, at, until) {
    let copyOfStruct;
    const task = new TaskItem(substring((copyOfStruct = newGuid(), copyOfStruct), 0, 8), userId, text.trim(), priority, false, toString(now(), "yyyy-MM-dd HH:mm"), undefined, at, until);
    saveAll(append(getAll(), [task]));
    return task;
}

function byOpenIndex(userId, index) {
    const mine = openFor(userId);
    if ((index >= 1) && (index <= mine.length)) {
        return item(index - 1, mine);
    }
    else {
        return undefined;
    }
}

export function completeByIndex(userId, index) {
    return map((t) => {
        const updated = new TaskItem(t.Id, t.UserId, t.Text, t.Priority, true, t.CreatedAt, toString(now(), "yyyy-MM-dd HH:mm"), t.At, t.Until);
        saveAll(map_1((x) => {
            if (x.Id === t.Id) {
                return updated;
            }
            else {
                return x;
            }
        }, getAll()));
        award(userId, Points_Task);
        return updated;
    }, byOpenIndex(userId, index));
}

export function deleteByIndex(userId, index) {
    return map((t) => {
        let array;
        saveAll((array = getAll(), array.filter((x) => (x.Id !== t.Id))));
        return t;
    }, byOpenIndex(userId, index));
}

/**
 * Tasks completed on/after a cutoff "yyyy-MM-dd" (stamps sort as strings).
 */
export function completedSince(userId, cutoff) {
    let array_1;
    const array = getAll();
    array_1 = array.filter((t) => {
        if ((t.UserId === userId) && t.Done) {
            const matchValue = t.DoneAt;
            if (matchValue == null) {
                return false;
            }
            else {
                return matchValue >= cutoff;
            }
        }
        else {
            return false;
        }
    });
    return array_1.length | 0;
}

/**
 * How many tasks the user completed today (for the little dopamine hit).
 */
export function doneTodayCount(userId) {
    return completedSince(userId, toString(now(), "yyyy-MM-dd")) | 0;
}

