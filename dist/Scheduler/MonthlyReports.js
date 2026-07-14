
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { hasActivity, productivityScore, monthlyData } from "../Services/Reports.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { monthly } from "../Ai/Reports.js";
import { info, error } from "../Utils/Logger.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import * as node_cron from "node-cron";
import { nudgesOn, getAll } from "../Services/Users.js";
import { userNow } from "../Utils/Time.js";
import { toString, day } from "../fable_modules/fable-library-js.5.7.0/Date.js";

export function sendReport(config, bot, user) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const data = monthlyData(user);
        return monthly(config, user.FirstName, data).then((_arg) => {
            const result = _arg;
            if (result.tag === 1) {
                error(toText(printf("Monthly report for %s failed: %s"))(user.FirstName)(result.fields[0]));
                return Promise.resolve();
            }
            else {
                return PromiseBuilder__Delay_62FBFDE1(promise, () => {
                    let header;
                    const arg = productivityScore(user) | 0;
                    header = toText(printf("📊 Your month in review · score %d/100\n\n"))(arg);
                    return bot.telegram.sendMessage(user.ChatId, header + result.fields[0].trim()).then((_arg_1) => {
                        info(toText(printf("Monthly report sent to %s"))(user.FirstName));
                        return Promise.resolve();
                    });
                }).catch((_arg_2) => {
                    let arg_3;
                    error((arg_3 = _arg_2.message, toText(printf("Monthly report send to %s failed: %s"))(user.FirstName)(arg_3)));
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
            if (day(now) === 1) {
                return toString(now, "HH:mm") === "09:00";
            }
            else {
                return false;
            }
        });
        array_2 = array_1.filter((u_1) => {
            if (nudgesOn(u_1)) {
                return hasActivity(30, u_1);
            }
            else {
                return false;
            }
        });
        array_2.forEach((u_2) => {
            sendReport(config, bot, u_2);
        });
    });
    info("Monthly report scheduler started (per-user 1st of month, 09:00)");
}

