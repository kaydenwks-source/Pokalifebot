
import { Union } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { union_type, float64_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { jsonNumber, chatJson } from "./DeepSeek.js";
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { FSharpResult$2 } from "../fable_modules/fable-library-js.5.7.0/Result.js";
import { parseTime } from "../Utils/Time.js";

export class Intent extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Food", "Sleep", "Weight", "Workout", "Habit", "Reminder", "Coach", "Unknown"];
    }
    static Coach = new Intent(6, []);
    static Unknown = new Intent(7, []);
}

export function Intent_$reflection() {
    return union_type("Ai.Router.Intent", [], Intent, () => [[["Item", string_type]], [["bed", string_type], ["wake", string_type]], [["Item", float64_type]], [["Item", string_type]], [["Item", string_type]], [["Item", string_type]], [], []]);
}

const systemPrompt = join(" ", ["You are the intent router for a personal productivity bot. Classify the user\'s message into exactly ONE intent and extract any needed fields.", "Reply ONLY with a JSON object, nothing else.", "Shape: {\"intent\": \"food|sleep|weight|workout|habit|reminder|coach|unknown\", \"bed\": \"HH:mm\", \"wake\": \"HH:mm\", \"kg\": number, \"habit\": string}", "Intent meanings:", "food = they ate or drank something and are logging it.", "sleep = they are reporting how they slept. Convert to 24h time: \"1am\"->01:00, \"8am\"->08:00, \"11.30pm\"->23:30. Set bed and wake.", "weight = they are stating their own body weight. Set kg in kilograms (convert from lbs/pounds if needed).", "workout = they did exercise or training.", "habit = they finished a routine/habit they track. Set habit to the short habit name only (e.g. \"reading\", \"gym\", \"meditation\").", "reminder = they want to be reminded about something in the future.", "coach = they want advice or motivation, are venting, or asking a question — anything conversational.", "unknown = not actionable or too unclear to route.", "Prefer a tracker intent when something concrete is being logged; use coach only when nothing is being logged."]);

export function classify(config, input) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (chatJson(config, systemPrompt, input).then((_arg) => {
        const result = _arg;
        return (result.tag === 0) ? (PromiseBuilder__Delay_62FBFDE1(promise, () => {
            let kg;
            const json = JSON.parse(result.fields[0]);
            let intent;
            const s = defaultArg(json.intent, "unknown");
            intent = s.toLowerCase();
            switch (intent) {
                case "food":
                    return Promise.resolve(new FSharpResult$2(/* Ok */ 0, [new Intent(/* Food */ 0, [input])]));
                case "workout":
                    return Promise.resolve(new FSharpResult$2(/* Ok */ 0, [new Intent(/* Workout */ 3, [input])]));
                case "reminder":
                    return Promise.resolve(new FSharpResult$2(/* Ok */ 0, [new Intent(/* Reminder */ 5, [input])]));
                case "coach":
                    return Promise.resolve(new FSharpResult$2(/* Ok */ 0, [Intent.Coach]));
                case "weight": {
                    const matchValue = jsonNumber(json, "kg");
                    let matchResult, kg_1;
                    if (matchValue != null) {
                        if ((kg = matchValue, (kg > 20) && (kg < 400))) {
                            matchResult = 0;
                            kg_1 = matchValue;
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
                            return Promise.resolve(new FSharpResult$2(/* Ok */ 0, [new Intent(/* Weight */ 2, [kg_1])]));
                        default:
                            return Promise.resolve(new FSharpResult$2(/* Ok */ 0, [Intent.Coach]));
                    }
                }
                case "sleep": {
                    const bed = defaultArg(json.bed, "");
                    const wake = defaultArg(json.wake, "");
                    const matchValue_1 = parseTime(bed);
                    const matchValue_2 = parseTime(wake);
                    let matchResult_1, b, w;
                    if (matchValue_1 != null) {
                        if (matchValue_2 != null) {
                            matchResult_1 = 0;
                            b = matchValue_1;
                            w = matchValue_2;
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
                            return Promise.resolve(new FSharpResult$2(/* Ok */ 0, [new Intent(/* Sleep */ 1, [b, w])]));
                        default:
                            return Promise.resolve(new FSharpResult$2(/* Ok */ 0, [Intent.Coach]));
                    }
                }
                case "habit": {
                    const name = defaultArg(json.habit, "");
                    return (name.trim() !== "") ? (Promise.resolve(new FSharpResult$2(/* Ok */ 0, [new Intent(/* Habit */ 4, [name.trim()])]))) : (Promise.resolve(new FSharpResult$2(/* Ok */ 0, [Intent.Coach])));
                }
                default:
                    return Promise.resolve(new FSharpResult$2(/* Ok */ 0, [Intent.Unknown]));
            }
        }).catch((_arg_1) => (Promise.resolve(new FSharpResult$2(/* Error */ 1, ["Router parse failed: " + _arg_1.message]))))) : (Promise.resolve(new FSharpResult$2(/* Error */ 1, [result.fields[0]])));
    }))));
}

