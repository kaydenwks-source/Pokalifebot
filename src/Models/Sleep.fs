/// One night of sleep, persisted to database/sleep.json.
module Models.Sleep

type SleepLog =
    { UserId: float
      Date: string // wake date "yyyy-MM-dd" — the day the entry was logged
      BedTime: string // "HH:mm"
      WakeTime: string // "HH:mm"
      DurationMinutes: int }
