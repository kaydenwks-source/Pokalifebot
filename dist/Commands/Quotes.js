
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { aiUnavailable, commandArg, ensureUser } from "./Common.js";
import { Categories_all, Categories_tryFind } from "../Models/User.js";
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { commit, check } from "../Services/Entitlements.js";
import { info } from "../Utils/Logger.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { generate } from "../Ai/Quotes.js";
import { map, defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { chunkBySize, map as map_1, toArray } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { setQuoteTime, setCategory, upsert } from "../Services/Users.js";
import { parseTime } from "../Utils/Time.js";

export function handleQuote(config, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        let arg_3;
        const matchValue = ensureUser(ctx);
        if (matchValue != null) {
            const user = matchValue;
            let patternInput;
            const matchValue_1 = commandArg(ctx);
            if (matchValue_1 == null) {
                patternInput = [user.QuoteCategory, undefined];
            }
            else {
                const arg = matchValue_1;
                const matchValue_2 = Categories_tryFind(arg);
                patternInput = ((matchValue_2 == null) ? [user.QuoteCategory, (arg_3 = join(", ", Categories_all), toText(printf("I don\'t know the category \"%s\", so I used %s. Options: %s"))(arg)(user.QuoteCategory)(arg_3))] : [matchValue_2, undefined]);
            }
            const category = patternInput[0];
            const matchValue_3 = check(config.AdminUserId, user, "quote");
            if (matchValue_3.tag === 0) {
                info(toText(printf("/quote (%s) for %s"))(category)(user.FirstName));
                ctx.sendChatAction("typing");
                return generate(config, category).then((_arg) => {
                    const result = _arg;
                    let text;
                    if (result.tag === 1) {
                        text = aiUnavailable;
                    }
                    else {
                        commit(config.AdminUserId, user, "quote");
                        const extra = defaultArg(map((h) => ("\n\nℹ️ " + h), patternInput[1]), "");
                        text = toText(printf("💪 %s\n\n%s%s"))(category)(result.fields[0])(extra);
                    }
                    return ctx.reply(text);
                });
            }
            else {
                return ctx.reply(matchValue_3.fields[0]);
            }
        }
        else {
            return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
        }
    }));
}

const categoryKeyboard = {
    reply_markup: {
        inline_keyboard: toArray(map_1(toArray, chunkBySize(2, map_1((cat) => ({
            text: cat,
            callback_data: "cat:" + cat,
        }), Categories_all)))),
    },
};

export function handleCategory(ctx) {
    const current = defaultArg(map((u) => toText(printf(" (current: %s)"))(u.QuoteCategory), ensureUser(ctx)), "");
    return ctx.reply(toText(printf("Pick your preferred quote category%s:"))(current), categoryKeyboard);
}

/**
 * Inline button pressed — Bot.fs registers one of these per category.
 */
export function handleCategoryChosen(category, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        let arg;
        const matchValue = ctx.from;
        const matchValue_1 = ctx.chat;
        let matchResult, chat, from;
        if (matchValue != null) {
            if (matchValue_1 != null) {
                matchResult = 0;
                chat = matchValue_1;
                from = matchValue;
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
                upsert(from.id, chat.id, from.first_name, from.username);
                setCategory(from.id, category);
                info((arg = from.first_name, toText(printf("%s set quote category to %s"))(arg)(category)));
                ctx.answerCbQuery();
                return ctx.editMessageText(toText(printf("✅ Preferred category set to %s.\n\nUse /quote anytime, and /quotetime HH:MM to get one every morning."))(category));
            }
            default:
                return ctx.answerCbQuery();
        }
    }));
}

export function handleQuoteTime(ctx) {
    let arg, clo;
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const matchValue_1 = commandArg(ctx);
        if (matchValue_1 != null) {
            if ((arg = matchValue_1, arg.trim().toLowerCase() === "off")) {
                const arg_2 = matchValue_1;
                setQuoteTime(user.Id, undefined);
                info(toText(printf("%s turned daily quote off"))(user.FirstName));
                return ctx.reply("Daily quote turned off. Re-enable anytime with /quotetime HH:MM.");
            }
            else {
                const arg_4 = matchValue_1;
                const matchValue_2 = parseTime(arg_4);
                if (matchValue_2 == null) {
                    return ctx.reply(toText(printf("\"%s\" doesn\'t look like a time. Use 24h HH:MM, e.g. /quotetime 07:00"))(arg_4));
                }
                else {
                    const time = matchValue_2;
                    setQuoteTime(user.Id, time);
                    info(toText(printf("%s set daily quote time to %s"))(user.FirstName)(time));
                    return ctx.reply(toText(printf("✅ Daily %s quote scheduled for %s every day.\nChange the style with /category, or /quotetime off to stop."))(user.QuoteCategory)(time));
                }
            }
        }
        else {
            const status = defaultArg(map((clo = toText(printf("🕖 Your daily quote is scheduled for %s.")), clo), user.QuoteTime), "You have no daily quote scheduled.");
            return ctx.reply(status + "\n\nUsage:\n/quotetime 07:00 — daily quote at 7 AM\n/quotetime off — turn it off");
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

