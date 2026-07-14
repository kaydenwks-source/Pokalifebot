
import { commandArg, ensureUser } from "./Common.js";
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { remaining } from "../Services/Entitlements.js";
import { ofArray } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { info } from "../Utils/Logger.js";
import { wipe, export$ } from "../Services/UserData.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { map } from "../fable_modules/fable-library-js.5.7.0/Option.js";

export function handleUsage(config, ctx) {
    let matchValue_1, left, used;
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const text = join("\n", (matchValue_1 = remaining(config.AdminUserId, matchValue), (matchValue_1 != null) ? ((left = (matchValue_1 | 0), (used = ((25 - left) | 0), ofArray(["📊 AI usage today", "", toText(printf("Used: %d of %d AI requests"))(used)(25), toText(printf("Remaining: %d"))(left), "Resets at midnight, your time.", "", "Trackers (habits, tasks, weight, workouts…) are always unlimited — only AI features count here."])))) : ofArray(["📊 AI usage", "", "Unlimited ✨ (admin)", "Your trackers are always unlimited too."])));
        return ctx.reply(text);
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

export function handleExport(ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const matchValue = ensureUser(ctx);
        if (matchValue != null) {
            const user = matchValue;
            info(toText(printf("%s requested a data export"))(user.FirstName));
            const json = JSON.stringify(export$(user.Id), null, 2);
            const doc = {
                source: Buffer.from(json, 'utf8'),
                filename: "momentum-export.json",
            };
            return ctx.replyWithDocument(doc).then((_arg) => (ctx.reply("📦 Here\'s everything I have on you — every tracker, in one JSON file. It\'s yours to keep, move, or check.")));
        }
        else {
            return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
        }
    }));
}

const deleteWarning = join("\n", ["⚠️ This permanently deletes EVERYTHING I have on you:", "habits, tasks, sleep, meals, weights, workouts, goals, reminders,", "coach history and your settings. It cannot be undone.", "", "Want a copy first? Run /export.", "", "To go ahead, type:  /deleteme CONFIRM"]);

export function handleDeleteMe(ctx) {
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const matchValue_1 = map((s) => s.trim().toUpperCase(), commandArg(ctx));
        let matchResult;
        if (matchValue_1 != null) {
            if (matchValue_1 === "CONFIRM") {
                matchResult = 0;
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
                wipe(user.Id);
                info(toText(printf("%s (id %.0f) deleted their account"))(user.FirstName)(user.Id));
                return ctx.reply("🧹 Done. Everything has been permanently deleted. Whenever you\'re ready, /start begins a fresh page.");
            }
            default:
                return ctx.reply(deleteWarning);
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

