/// AI day planning: open tasks + pending habits + bedtime -> a realistic
/// time-blocked schedule for the rest of the day.
module Ai.Planner

open Fable.Core
open Models.User
open Models.Task
open Models.Habit
open Config
open Utils

let private systemPrompt =
    [ "You are Momentum AI's day planner inside a Telegram bot."
      "Create a realistic time-blocked plan from NOW until the user's bedtime."
      "Fixed commitments have exact times and are IMMOVABLE — place them at"
      "exactly their given times and schedule everything else around them,"
      "including travel/transition buffer before and after."
      "Include the flexible open tasks (high priority first), pending habits,"
      "a meal at a sensible time, and short breaks."
      "Be realistic: leave buffer time, no block longer than 90 minutes without a break."
      "Skip fixed commitments whose time has already passed."
      "Format: one line per block, 'HH:MM–HH:MM  activity'. Maximum 12 lines."
      "After the blocks add ONE short encouraging line."
      "Plain text only — no markdown, no headers." ]
    |> String.concat " "

let plan
    (config: Env.AppConfig)
    (user: UserProfile)
    (tasks: TaskItem[])
    (pendingHabits: Habit[])
    (bedtime: string)
    : JS.Promise<Result<string, string>> =
    let fixedTasks, flexibleTasks = tasks |> Array.partition (fun t -> t.At.IsSome)

    let fixedList =
        if fixedTasks.Length = 0 then
            "none"
        else
            fixedTasks
            |> Array.map (fun t ->
                let span =
                    match t.At, t.Until with
                    | Some a, Some u -> sprintf "%s-%s" a u
                    | Some a, None -> a
                    | _ -> "?"

                sprintf "[at %s] %s" span t.Text)
            |> String.concat "; "

    let taskList =
        if flexibleTasks.Length = 0 then
            "none"
        else
            flexibleTasks
            |> Array.map (fun t -> sprintf "[%s] %s" t.Priority t.Text)
            |> String.concat "; "

    let habitList =
        if pendingHabits.Length = 0 then
            "none"
        else
            pendingHabits |> Array.map (fun h -> h.Name) |> String.concat ", "

    let content =
        [ sprintf
              "Now: %s (%s)."
              (System.DateTime.Now.ToString("yyyy-MM-dd HH:mm"))
              (Time.dayName System.DateTime.Now)
          sprintf "Fixed commitments (immovable): %s." fixedList
          sprintf "Flexible open tasks: %s." taskList
          sprintf "Pending habits today: %s." habitList
          sprintf "Usual bedtime: around %s." bedtime ]
        |> String.concat " "

    DeepSeek.chat config systemPrompt content
