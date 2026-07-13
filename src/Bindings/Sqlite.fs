/// Thin binding to Node's built-in "node:sqlite" (DatabaseSync).
/// Node 24 ships this synchronous SQLite engine in-box — no native module,
/// no npm install, no build tools. We only bind the handful of calls our
/// key-value Storage layer needs, and keep everything else pure F#.
module Bindings.Sqlite

open Fable.Core
open Fable.Core.JsInterop

// Import the class itself as a value, then `new` it — the most portable
// way to construct an external class across Fable's ESM output.
let private databaseCtor: obj = import "DatabaseSync" "node:sqlite"

[<Emit("new $0($1)")>]
let private construct (ctor: obj) (filename: string) : obj = jsNative

/// Opaque handles — callers use the helpers below, never the raw objects.
type Database = obj
type Statement = obj

let openDatabase (filename: string) : Database = construct databaseCtor filename

/// Run one or more statements with no bound parameters (DDL, PRAGMA).
[<Emit("$0.exec($1)")>]
let exec (db: Database) (sql: string) : unit = jsNative

/// Compile a statement for reuse.
[<Emit("$0.prepare($1)")>]
let prepare (db: Database) (sql: string) : Statement = jsNative

/// SELECT with a single key parameter -> the first row object, or undefined.
[<Emit("$0.get($1)")>]
let getByKey (stmt: Statement) (key: string) : obj = jsNative

/// SELECT with no parameters (e.g. COUNT) -> the first row object.
[<Emit("$0.get()")>]
let getScalar (stmt: Statement) : obj = jsNative

/// INSERT/UPSERT bound with (key, data).
[<Emit("$0.run($1, $2)")>]
let runKv (stmt: Statement) (key: string) (data: string) : obj = jsNative

// General-purpose forms: bind an arbitrary parameter list (spread into the
// call) for statements that aren't the simple key-value shape above.
[<Emit("$0.run(...$1)")>]
let run (stmt: Statement) (args: obj[]) : obj = jsNative

[<Emit("$0.get(...$1)")>]
let getRow (stmt: Statement) (args: obj[]) : obj = jsNative

[<Emit("$0.all(...$1)")>]
let all (stmt: Statement) (args: obj[]) : obj[] = jsNative
