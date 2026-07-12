/// The energy engine: ties food, workouts and weight goals together.
/// - computeTarget: weight goal -> daily calorie target (pure, unit-tested)
/// - summary/describe: net calories for a day vs the target
module Services.Energy

open Models.User

// ── weight-goal math ─────────────────────────────────────────────────

/// ~7700 kcal per kg of body weight; maintenance ≈ 31 kcal/kg/day is a
/// rough moderate-activity estimate (real TDEE needs age/sex/activity —
/// good enough for a coaching target, and honestly labelled as estimate).
type TargetPlan =
    { MaintenanceKcal: float
      DailyTargetKcal: float
      WeeklyChangeKg: float
      Floored: bool // raw target went below the 1200 safety floor
      Aggressive: bool } // faster than ±0.75 kg/week

let computeTarget (currentKg: float) (targetKg: float) (weeks: float) : TargetPlan =
    let maintenance = currentKg * 31.0
    let weeklyChange = (targetKg - currentKg) / weeks
    let rawDaily = maintenance + (targetKg - currentKg) * 7700.0 / (weeks * 7.0)

    { MaintenanceKcal = maintenance
      DailyTargetKcal = max 1200.0 rawDaily
      WeeklyChangeKg = weeklyChange
      Floored = rawDaily < 1200.0
      Aggressive = abs weeklyChange > 0.75 }

// ── daily net summary ────────────────────────────────────────────────

type DaySummary =
    { Eaten: int
      Burned: int
      Net: int
      Target: int option
      Remaining: int option // target - net (negative = over)
      PercentOfTarget: int option }

let summary (user: UserProfile) (date: string) : DaySummary =
    let eaten = (Meals.totalsOn user.Id date).Calories

    let burned =
        Workouts.onDate user.Id date |> Array.sumBy (fun w -> w.CaloriesBurned)

    let net = eaten - burned
    let target = user.DailyKcalTarget |> Option.map int

    { Eaten = eaten
      Burned = burned
      Net = net
      Target = target
      Remaining = target |> Option.map (fun t -> t - net)
      PercentOfTarget =
        target
        |> Option.map (fun t ->
            if t <= 0 then 0 else int (System.Math.Round(float net * 100.0 / float t))) }

/// One-line human version of the day's energy picture.
let describe (s: DaySummary) : string =
    match s.Target with
    | Some target ->
        let status =
            match s.Remaining with
            | Some r when r >= 0 -> sprintf "%d kcal left" r
            | Some r -> sprintf "%d kcal over" (-r)
            | None -> ""

        if s.Burned > 0 then
            sprintf
                "Net: %d eaten − %d burned = %d / %d kcal (%d%%) · %s"
                s.Eaten
                s.Burned
                s.Net
                target
                (s.PercentOfTarget |> Option.defaultValue 0)
                status
        else
            sprintf
                "%d / %d kcal (%d%%) · %s"
                s.Eaten
                target
                (s.PercentOfTarget |> Option.defaultValue 0)
                status
    | None ->
        if s.Burned > 0 then
            sprintf "%d eaten − %d burned = %d kcal net (set a goal: /target 68 in 10 weeks)" s.Eaten s.Burned s.Net
        else
            sprintf "%d kcal today (set a goal: /target 68 in 10 weeks)" s.Eaten
