
import * as node$003Afs from "node:fs";
import { item } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { info, error } from "../Utils/Logger.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { Lazy } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { openDatabase } from "../Bindings/Sqlite.js";
import { Operators_IsNull } from "../fable_modules/fable-library-js.5.7.0/FSharp.Core.js";
import { some } from "../fable_modules/fable-library-js.5.7.0/Option.js";

const dbFile = "database/momentum.db";

function ensureDir(dir) {
    if (!node$003Afs.existsSync(dir)) {
        node$003Afs.mkdirSync(dir, {
            recursive: true,
        });
    }
}

function importLegacyJson(d) {
    const insert = d.prepare("INSERT OR IGNORE INTO kv (path, data) VALUES (?, ?)");
    let files;
    try {
        files = node$003Afs.readdirSync("database");
    }
    catch (matchValue) {
        files = [];
    }
    for (let idx = 0; idx <= (files.length - 1); idx++) {
        let arg_2;
        const file = item(idx, files);
        if (file.endsWith(".json")) {
            const path = "database/" + file;
            try {
                const raw = node$003Afs.readFileSync(path, "utf8");
                JSON.parse(raw);
                insert.run(path, raw);
                info(toText(printf("Storage: migrated %s into SQLite"))(path));
            }
            catch (ex) {
                error((arg_2 = ex.message, toText(printf("Storage: could not migrate %s: %s"))(path)(arg_2)));
            }
        }
    }
}

const db = new Lazy(() => {
    ensureDir("database");
    const d = openDatabase(dbFile);
    d.exec("CREATE TABLE IF NOT EXISTS kv (path TEXT PRIMARY KEY, data TEXT NOT NULL)");
    const countRow = (d.prepare("SELECT COUNT(*) AS n FROM kv")).get();
    if (countRow.n === 0) {
        importLegacyJson(d);
    }
    return d;
});

/**
 * The shared SQLite connection, for features that warrant a real table
 * (analytics' append-and-aggregate workload) rather than a KV blob.
 */
export function database() {
    return db.Value;
}

/**
 * Read a collection into a typed value. None when absent or corrupt
 * (corruption is logged — the bot keeps running with empty data).
 */
export function load(path) {
    let arg_1;
    try {
        const row = (db.Value.prepare("SELECT data FROM kv WHERE path = ?")).get(path);
        return (Operators_IsNull(row) ? true : ((typeof row) === "undefined")) ? undefined : some(JSON.parse(row.data));
    }
    catch (ex) {
        error((arg_1 = ex.message, toText(printf("Storage: failed to read %s: %s"))(path)(arg_1)));
        return undefined;
    }
}

/**
 * Upsert a collection as JSON in a single atomic statement.
 */
export function save(path, value) {
    let arg_1;
    try {
        const stmt = db.Value.prepare("INSERT INTO kv (path, data) VALUES (?, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data");
        stmt.run(path, (JSON.stringify(value)));
    }
    catch (ex) {
        error((arg_1 = ex.message, toText(printf("Storage: failed to write %s: %s"))(path)(arg_1)));
    }
}

