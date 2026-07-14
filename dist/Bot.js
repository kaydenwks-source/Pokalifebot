
import { create as create_1 } from "./Bindings/Telegraf.js";
import { map, defaultArg, bind } from "./fable_modules/fable-library-js.5.7.0/Option.js";
import { item } from "./fable_modules/fable-library-js.5.7.0/Array.js";
import { printf, toText, substring, split } from "./fable_modules/fable-library-js.5.7.0/String.js";
import { record } from "./Services/Analytics.js";
import { handleSkip, handleStart } from "./Commands/Onboarding.js";
import { handleVersion, handlePing, handleHelp } from "./Commands/Basic.js";
import { int32ToString, disposeSafe, getEnumerator } from "./fable_modules/fable-library-js.5.7.0/Util.js";
import { botCommands, handleAction, triggers, handleMenu } from "./Commands/Menu.js";
import { error, warn } from "./Utils/Logger.js";
import { handleCategoryChosen, handleQuoteTime, handleCategory, handleQuote } from "./Commands/Quotes.js";
import { Categories_all } from "./Models/User.js";
import { handle } from "./Commands/Sleep.js";
import { handle as handle_1 } from "./Commands/Admin.js";
import { handleDelete, handleList, handleRemind } from "./Commands/Reminders.js";
import { handleNudges, handleListShortcut, handle as handle_2 } from "./Commands/Habits.js";
import { handlePlan, handleToday, handleTasks, handleTask } from "./Commands/Tasks.js";
import { handlePhoto, handleCalories, handleFood } from "./Commands/Food.js";
import { message } from "telegraf/filters";
import { handleTarget, handleProgress, handleHeight, handleBodyFat, handleWeight } from "./Commands/Body.js";
import { handle as handle_3 } from "./Commands/Workouts.js";
import { handle as handle_4 } from "./Commands/Busy.js";
import { handleListShortcut as handleListShortcut_1, handle as handle_5 } from "./Commands/Goals.js";
import { handle as handle_6 } from "./Commands/Report.js";
import { handle as handle_7 } from "./Commands/Coach.js";
import { handle as handle_8 } from "./Commands/Settings.js";
import { handleDeleteMe, handleExport, handleUsage } from "./Commands/Account.js";
import { handleSuccessfulPayment, handlePreCheckout, handleStatus, handle as handle_9 } from "./Commands/Premium.js";
import { handle as handle_10 } from "./Commands/Stats.js";
import { handle as handle_11 } from "./Commands/Buddy.js";
import { handle as handle_12 } from "./Commands/Focus.js";
import { handleJournal, handleMood } from "./Commands/Journal.js";
import { handle as handle_13 } from "./Commands/Voice.js";
import { handle as handle_14 } from "./Commands/NaturalLanguage.js";

export function create(config) {
    let arg;
    const bot = create_1(config.BotToken);
    bot.use((ctx, next) => {
        let text, from;
        const matchValue = ctx.from;
        const matchValue_1 = bind((m) => m.text, ctx.message);
        let matchResult, from_1, text_1;
        if (matchValue != null) {
            if (matchValue_1 != null) {
                if ((text = matchValue_1, (from = matchValue, text.startsWith("/")))) {
                    matchResult = 0;
                    from_1 = matchValue;
                    text_1 = matchValue_1;
                }
                else {
                    matchResult = 1;
                }
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
                const cmd = item(0, split(substring(text_1, 1), [" ", "@"])).toLowerCase();
                if (cmd !== "") {
                    record(from_1.id, cmd);
                }
                break;
            }
        }
        return next();
    });
    bot.start(handleStart);
    bot.help(handleHelp);
    const enumerator = getEnumerator([1, 2, 3]);
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const step = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]() | 0;
            bot.action("onb:skip:" + int32ToString(step), (ctx_3) => handleSkip(step, ctx_3));
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    bot.command("menu", handleMenu);
    for (let idx = 0; idx <= (triggers.length - 1); idx++) {
        const trigger = item(idx, triggers);
        bot.action(trigger, (ctx_5) => handleAction(config, ctx_5));
    }
    try {
        bot.telegram.setMyCommands(botCommands);
    }
    catch (ex) {
        warn((arg = ex.message, toText(printf("setMyCommands failed: %s"))(arg)));
    }
    bot.command("ping", handlePing);
    bot.command("version", handleVersion);
    bot.command("quote", (ctx_8) => handleQuote(config, ctx_8));
    bot.command("category", handleCategory);
    bot.command("quotetime", handleQuoteTime);
    const enumerator_1 = getEnumerator(Categories_all);
    try {
        while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
            const category = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
            bot.action("cat:" + category, (ctx_11) => handleCategoryChosen(category, ctx_11));
        }
    }
    finally {
        disposeSafe(enumerator_1);
    }
    bot.command("sleep", (ctx_12) => handle(config, ctx_12));
    bot.command("admin", (ctx_13) => handle_1(config, ctx_13));
    bot.command("remind", (ctx_14) => handleRemind(config, ctx_14));
    bot.command("reminders", handleList);
    bot.command("deletereminder", handleDelete);
    bot.command("habit", (ctx_17) => handle_2(config, ctx_17));
    bot.command("habits", handleListShortcut);
    bot.command("nudges", handleNudges);
    bot.command("task", handleTask);
    bot.command("tasks", handleTasks);
    bot.command("today", handleToday);
    bot.command("plan", (ctx_23) => handlePlan(config, ctx_23));
    bot.command("food", (ctx_24) => handleFood(config, ctx_24));
    bot.command("calories", handleCalories);
    bot.on(message("photo"), (ctx_26) => handlePhoto(config, ctx_26));
    bot.command("weight", handleWeight);
    bot.command("bodyfat", handleBodyFat);
    bot.command("height", handleHeight);
    bot.command("progress", (ctx_30) => handleProgress(config, ctx_30));
    bot.command("workout", (ctx_31) => handle_3(config, ctx_31));
    bot.command("busy", handle_4);
    bot.command("target", handleTarget);
    bot.command("goal", (ctx_34) => handle_5(config, ctx_34));
    bot.command("goals", handleListShortcut_1);
    bot.command("report", (ctx_36) => handle_6(config, ctx_36));
    bot.command("coach", (ctx_37) => handle_7(config, ctx_37));
    bot.command("settings", handle_8);
    bot.command("usage", (ctx_39) => handleUsage(config, ctx_39));
    bot.command("premium", (ctx_40) => handle_9(config, ctx_40));
    bot.command("status", (ctx_41) => handleStatus(config, ctx_41));
    bot.on("pre_checkout_query", handlePreCheckout);
    bot.on(message("successful_payment"), (ctx_43) => handleSuccessfulPayment(config, ctx_43));
    bot.command("stats", handle_10);
    bot.command("level", handle_10);
    bot.command("buddy", handle_11);
    bot.command("export", handleExport);
    bot.command("deleteme", handleDeleteMe);
    bot.command("focus", handle_12);
    bot.command("mood", handleMood);
    bot.command("journal", handleJournal);
    bot.on(message("voice"), (ctx_52) => handle_13(config, ctx_52));
    bot.on(message("text"), (ctx_53) => handle_14(config, ctx_53));
    bot.catch((err, ctx_54) => {
        const who = defaultArg(map((u) => u.first_name, ctx_54.from), "unknown user");
        error(toText(printf("Update handling failed for %s: %O"))(who)(err));
    });
    return bot;
}

