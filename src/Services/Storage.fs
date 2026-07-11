/// Tiny JSON-file persistence layer — our storage until Phase 15 (SQLite).
/// Reads/writes are synchronous and whole-file; fine at this scale, and the
/// API (load/save) is shaped so swapping in SQLite later won't ripple out.
module Services.Storage

open Fable.Core
open Fable.Core.JsInterop
open Bindings
open Utils

[<Emit("JSON.stringify($0, null, 2)")>]
let private stringifyPretty (value: obj) : string = jsNative

let private ensureDir (dir: string) =
    if not (Node.fs.existsSync dir) then
        Node.fs.mkdirSync (dir, createObj [ "recursive" ==> true ])

/// Read a whole JSON file into a typed value. None when missing or corrupt
/// (corruption is logged — the bot keeps running with empty data).
let load<'T> (path: string) : 'T option =
    try
        if Node.fs.existsSync path then
            let raw = Node.fs.readFileSync (path, "utf8")
            Some(unbox<'T> (JS.JSON.parse raw))
        else
            None
    with ex ->
        Logger.error (sprintf "Storage: failed to read %s: %s" path ex.Message)
        None

/// Write a value as pretty-printed JSON, creating database/ if needed.
let save (path: string) (value: 'T) : unit =
    try
        ensureDir "database"
        Node.fs.writeFileSync (path, stringifyPretty value)
    with ex ->
        Logger.error (sprintf "Storage: failed to write %s: %s" path ex.Message)
