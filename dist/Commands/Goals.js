
import { trimEnd, printf, toText, replicate, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { tryParse as tryParse_1, min } from "../fable_modules/fable-library-js.5.7.0/Double.js";
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { deleteByIndex, applyLog, logProgress as logProgress_1, setProgress, byIndex, isAbsolute, setSteps, add, forUser, percentOf } from "../Services/Goals.js";
import { skip, tryPick, item, findIndex, mapIndexed } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { commit, check } from "../Services/Entitlements.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { breakdown, parse } from "../Ai/GoalParser.js";
import { warn, info } from "../Utils/Logger.js";
import { tryParse } from "../fable_modules/fable-library-js.5.7.0/Int32.js";
import { FSharpRef } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { filter, toArray } from "../fable_modules/fable-library-js.5.7.0/Seq.js";
import { isDigit } from "../fable_modules/fable-library-js.5.7.0/Char.js";
import { ofArray, choose } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { int32ToString, equals } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { celebrateGoal } from "../Ai/Encourage.js";
import { commandArgs, ensureUser } from "./Common.js";

const usage = join("\n", ["🎯 Goals", "", "/goal add read Atomic Habits — AI works out the scale (e.g. chapters)", "/goal add save $5000 · /goal add run 100 km · /goal add finish python course", "/goals — progress overview", "/goal plan <number> — your coach\'s step-by-step path", "/goal log <number> <amount> — add progress (cumulative goals; default 1)", "/goal log <number> <point> — for chapters/lessons, jump to where you are", "     e.g. /goal log 1 3 → 3/12 chapters. /goal log 1 = next one.", "/goal done <number> — finish a goal outright", "/goal delete <number> — remove one", "", "Tip: cardio workouts auto-feed goals measured in km.", "For weight goals use /target instead."]);

function bar(pct) {
    const filled = min(10, ~~(pct / 10)) | 0;
    return replicate(filled, "▓") + replicate(10 - filled, "░");
}

function describe(index, g) {
    if (g.CompletedAt != null) {
        const arg = (index + 1) | 0;
        const arg_2 = defaultArg(g.CompletedAt, "");
        return toText(printf("%d. ✅ %s — completed %s"))(arg)(g.Name)(arg_2);
    }
    else {
        const pct = percentOf(g) | 0;
        const unitStr = (g.Unit === "") ? "" : (" " + g.Unit);
        const arg_3 = (index + 1) | 0;
        const arg_5 = bar(pct);
        return toText(printf("%d. %s\n   %s %g/%g%s (%d%%)"))(arg_3)(g.Name)(arg_5)(g.Progress)(g.TargetValue)(unitStr)(pct);
    }
}

function milestoneText(m) {
    let matchResult;
    if (m != null) {
        switch (m) {
            case 25: {
                matchResult = 3;
                break;
            }
            case 50: {
                matchResult = 2;
                break;
            }
            case 75: {
                matchResult = 1;
                break;
            }
            case 100: {
                matchResult = 0;
                break;
            }
            default:
                matchResult = 4;
        }
    }
    else {
        matchResult = 4;
    }
    switch (matchResult) {
        case 0:
            return "🏆 GOAL COMPLETE!";
        case 1:
            return "🎉 75% — home stretch!";
        case 2:
            return "🎉 Halfway there!";
        case 3:
            return "🎉 A quarter done — momentum!";
        default:
            return undefined;
    }
}

function showList(user, ctx) {
    const mine = forUser(user.Id);
    if (mine.length === 0) {
        return ctx.reply("No goals yet. Set one: /goal add read 20 books");
    }
    else {
        const lines = join("\n", mapIndexed(describe, mine));
        return ctx.reply(("🎯 Your goals:\n\n" + lines) + "\n\nLog progress: /goal log <number> <amount>");
    }
}

function addGoal(config, user, description, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const matchValue = check(config.AdminUserId, user, "goal");
        if (matchValue.tag === 0) {
            ctx.sendChatAction("typing");
            return parse(config, description).then((_arg) => {
                const parsed = _arg;
                if (parsed.tag === 0) {
                    const p = parsed.fields[0];
                    commit(config.AdminUserId, user, "goal");
                    const goal = add(user.Id, p.Name, p.Target, p.Unit, p.Absolute);
                    info(toText(printf("%s added goal: %s (%g %s, absolute=%b)"))(user.FirstName)(goal.Name)(goal.TargetValue)(goal.Unit)(p.Absolute));
                    return breakdown(config, goal.Name, goal.TargetValue, goal.Unit).then((_arg_1) => {
                        let arg_19;
                        const stepsResult = _arg_1;
                        let stepsBlock;
                        if (stepsResult.tag === 1) {
                            warn("Goal breakdown failed: " + stepsResult.fields[0]);
                            stepsBlock = "";
                        }
                        else {
                            const steps = stepsResult.fields[0];
                            setSteps(goal, steps);
                            stepsBlock = ("\n\n🧭 Your 5-step path:\n" + join("\n", mapIndexed((i, s) => {
                                const arg_7 = (i + 1) | 0;
                                return toText(printf("%d. %s"))(arg_7)(s);
                            }, steps)));
                        }
                        const unitStr = (goal.Unit === "") ? "" : (" " + goal.Unit);
                        const index = (1 + findIndex((g) => (g.Id === goal.Id), forUser(user.Id))) | 0;
                        let logHint;
                        if (isAbsolute(goal)) {
                            const arg_9 = (goal.Unit === "") ? "point" : trimEnd(goal.Unit, "s");
                            logHint = toText(printf("Log the %s you reach: /goal log %d 3 → 3/%g%s (jumps straight there) · path: /goal plan %d"))(arg_9)(index)(goal.TargetValue)(unitStr)(index);
                        }
                        else {
                            logHint = toText(printf("Log progress with /goal log %d <amount> · path anytime: /goal plan %d"))(index)(index);
                        }
                        return ctx.reply((arg_19 = bar(0), toText(printf("🎯 Goal set: %s (%g%s)\n%s 0%%%s\n\n%s"))(goal.Name)(goal.TargetValue)(unitStr)(arg_19)(stepsBlock)(logHint)));
                    });
                }
                else {
                    const err = parsed.fields[0];
                    warn(toText(printf("Goal parse failed for %s: %s"))(user.FirstName)(err));
                    return (err.indexOf("/target") >= 0) ? (ctx.reply("For weight goals use /target 68 in 10 weeks — it computes your daily calories too.")) : (ctx.reply("🤔 I couldn\'t read that as a goal. Try: /goal add read 20 books"));
                }
            });
        }
        else {
            return ctx.reply(matchValue.fields[0]);
        }
    }));
}

function showPlan(user, arg, ctx) {
    let steps;
    let matchValue;
    let outArg = 0;
    matchValue = [tryParse(arg.trim(), 511, false, 32, new FSharpRef(() => (outArg | 0), (v) => {
        outArg = (v | 0);
    })), outArg];
    if (matchValue[0]) {
        const matchValue_1 = byIndex(user.Id, matchValue[1]);
        if (matchValue_1 != null) {
            const goal = matchValue_1;
            const matchValue_2 = goal.Steps;
            let matchResult, steps_1;
            if (matchValue_2 != null) {
                if ((steps = matchValue_2, steps.length > 0)) {
                    matchResult = 0;
                    steps_1 = matchValue_2;
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
                    const pct = percentOf(goal) | 0;
                    const lines = join("\n", mapIndexed((i, s) => {
                        const mark = (pct >= ~~(((i + 1) * 100) / steps_1.length)) ? "✅" : "⬜";
                        const arg_2 = (i + 1) | 0;
                        return toText(printf("%s %d. %s"))(mark)(arg_2)(s);
                    }, steps_1));
                    return ctx.reply(toText(printf("🧭 %s — %d%%\n\n%s"))(goal.Name)(pct)(lines));
                }
                default:
                    return ctx.reply("That goal has no step plan (it was set before plans existed). New goals get one automatically.");
            }
        }
        else {
            return ctx.reply("That number isn\'t in your list — check /goals");
        }
    }
    else {
        return ctx.reply("Usage: /goal plan <number>");
    }
}

function logProgress(config, user, args, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        let arg_8;
        let index;
        if (args.length >= 1) {
            let matchValue;
            let outArg = 0;
            matchValue = [tryParse(item(0, args), 511, false, 32, new FSharpRef(() => (outArg | 0), (v) => {
                outArg = (v | 0);
            })), outArg];
            index = (matchValue[0] ? matchValue[1] : undefined);
        }
        else {
            index = undefined;
        }
        const explicit = tryPick((tok) => {
            let matchValue_1;
            let outArg_1 = 0;
            matchValue_1 = [tryParse_1(toArray(filter((c) => {
                if (isDigit(c) ? true : (c === ".")) {
                    return true;
                }
                else {
                    return c === "-";
                }
            }, tok.split(""))).join(''), new FSharpRef(() => outArg_1, (v_1) => {
                outArg_1 = v_1;
            })), outArg_1];
            if (matchValue_1[0]) {
                return matchValue_1[1];
            }
            else {
                return undefined;
            }
        }, skip(min(1, args.length), args));
        if (index != null) {
            const matchValue_2 = byIndex(user.Id, index);
            if (matchValue_2 != null) {
                if (matchValue_2.CompletedAt != null) {
                    const goal_1 = matchValue_2;
                    return ctx.reply(toText(printf("\"%s\" is already complete ✅ — set a new one with /goal add"))(goal_1.Name));
                }
                else {
                    const goal_2 = matchValue_2;
                    const result = (explicit == null) ? (isAbsolute(goal_2) ? setProgress(goal_2, goal_2.Progress + 1) : logProgress_1(goal_2, 1)) : applyLog(goal_2, explicit);
                    const g = result.Goal;
                    const pct = percentOf(g) | 0;
                    const unitStr = (g.Unit === "") ? "" : (" " + g.Unit);
                    info(toText(printf("%s logged goal %s → %g/%g (%d%%)"))(user.FirstName)(g.Name)(g.Progress)(g.TargetValue)(pct));
                    const lines = choose((x) => x, ofArray([isAbsolute(g) ? toText(printf("📖 %s"))(g.Name) : toText(printf("🎯 %s"))(g.Name), (arg_8 = bar(pct), toText(printf("%s %g/%g%s (%d%%)"))(arg_8)(g.Progress)(g.TargetValue)(unitStr)(pct)), milestoneText(result.Milestone)]));
                    return ctx.reply(join("\n", lines)).then((_arg) => {
                        if (equals(result.Milestone, 100)) {
                            ctx.sendChatAction("typing");
                            return celebrateGoal(config, g.Name).then((_arg_1) => {
                                const celebration = _arg_1;
                                return (celebration.tag === 1) ? (Promise.resolve(undefined)) : (ctx.reply(celebration.fields[0]));
                            });
                        }
                        else {
                            return Promise.resolve(undefined);
                        }
                    });
                }
            }
            else {
                return ctx.reply("That number isn\'t in your list — check /goals");
            }
        }
        else {
            return ctx.reply("Usage: /goal log <number> <amount> — e.g. /goal log 1 2");
        }
    }));
}

function markDone(config, user, arg, ctx) {
    let matchValue;
    let outArg = 0;
    matchValue = [tryParse(arg.trim(), 511, false, 32, new FSharpRef(() => (outArg | 0), (v) => {
        outArg = (v | 0);
    })), outArg];
    if (matchValue[0]) {
        const n = matchValue[1] | 0;
        const matchValue_1 = byIndex(user.Id, n);
        if (matchValue_1 == null) {
            return ctx.reply("That number isn\'t in your list — check /goals");
        }
        else if (matchValue_1.CompletedAt == null) {
            const goal_1 = matchValue_1;
            const value = isAbsolute(goal_1) ? goal_1.TargetValue : (goal_1.TargetValue - goal_1.Progress);
            return logProgress(config, user, [int32ToString(n), value.toString()], ctx);
        }
        else {
            const goal_2 = matchValue_1;
            return ctx.reply(toText(printf("\"%s\" is already complete ✅"))(goal_2.Name));
        }
    }
    else {
        return ctx.reply("Usage: /goal done <number>");
    }
}

function deleteGoal(user, arg, ctx) {
    let matchValue;
    let outArg = 0;
    matchValue = [tryParse(arg.trim(), 511, false, 32, new FSharpRef(() => (outArg | 0), (v) => {
        outArg = (v | 0);
    })), outArg];
    if (matchValue[0]) {
        const matchValue_1 = deleteByIndex(user.Id, matchValue[1]);
        if (matchValue_1 == null) {
            return ctx.reply("That number isn\'t in your list — check /goals");
        }
        else {
            const g = matchValue_1;
            info(toText(printf("%s deleted goal: %s"))(user.FirstName)(g.Name));
            return ctx.reply("🗑 Removed goal: " + g.Name);
        }
    }
    else {
        return ctx.reply("Usage: /goal delete <number>");
    }
}

/**
 * Dispatcher: /goal [add|list|log|done|delete]
 */
export function handle(config, ctx) {
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const args = commandArgs(ctx);
        if (args.length === 0) {
            return showList(user, ctx);
        }
        else {
            const rest = join(" ", skip(1, args));
            const matchValue_1 = item(0, args).toLowerCase();
            let matchResult;
            switch (matchValue_1) {
                case "list": {
                    matchResult = 2;
                    break;
                }
                case "plan":
                case "steps": {
                    matchResult = 3;
                    break;
                }
                case "log": {
                    matchResult = 4;
                    break;
                }
                case "done": {
                    matchResult = 5;
                    break;
                }
                case "delete":
                case "remove": {
                    matchResult = 6;
                    break;
                }
                case "add": {
                    if (rest.trim() !== "") {
                        matchResult = 0;
                    }
                    else {
                        matchResult = 1;
                    }
                    break;
                }
                default:
                    matchResult = 7;
            }
            switch (matchResult) {
                case 0:
                    return addGoal(config, user, rest, ctx);
                case 1:
                    return ctx.reply("What\'s the goal? e.g. /goal add read 20 books");
                case 2:
                    return showList(user, ctx);
                case 3:
                    return showPlan(user, rest, ctx);
                case 4:
                    return logProgress(config, user, skip(1, args), ctx);
                case 5:
                    return markDone(config, user, rest, ctx);
                case 6:
                    return deleteGoal(user, rest, ctx);
                default:
                    return ctx.reply(usage);
            }
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

/**
 * /goals — quick alias for the list.
 */
export function handleListShortcut(ctx) {
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        return showList(matchValue, ctx);
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

