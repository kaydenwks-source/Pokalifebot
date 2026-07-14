
import { ofArray, contains } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { numberHash } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { chat } from "./DeepSeek.js";
import { Cadence_streakUnit } from "../Models/Habit.js";

/**
 * Streaks worth celebrating with a personalised AI message.
 * (66 days is the average habit-formation time — a fun one to hit.)
 */
export function milestone(streak) {
    return contains(streak, ofArray([3, 7, 14, 21, 30, 50, 66, 100]), {
        Equals: (x, y) => (x === y),
        GetHashCode: (x) => (numberHash(x) | 0),
    });
}

const systemPrompt = join(" ", ["You are Momentum AI, an encouraging productivity coach inside a Telegram bot.", "A user just hit a habit streak milestone. Write ONE short congratulation.", "Max 2 sentences. Energetic and specific to the habit and streak length.", "No hashtags, at most one emoji, never cheesy corporate speak."]);

export function generate(config, habitName, cadence, streak) {
    let arg_2;
    return chat(config, systemPrompt, (arg_2 = Cadence_streakUnit(cadence, streak), toText(printf("Habit: %s. Streak: %d %s in a row."))(habitName)(streak)(arg_2)));
}

const goalPrompt = join(" ", ["You are Momentum AI, an encouraging productivity coach inside a Telegram bot.", "The user just COMPLETED a personal goal they set for themselves.", "Write ONE genuinely celebratory message. Max 2 sentences,", "specific to the goal, at most one emoji, never corporate-cheesy."]);

/**
 * Fired once when a goal hits 100%.
 */
export function celebrateGoal(config, goalName) {
    return chat(config, goalPrompt, "Goal completed: " + goalName);
}

