
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { map, partition } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { append, delay, toList } from "../fable_modules/fable-library-js.5.7.0/Seq.js";
import { isEmpty } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { chat } from "./DeepSeek.js";
import { now, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { dayName } from "../Utils/Time.js";

const systemPrompt = join(" ", ["You are Momentum AI\'s day planner inside a Telegram bot.", "Create a realistic time-blocked plan from NOW until the user\'s bedtime.", "Fixed commitments have exact times and are IMMOVABLE — place them at", "exactly their given times and schedule everything else around them,", "including travel/transition buffer before and after.", "Include the flexible open tasks (high priority first), pending habits,", "a meal at a sensible time, and short breaks.", "Be realistic: leave buffer time, no block longer than 90 minutes without a break.", "Skip fixed commitments whose time has already passed.", "Format: one line per block, \'HH:MM–HH:MM  activity\'. Maximum 12 lines.", "After the blocks add ONE short encouraging line.", "Plain text only — no markdown, no headers."]);

export function plan(config, user, tasks, pendingHabits, busyToday, bedtime) {
    let arg_10, arg_11;
    const patternInput = partition((t) => (t.At != null), tasks);
    const flexibleTasks = patternInput[1];
    const fixedItems = toList(delay(() => append(map((t_1) => {
        let a_1, a, u;
        let span;
        const matchValue = t_1.At;
        const matchValue_1 = t_1.Until;
        span = ((matchValue != null) ? ((matchValue_1 == null) ? ((a_1 = matchValue, a_1)) : ((a = matchValue, (u = matchValue_1, toText(printf("%s-%s"))(a)(u))))) : "?");
        return toText(printf("[at %s] %s"))(span)(t_1.Text);
    }, patternInput[0]), delay(() => map((c) => {
        let span_1;
        const matchValue_3 = c.Until;
        if (matchValue_3 == null) {
            span_1 = c.At;
        }
        else {
            const u_1 = matchValue_3;
            span_1 = toText(printf("%s-%s"))(c.At)(u_1);
        }
        return toText(printf("[at %s] %s (recurring)"))(span_1)(c.Name);
    }, busyToday)))));
    const fixedList = isEmpty(fixedItems) ? "none" : join("; ", fixedItems);
    const taskList = (flexibleTasks.length === 0) ? "none" : join("; ", map((t_2) => toText(printf("[%s] %s"))(t_2.Priority)(t_2.Text), flexibleTasks));
    const habitList = (pendingHabits.length === 0) ? "none" : join(", ", map((h) => h.Name, pendingHabits));
    return chat(config, systemPrompt, join(" ", [(arg_10 = toString(now(), "yyyy-MM-dd HH:mm"), (arg_11 = dayName(now()), toText(printf("Now: %s (%s)."))(arg_10)(arg_11))), toText(printf("Fixed commitments (immovable): %s."))(fixedList), toText(printf("Flexible open tasks: %s."))(taskList), toText(printf("Pending habits today: %s."))(habitList), toText(printf("Usual bedtime: around %s."))(bedtime)]));
}

