
import { addDays, date, compare, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { parseDay, userNow } from "../Utils/Time.js";
import { bind } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { FSharpResult$2 } from "../fable_modules/fable-library-js.5.7.0/Result.js";
import { incr, dayTotal } from "./Usage.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { max } from "../fable_modules/fable-library-js.5.7.0/Double.js";

function today(user) {
    return toString(userNow(user.TzOffsetMinutes), "yyyy-MM-dd");
}

/**
 * The admin is never metered.
 */
export function isExempt(adminId, user) {
    if (adminId == null) {
        return false;
    }
    else {
        return user.Id === adminId;
    }
}

/**
 * Is this user premium *right now*? Admin is always premium. Otherwise the
 * tier must be "premium" and today (their local day) must still be within the
 * PremiumUntil date plus the grace window.
 */
export function isPremium(adminId, user) {
    if (isExempt(adminId, user)) {
        return true;
    }
    else {
        const matchValue = user.Tier;
        const matchValue_1 = bind(parseDay, user.PremiumUntil);
        let matchResult, until;
        if (matchValue != null) {
            if (matchValue === "premium") {
                if (matchValue_1 != null) {
                    matchResult = 0;
                    until = matchValue_1;
                }
                else {
                    matchResult = 1;
                }
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
                return compare(date(userNow(user.TzOffsetMinutes)), addDays(until, 3)) <= 0;
            default:
                return false;
        }
    }
}

/**
 * May this user spend one AI call? Ok to proceed, or Error with a kind,
 * user-facing message. Premium (and admin) are never capped.
 */
export function check(adminId, user, _feature) {
    if (isPremium(adminId, user)) {
        return new FSharpResult$2(/* Ok */ 0, [undefined]);
    }
    else if (dayTotal(user.Id, today(user)) >= 25) {
        return new FSharpResult$2(/* Error */ 1, [toText(printf("🫶 That\'s all %d of today\'s free AI requests used up. Your trackers still work normally — the AI features refresh at midnight your time. Want no limits? /premium unlocks unlimited AI."))(25)]);
    }
    else {
        return new FSharpResult$2(/* Ok */ 0, [undefined]);
    }
}

/**
 * Record one *successful* AI call. Call this only after the AI actually
 * replied, so a failed request never costs the user part of their budget.
 * Premium/admin users aren't metered.
 */
export function commit(adminId, user, feature) {
    if (!isPremium(adminId, user)) {
        incr(user.Id, today(user), feature);
    }
}

/**
 * Requests left today: None = unlimited (premium/admin), Some n otherwise.
 */
export function remaining(adminId, user) {
    if (isPremium(adminId, user)) {
        return undefined;
    }
    else {
        return max(0, 25 - dayTotal(user.Id, today(user)));
    }
}

