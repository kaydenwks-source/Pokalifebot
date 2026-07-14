
import { Operators_IsNull } from "../fable_modules/fable-library-js.5.7.0/FSharp.Core.js";

/**
 * Read an environment variable. Returns None when the variable
 * is missing or blank, so callers are forced to handle absence.
 */
export function tryGetEnv(name) {
    const value = process.env[name];
    if (((typeof value) === "undefined") ? true : Operators_IsNull(value)) {
        return undefined;
    }
    else if (value.trim() === "") {
        return undefined;
    }
    else {
        return value.trim();
    }
}

