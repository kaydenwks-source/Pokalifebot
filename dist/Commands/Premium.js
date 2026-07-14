
import { printf, toText, join } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { singleton, append, delay, toList } from "../fable_modules/fable-library-js.5.7.0/Seq.js";
import { ensureUser } from "./Common.js";
import { remaining, isExempt, isPremium } from "../Services/Entitlements.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { ofArray } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { bind, defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { info, warn } from "../Utils/Logger.js";
import { grantPremium } from "../Services/Payments.js";

const benefits = join("\n", ["⭐ Momentum Premium", "", "Everything you already track stays free and unlimited. Premium removes the", "daily cap on the AI features and unlocks the deeper ones:", "", "• Unlimited AI coaching, planning and food logging", "• 📸 Photo food logging", "• 📅 Monthly deep-dive report + productivity score", "• Priority when the AI is busy", "", toText(printf("%d ⭐ for 30 days. Renew anytime — days stack, they don\'t reset."))(150)]);

function invoiceFor(userId) {
    return {
        title: "Momentum Premium",
        description: "Unlimited AI coaching, planning, photo food logging and monthly deep-dives for 30 days.",
        payload: toText(printf("premium:%.0f"))(userId),
        provider_token: "",
        currency: "XTR",
        prices: [{
            label: "Premium — 30 days",
            amount: 150,
        }],
    };
}

function premiumStatusText(until) {
    return join("\n", toList(delay(() => append(singleton("⭐ You\'re on Momentum Premium — thank you! 💛"), delay(() => append(singleton(""), delay(() => {
        let matchValue, d;
        return append((matchValue = until, (matchValue == null) ? singleton("Active.") : ((d = matchValue, singleton(toText(printf("Active until %s (with a few days\' grace after)."))(d))))), delay(() => append(singleton(""), delay(() => append(singleton("Every AI feature is unlimited, plus photo food logging and the monthly"), delay(() => singleton("deep-dive. Nothing to do — just keep going.")))))));
    })))))));
}

export function handle(config, ctx) {
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        if (isPremium(config.AdminUserId, user)) {
            return ctx.reply(premiumStatusText(user.PremiumUntil));
        }
        else {
            return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (ctx.reply(benefits).then((_arg) => (ctx.replyWithInvoice(invoiceFor(user.Id)))))));
        }
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

export function handleStatus(config, ctx) {
    let matchValue_1, d, left;
    const matchValue = ensureUser(ctx);
    if (matchValue != null) {
        const user = matchValue;
        const text = join("\n", isPremium(config.AdminUserId, user) ? ofArray(["📋 Your plan", "", isExempt(config.AdminUserId, user) ? "Premium ✨ (admin)" : ((matchValue_1 = user.PremiumUntil, (matchValue_1 == null) ? "Premium ⭐" : ((d = matchValue_1, toText(printf("Premium ⭐ — active until %s"))(d))))), "AI features: unlimited", "Trackers: unlimited (always)"]) : ((left = (defaultArg(remaining(config.AdminUserId, user), 0) | 0), ofArray(["📋 Your plan", "", "Free", toText(printf("AI features left today: %d of %d (resets at midnight, your time)"))(left)(25), "Trackers: unlimited (always)", "", "Want no limits + photo food logging + monthly deep-dives? /premium"]))));
        return ctx.reply(text);
    }
    else {
        return ctx.reply("Sorry, I couldn\'t identify you — please try again.");
    }
}

/**
 * Telegram asks us to approve the charge (within 10s). We only ever issue
 * premium invoices, so we approve ours and log anything unexpected.
 */
export function handlePreCheckout(ctx) {
    let q, arg;
    const matchValue = ctx.preCheckoutQuery;
    if (matchValue == null) {
        return ctx.answerPreCheckoutQuery(true);
    }
    else if ((q = matchValue, q.invoice_payload.startsWith("premium:"))) {
        const q_1 = matchValue;
        return ctx.answerPreCheckoutQuery(true);
    }
    else {
        const q_2 = matchValue;
        warn((arg = q_2.invoice_payload, toText(printf("Pre-checkout with unexpected payload: %s"))(arg)));
        return ctx.answerPreCheckoutQuery(true);
    }
}

/**
 * The trusted confirmation. This — and only this — grants premium.
 */
export function handleSuccessfulPayment(_config, ctx) {
    let arg_3;
    const matchValue = ensureUser(ctx);
    const matchValue_1 = bind((m) => m.successful_payment, ctx.message);
    let matchResult, pay, user;
    if (matchValue != null) {
        if (matchValue_1 != null) {
            matchResult = 0;
            pay = matchValue_1;
            user = matchValue;
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
            const until = grantPremium(user, pay.telegram_payment_charge_id, ~~pay.total_amount, "one_time");
            info((arg_3 = pay.telegram_payment_charge_id, toText(printf("Premium granted to %s (id %.0f) until %s (charge %s)"))(user.FirstName)(user.Id)(until)(arg_3)));
            return ctx.reply(join("\n", ["🎉 Payment received — you\'re Premium!", "", toText(printf("Active until %s. Every AI feature is now unlimited, and photo"))(until), "food logging + the monthly deep-dive are unlocked.", "", "Thank you for supporting Momentum. 💛"]));
        }
        default:
            return ctx.reply("✅ Payment received — thank you! If your Premium isn\'t active in a minute, please reach out and we\'ll sort it.");
    }
}

