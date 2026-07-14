
import { Lazy } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { database } from "./Storage.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { error } from "../Utils/Logger.js";

const conn = new Lazy(() => {
    const d = database();
    d.exec("CREATE TABLE IF NOT EXISTS ai_usage (user_id TEXT NOT NULL, day TEXT NOT NULL, feature TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY (user_id, day, feature))");
    return d;
});

function uid(userId) {
    return toText(printf("%.0f"))(userId);
}

/**
 * Add one to a user's count for this feature on this day.
 */
export function incr(userId, day, feature) {
    let arg;
    try {
        const stmt = conn.Value.prepare("INSERT INTO ai_usage (user_id, day, feature, count) VALUES (?, ?, ?, 1) ON CONFLICT(user_id, day, feature) DO UPDATE SET count = count + 1");
        stmt.run(...[uid(userId), day, feature]);
    }
    catch (ex) {
        error((arg = ex.message, toText(printf("Usage: incr failed: %s"))(arg)));
    }
}

/**
 * Total AI calls a user has made across all features on a given day.
 */
export function dayTotal(userId, day) {
    let arg;
    try {
        const stmt = conn.Value.prepare("SELECT COALESCE(SUM(count), 0) AS n FROM ai_usage WHERE user_id = ? AND day = ?");
        return (stmt.get(...[uid(userId), day])).n | 0;
    }
    catch (ex) {
        error((arg = ex.message, toText(printf("Usage: dayTotal failed: %s"))(arg)));
        return 0;
    }
}

