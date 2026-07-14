
import { Record } from "../fable_modules/fable-library-js.5.7.0/Types.js";
import { option_type, string_type, record_type, int32_type, float64_type } from "../fable_modules/fable-library-js.5.7.0/Reflection.js";
import { toArray, map, defaultArg } from "../fable_modules/fable-library-js.5.7.0/Option.js";
import { save, load } from "./Storage.js";
import { item, mapIndexed, fold, map as map_1, append, tryFind } from "../fable_modules/fable-library-js.5.7.0/Array.js";
import { error } from "../Utils/Logger.js";
import { printf, toText } from "../fable_modules/fable-library-js.5.7.0/String.js";
import { forAll } from "../fable_modules/fable-library-js.5.7.0/Seq.js";
import { equals } from "../fable_modules/fable-library-js.5.7.0/Util.js";
import { find } from "./Users.js";
import { max } from "../fable_modules/fable-library-js.5.7.0/Double.js";

const filePath = "database/xp.json";

export class XpRecord extends Record {
    constructor(UserId, Xp) {
        super();
        this.UserId = UserId;
        this.Xp = (Xp | 0);
    }
}

export function XpRecord_$reflection() {
    return record_type("Services.Gamification.XpRecord", [], XpRecord, () => [["UserId", float64_type], ["Xp", int32_type]]);
}

export const Points_Habit = 10;

export const Points_Workout = 15;

export const Points_Task = 5;

export const Points_Sleep = 5;

export const Points_Meal = 3;

export const Points_Goal = 20;

export const Points_GoalComplete = 100;

export const Points_Focus = 10;

export const Points_Reflect = 5;

function getAll() {
    return defaultArg(load(filePath), []);
}

function saveAll(xs) {
    save(filePath, xs);
}

export function xpFor(userId) {
    return defaultArg(map((r_1) => (r_1.Xp | 0), tryFind((r) => (r.UserId === userId), getAll())), 0) | 0;
}

/**
 * Add XP for an action. Fire-and-forget — a scoring failure must never break
 * the underlying log the user actually cares about.
 */
export function award(userId, amount) {
    let arg;
    try {
        if (forAll((u) => !equals(u.GamificationEnabled, false), toArray(find(userId)))) {
            const all = getAll();
            const matchValue = tryFind((r) => (r.UserId === userId), all);
            if (matchValue == null) {
                saveAll(append(all, [new XpRecord(userId, amount)]));
            }
            else {
                saveAll(map_1((x) => {
                    if (x.UserId === userId) {
                        return new XpRecord(x.UserId, x.Xp + amount);
                    }
                    else {
                        return x;
                    }
                }, all));
            }
        }
    }
    catch (ex) {
        error((arg = ex.message, toText(printf("Gamification.award failed: %s"))(arg)));
    }
}

const levels = [[0, "Starter"], [50, "Mover"], [150, "Regular"], [350, "Committed"], [700, "Disciplined"], [1200, "Relentless"], [2000, "Machine"]];

export class Level extends Record {
    constructor(Index, Name, Floor, Next) {
        super();
        this.Index = (Index | 0);
        this.Name = Name;
        this.Floor = (Floor | 0);
        this.Next = Next;
    }
}

export function Level_$reflection() {
    return record_type("Services.Gamification.Level", [], Level, () => [["Index", int32_type], ["Name", string_type], ["Floor", int32_type], ["Next", option_type(int32_type)]]);
}

export function levelFor(xp) {
    let array_1;
    const idx = fold((e, e_1) => (max(e, e_1) | 0), 0, map_1((tuple) => (tuple[0] | 0), (array_1 = mapIndexed((i, tupledArg) => [i, tupledArg[0]], levels), array_1.filter((tupledArg_1) => (xp >= tupledArg_1[1]))), Int32Array)) | 0;
    const patternInput = item(idx, levels);
    return new Level(idx, patternInput[1], patternInput[0], ((idx + 1) < levels.length) ? item(idx + 1, levels)[0] : undefined);
}

