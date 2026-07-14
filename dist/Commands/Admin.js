
import { find, getAll } from "../Services/Users.js";
import { isExempt, isPremium } from "../Services/Entitlements.js";
import { getAll as getAll_1 } from "../Services/SleepLogs.js";
import { summary } from "../Services/Analytics.js";
import { ofArrayWithTail, append, ofArray, map, singleton } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { join, printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { formatUptime } from "../Utils/Time.js";
import { getAll as getAll_2 } from "../Services/Reminders.js";
import { getAll as getAll_3 } from "../Services/Habits.js";
import { getAll as getAll_4 } from "../Services/Tasks.js";
import { getAll as getAll_5 } from "../Services/Meals.js";
import { getAll as getAll_6 } from "../Services/WeightLogs.js";
import { getAll as getAll_7 } from "../Services/Workouts.js";
import { getAll as getAll_8 } from "../Services/Commitments.js";
import { getAll as getAll_9 } from "../Services/Goals.js";
import { map as map_1, defaultArg, bind } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { tryParse } from "../fable_modules/fable-library-js.5.7.0/Double.js";
import { FSharpRef } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { tryHead, tryItem } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { tryParse as tryParse_1 } from "../fable_modules/fable-library-js.5.7.0/Int32.js";
import { revokeComp, grantComp } from "../Services/Payments.js";
import { warn, info } from "../Utils/Logger.js";
import { commandArgs } from "./Common.js";

function showStats(config, ctx) {
    let arg_4, arg_5, arg_9, array_6, arg_10, array_7, arg_11, array_8, arg_12, array_9, arg_13, array_10, arg_14, array_11, arg_15, array_12, arg_16, array_13;
    const users = getAll();
    let dailyQuotesOn;
    const array_1 = users.filter((u) => (u.QuoteTime != null));
    dailyQuotesOn = array_1.length;
    let premiumCount;
    const array_3 = users.filter((u_1) => {
        if (isPremium(config.AdminUserId, u_1)) {
            return !isExempt(config.AdminUserId, u_1);
        }
        else {
            return false;
        }
    });
    premiumCount = array_3.length;
    let sleepLogCount;
    const array_4 = getAll_1();
    sleepLogCount = array_4.length;
    const a = summary();
    const topLines = (a.Top.length === 0) ? singleton("  (no commands recorded yet)") : map((t) => toText(printf("  /%s — %d"))(t.Command)(t.Count), ofArray(a.Top));
    const text = join("\n", append(ofArray(["🛠 Admin panel", "", toText(printf("Version: v%s (%s)"))("0.29.3")(config.Environment), (arg_4 = formatUptime(process.uptime()), toText(printf("Uptime: %s"))(arg_4)), (arg_5 = (users.length | 0), toText(printf("Users: %d (daily quote on: %d)"))(arg_5)(dailyQuotesOn)), toText(printf("Premium users: %d"))(premiumCount), toText(printf("Sleep logs: %d"))(sleepLogCount), (arg_9 = (((array_6 = getAll_2(), array_6.length)) | 0), toText(printf("Reminders: %d"))(arg_9)), (arg_10 = (((array_7 = getAll_3(), array_7.length)) | 0), toText(printf("Habits: %d"))(arg_10)), (arg_11 = (((array_8 = getAll_4(), array_8.length)) | 0), toText(printf("Tasks: %d"))(arg_11)), (arg_12 = (((array_9 = getAll_5(), array_9.length)) | 0), toText(printf("Meals: %d"))(arg_12)), (arg_13 = (((array_10 = getAll_6(), array_10.length)) | 0), toText(printf("Weight logs: %d"))(arg_13)), (arg_14 = (((array_11 = getAll_7(), array_11.length)) | 0), toText(printf("Workouts: %d"))(arg_14)), (arg_15 = (((array_12 = getAll_8(), array_12.length)) | 0), toText(printf("Busy blocks: %d"))(arg_15)), (arg_16 = (((array_13 = getAll_9(), array_13.length)) | 0), toText(printf("Goals: %d"))(arg_16)), "", "📈 Activity", toText(printf("Commands: %d total · %d in 24h · %d in 7d"))(a.Total)(a.Last24h)(a.Last7d), toText(printf("Active users (7d): %d"))(a.ActiveUsers7d), "Top commands:"]), append(topLines, ofArray(["", "⭐ Premium controls", "/admin grant <userId> [days] — comp premium (default 30)", "/admin revoke <userId> — back to free", "/admin premium — list premium users"]))));
    return ctx.reply(text);
}

function parseUserId(args) {
    return bind((s) => {
        let matchValue;
        let outArg = 0;
        matchValue = [tryParse(s, new FSharpRef(() => outArg, (v) => {
            outArg = v;
        })), outArg];
        if (matchValue[0]) {
            return matchValue[1];
        }
        else {
            return undefined;
        }
    }, tryItem(1, args));
}

function notify(ctx, chatId, text) {
    try {
        ctx.telegram.sendMessage(chatId, text);
    }
    catch (matchValue) {
    }
}

function handleGrant(adminId, args, ctx) {
    const matchValue = parseUserId(args);
    if (matchValue != null) {
        const targetId = matchValue;
        const matchValue_1 = find(targetId);
        if (matchValue_1 != null) {
            const user = matchValue_1;
            const days = defaultArg(bind((s) => {
                let matchValue_2;
                let outArg = 0;
                matchValue_2 = [tryParse_1(s, 511, false, 32, new FSharpRef(() => (outArg | 0), (v) => {
                    outArg = (v | 0);
                })), outArg];
                let matchResult;
                if (matchValue_2[0]) {
                    if (matchValue_2[1] > 0) {
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
                    case 0:
                        return matchValue_2[1];
                    default:
                        return undefined;
                }
            }, tryItem(2, args)), 30) | 0;
            const until = grantComp(user, adminId, days);
            info(toText(printf("Admin %.0f granted %d-day premium comp to %s (id %.0f) until %s"))(adminId)(days)(user.FirstName)(targetId)(until));
            notify(ctx, user.ChatId, toText(printf("🎁 You\'ve been given Momentum Premium until %s — enjoy unlimited AI, photo food logging and the monthly deep-dive. Check /status anytime."))(until));
            return ctx.reply(toText(printf("✅ Granted Premium to %s (id %.0f) for %d days — active until %s."))(user.FirstName)(targetId)(days)(until));
        }
        else {
            return ctx.reply(toText(printf("No user with id %.0f — they need to /start the bot first."))(targetId));
        }
    }
    else {
        return ctx.reply("Usage: /admin grant <userId> [days]");
    }
}

function handleRevoke(adminId, args, ctx) {
    const matchValue = parseUserId(args);
    if (matchValue != null) {
        const targetId = matchValue;
        const matchValue_1 = find(targetId);
        if (matchValue_1 != null) {
            const user = matchValue_1;
            revokeComp(user, adminId);
            info(toText(printf("Admin %.0f revoked premium from %s (id %.0f)"))(adminId)(user.FirstName)(targetId));
            return ctx.reply(toText(printf("✅ Revoked Premium from %s (id %.0f). Their data is untouched — they\'re just back on the free tier."))(user.FirstName)(targetId));
        }
        else {
            return ctx.reply(toText(printf("No user with id %.0f."))(targetId));
        }
    }
    else {
        return ctx.reply("Usage: /admin revoke <userId>");
    }
}

function handlePremiumList(config, ctx) {
    let premium;
    const array = getAll();
    premium = array.filter((u) => {
        if (isPremium(config.AdminUserId, u)) {
            return !isExempt(config.AdminUserId, u);
        }
        else {
            return false;
        }
    });
    if (premium.length === 0) {
        return ctx.reply("No paying/comped premium users yet.");
    }
    else {
        const text = join("\n", ofArrayWithTail(["⭐ Premium users", ""], map((u_1) => {
            const until = defaultArg(u_1.PremiumUntil, "?");
            return toText(printf("• %s (id %.0f) — until %s"))(u_1.FirstName)(u_1.Id)(until);
        }, ofArray(premium))));
        return ctx.reply(text);
    }
}

export function handle(config, ctx) {
    let arg_1, arg_2, from, adminId;
    const matchValue = ctx.from;
    const matchValue_1 = config.AdminUserId;
    let matchResult, adminId_1, from_1, from_2;
    if (matchValue != null) {
        if (matchValue_1 != null) {
            if ((from = matchValue, (adminId = matchValue_1, from.id === adminId))) {
                matchResult = 0;
                adminId_1 = matchValue_1;
                from_1 = matchValue;
            }
            else {
                matchResult = 1;
                from_2 = matchValue;
            }
        }
        else {
            matchResult = 1;
            from_2 = matchValue;
        }
    }
    else {
        matchResult = 2;
    }
    switch (matchResult) {
        case 0: {
            const args = commandArgs(ctx);
            const matchValue_3 = map_1((s) => s.toLowerCase(), tryHead(args));
            let matchResult_1, other;
            if (matchValue_3 != null) {
                switch (matchValue_3) {
                    case "grant": {
                        matchResult_1 = 1;
                        break;
                    }
                    case "revoke": {
                        matchResult_1 = 2;
                        break;
                    }
                    case "premium":
                    case "list": {
                        matchResult_1 = 3;
                        break;
                    }
                    default: {
                        matchResult_1 = 4;
                        other = matchValue_3;
                    }
                }
            }
            else {
                matchResult_1 = 0;
            }
            switch (matchResult_1) {
                case 0:
                    return showStats(config, ctx);
                case 1:
                    return handleGrant(adminId_1, args, ctx);
                case 2:
                    return handleRevoke(adminId_1, args, ctx);
                case 3:
                    return handlePremiumList(config, ctx);
                default:
                    return ctx.reply(toText(printf("Unknown admin command \'%s\'. Try: /admin · /admin grant <userId> [days] · /admin revoke <userId> · /admin premium"))(other));
            }
        }
        case 1: {
            warn((arg_1 = from_2.first_name, (arg_2 = from_2.id, toText(printf("Unauthorized /admin attempt by %s (id %.0f)"))(arg_1)(arg_2))));
            return ctx.reply("Sorry, /admin is only available to the bot admin.");
        }
        default:
            return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

