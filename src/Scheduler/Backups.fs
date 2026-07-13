/// Nightly SQLite backup (Phase 20). At 03:00 a consistent snapshot of
/// momentum.db is written to database/backups/ and the last 7 are kept.
/// VACUUM INTO produces a clean copy in a single statement, so the snapshot
/// is safe even if another write lands at the same moment.
module Scheduler.Backups

open Fable.Core.JsInterop
open Bindings
open Services
open Utils

let private backupDir = "database/backups"

/// Take one backup now and prune old ones. Public so /admin or a test can
/// trigger it without waiting for the cron.
let run () : unit =
    try
        if not (Node.fs.existsSync backupDir) then
            Node.fs.mkdirSync (backupDir, createObj [ "recursive" ==> true ])

        let target =
            sprintf "%s/momentum-%s.db" backupDir (System.DateTime.Now.ToString("yyyy-MM-dd"))

        // VACUUM INTO refuses to overwrite; clear any earlier copy from today.
        if Node.fs.existsSync target then
            Node.fs.unlinkSync target

        Sqlite.exec (Storage.database ()) (sprintf "VACUUM INTO '%s'" target)

        // Rotate: filenames sort chronologically, so keep the last 7.
        let backups =
            Node.fs.readdirSync backupDir
            |> Array.filter (fun f -> f.EndsWith ".db")
            |> Array.sort

        if backups.Length > 7 then
            backups
            |> Array.take (backups.Length - 7)
            |> Array.iter (fun f -> Node.fs.unlinkSync (backupDir + "/" + f))

        Logger.info (sprintf "Backup written: %s (keeping %d)" target (min backups.Length 7))
    with ex ->
        Logger.error (sprintf "Backup failed: %s" ex.Message)

let start () =
    Cron.cron.schedule ("0 3 * * *", fun () -> run ()) |> ignore
    Logger.info "Backup scheduler started (daily 03:00)"
