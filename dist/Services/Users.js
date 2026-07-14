
import { defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { save, load } from "./Storage.js";
import { map, append, tryFind } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { UserProfile, Categories_defaultCategory } from "../Models/User.js";
import { info } from "../Utils/Logger.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { equals } from "../fable_modules/fable-library-js.5.7.0/Util.js";

const filePath = "database/users.json";

export function getAll() {
    return defaultArg(load(filePath), []);
}

function saveAll(users) {
    save(filePath, users);
}

export function find(userId) {
    return tryFind((u) => (u.Id === userId), getAll());
}

/**
 * Insert a new user or refresh identity fields, preserving preferences.
 */
export function upsert(id, chatId, firstName, username) {
    const users = getAll();
    const matchValue = tryFind((u) => (u.Id === id), users);
    if (matchValue == null) {
        const fresh = new UserProfile(id, chatId, firstName, username, Categories_defaultCategory, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
        saveAll(append(users, [fresh]));
        info(toText(printf("New user registered: %s (id %.0f)"))(firstName)(id));
        return fresh;
    }
    else {
        const existing = matchValue;
        const updated = new UserProfile(existing.Id, chatId, firstName, username, existing.QuoteCategory, existing.QuoteTime, existing.NudgesEnabled, existing.HeightCm, existing.TargetWeightKg, existing.TargetDate, existing.DailyKcalTarget, existing.TzOffsetMinutes, existing.NudgeMorning, existing.NudgeEvening, existing.FreezeWeek, existing.GamificationEnabled, existing.OnboardingStep, existing.OnboardingDone, existing.Tier, existing.PremiumUntil, existing.StarsChargeId, existing.PendingInput);
        saveAll(map((u_1) => {
            if (u_1.Id === id) {
                return updated;
            }
            else {
                return u_1;
            }
        }, users));
        return updated;
    }
}

function update(id, change) {
    saveAll(map((u) => {
        if (u.Id === id) {
            return change(u);
        }
        else {
            return u;
        }
    }, getAll()));
}

export function setCategory(id, category) {
    update(id, (u) => (new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, category, u.QuoteTime, u.NudgesEnabled, u.HeightCm, u.TargetWeightKg, u.TargetDate, u.DailyKcalTarget, u.TzOffsetMinutes, u.NudgeMorning, u.NudgeEvening, u.FreezeWeek, u.GamificationEnabled, u.OnboardingStep, u.OnboardingDone, u.Tier, u.PremiumUntil, u.StarsChargeId, u.PendingInput)));
}

export function setQuoteTime(id, time) {
    update(id, (u) => (new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, u.QuoteCategory, time, u.NudgesEnabled, u.HeightCm, u.TargetWeightKg, u.TargetDate, u.DailyKcalTarget, u.TzOffsetMinutes, u.NudgeMorning, u.NudgeEvening, u.FreezeWeek, u.GamificationEnabled, u.OnboardingStep, u.OnboardingDone, u.Tier, u.PremiumUntil, u.StarsChargeId, u.PendingInput)));
}

export function setNudges(id, enabled) {
    update(id, (u) => (new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, u.QuoteCategory, u.QuoteTime, enabled, u.HeightCm, u.TargetWeightKg, u.TargetDate, u.DailyKcalTarget, u.TzOffsetMinutes, u.NudgeMorning, u.NudgeEvening, u.FreezeWeek, u.GamificationEnabled, u.OnboardingStep, u.OnboardingDone, u.Tier, u.PremiumUntil, u.StarsChargeId, u.PendingInput)));
}

export function setHeight(id, cm) {
    update(id, (u) => (new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, u.QuoteCategory, u.QuoteTime, u.NudgesEnabled, cm, u.TargetWeightKg, u.TargetDate, u.DailyKcalTarget, u.TzOffsetMinutes, u.NudgeMorning, u.NudgeEvening, u.FreezeWeek, u.GamificationEnabled, u.OnboardingStep, u.OnboardingDone, u.Tier, u.PremiumUntil, u.StarsChargeId, u.PendingInput)));
}

export function setTarget(id, kg, date, dailyKcal) {
    update(id, (u) => (new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, u.QuoteCategory, u.QuoteTime, u.NudgesEnabled, u.HeightCm, kg, date, dailyKcal, u.TzOffsetMinutes, u.NudgeMorning, u.NudgeEvening, u.FreezeWeek, u.GamificationEnabled, u.OnboardingStep, u.OnboardingDone, u.Tier, u.PremiumUntil, u.StarsChargeId, u.PendingInput)));
}

export function clearTarget(id) {
    update(id, (u) => (new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, u.QuoteCategory, u.QuoteTime, u.NudgesEnabled, u.HeightCm, undefined, undefined, undefined, u.TzOffsetMinutes, u.NudgeMorning, u.NudgeEvening, u.FreezeWeek, u.GamificationEnabled, u.OnboardingStep, u.OnboardingDone, u.Tier, u.PremiumUntil, u.StarsChargeId, u.PendingInput)));
}

export function setTimezone(id, offsetMinutes) {
    update(id, (u) => (new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, u.QuoteCategory, u.QuoteTime, u.NudgesEnabled, u.HeightCm, u.TargetWeightKg, u.TargetDate, u.DailyKcalTarget, offsetMinutes, u.NudgeMorning, u.NudgeEvening, u.FreezeWeek, u.GamificationEnabled, u.OnboardingStep, u.OnboardingDone, u.Tier, u.PremiumUntil, u.StarsChargeId, u.PendingInput)));
}

export function setNudgeMorning(id, time) {
    update(id, (u) => (new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, u.QuoteCategory, u.QuoteTime, u.NudgesEnabled, u.HeightCm, u.TargetWeightKg, u.TargetDate, u.DailyKcalTarget, u.TzOffsetMinutes, time, u.NudgeEvening, u.FreezeWeek, u.GamificationEnabled, u.OnboardingStep, u.OnboardingDone, u.Tier, u.PremiumUntil, u.StarsChargeId, u.PendingInput)));
}

export function setNudgeEvening(id, time) {
    update(id, (u) => (new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, u.QuoteCategory, u.QuoteTime, u.NudgesEnabled, u.HeightCm, u.TargetWeightKg, u.TargetDate, u.DailyKcalTarget, u.TzOffsetMinutes, u.NudgeMorning, time, u.FreezeWeek, u.GamificationEnabled, u.OnboardingStep, u.OnboardingDone, u.Tier, u.PremiumUntil, u.StarsChargeId, u.PendingInput)));
}

/**
 * Record that a streak-freeze was used in the given ISO-week index.
 */
export function useFreeze(id, weekIndex) {
    update(id, (u) => (new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, u.QuoteCategory, u.QuoteTime, u.NudgesEnabled, u.HeightCm, u.TargetWeightKg, u.TargetDate, u.DailyKcalTarget, u.TzOffsetMinutes, u.NudgeMorning, u.NudgeEvening, weekIndex, u.GamificationEnabled, u.OnboardingStep, u.OnboardingDone, u.Tier, u.PremiumUntil, u.StarsChargeId, u.PendingInput)));
}

/**
 * Nudges default ON — only an explicit "off" disables them.
 */
export function nudgesOn(user) {
    return !equals(user.NudgesEnabled, false);
}

export function setGamification(id, enabled) {
    update(id, (u) => (new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, u.QuoteCategory, u.QuoteTime, u.NudgesEnabled, u.HeightCm, u.TargetWeightKg, u.TargetDate, u.DailyKcalTarget, u.TzOffsetMinutes, u.NudgeMorning, u.NudgeEvening, u.FreezeWeek, enabled, u.OnboardingStep, u.OnboardingDone, u.Tier, u.PremiumUntil, u.StarsChargeId, u.PendingInput)));
}

/**
 * Gamification defaults ON — only an explicit "off" disables XP/levels/badges.
 */
export function gamificationOn(user) {
    return !equals(user.GamificationEnabled, false);
}

export function setOnboardingStep(id, step) {
    update(id, (u) => (new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, u.QuoteCategory, u.QuoteTime, u.NudgesEnabled, u.HeightCm, u.TargetWeightKg, u.TargetDate, u.DailyKcalTarget, u.TzOffsetMinutes, u.NudgeMorning, u.NudgeEvening, u.FreezeWeek, u.GamificationEnabled, step, u.OnboardingDone, u.Tier, u.PremiumUntil, u.StarsChargeId, u.PendingInput)));
}

/**
 * First-run setup finished: clear the step and mark it done for good.
 */
export function completeOnboarding(id) {
    update(id, (u) => (new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, u.QuoteCategory, u.QuoteTime, u.NudgesEnabled, u.HeightCm, u.TargetWeightKg, u.TargetDate, u.DailyKcalTarget, u.TzOffsetMinutes, u.NudgeMorning, u.NudgeEvening, u.FreezeWeek, u.GamificationEnabled, undefined, true, u.Tier, u.PremiumUntil, u.StarsChargeId, u.PendingInput)));
}

/**
 * Grant/extend premium: mark the tier, set the new expiry day, and store the
 * Stars charge id (needed later for a refund).
 */
export function setPremium(id, until, chargeId) {
    update(id, (u) => {
        let c;
        return new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, u.QuoteCategory, u.QuoteTime, u.NudgesEnabled, u.HeightCm, u.TargetWeightKg, u.TargetDate, u.DailyKcalTarget, u.TzOffsetMinutes, u.NudgeMorning, u.NudgeEvening, u.FreezeWeek, u.GamificationEnabled, u.OnboardingStep, u.OnboardingDone, "premium", until, (c = chargeId, (c === "") ? u.StarsChargeId : c), u.PendingInput);
    });
}

/**
 * Drop a user back to free (a lapse, or a refund). We keep StarsChargeId so
 * support can still look up / refund the last charge if needed.
 */
export function clearPremium(id) {
    update(id, (u) => (new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, u.QuoteCategory, u.QuoteTime, u.NudgesEnabled, u.HeightCm, u.TargetWeightKg, u.TargetDate, u.DailyKcalTarget, u.TzOffsetMinutes, u.NudgeMorning, u.NudgeEvening, u.FreezeWeek, u.GamificationEnabled, u.OnboardingStep, u.OnboardingDone, undefined, undefined, u.StarsChargeId, u.PendingInput)));
}

/**
 * A menu "input" action was tapped: remember which one, so the user's next
 * message is routed to it as the value. Cleared once consumed.
 */
export function setPendingInput(id, token) {
    update(id, (u) => (new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, u.QuoteCategory, u.QuoteTime, u.NudgesEnabled, u.HeightCm, u.TargetWeightKg, u.TargetDate, u.DailyKcalTarget, u.TzOffsetMinutes, u.NudgeMorning, u.NudgeEvening, u.FreezeWeek, u.GamificationEnabled, u.OnboardingStep, u.OnboardingDone, u.Tier, u.PremiumUntil, u.StarsChargeId, token)));
}

export function clearPendingInput(id) {
    update(id, (u) => (new UserProfile(u.Id, u.ChatId, u.FirstName, u.Username, u.QuoteCategory, u.QuoteTime, u.NudgesEnabled, u.HeightCm, u.TargetWeightKg, u.TargetDate, u.DailyKcalTarget, u.TzOffsetMinutes, u.NudgeMorning, u.NudgeEvening, u.FreezeWeek, u.GamificationEnabled, u.OnboardingStep, u.OnboardingDone, u.Tier, u.PremiumUntil, u.StarsChargeId, undefined)));
}

/**
 * Users who opted into the daily scheduled quote.
 */
export function withDailyQuote() {
    const array = getAll();
    return array.filter((u) => (u.QuoteTime != null));
}

