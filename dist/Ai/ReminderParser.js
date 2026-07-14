
import { FSharpRef, Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { tryParse } from "../fable_modules/fable-library-js.5.7.0/Int32.js";
import { printf, toText, join, substring } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { parse as parse_1, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { parseTime, dayName } from "../Utils/Time.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { chatJson } from "./DeepSeek.js";
import { FSharpResult$2 } from "../fable_modules/fable-library-js.5.7.0/Result.js";

export class ParsedReminder extends Record {
    constructor(Text$, Date$, Time, Repeat) {
        super();
        this.Text = Text$;
        this.Date = Date$;
        this.Time = Time;
        this.Repeat = Repeat;
    }
}

export function ParsedReminder_$reflection() {
    return record_type("Ai.ReminderParser.ParsedReminder", [], ParsedReminder, () => [["Text", string_type], ["Date", string_type], ["Time", string_type], ["Repeat", string_type]]);
}

function validRepeat(r) {
    let matchResult;
    switch (r) {
        case "once":
        case "daily":
        case "weekly":
        case "monthly": {
            matchResult = 0;
            break;
        }
        default:
            if (r.startsWith("days:")) {
                matchResult = 1;
            }
            else {
                matchResult = 2;
            }
    }
    switch (matchResult) {
        case 0:
            return true;
        case 1: {
            let matchValue;
            let outArg = 0;
            matchValue = [tryParse(substring(r, 5), 511, false, 32, new FSharpRef(() => (outArg | 0), (v) => {
                outArg = (v | 0);
            })), outArg];
            if (matchValue[0]) {
                const n = matchValue[1] | 0;
                if (n >= 1) {
                    return n <= 365;
                }
                else {
                    return false;
                }
            }
            else {
                return false;
            }
        }
        default:
            return false;
    }
}

function validDate(d) {
    try {
        return toString(parse_1(d), "yyyy-MM-dd") === d;
    }
    catch (matchValue) {
        return false;
    }
}

function systemPrompt(now) {
    let arg, arg_1;
    return join(" ", [(arg = toString(now, "yyyy-MM-dd HH:mm"), (arg_1 = dayName(now), toText(printf("You parse reminder requests into JSON. Current local datetime: %s (%s)."))(arg)(arg_1))), "Reply ONLY with a JSON object, nothing else.", "Shape: {\"text\": string, \"date\": \"yyyy-MM-dd\", \"time\": \"HH:mm\", \"repeat\": \"once\"|\"daily\"|\"weekly\"|\"monthly\"|\"days:N\"}", "or {\"error\": string} if the request contains no parseable schedule.", "\"text\" is what to remind about, with the time expression removed; keep the user\'s wording.", "\"date\" and \"time\" are the FIRST occurrence and must be in the future.", "Rules: no time given -> 09:00. Time already passed today and no day given -> tomorrow.", "\"every day/morning/night\" -> daily. \"every <weekday>\" -> weekly. \"every month\" -> monthly. \"every N days\" -> days:N.", "Relative times like \"in 2 hours\" -> compute from the current datetime."]);
}

export function parse(config, now, input) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (chatJson(config, systemPrompt(now), input).then((_arg) => {
        const result = _arg;
        return (result.tag === 0) ? (PromiseBuilder__Delay_62FBFDE1(promise, () => {
            let normalisedTime;
            const json = JSON.parse(result.fields[0]);
            const matchValue = json.error;
            if (matchValue == null) {
                const text = json.text;
                const date = json.date;
                const time = json.time;
                let repeat;
                const matchValue_1 = json.repeat;
                repeat = ((matchValue_1 == null) ? "once" : matchValue_1);
                const matchValue_2 = parseTime(time);
                let matchResult, normalisedTime_1;
                if (matchValue_2 != null) {
                    if ((normalisedTime = matchValue_2, (validDate(date) && validRepeat(repeat)) && (text.trim() !== ""))) {
                        matchResult = 0;
                        normalisedTime_1 = matchValue_2;
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
                        return Promise.resolve(new FSharpResult$2(/* Ok */ 0, [new ParsedReminder(text.trim(), date, normalisedTime_1, repeat)]));
                    default:
                        return Promise.resolve(new FSharpResult$2(/* Error */ 1, [toText(printf("AI returned an invalid schedule (%s %s %s)"))(date)(time)(repeat)]));
                }
            }
            else {
                const e_1 = matchValue;
                return Promise.resolve(new FSharpResult$2(/* Error */ 1, [e_1]));
            }
        }).catch((_arg_1) => (Promise.resolve(new FSharpResult$2(/* Error */ 1, ["Could not parse AI response: " + _arg_1.message]))))) : (Promise.resolve(new FSharpResult$2(/* Error */ 1, [result.fields[0]])));
    }))));
}

