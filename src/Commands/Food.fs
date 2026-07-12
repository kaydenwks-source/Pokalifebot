/// Calorie tracking commands: /food (log via AI), /calories (totals),
/// plus the photo fallback until a vision-capable AI provider is wired in.
module Commands.Food

open Fable.Core
open Bindings.Telegraf
open Models.User
open Models.Meal
open Services
open Utils
open Config

let private usage =
    [ "🍽 Calorie tracker"
      ""
      "/food <what you ate> — I'll estimate calories and macros"
      "   e.g. /food chicken rice with extra egg, large portion"
      "/food undo — remove the last meal logged today"
      "/calories — today's meals and totals"
      "/calories week — daily totals for the last 7 days"
      "/calories month — 30-day summary" ]
    |> String.concat "\n"

let private grams (g: float) = sprintf "%.0fg" g

let private mealText (m: Meal) (totals: Meals.DayTotals) =
    [ sprintf "🍽 Logged: %s" m.Name
      sprintf "Calories: %d kcal" m.Calories
      sprintf "Protein %s · Carbs %s · Fat %s" (grams m.Protein) (grams m.Carbs) (grams m.Fat)
      sprintf "Sugar %s · Fiber %s" (grams m.Sugar) (grams m.Fiber)
      ""
      sprintf
          "Today so far: %d kcal across %d meal%s. /calories for details"
          totals.Calories
          totals.Meals
          (if totals.Meals = 1 then "" else "s") ]
    |> String.concat "\n"

let handleFood (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    promise {
        match Common.ensureUser ctx with
        | None -> return! ctx.reply "Sorry, I couldn't identify you — please try again."
        | Some user ->
            match Common.commandArg ctx with
            | None -> return! ctx.reply usage
            | Some arg when arg.Trim().ToLowerInvariant() = "undo" ->
                match Meals.deleteLastToday user.Id with
                | Some meal ->
                    Logger.info (sprintf "%s removed meal: %s" user.FirstName meal.Name)
                    return! ctx.reply (sprintf "🗑 Removed: %s (%d kcal)" meal.Name meal.Calories)
                | None -> return! ctx.reply "Nothing logged today to remove."
            | Some description ->
                ctx.sendChatAction "typing" |> ignore
                let! result = Ai.FoodAnalyzer.analyse config description

                match result with
                | Ok nutrition ->
                    let meal = Meals.add user.Id nutrition
                    let totals = Meals.totalsOn user.Id meal.Date
                    Logger.info (sprintf "%s logged meal: %s (%d kcal)" user.FirstName meal.Name meal.Calories)
                    return! ctx.reply (mealText meal totals)
                | Error err ->
                    Logger.warn (sprintf "Food analysis failed for %s: %s" user.FirstName err)

                    return!
                        ctx.reply
                            "🤔 I couldn't analyse that as a meal. Describe what you ate, e.g.:\n/food 2 eggs, toast with butter and a kopi"
    }

let private showToday (user: UserProfile) (ctx: Context) =
    let today = System.DateTime.Now.ToString("yyyy-MM-dd")
    let meals = Meals.onDate user.Id today

    if meals.Length = 0 then
        ctx.reply "Nothing logged today. Log a meal like: /food chicken rice, large portion"
    else
        let t = Meals.totalsOn user.Id today

        let lines =
            meals
            |> Array.map (fun m -> sprintf "%s  %s — %d kcal" m.Time m.Name m.Calories)
            |> String.concat "\n"

        [ "🍽 Today's meals:"
          ""
          lines
          ""
          sprintf "Total: %d kcal" t.Calories
          sprintf "Protein %s · Carbs %s · Fat %s" (grams t.Protein) (grams t.Carbs) (grams t.Fat)
          sprintf "Sugar %s · Fiber %s" (grams t.Sugar) (grams t.Fiber) ]
        |> String.concat "\n"
        |> ctx.reply

let private showWeek (user: UserProfile) (ctx: Context) =
    let days = Meals.recentDailyTotals user.Id 7

    if days.Length = 0 then
        ctx.reply "No meals logged in the last 7 days. Start with /food <meal>"
    else
        let lines =
            days
            |> Array.map (fun d ->
                sprintf
                    "%s %s: %d kcal (%d meal%s)"
                    (Time.dayName (System.DateTime.Parse d.Date))
                    (d.Date.Substring 5)
                    d.Calories
                    d.Meals
                    (if d.Meals = 1 then "" else "s"))
            |> String.concat "\n"

        let avg = (days |> Array.sumBy (fun d -> d.Calories)) / days.Length

        ctx.reply (
            "📊 Last 7 days:\n\n" + lines + sprintf "\n\nAverage: %d kcal per logged day" avg
        )

let private showMonth (user: UserProfile) (ctx: Context) =
    let days = Meals.recentDailyTotals user.Id 30

    if days.Length = 0 then
        ctx.reply "No meals logged in the last 30 days. Start with /food <meal>"
    else
        let avgKcal = (days |> Array.sumBy (fun d -> d.Calories)) / days.Length
        let avgProtein = (days |> Array.sumBy (fun d -> d.Protein)) / float days.Length
        let totalMeals = days |> Array.sumBy (fun d -> d.Meals)

        [ "📊 Last 30 days:"
          ""
          sprintf "Days logged: %d of 30" days.Length
          sprintf "Average: %d kcal per logged day" avgKcal
          sprintf "Average protein: %s per logged day" (grams avgProtein)
          sprintf "Meals logged: %d" totalMeals ]
        |> String.concat "\n"
        |> ctx.reply

let handleCalories (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        match Common.commandArg ctx |> Option.map (fun s -> s.Trim().ToLowerInvariant()) with
        | None
        | Some "today" -> showToday user ctx
        | Some "week" -> showWeek user ctx
        | Some "month" -> showMonth user ctx
        | Some _ -> ctx.reply usage

/// Photo messages: graceful fallback until a vision AI provider exists.
/// (Verified 2026-07-12: DeepSeek's API rejects image content entirely.)
let handlePhoto (ctx: Context) : JS.Promise<obj> =
    Common.ensureUser ctx |> ignore
    Logger.info "Photo received — replied with text-description fallback"

    ctx.reply (
        "📸 Nice photo! I can't analyse images yet — my AI is text-only for now.\n"
        + "Describe the meal instead and I'll estimate everything:\n"
        + "/food chicken rice with extra egg, large portion"
    )
