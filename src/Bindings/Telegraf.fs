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

/// One resolution variant of a photo (Telegram sends several, smallest first).
[<AllowNullLiteral>]
type PhotoSize =
    abstract file_id: string
    abstract width: float
    abstract height: float

/// A voice note (Telegram sends OGG/Opus). We only need the file id + length.
[<AllowNullLiteral>]
type VoiceLite =
    abstract file_id: string
    abstract duration: float

/// The trusted, server-side confirmation of a completed Telegram Stars
/// payment. Arrives on message.successful_payment — this is the ONLY signal
/// we grant premium on. total_amount is the number of Stars paid.
[<AllowNullLiteral>]
type SuccessfulPayment =
    abstract currency: string
    abstract total_amount: float
    abstract invoice_payload: string
    abstract telegram_payment_charge_id: string

[<AllowNullLiteral>]
type IncomingMessage =
    abstract text: string option
    abstract photo: PhotoSize[] option
    abstract caption: string option
    abstract voice: VoiceLite option
    abstract successful_payment: SuccessfulPayment option

/// The pre-checkout query Telegram sends before charging. We must approve it
/// within 10 seconds via answerPreCheckoutQuery.
[<AllowNullLiteral>]
type PreCheckoutQuery =
    abstract id: string
    abstract from: TelegramUser
    abstract total_amount: float
    abstract invoice_payload: string

[<AllowNullLiteral>]
type BotInfo =
    abstract username: string

/// The callback_query attached to an inline-button press. We only need its
/// data string to know which button was tapped.
[<AllowNullLiteral>]
type CallbackQuery =
    abstract data: string option

[<AllowNullLiteral>]
type TelegramApi =
    abstract getMe: unit -> JS.Promise<BotInfo>
    abstract sendMessage: chatId: float * text: string -> JS.Promise<obj>
    /// Returns a URL object (use its .href) for downloading a file.
    abstract getFileLink: fileId: string -> JS.Promise<obj>
    /// Refund a Stars payment by user id + telegram_payment_charge_id.
    abstract refundStarPayment: userId: float * chargeId: string -> JS.Promise<obj>
    /// Register the bot's command list for Telegram's native /-autocomplete
    /// and ☰ menu button. Pass an array of { command; description }.
    abstract setMyCommands: commands: obj -> JS.Promise<obj>

/// The per-update context Telegraf hands to every command/button handler.
[<AllowNullLiteral>]
type Context =
    abstract from: TelegramUser option
    abstract chat: ChatLite option
    abstract message: IncomingMessage option
    /// Present on pre_checkout_query updates.
    abstract preCheckoutQuery: PreCheckoutQuery option
    /// Present on inline-button (callback_query) updates.
    abstract callbackQuery: CallbackQuery option
    abstract telegram: TelegramApi
    abstract reply: text: string -> JS.Promise<obj>
    abstract reply: text: string * extra: obj -> JS.Promise<obj>
    abstract sendChatAction: action: string -> JS.Promise<obj>
    /// Send a file. Pass { source: Buffer; filename: string } (+ optional caption).
    abstract replyWithDocument: document: obj -> JS.Promise<obj>
    /// Send a Telegram invoice (for Stars: currency "XTR", provider_token "").
    abstract replyWithInvoice: invoice: obj -> JS.Promise<obj>
    /// Approve (true) or reject (false) a pending pre-checkout query.
    abstract answerPreCheckoutQuery: ok: bool -> JS.Promise<obj>
    /// Dismisses the loading spinner after an inline button press.
    abstract answerCbQuery: unit -> JS.Promise<obj>
    abstract editMessageText: text: string -> JS.Promise<obj>
    /// Edit the current message's text AND its inline keyboard (pass extra
    /// with reply_markup) — used to navigate between menu screens in place.
    abstract editMessageText: text: string * extra: obj -> JS.Promise<obj>

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
    /// Global middleware run on every update before command handlers.
    /// Telegraf calls it as fn(ctx, next); the Func maps to a real 2-arg
    /// JS function (a curried F# lambda would not). Must call next() to
    /// pass control along the chain.
    abstract ``use``: middleware: System.Func<Context, (unit -> JS.Promise<unit>), JS.Promise<unit>> -> unit
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
