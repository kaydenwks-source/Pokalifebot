/// Meal logging types, persisted to database/meals.json.
module Models.Meal

/// AI-estimated nutrition for one described meal.
type Nutrition =
    { Name: string
      Calories: int // kcal
      Protein: float // grams
      Carbs: float
      Fat: float
      Sugar: float
      Fiber: float }

type Meal =
    { Id: string
      UserId: float
      Date: string // "yyyy-MM-dd"
      Time: string // "HH:mm"
      Name: string
      Calories: int
      Protein: float
      Carbs: float
      Fat: float
      Sugar: float
      Fiber: float }
