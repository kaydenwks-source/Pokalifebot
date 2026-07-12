/// Calorie tracking commands: /food (log via AI), /calories (totals),
/// plus the photo fallback until a vision-capable AI provider is wired in.
module Commands.Food

open Fable.Core
open Fable.Core.JsInterop
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

/// Photo messages: when a vision provider is configured (VISION_API_KEY),
/// describe the photo -> feed the description to the DeepSeek nutrition
/// estimator. Otherwise fall back to asking for a text description.
/// (DeepSeek itself rejects image content — verified 2026-07-12.)
let handlePhoto (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    promise {
        match Common.ensureUser ctx with
        | None -> return! ctx.reply "Sorry, I couldn't identify you — please try again."
        | Some user ->
            if not (Ai.Vision.enabled config) then
                Logger.info "Photo received — no vision provider configured, text fallback"

                return!
                    ctx.reply (
                        "📸 Nice photo! Photo analysis isn't switched on yet (needs a VISION_API_KEY in .env).\n"
                        + "Describe the meal instead and I'll estimate everything:\n"
                        + "/food chicken rice with extra egg, large portion"
                    )
            else
                let photos =
                    ctx.message |> Option.bind (fun m -> m.photo) |> Option.defaultValue [||]

                if photos.Length = 0 then
                    return! ctx.reply "I couldn't read that photo — please try sending it again."
                else
                    ctx.sendChatAction "typing" |> ignore

                    // Telegram sends several sizes, smallest first. ~1280px is
                    // plenty for food recognition and keeps requests small.
                    let best =
                        photos
                        |> Array.filter (fun p -> p.width <= 1300.0)
                        |> Array.sortByDescending (fun p -> p.width)
                        |> Array.tryHead
                        |> Option.defaultValue photos.[photos.Length - 1]

                    let! linkObj = ctx.telegram.getFileLink best.file_id
                    let url: string = !!(linkObj?href)
                    let! downloaded = Ai.Vision.downloadAsDataUri url

                    match downloaded with
                    | Error err ->
                        Logger.error ("Photo download failed: " + err)
                        return! ctx.reply "😓 I couldn't download that photo — please try again."
                    | Ok dataUri ->
                        let caption = ctx.message |> Option.bind (fun m -> m.caption)
                        let! described = Ai.Vision.describeImage config dataUri caption

                        match described with
                        | Error "NOT_FOOD" ->
                            return!
                                ctx.reply
                                    "🤔 That doesn't look like food to me. If it is, describe it: /food chicken rice"
                        | Error err ->
                            Logger.error ("Vision analysis failed: " + err)

                            return!
                                ctx.reply
                                    "😓 Photo analysis failed — describe it instead: /food chicken rice, large portion"
                        | Ok description ->
                            Logger.info (sprintf "%s photo described: %s" user.FirstName description)
                            let! result = Ai.FoodAnalyzer.analyse config description

                            match result with
                            | Ok nutrition ->
                                let meal = Meals.add user.Id nutrition
                                let totals = Meals.totalsOn user.Id meal.Date

                                return!
                                    ctx.reply (mealText meal totals + "\n\n📸 What I saw: " + description)
                            | Error err ->
                                Logger.warn ("Food analysis of photo description failed: " + err)

                                return!
                                    ctx.reply
                                        "😓 I couldn't turn that photo into a meal log — try /food with a short description."
    }
