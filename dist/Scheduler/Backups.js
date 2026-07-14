
import { info, error } from "../Utils/Logger.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import * as node$003Afs from "node:fs";
import { now, toString } from "../fable_modules/fable-library-js.5.7.0/Date.js";
import { database } from "../Services/Storage.js";
import { take, sort } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { comparePrimitives } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { min } from "../fable_modules/fable-library-js.5.7.0/Double.js";
import * as node_cron from "node-cron";

const backupDir = "database/backups";

/**
 * Take one backup now and prune old ones. Public so /admin or a test can
 * trigger it without waiting for the cron.
 */
export function run() {
    let arg_5, array, arg_4;
    try {
        if (!node$003Afs.existsSync(backupDir)) {
            node$003Afs.mkdirSync(backupDir, {
                recursive: true,
            });
        }
        let target;
        const arg_1 = toString(now(), "yyyy-MM-dd");
        target = toText(printf("%s/momentum-%s.db"))(backupDir)(arg_1);
        if (node$003Afs.existsSync(target)) {
            node$003Afs.unlinkSync(target);
        }
        database().exec(toText(printf("VACUUM INTO \'%s\'"))(target));
        const backups = sort((array = node$003Afs.readdirSync(backupDir), array.filter((f) => f.endsWith(".db"))), {
            Compare: (x, y) => (comparePrimitives(x, y) | 0),
        });
        if (backups.length > 7) {
            const array_3 = take(backups.length - 7, backups);
            array_3.forEach((f_1) => {
                node$003Afs.unlinkSync((backupDir + "/") + f_1);
            });
        }
        info((arg_4 = (min(backups.length, 7) | 0), toText(printf("Backup written: %s (keeping %d)"))(target)(arg_4)));
    }
    catch (ex) {
        error((arg_5 = ex.message, toText(printf("Backup failed: %s"))(arg_5)));
    }
}

export function start() {
    node_cron.schedule("0 3 * * *", () => {
        run();
    });
    info("Backup scheduler started (daily 03:00)");
}

