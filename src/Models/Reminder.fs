/// A scheduled reminder, persisted to database/reminders.json.
module Models.Reminder

type Reminder =
    { Id: string // short random id, stable across list re-ordering
      UserId: float
      ChatId: float
      Text: string
      DueDate: string // next occurrence, "yyyy-MM-dd"
      DueTime: string // "HH:mm" 24h server-local
      Repeat: string // "once" | "daily" | "weekly" | "monthly" | "days:N"
      CreatedAt: string }

let describeRepeat (repeat: string) =
    match repeat with
    | "once" -> "one-time"
    | "daily" -> "repeats daily"
    | "weekly" -> "repeats weekly"
    | "monthly" -> "repeats monthly"
    | s when s.StartsWith "days:" -> sprintf "repeats every %s days" (s.Substring 5)
    | other -> other
