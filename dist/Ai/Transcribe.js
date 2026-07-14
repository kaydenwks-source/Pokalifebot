
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { trimEnd, printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { FSharpResult$2 } from "../fable_modules/fable-library-js.5.7.0/Result.js";
import { Operators_IsNull } from "../fable_modules/fable-library-js.5.7.0/FSharp.Core.js";

/**
 * Voice features are on only when a provider (VISION_API_KEY) is configured.
 */
export function enabled(config) {
    return config.VisionApiKey != null;
}

/**
 * Download the voice file from `audioUrl` and transcribe it. Returns the text.
 */
export function transcribe(config, audioUrl) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const matchValue = config.VisionApiKey;
        if (matchValue != null) {
            const apiKey = matchValue;
            return PromiseBuilder__Delay_62FBFDE1(promise, () => (fetch(audioUrl, {}).then((_arg) => {
                let arg;
                const audio = _arg;
                return !audio.ok ? (Promise.resolve(new FSharpResult$2(/* Error */ 1, [(arg = (audio.status | 0), toText(printf("Audio download failed: HTTP %d"))(arg))]))) : (audio.arrayBuffer().then((_arg_1) => {
                    const form = new FormData();
                    form.append("file", (new Blob([_arg_1], { type: 'audio/ogg' })), "voice.ogg");
                    form.append("model", "whisper-large-v3-turbo");
                    const options = {
                        method: "POST",
                        headers: {
                            Authorization: "Bearer " + apiKey,
                        },
                        body: form,
                    };
                    return fetch(trimEnd(config.VisionBaseUrl, "/") + "/audio/transcriptions", options).then((_arg_2) => {
                        const response = _arg_2;
                        return response.ok ? (response.json().then((_arg_3) => {
                            const text = _arg_3.text;
                            return (Operators_IsNull(text) ? true : (text.trim() === "")) ? (Promise.resolve(new FSharpResult$2(/* Error */ 1, ["Empty transcription"]))) : (Promise.resolve(new FSharpResult$2(/* Ok */ 0, [text.trim()])));
                        })) : (response.text().then((_arg_4) => {
                            let arg_1;
                            return Promise.resolve(new FSharpResult$2(/* Error */ 1, [(arg_1 = (response.status | 0), toText(printf("Transcription HTTP %d: %s"))(arg_1)(_arg_4))]));
                        }));
                    });
                }));
            }))).catch((_arg_5) => (Promise.resolve(new FSharpResult$2(/* Error */ 1, ["Transcription failed: " + _arg_5.message]))));
        }
        else {
            return Promise.resolve(new FSharpResult$2(/* Error */ 1, ["No transcription provider configured"]));
        }
    }));
}

