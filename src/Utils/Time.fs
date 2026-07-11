/// Time parsing/formatting helpers shared across features.
module Utils.Time

/// "7:5" / "07:05" / "23:59" -> normalised "HH:mm", or None if invalid.
let parseTime (raw: string) : string option =
    match raw.Trim().Split(':') with
    | [| h; m |] ->
        match System.Int32.TryParse h, System.Int32.TryParse m with
        | (true, hh), (true, mm) when hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59 ->
            Some(sprintf "%02d:%02d" hh mm)
        | _ -> None
    | _ -> None

/// "23:30" -> minutes since midnight. Only call with normalised "HH:mm".
let toMinutes (time: string) : int =
    match time.Split(':') with
    | [| h; m |] -> int h * 60 + int m
    | _ -> 0

/// 455 -> "7h 35m"
let formatDuration (totalMinutes: int) : string =
    sprintf "%dh %02dm" (totalMinutes / 60) (totalMinutes % 60)

/// process.uptime() seconds -> "1h 4m 09s"
let formatUptime (totalSeconds: float) : string =
    let s = int totalSeconds
    sprintf "%dh %dm %02ds" (s / 3600) ((s % 3600) / 60) (s % 60)

let dayName (date: System.DateTime) : string =
    match date.DayOfWeek with
    | System.DayOfWeek.Monday -> "Mon"
    | System.DayOfWeek.Tuesday -> "Tue"
    | System.DayOfWeek.Wednesday -> "Wed"
    | System.DayOfWeek.Thursday -> "Thu"
    | System.DayOfWeek.Friday -> "Fri"
    | System.DayOfWeek.Saturday -> "Sat"
    | _ -> "Sun"
