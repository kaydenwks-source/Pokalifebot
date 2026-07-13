/// Sleep log persistence and statistics (duration, averages, sleep debt).
module Services.SleepLogs

open Models.Sleep
open Utils

let private filePath = "database/sleep.json"

/// 8h nightly target; becomes a per-user setting in Phase 14.
let targetMinutes = 480

let getAll () : SleepLog[] =
    Storage.load<SleepLog[]> filePath |> Option.defaultValue [||]

let private saveAll (logs: SleepLog[]) = Storage.save filePath logs

/// A user's logs, newest first (ISO dates sort correctly as strings).
let forUser (userId: float) : SleepLog[] =
    getAll ()
    |> Array.filter (fun l -> l.UserId = userId)
    |> Array.sortByDescending (fun l -> l.Date)

let private todayDate () = System.DateTime.Now.ToString("yyyy-MM-dd")

let todayLog (userId: float) : SleepLog option =
    forUser userId |> Array.tryFind (fun l -> l.Date = todayDate ())

/// Log (or overwrite) today's sleep. Crossing midnight is handled:
/// bed 23:30 wake 07:00 = 7h30m. Returns the entry + whether it replaced
/// an earlier entry for today.
let logToday (userId: float) (bedTime: string) (wakeTime: string) : SleepLog * bool =
    let bed = Time.toMinutes bedTime
    let wake = Time.toMinutes wakeTime
    let duration = if wake > bed then wake - bed else wake - bed + 1440

    let entry =
        { UserId = userId
          Date = todayDate ()
          BedTime = bedTime
          WakeTime = wakeTime
          DurationMinutes = duration }

    let all = getAll ()

    let replaced =
        all |> Array.exists (fun l -> l.UserId = userId && l.Date = entry.Date)

    let others =
        all |> Array.filter (fun l -> not (l.UserId = userId && l.Date = entry.Date))

    saveAll (Array.append others [| entry |])
    // Award once per night — re-logging to correct times shouldn't farm XP.
    if not replaced then
        Gamification.award userId Gamification.Points.Sleep

    entry, replaced

type Stats =
    { Count7: int
      Avg7: int
      Debt7: int // positive = short of target, negative = surplus
      Count30: int
      Avg30: int }

let statsFor (userId: float) : Stats option =
    let logs = forUser userId

    if logs.Length = 0 then
        None
    else
        let cutoff days =
            System.DateTime.Now.AddDays(-days).ToString("yyyy-MM-dd")

        let last7 = logs |> Array.filter (fun l -> l.Date > cutoff 7.0)
        let last30 = logs |> Array.filter (fun l -> l.Date > cutoff 30.0)

        let avg (xs: SleepLog[]) =
            if xs.Length = 0 then
                0
            else
                (xs |> Array.sumBy (fun l -> l.DurationMinutes)) / xs.Length

        Some
            { Count7 = last7.Length
              Avg7 = avg last7
              Debt7 = last7 |> Array.sumBy (fun l -> targetMinutes - l.DurationMinutes)
              Count30 = last30.Length
              Avg30 = avg last30 }
