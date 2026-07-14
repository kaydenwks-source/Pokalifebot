
import { substring, printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { item, skip, truncate, map, tryPick } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { forUser } from "../Services/WeightLogs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { tips, parse } from "../Ai/Workouts.js";
import { onDate, allBests, forUser as forUser_1, bestsFor, add } from "../Services/Workouts.js";
import { warn, info } from "../Utils/Logger.js";
import { details } from "../Models/Workout.js";
import { describe, summary as summary_1 } from "../Services/Energy.js";
import { choose, append, ofArray, empty } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { autoProgress } from "../Services/Goals.js";
import { dayName } from "../Utils/Time.js";
import { now, toString, parse as parse_1 } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { map as map_1 } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { commandArgs, ensureUser, aiUnavailable } from "./Common.js";

const usage = join("\n", ["🏋️ Workout tracker", "", "/workout <what you did> — I\'ll parse and log it:", "• /workout bench press 3x8 60kg", "• /workout ran 5km in 30 minutes", "• /workout 45 min yoga session", "", "/workout history — your last sessions", "/workout prs — personal records per exercise", "/workout tips — AI look at your recent training"]);

/**
 * Public so the natural-language router can log a workout from free text
 * and reuse the full PR / energy / goal-feed reply.
 */
export function logWorkout(config, user, description, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        ctx.sendChatAction("typing");
        const userWeight = tryPick((l) => l.Kg, forUser(user.Id));
        return parse(config, userWeight, description).then((_arg) => {
            let arg_4, d;
            const parsed = _arg;
            if (parsed.tag === 0) {
                const entry = add(user.Id, parsed.fields[0]);
                const before = bestsFor(user.Id, entry.Exercise, entry.Id);
                info((arg_4 = details(entry), toText(printf("%s logged workout: %s (%s)"))(user.FirstName)(entry.Exercise)(arg_4)));
                let prLine;
                const matchValue = entry.WeightKg;
                const matchValue_1 = before.BestKg;
                let matchResult, prev_1, w_1;
                if (matchValue != null) {
                    if (matchValue_1 != null) {
                        if (matchValue > matchValue_1) {
                            matchResult = 0;
                            prev_1 = matchValue_1;
                            w_1 = matchValue;
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
                        prLine = toText(printf("🏆 NEW WEIGHT PR! Previous best: %.1f kg"))(prev_1);
                        break;
                    }
                    default: {
                        const matchValue_3 = entry.DistanceKm;
                        const matchValue_4 = before.BestKm;
                        let matchResult_1, km_1, prev_3;
                        if (matchValue_3 != null) {
                            if (matchValue_4 != null) {
                                if (matchValue_3 > matchValue_4) {
                                    matchResult_1 = 0;
                                    km_1 = matchValue_3;
                                    prev_3 = matchValue_4;
                                }
                                else {
                                    matchResult_1 = 1;
                                }
                            }
                            else {
                                matchResult_1 = 1;
                            }
                        }
                        else {
                            matchResult_1 = 1;
                        }
                        switch (matchResult_1) {
                            case 0: {
                                prLine = toText(printf("🏆 Longest distance yet! Previous best: %.1f km"))(prev_3);
                                break;
                            }
                            default:
                                prLine = ((((before.BestKg == null) && (before.BestKm == null)) && ((entry.WeightKg != null) ? true : (entry.DistanceKm != null))) ? "📘 First log for this exercise — baseline set." : undefined);
                        }
                    }
                }
                const energy = summary_1(user, entry.Date);
                const energyLine = ((user.DailyKcalTarget != null) ? true : (energy.Eaten > 0)) ? ("🔋 " + describe(energy)) : undefined;
                let goalLines;
                const matchValue_6 = entry.DistanceKm;
                if (matchValue_6 == null) {
                    goalLines = empty();
                }
                else {
                    const km_2 = matchValue_6;
                    goalLines = ofArray(map((r) => {
                        let m;
                        const g = r.Goal;
                        let extra;
                        const matchValue_7 = r.Milestone;
                        extra = ((matchValue_7 == null) ? "" : ((matchValue_7 === 100) ? " 🏆 GOAL COMPLETE!" : ((m = (matchValue_7 | 0), toText(printf(" 🎉 %d%%!"))(m)))));
                        return toText(printf("🎯 +%g km → %s (%g/%g km)%s"))(km_2)(g.Name)(g.Progress)(g.TargetValue)(extra);
                    }, autoProgress(user.Id, "km", km_2)));
                }
                const lines = append(choose((x) => x, ofArray([toText(printf("🏋️ Logged: %s"))(entry.Exercise), (d = details(entry), (d === "") ? undefined : d), toText(printf("~%d kcal burned"))(entry.CaloriesBurned), prLine, energyLine])), goalLines);
                return ctx.reply(join("\n", lines));
            }
            else {
                warn(toText(printf("Workout parse failed for %s: %s"))(user.FirstName)(parsed.fields[0]));
                return ctx.reply("🤔 I couldn\'t read that as a workout. Try something like:\n/workout bench press 3x8 60kg\n/workout ran 5km in 30 minutes");
            }
        });
    }));
}

function showHistory(user, ctx) {
    const logs = truncate(10, forUser_1(user.Id));
    if (logs.length === 0) {
        return ctx.reply("No workouts logged yet. Start with: /workout bench press 3x8 60kg");
    }
    else {
        return ctx.reply("🗓 Your last workouts:\n\n" + join("\n", map((l) => {
            const d = details(l);
            const arg = dayName(parse_1(l.Date));
            const arg_1 = substring(l.Date, 5);
            const arg_3 = (d === "") ? "" : (" · " + d);
            return toText(printf("• %s %s — %s%s (~%d kcal)"))(arg)(arg_1)(l.Exercise)(arg_3)(l.CaloriesBurned);
        }, logs)));
    }
}

function showPrs(user, ctx) {
    let bests;
    const array = allBests(user.Id);
    bests = array.filter((b) => {
        if (b.BestKg != null) {
            return true;
        }
        else {
            return b.BestKm != null;
        }
    });
    if (bests.length === 0) {
        return ctx.reply("No records yet — log workouts with weights or distances and I\'ll track your bests.");
    }
    else {
        return ctx.reply("Personal records:\n\n" + join("\n", map((b_1) => {
            let clo, clo_1;
            const parts = join(" · ", choose((x) => x, ofArray([map_1((clo = toText(printf("%.1f kg")), clo), b_1.BestKg), map_1((clo_1 = toText(printf("%.1f km")), clo_1), b_1.BestKm)])));
            return toText(printf("🏆 %s — %s"))(b_1.Exercise)(parts);
        }, bests)));
    }
}

function showTips(config, user, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const logs = forUser_1(user.Id);
        if (logs.length === 0) {
            return ctx.reply("Log a few workouts first, then I\'ll have something to work with!");
        }
        else {
            ctx.sendChatAction("typing");
            return tips(config, logs).then((_arg) => {
                const result = _arg;
                return (result.tag === 1) ? (ctx.reply(aiUnavailable)) : (ctx.reply("🧠 " + result.fields[0].trim()));
            });
        }
    }));
}

/**
 * Dispatcher: /workout [history|prs|tips|add <desc>|<desc>]
 */
export function handle(config, ctx) {
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const args = commandArgs(ctx);
        if (args.length === 0) {
            const today = onDate(user.Id, toString(now(), "yyyy-MM-dd"));
            if (today.length === 0) {
                return ctx.reply(usage);
            }
            else {
                const summary = join("\n", map((w) => toText(printf("• %s (~%d kcal)"))(w.Exercise)(w.CaloriesBurned), today));
                return ctx.reply((("🏋️ Today so far:\n" + summary) + "\n\n") + usage);
            }
        }
        else {
            const rest = join(" ", skip(1, args));
            const matchValue_1 = item(0, args).toLowerCase();
            let matchResult;
            switch (matchValue_1) {
                case "history": {
                    matchResult = 0;
                    break;
                }
                case "prs":
                case "records": {
                    matchResult = 1;
                    break;
                }
                case "tips": {
                    matchResult = 2;
                    break;
                }
                case "add": {
                    if (rest.trim() !== "") {
                        matchResult = 3;
                    }
                    else {
                        matchResult = 4;
                    }
                    break;
                }
                default:
                    matchResult = 5;
            }
            switch (matchResult) {
                case 0:
                    return showHistory(user, ctx);
                case 1:
                    return showPrs(user, ctx);
                case 2:
                    return showTips(config, user, ctx);
                case 3:
                    return logWorkout(config, user, rest, ctx);
                case 4:
                    return ctx.reply("What did you do? e.g. /workout add bench press 3x8 60kg");
                default:
                    return logWorkout(config, user, join(" ", args), ctx);
            }
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

