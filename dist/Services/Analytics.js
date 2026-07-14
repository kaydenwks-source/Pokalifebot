
import { Lazy } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { database } from "./Storage.js";
import { addDays, utcNow, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { error } from "../Utils/Logger.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { array_type, record_type, int32_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { map } from "../fable_modules/fable-library-js.5.7.0/Array.js";

const conn = new Lazy(() => {
    const d = database();
    d.exec("CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, command TEXT NOT NULL, at TEXT NOT NULL)");
    d.exec("CREATE INDEX IF NOT EXISTS idx_events_at ON events (at)");
    return d;
});

function stamp(d) {
    return toString(d, "yyyy-MM-dd HH:mm:ss");
}

/**
 * Record one command invocation. Fire-and-forget — analytics must never
 * break a user's actual command, so failures are logged and swallowed.
 */
export function record(userId, command) {
    let arg_1;
    try {
        const stmt = conn.Value.prepare("INSERT INTO events (user_id, command, at) VALUES (?, ?, ?)");
        stmt.run(...[toText(printf("%.0f"))(userId), command, stamp(utcNow())]);
    }
    catch (ex) {
        error((arg_1 = ex.message, toText(printf("Analytics: record failed: %s"))(arg_1)));
    }
}

export class TopCommand extends Record {
    constructor(Command, Count) {
        super();
        this.Command = Command;
        this.Count = (Count | 0);
    }
}

export function TopCommand_$reflection() {
    return record_type("Services.Analytics.TopCommand", [], TopCommand, () => [["Command", string_type], ["Count", int32_type]]);
}

export class Summary extends Record {
    constructor(Total, Last24h, Last7d, ActiveUsers7d, Top) {
        super();
        this.Total = (Total | 0);
        this.Last24h = (Last24h | 0);
        this.Last7d = (Last7d | 0);
        this.ActiveUsers7d = (ActiveUsers7d | 0);
        this.Top = Top;
    }
}

export function Summary_$reflection() {
    return record_type("Services.Analytics.Summary", [], Summary, () => [["Total", int32_type], ["Last24h", int32_type], ["Last7d", int32_type], ["ActiveUsers7d", int32_type], ["Top", array_type(TopCommand_$reflection())]]);
}

function countSince(cutoff) {
    const stmt = conn.Value.prepare("SELECT COUNT(*) AS n FROM events WHERE at >= ?");
    return (stmt.get(...[cutoff])).n | 0;
}

/**
 * A snapshot for the admin panel. Any query failure degrades to zeroes
 * rather than throwing — the admin panel should always render.
 */
export function summary() {
    let arg;
    try {
        const now = utcNow();
        let total;
        const s = conn.Value.prepare("SELECT COUNT(*) AS n FROM events");
        total = (s.get()).n;
        let top;
        const s_1 = conn.Value.prepare("SELECT command, COUNT(*) AS c FROM events GROUP BY command ORDER BY c DESC LIMIT 8");
        top = map((r) => (new TopCommand(r.command, r.c)), s_1.all(...[]));
        let active;
        const s_2 = conn.Value.prepare("SELECT COUNT(DISTINCT user_id) AS n FROM events WHERE at >= ?");
        active = (s_2.get(...[stamp(addDays(now, -7))])).n;
        return new Summary(total, countSince(stamp(addDays(now, -1))), countSince(stamp(addDays(now, -7))), active, top);
    }
    catch (ex) {
        error((arg = ex.message, toText(printf("Analytics: summary failed: %s"))(arg)));
        return new Summary(0, 0, 0, 0, []);
    }
}

