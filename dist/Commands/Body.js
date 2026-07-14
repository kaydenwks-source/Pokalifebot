
import { substring, split, printf, toText, replace, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { max, min, tryParse } from "../fable_modules/fable-library-js.5.7.0/Double.js";
import { FSharpRef } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { aiUnavailable, commandArg, ensureUser } from "./Common.js";
import { forUser, bmi, weightDelta, Field, upsertToday } from "../Services/WeightLogs.js";
import { info } from "../Utils/Logger.js";
import { bind, map, defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { ofArray, choose } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { singleton, append, delay, toList } from "../fable_modules/fable-library-js.5.7.0/Seq.js";
import { setTarget, clearTarget, setHeight } from "../Services/Users.js";
import { sumBy, truncate, map as map_1, item, choose as choose_1 } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { computeTarget } from "../Services/Energy.js";
import { parse, now, addDays, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { dayName } from "../Utils/Time.js";
import { commit, check } from "../Services/Entitlements.js";
import { recentDailyTotals } from "../Services/Meals.js";
import { analyse } from "../Ai/Progress.js";

const usage = join("\n", ["⚖️ Body tracking", "", "/weight 72.5 — log today\'s weight (kg)", "/weight — latest weight and trend", "/bodyfat 18.5 — log today\'s body fat %", "/height 175 — set your height (cm) so I can compute BMI", "/target 68 in 10 weeks — weight goal + daily calorie target", "/progress — trends + AI analysis"]);

function parseNumber(raw) {
    let matchValue;
    let outArg = 0;
    matchValue = [tryParse(replace(replace(raw.trim(), "kg", ""), "%", "").trim(), new FSharpRef(() => outArg, (v) => {
        outArg = v;
    })), outArg];
    if (matchValue[0]) {
        return matchValue[1];
    }
    else {
        return undefined;
    }
}

function deltaText(label, delta) {
    let d;
    if (delta == null) {
        return undefined;
    }
    else if ((d = delta[1], Math.abs(d) < 0.05)) {
        const d_2 = delta[1];
        return toText(printf("%s: no change"))(label);
    }
    else if (delta[1] > 0) {
        const d_3 = delta[1];
        return toText(printf("%s: +%.1f kg"))(label)(d_3);
    }
    else {
        const d_4 = delta[1];
        return toText(printf("%s: %.1f kg"))(label)(d_4);
    }
}

export function handleWeight(ctx) {
    let target, target_1, target_2, arg_4, arg_6, clo_7, kg;
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const matchValue_1 = commandArg(ctx);
        if (matchValue_1 != null) {
            const matchValue_3 = parseNumber(matchValue_1);
            let matchResult, kg_1;
            if (matchValue_3 != null) {
                if ((kg = matchValue_3, (kg >= 20) && (kg <= 400))) {
                    matchResult = 0;
                    kg_1 = matchValue_3;
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
                    upsertToday(user.Id, new Field(/* Weight */ 0, [kg_1]));
                    info(toText(printf("%s logged weight %.1f kg"))(user.FirstName)(kg_1));
                    let targetLine;
                    const matchValue_4 = user.TargetWeightKg;
                    targetLine = ((matchValue_4 == null) ? "🎯 Want a goal? /target 68 in 10 weeks — I\'ll compute your daily calories" : (((target = matchValue_4, Math.abs(kg_1 - target) <= 0.2)) ? ((target_1 = matchValue_4, "🎉 You\'ve hit your goal weight! Set a new one with /target, or /target off")) : ((target_2 = matchValue_4, (arg_4 = Math.abs(kg_1 - target_2), (arg_6 = defaultArg(map((clo_7 = toText(printf(" by %s")), clo_7), user.TargetDate), ""), toText(printf("🎯 %.1f kg to go (goal %.1f%s)"))(arg_4)(target_2)(arg_6)))))));
                    const lines_1 = choose((x_1) => x_1, toList(delay(() => append(singleton(toText(printf("⚖️ Logged: %.1f kg"))(kg_1)), delay(() => append(singleton(deltaText("vs 7 days ago", weightDelta(user.Id, 7))), delay(() => {
                        let matchValue_5, arg_9;
                        return append((matchValue_5 = user.HeightCm, (matchValue_5 == null) ? singleton("(Set /height 175 once and I\'ll compute your BMI)") : singleton((arg_9 = bmi(matchValue_5, kg_1), toText(printf("BMI: %.1f"))(arg_9)))), delay(() => singleton(targetLine)));
                    })))))));
                    return ctx.reply(join("\n", lines_1));
                }
                default:
                    return ctx.reply("That doesn\'t look like a weight in kg — e.g. /weight 72.5");
            }
        }
        else {
            const matchValue_2 = weightDelta(user.Id, 0);
            if (matchValue_2 != null) {
                const current = matchValue_2[0];
                const lines = choose((x) => x, ofArray([toText(printf("⚖️ Latest weight: %.1f kg"))(current), deltaText("Last 7 days", weightDelta(user.Id, 7)), deltaText("Last 30 days", weightDelta(user.Id, 30)), map((h) => {
                    const arg_1 = bmi(h, current);
                    return toText(printf("BMI: %.1f"))(arg_1);
                }, user.HeightCm), "", "Log today: /weight 72.5 · full picture: /progress"]));
                return ctx.reply(join("\n", lines));
            }
            else {
                return ctx.reply("No weight logged yet. Start with: /weight 72.5");
            }
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

export function handleBodyFat(ctx) {
    let pct;
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const matchValue_1 = bind(parseNumber, commandArg(ctx));
        if (matchValue_1 == null) {
            return ctx.reply("Usage: /bodyfat 18.5");
        }
        else if ((pct = matchValue_1, (pct >= 2) && (pct <= 70))) {
            const pct_1 = matchValue_1;
            upsertToday(user.Id, new Field(/* Fat */ 1, [pct_1]));
            info(toText(printf("%s logged body fat %.1f%%"))(user.FirstName)(pct_1));
            return ctx.reply(toText(printf("📏 Logged: %.1f%% body fat. Track the trend with /progress"))(pct_1));
        }
        else {
            return ctx.reply("Body fat should be a percentage between 2 and 70 — e.g. /bodyfat 18.5");
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

export function handleHeight(ctx) {
    let clo_5, cm;
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const matchValue_1 = bind(parseNumber, commandArg(ctx));
        if (matchValue_1 == null) {
            const current = defaultArg(map((clo_5 = toText(printf("Your height is set to %.0f cm.")), clo_5), user.HeightCm), "No height set yet.");
            return ctx.reply(current + "\nUsage: /height 175");
        }
        else if ((cm = matchValue_1, (cm >= 80) && (cm <= 250))) {
            const cm_1 = matchValue_1;
            setHeight(user.Id, cm_1);
            info(toText(printf("%s set height %.0f cm"))(user.FirstName)(cm_1));
            const bmiNote = defaultArg(map((tupledArg) => {
                const arg_2 = bmi(cm_1, tupledArg[0]);
                return toText(printf(" Your current BMI: %.1f."))(arg_2);
            }, weightDelta(user.Id, 0)), "");
            return ctx.reply(toText(printf("📐 Height saved: %.0f cm.%s"))(cm_1)(bmiNote));
        }
        else {
            return ctx.reply("Height should be in cm between 80 and 250 — e.g. /height 175");
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

/**
 * /target <kg> in <N> weeks|months — weight goal -> daily calorie target.
 */
export function handleTarget(ctx) {
    let arg;
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const matchValue_1 = commandArg(ctx);
        if (matchValue_1 != null) {
            if ((arg = matchValue_1, arg.trim().toLowerCase() === "off")) {
                const arg_7 = matchValue_1;
                clearTarget(user.Id);
                info(toText(printf("%s cleared weight target"))(user.FirstName));
                return ctx.reply("🎯 Goal cleared — /calories is back to plain tracking.");
            }
            else {
                const arg_9 = matchValue_1;
                let tokens;
                const array = split(arg_9, [" "], undefined, 0);
                tokens = array.filter((t) => (t.trim() !== ""));
                const numbers = choose_1((t_1) => {
                    let matchValue_6;
                    let outArg = 0;
                    matchValue_6 = [tryParse(replace(t_1.trim().toLowerCase(), "kg", ""), new FSharpRef(() => outArg, (v) => {
                        outArg = v;
                    })), outArg];
                    if (matchValue_6[0]) {
                        return matchValue_6[1];
                    }
                    else {
                        return undefined;
                    }
                }, tokens, Float64Array);
                const inMonths = tokens.some((t_2) => t_2.toLowerCase().startsWith("month"));
                if (numbers.length === 0) {
                    return ctx.reply("Tell me the goal like: /target 68 in 10 weeks (or: /target 68 in 3 months)");
                }
                else {
                    const targetKg = item(0, numbers);
                    let weeks;
                    const count = (numbers.length > 1) ? item(1, numbers) : 12;
                    weeks = min(104, max(2, inMonths ? (count * 4.345) : count));
                    if ((targetKg < 20) ? true : (targetKg > 400)) {
                        return ctx.reply("That target doesn\'t look like a weight in kg — e.g. /target 68 in 10 weeks");
                    }
                    else {
                        const matchValue_7 = weightDelta(user.Id, 0);
                        if (matchValue_7 != null) {
                            const current_1 = matchValue_7[0];
                            const plan = computeTarget(current_1, targetKg, weeks);
                            const targetDate = toString(addDays(now(), weeks * 7), "yyyy-MM-dd");
                            setTarget(user.Id, targetKg, targetDate, plan.DailyTargetKcal);
                            info(toText(printf("%s set target %.1f kg in %.0f weeks (%.0f kcal/day)"))(user.FirstName)(targetKg)(weeks)(plan.DailyTargetKcal));
                            const warnings = choose((x) => x, toList(delay(() => append(plan.Aggressive ? singleton("⚠️ That pace is faster than ~0.75 kg/week — a longer timeline is usually easier to keep.") : singleton(undefined), delay(() => (plan.Floored ? singleton("⚠️ I\'ve floored the target at 1200 kcal/day — going lower isn\'t sustainable.") : singleton(undefined)))))));
                            const text = join("\n", toList(delay(() => append(singleton(toText(printf("🎯 Goal set: %.1f kg by %s (%.0f weeks)"))(targetKg)(targetDate)(weeks)), delay(() => {
                                let arg_18;
                                return append(singleton((arg_18 = (targetKg - current_1), toText(printf("Current %.1f kg → %+.1f kg (%+.2f kg/week)"))(current_1)(arg_18)(plan.WeeklyChangeKg))), delay(() => append(singleton(toText(printf("Estimated maintenance: ~%.0f kcal/day"))(plan.MaintenanceKcal)), delay(() => append(singleton(toText(printf("Your daily target: ~%.0f kcal"))(plan.DailyTargetKcal)), delay(() => append(warnings, delay(() => append(singleton(""), delay(() => append(singleton("/calories now tracks net intake against this (workouts add headroom)."), delay(() => singleton("Estimates only, not medical advice. /target off to stop.")))))))))))));
                            })))));
                            return ctx.reply(text);
                        }
                        else {
                            return ctx.reply("Log your current weight first (/weight 72.5), then set the goal.");
                        }
                    }
                }
            }
        }
        else {
            const matchValue_2 = user.TargetWeightKg;
            const matchValue_3 = user.TargetDate;
            const matchValue_4 = user.DailyKcalTarget;
            let matchResult, date, kcal, kg;
            if (matchValue_2 != null) {
                if (matchValue_3 != null) {
                    if (matchValue_4 != null) {
                        matchResult = 0;
                        date = matchValue_3;
                        kcal = matchValue_4;
                        kg = matchValue_2;
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
                    const current = defaultArg(map((tupledArg) => {
                        const c = tupledArg[0];
                        const arg_2 = Math.abs(c - kg);
                        return toText(printf("\nCurrent: %.1f kg (%.1f kg to go)"))(c)(arg_2);
                    }, weightDelta(user.Id, 0)), "");
                    return ctx.reply(toText(printf("🎯 Goal: %.1f kg by %s · daily target ~%.0f kcal%s\n\nChange it: /target 68 in 10 weeks · stop: /target off"))(kg)(date)(kcal)(current));
                }
                default:
                    return ctx.reply("No goal set yet. Try: /target 68 in 10 weeks\nI\'ll work out the daily calories to get you there.");
            }
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

export function handleProgress(config, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const matchValue = ensureUser(ctx);
        if (matchValue != null) {
            const user = matchValue;
            const logs = forUser(user.Id);
            if (logs.length === 0) {
                return ctx.reply("No measurements yet. Start with /weight 72.5 (and /height 175 for BMI).");
            }
            else {
                const lines = choose((x) => x, ofArray(["📈 Recent measurements:", "", join("\n", map_1((l) => {
                    let clo, clo_1;
                    const kg = defaultArg(map((clo = toText(printf("%.1f kg")), clo), l.Kg), "—");
                    const fat = defaultArg(map((clo_1 = toText(printf(" · %.1f%% fat")), clo_1), l.BodyFat), "");
                    const arg_2 = dayName(parse(l.Date));
                    const arg_3 = substring(l.Date, 5);
                    return toText(printf("%s %s: %s%s"))(arg_2)(arg_3)(kg)(fat);
                }, truncate(7, logs))), "", deltaText("Last 7 days", weightDelta(user.Id, 7)), deltaText("Last 30 days", weightDelta(user.Id, 30))]));
                return ctx.reply(join("\n", lines)).then((_arg) => {
                    const matchValue_1 = check(config.AdminUserId, user, "progress");
                    if (matchValue_1.tag === 0) {
                        ctx.sendChatAction("typing");
                        let avgKcal;
                        const days = recentDailyTotals(user.Id, 7);
                        avgKcal = ((days.length === 0) ? undefined : ~~(sumBy((d) => (d.Calories | 0), days, {
                            GetZero: () => 0,
                            Add: (x_1, y) => ((x_1 + y) | 0),
                        }) / days.length));
                        return analyse(config, logs, user.HeightCm, avgKcal).then((_arg_1) => {
                            const analysis = _arg_1;
                            if (analysis.tag === 1) {
                                return ctx.reply(aiUnavailable);
                            }
                            else {
                                commit(config.AdminUserId, user, "progress");
                                return ctx.reply("🧠 " + analysis.fields[0].trim());
                            }
                        });
                    }
                    else {
                        return ctx.reply(matchValue_1.fields[0]);
                    }
                });
            }
        }
        else {
            return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
        }
    }));
}

