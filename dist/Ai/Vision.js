
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { FSharpResult$2 } from "../fable_modules/fable-library-js.5.7.0/Result.js";
import { trimEnd, join, printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { Operators_IsNull } from "../fable_modules/fable-library-js.5.7.0/FSharp.Core.js";
import { item } from "../fable_modules/fable-library-js.5.7.0/Array.js";

/**
 * Photo features are on only when the user configured a provider.
 */
export function enabled(config) {
    return config.VisionApiKey != null;
}

/**
 * Download an image (Telegram file URL) into a data: URI.
 * Telegram already compresses photos server-side (~1280px JPEG), so no
 * local image processing is needed.
 */
export function downloadAsDataUri(url) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (PromiseBuilder__Delay_62FBFDE1(promise, () => (fetch(url, {}).then((_arg) => {
        let arg;
        const response = _arg;
        return response.ok ? (response.arrayBuffer().then((_arg_1) => (Promise.resolve(new FSharpResult$2(/* Ok */ 0, ["data:image/jpeg;base64," + (Buffer.from(_arg_1).toString('base64'))]))))) : (Promise.resolve(new FSharpResult$2(/* Error */ 1, [(arg = (response.status | 0), toText(printf("Image download failed: HTTP %d"))(arg))])));
    }))).catch((_arg_2) => (Promise.resolve(new FSharpResult$2(/* Error */ 1, ["Image download failed: " + _arg_2.message])))))));
}

const describePrompt = join(" ", ["Describe this photo of food for a nutritionist.", "List every food and drink item you can identify, with estimated portion", "sizes (grams, pieces, cups) and preparation style (fried, steamed, grilled...).", "Be specific and concise — 2 to 4 sentences, no preamble.", "If the photo contains no food or drink, reply exactly: NOT_FOOD"]);

/**
 * Ask the vision model to describe the meal in the photo.
 * Returns Error "NOT_FOOD" when the image isn't food.
 */
export function describeImage(config, dataUri, caption) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const matchValue = config.VisionApiKey;
        if (matchValue != null) {
            const apiKey = matchValue;
            return PromiseBuilder__Delay_62FBFDE1(promise, () => {
                let c, c_1;
                const body = {
                    model: config.VisionModel,
                    messages: [{
                        role: "user",
                        content: [{
                            type: "text",
                            text: (caption != null) ? (((c = caption, c.trim() !== "")) ? ((c_1 = caption, (describePrompt + " The user added this note: ") + c_1.trim())) : describePrompt) : describePrompt,
                        }, {
                            type: "image_url",
                            image_url: {
                                url: dataUri,
                            },
                        }],
                    }],
                    max_tokens: 300,
                    temperature: 0.2,
                };
                const options = {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + apiKey,
                    },
                    body: JSON.stringify(body),
                };
                return fetch(trimEnd(config.VisionBaseUrl, "/") + "/chat/completions", options).then((_arg) => {
                    const response = _arg;
                    return response.ok ? (response.json().then((_arg_1) => {
                        const choices = _arg_1.choices;
                        if (Operators_IsNull(choices) ? true : (choices.length === 0)) {
                            return Promise.resolve(new FSharpResult$2(/* Error */ 1, ["Vision provider returned an empty response"]));
                        }
                        else {
                            const content = item(0, choices).message.content;
                            const text = content.trim();
                            return (text.indexOf("NOT_FOOD") >= 0) ? (Promise.resolve(new FSharpResult$2(/* Error */ 1, ["NOT_FOOD"]))) : (Promise.resolve(new FSharpResult$2(/* Ok */ 0, [text])));
                        }
                    })) : (response.text().then((_arg_2) => {
                        let arg;
                        return Promise.resolve(new FSharpResult$2(/* Error */ 1, [(arg = (response.status | 0), toText(printf("Vision HTTP %d: %s"))(arg)(_arg_2))]));
                    }));
                });
            }).catch((_arg_3) => (Promise.resolve(new FSharpResult$2(/* Error */ 1, ["Vision request failed: " + _arg_3.message]))));
        }
        else {
            return Promise.resolve(new FSharpResult$2(/* Error */ 1, ["No vision provider configured"]));
        }
    }));
}

