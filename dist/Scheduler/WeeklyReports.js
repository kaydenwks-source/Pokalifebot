
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { hasRecentActivity, weeklyData } from "../Services/Reports.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { weekly } from "../Ai/Reports.js";
import { info, error } from "../Utils/Logger.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import * as node_cron from "node-cron";
import { nudgesOn, getAll } from "../Services/Users.js";
import { userNow } from "../Utils/Time.js";
import { toString, dayOfWeek } from "../fable_modules/fable-library-js.5.7.0/Date.js";

/**
 * Public so /report and tests can reuse the exact same pipeline.
 */
export function sendReport(config, bot, user) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const data = weeklyData(user);
        return weekly(config, user.FirstName, data).then((_arg) => {
            const result = _arg;
            if (result.tag === 1) {
                error(toText(printf("Weekly report for %s failed: %s"))(user.FirstName)(result.fields[0]));
                return Promise.resolve();
            }
            else {
                return PromiseBuilder__Delay_62FBFDE1(promise, () => (bot.telegram.sendMessage(user.ChatId, "📊 Your week in review\n\n" + result.fields[0].trim()).then((_arg_1) => {
                    info(toText(printf("Weekly report sent to %s"))(user.FirstName));
                    return Promise.resolve();
                }))).catch((_arg_2) => {
                    let arg_2;
                    error((arg_2 = _arg_2.message, toText(printf("Weekly report send to %s failed: %s"))(user.FirstName)(arg_2)));
                    return Promise.resolve();
                });
            }
        });
    }));
}

export function start(config, bot) {
    node_cron.schedule("* * * * *", () => {
        let array_2;
        let array_1;
        const array = getAll();
        array_1 = array.filter((u) => {
            const now = userNow(u.TzOffsetMinutes);
            if (dayOfWeek(now) === 0) {
                return toString(now, "HH:mm") === "20:00";
            }
            else {
                return false;
            }
        });
        array_2 = array_1.filter((u_1) => {
            if (nudgesOn(u_1)) {
                return hasRecentActivity(u_1);
            }
            else {
                return false;
            }
        });
        array_2.forEach((u_2) => {
            sendReport(config, bot, u_2);
        });
    });
    info("Weekly report scheduler started (per-user Sundays 20:00)");
}

