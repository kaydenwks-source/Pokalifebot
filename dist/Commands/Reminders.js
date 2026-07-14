
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { userNow, dayName } from "../Utils/Time.js";
import { parse } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { describeRepeat } from "../Models/Reminder.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { commandArg, ensureUser } from "./Common.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { parse as parse_1 } from "../Ai/ReminderParser.js";
import { deleteByIndex, forUser, add } from "../Services/Reminders.js";
import { warn, info } from "../Utils/Logger.js";
import { mapIndexed } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { tryParse } from "../fable_modules/fable-library-js.5.7.0/Int32.js";
import { FSharpRef } from "../fable_modules/fable-library-js.5.7.0/Types.js";

const usage = join("\n", ["⏰ Reminders", "", "/remind <when> <what> — plain English works:", "• /remind tomorrow 7pm call mum", "• /remind every monday 8am gym session", "• /remind in 2 hours drink water", "• /remind every day 22:30 wind down for bed", "", "/reminders — list what\'s scheduled", "/deletereminder <number> — remove one (number from /reminders)"]);

function describe(r) {
    const day = dayName(parse(r.DueDate));
    const arg_4 = describeRepeat(r.Repeat);
    return toText(printf("%s %s at %s — %s (%s)"))(day)(r.DueDate)(r.DueTime)(r.Text)(arg_4);
}

export function handleRemind(config, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const matchValue = ensureUser(ctx);
        if (matchValue != null) {
            const user = matchValue;
            const matchValue_1 = commandArg(ctx);
            if (matchValue_1 != null) {
                const request = matchValue_1;
                ctx.sendChatAction("typing");
                return parse_1(config, userNow(user.TzOffsetMinutes), request).then((_arg) => {
                    let arg_3;
                    const parsed = _arg;
                    if (parsed.tag === 0) {
                        const p = parsed.fields[0];
                        const reminder = add(user.Id, user.ChatId, p.Text, p.Date, p.Time, p.Repeat);
                        info((arg_3 = describe(reminder), toText(printf("%s created reminder: %s"))(user.FirstName)(arg_3)));
                        return ctx.reply("✅ Got it! " + describe(reminder));
                    }
                    else {
                        warn(toText(printf("Reminder parse failed for %s: %s"))(user.FirstName)(parsed.fields[0]));
                        return ctx.reply("🤔 I couldn\'t work out when you mean. Try something like:\n• /remind tomorrow 7pm call mum\n• /remind every monday 8am gym\n• /remind in 2 hours drink water");
                    }
                });
            }
            else {
                return ctx.reply(usage);
            }
        }
        else {
            return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
        }
    }));
}

export function handleList(ctx) {
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const mine = forUser(matchValue.Id);
        if (mine.length === 0) {
            return ctx.reply("No reminders scheduled. Create one like: /remind tomorrow 7pm call mum");
        }
        else {
            const lines = join("\n", mapIndexed((i, r) => {
                const arg = (i + 1) | 0;
                const arg_1 = describe(r);
                return toText(printf("%d. %s"))(arg)(arg_1);
            }, mine));
            return ctx.reply(("⏰ Your reminders:\n\n" + lines) + "\n\nRemove one with /deletereminder <number>");
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

export function handleDelete(ctx) {
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const matchValue_1 = commandArg(ctx);
        if (matchValue_1 != null) {
            const arg = matchValue_1;
            let matchValue_2;
            let outArg = 0;
            matchValue_2 = [tryParse(arg.trim(), 511, false, 32, new FSharpRef(() => (outArg | 0), (v) => {
                outArg = (v | 0);
            })), outArg];
            if (matchValue_2[0]) {
                const matchValue_3 = deleteByIndex(user.Id, matchValue_2[1]);
                if (matchValue_3 == null) {
                    return ctx.reply("That number isn\'t in your list — check /reminders");
                }
                else {
                    const r = matchValue_3;
                    info(toText(printf("%s deleted reminder: %s"))(user.FirstName)(r.Text));
                    return ctx.reply("🗑 Deleted: " + describe(r));
                }
            }
            else {
                return ctx.reply("Use the number from /reminders, e.g. /deletereminder 2");
            }
        }
        else {
            return ctx.reply("Which one? /deletereminder <number> — see the numbers with /reminders");
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

