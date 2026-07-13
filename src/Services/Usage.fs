/// AI-call usage counting (Phase 19). One date-keyed row per user/feature/day
/// in SQLite, so "today's usage" is a single indexed read and the daily reset
/// needs no cron — a new day is simply a new key. This is the foundation both
/// cost-control (now) and the future Premium tiers (Phase 26) build on.
module Services.Usage

open Fable.Core.JsInterop
open Bindings
open Utils

let private conn =
    lazy
        (let d = Storage.database ()

         Sqlite.exec
             d
             "CREATE TABLE IF NOT EXISTS ai_usage (user_id TEXT NOT NULL, day TEXT NOT NULL, feature TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY (user_id, day, feature))"

         d)

let private uid (userId: float) = sprintf "%.0f" userId

/// Add one to a user's count for this feature on this day.
let incr (userId: float) (day: string) (feature: string) : unit =
    try
        let stmt =
            Sqlite.prepare
                conn.Value
                "INSERT INTO ai_usage (user_id, day, feature, count) VALUES (?, ?, ?, 1) ON CONFLICT(user_id, day, feature) DO UPDATE SET count = count + 1"

        Sqlite.run stmt [| box (uid userId); box day; box feature |] |> ignore
    with ex ->
        Logger.error (sprintf "Usage: incr failed: %s" ex.Message)

/// Total AI calls a user has made across all features on a given day.
let dayTotal (userId: float) (day: string) : int =
    try
        let stmt =
            Sqlite.prepare conn.Value "SELECT COALESCE(SUM(count), 0) AS n FROM ai_usage WHERE user_id = ? AND day = ?"

        unbox<int> ((Sqlite.getRow stmt [| box (uid userId); box day |])?n)
    with ex ->
        Logger.error (sprintf "Usage: dayTotal failed: %s" ex.Message)
        0
