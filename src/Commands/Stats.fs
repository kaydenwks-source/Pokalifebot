/// /stats (and /level) — the gamification dashboard: level, XP, progress to
/// the next level, and badges. Badges are computed fresh from the user's real
/// tracker data every time, so they always reflect reality and need no
/// separate award/storage machinery.
module Commands.Stats

open Fable.Core
open Bindings.Telegraf
open Services

type private Badge = { Label: string; Earned: bool; Hint: string }

let private badgesFor (userId: float) : Badge[] =
    let habits = Habits.forUser userId

    let maxStreak =
        let streaks = habits |> Array.map (fun h -> (Habits.streaksForHabit h).Current)
        if streaks.Length = 0 then 0 else Array.max streaks

    let allHabitsDone =
        habits.Length > 0
        && habits |> Array.forall (fun h -> (Habits.streaksForHabit h).DoneThisPeriod)

    let workouts = Workouts.forUser userId |> Array.length
    let meals = Meals.getAll () |> Array.filter (fun m -> m.UserId = userId) |> Array.length
    let nights = SleepLogs.forUser userId |> Array.length
    let goalsDone = Goals.forUser userId |> Array.filter (fun g -> g.Progress >= g.TargetValue) |> Array.length

    [| { Label = "🔥 Week Warrior — 7-period habit streak"
         Earned = maxStreak >= 7
         Hint = sprintf "best streak %d/7" maxStreak }
       { Label = "⭐ Perfect Period — every habit done"
         Earned = allHabitsDone
         Hint = "tick all habits this period" }
       { Label = "💪 Iron Start — 10 workouts logged"
         Earned = workouts >= 10
         Hint = sprintf "%d/10 workouts" workouts }
       { Label = "🍽 Well Fed — 20 meals logged"
         Earned = meals >= 20
         Hint = sprintf "%d/20 meals" meals }
       { Label = "🌙 Well Rested — 7 nights logged"
         Earned = nights >= 7
         Hint = sprintf "%d/7 nights" nights }
       { Label = "🎯 Finisher — complete a goal"
         Earned = goalsDone >= 1
         Hint = "reach 100% on any goal" } |]

let handle (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user when not (Users.gamificationOn user) ->
        ctx.reply "🎮 Gamification is off, so there's no XP, level or badges to show.\n\nEverything else still tracks normally. Turn it back on anytime: /settings gamification on"
    | Some user ->
        let xp = Gamification.xpFor user.Id
        let lvl = Gamification.levelFor xp

        let progress =
            match lvl.Next with
            | Some next -> sprintf "%d / %d XP to level %d" (xp - lvl.Floor) (next - lvl.Floor) (lvl.Index + 2)
            | None -> "Top level reached — legend. 🏆"

        let badges = badgesFor user.Id
        let earned = badges |> Array.filter (fun b -> b.Earned)
        let locked = badges |> Array.filter (fun b -> not b.Earned)

        let earnedBlock =
            if earned.Length = 0 then
                [ "No badges yet — they unlock as you build momentum." ]
            else
                "🏅 Earned:" :: (earned |> Array.toList |> List.map (fun b -> "  " + b.Label))

        let lockedBlock =
            if locked.Length = 0 then
                []
            else
                "" :: "🔒 Next up:" :: (locked |> Array.toList |> List.map (fun b -> sprintf "  %s (%s)" b.Label b.Hint))

        let freezeReady = user.FreezeWeek <> Some(Habits.currentWeekIndex ())

        let freezeLine =
            if freezeReady then
                "🧊 Streak freeze: ready (auto-protects one missed period this week)"
            else
                "🧊 Streak freeze: used this week — refreshes Monday"

        ([ sprintf "🎮 %s's progress" user.FirstName
           ""
           sprintf "Level %d — %s" (lvl.Index + 1) lvl.Name
           sprintf "XP: %d" xp
           progress
           freezeLine
           "" ]
         @ earnedBlock
         @ lockedBlock)
        |> String.concat "\n"
        |> ctx.reply
