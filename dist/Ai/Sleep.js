
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { chat } from "./DeepSeek.js";
import { truncate, map } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { formatDuration } from "../Utils/Time.js";

const systemPrompt = join(" ", ["You are Momentum AI\'s supportive sleep coach inside a Telegram bot.", "You get a user\'s recent sleep log (most recent first).", "Reply with: the main pattern you notice, how consistent their schedule is,", "and ONE practical suggestion for tonight.", "3–5 short sentences, plain text only — no emoji, no lists, no headers.", "Be encouraging and specific; never shame the user.", "Never give medical advice — for serious sleep problems, suggest seeing a doctor."]);

export function analyse(config, logs) {
    return chat(config, systemPrompt, "My recent sleep log (most recent first):\n" + join("\n", map((l) => {
        const arg_3 = formatDuration(l.DurationMinutes);
        return toText(printf("%s: bed %s, wake %s, slept %s"))(l.Date)(l.BedTime)(l.WakeTime)(arg_3);
    }, truncate(14, logs))));
}

