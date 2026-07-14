
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "../fable_modules/Fable.Promise.3.2.0/Promise.fs.js";
import { ensureUser } from "./Common.js";
import { bind } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { transcribe, enabled } from "../Ai/Transcribe.js";
import { promise } from "../fable_modules/Fable.Promise.3.2.0/PromiseImpl.fs.js";
import { warn, info } from "../Utils/Logger.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { route } from "./NaturalLanguage.js";

export function handle(config, ctx) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const matchValue = ensureUser(ctx);
        const matchValue_1 = bind((m) => m.voice, ctx.message);
        let matchResult, user, voice;
        if (matchValue != null) {
            if (matchValue_1 != null) {
                matchResult = 0;
                user = matchValue;
                voice = matchValue_1;
            }
            else {
                matchResult = 1;
            }
        }
        else {
            matchResult = 1;
        }
        switch (matchResult) {
            case 0:
                if (!enabled(config)) {
                    return ctx.reply("🎙 Voice notes aren\'t switched on yet (they need a transcription provider). Type it instead and I\'ll handle it.");
                }
                else if (voice.duration > 120) {
                    return ctx.reply("🎙 That note\'s a bit long — keep voice messages under 2 minutes so I can transcribe them cleanly.");
                }
                else {
                    ctx.sendChatAction("typing");
                    return ctx.telegram.getFileLink(voice.file_id).then((_arg) => {
                        const url = _arg.href;
                        return transcribe(config, url).then((_arg_1) => {
                            const transcribed = _arg_1;
                            if (transcribed.tag === 0) {
                                const text = transcribed.fields[0];
                                info(toText(printf("%s voice → \"%s\""))(user.FirstName)(text));
                                return ctx.reply(toText(printf("🎙 Heard: \"%s\""))(text)).then((_arg_2) => (route(config, user, text, ctx)));
                            }
                            else {
                                warn("Voice transcription failed: " + transcribed.fields[0]);
                                return ctx.reply("🎙 I couldn\'t make out that voice note — try again, or type it instead.");
                            }
                        });
                    });
                }
            default:
                return Promise.resolve(undefined);
        }
    }));
}

