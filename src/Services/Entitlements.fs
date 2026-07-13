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

/// A user's current local day drives the reset — Phase 14 timezones mean the
/// budget refreshes at *their* midnight, not the server's.
let private today (user: UserProfile) =
    (Time.userNow user.TzOffsetMinutes).ToString("yyyy-MM-dd")

/// The admin is never metered.
let isExempt (adminId: float option) (user: UserProfile) =
    match adminId with
    | Some a -> user.Id = a
    | None -> false

/// May this user spend one AI call? Ok to proceed, or Error with a kind,
/// user-facing message pointing at the midnight reset.
let check (adminId: float option) (user: UserProfile) (_feature: string) : Result<unit, string> =
    if isExempt adminId user then
        Ok()
    else
        let used = Usage.dayTotal user.Id (today user)

        if used >= FreeDailyAiCap then
            Error(
                sprintf
                    "🫶 That's all %d of today's AI requests used up. Your trackers still work normally — the AI features refresh at midnight your time. (Higher limits are coming with Premium.)"
                    FreeDailyAiCap
            )
        else
            Ok()

/// Record one *successful* AI call. Call this only after the AI actually
/// replied, so a failed request never costs the user part of their budget.
let commit (adminId: float option) (user: UserProfile) (feature: string) : unit =
    if not (isExempt adminId user) then
        Usage.incr user.Id (today user) feature

/// Requests left today: None = unlimited (admin), Some n otherwise.
let remaining (adminId: float option) (user: UserProfile) : int option =
    if isExempt adminId user then
        None
    else
        Some(max 0 (FreeDailyAiCap - Usage.dayTotal user.Id (today user)))
