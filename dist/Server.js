
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
        server.listen(parse(p, 511, false, 32));
        info(toText(printf("Health server listening on port %s (keeps the free host awake)."))(p));
    }
}

