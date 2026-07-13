/// A journal note and/or mood check-in, persisted to database/journal.json.
/// A single entry can be a mood rating, a written note, or both.
module Models.Reflection

type Reflection =
    { UserId: float
      Date: string // "yyyy-MM-dd" local day
      Stamp: string // "yyyy-MM-dd HH:mm" local — for ordering newest-first
      Mood: int option // 1..5, None when the entry is just a written note
      Text: string option } // free text, None when the entry is just a mood ping
