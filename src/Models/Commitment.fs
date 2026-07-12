/// A recurring weekly "busy block" (church every Sunday, class every
/// Tuesday...) that /plan schedules around. Persisted to database/busy.json.
module Models.Commitment

type Commitment =
    { Id: string
      UserId: float
      Name: string
      Day: string // "monday".."sunday" | "daily"
      At: string // "HH:mm"
      Until: string option }

module Days =
    /// Sort key: daily first, then Monday..Sunday.
    let order (day: string) =
        match day with
        | "daily" -> 0
        | "monday" -> 1
        | "tuesday" -> 2
        | "wednesday" -> 3
        | "thursday" -> 4
        | "friday" -> 5
        | "saturday" -> 6
        | _ -> 7 // sunday

    let tryParse (s: string) : string option =
        match s.Trim().ToLowerInvariant() with
        | "monday"
        | "mon" -> Some "monday"
        | "tuesday"
        | "tue"
        | "tues" -> Some "tuesday"
        | "wednesday"
        | "wed" -> Some "wednesday"
        | "thursday"
        | "thu"
        | "thurs" -> Some "thursday"
        | "friday"
        | "fri" -> Some "friday"
        | "saturday"
        | "sat" -> Some "saturday"
        | "sunday"
        | "sun" -> Some "sunday"
        | "daily"
        | "everyday" -> Some "daily"
        | _ -> None

    let fullName (d: System.DayOfWeek) =
        match d with
        | System.DayOfWeek.Monday -> "monday"
        | System.DayOfWeek.Tuesday -> "tuesday"
        | System.DayOfWeek.Wednesday -> "wednesday"
        | System.DayOfWeek.Thursday -> "thursday"
        | System.DayOfWeek.Friday -> "friday"
        | System.DayOfWeek.Saturday -> "saturday"
        | _ -> "sunday"

    /// "Sunday" for display.
    let display (day: string) =
        if day = "daily" then
            "Every day"
        else
            day.Substring(0, 1).ToUpperInvariant() + day.Substring 1

let describe (c: Commitment) =
    let span =
        match c.Until with
        | Some u -> sprintf "%s–%s" c.At u
        | None -> c.At

    sprintf "%s %s — %s" (Days.display c.Day) span c.Name
