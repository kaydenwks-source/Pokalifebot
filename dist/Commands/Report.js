
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { aiUnavailable, commandArg, ensureUser } from "./Common.js";
import { map, defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { productivityScore, weeklyData, monthlyData, hasActivity } from "../Services/Reports.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { info } from "../Utils/Logger.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { weekly, monthly as monthly_1 } from "../Ai/Reports.js";

export function handle(config, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        let arg;
        const matchValue = ensureUser(ctx);
        if (matchValue != null) {
            const user = matchValue;
            const monthly = defaultArg(map((a) => {
                if (a.trim().toLowerCase() === "month") {
                    return true;
                }
                else {
                    return a.trim().toLowerCase() === "monthly";
                }
            }, commandArg(ctx)), false);
            if (!hasActivity(monthly ? 30 : 7, user)) {
                return ctx.reply("Not much to report yet — log some sleep, meals, habits or workouts and I\'ll have a story to tell. (Weekly reports come automatically every Sunday at 20:00, monthly on the 1st.)");
            }
            else {
                info((arg = (monthly ? "monthly" : "weekly"), toText(printf("/report (%s) for %s"))(arg)(user.FirstName)));
                ctx.sendChatAction("typing");
                return (monthly ? monthly_1(config, user.FirstName, monthlyData(user)) : weekly(config, user.FirstName, weeklyData(user))).then((_arg) => {
                    const result = _arg;
                    let header;
                    if (monthly) {
                        const arg_2 = productivityScore(user) | 0;
                        header = toText(printf("📊 Your month in review · score %d/100\n\n"))(arg_2);
                    }
                    else {
                        header = "📊 Your week in review\n\n";
                    }
                    return (result.tag === 1) ? (ctx.reply(aiUnavailable)) : (ctx.reply(header + result.fields[0].trim()));
                });
            }
        }
        else {
            return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
        }
    }));
}

