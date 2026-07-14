
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "./fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { error, info } from "./Utils/Logger.js";
import { printf, toText } from "./fable_modules/fable-library-js.5.7.0/String.js";
import { promise } from "./fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { snapshot, enabled, restore } from "./Services/Cloud.js";
import { start as start_1 } from "./Server.js";
import { create } from "./Bot.js";
import { start as start_2 } from "./Scheduler/DailyQuotes.js";
import { start as start_3 } from "./Scheduler/Reminders.js";
import { start as start_4 } from "./Scheduler/HabitNudges.js";
import { start as start_5 } from "./Scheduler/WeeklyReports.js";
import { start as start_6 } from "./Scheduler/MonthlyReports.js";
import { start as start_7 } from "./Scheduler/Backups.js";
import { testConnection } from "./Ai/DeepSeek.js";
import { load } from "./Config/Env.js";
import { iterate } from "./fable_modules/fable-library-js.5.7.0/List.js";

function start(config) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        info(toText(printf("Momentum AI v%s starting in %s mode"))("0.29.0")(config.Environment));
        return restore().then(() => {
            start_1();
            const bot = create(config);
            start_2(config, bot);
            start_3(bot);
            start_4(bot);
            start_5(config, bot);
            start_6(config, bot);
            start_7();
            return (enabled() ? ((void (setInterval((() => {
                snapshot();
            }), 120000)), Promise.resolve())) : (Promise.resolve())).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => {
                const shutdown = (reason) => {
                    PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
                        info(toText(printf("Received %s — saving a final snapshot then shutting down."))(reason));
                        return snapshot().then(() => {
                            bot.stop(reason);
                            process.exit(0);
                            return Promise.resolve();
                        });
                    }));
                };
                process.once("SIGINT", (_arg_2) => {
                    shutdown("SIGINT");
                });
                process.once("SIGTERM", (_arg_3) => {
                    shutdown("SIGTERM");
                });
                return bot.telegram.getMe().then((_arg_4) => {
                    let arg_3;
                    info((arg_3 = _arg_4.username, toText(printf("Connected to Telegram as @%s"))(arg_3)));
                    testConnection(config);
                    return bot.launch(() => {
                        info("Bot is live — send /start to it in Telegram. Press Ctrl+C to stop.");
                    }).then(() => (Promise.resolve(undefined)));
                });
            }));
        });
    }));
}

function main() {
    let pr;
    process.on("unhandledRejection", (reason) => {
        error(toText(printf("Unhandled promise rejection: %O"))(reason));
    });
    const matchValue = load();
    if (matchValue.tag === 0) {
        (pr = start(matchValue.fields[0]), pr.catch((ex) => {
            error("Fatal startup error: " + ex.message);
            process.exit(1);
        }));
    }
    else {
        error("Cannot start — missing required environment variables:");
        iterate((name) => {
            error("  • " + name);
        }, matchValue.fields[0]);
        error("Fix: copy .env.example to .env and fill in the values.");
        process.exit(1);
    }
}

main();

