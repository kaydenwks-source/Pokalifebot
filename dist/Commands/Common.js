
import { map, defaultArg, bind } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { join, split } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { skip } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { upsert } from "../Services/Users.js";

export const aiUnavailable = "😓 I couldn\'t reach my AI brain just now. Please try again in a minute.";

/**
 * Raw argument string after a command: "/quote gym now" -> Some "gym now".
 * On an inline-button (callback) update there is no typed command, so we
 * return None — this lets the menu reuse any no-arg view handler safely
 * without it misreading the menu message's own text as arguments.
 */
export function commandArg(ctx) {
    const matchValue = ctx.callbackQuery;
    if (matchValue == null) {
        return bind((text) => {
            let parts;
            const array = split(text.trim(), [" "], undefined, 0);
            parts = array.filter((p) => (p.trim() !== ""));
            if (parts.length >= 2) {
                return join(" ", skip(1, parts));
            }
            else {
                return undefined;
            }
        }, bind((m) => m.text, ctx.message));
    }
    else {
        return undefined;
    }
}

/**
 * Argument words after a command: "/sleep 23:00 07:00" -> [|"23:00"; "07:00"|].
 */
export function commandArgs(ctx) {
    return defaultArg(map((s) => {
        const array = split(s, [" "], undefined, 0);
        return array.filter((p) => (p.trim() !== ""));
    }, commandArg(ctx)), []);
}

/**
 * Register/refresh the user so a profile always exists before we act.
 */
export function ensureUser(ctx) {
    const matchValue = ctx.from;
    const matchValue_1 = ctx.chat;
    let matchResult, chat, from;
    if (matchValue != null) {
        if (matchValue_1 != null) {
            matchResult = 0;
            chat = matchValue_1;
            from = matchValue;
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
            return upsert(from.id, chat.id, from.first_name, from.username);
        default:
            return undefined;
    }
}

