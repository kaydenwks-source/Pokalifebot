/// Minimal, hand-rolled bindings to the Node.js APIs we actually use.
/// Keeping these in one place means the rest of the codebase stays
/// pure F# and never touches raw JavaScript interop directly.
module Bindings.Node

open Fable.Core
open Fable.Core.JsInterop

/// The subset of Node's "fs" module we need (file logging).
type IFs =
    abstract existsSync: path: string -> bool
    abstract mkdirSync: path: string * options: obj -> unit
    abstract appendFileSync: path: string * data: string -> unit

[<ImportAll("node:fs")>]
let fs: IFs = jsNative

/// The subset of Node's global "process" object we need.
type IProcess =
    abstract exit: code: int -> unit
    abstract uptime: unit -> float
    abstract once: event: string * handler: (string -> unit) -> unit
    abstract on: event: string * handler: (obj -> unit) -> unit

[<Global("process")>]
let nodeProcess: IProcess = jsNative

[<Emit("process.env[$0]")>]
let private envRaw (name: string) : string = jsNative

/// Read an environment variable. Returns None when the variable
/// is missing or blank, so callers are forced to handle absence.
let tryGetEnv (name: string) : string option =
    let value = envRaw name
    if jsTypeof value = "undefined" || isNull (box value) then None
    elif value.Trim() = "" then None
    else Some(value.Trim())
