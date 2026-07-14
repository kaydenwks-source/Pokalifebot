
import { Record, Union } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, list_type, union_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { tryFind, tryPick, collect, singleton, append, chunkBySize, map, toArray, ofArray } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { ensureUser } from "./Common.js";
import { setPendingInput, clearPendingInput } from "../Services/Users.js";
import { handleCategory, handleQuote } from "./Quotes.js";
import { handleList } from "./Reminders.js";
import { handleListShortcut } from "./Habits.js";
import { handlePlan, handleTasks, handleToday } from "./Tasks.js";
import { handleCalories } from "./Food.js";
import { handleProgress } from "./Body.js";
import { handleListShortcut as handleListShortcut_1 } from "./Goals.js";
import { handle } from "./Report.js";
import { handle as handle_1 } from "./Buddy.js";
import { handle as handle_2 } from "./Stats.js";
import { handle as handle_3, handleStatus } from "./Premium.js";
import { handleUsage } from "./Account.js";
import { substring } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { bind, defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { collect as collect_1, singleton as singleton_1, append as append_1, delay, toArray as toArray_1 } from "../fable_modules/fable-library-js.5.7.0/Seq.js";

export class Leaf extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Run", "Ask", "Info"];
    }
}

export function Leaf_$reflection() {
    return union_type("Commands.Menu.Leaf", [], Leaf, () => [[["label", string_type], ["token", string_type]], [["label", string_type], ["token", string_type], ["prompt", string_type]], [["label", string_type], ["token", string_type], ["help", string_type]]]);
}

export class Category extends Record {
    constructor(Id, Title, Leaves) {
        super();
        this.Id = Id;
        this.Title = Title;
        this.Leaves = Leaves;
    }
}

export function Category_$reflection() {
    return record_type("Commands.Menu.Category", [], Category, () => [["Id", string_type], ["Title", string_type], ["Leaves", list_type(Leaf_$reflection())]]);
}

const categories = ofArray([new Category("motivate", "🌅 Motivation", ofArray([new Leaf(/* Run */ 0, ["✨ Get a quote", "quote"]), new Leaf(/* Run */ 0, ["🏷 Choose category", "category"]), new Leaf(/* Ask */ 1, ["⏰ Daily quote time", "quotetime", "⏰ Reply with a time for your daily quote, e.g. <code>07:00</code> (or <code>off</code>)."])])), new Category("sleep", "😴 Sleep", ofArray([new Leaf(/* Ask */ 1, ["🛏 Log sleep", "sleeplog", "🛏 Reply with bedtime &amp; wake time, e.g. <code>23:30 07:00</code>."]), new Leaf(/* Info */ 2, ["📊 Sleep stats", "sleepstats", "📊 Review your sleep:\n<code>/sleep stats</code> · <code>/sleep today</code> · <code>/sleep history</code>"])])), new Category("remind", "⏰ Reminders", ofArray([new Leaf(/* Run */ 0, ["📋 My reminders", "reminders"]), new Leaf(/* Ask */ 1, ["➕ Set a reminder", "remind", "⏰ Reply in plain English, e.g. <code>every monday 8am gym</code>."])])), new Category("habits", "🔥 Habits", ofArray([new Leaf(/* Run */ 0, ["📋 My habits", "habits"]), new Leaf(/* Ask */ 1, ["➕ Add a habit", "habitadd", "🔥 Reply with a habit to track, e.g. <code>read daily</code> (daily · weekly · monthly)."]), new Leaf(/* Ask */ 1, ["✅ Mark one done", "habitdone", "✅ Reply with the habit name, e.g. <code>read</code>."])])), new Category("planner", "📝 Planner", ofArray([new Leaf(/* Run */ 0, ["📅 Today", "today"]), new Leaf(/* Run */ 0, ["🗒 My tasks", "tasks"]), new Leaf(/* Run */ 0, ["🤖 AI plan my day", "plan"]), new Leaf(/* Ask */ 1, ["➕ Add a task", "taskadd", "📝 Reply with the task, e.g. <code>buy milk !high @18:00</code> (!high/!low and @time optional)."])])), new Category("food", "🍽 Calories", ofArray([new Leaf(/* Run */ 0, ["📊 Today\'s calories", "calories"]), new Leaf(/* Ask */ 1, ["🍽 Log food", "food", "🍽 Reply with what you ate, e.g. <code>chicken rice and a coke</code>.\n📸 Or just send a photo of your plate."])])), new Category("body", "⚖️ Body", ofArray([new Leaf(/* Run */ 0, ["📈 My progress", "progress"]), new Leaf(/* Ask */ 1, ["⚖️ Log weight", "weight", "⚖️ Reply with your weight in kg, e.g. <code>72.5</code>."]), new Leaf(/* Ask */ 1, ["🎯 Set a target", "target", "🎯 Reply with your goal, e.g. <code>68 in 10 weeks</code>."]), new Leaf(/* Info */ 2, ["📏 Body fat / height", "bodyhw", "📏 <code>/bodyfat 18</code> · <code>/height 175</code>"])])), new Category("workouts", "🏋️ Workouts", ofArray([new Leaf(/* Ask */ 1, ["🏋️ Log a workout", "workoutlog", "🏋️ Reply with your workout, e.g. <code>bench press 3x8 60kg</code> or <code>ran 5km</code>."]), new Leaf(/* Info */ 2, ["📊 History & PRs", "workouthist", "📊 <code>/workout history</code> · <code>/workout prs</code> · <code>/workout tips</code>"])])), new Category("goals", "🎯 Goals", ofArray([new Leaf(/* Run */ 0, ["📋 My goals", "goals"]), new Leaf(/* Ask */ 1, ["➕ Add a goal", "goaladd", "🎯 Reply with your goal — I\'ll break it down, e.g. <code>read 20 books</code> or <code>run 10km</code>."]), new Leaf(/* Ask */ 1, ["📈 Log progress", "goallog", "📈 Reply with the goal number (from /goals) then the amount, e.g. <code>1 3</code>."])])), new Category("reports", "📊 Reports", ofArray([new Leaf(/* Run */ 0, ["🗓 Weekly review", "report"]), new Leaf(/* Info */ 2, ["📅 Monthly deep-dive", "reportmonth", "📅 <code>/report month</code> — 30-day deep-dive + productivity score (Premium — see /premium)."])])), new Category("mind", "🧠 Coach & focus", ofArray([new Leaf(/* Ask */ 1, ["🧠 Talk to your coach", "coach", "🧠 I\'m listening — reply with what\'s on your mind, e.g. <code>I feel unmotivated today</code>."]), new Leaf(/* Ask */ 1, ["🍅 Focus timer", "focus", "🍅 Reply with minutes for a Pomodoro, e.g. <code>25</code>. I\'ll ping you when it\'s up."]), new Leaf(/* Ask */ 1, ["🙂 Log mood", "mood", "🙂 Reply with 1–5 and an optional note, e.g. <code>4 feeling good</code>."])])), new Category("buddy", "🤝 Buddy", ofArray([new Leaf(/* Run */ 0, ["👥 My buddy", "buddy"]), new Leaf(/* Info */ 2, ["🔗 Invite a buddy", "buddyinvite", "🔗 Send <code>/buddy invite</code> — I\'ll give you a code to share."]), new Leaf(/* Ask */ 1, ["🤝 Accept a code", "buddyaccept", "🤝 Reply with your friend\'s code, e.g. <code>ABC123</code>."])])), new Category("account", "⭐ Premium & you", ofArray([new Leaf(/* Run */ 0, ["🏅 My stats", "stats"]), new Leaf(/* Run */ 0, ["📋 My plan", "status"]), new Leaf(/* Run */ 0, ["⭐ Get Premium", "premium"]), new Leaf(/* Run */ 0, ["📊 AI usage", "usage"]), new Leaf(/* Info */ 2, ["⚙️ Settings", "settings", "⚙️ <code>/settings</code> — see everything; also timezone, morning &amp; evening times."]), new Leaf(/* Info */ 2, ["🔐 Your data", "data", "🔐 It\'s yours: <code>/export</code> to download, <code>/deleteme</code> to erase."])])), new Category("basics", "ℹ️ Basics", ofArray([new Leaf(/* Info */ 2, ["📖 All commands", "help", "📖 Send <code>/help</code> for the full command list."]), new Leaf(/* Info */ 2, ["🏓 Is the bot alive?", "ping", "🏓 Send <code>/ping</code> to check."])]))]);

const homeText = "📱 Momentum menu\n\nTap a section below to see its actions.\n\n💡 You can also just talk to me — “ate chicken rice”, “slept 1am woke 8am”, “gym done” — or send a 🎙 voice note. No commands needed.";

function button(text, data) {
    return {
        text: text,
        callback_data: data,
    };
}

function keyboardExtra(rows) {
    return {
        reply_markup: {
            inline_keyboard: rows,
        },
    };
}

const askExtra = {
    parse_mode: "HTML",
    reply_markup: {
        force_reply: true,
    },
};

const htmlExtra = {
    parse_mode: "HTML",
};

function homeKeyboard() {
    return keyboardExtra(toArray(map(toArray, chunkBySize(2, map((c) => button(c.Title, "menu:cat:" + c.Id), categories)))));
}

function leafButton(leaf) {
    switch (leaf.tag) {
        case 1:
            return button(leaf.fields[0], "menu:ask:" + leaf.fields[1]);
        case 2:
            return button(leaf.fields[0], "menu:tip:" + leaf.fields[1]);
        default:
            return button(leaf.fields[0], "menu:run:" + leaf.fields[1]);
    }
}

function categoryKeyboard(c) {
    return keyboardExtra(toArray(append(map(toArray, chunkBySize(2, map(leafButton, c.Leaves))), singleton([button("⬅ Back", "menu:home")]))));
}

export function handleMenu(ctx) {
    const matchValue = ensureUser(ctx);
    let matchResult, u_1;
    if (matchValue != null) {
        if (matchValue.PendingInput != null) {
            matchResult = 0;
            u_1 = matchValue;
        }
        else {
            matchResult = 1;
        }
    }
    else {
        matchResult = 1;
    }
    switch (matchResult) {
        case 0: {
            clearPendingInput(u_1.Id);
            break;
        }
    }
    return ctx.reply(homeText, homeKeyboard());
}

const allLeaves = collect((c) => c.Leaves, categories);

function askPrompt(token) {
    return tryPick((leaf) => {
        let matchResult, prompt_1, t_1;
        if (leaf.tag === 1) {
            if (leaf.fields[1] === token) {
                matchResult = 0;
                prompt_1 = leaf.fields[2];
                t_1 = leaf.fields[1];
            }
            else {
                matchResult = 1;
            }
        }
        else {
            matchResult = 1;
        }
        switch (matchResult) {
            case 0:
                return prompt_1;
            default:
                return undefined;
        }
    }, allLeaves);
}

function infoHelp(token) {
    return tryPick((leaf) => {
        let matchResult, help_1, t_1;
        if (leaf.tag === 2) {
            if (leaf.fields[1] === token) {
                matchResult = 0;
                help_1 = leaf.fields[2];
                t_1 = leaf.fields[1];
            }
            else {
                matchResult = 1;
            }
        }
        else {
            matchResult = 1;
        }
        switch (matchResult) {
            case 0:
                return help_1;
            default:
                return undefined;
        }
    }, allLeaves);
}

function runLeaf(config, token, ctx) {
    switch (token) {
        case "quote":
            return handleQuote(config, ctx);
        case "category":
            return handleCategory(ctx);
        case "reminders":
            return handleList(ctx);
        case "habits":
            return handleListShortcut(ctx);
        case "today":
            return handleToday(ctx);
        case "tasks":
            return handleTasks(ctx);
        case "plan":
            return handlePlan(config, ctx);
        case "calories":
            return handleCalories(ctx);
        case "progress":
            return handleProgress(config, ctx);
        case "goals":
            return handleListShortcut_1(ctx);
        case "report":
            return handle(config, ctx);
        case "buddy":
            return handle_1(ctx);
        case "stats":
            return handle_2(ctx);
        case "status":
            return handleStatus(config, ctx);
        case "premium":
            return handle_3(config, ctx);
        case "usage":
            return handleUsage(config, ctx);
        default:
            return ctx.reply("Hmm, I don\'t recognise that action — try /menu again.");
    }
}

function startsWith(p, s) {
    return s.startsWith(p);
}

function after(p, s) {
    return substring(s, p.length);
}

function cancelPendingIfAny(ctx) {
    const matchValue = ensureUser(ctx);
    let matchResult, u_1;
    if (matchValue != null) {
        if (matchValue.PendingInput != null) {
            matchResult = 0;
            u_1 = matchValue;
        }
        else {
            matchResult = 1;
        }
    }
    else {
        matchResult = 1;
    }
    switch (matchResult) {
        case 0: {
            clearPendingInput(u_1.Id);
            break;
        }
        case 1: {
            break;
        }
    }
}

/**
 * One handler for every menu button (registered per-token in Bot.fs).
 */
export function handleAction(config, ctx) {
    const data = defaultArg(bind((q) => q.data, ctx.callbackQuery), "");
    ctx.answerCbQuery();
    if (startsWith("menu:ask:", data)) {
        const token = after("menu:ask:", data);
        const matchValue = ensureUser(ctx);
        const matchValue_1 = askPrompt(token);
        let matchResult, prompt, u;
        if (matchValue != null) {
            if (matchValue_1 != null) {
                matchResult = 0;
                prompt = matchValue_1;
                u = matchValue;
            }
            else {
                matchResult = 1;
            }
        }
        else {
            matchResult = 1;
        }
        switch (matchResult) {
            case 0: {
                setPendingInput(u.Id, token);
                return ctx.reply(prompt, askExtra);
            }
            default:
                return ctx.reply("Try /menu again.");
        }
    }
    else {
        cancelPendingIfAny(ctx);
        if (data === "menu:home") {
            return ctx.editMessageText(homeText, homeKeyboard());
        }
        else if (startsWith("menu:cat:", data)) {
            const id = after("menu:cat:", data);
            const matchValue_3 = tryFind((c) => (c.Id === id), categories);
            if (matchValue_3 == null) {
                return ctx.reply("That section vanished — try /menu again.");
            }
            else {
                const c_1 = matchValue_3;
                return ctx.editMessageText(c_1.Title + "\n\nTap an action:", categoryKeyboard(c_1));
            }
        }
        else if (startsWith("menu:run:", data)) {
            return runLeaf(config, after("menu:run:", data), ctx);
        }
        else if (startsWith("menu:tip:", data)) {
            const matchValue_4 = infoHelp(after("menu:tip:", data));
            if (matchValue_4 == null) {
                return ctx.reply("Try /menu.");
            }
            else {
                const help = matchValue_4;
                return ctx.reply(help, htmlExtra);
            }
        }
        else {
            return ctx.reply("Try /menu.");
        }
    }
}

export const triggers = toArray_1(delay(() => append_1(singleton_1("menu:home"), delay(() => collect_1((c) => append_1(singleton_1("menu:cat:" + c.Id), delay(() => collect_1((leaf) => {
    const matchValue = leaf;
    return (matchValue.tag === 1) ? singleton_1("menu:ask:" + matchValue.fields[1]) : ((matchValue.tag === 2) ? singleton_1("menu:tip:" + matchValue.fields[1]) : singleton_1("menu:run:" + matchValue.fields[1]));
}, c.Leaves))), categories)))));

export const botCommands = (() => {
    const c = (name, desc) => ({
        command: name,
        description: desc,
    });
    return [c("menu", "📱 Tap-friendly menu of everything"), c("help", "Show all commands"), c("quote", "Get a motivational quote"), c("sleep", "Log or review sleep"), c("remind", "Set a reminder (plain English)"), c("habit", "Track a habit"), c("task", "Add or manage tasks"), c("today", "Your day at a glance"), c("plan", "AI-planned schedule"), c("food", "Log food (or send a photo)"), c("calories", "Calories today"), c("weight", "Log your weight"), c("progress", "Body trends + AI analysis"), c("workout", "Log a workout"), c("goal", "Set or update a goal"), c("goals", "See goal progress"), c("report", "Weekly / monthly review"), c("coach", "Talk to your AI coach"), c("focus", "Start a focus timer"), c("mood", "Log how you feel"), c("journal", "Write a journal note"), c("buddy", "Accountability buddy"), c("stats", "Your level, XP & badges"), c("status", "Your plan (free / premium)"), c("premium", "Unlock unlimited AI"), c("settings", "Preferences & timezone"), c("usage", "AI usage left today"), c("export", "Download your data")];
})();

