
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { generate } from "../Ai/Quotes.js";
import { info, error } from "../Utils/Logger.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import * as node_cron from "node-cron";
import { withDailyQuote } from "../Services/Users.js";
import { equals } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { userNow } from "../Utils/Time.js";

function sendTo(config, bot, user) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (generate(config, user.QuoteCategory).then((_arg) => {
        const result = _arg;
        if (result.tag === 1) {
            error(toText(printf("Daily quote for %s failed: %s"))(user.FirstName)(result.fields[0]));
            return Promise.resolve();
        }
        else {
            const message = toText(printf("🌅 Good morning, %s!\n\n%s"))(user.FirstName)(result.fields[0]);
            return bot.telegram.sendMessage(user.ChatId, message).then((_arg_1) => {
                info(toText(printf("Daily quote sent to %s"))(user.FirstName));
                return Promise.resolve();
            });
        }
    }))));
}

export function start(config, bot) {
    node_cron.schedule("* * * * *", () => {
        let array_1;
        const array = withDailyQuote();
        array_1 = array.filter((u) => equals(u.QuoteTime, toString(userNow(u.TzOffsetMinutes), "HH:mm")));
        array_1.forEach((u_1) => {
            sendTo(config, bot, u_1);
        });
    });
    info("Daily quote scheduler started (checks every minute)");
}

