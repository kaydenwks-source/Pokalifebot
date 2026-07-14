
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { Schedule_tryParseToken, Priority_tryParse, timeLabel, Priority_marker } from "../Models/Task.js";
import { deleteByIndex, doneTodayCount, completeByIndex, add, openFor } from "../Services/Tasks.js";
import { tryHead, sumBy, map as map_1, item, skip, tryFind, tryPick, mapIndexed } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { bind, map, defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { info } from "../Utils/Logger.js";
import { tryParse } from "../fable_modules/fable-library-js.5.7.0/Int32.js";
import { FSharpRef } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { aiUnavailable, commandArgs, ensureUser } from "./Common.js";
import { streaksForHabit, forUser } from "../Services/Habits.js";
import { toString, now as now_1 } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { forUser as forUser_1 } from "../Services/Reminders.js";
import { forUser as forUser_2, todayLog } from "../Services/SleepLogs.js";
import { dayName, formatDuration } from "../Utils/Time.js";
import { onDate } from "../Services/Workouts.js";
import { forToday } from "../Services/Commitments.js";
import { describe as describe_1, summary } from "../Services/Energy.js";
import { ofArray, choose } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { commit, check } from "../Services/Entitlements.js";
import { plan } from "../Ai/Planner.js";

const usage = join("\n", ["📝 Tasks & planning", "", "/task add <text> [!high|!low] [@HH:MM or @HH:MM-HH:MM] — add a task", "   e.g. /task add dentist @14:00-15:30 · /task add essay !high", "   Timed tasks are fixed — /plan schedules everything else around them.", "/task done <number> — complete one", "/task delete <number> — remove one", "/tasks — your open tasks", "/today — your day at a glance", "/plan — AI schedule for the rest of the day"]);

function describe(t) {
    const arg = Priority_marker(t.Priority);
    const arg_2 = timeLabel(t);
    return toText(printf("%s %s%s"))(arg)(t.Text)(arg_2);
}

function showTasks(user, ctx) {
    const mine = openFor(user.Id);
    if (mine.length === 0) {
        return ctx.reply("No open tasks. Add one: /task add finish essay !high");
    }
    else {
        const lines = join("\n", mapIndexed((i, t) => {
            const arg = (i + 1) | 0;
            const arg_1 = describe(t);
            return toText(printf("%d. %s"))(arg)(arg_1);
        }, mine));
        return ctx.reply(("📝 Open tasks:\n\n" + lines) + "\n\n/task done <n> · /task delete <n> · /plan for a schedule");
    }
}

function addTask(user, rest, ctx) {
    let arg_4, arg_5;
    if (rest.length === 0) {
        return ctx.reply("Usage: /task add <text> [!high|!low] [@HH:MM-HH:MM]\nExamples: /task add finish essay !high · /task add dentist @14:00-15:30");
    }
    else {
        const priority = defaultArg(tryPick((t_2) => {
            if (t_2.startsWith("!")) {
                return Priority_tryParse(t_2);
            }
            else {
                return undefined;
            }
        }, rest), "medium");
        const schedule = tryPick(Schedule_tryParseToken, rest);
        const textParts = rest.filter((t_3) => {
            let t;
            return !(((t = t_3, t.startsWith("!") && (Priority_tryParse(t) != null))) ? true : (Schedule_tryParseToken(t_3) != null));
        });
        const text = join(" ", textParts);
        const badTimeHint = defaultArg(map((t_5) => toText(printf("\nℹ️ \"%s\" isn\'t a valid time (use @HH:MM or @HH:MM-HH:MM), so I kept it as text."))(t_5), tryFind((t_4) => t_4.startsWith("@"), textParts)), "");
        if (text === "") {
            return ctx.reply("The task needs a description too, e.g. /task add dentist @14:00");
        }
        else {
            const task = add(user.Id, text, priority, map((tuple) => tuple[0], schedule), bind((tuple_1) => tuple_1[1], schedule));
            info((arg_4 = timeLabel(task), toText(printf("%s added task: %s (%s)%s"))(user.FirstName)(task.Text)(task.Priority)(arg_4)));
            return ctx.reply((arg_5 = describe(task), toText(printf("✅ Added %s%s\nSee the list: /tasks"))(arg_5)(badTimeHint)));
        }
    }
}

function completeTask(user, arg, ctx) {
    let arg_5;
    let matchValue;
    let outArg = 0;
    matchValue = [tryParse(arg.trim(), 511, false, 32, new FSharpRef(() => (outArg | 0), (v) => {
        outArg = (v | 0);
    })), outArg];
    if (matchValue[0]) {
        const matchValue_1 = completeByIndex(user.Id, matchValue[1]);
        if (matchValue_1 == null) {
            return ctx.reply("That number isn\'t in your open list — check /tasks");
        }
        else {
            const t = matchValue_1;
            info(toText(printf("%s completed task: %s"))(user.FirstName)(t.Text));
            const count = doneTodayCount(user.Id) | 0;
            return ctx.reply((arg_5 = ((count === 1) ? "" : "s"), toText(printf("🎉 Done: %s\nThat\'s %d task%s completed today."))(t.Text)(count)(arg_5)));
        }
    }
    else {
        return ctx.reply("Use the number from /tasks, e.g. /task done 2");
    }
}

function deleteTask(user, arg, ctx) {
    let matchValue;
    let outArg = 0;
    matchValue = [tryParse(arg.trim(), 511, false, 32, new FSharpRef(() => (outArg | 0), (v) => {
        outArg = (v | 0);
    })), outArg];
    if (matchValue[0]) {
        const matchValue_1 = deleteByIndex(user.Id, matchValue[1]);
        if (matchValue_1 == null) {
            return ctx.reply("That number isn\'t in your open list — check /tasks");
        }
        else {
            const t = matchValue_1;
            info(toText(printf("%s deleted task: %s"))(user.FirstName)(t.Text));
            return ctx.reply("🗑 Removed: " + t.Text);
        }
    }
    else {
        return ctx.reply("Use the number from /tasks, e.g. /task delete 2");
    }
}

/**
 * Dispatcher: /task [add|done|delete|list] ...
 */
export function handleTask(ctx) {
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const args = commandArgs(ctx);
        if (args.length === 0) {
            return showTasks(user, ctx);
        }
        else {
            const rest = join(" ", skip(1, args));
            const matchValue_1 = item(0, args).toLowerCase();
            switch (matchValue_1) {
                case "add":
                    return addTask(user, skip(1, args), ctx);
                case "done":
                    return completeTask(user, rest, ctx);
                case "delete":
                case "remove":
                    return deleteTask(user, rest, ctx);
                case "list":
                    return showTasks(user, ctx);
                default:
                    return ctx.reply(usage);
            }
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

export function handleTasks(ctx) {
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        return showTasks(matchValue, ctx);
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

function pendingHabits(userId) {
    const array = forUser(userId);
    return array.filter((h) => !streaksForHabit(h).DoneThisPeriod);
}

/**
 * /today — cross-feature dashboard: habits, tasks, reminders, sleep.
 */
export function handleToday(ctx) {
    let arg_14, arg_15;
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const now = now_1();
        const todayStr = toString(now, "yyyy-MM-dd");
        const habits = forUser(user.Id);
        const pending = pendingHabits(user.Id);
        let habitsLine;
        if (habits.length === 0) {
            habitsLine = "🔥 Habits: none tracked yet (/habit add gym)";
        }
        else if (pending.length === 0) {
            habitsLine = "🔥 Habits: all done ✅";
        }
        else {
            const arg = join(", ", map_1((h) => h.Name, pending));
            habitsLine = toText(printf("🔥 Habits pending: %s"))(arg);
        }
        const tasks = openFor(user.Id);
        let tasksLine;
        if (tasks.length === 0) {
            tasksLine = "📝 Tasks: none open";
        }
        else {
            const arg_1 = tasks.length | 0;
            const arg_2 = describe(item(0, tasks));
            tasksLine = toText(printf("📝 Open tasks: %d (top: %s)"))(arg_1)(arg_2);
        }
        let reminders;
        const array_1 = forUser_1(user.Id);
        reminders = array_1.filter((r) => (r.DueDate === todayStr));
        let remindersLine;
        if (reminders.length === 0) {
            remindersLine = "⏰ Reminders today: none";
        }
        else {
            const arg_5 = join(" · ", map_1((r_1) => toText(printf("%s %s"))(r_1.DueTime)(r_1.Text), reminders));
            remindersLine = toText(printf("⏰ Reminders today: %s"))(arg_5);
        }
        let sleepLine;
        const matchValue_1 = todayLog(user.Id);
        if (matchValue_1 == null) {
            sleepLine = "😴 Sleep: not logged (/sleep 23:30 07:00)";
        }
        else {
            const arg_6 = formatDuration(matchValue_1.DurationMinutes);
            sleepLine = toText(printf("😴 Sleep: %s logged"))(arg_6);
        }
        const workouts = onDate(user.Id, todayStr);
        let workoutLine;
        if (workouts.length === 0) {
            workoutLine = "🏋️ Workouts: none yet";
        }
        else {
            const arg_7 = join(", ", map_1((w) => w.Exercise, workouts));
            const arg_8 = sumBy((w_1) => (w_1.CaloriesBurned | 0), workouts, {
                GetZero: () => 0,
                Add: (x, y) => ((x + y) | 0),
            }) | 0;
            workoutLine = toText(printf("🏋️ Workouts: %s (~%d kcal)"))(arg_7)(arg_8);
        }
        let busyLine;
        const blocks = forToday(user.Id);
        busyLine = ((blocks.length === 0) ? undefined : ((arg_14 = join(" · ", map_1((c) => {
            const matchValue_2 = c.Until;
            if (matchValue_2 == null) {
                return toText(printf("%s %s"))(c.At)(c.Name);
            }
            else {
                const u = matchValue_2;
                return toText(printf("%s–%s %s"))(c.At)(u)(c.Name);
            }
        }, blocks)), toText(printf("📌 Busy: %s"))(arg_14))));
        let energyLine;
        const e = summary(user, todayStr);
        energyLine = ((((e.Target != null) ? true : (e.Eaten > 0)) ? true : (e.Burned > 0)) ? ("🔋 " + describe_1(e)) : undefined);
        const text = join("\n", choose((x_1) => x_1, ofArray([(arg_15 = dayName(now), toText(printf("📅 Today — %s %s"))(arg_15)(todayStr)), "", busyLine, habitsLine, tasksLine, remindersLine, sleepLine, workoutLine, energyLine, "", "Want a schedule? /plan"])));
        return ctx.reply(text);
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

/**
 * /plan — AI-built time blocks from now until bedtime.
 */
export function handlePlan(config, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        let arg_1, arg_2;
        const matchValue = ensureUser(ctx);
        if (matchValue != null) {
            const user = matchValue;
            const tasks = openFor(user.Id);
            const pending = pendingHabits(user.Id);
            const busyToday = forToday(user.Id);
            if (((tasks.length === 0) && (pending.length === 0)) && (busyToday.length === 0)) {
                return ctx.reply("Nothing to plan — everything\'s done! Add a task (/task add finish essay !high) if something\'s on your mind.");
            }
            else {
                const matchValue_1 = check(config.AdminUserId, user, "plan");
                if (matchValue_1.tag === 0) {
                    info((arg_1 = (tasks.length | 0), (arg_2 = (pending.length | 0), toText(printf("/plan for %s (%d tasks, %d pending habits)"))(user.FirstName)(arg_1)(arg_2))));
                    ctx.sendChatAction("typing");
                    const bedtime = defaultArg(map((l) => l.BedTime, tryHead(forUser_2(user.Id))), "23:30");
                    return plan(config, user, tasks, pending, busyToday, bedtime).then((_arg) => {
                        const result = _arg;
                        if (result.tag === 1) {
                            return ctx.reply(aiUnavailable);
                        }
                        else {
                            commit(config.AdminUserId, user, "plan");
                            return ctx.reply("📅 Your plan for the rest of today:\n\n" + result.fields[0].trim());
                        }
                    });
                }
                else {
                    return ctx.reply(matchValue_1.fields[0]);
                }
            }
        }
        else {
            return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
        }
    }));
}

