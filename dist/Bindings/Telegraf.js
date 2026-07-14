
import { Telegraf } from "telegraf";

/**
 * Equivalent of JavaScript's `new Telegraf(token)`.
 */
export function create(token) {
    return new Telegraf(token);
}

