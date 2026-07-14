
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { chat } from "./DeepSeek.js";
import { filter } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { singleton, append, delay, toList } from "../fable_modules/fable-library-js.5.7.0/Seq.js";
import { truncate, map } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { map as map_1, defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";

const systemPrompt = join(" ", ["You are Momentum AI\'s supportive body-progress coach inside a Telegram bot.", "You get a user\'s recent weight/body-fat log (most recent first) and, when", "available, their average calorie intake.", "Comment on the trend, connect it to the intake if provided, note something", "encouraging, and give ONE practical suggestion.", "3–5 short sentences, plain text only — no emoji, no lists.", "Never shame the user. Never give medical advice; for concerning patterns", "suggest talking to a doctor."]);

export function analyse(config, logs, heightCm, avgDailyKcal) {
    return chat(config, systemPrompt, join("\n", filter((s) => (s !== ""), toList(delay(() => append(singleton("My recent measurements (most recent first):"), delay(() => append(singleton(join("\n", map((l) => {
        let clo, clo_1;
        const kg = defaultArg(map_1((clo = toText(printf("%.1f kg")), clo), l.Kg), "no weight");
        const fat = defaultArg(map_1((clo_1 = toText(printf(", body fat %.1f%%")), clo_1), l.BodyFat), "");
        return toText(printf("%s: %s%s"))(l.Date)(kg)(fat);
    }, truncate(14, logs)))), delay(() => {
        let matchValue, h;
        return append((matchValue = heightCm, (matchValue == null) ? singleton("") : ((h = matchValue, singleton(toText(printf("My height: %.0f cm."))(h))))), delay(() => {
            const matchValue_1 = avgDailyKcal;
            if (matchValue_1 == null) {
                return singleton("");
            }
            else {
                const kcal = matchValue_1 | 0;
                return singleton(toText(printf("My average intake over the last 7 logged days: %d kcal/day."))(kcal));
            }
        }));
    })))))))));
}

