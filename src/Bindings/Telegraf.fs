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

[<AllowNullLiteral>]
type ChatLite =
    abstract id: float

[<AllowNullLiteral>]
type IncomingMessage =
    abstract text: string option

/// The per-update context Telegraf hands to every command/button handler.
[<AllowNullLiteral>]
type Context =
    abstract from: TelegramUser option
    abstract chat: ChatLite option
    abstract message: IncomingMessage option
    abstract reply: text: string -> JS.Promise<obj>
    abstract reply: text: string * extra: obj -> JS.Promise<obj>
    abstract sendChatAction: action: string -> JS.Promise<obj>
    /// Dismisses the loading spinner after an inline button press.
    abstract answerCbQuery: unit -> JS.Promise<obj>
    abstract editMessageText: text: string -> JS.Promise<obj>

[<AllowNullLiteral>]
type BotInfo =
    abstract username: string

[<AllowNullLiteral>]
type TelegramApi =
    abstract getMe: unit -> JS.Promise<BotInfo>
    abstract sendMessage: chatId: float * text: string -> JS.Promise<obj>

[<AllowNullLiteral>]
type Telegraf =
    abstract telegram: TelegramApi
    abstract start: handler: (Context -> JS.Promise<obj>) -> unit
    abstract help: handler: (Context -> JS.Promise<obj>) -> unit
    abstract command: command: string * handler: (Context -> JS.Promise<obj>) -> unit
    /// Fires when an inline button with matching callback_data is pressed.
    abstract action: trigger: string * handler: (Context -> JS.Promise<obj>) -> unit
    /// Fires for updates matching a telegraf/filters predicate.
    abstract on: filter: obj * handler: (Context -> JS.Promise<obj>) -> unit
    abstract catch: handler: System.Func<obj, Context, unit> -> unit
    abstract launch: onLaunch: (unit -> unit) -> JS.Promise<unit>
    abstract stop: reason: string -> unit

/// telegraf/filters: messageFilter "photo" matches photo messages, etc.
[<Import("message", "telegraf/filters")>]
let messageFilter: string -> obj = jsNative

[<Import("Telegraf", "telegraf")>]
let private telegrafClass: obj = jsNative

/// Equivalent of JavaScript's `new Telegraf(token)`.
let create (token: string) : Telegraf =
    unbox (createNew telegrafClass token)
