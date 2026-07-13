/// A tracked habit with its check-in history, persisted to database/habits.json.
module Models.Habit

type Habit =
    { Id: string
      UserId: float
      Name: string
      Cadence: string // "daily" | "weekly" | "monthly"
      CreatedAt: string // "yyyy-MM-dd"
      Completions: string[] // check-in dates "yyyy-MM-dd"
      // Periods protected by a spent streak-freeze token, kept SEPARATE from
      // real check-ins so exports stay honest. None on pre-Phase-23.5 rows.
      Frozen: string[] option }

module Cadence =
    let all = [ "daily"; "weekly"; "monthly" ]

    let tryNormalise (s: string) =
        all |> List.tryFind (fun c -> c = s.Trim().ToLowerInvariant())

    /// Unit word for streak counts: daily -> "day(s)", weekly -> "week(s)".
    let streakUnit (cadence: string) (n: int) =
        let unit =
            match cadence with
            | "weekly" -> "week"
            | "monthly" -> "month"
            | _ -> "day"

        if n = 1 then unit else unit + "s"

    /// "today" / "this week" / "this month" — the current check-in window.
    let periodPhrase (cadence: string) =
        match cadence with
        | "weekly" -> "this week"
        | "monthly" -> "this month"
        | _ -> "today"
