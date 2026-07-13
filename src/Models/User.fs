/// The user profile record persisted to database/users.json.
/// NOTE: use arrays (not F# lists) in stored types — arrays survive
/// the JSON round-trip unchanged, F# lists do not.
module Models.User

type UserProfile =
    { Id: float // Telegram user id
      ChatId: float // where scheduled messages get sent
      FirstName: string
      Username: string option
      QuoteCategory: string
      QuoteTime: string option // "HH:mm" 24h server-local, None = off
      NudgesEnabled: bool option // habit nudges; None = default ON
      HeightCm: float option // for BMI; set via /height
      TargetWeightKg: float option // weight goal; set via /target
      TargetDate: string option // "yyyy-MM-dd" goal deadline
      DailyKcalTarget: float option // computed calorie target
      TzOffsetMinutes: float option // minutes from UTC; None = server time
      NudgeMorning: string option // "HH:mm", default 08:00
      NudgeEvening: string option // "HH:mm", default 19:00
      FreezeWeek: int option // ISO-week index a streak-freeze was last used; None = never
      GamificationEnabled: bool option // XP/levels/badges; None = default ON
      OnboardingStep: int option // the setup step awaiting a reply; None = not mid-onboarding
      OnboardingDone: bool option } // Some true once first-run setup finished

module Categories =
    let all =
        [ "Discipline"
          "Gym"
          "Business"
          "Success"
          "Study"
          "Confidence"
          "Coding"
          "Life" ]

    let defaultCategory = "Discipline"

    /// Case-insensitive lookup: "gym" -> Some "Gym".
    let tryFind (input: string) =
        let needle = input.Trim().ToLowerInvariant()
        all |> List.tryFind (fun c -> c.ToLowerInvariant() = needle)
