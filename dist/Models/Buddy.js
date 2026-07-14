
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, float64_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";

/**
 * A pending invite a user generated to pair with someone.
 */
export class BuddyInvite extends Record {
    constructor(Code, InviterId, CreatedAt) {
        super();
        this.Code = Code;
        this.InviterId = InviterId;
        this.CreatedAt = CreatedAt;
    }
}

export function BuddyInvite_$reflection() {
    return record_type("Models.Buddy.BuddyInvite", [], BuddyInvite, () => [["Code", string_type], ["InviterId", float64_type], ["CreatedAt", string_type]]);
}

/**
 * An active pairing. Mutual — either side may be "me".
 */
export class BuddyLink extends Record {
    constructor(AId, BId, Since) {
        super();
        this.AId = AId;
        this.BId = BId;
        this.Since = Since;
    }
}

export function BuddyLink_$reflection() {
    return record_type("Models.Buddy.BuddyLink", [], BuddyLink, () => [["AId", float64_type], ["BId", float64_type], ["Since", string_type]]);
}

