
import { filter, map, defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { join, printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { chat, jsonString, jsonNumber, chatJson } from "./DeepSeek.js";
import { details, ParsedWorkout } from "../Models/Workout.js";
import { FSharpResult$2 } from "../fable_modules/fable-library-js.5.7.0/Result.js";
import { truncate, map as map_1 } from "../fable_modules/fable-library-js.5.7.0/Array.js";

function parserPrompt(userWeightKg) {
    let clo;
    const weight = defaultArg(map((clo = toText(printf("%.0f")), clo), userWeightKg), "70");
    return join(" ", ["You parse workout descriptions into JSON. Reply ONLY with a JSON object:", "{\"exercise\": string (short capitalised name), \"kind\": \"strength\"|\"cardio\",", "\"sets\": int|null, \"reps\": int|null, \"weight_kg\": number|null,", "\"duration_min\": number|null, \"distance_km\": number|null,", "\"calories\": int (estimated kcal burned for the whole session)}", "or {\"error\": string} if the text does not describe physical exercise.", toText(printf("Assume the user weighs %s kg when estimating calories."))(weight), "IMPORTANT: if the user states a measured calorie number (from a fitness", "tracker, smartwatch, or machine display), use that EXACT number instead of estimating.", "Convert units: lbs -> kg, miles -> km. \"3x8\" means 3 sets of 8 reps.", "For multi-exercise descriptions, use the main exercise and total calories."]);
}

export function parse(config, userWeightKg, input) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (chatJson(config, parserPrompt(userWeightKg), "Workout: " + input).then((_arg) => {
        const result = _arg;
        return (result.tag === 0) ? (PromiseBuilder__Delay_62FBFDE1(promise, () => {
            const json = JSON.parse(result.fields[0]);
            const matchValue = json.error;
            if (matchValue == null) {
                const num = (key, lo, hi) => filter((v) => {
                    if (v >= lo) {
                        return v <= hi;
                    }
                    else {
                        return false;
                    }
                }, jsonNumber(json, key));
                let kind;
                const matchValue_1 = jsonString(json, "kind");
                let matchResult;
                if (matchValue_1 != null) {
                    switch (matchValue_1) {
                        case "cardio": {
                            matchResult = 0;
                            break;
                        }
                        case "strength": {
                            matchResult = 1;
                            break;
                        }
                        default:
                            matchResult = 2;
                    }
                }
                else {
                    matchResult = 2;
                }
                switch (matchResult) {
                    case 0: {
                        kind = "cardio";
                        break;
                    }
                    case 1: {
                        kind = "strength";
                        break;
                    }
                    default:
                        kind = ((jsonNumber(json, "distance_km") != null) ? "cardio" : "strength");
                }
                const matchValue_2 = jsonString(json, "exercise");
                const matchValue_3 = num("calories", 0, 3000);
                let matchResult_1, exercise, kcal;
                if (matchValue_2 != null) {
                    if (matchValue_3 != null) {
                        matchResult_1 = 0;
                        exercise = matchValue_2;
                        kcal = matchValue_3;
                    }
                    else {
                        matchResult_1 = 1;
                    }
                }
                else {
                    matchResult_1 = 1;
                }
                switch (matchResult_1) {
                    case 0:
                        return Promise.resolve(new FSharpResult$2(/* Ok */ 0, [new ParsedWorkout(exercise, kind, map((value) => (~~value | 0), num("sets", 1, 50)), map((value_1) => (~~value_1 | 0), num("reps", 1, 500)), num("weight_kg", 0.5, 600), num("duration_min", 1, 1000), num("distance_km", 0.1, 500), ~~kcal)]));
                    default:
                        return Promise.resolve(new FSharpResult$2(/* Error */ 1, ["AI returned an implausible workout"]));
                }
            }
            else {
                const e_1 = matchValue;
                return Promise.resolve(new FSharpResult$2(/* Error */ 1, [e_1]));
            }
        }).catch((_arg_1) => (Promise.resolve(new FSharpResult$2(/* Error */ 1, ["Could not parse AI response: " + _arg_1.message]))))) : (Promise.resolve(new FSharpResult$2(/* Error */ 1, [result.fields[0]])));
    }))));
}

const tipsPrompt = join(" ", ["You are Momentum AI\'s supportive fitness coach inside a Telegram bot.", "You get a user\'s recent workout log (most recent first).", "Comment on their training balance (muscle groups, cardio vs strength mix),", "note something encouraging, and give ONE specific suggestion for the next session.", "3–4 short sentences, plain text, no emoji, no lists.", "Never shame the user; no medical advice."]);

export function tips(config, logs) {
    return chat(config, tipsPrompt, "My recent workouts (most recent first):\n" + join("\n", map_1((l) => {
        const arg_3 = details(l);
        return toText(printf("%s: %s (%s) %s, ~%d kcal"))(l.Date)(l.Exercise)(l.Kind)(arg_3)(l.CaloriesBurned);
    }, truncate(15, logs))));
}

