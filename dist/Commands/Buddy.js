
import { map, defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { find } from "../Services/Users.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { levelFor, xpFor } from "../Services/Gamification.js";
import { streaksForHabit, forUser } from "../Services/Habits.js";
import { item, map as map_1, max } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { comparePrimitives } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { second, now, addDays, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { forUser as forUser_1 } from "../Services/Workouts.js";
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { commandArgs, ensureUser } from "./Common.js";
import { unpair, accept, createInvite, buddyOf } from "../Services/Buddies.js";
import { info } from "../Utils/Logger.js";

const cheers = ["is cheering you on — go grab today\'s wins! 💪", "just checked in on you. Keep the streak alive! 🔥", "believes in you. One small action, right now. 👊", "says: don\'t break the chain today! ⛓️"];

function nameOf(id) {
    return defaultArg(map((u) => u.FirstName, find(id)), "your buddy");
}

function notify(ctx, chatId, text) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (PromiseBuilder__Delay_62FBFDE1(promise, () => (ctx.telegram.sendMessage(chatId, text).then((_arg) => (Promise.resolve(undefined))))).catch((_arg_1) => (Promise.resolve(undefined))))));
}

function buddyCard(id) {
    let arg, arg_1, arg_6;
    const xp = xpFor(id) | 0;
    const lvl = levelFor(xp);
    const habits = forUser(id);
    const bestStreak = ((habits.length === 0) ? 0 : max(map_1((h) => (streaksForHabit(h).Current | 0), habits, Int32Array), {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    })) | 0;
    let doneThisPeriod;
    const array_3 = habits.filter((h_1) => streaksForHabit(h_1).DoneThisPeriod);
    doneThisPeriod = array_3.length;
    const cutoff = toString(addDays(now(), -7), "yyyy-MM-dd");
    let workouts;
    let array_5;
    const array_4 = forUser_1(id);
    array_5 = array_4.filter((w) => (w.Date > cutoff));
    workouts = array_5.length;
    return join("\n", [(arg = nameOf(id), toText(printf("🤝 %s\'s momentum"))(arg)), (arg_1 = ((lvl.Index + 1) | 0), toText(printf("🎮 Level %d — %s (%d XP)"))(arg_1)(lvl.Name)(xp)), (arg_6 = (habits.length | 0), toText(printf("🔥 Best streak: %d · ✅ %d/%d habits done this period"))(bestStreak)(doneThisPeriod)(arg_6)), toText(printf("🏋️ %d workouts in the last 7 days"))(workouts)]);
}

export function handle(ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        let arg, matchValue_4, inv, matchValue_8, b_1;
        const matchValue = ensureUser(ctx);
        if (matchValue != null) {
            const user = matchValue;
            const args = commandArgs(ctx);
            const sub = (args.length > 0) ? item(0, args).toLowerCase() : "";
            switch (sub) {
                case "": {
                    const matchValue_1 = buddyOf(user.Id);
                    if (matchValue_1 == null) {
                        return ctx.reply("🤝 No accountability buddy yet.\n\nA buddy can see your streaks and cheer you on — and you theirs.\n\n• /buddy invite — get a code to share with a friend\n• /buddy accept <code> — join with a code they gave you");
                    }
                    else {
                        const bId = matchValue_1;
                        return ctx.reply(buddyCard(bId) + "\n\n👊 Cheer them on: /buddy nudge · Unpair: /buddy remove");
                    }
                }
                case "invite": {
                    const matchValue_2 = buddyOf(user.Id);
                    if (matchValue_2 == null) {
                        const code = createInvite(user.Id);
                        info(toText(printf("%s created a buddy invite"))(user.FirstName));
                        return ctx.reply(toText(printf("🤝 Your buddy code: %s\n\nShare it with a friend who also uses me. They pair by sending:\n/buddy accept %s\n\nOne buddy at a time — the code stops working once someone joins."))(code)(code));
                    }
                    else {
                        const bId_1 = matchValue_2;
                        return ctx.reply((arg = nameOf(bId_1), toText(printf("You\'re already paired with %s. Unpair first with /buddy remove."))(arg)));
                    }
                }
                case "accept": {
                    const matchValue_3 = accept((args.length > 1) ? item(1, args) : "", user.Id);
                    switch (matchValue_3.tag) {
                        case 2:
                            return ctx.reply("That\'s your own code 🙂 — share it with someone else.");
                        case 3:
                            return ctx.reply("You already have a buddy. Unpair with /buddy remove to switch.");
                        case 4:
                            return ctx.reply("Too late — they\'ve already paired with someone else.");
                        case 0: {
                            const inviterId = matchValue_3.fields[0];
                            info(toText(printf("%s paired as a buddy with %.0f"))(user.FirstName)(inviterId));
                            return ((matchValue_4 = find(inviterId), (matchValue_4 == null) ? (Promise.resolve()) : ((inv = matchValue_4, notify(ctx, inv.ChatId, toText(printf("🤝 %s accepted your buddy invite! You\'re accountability partners now. See their progress: /buddy"))(user.FirstName)).then(() => (Promise.resolve(undefined))))))).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => {
                                let arg_7;
                                return ctx.reply((arg_7 = nameOf(inviterId), toText(printf("🎉 You\'re now accountability buddies with %s! See their momentum anytime: /buddy"))(arg_7)));
                            }));
                        }
                        default:
                            return ctx.reply("That code isn\'t valid (or was already used). Ask your friend for a fresh /buddy invite code.");
                    }
                }
                case "nudge":
                case "cheer": {
                    const matchValue_5 = buddyOf(user.Id);
                    if (matchValue_5 != null) {
                        const matchValue_6 = find(matchValue_5);
                        if (matchValue_6 == null) {
                            return ctx.reply("Couldn\'t reach your buddy right now — try again shortly.");
                        }
                        else {
                            const b = matchValue_6;
                            const cheer = item(second(now()) % cheers.length, cheers);
                            return notify(ctx, b.ChatId, toText(printf("👋 Your buddy %s %s"))(user.FirstName)(cheer)).then(() => {
                                info(toText(printf("%s nudged buddy %s"))(user.FirstName)(b.FirstName));
                                return ctx.reply(toText(printf("Sent a cheer to %s 👊"))(b.FirstName));
                            });
                        }
                    }
                    else {
                        return ctx.reply("No buddy to cheer yet. /buddy invite to pair up.");
                    }
                }
                case "remove":
                case "unpair": {
                    const matchValue_7 = unpair(user.Id);
                    if (matchValue_7 == null) {
                        return ctx.reply("You don\'t have a buddy to remove.");
                    }
                    else {
                        const bId_3 = matchValue_7;
                        return ((matchValue_8 = find(bId_3), (matchValue_8 == null) ? (Promise.resolve()) : ((b_1 = matchValue_8, notify(ctx, b_1.ChatId, toText(printf("🤝 %s ended the buddy pairing. You can pair with someone new via /buddy invite."))(user.FirstName)).then(() => (Promise.resolve(undefined))))))).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => {
                            let arg_14;
                            return ctx.reply((arg_14 = nameOf(bId_3), toText(printf("Unpaired from %s. /buddy invite to pair with someone new."))(arg_14)));
                        }));
                    }
                }
                default:
                    return ctx.reply("Usage: /buddy · /buddy invite · /buddy accept <code> · /buddy nudge · /buddy remove");
            }
        }
        else {
            return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
        }
    }));
}

