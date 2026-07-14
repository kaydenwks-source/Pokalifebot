
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { createObj } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { empty, ofArray, append } from "../fable_modules/fable-library-js.5.7.0/List.js";
import { Operators_IsNull } from "../fable_modules/fable-library-js.5.7.0/FSharp.Core.js";
import { FSharpResult$2 } from "../fable_modules/fable-library-js.5.7.0/Result.js";
import { map, append as append_1, item } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { warn, info } from "../Utils/Logger.js";

function request(config, extraBody, messages) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const body = createObj(append(ofArray([["model", config.DeepSeekModel], ["messages", messages], ["temperature", 0.7], ["max_tokens", 1000]]), extraBody));
        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + config.DeepSeekApiKey,
            },
            body: JSON.stringify(body),
        };
        return fetch(config.DeepSeekBaseUrl + "/chat/completions", options).then((_arg) => {
            const response = _arg;
            return response.ok ? (response.json().then((_arg_1) => {
                const choices = _arg_1.choices;
                if (Operators_IsNull(choices) ? true : (choices.length === 0)) {
                    return Promise.resolve(new FSharpResult$2(/* Error */ 1, ["DeepSeek returned an empty response"]));
                }
                else {
                    const content = item(0, choices).message.content;
                    return Promise.resolve(new FSharpResult$2(/* Ok */ 0, [content]));
                }
            })) : (response.text().then((_arg_2) => {
                let arg;
                return Promise.resolve(new FSharpResult$2(/* Error */ 1, [(arg = (response.status | 0), toText(printf("DeepSeek HTTP %d: %s"))(arg)(_arg_2))]));
            }));
        });
    }).catch((_arg_3) => (Promise.resolve(new FSharpResult$2(/* Error */ 1, ["DeepSeek request failed: " + _arg_3.message])))))));
}

function pair(systemPrompt, userMessage) {
    return [{
        role: "system",
        content: systemPrompt,
    }, {
        role: "user",
        content: userMessage,
    }];
}

/**
 * Send one system+user message pair to DeepSeek and get the reply text.
 */
export function chat(config, systemPrompt, userMessage) {
    return request(config, empty(), pair(systemPrompt, userMessage));
}

/**
 * Same, but forces a strict JSON object reply (for parsers/extractors).
 * Low temperature: parsing wants determinism, not creativity.
 */
export function chatJson(config, systemPrompt, userMessage) {
    return request(config, ofArray([["response_format", {
        type: "json_object",
    }], ["temperature", 0.2]]), pair(systemPrompt, userMessage));
}

/**
 * Multi-turn chat: `turns` are (role, content) pairs — "user"/"assistant"
 * alternating — appended after the system prompt. Powers /coach.
 */
export function chatMulti(config, systemPrompt, turns) {
    return request(config, empty(), append_1([{
        role: "system",
        content: systemPrompt,
    }], map((tupledArg) => ({
        role: tupledArg[0],
        content: tupledArg[1],
    }), turns)));
}

/**
 * Read a numeric field from parsed JSON; rejects strings and NaN.
 */
export function jsonNumber(json, key) {
    const v = json[key];
    if ((typeof v) === "number") {
        const f = v;
        if (f === f) {
            return f;
        }
        else {
            return undefined;
        }
    }
    else {
        return undefined;
    }
}

/**
 * Read a boolean field from parsed JSON; missing or non-bool -> false.
 */
export function jsonBool(json, key) {
    const v = json[key];
    if ((typeof v) === "boolean") {
        return v;
    }
    else {
        return false;
    }
}

/**
 * Read a non-empty string field from parsed JSON.
 */
export function jsonString(json, key) {
    const v = json[key];
    if ((typeof v) === "string") {
        const s = v.trim();
        if (s === "") {
            return undefined;
        }
        else {
            return s;
        }
    }
    else {
        return undefined;
    }
}

/**
 * Tiny request fired at startup so a bad API key or network problem
 * shows up in the logs immediately, not on the user's first /quote.
 */
export function testConnection(config) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        info("Testing DeepSeek connection...");
        return chat(config, "You are a connection test.", "Reply with the single word: pong").then((_arg) => {
            let arg;
            const result = _arg;
            if (result.tag === 1) {
                warn("DeepSeek connection failed: " + result.fields[0]);
                return Promise.resolve();
            }
            else {
                info((arg = result.fields[0].trim(), toText(printf("DeepSeek connection OK (model replied: %s)"))(arg)));
                return Promise.resolve();
            }
        });
    }));
}

