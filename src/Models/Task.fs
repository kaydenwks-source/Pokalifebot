/// A to-do item, persisted to database/tasks.json.
module Models.Task

type TaskItem =
    { Id: string
      UserId: float
      Text: string
      Priority: string // "high" | "medium" | "low"
      Done: bool
      CreatedAt: string // "yyyy-MM-dd HH:mm"
      DoneAt: string option }

module Priority =
    /// Sort order: high first.
    let rank =
        function
        | "high" -> 0
        | "medium" -> 1
        | _ -> 2

    let marker =
        function
        | "high" -> "🔴"
        | "medium" -> "🟡"
        | _ -> "🟢"

    /// Accepts "!high", "high", "!h", "med", "!low", "l", ...
    let tryParse (s: string) =
        match s.Trim().ToLowerInvariant().TrimStart('!') with
        | "high"
        | "h" -> Some "high"
        | "medium"
        | "med"
        | "m" -> Some "medium"
        | "low"
        | "l" -> Some "low"
        | _ -> None
