
import { Lazy } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { database } from "./Storage.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { error } from "../Utils/Logger.js";
import { compare, addDays, date, utcNow, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { bind } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { parseDay } from "../Utils/Time.js";
import { clearPremium, setPremium } from "./Users.js";

const conn = new Lazy(() => {
    const d = database();
    d.exec("CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, charge_id TEXT NOT NULL, stars INTEGER NOT NULL, kind TEXT NOT NULL, at TEXT NOT NULL)");
    return d;
});

function uid(userId) {
    return toText(printf("%.0f"))(userId);
}

function append(userId, chargeId, stars, kind) {
    let arg;
    try {
        const stmt = conn.Value.prepare("INSERT INTO payments (user_id, charge_id, stars, kind, at) VALUES (?, ?, ?, ?, ?)");
        stmt.run(...[uid(userId), chargeId, stars, kind, toString(utcNow(), "yyyy-MM-dd HH:mm:ss")]);
    }
    catch (ex) {
        error((arg = ex.message, toText(printf("Payments: append failed: %s"))(arg)));
    }
}

/**
 * Core grant: append a ledger row, then set PremiumUntil to `days` from
 * whichever is later — today or the user's current expiry — so grants *stack*
 * instead of resetting. Returns the new expiry day ("yyyy-MM-dd").
 */
export function grantFor(user, chargeId, stars, kind, days) {
    let matchValue, d_1;
    append(user.Id, chargeId, stars, kind);
    const today = date(utcNow());
    const until = toString(addDays((matchValue = bind(parseDay, user.PremiumUntil), (matchValue != null) ? ((compare(matchValue, today) > 0) ? ((d_1 = matchValue, d_1)) : today) : today), days), "yyyy-MM-dd");
    setPremium(user.Id, until, chargeId);
    return until;
}

/**
 * Grant (or extend) premium after a successful Stars payment (30 days).
 */
export function grantPremium(user, chargeId, stars, kind) {
    return grantFor(user, chargeId, stars, kind, 30);
}

/**
 * Admin comp: grant premium for N days with NO payment. Recorded as kind
 * "comp" with a synthetic charge id so the ledger still shows who/when.
 */
export function grantComp(user, adminId, days) {
    return grantFor(user, toText(printf("comp:%.0f"))(adminId), 0, "comp", days);
}

/**
 * Record a refund: append a "refund" row and drop the user back to free.
 */
export function recordRefund(user, chargeId, stars) {
    append(user.Id, chargeId, stars, "refund");
    clearPremium(user.Id);
}

/**
 * Admin revoke: drop a user to free immediately (no refund — for comps or
 * abuse). Logged in the ledger for the audit trail.
 */
export function revokeComp(user, adminId) {
    append(user.Id, toText(printf("revoke:%.0f"))(adminId), 0, "revoke");
    clearPremium(user.Id);
}

/**
 * A user's payment history, newest first — used by /export.
 */
export function historyFor(userId) {
    let arg;
    try {
        const stmt = conn.Value.prepare("SELECT charge_id, stars, kind, at FROM payments WHERE user_id = ? ORDER BY id DESC");
        return stmt.all(...[uid(userId)]);
    }
    catch (ex) {
        error((arg = ex.message, toText(printf("Payments: historyFor failed: %s"))(arg)));
        return [];
    }
}

