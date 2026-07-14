/// Cloud durability (Phase 18 / deployment). Render's free tier has an
/// EPHEMERAL disk, so the local SQLite file is wiped on every restart. To keep
/// data safe without rewriting the whole synchronous storage layer, we treat a
/// Neon (Postgres) row as a "safety deposit box":
///   • restore() — on boot, download the latest snapshot and write it to the
///     SQLite file BEFORE anything opens the database.
///   • snapshot() — periodically and on shutdown, upload a consistent copy of
///     the SQLite file (via VACUUM INTO) back to Neon.
///
/// Everything is best-effort and wrapped so a Neon hiccup can never crash the
/// bot — with no DATABASE_URL (local dev) it's a complete no-op and the bot
/// runs on the local file exactly as before.
module Services.Cloud

open Fable.Core
open Fable.Core.JsInterop
open Bindings
open Utils

// The SQLite file Storage opens, and a scratch file for consistent snapshots.
let private dbFile = "database/momentum.db"
let private tempFile = "database/_snapshot.db"

// Neon's serverless driver — the HTTP `neon()` client is a tagged-template
// function (stateless fetch, no WebSocket/pool), ideal for our few one-shot
// queries. Each statement is a small Emit that calls it as `sql`...``; params
// go through ${..} so neon binds them safely.
[<Import("neon", "@neondatabase/serverless")>]
let private neon (connectionString: string) (options: obj) : obj = jsNative

// Abort a hung Neon request after 20s so it can never block boot or a tick.
[<Emit("{ fetchOptions: { signal: AbortSignal.timeout($0) } }")>]
let private timeoutOpts (ms: int) : obj = jsNative

[<Emit("$0`CREATE TABLE IF NOT EXISTS db_snapshot (id INT PRIMARY KEY, data TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`")>]
let private sqlEnsureTable (sql: obj) : JS.Promise<obj[]> = jsNative

[<Emit("$0`SELECT data FROM db_snapshot WHERE id = 1`")>]
let private sqlSelectSnapshot (sql: obj) : JS.Promise<obj[]> = jsNative

[<Emit("$0`INSERT INTO db_snapshot (id, data, updated_at) VALUES (1, ${$1}, now()) ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated_at = now()`")>]
let private sqlUpsertSnapshot (sql: obj) (data: string) : JS.Promise<obj[]> = jsNative

/// Write a base64 payload back out to a binary file (Buffer is a Node global).
[<Emit("$0.writeFileSync($1, Buffer.from($2, 'base64'))")>]
let private writeBase64File (fs: obj) (path: string) (b64: string) : unit = jsNative

let private connectionString () = Node.tryGetEnv "DATABASE_URL"

/// True when a Neon connection string is configured (i.e. in production).
let enabled () = (connectionString ()).IsSome

/// A fresh HTTP client per operation, each with its own 20s abort timeout. (A
/// single shared AbortSignal would fire once and then kill every later query.)
let private client () = neon (Option.get (connectionString ())) (timeoutOpts 20000)

/// Pull the latest snapshot from Neon onto the local disk. Safe to call always:
/// no DATABASE_URL → skip; no snapshot yet → start fresh; any error → log and
/// continue on whatever local file exists. Never rejects.
let restore () : JS.Promise<unit> =
    promise {
        match connectionString () with
        | None -> Logger.info "Cloud: no DATABASE_URL set — using the local SQLite file only."
        | Some _ ->
            try
                let sql = client ()
                let! _ = sqlEnsureTable sql
                let! rows = sqlSelectSnapshot sql

                if rows.Length = 0 then
                    Logger.info "Cloud: no snapshot in Neon yet — starting with a fresh database."
                else
                    if not (Node.fs.existsSync "database") then
                        Node.fs.mkdirSync ("database", createObj [ "recursive" ==> true ])

                    let b64 = unbox<string> (rows.[0]?data)
                    writeBase64File (box Node.fs) dbFile b64
                    Logger.info "Cloud: restored the database snapshot from Neon."
            with ex ->
                Logger.error (sprintf "Cloud: restore failed — continuing on local data: %s" ex.Message)
    }

/// Push a consistent copy of the current database up to Neon. VACUUM INTO makes
/// a clean snapshot even if a write lands at the same instant. Never rejects.
let snapshot () : JS.Promise<unit> =
    promise {
        match connectionString () with
        | None -> ()
        | Some _ ->
            try
                if Node.fs.existsSync tempFile then
                    Node.fs.unlinkSync tempFile

                Sqlite.exec (Storage.database ()) (sprintf "VACUUM INTO '%s'" tempFile)
                let b64 = Node.fs.readFileSync (tempFile, "base64")
                Node.fs.unlinkSync tempFile

                let sql = client ()
                let! _ = sqlEnsureTable sql
                let! _ = sqlUpsertSnapshot sql b64
                Logger.info "Cloud: snapshot saved to Neon."
            with ex ->
                Logger.error (sprintf "Cloud: snapshot failed (will retry next tick): %s" ex.Message)
    }
