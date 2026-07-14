
import { date as date_1, op_Subtraction, parse, now, addDays, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { statsFor, forUser } from "./SleepLogs.js";
import { recentDailyTotals } from "./Meals.js";
import { forUser as forUser_1 } from "./Workouts.js";
import { streaksForHabit, forUser as forUser_2 } from "./Habits.js";
import { openFor, completedSince } from "./Tasks.js";
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { formatDuration } from "../Utils/Time.js";
import { op_UnaryNegation_Int32 } from "../fable_modules/fable-library-js.5.7.0/Int32.js";
import { collect, averageBy, truncate, choose, sum, sumBy, map } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { map as map_1, defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { Array_distinct } from "../fable_modules/fable-library-js.5.7.0/Seq2.js";
import { comparePrimitives, round, stringHash } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { weightDelta } from "./WeightLogs.js";
import { percentOf, forUser as forUser_3 } from "./Goals.js";
import { forUser as forUser_4 } from "./Focus.js";
import { forUser as forUser_5, recentMoods } from "./Reflections.js";
import { totalDays } from "../fable_modules/fable-library-js.5.7.0/TimeSpan.js";
import { max, min } from "../fable_modules/fable-library-js.5.7.0/Double.js";
import { ofArray, sort, tryHead, choose as choose_1, map as map_2 } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { map as map_3, empty, singleton, append, delay, toList } from "../fable_modules/fable-library-js.5.7.0/Seq.js";
import { rangeDouble } from "../fable_modules/fable-library-js.5.7.0/Range.js";

function cutoffDaysAgo(days) {
    return toString(addDays(now(), -days), "yyyy-MM-dd");
}

/**
 * Whether there's anything worth reporting on (skip silent users).
 */
export function hasActivity(days, user) {
    let array, array_1, array_2, array_4;
    const cutoff = cutoffDaysAgo(days);
    if (((((array = forUser(user.Id), array.some((l) => (l.Date > cutoff)))) ? true : !((array_1 = recentDailyTotals(user.Id, ~~days), array_1.length === 0))) ? true : ((array_2 = forUser_1(user.Id), array_2.some((w) => (w.Date > cutoff))))) ? true : ((array_4 = forUser_2(user.Id), array_4.some((h) => h.Completions.some((c) => (c > cutoff)))))) {
        return true;
    }
    else {
        return completedSince(user.Id, cutoff) > 0;
    }
}

export function hasRecentActivity(user) {
    let array, array_1, array_2, array_4;
    const cutoff = cutoffDaysAgo(7);
    if (((((array = forUser(user.Id), array.some((l) => (l.Date > cutoff)))) ? true : !((array_1 = recentDailyTotals(user.Id, 7), array_1.length === 0))) ? true : ((array_2 = forUser_1(user.Id), array_2.some((w) => (w.Date > cutoff))))) ? true : ((array_4 = forUser_2(user.Id), array_4.some((h) => h.Completions.some((c) => (c > cutoff)))))) {
        return true;
    }
    else {
        return completedSince(user.Id, cutoff) > 0;
    }
}

export function weeklyData(user) {
    let matchValue, s_1, arg_1, arg_2, arg_3, arg_4, habits, days, avgEaten, targetPart, arg_10, recent, array_4, km, kcal, arg_13, arg_14, arg_16, matchValue_1, matchValue_2, current_1, delta, current, arg_21, arg_22, array_10, active, array_11, sessions, array_13, arg_25, arg_26, moods, arg_27, arg_28, notes, array_15, arg_29, arg_30;
    const cutoff = cutoffDaysAgo(7);
    return join("\n", [(matchValue = statsFor(user.Id), (matchValue != null) ? ((matchValue.Count7 > 0) ? ((s_1 = matchValue, (arg_1 = formatDuration(s_1.Avg7), (arg_2 = ((s_1.Debt7 > 0) ? ((arg_3 = formatDuration(s_1.Debt7), toText(printf("%s short"))(arg_3))) : ((arg_4 = formatDuration(op_UnaryNegation_Int32(s_1.Debt7)), toText(printf("%s surplus"))(arg_4)))), toText(printf("Sleep: %d nights logged, average %s, %s vs 8h target"))(s_1.Count7)(arg_1)(arg_2))))) : "Sleep: not logged this week") : "Sleep: not logged this week"), (habits = forUser_2(user.Id), (habits.length === 0) ? "Habits: none tracked" : join("\n", map((h) => {
        const s_2 = streaksForHabit(h);
        let thisWeek;
        const array_1 = h.Completions.filter((c) => (c > cutoff));
        thisWeek = array_1.length;
        return toText(printf("Habit %s (%s): %d check-ins this week, current streak %d"))(h.Name)(h.Cadence)(thisWeek)(s_2.Current);
    }, habits))), (days = recentDailyTotals(user.Id, 7), (days.length === 0) ? "Food: nothing logged this week" : ((avgEaten = (~~(sumBy((d) => (d.Calories | 0), days, {
        GetZero: () => 0,
        Add: (x, y) => ((x + y) | 0),
    }) / days.length) | 0), (targetPart = defaultArg(map_1((t) => {
        const arg_9 = ~~t | 0;
        return toText(printf(", daily target %d kcal"))(arg_9);
    }, user.DailyKcalTarget), ""), (arg_10 = (days.length | 0), toText(printf("Food: %d days logged, average %d kcal eaten per logged day%s"))(arg_10)(avgEaten)(targetPart)))))), (recent = ((array_4 = forUser_1(user.Id), array_4.filter((w) => (w.Date > cutoff)))), (recent.length === 0) ? "Workouts: none this week" : ((km = sum(choose((w_1) => w_1.DistanceKm, recent, Float64Array), {
        GetZero: () => 0,
        Add: (x_1, y_1) => (x_1 + y_1),
    }), (kcal = (sumBy((w_2) => (w_2.CaloriesBurned | 0), recent, {
        GetZero: () => 0,
        Add: (x_2, y_2) => ((x_2 + y_2) | 0),
    }) | 0), (arg_13 = (recent.length | 0), (arg_14 = join(", ", Array_distinct(map((w_3) => w_3.Exercise, recent), {
        Equals: (x_3, y_3) => (x_3 === y_3),
        GetHashCode: (x_3) => (stringHash(x_3) | 0),
    })), (arg_16 = ((km > 0) ? toText(printf(", %.1f km covered"))(km) : ""), toText(printf("Workouts: %d sessions (%s), ~%d kcal burned%s"))(arg_13)(arg_14)(kcal)(arg_16)))))))), (matchValue_1 = weightDelta(user.Id, 7), (matchValue_1 == null) ? ((matchValue_2 = weightDelta(user.Id, 0), (matchValue_2 == null) ? "Weight: not logged" : ((current_1 = matchValue_2[0], toText(printf("Weight: %.1f kg (no earlier reading to compare)"))(current_1))))) : ((delta = matchValue_1[1], (current = matchValue_1[0], toText(printf("Weight: %.1f kg (%+.1f kg over the week)"))(current)(delta))))), (arg_21 = (completedSince(user.Id, cutoff) | 0), (arg_22 = (((array_10 = openFor(user.Id), array_10.length)) | 0), toText(printf("Tasks: %d completed this week, %d still open"))(arg_21)(arg_22))), (active = ((array_11 = forUser_3(user.Id), array_11.filter((g) => (g.CompletedAt == null)))), (active.length === 0) ? "Goals: none active" : join("\n", map((g_1) => {
        const arg_24 = percentOf(g_1) | 0;
        return toText(printf("Goal %s: %d%% complete"))(g_1.Name)(arg_24);
    }, active))), (sessions = ((array_13 = forUser_4(user.Id), array_13.filter((s_3) => {
        if (s_3.Date > cutoff) {
            return s_3.Completed;
        }
        else {
            return false;
        }
    }))), (sessions.length === 0) ? "Focus: no focus sessions this week" : ((arg_25 = (sessions.length | 0), (arg_26 = (sumBy((s_4) => (s_4.Minutes | 0), sessions, {
        GetZero: () => 0,
        Add: (x_4, y_4) => ((x_4 + y_4) | 0),
    }) | 0), toText(printf("Focus: %d sessions, %d min focused this week"))(arg_25)(arg_26))))), (moods = recentMoods(user.Id, 7), (moods.length === 0) ? "Mood: not logged this week" : ((arg_27 = (moods.length | 0), (arg_28 = (sum(moods, {
        GetZero: () => 0,
        Add: (x_5, y_5) => ((x_5 + y_5) | 0),
    }) / moods.length), toText(printf("Mood: %d check-ins, average %.1f/5"))(arg_27)(arg_28))))), (notes = choose((r_1) => r_1.Text, (array_15 = forUser_5(user.Id), array_15.filter((r) => (r.Date > cutoff)))), (notes.length === 0) ? "Journal: no entries this week" : ((arg_29 = (notes.length | 0), (arg_30 = join(" | ", truncate(3, notes)), toText(printf("Journal: %d entries. Recent notes: %s"))(arg_29)(arg_30)))))]);
}

function weekBucket(date) {
    const d = parse(date);
    return ~~(totalDays(op_Subtraction(date_1(now()), date_1(d))) / 7) | 0;
}

/**
 * Deterministic 0–100 behaviour score — computed from data, never by
 * the AI, so it's consistent month to month. Weights: habits 30%,
 * sleep 20%, tasks 20%, workouts 15%, food logging 15%.
 */
export function productivityScore(user) {
    let array_3, array_5, array_4, logs, array_6;
    const cutoff = cutoffDaysAgo(30);
    let habitPct;
    const habits = forUser_2(user.Id);
    habitPct = ((habits.length === 0) ? 0.5 : averageBy((h) => {
        let array_1;
        let expected;
        const matchValue = h.Cadence;
        expected = ((matchValue === "weekly") ? 4 : ((matchValue === "monthly") ? 1 : 30));
        return min(1, ((array_1 = h.Completions.filter((c) => (c > cutoff)), array_1.length)) / expected);
    }, habits, {
        GetZero: () => 0,
        Add: (x_1, y) => (x_1 + y),
        DivideByInt: (x, i) => (x / i),
    }));
    let taskPct;
    const completed = completedSince(user.Id, cutoff);
    let stillOpen;
    stillOpen = ((array_3 = openFor(user.Id), array_3.length));
    taskPct = (((completed + stillOpen) === 0) ? 0.5 : (completed / (completed + stillOpen)));
    const workoutPct = min(1, ((array_5 = ((array_4 = forUser_1(user.Id), array_4.filter((w) => (w.Date > cutoff)))), array_5.length)) / 12);
    return ~~round((((((habitPct * 0.3) + (((logs = ((array_6 = forUser(user.Id), array_6.filter((l) => (l.Date > cutoff)))), (logs.length === 0) ? 0.3 : ((min(1, logs.length / 20) + min(1, (sumBy((l_1) => (l_1.DurationMinutes | 0), logs, {
        GetZero: () => 0,
        Add: (x_2, y_1) => ((x_2 + y_1) | 0),
    }) / logs.length) / 480)) / 2))) * 0.2)) + (taskPct * 0.2)) + (workoutPct * 0.15)) + (min(1, recentDailyTotals(user.Id, 30).length / 20) * 0.15)) * 100) | 0;
}

export function monthlyData(user) {
    let arg_2, arg_8, habits, recent, array_10, km, arg_15, arg_16, arg_17, arg_18, matchValue_1, matchValue_2, current_1, delta, current, arg_23, arg_24, array_14, goals, completed, active, sessions, array_18, arg_28, arg_29, moods, arg_30, arg_31, arg_32, earliest, first, daysTracking, arg_33, arg_34;
    const cutoff = cutoffDaysAgo(30);
    let sleepLogs;
    const array = forUser(user.Id);
    sleepLogs = array.filter((l) => (l.Date > cutoff));
    let sleepLine;
    if (sleepLogs.length === 0) {
        sleepLine = "Sleep: not logged this month";
    }
    else {
        const avg = ~~(sumBy((l_1) => (l_1.DurationMinutes | 0), sleepLogs, {
            GetZero: () => 0,
            Add: (x, y) => ((x + y) | 0),
        }) / sleepLogs.length) | 0;
        const arg = sleepLogs.length | 0;
        const arg_1 = formatDuration(avg);
        sleepLine = toText(printf("Sleep: %d of 30 nights logged, average %s"))(arg)(arg_1);
    }
    const sleepTrend = (sleepLogs.length < 4) ? undefined : ((arg_2 = join(" · ", map_2((w) => {
        const ls = sleepLogs.filter((l_2) => (weekBucket(l_2.Date) === w));
        if (ls.length === 0) {
            return "—";
        }
        else {
            return formatDuration(~~(sumBy((l_3) => (l_3.DurationMinutes | 0), ls, {
                GetZero: () => 0,
                Add: (x_1, y_1) => ((x_1 + y_1) | 0),
            }) / ls.length));
        }
    }, toList(rangeDouble(0, 1, 3)))), toText(printf("Sleep avg by week (most recent first): %s"))(arg_2)));
    const days = recentDailyTotals(user.Id, 30);
    let foodLine;
    if (days.length === 0) {
        foodLine = "Food: nothing logged this month";
    }
    else {
        const avgEaten = ~~(sumBy((d) => (d.Calories | 0), days, {
            GetZero: () => 0,
            Add: (x_2, y_2) => ((x_2 + y_2) | 0),
        }) / days.length) | 0;
        const targetPart = defaultArg(map_1((t) => {
            const arg_3 = ~~t | 0;
            return toText(printf(", daily target %d kcal"))(arg_3);
        }, user.DailyKcalTarget), "");
        const arg_4 = days.length | 0;
        foodLine = toText(printf("Food: %d of 30 days logged, average %d kcal per logged day%s"))(arg_4)(avgEaten)(targetPart);
    }
    const kcalTrend = (days.length < 4) ? undefined : ((arg_8 = join(" · ", map_2((w_1) => {
        const ds = days.filter((d_1) => (weekBucket(d_1.Date) === w_1));
        if (ds.length === 0) {
            return "—";
        }
        else {
            const arg_7 = ~~(sumBy((d_2) => (d_2.Calories | 0), ds, {
                GetZero: () => 0,
                Add: (x_3, y_3) => ((x_3 + y_3) | 0),
            }) / ds.length) | 0;
            return toText(printf("%d kcal"))(arg_7);
        }
    }, toList(rangeDouble(0, 1, 3)))), toText(printf("Calorie avg by week (most recent first): %s"))(arg_8)));
    return join("\n", choose_1((x_9) => x_9, ofArray([sleepLine, sleepTrend, (habits = forUser_2(user.Id), (habits.length === 0) ? "Habits: none tracked" : join("\n", map((h) => {
        const s = streaksForHabit(h);
        let expected;
        const matchValue = h.Cadence;
        expected = ((matchValue === "weekly") ? 4 : ((matchValue === "monthly") ? 1 : 30));
        let actual;
        const array_8 = h.Completions.filter((c) => (c > cutoff));
        actual = array_8.length;
        const arg_13 = ~~((actual * 100) / expected) | 0;
        return toText(printf("Habit %s (%s): %d of ~%d expected check-ins (%d%%), longest streak %d"))(h.Name)(h.Cadence)(actual)(expected)(arg_13)(s.Longest);
    }, habits))), foodLine, kcalTrend, (recent = ((array_10 = forUser_1(user.Id), array_10.filter((w_2) => (w_2.Date > cutoff)))), (recent.length === 0) ? "Workouts: none this month" : ((km = sum(choose((w_3) => w_3.DistanceKm, recent, Float64Array), {
        GetZero: () => 0,
        Add: (x_4, y_4) => (x_4 + y_4),
    }), (arg_15 = (recent.length | 0), (arg_16 = (recent.length / 4.3), (arg_17 = (sumBy((w_4) => (w_4.CaloriesBurned | 0), recent, {
        GetZero: () => 0,
        Add: (x_5, y_5) => ((x_5 + y_5) | 0),
    }) | 0), (arg_18 = ((km > 0) ? toText(printf(", %.1f km covered"))(km) : ""), toText(printf("Workouts: %d sessions in 30 days (~%.1f per week), ~%d kcal burned%s"))(arg_15)(arg_16)(arg_17)(arg_18)))))))), (matchValue_1 = weightDelta(user.Id, 30), (matchValue_1 == null) ? ((matchValue_2 = weightDelta(user.Id, 0), (matchValue_2 == null) ? "Weight: not logged" : ((current_1 = matchValue_2[0], toText(printf("Weight: %.1f kg (not enough history for a monthly trend)"))(current_1))))) : ((delta = matchValue_1[1], (current = matchValue_1[0], toText(printf("Weight: %.1f kg (%+.1f kg over the month)"))(current)(delta))))), (arg_23 = (completedSince(user.Id, cutoff) | 0), (arg_24 = (((array_14 = openFor(user.Id), array_14.length)) | 0), toText(printf("Tasks: %d completed in 30 days, %d still open"))(arg_23)(arg_24))), (goals = forUser_3(user.Id), (goals.length === 0) ? "Goals: none set" : ((completed = goals.filter((g) => {
        const matchValue_3 = g.CompletedAt;
        if (matchValue_3 == null) {
            return false;
        }
        else {
            return matchValue_3 > cutoff;
        }
    }), (active = goals.filter((g_1) => (g_1.CompletedAt == null)), join("\n", toList(delay(() => {
        let arg_25;
        return append((completed.length > 0) ? singleton((arg_25 = join(", ", map((g_2) => g_2.Name, completed)), toText(printf("Goals completed this month: %s"))(arg_25))) : empty(), delay(() => map_3((g_3) => {
            const arg_27 = percentOf(g_3) | 0;
            return toText(printf("Goal %s: %d%% complete"))(g_3.Name)(arg_27);
        }, active)));
    }))))))), (sessions = ((array_18 = forUser_4(user.Id), array_18.filter((s_1) => {
        if (s_1.Date > cutoff) {
            return s_1.Completed;
        }
        else {
            return false;
        }
    }))), (sessions.length === 0) ? undefined : ((arg_28 = (sessions.length | 0), (arg_29 = (sumBy((s_2) => (s_2.Minutes | 0), sessions, {
        GetZero: () => 0,
        Add: (x_6, y_6) => ((x_6 + y_6) | 0),
    }) | 0), toText(printf("Focus: %d sessions in 30 days, %d min focused total"))(arg_28)(arg_29))))), (moods = recentMoods(user.Id, 30), (moods.length === 0) ? undefined : ((arg_30 = (moods.length | 0), (arg_31 = (sum(moods, {
        GetZero: () => 0,
        Add: (x_7, y_7) => ((x_7 + y_7) | 0),
    }) / moods.length), toText(printf("Mood: %d check-ins, average %.1f/5 this month"))(arg_30)(arg_31))))), (arg_32 = (productivityScore(user) | 0), toText(printf("Productivity score (deterministic 0-100 from behaviour data): %d"))(arg_32)), (earliest = tryHead(sort(toList(delay(() => append(map((l_4) => l_4.Date, sleepLogs), delay(() => append(map((d_4) => d_4.Date, days), delay(() => append(map((w_5) => w_5.Date, forUser_1(user.Id)), delay(() => append(collect((h_1) => h_1.Completions, forUser_2(user.Id)), delay(() => map((g_4) => g_4.CreatedAt, forUser_3(user.Id)))))))))))), {
        Compare: (x_8, y_8) => (comparePrimitives(x_8, y_8) | 0),
    })), (earliest == null) ? undefined : ((first = earliest, (daysTracking = (~~totalDays(op_Subtraction(date_1(now()), date_1(parse(first)))) | 0), (daysTracking < 25) ? ((arg_33 = (max(1, daysTracking) | 0), (arg_34 = (max(1, daysTracking) | 0), toText(printf("IMPORTANT: the user only started tracking %d day(s) ago — judge consistency against %d days, celebrate that they started, and do NOT treat the empty earlier weeks as slipping."))(arg_33)(arg_34)))) : undefined))))])));
}

