/// Usage analytics (Phase 16). Every slash-command invocation is appended
/// to a real SQLite `events` table — the first collection that earns proper
/// relational storage, because it is append-heavy and answered with
/// aggregate queries (COUNT, GROUP BY, COUNT DISTINCT) rather than blob reads.
module Services.Analytics

open Fable.Core.JsInterop
open Bindings
open Utils

/// Shares Storage's single connection to database/momentum.db; creates the
/// table and its time index once, lazily, on first use.
let private conn =
    lazy
        (let d = Storage.database ()

         Sqlite.exec
             d
             "CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, command TEXT NOT NULL, at TEXT NOT NULL)"

         Sqlite.exec d "CREATE INDEX IF NOT EXISTS idx_events_at ON events (at)"
         d)

/// Sortable UTC timestamp; string comparison doubles as chronological order.
let private stamp (d: System.DateTime) = d.ToString("yyyy-MM-dd HH:mm:ss")

/// Record one command invocation. Fire-and-forget — analytics must never
/// break a user's actual command, so failures are logged and swallowed.
let record (userId: float) (command: string) : unit =
    try
        let stmt =
            Sqlite.prepare conn.Value "INSERT INTO events (user_id, command, at) VALUES (?, ?, ?)"

        Sqlite.run stmt [| box (sprintf "%.0f" userId); box command; box (stamp System.DateTime.UtcNow) |]
        |> ignore
    with ex ->
        Logger.error (sprintf "Analytics: record failed: %s" ex.Message)

type TopCommand = { Command: string; Count: int }

type Summary =
    { Total: int
      Last24h: int
      Last7d: int
      ActiveUsers7d: int
      Top: TopCommand[] }

let private countSince (cutoff: string) : int =
    let stmt = Sqlite.prepare conn.Value "SELECT COUNT(*) AS n FROM events WHERE at >= ?"
    unbox<int> ((Sqlite.getRow stmt [| box cutoff |])?n)

/// A snapshot for the admin panel. Any query failure degrades to zeroes
/// rather than throwing — the admin panel should always render.
let summary () : Summary =
    try
        let now = System.DateTime.UtcNow

        let total =
            let s = Sqlite.prepare conn.Value "SELECT COUNT(*) AS n FROM events"
            unbox<int> ((Sqlite.getScalar s)?n)

        let top =
            let s =
                Sqlite.prepare
                    conn.Value
                    "SELECT command, COUNT(*) AS c FROM events GROUP BY command ORDER BY c DESC LIMIT 8"

            Sqlite.all s [||]
            |> Array.map (fun r ->
                { Command = unbox<string> (r?command)
                  Count = unbox<int> (r?c) })

        let active =
            let s =
                Sqlite.prepare conn.Value "SELECT COUNT(DISTINCT user_id) AS n FROM events WHERE at >= ?"

            unbox<int> ((Sqlite.getRow s [| box (stamp (now.AddDays -7.0)) |])?n)

        { Total = total
          Last24h = countSince (stamp (now.AddDays -1.0))
          Last7d = countSince (stamp (now.AddDays -7.0))
          ActiveUsers7d = active
          Top = top }
    with ex ->
        Logger.error (sprintf "Analytics: summary failed: %s" ex.Message)

        { Total = 0
          Last24h = 0
          Last7d = 0
          ActiveUsers7d = 0
          Top = [||] }
