
import { clearPendingInput } from "../Services/Users.js";
import { handle as handle_1 } from "./Sleep.js";
import { handleFood } from "./Food.js";
import { handleTarget, handleWeight } from "./Body.js";
import { handle as handle_2 } from "./Goals.js";
import { handleRemind } from "./Reminders.js";
import { handle as handle_3 } from "./Habits.js";
import { handleTask } from "./Tasks.js";
import { logWorkout, handle as handle_4 } from "./Workouts.js";
import { handle as handle_5 } from "./Coach.js";
import { handleQuoteTime } from "./Quotes.js";
import { handle as handle_6 } from "./Focus.js";
import { handleMood } from "./Journal.js";
import { handle as handle_7 } from "./Buddy.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { handleText } from "./Onboarding.js";
import { bind, value as value_3 } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { commit, check } from "../Services/Entitlements.js";
import { classify } from "../Ai/Router.js";
import { logToday } from "../Services/SleepLogs.js";
import { userNow, formatDuration } from "../Utils/Time.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { markDone, tryFind } from "../Services/Habits.js";
import { analyse } from "../Ai/FoodAnalyzer.js";
import { add } from "../Services/Meals.js";
import { summary, describe } from "../Services/Energy.js";
import { parse } from "../Ai/ReminderParser.js";
import { add as add_1 } from "../Services/Reminders.js";
import { weeklyData } from "../Services/Reports.js";
import { map, append } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { append as append_1, historyFor } from "../Services/CoachHistory.js";
import { respond } from "../Ai/Coach.js";
import { ensureUser, aiUnavailable } from "./Common.js";
import { Field, upsertToday } from "../Services/WeightLogs.js";

function dispatchPending(config, userId, token, text, ctx) {
    clearPendingInput(userId);
    const run = (cmdLine, handler) => {
        ctx.message.text = cmdLine;
        return handler(ctx);
    };
    switch (token) {
        case "sleeplog":
            return run("/sleep " + text, (ctx_1) => handle_1(config, ctx_1));
        case "food":
            return run("/food " + text, (ctx_2) => handleFood(config, ctx_2));
        case "weight":
            return run("/weight " + text, handleWeight);
        case "target":
            return run("/target " + text, handleTarget);
        case "goaladd":
            return run("/goal add " + text, (ctx_5) => handle_2(config, ctx_5));
        case "goallog":
            return run("/goal log " + text, (ctx_6) => handle_2(config, ctx_6));
        case "remind":
            return run("/remind " + text, (ctx_7) => handleRemind(config, ctx_7));
        case "habitadd":
            return run("/habit add " + text, (ctx_8) => handle_3(config, ctx_8));
        case "habitdone":
            return run("/habit done " + text, (ctx_9) => handle_3(config, ctx_9));
        case "taskadd":
            return run("/task add " + text, handleTask);
        case "workoutlog":
            return run("/workout " + text, (ctx_11) => handle_4(config, ctx_11));
        case "coach":
            return run("/coach " + text, (ctx_12) => handle_5(config, ctx_12));
        case "quotetime":
            return run("/quotetime " + text, handleQuoteTime);
        case "focus":
            return run("/focus " + text, handle_6);
        case "mood":
            return run("/mood " + text, handleMood);
        case "buddyaccept":
            return run("/buddy accept " + text, handle_7);
        default:
            return ctx.reply("Okay, cancelled. Tap /menu anytime.");
    }
}

/**
 * Route a piece of user text (typed or transcribed) to the right tracker.
 * Handles the onboarding intercept first, then the AI budget + classifier.
 */
export function route(config, user, text, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        if (user.OnboardingStep != null) {
            return handleText(config, user, text, ctx);
        }
        else if (user.PendingInput != null) {
            return dispatchPending(config, user.Id, value_3(user.PendingInput), text, ctx);
        }
        else {
            const matchValue = check(config.AdminUserId, user, "nl");
            if (matchValue.tag === 0) {
                ctx.sendChatAction("typing");
                return classify(config, text).then((_arg) => {
                    let arg_4;
                    const routed = _arg;
                    if (routed.tag === 0) {
                        const intent = routed.fields[0];
                        commit(config.AdminUserId, user, "nl");
                        switch (intent.tag) {
                            case 1: {
                                const wake = intent.fields[1];
                                const bed = intent.fields[0];
                                const patternInput = logToday(user.Id, bed, wake);
                                const verb = patternInput[1] ? "Updated" : "Logged";
                                return ctx.reply((arg_4 = formatDuration(patternInput[0].DurationMinutes), toText(printf("😴 %s: %s → %s (%s). More in /sleep stats."))(verb)(bed)(wake)(arg_4)));
                            }
                            case 4: {
                                const name = intent.fields[0];
                                const matchValue_1 = tryFind(user.Id, name);
                                if (matchValue_1 != null) {
                                    const h = matchValue_1;
                                    const matchValue_2 = markDone(h);
                                    return (matchValue_2.tag === 0) ? (ctx.reply(toText(printf("✅ Done: %s — 🔥 %d streak!"))(h.Name)(matchValue_2.fields[1].Current))) : ((matchValue_2.tag === 1) ? (ctx.reply(toText(printf("🧊 Used your weekly streak freeze — ✅ %s, 🔥 %d streak safe!"))(h.Name)(matchValue_2.fields[1].Current))) : (ctx.reply(toText(printf("✅ \"%s\" was already done this period — 🔥 %d. Nice."))(h.Name)(matchValue_2.fields[0].Current))));
                                }
                                else {
                                    return ctx.reply(toText(printf("🤔 I don\'t have a habit called \"%s\". Add it with /habit add %s, or see /habit list."))(name)(name));
                                }
                            }
                            case 0:
                                return analyse(config, text).then((_arg_1) => {
                                    let arg_15;
                                    const result = _arg_1;
                                    if (result.tag === 1) {
                                        return ctx.reply("🤔 I thought that was a meal but couldn\'t break it down. Try /food with a little more detail.");
                                    }
                                    else {
                                        const meal = add(user.Id, result.fields[0]);
                                        return ctx.reply((arg_15 = describe(summary(user, meal.Date)), toText(printf("🍽 Logged: %s — %d kcal.\n🔋 %s"))(meal.Name)(meal.Calories)(arg_15)));
                                    }
                                });
                            case 3:
                                return logWorkout(config, user, text, ctx);
                            case 5:
                                return parse(config, userNow(user.TzOffsetMinutes), text).then((_arg_2) => {
                                    const parsed = _arg_2;
                                    if (parsed.tag === 1) {
                                        return ctx.reply("🤔 I couldn\'t work out the timing. Try /remind tomorrow 7pm call mum.");
                                    }
                                    else {
                                        const p = parsed.fields[0];
                                        add_1(user.Id, user.ChatId, p.Text, p.Date, p.Time, p.Repeat);
                                        return ctx.reply(toText(printf("⏰ Reminder set: %s — %s at %s."))(p.Date)(p.Text)(p.Time));
                                    }
                                });
                            case 6: {
                                const context = weeklyData(user);
                                const turns = append(map((m) => [m.Role, m.Content], historyFor(user.Id)), [["user", text]]);
                                return respond(config, user, context, turns).then((_arg_3) => {
                                    const reply = _arg_3;
                                    if (reply.tag === 1) {
                                        return ctx.reply(aiUnavailable);
                                    }
                                    else {
                                        const r = reply.fields[0];
                                        append_1(user.Id, "user", text);
                                        append_1(user.Id, "assistant", r.trim());
                                        return ctx.reply("🧠 " + r.trim());
                                    }
                                });
                            }
                            case 7:
                                return ctx.reply("🤔 I\'m not sure what to do with that. You can just tell me things like:\n• ate chicken rice\n• slept 1am woke 8am\n• weighed 72\n• gym done\n…or ask for advice. /help lists every command.");
                            default: {
                                const kg = intent.fields[0];
                                upsertToday(user.Id, new Field(/* Weight */ 0, [kg]));
                                return ctx.reply(toText(printf("⚖️ Logged: %.1f kg. Trends and BMI in /progress."))(kg));
                            }
                        }
                    }
                    else {
                        return ctx.reply(aiUnavailable);
                    }
                });
            }
            else {
                return ctx.reply(matchValue.fields[0]);
            }
        }
    }));
}

export function handle(config, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        let user, text;
        const matchValue = ensureUser(ctx);
        const matchValue_1 = bind((m) => m.text, ctx.message);
        let matchResult, text_1, user_1;
        if (matchValue != null) {
            if (matchValue_1 != null) {
                if ((user = matchValue, (text = matchValue_1, !text.startsWith("/") && (text.trim() !== "")))) {
                    matchResult = 0;
                    text_1 = matchValue_1;
                    user_1 = matchValue;
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
            case 0:
                return route(config, user_1, text_1, ctx);
            default:
                return Promise.resolve(undefined);
        }
    }));
}

