
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { Schedule_tryParseToken } from "../Models/Task.js";
import { skip, item as item_1, mapIndexed, tryPick } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { describe, Days_tryParse } from "../Models/Commitment.js";
import { ofArray, contains } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { stringHash } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { deleteByIndex, forUser, add } from "../Services/Commitments.js";
import { info } from "../Utils/Logger.js";
import { tryParse } from "../fable_modules/fable-library-js.5.7.0/Int32.js";
import { FSharpRef } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { commandArgs, ensureUser } from "./Common.js";

const usage = join("\n", ["📌 Busy blocks — recurring things I should plan around", "", "/busy add sunday 10:00-12:00 church service", "/busy add daily 12:30-13:00 lunch break", "/busy list — see them all", "/busy delete <number> — remove one", "", "They show in /today and /plan schedules around them automatically."]);

function parseTimeToken(t) {
    return Schedule_tryParseToken(t.startsWith("@") ? t : ("@" + t));
}

function addBlock(user, rest, ctx) {
    let arg_1, arg_2, until, d, at;
    const day = tryPick(Days_tryParse, rest);
    const time = tryPick(parseTimeToken, rest);
    const name = join(" ", rest.filter((t_1) => {
        if ((Days_tryParse(t_1) == null) && (parseTimeToken(t_1) == null)) {
            return !contains(t_1.toLowerCase(), ofArray(["every", "on", "at", "each"]), {
                Equals: (x, y) => (x === y),
                GetHashCode: (x) => (stringHash(x) | 0),
            });
        }
        else {
            return false;
        }
    }));
    let matchResult, at_1, d_1, until_1;
    if (day != null) {
        if (time != null) {
            if ((until = time[1], (d = day, (at = time[0], name.trim() !== "")))) {
                matchResult = 0;
                at_1 = time[0];
                d_1 = day;
                until_1 = time[1];
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
        case 0: {
            const item = add(user.Id, name, d_1, at_1, until_1);
            info((arg_1 = describe(item), toText(printf("%s added busy block: %s"))(user.FirstName)(arg_1)));
            return ctx.reply((arg_2 = describe(item), toText(printf("📌 Got it — %s\nI\'ll plan around this. See all: /busy list"))(arg_2)));
        }
        default:
            return ctx.reply("I need a day, a time and a name, e.g.\n/busy add sunday 10:00-12:00 church service");
    }
}

function showList(user, ctx) {
    const mine = forUser(user.Id);
    if (mine.length === 0) {
        return ctx.reply("No busy blocks yet. Add one: /busy add sunday 10:00-12:00 church service");
    }
    else {
        const lines = join("\n", mapIndexed((i, c) => {
            const arg = (i + 1) | 0;
            const arg_1 = describe(c);
            return toText(printf("%d. %s"))(arg)(arg_1);
        }, mine));
        return ctx.reply(("📌 Your recurring blocks:\n\n" + lines) + "\n\nRemove one: /busy delete <number>");
    }
}

function deleteBlock(user, arg, ctx) {
    let matchValue;
    let outArg = 0;
    matchValue = [tryParse(arg.trim(), 511, false, 32, new FSharpRef(() => (outArg | 0), (v) => {
        outArg = (v | 0);
    })), outArg];
    if (matchValue[0]) {
        const matchValue_1 = deleteByIndex(user.Id, matchValue[1]);
        if (matchValue_1 == null) {
            return ctx.reply("That number isn\'t in your list — check /busy list");
        }
        else {
            const c = matchValue_1;
            info(toText(printf("%s deleted busy block: %s"))(user.FirstName)(c.Name));
            return ctx.reply("🗑 Removed: " + describe(c));
        }
    }
    else {
        return ctx.reply("Use the number from /busy list, e.g. /busy delete 2");
    }
}

/**
 * Dispatcher: /busy [add|list|delete]
 */
export function handle(ctx) {
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const args = commandArgs(ctx);
        if (args.length === 0) {
            return showList(user, ctx);
        }
        else {
            const matchValue_1 = item_1(0, args).toLowerCase();
            switch (matchValue_1) {
                case "add":
                    return addBlock(user, skip(1, args), ctx);
                case "list":
                    return showList(user, ctx);
                case "delete":
                case "remove":
                    return deleteBlock(user, join(" ", skip(1, args)), ctx);
                default:
                    if (tryPick(Days_tryParse, args) != null) {
                        return addBlock(user, args, ctx);
                    }
                    else {
                        return ctx.reply(usage);
                    }
            }
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

