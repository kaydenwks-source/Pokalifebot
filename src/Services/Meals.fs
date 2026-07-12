/// Meal persistence and daily/weekly/monthly nutrition totals.
module Services.Meals

open Models.Meal

let private filePath = "database/meals.json"

let getAll () : Meal[] =
    Storage.load<Meal[]> filePath |> Option.defaultValue [||]

let private saveAll (meals: Meal[]) = Storage.save filePath meals

let add (userId: float) (n: Nutrition) : Meal =
    let now = System.DateTime.Now

    let meal =
        { Id = System.Guid.NewGuid().ToString().Substring(0, 8)
          UserId = userId
          Date = now.ToString("yyyy-MM-dd")
          Time = now.ToString("HH:mm")
          Name = n.Name
          Calories = n.Calories
          Protein = n.Protein
          Carbs = n.Carbs
          Fat = n.Fat
          Sugar = n.Sugar
          Fiber = n.Fiber }

    saveAll (Array.append (getAll ()) [| meal |])
    meal

let onDate (userId: float) (date: string) : Meal[] =
    getAll ()
    |> Array.filter (fun m -> m.UserId = userId && m.Date = date)
    |> Array.sortBy (fun m -> m.Time)

/// Remove the most recently logged meal from today (typo insurance).
let deleteLastToday (userId: float) : Meal option =
    let today = System.DateTime.Now.ToString("yyyy-MM-dd")

    let todays =
        getAll () |> Array.filter (fun m -> m.UserId = userId && m.Date = today)

    if todays.Length = 0 then
        None
    else
        let last = todays.[todays.Length - 1]
        saveAll (getAll () |> Array.filter (fun m -> m.Id <> last.Id))
        Some last

type DayTotals =
    { Date: string
      Meals: int
      Calories: int
      Protein: float
      Carbs: float
      Fat: float
      Sugar: float
      Fiber: float }

let private totalsOf (date: string) (meals: Meal[]) : DayTotals =
    { Date = date
      Meals = meals.Length
      Calories = meals |> Array.sumBy (fun m -> m.Calories)
      Protein = meals |> Array.sumBy (fun m -> m.Protein)
      Carbs = meals |> Array.sumBy (fun m -> m.Carbs)
      Fat = meals |> Array.sumBy (fun m -> m.Fat)
      Sugar = meals |> Array.sumBy (fun m -> m.Sugar)
      Fiber = meals |> Array.sumBy (fun m -> m.Fiber) }

let totalsOn (userId: float) (date: string) : DayTotals =
    totalsOf date (onDate userId date)

/// Per-day totals for the last N days (only days with logged meals),
/// newest first.
let recentDailyTotals (userId: float) (days: int) : DayTotals[] =
    let cutoff =
        System.DateTime.Now.AddDays(-(float days)).ToString("yyyy-MM-dd")

    getAll ()
    |> Array.filter (fun m -> m.UserId = userId && m.Date > cutoff)
    |> Array.groupBy (fun m -> m.Date)
    |> Array.map (fun (date, meals) -> totalsOf date meals)
    |> Array.sortByDescending (fun t -> t.Date)
