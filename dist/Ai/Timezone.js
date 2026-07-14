
import { join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { jsonNumber, chatJson } from "./DeepSeek.js";
import { FSharpResult$2 } from "../fable_modules/fable-library-js.5.7.0/Result.js";

const systemPrompt = join(" ", ["You convert a place (country, state, or city) to its standard UTC offset.", "Reply ONLY with JSON: {\"offset_minutes\": integer} — the place\'s", "STANDARD-time offset from UTC in minutes. Examples: Singapore 480,", "India 330, United Kingdom 0, New York -300, California -480, Japan 540.", "Ignore daylight saving. For a country spanning multiple time zones, use", "its most populous / capital zone. If you cannot identify a real place,", "reply {\"error\": \"unknown place\"}."]);

/**
 * Resolve a free-text location to UTC offset minutes (validated -720..+840,
 * on a 15-minute grid to reject nonsense).
 */
export function resolveOffset(config, place) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (chatJson(config, systemPrompt, "Place: " + place).then((_arg) => {
        const result = _arg;
        return (result.tag === 0) ? (PromiseBuilder__Delay_62FBFDE1(promise, () => {
            let m;
            const json = JSON.parse(result.fields[0]);
            const matchValue = json.error;
            if (matchValue == null) {
                const matchValue_1 = jsonNumber(json, "offset_minutes");
                let matchResult, m_1;
                if (matchValue_1 != null) {
                    if ((m = matchValue_1, ((m >= -720) && (m <= 840)) && ((~~m % 15) === 0))) {
                        matchResult = 0;
                        m_1 = matchValue_1;
                    }
                    else {
                        matchResult = 1;
                    }
                }
                else {
                    matchResult = 1;
                }
                switch (matchResult) {
                    case 0:
                        return Promise.resolve(new FSharpResult$2(/* Ok */ 0, [m_1]));
                    default:
                        return Promise.resolve(new FSharpResult$2(/* Error */ 1, ["implausible offset"]));
                }
            }
            else {
                const e_1 = matchValue;
                return Promise.resolve(new FSharpResult$2(/* Error */ 1, [e_1]));
            }
        }).catch((_arg_1) => (Promise.resolve(new FSharpResult$2(/* Error */ 1, ["Could not parse AI response: " + _arg_1.message]))))) : (Promise.resolve(new FSharpResult$2(/* Error */ 1, [result.fields[0]])));
    }))));
}

