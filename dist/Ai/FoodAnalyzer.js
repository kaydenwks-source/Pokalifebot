
import { join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { jsonString, jsonNumber, chatJson } from "./DeepSeek.js";
import { max, min } from "../fable_modules/fable-library-js.5.7.0/Double.js";
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { Nutrition } from "../Models/Meal.js";
import { FSharpResult$2 } from "../fable_modules/fable-library-js.5.7.0/Result.js";

const systemPrompt = join(" ", ["You are a nutrition estimator inside a Telegram bot.", "Given a meal description, reply ONLY with JSON:", "{\"name\": string (short cleaned-up meal name), \"calories\": number (kcal),", "\"protein\": number, \"carbs\": number, \"fat\": number, \"sugar\": number, \"fiber\": number}", "(macros in grams) or {\"error\": string} if the text does not describe food or drink.", "Estimate for the described portion; assume one medium serving when unspecified.", "The user is in Singapore — know local and hawker dishes well", "(chicken rice, laksa, mee goreng, cai fan, kaya toast, kopi/teh...).", "Round to sensible whole-ish numbers."]);

export function analyse(config, description) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (chatJson(config, systemPrompt, "Meal: " + description).then((_arg) => {
        const result = _arg;
        return (result.tag === 0) ? (PromiseBuilder__Delay_62FBFDE1(promise, () => {
            let name, kcal;
            const json = JSON.parse(result.fields[0]);
            const matchValue = json.error;
            if (matchValue == null) {
                const gram = (key) => min(1000, max(0, defaultArg(jsonNumber(json, key), 0)));
                const matchValue_1 = jsonString(json, "name");
                const matchValue_2 = jsonNumber(json, "calories");
                let matchResult, kcal_1, name_1;
                if (matchValue_1 != null) {
                    if (matchValue_2 != null) {
                        if ((name = matchValue_1, (kcal = matchValue_2, (kcal >= 0) && (kcal <= 6000)))) {
                            matchResult = 0;
                            kcal_1 = matchValue_2;
                            name_1 = matchValue_1;
                        }
                        else {
                            matchResult = 1;
                        }
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
                        return Promise.resolve(new FSharpResult$2(/* Ok */ 0, [new Nutrition(name_1, ~~kcal_1, gram("protein"), gram("carbs"), gram("fat"), gram("sugar"), gram("fiber"))]));
                    default:
                        return Promise.resolve(new FSharpResult$2(/* Error */ 1, ["AI returned implausible nutrition data"]));
                }
            }
            else {
                const e_1 = matchValue;
                return Promise.resolve(new FSharpResult$2(/* Error */ 1, [e_1]));
            }
        }).catch((_arg_1) => (Promise.resolve(new FSharpResult$2(/* Error */ 1, ["Could not parse AI response: " + _arg_1.message]))))) : (Promise.resolve(new FSharpResult$2(/* Error */ 1, [result.fields[0]])));
    }))));
}

