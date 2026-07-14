
import { ofArray } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { map, defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { database, save, load } from "./Storage.js";
import { tryFind } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { disposeSafe, getEnumerator, defaultOf } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { utcNow, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { purgeUser, buddyOf } from "./Buddies.js";
import { historyFor } from "./Payments.js";
import { info, warn } from "../Utils/Logger.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";

const collections = ofArray(["database/sleep.json", "database/reminders.json", "database/habits.json", "database/tasks.json", "database/meals.json", "database/weights.json", "database/workouts.json", "database/busy.json", "database/goals.json", "database/coach.json", "database/xp.json", "database/focus.json", "database/journal.json"]);

function loadRows(path) {
    return defaultArg(load(path), []);
}

function isMine(userId, row) {
    return row.UserId === userId;
}

/**
 * Everything about a user, assembled into one JSON-ready object.
 */
export function export$(userId) {
    const profile = defaultArg(map((value) => value, tryFind((r) => (r.Id === userId), loadRows("database/users.json"))), defaultOf());
    const section = (path) => {
        const array_1 = loadRows(path);
        return array_1.filter((row) => isMine(userId, row));
    };
    return {
        exportedAt: toString(utcNow(), "yyyy-MM-dd HH:mm:ss") + " UTC",
        userId: userId,
        profile: profile,
        sleep: section("database/sleep.json"),
        reminders: section("database/reminders.json"),
        habits: section("database/habits.json"),
        tasks: section("database/tasks.json"),
        meals: section("database/meals.json"),
        weights: section("database/weights.json"),
        workouts: section("database/workouts.json"),
        busy: section("database/busy.json"),
        goals: section("database/goals.json"),
        coach: section("database/coach.json"),
        xp: section("database/xp.json"),
        focus: section("database/focus.json"),
        journal: section("database/journal.json"),
        buddy: defaultArg(map((value_2) => value_2, buddyOf(userId)), defaultOf()),
        payments: historyFor(userId),
    };
}

function deleteWhereUser(d, table, userId) {
    let arg_3;
    try {
        (d.prepare(toText(printf("DELETE FROM %s WHERE user_id = ?"))(table))).run(...[toText(printf("%.0f"))(userId)]);
    }
    catch (ex) {
        warn((arg_3 = ex.message, toText(printf("UserData.wipe: %s cleanup skipped: %s"))(table)(arg_3)));
    }
}

/**
 * Permanently remove every trace of a user across all storage.
 */
export function wipe(userId) {
    let array;
    save("database/users.json", (array = loadRows("database/users.json"), array.filter((r) => (r.Id !== userId))));
    const enumerator = getEnumerator(collections);
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            let array_1;
            const path = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            save(path, (array_1 = loadRows(path), array_1.filter((r_1) => !isMine(userId, r_1))));
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    const d = database();
    deleteWhereUser(d, "ai_usage", userId);
    deleteWhereUser(d, "events", userId);
    deleteWhereUser(d, "payments", userId);
    purgeUser(userId);
    info(toText(printf("Wiped all data for user %.0f"))(userId));
}

