
import { trimStart, replace, printf, toText, split } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { item, equalsWith } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { defaultOf } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { parse, tryParse } from "../fable_modules/fable-library-js.5.7.0/Int32.js";
import { FSharpRef } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { tryParse as tryParse_1 } from "../fable_modules/fable-library-js.5.7.0/Double.js";
import { dayOfWeek, utcNow, addMinutes, now, create } from "../fable_modules/fable-library-js.5.7.0/Date.js";

/**
 * "7:5" / "07:05" / "23:59" -> normalised "HH:mm", or None if invalid.
 */
export function parseTime(raw) {
    let mm, hh;
    const matchValue = split(raw.trim(), [":"], undefined, 0);
    if (!equalsWith((x, y) => (x === y), matchValue, defaultOf()) && (matchValue.length === 2)) {
        const m = item(1, matchValue);
        let matchValue_1;
        let outArg = 0;
        matchValue_1 = [tryParse(item(0, matchValue), 511, false, 32, new FSharpRef(() => (outArg | 0), (v) => {
            outArg = (v | 0);
        })), outArg];
        let matchValue_2;
        let outArg_1 = 0;
        matchValue_2 = [tryParse(m, 511, false, 32, new FSharpRef(() => (outArg_1 | 0), (v_1) => {
            outArg_1 = (v_1 | 0);
        })), outArg_1];
        let matchResult;
        if (matchValue_1[0]) {
            if (matchValue_2[0]) {
                if ((mm = (matchValue_2[1] | 0), (hh = (matchValue_1[1] | 0), (((hh >= 0) && (hh <= 23)) && (mm >= 0)) && (mm <= 59)))) {
                    matchResult = 0;
                }
                else {
                    matchResult = 1;
                }
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
                return toText(printf("%02d:%02d"))(matchValue_1[1])(matchValue_2[1]);
            default:
                return undefined;
        }
    }
    else {
        return undefined;
    }
}

/**
 * "23:30" -> minutes since midnight. Only call with normalised "HH:mm".
 */
export function toMinutes(time) {
    const matchValue = split(time, [":"], undefined, 0);
    if (!equalsWith((x, y) => (x === y), matchValue, defaultOf()) && (matchValue.length === 2)) {
        const m = item(1, matchValue);
        return ((parse(item(0, matchValue), 511, false, 32) * 60) + parse(m, 511, false, 32)) | 0;
    }
    else {
        return 0;
    }
}

/**
 * 455 -> "7h 35m"
 */
export function formatDuration(totalMinutes) {
    const arg = ~~(totalMinutes / 60) | 0;
    const arg_1 = (totalMinutes % 60) | 0;
    return toText(printf("%dh %02dm"))(arg)(arg_1);
}

/**
 * process.uptime() seconds -> "1h 4m 09s"
 */
export function formatUptime(totalSeconds) {
    const s = ~~totalSeconds | 0;
    const arg = ~~(s / 3600) | 0;
    const arg_1 = ~~((s % 3600) / 60) | 0;
    const arg_2 = (s % 60) | 0;
    return toText(printf("%dh %dm %02ds"))(arg)(arg_1)(arg_2);
}

/**
 * "+8", "8", "-5:30", "utc+8", "+08:00" -> minutes from UTC.
 */
export function parseUtcOffset(raw) {
    let hh, mm, hh_2;
    const s = replace(replace(raw.trim().toLowerCase(), "utc", ""), "gmt", "").trim();
    if (s === "") {
        return undefined;
    }
    else {
        const sign = s.startsWith("-") ? -1 : 1;
        const matchValue = split(trimStart(s, "+", "-"), [":"], undefined, 0);
        if (!equalsWith((x, y) => (x === y), matchValue, defaultOf()) && (matchValue.length === 1)) {
            let matchValue_1;
            let outArg = 0;
            matchValue_1 = [tryParse_1(item(0, matchValue), new FSharpRef(() => outArg, (v) => {
                outArg = v;
            })), outArg];
            let matchResult;
            if (matchValue_1[0]) {
                if ((hh = matchValue_1[1], (hh >= 0) && (hh <= 14))) {
                    matchResult = 0;
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
                    return (sign * matchValue_1[1]) * 60;
                default:
                    return undefined;
            }
        }
        else if (!equalsWith((x_1, y_1) => (x_1 === y_1), matchValue, defaultOf()) && (matchValue.length === 2)) {
            const m = item(1, matchValue);
            let matchValue_2;
            let outArg_1 = 0;
            matchValue_2 = [tryParse(item(0, matchValue), 511, false, 32, new FSharpRef(() => (outArg_1 | 0), (v_1) => {
                outArg_1 = (v_1 | 0);
            })), outArg_1];
            let matchValue_3;
            let outArg_2 = 0;
            matchValue_3 = [tryParse(m, 511, false, 32, new FSharpRef(() => (outArg_2 | 0), (v_2) => {
                outArg_2 = (v_2 | 0);
            })), outArg_2];
            let matchResult_1;
            if (matchValue_2[0]) {
                if (matchValue_3[0]) {
                    if ((mm = (matchValue_3[1] | 0), (hh_2 = (matchValue_2[1] | 0), (((hh_2 >= 0) && (hh_2 <= 14)) && (mm >= 0)) && (mm < 60)))) {
                        matchResult_1 = 0;
                    }
                    else {
                        matchResult_1 = 1;
                    }
                }
                else {
                    matchResult_1 = 1;
                }
            }
            else {
                matchResult_1 = 1;
            }
            switch (matchResult_1) {
                case 0:
                    return sign * ((matchValue_2[1] * 60) + matchValue_3[1]);
                default:
                    return undefined;
            }
        }
        else {
            return undefined;
        }
    }
}

/**
 * "2026-07-14" -> that calendar day at midnight, or None if malformed.
 */
export function parseDay(raw) {
    let mm, dd;
    const matchValue = split(raw.trim(), ["-"], undefined, 0);
    if (!equalsWith((x, y) => (x === y), matchValue, defaultOf()) && (matchValue.length === 3)) {
        const y_1 = item(0, matchValue);
        const m = item(1, matchValue);
        const d = item(2, matchValue);
        let matchValue_1;
        let outArg = 0;
        matchValue_1 = [tryParse(y_1, 511, false, 32, new FSharpRef(() => (outArg | 0), (v) => {
            outArg = (v | 0);
        })), outArg];
        let matchValue_2;
        let outArg_1 = 0;
        matchValue_2 = [tryParse(m, 511, false, 32, new FSharpRef(() => (outArg_1 | 0), (v_1) => {
            outArg_1 = (v_1 | 0);
        })), outArg_1];
        let matchValue_3;
        let outArg_2 = 0;
        matchValue_3 = [tryParse(d, 511, false, 32, new FSharpRef(() => (outArg_2 | 0), (v_2) => {
            outArg_2 = (v_2 | 0);
        })), outArg_2];
        let matchResult;
        if (matchValue_1[0]) {
            if (matchValue_2[0]) {
                if (matchValue_3[0]) {
                    if ((mm = (matchValue_2[1] | 0), (dd = (matchValue_3[1] | 0), (((mm >= 1) && (mm <= 12)) && (dd >= 1)) && (dd <= 31)))) {
                        matchResult = 0;
                    }
                    else {
                        matchResult = 1;
                    }
                }
                else {
                    matchResult = 1;
                }
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
                return create(matchValue_1[1], matchValue_2[1], matchValue_3[1]);
            default:
                return undefined;
        }
    }
    else {
        return undefined;
    }
}

/**
 * 480.0 -> "UTC+08:00"
 */
export function formatOffset(minutes) {
    const sign = (minutes < 0) ? "-" : "+";
    const a = Math.abs(minutes);
    const arg_1 = ~~(~~a / 60) | 0;
    const arg_2 = (~~a % 60) | 0;
    return toText(printf("UTC%s%02d:%02d"))(sign)(arg_1)(arg_2);
}

/**
 * The user's current local time. None = server time (original behavior).
 * Fixed offsets, no DST — fine for SG and documented for elsewhere.
 */
export function userNow(tzOffsetMinutes) {
    if (tzOffsetMinutes == null) {
        return now();
    }
    else {
        const minutes = tzOffsetMinutes;
        return addMinutes(utcNow(), minutes);
    }
}

export function dayName(date) {
    const matchValue = dayOfWeek(date);
    switch (matchValue) {
        case 1:
            return "Mon";
        case 2:
            return "Tue";
        case 3:
            return "Wed";
        case 4:
            return "Thu";
        case 5:
            return "Fri";
        case 6:
            return "Sat";
        default:
            return "Sun";
    }
}

