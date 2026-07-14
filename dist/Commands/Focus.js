
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { complete, start, stop, activeFor, todayStats } from "../Services/Focus.js";
import { commandArgs, ensureUser } from "./Common.js";
import { item } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { info } from "../Utils/Logger.js";
import { tryParse } from "../fable_modules/fable-library-js.5.7.0/Int32.js";
import { FSharpRef } from "../fable_modules/fable-library-js.5.7.0/Types.js";

const defaultMin = 25;

const maxMin = 120;

function statusLine(a) {
    return toText(printf("🍅 Focus running — %d min, started %s.\n\nStay with it. /focus stop to end early."))(a.Minutes)(a.StartedAt);
}

function todaySummary(userId) {
    const patternInput = todayStats(userId);
    return toText(printf("🍅 Focus\n\nToday: %d session(s) · %d min focused.\n\nStart one: /focus 25 (or any length up to 120)."))(patternInput[0])(patternInput[1]);
}

export function handle(ctx) {
    let m;
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const args = commandArgs(ctx);
        const sub = (args.length > 0) ? item(0, args).toLowerCase() : "";
        switch (sub) {
            case "": {
                const matchValue_1 = activeFor(user.Id);
                if (matchValue_1 == null) {
                    return ctx.reply(todaySummary(user.Id));
                }
                else {
                    const a = matchValue_1;
                    return ctx.reply(statusLine(a));
                }
            }
            case "status": {
                const matchValue_2 = activeFor(user.Id);
                if (matchValue_2 == null) {
                    return ctx.reply("No focus session running. Start one: /focus 25");
                }
                else {
                    const a_1 = matchValue_2;
                    return ctx.reply(statusLine(a_1));
                }
            }
            case "stop": {
                const matchValue_3 = activeFor(user.Id);
                if (matchValue_3 != null) {
                    const a_2 = matchValue_3;
                    clearTimeout(a_2.Timer);
                    stop(user.Id);
                    info(toText(printf("%s stopped a focus session early"))(user.FirstName));
                    return ctx.reply("⏹ Focus stopped — no worries, starting is the hard part. /focus 25 when you\'re ready to go again.");
                }
                else {
                    return ctx.reply("No focus session running. Start one: /focus 25");
                }
            }
            default: {
                let matchValue_4;
                let outArg = 0;
                matchValue_4 = [tryParse(sub, 511, false, 32, new FSharpRef(() => (outArg | 0), (v) => {
                    outArg = (v | 0);
                })), outArg];
                let matchResult;
                if (matchValue_4[0]) {
                    if ((m = (matchValue_4[1] | 0), (m >= 1) && (m <= maxMin))) {
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
                        const m_1 = matchValue_4[1] | 0;
                        const matchValue_5 = activeFor(user.Id);
                        if (matchValue_5 == null) {
                            start(user.Id, m_1, setTimeout((() => {
                                const matchValue_6 = complete(user.Id);
                                if (matchValue_6 == null) {
                                }
                                else {
                                    const s = matchValue_6;
                                    const patternInput = todayStats(user.Id);
                                    ctx.reply(toText(printf("⏰ Time\'s up — %d min of focus done! 🍅\n\nThat\'s %d session(s) and %d min today. Take a short break, then /focus again when you\'re ready."))(s.Minutes)(patternInput[0])(patternInput[1]));
                                }
                            }), ((m_1 * 60) * 1000)));
                            info(toText(printf("%s started a %d-min focus session"))(user.FirstName)(m_1));
                            return ctx.reply(toText(printf("🍅 Focus on — %d minutes. I\'ll ping you the moment it\'s up.\n\nPhone down, one task, go. /focus stop if you need to bail."))(m_1));
                        }
                        else {
                            return ctx.reply("You already have a focus session running. Use /focus status, or /focus stop to end it first.");
                        }
                    }
                    default:
                        return ctx.reply("Usage: /focus <minutes> (1–120), e.g. /focus 25.\nAlso: /focus status · /focus stop");
                }
            }
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

