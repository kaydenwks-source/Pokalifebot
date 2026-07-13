/// A quantified personal goal, persisted to database/goals.json.
module Models.Goal

type Goal =
    { Id: string
      UserId: float
      Name: string // display name, e.g. "Read 20 books"
      TargetValue: float
      Unit: string // "books", "km", "$"... empty for yes/no goals
      Progress: float
      CreatedAt: string // "yyyy-MM-dd"
      CompletedAt: string option
      Steps: string[] option // AI coach's 5-step path (older goals: None)
      Absolute: bool option } // Some true = ordered/position goal (log the point reached, e.g. chapter 3 -> 3/12); None/false = cumulative (log adds up)
