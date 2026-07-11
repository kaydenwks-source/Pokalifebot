/// Structured logging: every line goes to the console AND to logs/bot.log
/// with a timestamp and severity level. Logging must never crash the bot,
/// so file writes are wrapped in a try/with that swallows failures.
module Utils.Logger

open Fable.Core
open Fable.Core.JsInterop
open Bindings

[<RequireQualifiedAccess>]
type Level =
    | Debug
    | Info
    | Warn
    | Error

let private label =
    function
    | Level.Debug -> "DEBUG"
    | Level.Info -> "INFO "
    | Level.Warn -> "WARN "
    | Level.Error -> "ERROR"

let private logDir = "logs"
let private logFile = "logs/bot.log"

let private write (level: Level) (message: string) =
    let timestamp = System.DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
    let line = sprintf "[%s] [%s] %s" timestamp (label level) message

    match level with
    | Level.Error -> JS.console.error line
    | Level.Warn -> JS.console.warn line
    | _ -> JS.console.log line

    try
        if not (Node.fs.existsSync logDir) then
            Node.fs.mkdirSync (logDir, createObj [ "recursive" ==> true ])

        Node.fs.appendFileSync (logFile, line + "\n")
    with _ ->
        // A broken log file must never take the bot down.
        ()

let debug message = write Level.Debug message
let info message = write Level.Info message
let warn message = write Level.Warn message
let error message = write Level.Error message
