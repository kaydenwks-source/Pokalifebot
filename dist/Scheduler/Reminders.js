
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { error, info } from "../Utils/Logger.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { getAll, completeOccurrence } from "../Services/Reminders.js";
import * as node_cron from "node-cron";
import { toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { userNow } from "../Utils/Time.js";
import { bind } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { find } from "../Services/Users.js";

function fire(bot, nowStamp, reminder) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => ((PromiseBuilder__Delay_62FBFDE1(promise, () => (bot.telegram.sendMessage(reminder.ChatId, "⏰ Reminder: " + reminder.Text).then((_arg) => {
        info(toText(printf("Reminder fired for user %.0f: %s"))(reminder.UserId)(reminder.Text));
        return Promise.resolve();
    }))).catch((_arg_1) => {
        let arg_3;
        error((arg_3 = _arg_1.message, toText(printf("Reminder send failed for user %.0f: %s"))(reminder.UserId)(arg_3)));
        return Promise.resolve();
    })).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => {
        completeOccurrence(nowStamp, reminder);
        return Promise.resolve();
    })))));
}

export function start(bot) {
    node_cron.schedule("* * * * *", () => {
        const array = getAll();
        array.forEach((r) => {
            const nowStamp = toString(userNow(bind((u) => u.TzOffsetMinutes, find(r.UserId))), "yyyy-MM-dd HH:mm");
            if (((r.DueDate + " ") + r.DueTime) <= nowStamp) {
                fire(bot, nowStamp, r);
            }
        });
    });
    info("Reminder scheduler started (checks every minute)");
}

