
import { tryGetEnv } from "./Bindings/Node.js";
import * as node$003Ahttp from "node:http";
import { parse } from "./fable_modules/fable-library-js.5.7.0/Int32.js";
import { info } from "./Utils/Logger.js";
import { printf, toText } from "./fable_modules/fable-library-js.5.7.0/String.js";

export function start() {
    const matchValue = tryGetEnv("PORT");
    if (matchValue != null) {
        const p = matchValue;
        const server = node$003Ahttp.createServer((_req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end("Momentum AI is running.");
        });
        server.listen(parse(p, 511, false, 32), '0.0.0.0');
        info(toText(printf("Health server listening on port %s."))(p));
    }
}

/**
 * Keep the free host awake: Render spins a free service down after ~15 min
 * with no INBOUND traffic (the bot's outbound Telegram polling doesn't count).
 * So we hit our own public URL every 5 min, which resets that idle timer —
 * short enough that even a missed ping still lands well before the 15-min
 * limit. Render provides the public URL as RENDER_EXTERNAL_URL; no external
 * pinger needed. No-op locally where that variable is unset.
 */
export function startKeepAlive() {
    const matchValue = tryGetEnv("RENDER_EXTERNAL_URL");
    if (matchValue != null) {
        const url = matchValue;
        fetch(url).catch(() => {});
        setInterval((() => {
            fetch(url).catch(() => {});
        }), 300000);
        info("Keep-alive: self-ping every 5 min enabled.");
    }
}

