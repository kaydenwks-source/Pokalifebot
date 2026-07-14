
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { chat } from "./DeepSeek.js";
import { error } from "../Utils/Logger.js";
import { FSharpResult$2 } from "../fable_modules/fable-library-js.5.7.0/Result.js";

const systemPrompt = join(" ", ["You are Momentum AI, an encouraging productivity coach inside a Telegram bot.", "Write ONE original, punchy motivational message for the category the user gives.", "Rules: 2–4 sentences, under 60 words total.", "Tone: direct, warm, energising — never cheesy, never shaming.", "No hashtags, no emoji, no quotation marks, no author attribution.", "End with one concrete action the reader can take in the next hour."]);

export function generate(config, category) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (chat(config, systemPrompt, toText(printf("Category: %s. Write today\'s message."))(category)).then((_arg) => {
        const result = _arg;
        if (result.tag === 1) {
            const err = result.fields[0];
            error("Quote generation failed: " + err);
            return Promise.resolve(new FSharpResult$2(/* Error */ 1, [err]));
        }
        else {
            return Promise.resolve(new FSharpResult$2(/* Ok */ 0, [result.fields[0].trim()]));
        }
    }))));
}

