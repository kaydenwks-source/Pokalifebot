
import { tryGetEnv } from "../Bindings/Node.js";
import { Lazy } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { neon } from "@neondatabase/serverless";
import { value } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { error, info } from "../Utils/Logger.js";
import * as node$003Afs from "node:fs";
import { item } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { database } from "./Storage.js";

const dbFile = "database/momentum.db";

const tempFile = "database/_snapshot.db";

function connectionString() {
    return tryGetEnv("DATABASE_URL");
}

/**
 * True when a Neon connection string is configured (i.e. in production).
 */
export function enabled() {
    return connectionString() != null;
}

const sql = new Lazy(() => neon(value(connectionString())));

function ensureTable() {
    return sql.Value`CREATE TABLE IF NOT EXISTS db_snapshot (id INT PRIMARY KEY, data TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
}

/**
 * Pull the latest snapshot from Neon onto the local disk. Safe to call always:
 * no DATABASE_URL → skip; no snapshot yet → start fresh; any error → log and
 * continue on whatever local file exists. Never rejects.
 */
export function restore() {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const matchValue = connectionString();
        if (matchValue != null) {
            return PromiseBuilder__Delay_62FBFDE1(promise, () => (ensureTable().then((_arg) => ((sql.Value`SELECT data FROM db_snapshot WHERE id = 1`).then((_arg_1) => {
                const rows = _arg_1;
                if (rows.length === 0) {
                    info("Cloud: no snapshot in Neon yet — starting with a fresh database.");
                    return Promise.resolve();
                }
                else {
                    return (!node$003Afs.existsSync("database") ? ((node$003Afs.mkdirSync("database", {
                        recursive: true,
                    }), Promise.resolve())) : (Promise.resolve())).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => {
                        const b64 = item(0, rows).data;
                        node$003Afs.writeFileSync(dbFile, Buffer.from(b64, 'base64'));
                        info("Cloud: restored the database snapshot from Neon.");
                        return Promise.resolve();
                    }));
                }
            }))))).catch((_arg_2) => {
                let arg;
                error((arg = _arg_2.message, toText(printf("Cloud: restore failed — continuing on local data: %s"))(arg)));
                return Promise.resolve();
            });
        }
        else {
            info("Cloud: no DATABASE_URL set — using the local SQLite file only.");
            return Promise.resolve();
        }
    }));
}

/**
 * Push a consistent copy of the current database up to Neon. VACUUM INTO makes
 * a clean snapshot even if a write lands at the same instant. Never rejects.
 */
export function snapshot() {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const matchValue = connectionString();
        if (matchValue != null) {
            return PromiseBuilder__Delay_62FBFDE1(promise, () => ((node$003Afs.existsSync(tempFile) ? ((node$003Afs.unlinkSync(tempFile), Promise.resolve())) : (Promise.resolve())).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => {
                database().exec(toText(printf("VACUUM INTO \'%s\'"))(tempFile));
                const b64 = node$003Afs.readFileSync(tempFile, "base64");
                node$003Afs.unlinkSync(tempFile);
                return ensureTable().then((_arg) => ((sql.Value`INSERT INTO db_snapshot (id, data, updated_at) VALUES (1, ${b64}, now()) ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated_at = now()`).then((_arg_1) => {
                    info("Cloud: snapshot saved to Neon.");
                    return Promise.resolve();
                })));
            })))).catch((_arg_2) => {
                let arg_1;
                error((arg_1 = _arg_2.message, toText(printf("Cloud: snapshot failed (will retry next tick): %s"))(arg_1)));
                return Promise.resolve();
            });
        }
        else {
            return Promise.resolve();
        }
    }));
}

