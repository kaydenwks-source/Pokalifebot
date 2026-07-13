/// One focus (Pomodoro) session, persisted to database/focus.json once it
/// finishes. In-flight sessions live only in memory (see Services/Focus).
module Models.Focus

type FocusSession =
    { UserId: float
      Date: string // "yyyy-MM-dd" — the day it finished
      StartedAt: string // "HH:mm" local start time
      Minutes: int // length focused (planned length if completed, elapsed if stopped early)
      Completed: bool } // true = ran to the end, false = stopped early
