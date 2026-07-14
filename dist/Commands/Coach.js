
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { aiUnavailable, commandArg, ensureUser } from "./Common.js";
import { append as append_1, historyFor, clear } from "../Services/CoachHistory.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { commit, check } from "../Services/Entitlements.js";
import { error, info } from "../Utils/Logger.js";
import { weeklyData } from "../Services/Reports.js";
import { map, append } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { respond } from "../Ai/Coach.js";

const intro = join("\n", ["🧠 I\'m here. Tell me what\'s going on:", "", "/coach I feel lazy today", "/coach I skipped the gym again", "/coach I\'m stressed about exams", "/coach I keep procrastinating", "", "I remember our recent conversation — /coach reset wipes it."]);

export function handle(config, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        let arg;
        const matchValue = ensureUser(ctx);
        if (matchValue != null) {
            const user = matchValue;
            const matchValue_1 = commandArg(ctx);
            if (matchValue_1 != null) {
                if ((arg = matchValue_1, arg.trim().toLowerCase() === "reset")) {
                    const arg_1 = matchValue_1;
                    clear(user.Id);
                    return ctx.reply("🧠 Fresh start. What\'s on your mind?");
                }
                else {
                    const message = matchValue_1;
                    const matchValue_2 = check(config.AdminUserId, user, "coach");
                    if (matchValue_2.tag === 0) {
                        info(toText(printf("/coach from %s"))(user.FirstName));
                        ctx.sendChatAction("typing");
                        const context = weeklyData(user);
                        const turns = append(map((m) => [m.Role, m.Content], historyFor(user.Id)), [["user", message]]);
                        return respond(config, user, context, turns).then((_arg) => {
                            const result = _arg;
                            if (result.tag === 1) {
                                error("Coach failed: " + result.fields[0]);
                                return ctx.reply(aiUnavailable);
                            }
                            else {
                                const reply = result.fields[0];
                                commit(config.AdminUserId, user, "coach");
                                append_1(user.Id, "user", message);
                                append_1(user.Id, "assistant", reply.trim());
                                return ctx.reply("🧠 " + reply.trim());
                            }
                        });
                    }
                    else {
                        return ctx.reply(matchValue_2.fields[0]);
                    }
                }
            }
            else {
                return ctx.reply(intro);
            }
        }
        else {
            return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
        }
    }));
}

