
import { commandArg, commandArgs, ensureUser } from "./Common.js";
import { forUser, add, avgMood7 } from "../Services/Reflections.js";
import { round } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { join, printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { tryParse } from "../fable_modules/fable-library-js.5.7.0/Int32.js";
import { map, truncate, skip, item } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { FSharpRef } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { info } from "../Utils/Logger.js";

function moodEmoji(_arg) {
    switch (_arg) {
        case 1:
            return "😞";
        case 2:
            return "🙁";
        case 3:
            return "😐";
        case 4:
            return "🙂";
        default:
            return "😄";
    }
}

function moodWord(_arg) {
    switch (_arg) {
        case 1:
            return "rough";
        case 2:
            return "low";
        case 3:
            return "okay";
        case 4:
            return "good";
        default:
            return "great";
    }
}

export function handleMood(ctx) {
    let arg, arg_4, arg_6, n;
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const args = commandArgs(ctx);
        if (args.length === 0) {
            const matchValue_1 = avgMood7(user.Id);
            if (matchValue_1 == null) {
                return ctx.reply("How are you feeling? /mood 1–5 (1 rough … 5 great). Add a note too: /mood 4 shipped a lot today.");
            }
            else {
                const avg = matchValue_1;
                return ctx.reply((arg = moodEmoji(~~round(avg)), toText(printf("%s Your mood — last 7 days average %.1f/5.\n\nLog now: /mood 4 (add a note: /mood 4 tired but productive)."))(arg)(avg)));
            }
        }
        else {
            let matchValue_2;
            let outArg = 0;
            matchValue_2 = [tryParse(item(0, args), 511, false, 32, new FSharpRef(() => (outArg | 0), (v) => {
                outArg = (v | 0);
            })), outArg];
            let matchResult;
            if (matchValue_2[0]) {
                if ((n = (matchValue_2[1] | 0), (n >= 1) && (n <= 5))) {
                    matchResult = 0;
                }
                else {
                    matchResult = 1;
                }
            }
            else {
                matchResult = 1;
            }
            switch (matchResult) {
                case 0: {
                    const n_1 = matchValue_2[1] | 0;
                    const note = (args.length > 1) ? join(" ", skip(1, args)) : undefined;
                    add(user.Id, n_1, note);
                    info(toText(printf("%s logged mood %d"))(user.FirstName)(n_1));
                    const tail = (note == null) ? " Want to add why? /journal <thoughts>" : " Noted. 🧠";
                    return ctx.reply((arg_4 = moodEmoji(n_1), (arg_6 = moodWord(n_1), toText(printf("%s Mood logged: %d/5 (%s).%s"))(arg_4)(n_1)(arg_6)(tail))));
                }
                default:
                    return ctx.reply("Use a number 1–5: /mood 4. (1 rough, 3 okay, 5 great.)");
            }
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

export function handleJournal(ctx) {
    let arg_5;
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const matchValue_1 = commandArg(ctx);
        if (matchValue_1 != null) {
            const text = matchValue_1;
            add(user.Id, undefined, text);
            info((arg_5 = (text.length | 0), toText(printf("%s wrote a journal entry (%d chars)"))(user.FirstName)(arg_5)));
            return ctx.reply("📓 Saved to your journal. I\'ll weave your reflections into your weekly review. 🧠");
        }
        else {
            const recent = truncate(5, forUser(user.Id));
            if (recent.length === 0) {
                return ctx.reply("📓 Your journal is empty. Write an entry: /journal today I finally started that project.\n\nIt\'s private to you, and I\'ll factor your reflections into your weekly review.");
            }
            else {
                const lines = join("\n", map((r) => {
                    let mood;
                    const matchValue_2 = r.Mood;
                    if (matchValue_2 == null) {
                        mood = "";
                    }
                    else {
                        const arg = moodEmoji(matchValue_2);
                        mood = toText(printf(" %s"))(arg);
                    }
                    let body;
                    const matchValue_3 = r.Text;
                    body = ((matchValue_3 == null) ? "(mood check-in)" : matchValue_3);
                    return toText(printf("• %s%s — %s"))(r.Stamp)(mood)(body);
                }, recent));
                return ctx.reply("📓 Recent journal entries:\n\n" + lines);
            }
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

