
import { substring, printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { summary, describe } from "../Services/Energy.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { commandArg, ensureUser } from "./Common.js";
import { recentDailyTotals, totalsOn, onDate, add, deleteLastToday } from "../Services/Meals.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { error, warn, info } from "../Utils/Logger.js";
import { commit, check } from "../Services/Entitlements.js";
import { analyse } from "../Ai/FoodAnalyzer.js";
import { parse, now, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { item, sortByDescending, tryHead, sumBy, map } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { dayName } from "../Utils/Time.js";
import { bind, defaultArg, map as map_1 } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { describeImage, downloadAsDataUri, enabled } from "../Ai/Vision.js";
import { comparePrimitives } from "../fable_modules/fable-library-js.5.7.0/Util.js";

const usage = join("\n", ["🍽 Calorie tracker", "", "/food <what you ate> — I\'ll estimate calories and macros", "   e.g. /food chicken rice with extra egg, large portion", "/food undo — remove the last meal logged today", "/calories — today\'s meals and totals", "/calories week — daily totals for the last 7 days", "/calories month — 30-day summary"]);

function grams(g) {
    return toText(printf("%.0fg"))(g);
}

function mealText(m, energy) {
    let arg_2, arg_3, arg_4, arg_5, arg_6;
    return join("\n", [toText(printf("🍽 Logged: %s"))(m.Name), toText(printf("Calories: %d kcal"))(m.Calories), (arg_2 = grams(m.Protein), (arg_3 = grams(m.Carbs), (arg_4 = grams(m.Fat), toText(printf("Protein %s · Carbs %s · Fat %s"))(arg_2)(arg_3)(arg_4)))), (arg_5 = grams(m.Sugar), (arg_6 = grams(m.Fiber), toText(printf("Sugar %s · Fiber %s"))(arg_5)(arg_6))), "", "🔋 " + describe(energy)]);
}

export function handleFood(config, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        let arg;
        const matchValue = ensureUser(ctx);
        if (matchValue != null) {
            const user = matchValue;
            const matchValue_1 = commandArg(ctx);
            if (matchValue_1 != null) {
                if ((arg = matchValue_1, arg.trim().toLowerCase() === "undo")) {
                    const arg_1 = matchValue_1;
                    const matchValue_2 = deleteLastToday(user.Id);
                    if (matchValue_2 == null) {
                        return ctx.reply("Nothing logged today to remove.");
                    }
                    else {
                        const meal = matchValue_2;
                        info(toText(printf("%s removed meal: %s"))(user.FirstName)(meal.Name));
                        return ctx.reply(toText(printf("🗑 Removed: %s (%d kcal)"))(meal.Name)(meal.Calories));
                    }
                }
                else {
                    const description = matchValue_1;
                    const matchValue_3 = check(config.AdminUserId, user, "food");
                    if (matchValue_3.tag === 0) {
                        ctx.sendChatAction("typing");
                        return analyse(config, description).then((_arg) => {
                            const result = _arg;
                            if (result.tag === 1) {
                                warn(toText(printf("Food analysis failed for %s: %s"))(user.FirstName)(result.fields[0]));
                                return ctx.reply("🤔 I couldn\'t analyse that as a meal. Describe what you ate, e.g.:\n/food 2 eggs, toast with butter and a kopi");
                            }
                            else {
                                commit(config.AdminUserId, user, "food");
                                const meal_1 = add(user.Id, result.fields[0]);
                                info(toText(printf("%s logged meal: %s (%d kcal)"))(user.FirstName)(meal_1.Name)(meal_1.Calories));
                                return ctx.reply(mealText(meal_1, summary(user, meal_1.Date)));
                            }
                        });
                    }
                    else {
                        return ctx.reply(matchValue_3.fields[0]);
                    }
                }
            }
            else {
                return ctx.reply(usage);
            }
        }
        else {
            return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
        }
    }));
}

function showToday(user, ctx) {
    let arg_4, arg_5, arg_6, arg_7, arg_8;
    const today = toString(now(), "yyyy-MM-dd");
    const meals = onDate(user.Id, today);
    if (meals.length === 0) {
        return ctx.reply("Nothing logged today. Log a meal like: /food chicken rice, large portion");
    }
    else {
        const t = totalsOn(user.Id, today);
        const text = join("\n", ["🍽 Today\'s meals:", "", join("\n", map((m) => toText(printf("%s  %s — %d kcal"))(m.Time)(m.Name)(m.Calories), meals)), "", toText(printf("Total eaten: %d kcal"))(t.Calories), (arg_4 = grams(t.Protein), (arg_5 = grams(t.Carbs), (arg_6 = grams(t.Fat), toText(printf("Protein %s · Carbs %s · Fat %s"))(arg_4)(arg_5)(arg_6)))), (arg_7 = grams(t.Sugar), (arg_8 = grams(t.Fiber), toText(printf("Sugar %s · Fiber %s"))(arg_7)(arg_8))), "", "🔋 " + describe(summary(user, today))]);
        return ctx.reply(text);
    }
}

function showWeek(user, ctx) {
    const days = recentDailyTotals(user.Id, 7);
    if (days.length === 0) {
        return ctx.reply("No meals logged in the last 7 days. Start with /food <meal>");
    }
    else {
        const lines = join("\n", map((d) => {
            const arg = dayName(parse(d.Date));
            const arg_1 = substring(d.Date, 5);
            const arg_4 = (d.Meals === 1) ? "" : "s";
            return toText(printf("%s %s: %d kcal (%d meal%s)"))(arg)(arg_1)(d.Calories)(d.Meals)(arg_4);
        }, days));
        const avg = ~~(sumBy((d_1) => (d_1.Calories | 0), days, {
            GetZero: () => 0,
            Add: (x, y) => ((x + y) | 0),
        }) / days.length) | 0;
        return ctx.reply(("📊 Last 7 days:\n\n" + lines) + toText(printf("\n\nAverage: %d kcal per logged day"))(avg));
    }
}

function showMonth(user, ctx) {
    let arg, arg_2;
    const days = recentDailyTotals(user.Id, 30);
    if (days.length === 0) {
        return ctx.reply("No meals logged in the last 30 days. Start with /food <meal>");
    }
    else {
        const avgKcal = ~~(sumBy((d) => (d.Calories | 0), days, {
            GetZero: () => 0,
            Add: (x, y) => ((x + y) | 0),
        }) / days.length) | 0;
        const avgProtein = sumBy((d_1) => d_1.Protein, days, {
            GetZero: () => 0,
            Add: (x_1, y_1) => (x_1 + y_1),
        }) / days.length;
        const totalMeals = sumBy((d_2) => (d_2.Meals | 0), days, {
            GetZero: () => 0,
            Add: (x_2, y_2) => ((x_2 + y_2) | 0),
        }) | 0;
        const text = join("\n", ["📊 Last 30 days:", "", (arg = (days.length | 0), toText(printf("Days logged: %d of 30"))(arg)), toText(printf("Average: %d kcal per logged day"))(avgKcal), (arg_2 = grams(avgProtein), toText(printf("Average protein: %s per logged day"))(arg_2)), toText(printf("Meals logged: %d"))(totalMeals)]);
        return ctx.reply(text);
    }
}

export function handleCalories(ctx) {
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const matchValue_1 = map_1((s) => s.trim().toLowerCase(), commandArg(ctx));
        let matchResult;
        if (matchValue_1 != null) {
            switch (matchValue_1) {
                case "today": {
                    matchResult = 0;
                    break;
                }
                case "week": {
                    matchResult = 1;
                    break;
                }
                case "month": {
                    matchResult = 2;
                    break;
                }
                default:
                    matchResult = 3;
            }
        }
        else {
            matchResult = 0;
        }
        switch (matchResult) {
            case 0:
                return showToday(user, ctx);
            case 1:
                return showWeek(user, ctx);
            case 2:
                return showMonth(user, ctx);
            default:
                return ctx.reply(usage);
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

/**
 * Photo messages: when a vision provider is configured (VISION_API_KEY),
 * describe the photo -> feed the description to the DeepSeek nutrition
 * estimator. Otherwise fall back to asking for a text description.
 * (DeepSeek itself rejects image content — verified 2026-07-12.)
 */
export function handlePhoto(config, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const matchValue = ensureUser(ctx);
        if (matchValue != null) {
            const user = matchValue;
            if (!enabled(config)) {
                info("Photo received — no vision provider configured, text fallback");
                return ctx.reply("📸 Nice photo! Photo analysis isn\'t switched on yet (needs a VISION_API_KEY in .env).\nDescribe the meal instead and I\'ll estimate everything:\n/food chicken rice with extra egg, large portion");
            }
            else {
                const photos = defaultArg(bind((m) => m.photo, ctx.message), []);
                if (photos.length === 0) {
                    return ctx.reply("I couldn\'t read that photo — please try sending it again.");
                }
                else {
                    const matchValue_1 = check(config.AdminUserId, user, "food_photo");
                    if (matchValue_1.tag === 0) {
                        ctx.sendChatAction("typing");
                        const best = defaultArg(tryHead(sortByDescending((p_1) => p_1.width, photos.filter((p) => (p.width <= 1300)), {
                            Compare: (x, y) => (comparePrimitives(x, y) | 0),
                        })), item(photos.length - 1, photos));
                        return ctx.telegram.getFileLink(best.file_id).then((_arg) => {
                            const url = _arg.href;
                            return downloadAsDataUri(url).then((_arg_1) => {
                                const downloaded = _arg_1;
                                if (downloaded.tag === 0) {
                                    const caption = bind((m_1) => m_1.caption, ctx.message);
                                    return describeImage(config, downloaded.fields[0], caption).then((_arg_2) => {
                                        const described = _arg_2;
                                        if (described.tag === 0) {
                                            const description = described.fields[0];
                                            info(toText(printf("%s photo described: %s"))(user.FirstName)(description));
                                            return analyse(config, description).then((_arg_3) => {
                                                const result = _arg_3;
                                                if (result.tag === 1) {
                                                    warn("Food analysis of photo description failed: " + result.fields[0]);
                                                    return ctx.reply("😓 I couldn\'t turn that photo into a meal log — try /food with a short description.");
                                                }
                                                else {
                                                    commit(config.AdminUserId, user, "food_photo");
                                                    const meal = add(user.Id, result.fields[0]);
                                                    return ctx.reply((mealText(meal, summary(user, meal.Date)) + "\n\n📸 What I saw: ") + description);
                                                }
                                            });
                                        }
                                        else if (described.fields[0] === "NOT_FOOD") {
                                            return ctx.reply("🤔 That doesn\'t look like food to me. If it is, describe it: /food chicken rice");
                                        }
                                        else {
                                            error("Vision analysis failed: " + described.fields[0]);
                                            return ctx.reply("😓 Photo analysis failed — describe it instead: /food chicken rice, large portion");
                                        }
                                    });
                                }
                                else {
                                    error("Photo download failed: " + downloaded.fields[0]);
                                    return ctx.reply("😓 I couldn\'t download that photo — please try again.");
                                }
                            });
                        });
                    }
                    else {
                        return ctx.reply(matchValue_1.fields[0]);
                    }
                }
            }
        }
        else {
            return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
        }
    }));
}

