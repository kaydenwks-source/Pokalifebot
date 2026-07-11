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
      QuoteTime: string option } // "HH:mm" 24h server-local, None = off

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
