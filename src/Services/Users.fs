/// User profile persistence: register users on first contact and manage
/// their preferences. Every command that needs a profile calls upsert
/// first, so a user always exists by the time we act on them.
module Services.Users

open Models.User
open Utils

let private filePath = "database/users.json"

let getAll () : UserProfile[] =
    Storage.load<UserProfile[]> filePath |> Option.defaultValue [||]

let private saveAll (users: UserProfile[]) = Storage.save filePath users

let find (userId: float) : UserProfile option =
    getAll () |> Array.tryFind (fun u -> u.Id = userId)

/// Insert a new user or refresh identity fields, preserving preferences.
let upsert (id: float) (chatId: float) (firstName: string) (username: string option) : UserProfile =
    let users = getAll ()

    match users |> Array.tryFind (fun u -> u.Id = id) with
    | Some existing ->
        let updated =
            { existing with
                ChatId = chatId
                FirstName = firstName
                Username = username }

        saveAll (users |> Array.map (fun u -> if u.Id = id then updated else u))
        updated
    | None ->
        let fresh =
            { Id = id
              ChatId = chatId
              FirstName = firstName
              Username = username
              QuoteCategory = Categories.defaultCategory
              QuoteTime = None
              NudgesEnabled = None
              HeightCm = None
              TargetWeightKg = None
              TargetDate = None
              DailyKcalTarget = None
              TzOffsetMinutes = None
              NudgeMorning = None
              NudgeEvening = None
              FreezeWeek = None
              GamificationEnabled = None
              OnboardingStep = None
              OnboardingDone = None
              Tier = None
              PremiumUntil = None
              StarsChargeId = None
              PendingInput = None }

        saveAll (Array.append users [| fresh |])
        Logger.info (sprintf "New user registered: %s (id %.0f)" firstName id)
        fresh

let private update (id: float) (change: UserProfile -> UserProfile) =
    getAll ()
    |> Array.map (fun u -> if u.Id = id then change u else u)
    |> saveAll

let setCategory (id: float) (category: string) =
    update id (fun u -> { u with QuoteCategory = category })

let setQuoteTime (id: float) (time: string option) =
    update id (fun u -> { u with QuoteTime = time })

let setNudges (id: float) (enabled: bool) =
    update id (fun u -> { u with NudgesEnabled = Some enabled })

let setHeight (id: float) (cm: float) =
    update id (fun u -> { u with HeightCm = Some cm })

let setTarget (id: float) (kg: float) (date: string) (dailyKcal: float) =
    update id (fun u ->
        { u with
            TargetWeightKg = Some kg
            TargetDate = Some date
            DailyKcalTarget = Some dailyKcal })

let clearTarget (id: float) =
    update id (fun u ->
        { u with
            TargetWeightKg = None
            TargetDate = None
            DailyKcalTarget = None })

let setTimezone (id: float) (offsetMinutes: float) =
    update id (fun u -> { u with TzOffsetMinutes = Some offsetMinutes })

let setNudgeMorning (id: float) (time: string) =
    update id (fun u -> { u with NudgeMorning = Some time })

let setNudgeEvening (id: float) (time: string) =
    update id (fun u -> { u with NudgeEvening = Some time })

/// Record that a streak-freeze was used in the given ISO-week index.
let useFreeze (id: float) (weekIndex: int) =
    update id (fun u -> { u with FreezeWeek = Some weekIndex })

/// Nudges default ON — only an explicit "off" disables them.
let nudgesOn (user: Models.User.UserProfile) = user.NudgesEnabled <> Some false

let setGamification (id: float) (enabled: bool) =
    update id (fun u -> { u with GamificationEnabled = Some enabled })

/// Gamification defaults ON — only an explicit "off" disables XP/levels/badges.
let gamificationOn (user: Models.User.UserProfile) = user.GamificationEnabled <> Some false

let setOnboardingStep (id: float) (step: int option) =
    update id (fun u -> { u with OnboardingStep = step })

/// First-run setup finished: clear the step and mark it done for good.
let completeOnboarding (id: float) =
    update id (fun u ->
        { u with
            OnboardingStep = None
            OnboardingDone = Some true })

/// Grant/extend premium: mark the tier, set the new expiry day, and store the
/// Stars charge id (needed later for a refund).
let setPremium (id: float) (until: string) (chargeId: string) =
    update id (fun u ->
        { u with
            Tier = Some "premium"
            PremiumUntil = Some until
            StarsChargeId = chargeId |> (fun c -> if c = "" then u.StarsChargeId else Some c) })

/// Drop a user back to free (a lapse, or a refund). We keep StarsChargeId so
/// support can still look up / refund the last charge if needed.
let clearPremium (id: float) =
    update id (fun u ->
        { u with
            Tier = None
            PremiumUntil = None })

/// A menu "input" action was tapped: remember which one, so the user's next
/// message is routed to it as the value. Cleared once consumed.
let setPendingInput (id: float) (token: string) =
    update id (fun u -> { u with PendingInput = Some token })

let clearPendingInput (id: float) =
    update id (fun u -> { u with PendingInput = None })

/// Users who opted into the daily scheduled quote.
let withDailyQuote () : UserProfile[] =
    getAll () |> Array.filter (fun u -> u.QuoteTime.IsSome)
