/// A to-do item, persisted to database/tasks.json.
module Models.Task

type TaskItem =
    { Id: string
      UserId: float
      Text: string
      Priority: string // "high" | "medium" | "low"
      Done: bool
      CreatedAt: string // "yyyy-MM-dd HH:mm"
      DoneAt: string option
      At: string option // fixed start "HH:mm" — /plan treats as immovable
      Until: string option } // fixed end "HH:mm", only with At

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

module Schedule =
    /// "@14:00" -> Some("14:00", None); "@09:00-15:30" -> Some with end.
    /// Anything else (including invalid times) -> None.
    let tryParseToken (token: string) : (string * string option) option =
        if not (token.StartsWith "@") then
            None
        else
            match token.Substring(1).Split('-') with
            | [| single |] -> Utils.Time.parseTime single |> Option.map (fun t -> t, None)
            | [| startRaw; endRaw |] ->
                match Utils.Time.parseTime startRaw, Utils.Time.parseTime endRaw with
                | Some s, Some e -> Some(s, Some e)
                | _ -> None
            | _ -> None

/// " 🕐 14:00–15:30" suffix for timed tasks, "" otherwise.
let timeLabel (t: TaskItem) =
    match t.At, t.Until with
    | Some a, Some u -> sprintf " 🕐 %s–%s" a u
    | Some a, None -> sprintf " 🕐 %s" a
    | _ -> ""
