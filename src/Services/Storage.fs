/// Persistence layer — now backed by SQLite (Phase 15). Every collection is
/// stored as one JSON blob in a key-value table, keyed by the same path
/// string the old JSON files used ("database/users.json", …). Keeping the
/// load/save API identical means no other service had to change.
///
/// Why SQLite over the old whole-file JSON writes: a single portable DB
/// file (database/momentum.db), atomic upserts (a crash mid-write can no
/// longer leave a half-written, corrupt file), and an easy path to real
/// tables later if any collection ever needs querying.
module Services.Storage

open Fable.Core
open Fable.Core.JsInterop
open Bindings
open Utils

[<Emit("JSON.stringify($0)")>]
let private stringify (value: obj) : string = jsNative

let private dbFile = "database/momentum.db"

let private ensureDir (dir: string) =
    if not (Node.fs.existsSync dir) then
        Node.fs.mkdirSync (dir, createObj [ "recursive" ==> true ])

/// One-time import of legacy database/*.json into the kv table, so an
/// existing install keeps every byte of its data on the first SQLite boot.
/// The original .json files are left on disk untouched as a frozen backup.
let private importLegacyJson (d: Sqlite.Database) =
    let insert =
        Sqlite.prepare d "INSERT OR IGNORE INTO kv (path, data) VALUES (?, ?)"

    let files =
        try
            Node.fs.readdirSync "database"
        with _ ->
            [||]

    for file in files do
        if file.EndsWith ".json" then
            let path = "database/" + file

            try
                let raw = Node.fs.readFileSync (path, "utf8")
                JS.JSON.parse raw |> ignore // skip anything that isn't valid JSON
                Sqlite.runKv insert path raw |> ignore
                Logger.info (sprintf "Storage: migrated %s into SQLite" path)
            with ex ->
                Logger.error (sprintf "Storage: could not migrate %s: %s" path ex.Message)

/// The database is opened once, lazily, on first access: the table is
/// created and legacy JSON imported only when the table is still empty.
let private db =
    lazy
        (ensureDir "database"
         let d = Sqlite.openDatabase dbFile
         Sqlite.exec d "CREATE TABLE IF NOT EXISTS kv (path TEXT PRIMARY KEY, data TEXT NOT NULL)"

         let countRow =
             Sqlite.getScalar (Sqlite.prepare d "SELECT COUNT(*) AS n FROM kv")

         if unbox<int> (countRow?n) = 0 then
             importLegacyJson d

         d)

/// Read a collection into a typed value. None when absent or corrupt
/// (corruption is logged — the bot keeps running with empty data).
let load<'T> (path: string) : 'T option =
    try
        let row =
            Sqlite.getByKey (Sqlite.prepare db.Value "SELECT data FROM kv WHERE path = ?") path

        if isNull (box row) || jsTypeof row = "undefined" then
            None
        else
            Some(unbox<'T> (JS.JSON.parse (unbox<string> (row?data))))
    with ex ->
        Logger.error (sprintf "Storage: failed to read %s: %s" path ex.Message)
        None

/// Upsert a collection as JSON in a single atomic statement.
let save (path: string) (value: 'T) : unit =
    try
        let stmt =
            Sqlite.prepare
                db.Value
                "INSERT INTO kv (path, data) VALUES (?, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data"

        Sqlite.runKv stmt path (stringify value) |> ignore
    with ex ->
        Logger.error (sprintf "Storage: failed to write %s: %s" path ex.Message)
