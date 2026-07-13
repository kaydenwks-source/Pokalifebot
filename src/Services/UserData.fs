/// Whole-account operations (Phase 20): gather everything we hold about a
/// user for /export, and erase every trace of them for /deleteme. Works at
/// the storage level over all collections at once, so it stays correct as new
/// trackers are added as long as they follow the UserId convention.
module Services.UserData

open Fable.Core
open Fable.Core.JsInterop
open Bindings
open Utils

/// Every per-user collection keys rows on `UserId`. The profile is the one
/// exception (keyed on `Id`) and is handled separately below.
let private collections =
    [ "database/sleep.json"
      "database/reminders.json"
      "database/habits.json"
      "database/tasks.json"
      "database/meals.json"
      "database/weights.json"
      "database/workouts.json"
      "database/busy.json"
      "database/goals.json"
      "database/coach.json"
      "database/xp.json"
      "database/focus.json"
      "database/journal.json" ]

let private loadRows (path: string) : obj[] =
    Storage.load<obj[]> path |> Option.defaultValue [||]

let private isMine (userId: float) (row: obj) : bool = unbox<float> (row?UserId) = userId

/// Everything about a user, assembled into one JSON-ready object.
let export (userId: float) : obj =
    let profile =
        loadRows "database/users.json"
        |> Array.tryFind (fun r -> unbox<float> (r?Id) = userId)
        |> Option.map box
        |> Option.defaultValue (box null)

    let section path = loadRows path |> Array.filter (isMine userId)

    createObj
        [ "exportedAt" ==> System.DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss") + " UTC"
          "userId" ==> userId
          "profile" ==> profile
          "sleep" ==> section "database/sleep.json"
          "reminders" ==> section "database/reminders.json"
          "habits" ==> section "database/habits.json"
          "tasks" ==> section "database/tasks.json"
          "meals" ==> section "database/meals.json"
          "weights" ==> section "database/weights.json"
          "workouts" ==> section "database/workouts.json"
          "busy" ==> section "database/busy.json"
          "goals" ==> section "database/goals.json"
          "coach" ==> section "database/coach.json"
          "xp" ==> section "database/xp.json"
          "focus" ==> section "database/focus.json"
          "journal" ==> section "database/journal.json"
          "buddy" ==> (Buddies.buddyOf userId |> Option.map box |> Option.defaultValue (box null)) ]

let private deleteWhereUser (d: Sqlite.Database) (table: string) (userId: float) =
    try
        Sqlite.run (Sqlite.prepare d (sprintf "DELETE FROM %s WHERE user_id = ?" table)) [| box (sprintf "%.0f" userId) |]
        |> ignore
    with ex ->
        // Table may not exist yet (never used) — nothing to delete, log and move on.
        Logger.warn (sprintf "UserData.wipe: %s cleanup skipped: %s" table ex.Message)

/// Permanently remove every trace of a user across all storage.
let wipe (userId: float) : unit =
    let profiles =
        loadRows "database/users.json" |> Array.filter (fun r -> unbox<float> (r?Id) <> userId)

    Storage.save "database/users.json" profiles

    for path in collections do
        let kept = loadRows path |> Array.filter (fun r -> not (isMine userId r))
        Storage.save path kept

    let d = Storage.database ()
    deleteWhereUser d "ai_usage" userId
    deleteWhereUser d "events" userId

    // Buddy links/invites key on AId/BId/InviterId, not UserId — clean explicitly.
    Buddies.purgeUser userId

    Logger.info (sprintf "Wiped all data for user %.0f" userId)
