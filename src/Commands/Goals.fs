/// The /goal command family: add (AI-parsed), list, log, done, delete.
module Commands.Goals

open Fable.Core
open Bindings.Telegraf
open Models.User
open Models.Goal
open Services
open Utils
open Config

let private usage =
    [ "🎯 Goals"
      ""
      "/goal add read 20 books — set a goal (AI works out the numbers)"
      "/goal add save $5000 · /goal add run 100 km · /goal add finish python course"
      "/goals — progress overview"
      "/goal plan <number> — your coach's 5-step path"
      "/goal log <number> <amount> — add progress (amount optional, default 1)"
      "/goal done <number> — finish a goal outright"
      "/goal delete <number> — remove one"
      ""
      "Tip: cardio workouts auto-feed goals measured in km."
      "For weight goals use /target instead." ]
    |> String.concat "\n"

let private bar (pct: int) =
    let filled = min 10 (pct / 10)
    String.replicate filled "▓" + String.replicate (10 - filled) "░"

let private describe (index: int) (g: Goal) =
    if g.CompletedAt.IsSome then
        sprintf "%d. ✅ %s — completed %s" (index + 1) g.Name (g.CompletedAt |> Option.defaultValue "")
    else
        let pct = Goals.percentOf g
        let unitStr = if g.Unit = "" then "" else " " + g.Unit

        sprintf "%d. %s\n   %s %g/%g%s (%d%%)" (index + 1) g.Name (bar pct) g.Progress g.TargetValue unitStr pct

let private milestoneText (m: int option) =
    match m with
    | Some 100 -> Some "🏆 GOAL COMPLETE!"
    | Some 75 -> Some "🎉 75% — home stretch!"
    | Some 50 -> Some "🎉 Halfway there!"
    | Some 25 -> Some "🎉 A quarter done — momentum!"
    | _ -> None

let private showList (user: UserProfile) (ctx: Context) =
    let mine = Goals.forUser user.Id

    if mine.Length = 0 then
        ctx.reply "No goals yet. Set one: /goal add read 20 books"
    else
        let lines = mine |> Array.mapi describe |> String.concat "\n"
        ctx.reply ("🎯 Your goals:\n\n" + lines + "\n\nLog progress: /goal log <number> <amount>")

let private addGoal (config: Env.AppConfig) (user: UserProfile) (description: string) (ctx: Context) : JS.Promise<obj> =
    promise {
        ctx.sendChatAction "typing" |> ignore
        let! parsed = Ai.GoalParser.parse config description

        match parsed with
        | Error err ->
            Logger.warn (sprintf "Goal parse failed for %s: %s" user.FirstName err)

            if err.Contains "/target" then
                return! ctx.reply "For weight goals use /target 68 in 10 weeks — it computes your daily calories too."
            else
                return! ctx.reply "🤔 I couldn't read that as a goal. Try: /goal add read 20 books"
        | Ok p ->
            let goal = Goals.add user.Id p.Name p.Target p.Unit
            Logger.info (sprintf "%s added goal: %s (%g %s)" user.FirstName goal.Name goal.TargetValue goal.Unit)

            // Coach breakdown: big goal -> 5 achievable steps (non-fatal on failure).
            let! stepsResult = Ai.GoalParser.breakdown config goal.Name goal.TargetValue goal.Unit

            let stepsBlock =
                match stepsResult with
                | Ok steps ->
                    Goals.setSteps goal steps |> ignore

                    "\n\n🧭 Your 5-step path:\n"
                    + (steps |> Array.mapi (fun i s -> sprintf "%d. %s" (i + 1) s) |> String.concat "\n")
                | Error err ->
                    Logger.warn ("Goal breakdown failed: " + err)
                    ""

            let unitStr = if goal.Unit = "" then "" else " " + goal.Unit

            let index =
                Goals.forUser user.Id
                |> Array.findIndex (fun g -> g.Id = goal.Id)
                |> (+) 1

            return!
                ctx.reply (
                    sprintf
                        "🎯 Goal set: %s (%g%s)\n%s 0%%%s\n\nLog progress with /goal log %d <amount> · path anytime: /goal plan %d"
                        goal.Name
                        goal.TargetValue
                        unitStr
                        (bar 0)
                        stepsBlock
                        index
                        index
                )
    }

/// /goal plan <n> — the coach's step path with progress-based checkmarks.
let private showPlan (user: UserProfile) (arg: string) (ctx: Context) =
    match System.Int32.TryParse (arg.Trim()) with
    | true, n ->
        match Goals.byIndex user.Id n with
        | None -> ctx.reply "That number isn't in your list — check /goals"
        | Some goal ->
            match goal.Steps with
            | Some steps when steps.Length > 0 ->
                let pct = Goals.percentOf goal

                let lines =
                    steps
                    |> Array.mapi (fun i s ->
                        let threshold = (i + 1) * 100 / steps.Length
                        let mark = if pct >= threshold then "✅" else "⬜"
                        sprintf "%s %d. %s" mark (i + 1) s)
                    |> String.concat "\n"

                ctx.reply (sprintf "🧭 %s — %d%%\n\n%s" goal.Name pct lines)
            | _ ->
                ctx.reply "That goal has no step plan (it was set before plans existed). New goals get one automatically."
    | _ -> ctx.reply "Usage: /goal plan <number>"

let private logProgress
    (config: Env.AppConfig)
    (user: UserProfile)
    (args: string[])
    (ctx: Context)
    : JS.Promise<obj> =
    promise {
        let index =
            if args.Length >= 1 then
                match System.Int32.TryParse args.[0] with
                | true, n -> Some n
                | _ -> None
            else
                None

        let amount =
            if args.Length >= 2 then
                match System.Double.TryParse args.[1] with
                | true, v -> Some v
                | _ -> None
            else
                Some 1.0

        match index, amount with
        | Some n, Some amt ->
            match Goals.byIndex user.Id n with
            | None -> return! ctx.reply "That number isn't in your list — check /goals"
            | Some goal when goal.CompletedAt.IsSome ->
                return! ctx.reply (sprintf "\"%s\" is already complete ✅ — set a new one with /goal add" goal.Name)
            | Some goal ->
                let result = Goals.logProgress goal amt
                let g = result.Goal
                let pct = Goals.percentOf g
                let unitStr = if g.Unit = "" then "" else " " + g.Unit
                Logger.info (sprintf "%s logged %+g to goal %s (%d%%)" user.FirstName amt g.Name pct)

                let lines =
                    [ Some(sprintf "🎯 %s" g.Name)
                      Some(sprintf "%s %g/%g%s (%d%%)" (bar pct) g.Progress g.TargetValue unitStr pct)
                      milestoneText result.Milestone ]
                    |> List.choose id

                let! _ = ctx.reply (String.concat "\n" lines)

                // Completed? One AI congratulation as a follow-up.
                if result.Milestone = Some 100 then
                    ctx.sendChatAction "typing" |> ignore
                    let! celebration = Ai.Encourage.celebrateGoal config g.Name

                    match celebration with
                    | Ok text -> return! ctx.reply text
                    | Error _ -> return box ()
                else
                    return box ()
        | _ -> return! ctx.reply "Usage: /goal log <number> <amount> — e.g. /goal log 1 2"
    }

let private markDone (config: Env.AppConfig) (user: UserProfile) (arg: string) (ctx: Context) : JS.Promise<obj> =
    match System.Int32.TryParse (arg.Trim()) with
    | true, n ->
        match Goals.byIndex user.Id n with
        | Some goal when goal.CompletedAt.IsNone ->
            // Log exactly the remaining amount so it lands on 100%.
            logProgress config user [| string n; string (goal.TargetValue - goal.Progress) |] ctx
        | Some goal -> ctx.reply (sprintf "\"%s\" is already complete ✅" goal.Name)
        | None -> ctx.reply "That number isn't in your list — check /goals"
    | _ -> ctx.reply "Usage: /goal done <number>"

let private deleteGoal (user: UserProfile) (arg: string) (ctx: Context) =
    match System.Int32.TryParse (arg.Trim()) with
    | true, n ->
        match Goals.deleteByIndex user.Id n with
        | Some g ->
            Logger.info (sprintf "%s deleted goal: %s" user.FirstName g.Name)
            ctx.reply ("🗑 Removed goal: " + g.Name)
        | None -> ctx.reply "That number isn't in your list — check /goals"
    | _ -> ctx.reply "Usage: /goal delete <number>"

/// Dispatcher: /goal [add|list|log|done|delete]
let handle (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        let args = Common.commandArgs ctx

        if args.Length = 0 then
            showList user ctx
        else
            let rest = String.concat " " (Array.skip 1 args)

            match args.[0].ToLowerInvariant() with
            | "add" when rest.Trim() <> "" -> addGoal config user rest ctx
            | "add" -> ctx.reply "What's the goal? e.g. /goal add read 20 books"
            | "list" -> showList user ctx
            | "plan"
            | "steps" -> showPlan user rest ctx
            | "log" -> logProgress config user (Array.skip 1 args) ctx
            | "done" -> markDone config user rest ctx
            | "delete"
            | "remove" -> deleteGoal user rest ctx
            | _ -> ctx.reply usage

/// /goals — quick alias for the list.
let handleListShortcut (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user -> showList user ctx
