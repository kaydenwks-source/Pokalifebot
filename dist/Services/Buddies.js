
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { save, load } from "./Storage.js";
import { tryFind, append, tryPick } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { substring } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { newGuid, toString } from "../fable_modules/fable-library-js.5.7.0/Guid.js";
import { now, toString as toString_1 } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { BuddyLink, BuddyInvite } from "../Models/Buddy.js";
import { Union } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { union_type, float64_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";

const invitesPath = "database/buddy-invites.json";

const linksPath = "database/buddies.json";

function invites() {
    return defaultArg(load(invitesPath), []);
}

function saveInvites(xs) {
    save(invitesPath, xs);
}

function links() {
    return defaultArg(load(linksPath), []);
}

function saveLinks(xs) {
    save(linksPath, xs);
}

/**
 * The id of a user's current buddy, if paired.
 */
export function buddyOf(userId) {
    return tryPick((l) => {
        if (l.AId === userId) {
            return l.BId;
        }
        else if (l.BId === userId) {
            return l.AId;
        }
        else {
            return undefined;
        }
    }, links());
}

function newCode() {
    return substring(toString(newGuid(), "N"), 0, 6).toUpperCase();
}

/**
 * Create (replacing any existing) this user's pending invite; returns the code.
 */
export function createInvite(userId) {
    let array;
    const code = newCode();
    saveInvites(append((array = invites(), array.filter((i) => (i.InviterId !== userId))), [new BuddyInvite(code, userId, toString_1(now(), "yyyy-MM-dd HH:mm"))]));
    return code;
}

export class AcceptResult extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Paired", "NotFound", "SelfPair", "AlreadyPaired", "InviterPaired"];
    }
    static NotFound = new AcceptResult(1, []);
    static SelfPair = new AcceptResult(2, []);
    static AlreadyPaired = new AcceptResult(3, []);
    static InviterPaired = new AcceptResult(4, []);
}

export function AcceptResult_$reflection() {
    return union_type("Services.Buddies.AcceptResult", [], AcceptResult, () => [[["Item", float64_type]], [], [], [], []]);
}

/**
 * Redeem an invite code, forming the pairing if everything checks out.
 */
export function accept(rawCode, accepterId) {
    let array_1, array_2;
    const code = rawCode.trim().toUpperCase();
    const matchValue = tryFind((i) => (i.Code === code), invites());
    if (matchValue != null) {
        if (matchValue.InviterId === accepterId) {
            const inv_1 = matchValue;
            return AcceptResult.SelfPair;
        }
        else {
            const inv_2 = matchValue;
            if (buddyOf(accepterId) != null) {
                return AcceptResult.AlreadyPaired;
            }
            else if (buddyOf(inv_2.InviterId) != null) {
                saveInvites((array_1 = invites(), array_1.filter((i_1) => (i_1.Code !== code))));
                return AcceptResult.InviterPaired;
            }
            else {
                saveLinks(append(links(), [new BuddyLink(inv_2.InviterId, accepterId, toString_1(now(), "yyyy-MM-dd"))]));
                saveInvites((array_2 = invites(), array_2.filter((i_2) => {
                    if (i_2.Code !== code) {
                        return i_2.InviterId !== inv_2.InviterId;
                    }
                    else {
                        return false;
                    }
                })));
                return new AcceptResult(/* Paired */ 0, [inv_2.InviterId]);
            }
        }
    }
    else {
        return AcceptResult.NotFound;
    }
}

/**
 * Remove any pairing involving the user; returns the ex-buddy id, if any.
 */
export function unpair(userId) {
    let array;
    const b = buddyOf(userId);
    saveLinks((array = links(), array.filter((l) => {
        if (l.AId !== userId) {
            return l.BId !== userId;
        }
        else {
            return false;
        }
    })));
    return b;
}

/**
 * Account-deletion cleanup: drop every link and invite involving the user.
 */
export function purgeUser(userId) {
    let array, array_1;
    saveLinks((array = links(), array.filter((l) => {
        if (l.AId !== userId) {
            return l.BId !== userId;
        }
        else {
            return false;
        }
    })));
    saveInvites((array_1 = invites(), array_1.filter((i) => (i.InviterId !== userId))));
}

