/// Task & planning commands: /task, /tasks, /today, /plan.
module Commands.Tasks

open Fable.Core
open Bindings.Telegraf
open Models.User
open Models.Task
open Services
open Utils
open Config

let private usage =
    [ "📝 Tasks & planning"
      ""
      "/task add <text> [!high|!low] [@HH:MM or @HH:MM-HH:MM] — add a task"
      "   e.g. /task add dentist @14:00-15:30 · /task add essay !high"
      "   Timed tasks are fixed — /plan schedules everything else around them."
      "/task done <number> — complete one"
      "/task delete <number> — remove one"
      "/tasks — your open tasks"
      "/today — your day at a glance"
      "/plan — AI schedule for the rest of the day" ]
    |> String.concat "\n"

let private describe (t: TaskItem) =
    sprintf "%s %s%s" (Priority.marker t.Priority) t.Text (timeLabel t)

let private showTasks (user: UserProfile) (ctx: Context) =
    let mine = Tasks.openFor user.Id

    if mine.Length = 0 then
        ctx.reply "No open tasks. Add one: /task add finish essay !high"
    else
        let lines =
            mine
            |> Array.mapi (fun i t -> sprintf "%d. %s" (i + 1) (describe t))
            |> String.concat "\n"

        ctx.reply ("📝 Open tasks:\n\n" + lines + "\n\n/task done <n> · /task delete <n> · /plan for a schedule")

let private addTask (user: UserProfile) (rest: string[]) (ctx: Context) =
    if rest.Length = 0 then
        ctx.reply
            "Usage: /task add <text> [!high|!low] [@HH:MM-HH:MM]\nExamples: /task add finish essay !high · /task add dentist @14:00-15:30"
    else
        // "!token" sets priority, "@token" sets a fixed time — both may
        // appear anywhere; everything else is the task text.
        let isPriorityToken (t: string) = t.StartsWith "!" && (Priority.tryParse t).IsSome
        let isTimeToken (t: string) = (Schedule.tryParseToken t).IsSome

        let priority =
            rest
            |> Array.tryPick (fun t -> if t.StartsWith "!" then Priority.tryParse t else None)
            |> Option.defaultValue "medium"

        let schedule = rest |> Array.tryPick Schedule.tryParseToken

        let textParts =
            rest |> Array.filter (fun t -> not (isPriorityToken t || isTimeToken t))

        let text = String.concat " " textParts

        // "@" tokens with invalid times fall through into the text — warn.
        let badTimeHint =
            textParts
            |> Array.tryFind (fun t -> t.StartsWith "@")
            |> Option.map (fun t ->
                sprintf "\nℹ️ \"%s\" isn't a valid time (use @HH:MM or @HH:MM-HH:MM), so I kept it as text." t)
            |> Option.defaultValue ""

        if text = "" then
            ctx.reply "The task needs a description too, e.g. /task add dentist @14:00"
        else
            let task =
                Tasks.add user.Id text priority (schedule |> Option.map fst) (schedule |> Option.bind snd)

            Logger.info (sprintf "%s added task: %s (%s)%s" user.FirstName task.Text task.Priority (timeLabel task))
            ctx.reply (sprintf "✅ Added %s%s\nSee the list: /tasks" (describe task) badTimeHint)

let private completeTask (user: UserProfile) (arg: string) (ctx: Context) =
    match System.Int32.TryParse (arg.Trim()) with
    | true, index ->
        match Tasks.completeByIndex user.Id index with
        | Some t ->
            Logger.info (sprintf "%s completed task: %s" user.FirstName t.Text)
            let count = Tasks.doneTodayCount user.Id

            ctx.reply (
                sprintf "🎉 Done: %s\nThat's %d task%s completed today." t.Text count (if count = 1 then "" else "s")
            )
        | None -> ctx.reply "That number isn't in your open list — check /tasks"
    | _ -> ctx.reply "Use the number from /tasks, e.g. /task done 2"

let private deleteTask (user: UserProfile) (arg: string) (ctx: Context) =
    match System.Int32.TryParse (arg.Trim()) with
    | true, index ->
        match Tasks.deleteByIndex user.Id index with
        | Some t ->
            Logger.info (sprintf "%s deleted task: %s" user.FirstName t.Text)
            ctx.reply ("🗑 Removed: " + t.Text)
        | None -> ctx.reply "That number isn't in your open list — check /tasks"
    | _ -> ctx.reply "Use the number from /tasks, e.g. /task delete 2"

/// Dispatcher: /task [add|done|delete|list] ...
let handleTask (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        let args = Common.commandArgs ctx

        if args.Length = 0 then
            showTasks user ctx
        else
            let rest = String.concat " " (Array.skip 1 args)

            match args.[0].ToLowerInvariant() with
            | "add" -> addTask user (Array.skip 1 args) ctx
            | "done" -> completeTask user rest ctx
            | "delete"
            | "remove" -> deleteTask user rest ctx
            | "list" -> showTasks user ctx
            | _ -> ctx.reply usage

let handleTasks (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user -> showTasks user ctx

let private pendingHabits (userId: float) =
    Habits.forUser userId
    |> Array.filter (fun h -> not (Habits.streaksFor h.Cadence h.Completions).DoneThisPeriod)

/// /today — cross-feature dashboard: habits, tasks, reminders, sleep.
let handleToday (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        let now = System.DateTime.Now
        let todayStr = now.ToString("yyyy-MM-dd")

        let habits = Habits.forUser user.Id
        let pending = pendingHabits user.Id

        let habitsLine =
            if habits.Length = 0 then
                "🔥 Habits: none tracked yet (/habit add gym)"
            elif pending.Length = 0 then
                "🔥 Habits: all done ✅"
            else
                sprintf "🔥 Habits pending: %s" (pending |> Array.map (fun h -> h.Name) |> String.concat ", ")

        let tasks = Tasks.openFor user.Id

        let tasksLine =
            if tasks.Length = 0 then
                "📝 Tasks: none open"
            else
                sprintf "📝 Open tasks: %d (top: %s)" tasks.Length (describe tasks.[0])

        let reminders =
            Reminders.forUser user.Id |> Array.filter (fun r -> r.DueDate = todayStr)

        let remindersLine =
            if reminders.Length = 0 then
                "⏰ Reminders today: none"
            else
                reminders
                |> Array.map (fun r -> sprintf "%s %s" r.DueTime r.Text)
                |> String.concat " · "
                |> sprintf "⏰ Reminders today: %s"

        let sleepLine =
            match SleepLogs.todayLog user.Id with
            | Some log -> sprintf "😴 Sleep: %s logged" (Time.formatDuration log.DurationMinutes)
            | None -> "😴 Sleep: not logged (/sleep 23:30 07:00)"

        let workouts = Workouts.onDate user.Id todayStr

        let workoutLine =
            if workouts.Length = 0 then
                "🏋️ Workouts: none yet"
            else
                sprintf
                    "🏋️ Workouts: %s (~%d kcal)"
                    (workouts |> Array.map (fun w -> w.Exercise) |> String.concat ", ")
                    (workouts |> Array.sumBy (fun w -> w.CaloriesBurned))

        let busyLine =
            let blocks = Commitments.forToday user.Id

            if blocks.Length = 0 then
                None
            else
                blocks
                |> Array.map (fun c ->
                    match c.Until with
                    | Some u -> sprintf "%s–%s %s" c.At u c.Name
                    | None -> sprintf "%s %s" c.At c.Name)
                |> String.concat " · "
                |> sprintf "📌 Busy: %s"
                |> Some

        let energyLine =
            let e = Energy.summary user todayStr

            if e.Target.IsSome || e.Eaten > 0 || e.Burned > 0 then
                Some("🔋 " + Energy.describe e)
            else
                None

        [ Some(sprintf "📅 Today — %s %s" (Time.dayName now) todayStr)
          Some ""
          busyLine
          Some habitsLine
          Some tasksLine
          Some remindersLine
          Some sleepLine
          Some workoutLine
          energyLine
          Some ""
          Some "Want a schedule? /plan" ]
        |> List.choose id
        |> String.concat "\n"
        |> ctx.reply

/// /plan — AI-built time blocks from now until bedtime.
let handlePlan (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    promise {
        match Common.ensureUser ctx with
        | None -> return! ctx.reply "Sorry, I couldn't identify you — please try again."
        | Some user ->
            let tasks = Tasks.openFor user.Id
            let pending = pendingHabits user.Id
            let busyToday = Commitments.forToday user.Id

            if tasks.Length = 0 && pending.Length = 0 && busyToday.Length = 0 then
                return!
                    ctx.reply
                        "Nothing to plan — everything's done! Add a task (/task add finish essay !high) if something's on your mind."
            else
                match Entitlements.check config.AdminUserId user "plan" with
                | Error budgetMsg -> return! ctx.reply budgetMsg
                | Ok() ->
                    Logger.info (sprintf "/plan for %s (%d tasks, %d pending habits)" user.FirstName tasks.Length pending.Length)
                    ctx.sendChatAction "typing" |> ignore

                    // Most recent bed time as the bedtime anchor, else 23:30.
                    let bedtime =
                        SleepLogs.forUser user.Id
                        |> Array.tryHead
                        |> Option.map (fun l -> l.BedTime)
                        |> Option.defaultValue "23:30"

                    let! result = Ai.Planner.plan config user tasks pending busyToday bedtime

                    match result with
                    | Ok text ->
                        Entitlements.commit config.AdminUserId user "plan"
                        return! ctx.reply ("📅 Your plan for the rest of today:\n\n" + text.Trim())
                    | Error _ -> return! ctx.reply Common.aiUnavailable
    }
