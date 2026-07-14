
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, int32_type, bool_type, option_type, string_type, float64_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { tryFind, ofArray } from "../fable_modules/fable-library-js.5.7.0/List.js";

export class UserProfile extends Record {
    constructor(Id, ChatId, FirstName, Username, QuoteCategory, QuoteTime, NudgesEnabled, HeightCm, TargetWeightKg, TargetDate, DailyKcalTarget, TzOffsetMinutes, NudgeMorning, NudgeEvening, FreezeWeek, GamificationEnabled, OnboardingStep, OnboardingDone, Tier, PremiumUntil, StarsChargeId, PendingInput) {
        super();
        this.Id = Id;
        this.ChatId = ChatId;
        this.FirstName = FirstName;
        this.Username = Username;
        this.QuoteCategory = QuoteCategory;
        this.QuoteTime = QuoteTime;
        this.NudgesEnabled = NudgesEnabled;
        this.HeightCm = HeightCm;
        this.TargetWeightKg = TargetWeightKg;
        this.TargetDate = TargetDate;
        this.DailyKcalTarget = DailyKcalTarget;
        this.TzOffsetMinutes = TzOffsetMinutes;
        this.NudgeMorning = NudgeMorning;
        this.NudgeEvening = NudgeEvening;
        this.FreezeWeek = FreezeWeek;
        this.GamificationEnabled = GamificationEnabled;
        this.OnboardingStep = OnboardingStep;
        this.OnboardingDone = OnboardingDone;
        this.Tier = Tier;
        this.PremiumUntil = PremiumUntil;
        this.StarsChargeId = StarsChargeId;
        this.PendingInput = PendingInput;
    }
}

export function UserProfile_$reflection() {
    return record_type("Models.User.UserProfile", [], UserProfile, () => [["Id", float64_type], ["ChatId", float64_type], ["FirstName", string_type], ["Username", option_type(string_type)], ["QuoteCategory", string_type], ["QuoteTime", option_type(string_type)], ["NudgesEnabled", option_type(bool_type)], ["HeightCm", option_type(float64_type)], ["TargetWeightKg", option_type(float64_type)], ["TargetDate", option_type(string_type)], ["DailyKcalTarget", option_type(float64_type)], ["TzOffsetMinutes", option_type(float64_type)], ["NudgeMorning", option_type(string_type)], ["NudgeEvening", option_type(string_type)], ["FreezeWeek", option_type(int32_type)], ["GamificationEnabled", option_type(bool_type)], ["OnboardingStep", option_type(int32_type)], ["OnboardingDone", option_type(bool_type)], ["Tier", option_type(string_type)], ["PremiumUntil", option_type(string_type)], ["StarsChargeId", option_type(string_type)], ["PendingInput", option_type(string_type)]]);
}

export const Categories_all = ofArray(["Discipline", "Gym", "Business", "Success", "Study", "Confidence", "Coding", "Life"]);

export const Categories_defaultCategory = "Discipline";

/**
 * Case-insensitive lookup: "gym" -> Some "Gym".
 */
export function Categories_tryFind(input) {
    const needle = input.trim().toLowerCase();
    return tryFind((c) => (c.toLowerCase() === needle), Categories_all);
}

