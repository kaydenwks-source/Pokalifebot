
import { DatabaseSync } from "node:sqlite";

export const databaseCtor = DatabaseSync;

export function openDatabase(filename) {
    return new databaseCtor(filename);
}

