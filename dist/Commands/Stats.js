
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, bool_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { currentWeekIndex, streaksForHabit, forUser } from "../Services/Habits.js";
import { max, map } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { equals, comparePrimitives } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { forUser as forUser_1 } from "../Services/Workouts.js";
import { getAll } from "../Services/Meals.js";
import { forUser as forUser_2 } from "../Services/SleepLogs.js";
import { forUser as forUser_3 } from "../Services/Goals.js";
import { join, printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { ensureUser } from "./Common.js";
import { gamificationOn } from "../Services/Users.js";
import { levelFor, xpFor } from "../Services/Gamification.js";
import { append, ofArrayWithTail, empty, cons, ofArray, map as map_1, singleton } from "../fable_modules/fable-library-js.5.7.0/List.js";

class Badge extends Record {
    constructor(Label, Earned, Hint) {
        super();
        this.Label = Label;
        this.Earned = Earned;
        this.Hint = Hint;
    }
}

function Badge_$reflection() {
    return record_type("Commands.Stats.Badge", [], Badge, () => [["Label", string_type], ["Earned", bool_type], ["Hint", string_type]]);
}

function badgesFor(userId) {
    const habits = forUser(userId);
    let maxStreak;
    const streaks = map((h) => (streaksForHabit(h).Current | 0), habits, Int32Array);
    maxStreak = ((streaks.length === 0) ? 0 : max(streaks, {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    }));
    const allHabitsDone = (habits.length > 0) && habits.every((h_1) => streaksForHabit(h_1).DoneThisPeriod);
    let workouts;
    const array_2 = forUser_1(userId);
    workouts = array_2.length;
    let meals;
    let array_4;
    const array_3 = getAll();
    array_4 = array_3.filter((m) => (m.UserId === userId));
    meals = array_4.length;
    let nights;
    const array_5 = forUser_2(userId);
    nights = array_5.length;
    let goalsDone;
    let array_7;
    const array_6 = forUser_3(userId);
    array_7 = array_6.filter((g) => (g.Progress >= g.TargetValue));
    goalsDone = array_7.length;
    return [new Badge("🔥 Week Warrior — 7-period habit streak", maxStreak >= 7, toText(printf("best streak %d/7"))(maxStreak)), new Badge("⭐ Perfect Period — every habit done", allHabitsDone, "tick all habits this period"), new Badge("💪 Iron Start — 10 workouts logged", workouts >= 10, toText(printf("%d/10 workouts"))(workouts)), new Badge("🍽 Well Fed — 20 meals logged", meals >= 20, toText(printf("%d/20 meals"))(meals)), new Badge("🌙 Well Rested — 7 nights logged", nights >= 7, toText(printf("%d/7 nights"))(nights)), new Badge("🎯 Finisher — complete a goal", goalsDone >= 1, "reach 100% on any goal")];
}

export function handle(ctx) {
    let arg_6;
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        if (!gamificationOn(matchValue)) {
            const user_1 = matchValue;
            return ctx.reply("🎮 Gamification is off, so there\'s no XP, level or badges to show.\n\nEverything else still tracks normally. Turn it back on anytime: /settings gamification on");
        }
        else {
            const user_2 = matchValue;
            const xp = xpFor(user_2.Id) | 0;
            const lvl = levelFor(xp);
            let progress;
            const matchValue_1 = lvl.Next;
            if (matchValue_1 == null) {
                progress = "Top level reached — legend. 🏆";
            }
            else {
                const arg = (xp - lvl.Floor) | 0;
                const arg_1 = (matchValue_1 - lvl.Floor) | 0;
                const arg_2 = (lvl.Index + 2) | 0;
                progress = toText(printf("%d / %d XP to level %d"))(arg)(arg_1)(arg_2);
            }
            const badges = badgesFor(user_2.Id);
            const earned = badges.filter((b) => b.Earned);
            const locked = badges.filter((b_1) => !b_1.Earned);
            const earnedBlock = (earned.length === 0) ? singleton("No badges yet — they unlock as you build momentum.") : cons("🏅 Earned:", map_1((b_2) => ("  " + b_2.Label), ofArray(earned)));
            const lockedBlock = (locked.length === 0) ? empty() : ofArrayWithTail(["", "🔒 Next up:"], map_1((b_3) => toText(printf("  %s (%s)"))(b_3.Label)(b_3.Hint), ofArray(locked)));
            const freezeLine = !equals(user_2.FreezeWeek, currentWeekIndex()) ? "🧊 Streak freeze: ready (auto-protects one missed period this week)" : "🧊 Streak freeze: used this week — refreshes Monday";
            const text = join("\n", append(ofArray([toText(printf("🎮 %s\'s progress"))(user_2.FirstName), "", (arg_6 = ((lvl.Index + 1) | 0), toText(printf("Level %d — %s"))(arg_6)(lvl.Name)), toText(printf("XP: %d"))(xp), progress, freezeLine, ""]), append(earnedBlock, lockedBlock)));
            return ctx.reply(text);
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

