/// Interactive, tap-first menu (Phase 28). /menu shows category buttons; each
/// category expands, in place, to its actions. "View" actions run the real
/// command handler immediately (Common.commandArg returns None on a button
/// press, so they behave as their no-arg default); "input" actions reply with
/// a short, copy-ready example of what to send. This module also owns the
/// command list registered for Telegram's native /-autocomplete.
module Commands.Menu

open Fable.Core
open Fable.Core.JsInterop
open Bindings.Telegraf
open Config

// ── Menu model ─────────────────────────────────────────────────────────────
type Leaf =
    /// Tapping runs a no-arg view via the real handler (token → runLeaf).
    | Run of label: string * token: string
    /// Tapping shows how to use a command that needs typed input.
    | Tip of label: string * token: string * help: string

type Category =
    { Id: string
      Title: string
      Leaves: Leaf list }

let private categories: Category list =
    [ { Id = "motivate"
        Title = "🌅 Motivation"
        Leaves =
          [ Run("✨ Get a quote", "quote")
            Run("🏷 Choose category", "category")
            Tip(
                "⏰ Daily quote time",
                "quotetime",
                "⏰ Get a quote every morning:\n/quotetime 07:00\n(or /quotetime off to stop)"
            ) ] }
      { Id = "sleep"
        Title = "😴 Sleep"
        Leaves =
          [ Tip(
                "🛏 Log sleep",
                "sleeplog",
                "🛏 Log last night — send:\n/sleep 23:30 07:00\n(bedtime, then wake time)\n\nOr just tell me: “slept 11pm woke 7am”."
            )
            Tip("📊 Sleep stats", "sleepstats", "📊 Review your sleep:\n/sleep stats  ·  /sleep today  ·  /sleep history") ] }
      { Id = "remind"
        Title = "⏰ Reminders"
        Leaves =
          [ Run("📋 My reminders", "reminders")
            Tip(
                "➕ Set a reminder",
                "remind",
                "⏰ Plain English works — send:\n/remind every monday 8am gym\n/remind tomorrow 3pm call mum"
            ) ] }
      { Id = "habits"
        Title = "🔥 Habits"
        Leaves =
          [ Run("📋 My habits", "habits")
            Tip("➕ Add a habit", "habitadd", "🔥 Start tracking:\n/habit add read daily\n(daily · weekly · monthly)")
            Tip("✅ Mark one done", "habitdone", "✅ Check one off:\n/habit done read\n\nOr just say “reading done”.") ] }
      { Id = "planner"
        Title = "📝 Planner"
        Leaves =
          [ Run("📅 Today", "today")
            Run("🗒 My tasks", "tasks")
            Run("🤖 AI plan my day", "plan")
            Tip("➕ Add a task", "taskadd", "📝 Add a task:\n/task add buy milk !high @18:00\n(!high/!low priority, @time optional)") ] }
      { Id = "food"
        Title = "🍽 Calories"
        Leaves =
          [ Run("📊 Today's calories", "calories")
            Tip(
                "🍽 Log food",
                "food",
                "🍽 Log a meal:\n/food chicken rice and a coke\n\n📸 Or send a photo of your plate — or just say what you ate."
            ) ] }
      { Id = "body"
        Title = "⚖️ Body"
        Leaves =
          [ Run("📈 My progress", "progress")
            Tip("⚖️ Log measurements", "weight", "⚖️ Log body stats:\n/weight 72.5  ·  /bodyfat 18  ·  /height 175")
            Tip("🎯 Set a target", "target", "🎯 Set a weight goal:\n/target 68 in 10 weeks") ] }
      { Id = "workouts"
        Title = "🏋️ Workouts"
        Leaves =
          [ Tip("🏋️ Log a workout", "workoutlog", "🏋️ Plain words are fine:\n/workout bench press 3x8 60kg\n/workout ran 5km")
            Tip("📊 History & PRs", "workouthist", "📊 Look back:\n/workout history  ·  /workout prs  ·  /workout tips") ] }
      { Id = "goals"
        Title = "🎯 Goals"
        Leaves =
          [ Run("📋 My goals", "goals")
            Tip("➕ Add a goal", "goaladd", "🎯 Set any goal — I'll break it down:\n/goal add read 20 books\n/goal add run 10km")
            Tip("📈 Log progress", "goallog", "📈 Update a goal (number from /goals):\n/goal log 1 3") ] }
      { Id = "reports"
        Title = "📊 Reports"
        Leaves =
          [ Run("🗓 Weekly review", "report")
            Tip("📅 Monthly deep-dive", "reportmonth", "📅 30-day deep-dive + productivity score:\n/report month\n(Premium — see /premium)") ] }
      { Id = "mind"
        Title = "🧠 Coach & focus"
        Leaves =
          [ Tip("🧠 Talk to your coach", "coach", "🧠 I'm listening — send:\n/coach I feel unmotivated today")
            Tip("🍅 Focus timer", "focus", "🍅 Start a Pomodoro:\n/focus 25\n(I'll ping you when it's up)")
            Tip("🙂 Mood & journal", "mood", "🙂 Check in:\n/mood 4 feeling good  ·  /journal <your thoughts>") ] }
      { Id = "buddy"
        Title = "🤝 Buddy"
        Leaves =
          [ Run("👥 My buddy", "buddy")
            Tip("🔗 Invite a buddy", "buddyinvite", "🔗 Get a code to share:\n/buddy invite")
            Tip("🤝 Accept a code", "buddyaccept", "🤝 Pair up with a friend's code:\n/buddy accept ABC123") ] }
      { Id = "account"
        Title = "⭐ Premium & you"
        Leaves =
          [ Run("🏅 My stats", "stats")
            Run("📋 My plan", "status")
            Run("⭐ Get Premium", "premium")
            Run("📊 AI usage", "usage")
            Tip("⚙️ Settings", "settings", "⚙️ Preferences:\n/settings — see everything\n/settings timezone, morning, evening…")
            Tip("🔐 Your data", "data", "🔐 It's yours:\n/export — download everything\n/deleteme — erase everything") ] }
      { Id = "basics"
        Title = "ℹ️ Basics"
        Leaves =
          [ Tip("📖 All commands", "help", "📖 Full command list: send /help")
            Tip("🏓 Is the bot alive?", "ping", "🏓 Send /ping to check.") ] } ]

// ── Rendering ──────────────────────────────────────────────────────────────
let private homeText =
    "📱 Momentum menu\n\nTap a section below to see its actions.\n\n💡 You can also just talk to me — “ate chicken rice”, “slept 1am woke 8am”, “gym done” — or send a 🎙 voice note. No commands needed."

let private button (text: string) (data: string) : obj =
    createObj [ "text" ==> text; "callback_data" ==> data ]

let private keyboardExtra (rows: obj[][]) : obj =
    createObj [ "reply_markup" ==> createObj [ "inline_keyboard" ==> rows ] ]

let private homeKeyboard () : obj =
    categories
    |> List.map (fun c -> button c.Title ("menu:cat:" + c.Id))
    |> List.chunkBySize 2
    |> List.map List.toArray
    |> List.toArray
    |> keyboardExtra

let private leafButton (leaf: Leaf) : obj =
    match leaf with
    | Run (label, token) -> button label ("menu:run:" + token)
    | Tip (label, token, _) -> button label ("menu:tip:" + token)

let private categoryKeyboard (c: Category) : obj =
    let leafRows =
        c.Leaves |> List.map leafButton |> List.chunkBySize 2 |> List.map List.toArray

    (leafRows @ [ [| button "⬅ Back" "menu:home" |] ]) |> List.toArray |> keyboardExtra

// ── Command entry point ────────────────────────────────────────────────────
let handleMenu (ctx: Context) : JS.Promise<obj> =
    Common.ensureUser ctx |> ignore
    ctx.reply (homeText, homeKeyboard ())

// ── Callback dispatch ──────────────────────────────────────────────────────
/// Run a no-arg view by invoking its real handler. Common.commandArg returns
/// None on a callback, so each behaves as its default (e.g. /calories = today).
let private runLeaf (config: Env.AppConfig) (token: string) (ctx: Context) : JS.Promise<obj> =
    match token with
    | "quote" -> Quotes.handleQuote config ctx
    | "category" -> Quotes.handleCategory ctx
    | "reminders" -> Reminders.handleList ctx
    | "habits" -> Habits.handleListShortcut ctx
    | "today" -> Tasks.handleToday ctx
    | "tasks" -> Tasks.handleTasks ctx
    | "plan" -> Tasks.handlePlan config ctx
    | "calories" -> Food.handleCalories ctx
    | "progress" -> Body.handleProgress config ctx
    | "goals" -> Goals.handleListShortcut ctx
    | "report" -> Report.handle config ctx
    | "buddy" -> Buddy.handle ctx
    | "stats" -> Stats.handle ctx
    | "status" -> Premium.handleStatus config ctx
    | "premium" -> Premium.handle config ctx
    | "usage" -> Account.handleUsage config ctx
    | _ -> ctx.reply "Hmm, I don't recognise that action — try /menu again."

let private tipText (token: string) : string option =
    categories
    |> List.collect (fun c -> c.Leaves)
    |> List.tryPick (fun leaf ->
        match leaf with
        | Tip (_, t, help) when t = token -> Some help
        | _ -> None)

let private prefix = "menu:"
let private startsWith (p: string) (s: string) = s.StartsWith p
let private after (p: string) (s: string) = s.Substring p.Length

/// One handler for every menu button (registered per-token in Bot.fs).
let handleAction (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    let data =
        ctx.callbackQuery |> Option.bind (fun q -> q.data) |> Option.defaultValue ""

    ctx.answerCbQuery () |> ignore // dismiss the button's loading spinner

    if data = "menu:home" then
        ctx.editMessageText (homeText, homeKeyboard ())
    elif startsWith "menu:cat:" data then
        let id = after "menu:cat:" data

        match categories |> List.tryFind (fun c -> c.Id = id) with
        | Some c -> ctx.editMessageText (c.Title + "\n\nTap an action:", categoryKeyboard c)
        | None -> ctx.reply "That section vanished — try /menu again."
    elif startsWith "menu:run:" data then
        runLeaf config (after "menu:run:" data) ctx
    elif startsWith "menu:tip:" data then
        match tipText (after "menu:tip:" data) with
        | Some help -> ctx.reply help
        | None -> ctx.reply "Try /menu."
    else
        ctx.reply "Try /menu."

/// Every callback_data string the menu can emit — Bot.fs registers one action
/// per string, all routed to handleAction. A real array so JS callers (tests)
/// and the Bot.fs loop both iterate it directly.
let triggers: string[] =
    [| yield "menu:home"
       for c in categories do
           yield "menu:cat:" + c.Id

           for leaf in c.Leaves do
               match leaf with
               | Run (_, t) -> yield "menu:run:" + t
               | Tip (_, t, _) -> yield "menu:tip:" + t |]

// ── Native command autocomplete (setMyCommands) ────────────────────────────
/// The list Telegram shows in its ☰ menu button and /-autocomplete. Registered
/// once at startup in Bot.fs.
let botCommands: obj =
    let c (name: string) (desc: string) =
        createObj [ "command" ==> name; "description" ==> desc ]

    box
        [| c "menu" "📱 Tap-friendly menu of everything"
           c "help" "Show all commands"
           c "quote" "Get a motivational quote"
           c "sleep" "Log or review sleep"
           c "remind" "Set a reminder (plain English)"
           c "habit" "Track a habit"
           c "task" "Add or manage tasks"
           c "today" "Your day at a glance"
           c "plan" "AI-planned schedule"
           c "food" "Log food (or send a photo)"
           c "calories" "Calories today"
           c "weight" "Log your weight"
           c "progress" "Body trends + AI analysis"
           c "workout" "Log a workout"
           c "goal" "Set or update a goal"
           c "goals" "See goal progress"
           c "report" "Weekly / monthly review"
           c "coach" "Talk to your AI coach"
           c "focus" "Start a focus timer"
           c "mood" "Log how you feel"
           c "journal" "Write a journal note"
           c "buddy" "Accountability buddy"
           c "stats" "Your level, XP & badges"
           c "status" "Your plan (free / premium)"
           c "premium" "Unlock unlimited AI"
           c "settings" "Preferences & timezone"
           c "usage" "AI usage left today"
           c "export" "Download your data" |]
