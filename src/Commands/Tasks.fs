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
      "/task add <text> [!high|!low] — add a task (medium if omitted)"
      "/task done <number> — complete one"
      "/task delete <number> — remove one"
      "/tasks — your open tasks"
      "/today — your day at a glance"
      "/plan — AI schedule for the rest of the day" ]
    |> String.concat "\n"

let private describe (t: TaskItem) =
    sprintf "%s %s" (Priority.marker t.Priority) t.Text

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
        ctx.reply "Usage: /task add <text> [!high|!low]\nExample: /task add finish essay !high"
    else
        // A trailing "!high"/"!low"/"!med" sets priority; default medium.
        let priority, textParts =
            let last = rest.[rest.Length - 1]

            if last.StartsWith "!" then
                match Priority.tryParse last with
                | Some p when rest.Length > 1 -> p, Array.sub rest 0 (rest.Length - 1)
                | _ -> "medium", rest
            else
                "medium", rest

        let text = String.concat " " textParts
        let task = Tasks.add user.Id text priority
        Logger.info (sprintf "%s added task: %s (%s)" user.FirstName task.Text task.Priority)
        ctx.reply (sprintf "✅ Added %s\nSee the list: /tasks" (describe task))

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

        [ sprintf "📅 Today — %s %s" (Time.dayName now) todayStr
          ""
          habitsLine
          tasksLine
          remindersLine
          sleepLine
          ""
          "Want a schedule? /plan" ]
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

            if tasks.Length = 0 && pending.Length = 0 then
                return!
                    ctx.reply
                        "Nothing to plan — everything's done! Add a task (/task add finish essay !high) if something's on your mind."
            else
                Logger.info (sprintf "/plan for %s (%d tasks, %d pending habits)" user.FirstName tasks.Length pending.Length)
                ctx.sendChatAction "typing" |> ignore

                // Most recent bed time as the bedtime anchor, else 23:30.
                let bedtime =
                    SleepLogs.forUser user.Id
                    |> Array.tryHead
                    |> Option.map (fun l -> l.BedTime)
                    |> Option.defaultValue "23:30"

                let! result = Ai.Planner.plan config user tasks pending bedtime

                match result with
                | Ok text -> return! ctx.reply ("📅 Your plan for the rest of today:\n\n" + text.Trim())
                | Error _ -> return! ctx.reply Common.aiUnavailable
    }
