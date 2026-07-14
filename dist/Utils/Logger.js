
import { Union } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { union_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { now, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import * as node$003Afs from "node:fs";

export class Level extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Debug", "Info", "Warn", "Error"];
    }
    static Debug = new Level(0, []);
    static Info = new Level(1, []);
    static Warn = new Level(2, []);
    static Error$ = new Level(3, []);
}

export function Level_$reflection() {
    return union_type("Utils.Logger.Level", [], Level, () => [[], [], [], []]);
}

function label(_arg) {
    switch (_arg.tag) {
        case 1:
            return "INFO ";
        case 2:
            return "WARN ";
        case 3:
            return "ERROR";
        default:
            return "DEBUG";
    }
}

const logDir = "logs";

const logFile = "logs/bot.log";

function write(level, message) {
    const timestamp = toString(now(), "yyyy-MM-dd HH:mm:ss");
    let line;
    const arg_1 = label(level);
    line = toText(printf("[%s] [%s] %s"))(timestamp)(arg_1)(message);
    switch (level.tag) {
        case 3: {
            console.error(line);
            break;
        }
        case 2: {
            console.warn(line);
            break;
        }
        default:
            console.log(line);
    }
    try {
        if (!node$003Afs.existsSync(logDir)) {
            node$003Afs.mkdirSync(logDir, {
                recursive: true,
            });
        }
        node$003Afs.appendFileSync(logFile, line + "\n");
    }
    catch (matchValue) {
    }
}

export function debug(message) {
    write(Level.Debug, message);
}

export function info(message) {
    write(Level.Info, message);
}

export function warn(message) {
    write(Level.Warn, message);
}

export function error(message) {
    write(Level.Error$, message);
}

