/// One day's body measurements, persisted to database/weights.json.
/// Fields are independent — a day can have weight without body fat etc.
module Models.Weight

type WeightLog =
    { UserId: float
      Date: string // "yyyy-MM-dd" — one entry per user per day
      Kg: float option
      BodyFat: float option // percent
      MuscleKg: float option } // reserved for later; no command yet
