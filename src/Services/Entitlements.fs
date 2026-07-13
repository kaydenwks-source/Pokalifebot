/// The AI-budget gate (Phase 19). ONE place decides whether a user may spend
/// an AI call right now, so cost control lives in a single spot instead of
/// being scattered through every command. Shaped to match the Premium design
/// in docs/PREMIUM-ARCHITECTURE.md: the same check/commit becomes the free vs
/// premium boundary once payments ship (Phase 26).
module Services.Entitlements

open Models.User
open Utils

/// Free daily allowance of AI-backed requests (coach, food, plan, progress,
/// goal, quote). Generous for one real user; a wall for a runaway/spammer.
/// Local trackers (habits, tasks, weight, …) are never counted or capped.
[<Literal>]
let FreeDailyAiCap = 25

/// Days we keep premium features live past PremiumUntil, so a renewal that is
/// a day or two late doesn't abruptly downgrade the user (design §8).
[<Literal>]
let GraceDays = 3

/// A user's current local day drives the reset — Phase 14 timezones mean the
/// budget refreshes at *their* midnight, not the server's.
let private today (user: UserProfile) =
    (Time.userNow user.TzOffsetMinutes).ToString("yyyy-MM-dd")

/// The admin is never metered.
let isExempt (adminId: float option) (user: UserProfile) =
    match adminId with
    | Some a -> user.Id = a
    | None -> false

/// Is this user premium *right now*? Admin is always premium. Otherwise the
/// tier must be "premium" and today (their local day) must still be within the
/// PremiumUntil date plus the grace window.
let isPremium (adminId: float option) (user: UserProfile) : bool =
    if isExempt adminId user then
        true
    else
        match user.Tier, user.PremiumUntil |> Option.bind Time.parseDay with
        | Some "premium", Some until ->
            let localDay = (Time.userNow user.TzOffsetMinutes).Date
            localDay <= until.AddDays(float GraceDays)
        | _ -> false

/// May this user spend one AI call? Ok to proceed, or Error with a kind,
/// user-facing message. Premium (and admin) are never capped.
let check (adminId: float option) (user: UserProfile) (_feature: string) : Result<unit, string> =
    if isPremium adminId user then
        Ok()
    else
        let used = Usage.dayTotal user.Id (today user)

        if used >= FreeDailyAiCap then
            Error(
                sprintf
                    "🫶 That's all %d of today's free AI requests used up. Your trackers still work normally — the AI features refresh at midnight your time. Want no limits? /premium unlocks unlimited AI."
                    FreeDailyAiCap
            )
        else
            Ok()

/// Record one *successful* AI call. Call this only after the AI actually
/// replied, so a failed request never costs the user part of their budget.
/// Premium/admin users aren't metered.
let commit (adminId: float option) (user: UserProfile) (feature: string) : unit =
    if not (isPremium adminId user) then
        Usage.incr user.Id (today user) feature

/// Requests left today: None = unlimited (premium/admin), Some n otherwise.
let remaining (adminId: float option) (user: UserProfile) : int option =
    if isPremium adminId user then
        None
    else
        Some(max 0 (FreeDailyAiCap - Usage.dayTotal user.Id (today user)))
