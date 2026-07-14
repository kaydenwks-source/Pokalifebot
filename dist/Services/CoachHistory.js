
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, string_type, float64_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { save, load } from "./Storage.js";
import { now, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { skip, append as append_1 } from "../fable_modules/fable-library-js.5.7.0/Array.js";

export class CoachMessage extends Record {
    constructor(UserId, Role, Content, At) {
        super();
        this.UserId = UserId;
        this.Role = Role;
        this.Content = Content;
        this.At = At;
    }
}

export function CoachMessage_$reflection() {
    return record_type("Services.CoachHistory.CoachMessage", [], CoachMessage, () => [["UserId", float64_type], ["Role", string_type], ["Content", string_type], ["At", string_type]]);
}

const filePath = "database/coach.json";

const keep = 8;

function getAll() {
    return defaultArg(load(filePath), []);
}

function saveAll(messages) {
    save(filePath, messages);
}

/**
 * A user's recent exchange, oldest first (append order is preserved).
 */
export function historyFor(userId) {
    const array = getAll();
    return array.filter((m) => (m.UserId === userId));
}

export function append(userId, role, content) {
    const entry = new CoachMessage(userId, role, content, toString(now(), "yyyy-MM-dd HH:mm"));
    const all = getAll();
    const others = all.filter((m) => (m.UserId !== userId));
    const mine = append_1(all.filter((m_1) => (m_1.UserId === userId)), [entry]);
    saveAll(append_1(others, (mine.length > keep) ? skip(mine.length - keep, mine) : mine));
}

export function clear(userId) {
    let array;
    saveAll((array = getAll(), array.filter((m) => (m.UserId !== userId))));
}

