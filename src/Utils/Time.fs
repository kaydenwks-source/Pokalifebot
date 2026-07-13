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

/// "+8", "8", "-5:30", "utc+8", "+08:00" -> minutes from UTC.
let parseUtcOffset (raw: string) : float option =
    let s =
        raw.Trim().ToLowerInvariant().Replace("utc", "").Replace("gmt", "").Trim()

    if s = "" then
        None
    else
        let sign = if s.StartsWith "-" then -1.0 else 1.0
        let body = s.TrimStart('+', '-')

        match body.Split(':') with
        | [| h |] ->
            match System.Double.TryParse h with
            | true, hh when hh >= 0.0 && hh <= 14.0 -> Some(sign * hh * 60.0)
            | _ -> None
        | [| h; m |] ->
            match System.Int32.TryParse h, System.Int32.TryParse m with
            | (true, hh), (true, mm) when hh >= 0 && hh <= 14 && mm >= 0 && mm < 60 ->
                Some(sign * float (hh * 60 + mm))
            | _ -> None
        | _ -> None

/// 480.0 -> "UTC+08:00"
let formatOffset (minutes: float) : string =
    let sign = if minutes < 0.0 then "-" else "+"
    let a = abs minutes
    sprintf "UTC%s%02d:%02d" sign (int a / 60) (int a % 60)

/// The user's current local time. None = server time (original behavior).
/// Fixed offsets, no DST — fine for SG and documented for elsewhere.
let userNow (tzOffsetMinutes: float option) : System.DateTime =
    match tzOffsetMinutes with
    | Some minutes -> System.DateTime.UtcNow.AddMinutes minutes
    | None -> System.DateTime.Now

let dayName (date: System.DateTime) : string =
    match date.DayOfWeek with
    | System.DayOfWeek.Monday -> "Mon"
    | System.DayOfWeek.Tuesday -> "Tue"
    | System.DayOfWeek.Wednesday -> "Wed"
    | System.DayOfWeek.Thursday -> "Thu"
    | System.DayOfWeek.Friday -> "Fri"
    | System.DayOfWeek.Saturday -> "Sat"
    | _ -> "Sun"
