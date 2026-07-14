
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, bool_type, float64_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { jsonBool, jsonNumber, jsonString, chatJson } from "./DeepSeek.js";
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { FSharpResult$2 } from "../fable_modules/fable-library-js.5.7.0/Result.js";
import { Operators_IsNull } from "../fable_modules/fable-library-js.5.7.0/FSharp.Core.js";
import { truncate, map } from "../fable_modules/fable-library-js.5.7.0/Array.js";

export class ParsedGoal extends Record {
    constructor(Name, Target, Unit, Absolute) {
        super();
        this.Name = Name;
        this.Target = Target;
        this.Unit = Unit;
        this.Absolute = Absolute;
    }
}

export function ParsedGoal_$reflection() {
    return record_type("Ai.GoalParser.ParsedGoal", [], ParsedGoal, () => [["Name", string_type], ["Target", float64_type], ["Unit", string_type], ["Absolute", bool_type]]);
}

const systemPrompt = join(" ", ["You parse personal goals into JSON so they can be tracked with an easy,", "countable scale. Reply ONLY with a JSON object:", "{\"name\": string (short display name, e.g. \"Read 20 books\"),", "\"target_value\": number, \"unit\": string, \"absolute\": boolean}", "or {\"error\": string} if the text is not a goal.", "Pick the most naturally loggable scale for the goal:", "- Reading ONE specific book -> unit \"chapters\", target_value = your best", "  estimate of that book\'s chapter count, absolute true.", "- Ordered/step progress done in sequence (a course\'s lessons, game levels,", "  a couch-to-5k style plan) -> count the steps, absolute true.", "- Everything cumulative (distance in km, number of books, money, hours,", "  sessions, reps) -> absolute false.", "\"absolute\": true means the user logs the POSITION they\'ve reached (e.g.", "chapter 3 -> 3 of 12), not a running total. false means each log adds up.", "Units are short: chapters, books, km, $, pages, hours, sessions, lessons...", "For yes/no goals (get a certification) use target_value 1, unit \"\", absolute false.", "Expand shorthand numbers: \"$5k\" -> 5000.", "Weight-loss goals should be declined with", "{\"error\": \"use /target for weight goals\"}."]);

export function parse(config, input) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (chatJson(config, systemPrompt, "Goal: " + input).then((_arg) => {
        const result = _arg;
        return (result.tag === 0) ? (PromiseBuilder__Delay_62FBFDE1(promise, () => {
            let target, name;
            const json = JSON.parse(result.fields[0]);
            const matchValue = json.error;
            if (matchValue == null) {
                const matchValue_1 = jsonString(json, "name");
                const matchValue_2 = jsonNumber(json, "target_value");
                let matchResult, name_1, target_1;
                if (matchValue_1 != null) {
                    if (matchValue_2 != null) {
                        if ((target = matchValue_2, (name = matchValue_1, (target > 0) && (target <= 10000000)))) {
                            matchResult = 0;
                            name_1 = matchValue_1;
                            target_1 = matchValue_2;
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
                        return Promise.resolve(new FSharpResult$2(/* Ok */ 0, [new ParsedGoal(name_1, target_1, defaultArg(jsonString(json, "unit"), ""), jsonBool(json, "absolute"))]));
                    default:
                        return Promise.resolve(new FSharpResult$2(/* Error */ 1, ["AI returned an implausible goal"]));
                }
            }
            else {
                const e_1 = matchValue;
                return Promise.resolve(new FSharpResult$2(/* Error */ 1, [e_1]));
            }
        }).catch((_arg_1) => (Promise.resolve(new FSharpResult$2(/* Error */ 1, ["Could not parse AI response: " + _arg_1.message]))))) : (Promise.resolve(new FSharpResult$2(/* Error */ 1, [result.fields[0]])));
    }))));
}

const coachPrompt = join(" ", ["You are Momentum AI, a supportive productivity coach.", "Break the user\'s goal into EXACTLY 5 progressive, concrete, achievable", "steps that build from an easy first win to the finish line.", "When the goal has a numeric target, make the steps concrete checkpoints", "toward it — e.g. for 10 km: 2 km, 4 km, 6 km, 8 km, 10 km.", "Each step is ONE short actionable sentence, max 12 words.", "Reply ONLY with JSON: {\"steps\": [string, string, string, string, string]}"]);

/**
 * Coach breakdown: big goal -> 5 achievable steps.
 */
export function breakdown(config, goalName, target, unit) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const described = (unit === "") ? goalName : toText(printf("%s (target: %g %s)"))(goalName)(target)(unit);
        return chatJson(config, coachPrompt, "Goal: " + described).then((_arg) => {
            const result = _arg;
            return (result.tag === 0) ? (PromiseBuilder__Delay_62FBFDE1(promise, () => {
                const json = JSON.parse(result.fields[0]);
                const steps = json.steps;
                return (Operators_IsNull(steps) ? true : (steps.length < 3)) ? (Promise.resolve(new FSharpResult$2(/* Error */ 1, ["AI returned no usable steps"]))) : (Promise.resolve(new FSharpResult$2(/* Ok */ 0, [map((s) => s.trim(), truncate(5, steps))])));
            }).catch((_arg_1) => (Promise.resolve(new FSharpResult$2(/* Error */ 1, ["Could not parse AI response: " + _arg_1.message]))))) : (Promise.resolve(new FSharpResult$2(/* Error */ 1, [result.fields[0]])));
        });
    }));
}

