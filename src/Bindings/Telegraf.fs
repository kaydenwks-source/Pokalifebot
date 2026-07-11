/// Minimal typed bindings for the Telegraf library (Telegram bot framework).
/// Only the surface we use is bound; we extend this file as phases grow.
module Bindings.Telegraf

open Fable.Core
open Fable.Core.JsInterop

[<AllowNullLiteral>]
type TelegramUser =
    abstract id: float
    abstract first_name: string
    abstract username: string option

/// The per-update context Telegraf hands to every command handler.
[<AllowNullLiteral>]
type Context =
    abstract from: TelegramUser option
    abstract reply: text: string -> JS.Promise<obj>

[<AllowNullLiteral>]
type BotInfo =
    abstract username: string

[<AllowNullLiteral>]
type TelegramApi =
    abstract getMe: unit -> JS.Promise<BotInfo>

[<AllowNullLiteral>]
type Telegraf =
    abstract telegram: TelegramApi
    abstract start: handler: (Context -> JS.Promise<obj>) -> unit
    abstract help: handler: (Context -> JS.Promise<obj>) -> unit
    abstract command: command: string * handler: (Context -> JS.Promise<obj>) -> unit
    abstract catch: handler: System.Func<obj, Context, unit> -> unit
    abstract launch: onLaunch: (unit -> unit) -> JS.Promise<unit>
    abstract stop: reason: string -> unit

[<Import("Telegraf", "telegraf")>]
let private telegrafClass: obj = jsNative

/// Equivalent of JavaScript's `new Telegraf(token)`.
let create (token: string) : Telegraf =
    unbox (createNew telegrafClass token)
