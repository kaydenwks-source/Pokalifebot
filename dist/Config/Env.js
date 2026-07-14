
import { FSharpRef, Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { record_type, option_type, float64_type, string_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { tryGetEnv } from "../Bindings/Node.js";
import { empty, singleton, append, delay, toList } from "../fable_modules/fable-library-js.5.7.0/Seq.js";
import { bind, defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { tryParse } from "../fable_modules/fable-library-js.5.7.0/Double.js";
import { FSharpResult$2 } from "../fable_modules/fable-library-js.5.7.0/Result.js";
import "dotenv/config";


export class AppConfig extends Record {
    constructor(BotToken, DeepSeekApiKey, DeepSeekBaseUrl, DeepSeekModel, Environment, AdminUserId, VisionApiKey, VisionBaseUrl, VisionModel) {
        super();
        this.BotToken = BotToken;
        this.DeepSeekApiKey = DeepSeekApiKey;
        this.DeepSeekBaseUrl = DeepSeekBaseUrl;
        this.DeepSeekModel = DeepSeekModel;
        this.Environment = Environment;
        this.AdminUserId = AdminUserId;
        this.VisionApiKey = VisionApiKey;
        this.VisionBaseUrl = VisionBaseUrl;
        this.VisionModel = VisionModel;
    }
}

export function AppConfig_$reflection() {
    return record_type("Config.Env.AppConfig", [], AppConfig, () => [["BotToken", string_type], ["DeepSeekApiKey", string_type], ["DeepSeekBaseUrl", string_type], ["DeepSeekModel", string_type], ["Environment", string_type], ["AdminUserId", option_type(float64_type)], ["VisionApiKey", option_type(string_type)], ["VisionBaseUrl", string_type], ["VisionModel", string_type]]);
}

/**
 * Validates required variables, collecting ALL missing names at once
 * so the user can fix everything in a single pass.
 */
export function load() {
    const botToken = tryGetEnv("BOT_TOKEN");
    const apiKey = tryGetEnv("DEEPSEEK_API_KEY");
    const missing = toList(delay(() => append((botToken == null) ? singleton("BOT_TOKEN") : empty(), delay(() => ((apiKey == null) ? singleton("DEEPSEEK_API_KEY") : empty())))));
    let matchResult, key, token;
    if (botToken != null) {
        if (apiKey != null) {
            matchResult = 0;
            key = apiKey;
            token = botToken;
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
            return new FSharpResult$2(/* Ok */ 0, [new AppConfig(token, key, defaultArg(tryGetEnv("DEEPSEEK_BASE_URL"), "https://api.deepseek.com"), defaultArg(tryGetEnv("DEEPSEEK_MODEL"), "deepseek-chat"), defaultArg(tryGetEnv("NODE_ENV"), "development"), bind((raw) => {
                let matchValue_1;
                let outArg = 0;
                matchValue_1 = [tryParse(raw, new FSharpRef(() => outArg, (v) => {
                    outArg = v;
                })), outArg];
                if (matchValue_1[0]) {
                    return matchValue_1[1];
                }
                else {
                    return undefined;
                }
            }, tryGetEnv("ADMIN_USER_ID")), tryGetEnv("VISION_API_KEY"), defaultArg(tryGetEnv("VISION_BASE_URL"), "https://generativelanguage.googleapis.com/v1beta/openai"), defaultArg(tryGetEnv("VISION_MODEL"), "gemini-2.5-flash"))]);
        default:
            return new FSharpResult$2(/* Error */ 1, [missing]);
    }
}

