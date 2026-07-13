/// Interactive, tap-first menu (Phase 28). /menu shows category buttons; each
/// category expands, in place, to its actions. Three leaf kinds:
///   • Run  — tapping runs a no-arg view via the real handler (Common.commandArg
///            returns None on a button press, so it behaves as its default).
///   • Ask  — tapping asks for a single value with force_reply, then the user's
///            typed reply is routed to the command (Users.PendingInput +
///            NaturalLanguage.dispatchPending).
///   • Info — tapping shows tap-to-copy example commands (HTML <code>).
/// This module also owns the list registered for native /-autocomplete.
module Commands.Menu

open Fable.Core
open Fable.Core.JsInterop
open Bindings.Telegraf
open Services
open Config

// ── Menu model ─────────────────────────────────────────────────────────────
type Leaf =
    | Run of label: string * token: string
    | Ask of label: string * token: string * prompt: string
    | Info of label: string * token: string * help: string

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
            Ask("⏰ Daily quote time", "quotetime", "⏰ Reply with a time for your daily quote, e.g. <code>07:00</code> (or <code>off</code>).") ] }
      { Id = "sleep"
        Title = "😴 Sleep"
        Leaves =
          [ Ask("🛏 Log sleep", "sleeplog", "🛏 Reply with bedtime &amp; wake time, e.g. <code>23:30 07:00</code>.")
            Info("📊 Sleep stats", "sleepstats", "📊 Review your sleep:\n<code>/sleep stats</code> · <code>/sleep today</code> · <code>/sleep history</code>") ] }
      { Id = "remind"
        Title = "⏰ Reminders"
        Leaves =
          [ Run("📋 My reminders", "reminders")
            Ask("➕ Set a reminder", "remind", "⏰ Reply in plain English, e.g. <code>every monday 8am gym</code>.") ] }
      { Id = "habits"
        Title = "🔥 Habits"
        Leaves =
          [ Run("📋 My habits", "habits")
            Ask("➕ Add a habit", "habitadd", "🔥 Reply with a habit to track, e.g. <code>read daily</code> (daily · weekly · monthly).")
            Ask("✅ Mark one done", "habitdone", "✅ Reply with the habit name, e.g. <code>read</code>.") ] }
      { Id = "planner"
        Title = "📝 Planner"
        Leaves =
          [ Run("📅 Today", "today")
            Run("🗒 My tasks", "tasks")
            Run("🤖 AI plan my day", "plan")
            Ask("➕ Add a task", "taskadd", "📝 Reply with the task, e.g. <code>buy milk !high @18:00</code> (!high/!low and @time optional).") ] }
      { Id = "food"
        Title = "🍽 Calories"
        Leaves =
          [ Run("📊 Today's calories", "calories")
            Ask("🍽 Log food", "food", "🍽 Reply with what you ate, e.g. <code>chicken rice and a coke</code>.\n📸 Or just send a photo of your plate.") ] }
      { Id = "body"
        Title = "⚖️ Body"
        Leaves =
          [ Run("📈 My progress", "progress")
            Ask("⚖️ Log weight", "weight", "⚖️ Reply with your weight in kg, e.g. <code>72.5</code>.")
            Ask("🎯 Set a target", "target", "🎯 Reply with your goal, e.g. <code>68 in 10 weeks</code>.")
            Info("📏 Body fat / height", "bodyhw", "📏 <code>/bodyfat 18</code> · <code>/height 175</code>") ] }
      { Id = "workouts"
        Title = "🏋️ Workouts"
        Leaves =
          [ Ask("🏋️ Log a workout", "workoutlog", "🏋️ Reply with your workout, e.g. <code>bench press 3x8 60kg</code> or <code>ran 5km</code>.")
            Info("📊 History & PRs", "workouthist", "📊 <code>/workout history</code> · <code>/workout prs</code> · <code>/workout tips</code>") ] }
      { Id = "goals"
        Title = "🎯 Goals"
        Leaves =
          [ Run("📋 My goals", "goals")
            Ask("➕ Add a goal", "goaladd", "🎯 Reply with your goal — I'll break it down, e.g. <code>read 20 books</code> or <code>run 10km</code>.")
            Ask("📈 Log progress", "goallog", "📈 Reply with the goal number (from /goals) then the amount, e.g. <code>1 3</code>.") ] }
      { Id = "reports"
        Title = "📊 Reports"
        Leaves =
          [ Run("🗓 Weekly review", "report")
            Info("📅 Monthly deep-dive", "reportmonth", "📅 <code>/report month</code> — 30-day deep-dive + productivity score (Premium — see /premium).") ] }
      { Id = "mind"
        Title = "🧠 Coach & focus"
        Leaves =
          [ Ask("🧠 Talk to your coach", "coach", "🧠 I'm listening — reply with what's on your mind, e.g. <code>I feel unmotivated today</code>.")
            Ask("🍅 Focus timer", "focus", "🍅 Reply with minutes for a Pomodoro, e.g. <code>25</code>. I'll ping you when it's up.")
            Ask("🙂 Log mood", "mood", "🙂 Reply with 1–5 and an optional note, e.g. <code>4 feeling good</code>.") ] }
      { Id = "buddy"
        Title = "🤝 Buddy"
        Leaves =
          [ Run("👥 My buddy", "buddy")
            Info("🔗 Invite a buddy", "buddyinvite", "🔗 Send <code>/buddy invite</code> — I'll give you a code to share.")
            Ask("🤝 Accept a code", "buddyaccept", "🤝 Reply with your friend's code, e.g. <code>ABC123</code>.") ] }
      { Id = "account"
        Title = "⭐ Premium & you"
        Leaves =
          [ Run("🏅 My stats", "stats")
            Run("📋 My plan", "status")
            Run("⭐ Get Premium", "premium")
            Run("📊 AI usage", "usage")
            Info("⚙️ Settings", "settings", "⚙️ <code>/settings</code> — see everything; also timezone, morning &amp; evening times.")
            Info("🔐 Your data", "data", "🔐 It's yours: <code>/export</code> to download, <code>/deleteme</code> to erase.") ] }
      { Id = "basics"
        Title = "ℹ️ Basics"
        Leaves =
          [ Info("📖 All commands", "help", "📖 Send <code>/help</code> for the full command list.")
            Info("🏓 Is the bot alive?", "ping", "🏓 Send <code>/ping</code> to check.") ] } ]

// ── Rendering ──────────────────────────────────────────────────────────────
let private homeText =
    "📱 Momentum menu\n\nTap a section below to see its actions.\n\n💡 You can also just talk to me — “ate chicken rice”, “slept 1am woke 8am”, “gym done” — or send a 🎙 voice note. No commands needed."

let private button (text: string) (data: string) : obj =
    createObj [ "text" ==> text; "callback_data" ==> data ]

let private keyboardExtra (rows: obj[][]) : obj =
    createObj [ "reply_markup" ==> createObj [ "inline_keyboard" ==> rows ] ]

/// force_reply focuses the user's text box; HTML makes the <code> example
/// tap-to-copy.
let private askExtra: obj =
    createObj [ "parse_mode" ==> "HTML"; "reply_markup" ==> createObj [ "force_reply" ==> true ] ]

let private htmlExtra: obj = createObj [ "parse_mode" ==> "HTML" ]

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
    | Ask (label, token, _) -> button label ("menu:ask:" + token)
    | Info (label, token, _) -> button label ("menu:tip:" + token)

let private categoryKeyboard (c: Category) : obj =
    let leafRows =
        c.Leaves |> List.map leafButton |> List.chunkBySize 2 |> List.map List.toArray

    (leafRows @ [ [| button "⬅ Back" "menu:home" |] ]) |> List.toArray |> keyboardExtra

// ── Command entry point ────────────────────────────────────────────────────
let handleMenu (ctx: Context) : JS.Promise<obj> =
    // Opening the menu cancels any half-finished "tap an input action" prompt.
    match Common.ensureUser ctx with
    | Some u when u.PendingInput.IsSome -> Users.clearPendingInput u.Id
    | _ -> ()

    ctx.reply (homeText, homeKeyboard ())

// ── Callback dispatch ──────────────────────────────────────────────────────
let private allLeaves = categories |> List.collect (fun c -> c.Leaves)

let private askPrompt (token: string) : string option =
    allLeaves
    |> List.tryPick (fun leaf ->
        match leaf with
        | Ask (_, t, prompt) when t = token -> Some prompt
        | _ -> None)

let private infoHelp (token: string) : string option =
    allLeaves
    |> List.tryPick (fun leaf ->
        match leaf with
        | Info (_, t, help) when t = token -> Some help
        | _ -> None)

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

let private startsWith (p: string) (s: string) = s.StartsWith p
let private after (p: string) (s: string) = s.Substring p.Length

/// Cancel a stale pending input when the user taps anything other than a fresh
/// input prompt, so a forgotten "tap-to-log" can't hijack their next message.
let private cancelPendingIfAny (ctx: Context) =
    match Common.ensureUser ctx with
    | Some u when u.PendingInput.IsSome -> Users.clearPendingInput u.Id
    | _ -> ()

/// One handler for every menu button (registered per-token in Bot.fs).
let handleAction (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    let data =
        ctx.callbackQuery |> Option.bind (fun q -> q.data) |> Option.defaultValue ""

    ctx.answerCbQuery () |> ignore // dismiss the button's loading spinner

    if startsWith "menu:ask:" data then
        // Remember which input the user wants to give, then focus their keyboard.
        let token = after "menu:ask:" data

        match Common.ensureUser ctx, askPrompt token with
        | Some u, Some prompt ->
            Users.setPendingInput u.Id token
            ctx.reply (prompt, askExtra)
        | _ -> ctx.reply "Try /menu again."
    else
        cancelPendingIfAny ctx

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
            match infoHelp (after "menu:tip:" data) with
            | Some help -> ctx.reply (help, htmlExtra)
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
               | Ask (_, t, _) -> yield "menu:ask:" + t
               | Info (_, t, _) -> yield "menu:tip:" + t |]

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
