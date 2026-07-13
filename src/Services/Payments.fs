/// Premium payments (Phase 26). An append-only ledger of Telegram Stars
/// transactions plus the two functions that flip a user's entitlement:
/// grantPremium (after a trusted successful_payment) and recordRefund.
///
/// SECURITY: grantPremium is only ever called from the server-side
/// `successful_payment` update — never from a value a client could forge.
/// The ledger is append-only (refunds are new rows, not edits) so payment
/// history stays auditable. Mirrors the Phase 16 `events` table shape.
module Services.Payments

open Fable.Core.JsInterop
open Bindings
open Utils

/// How long one purchase of premium lasts.
[<Literal>]
let PremiumDays = 30

/// Price of a month of premium, in Telegram Stars (currency XTR). Stars are
/// billed as whole units, so this is the number shown on the Pay button.
[<Literal>]
let PriceStars = 150

let private conn =
    lazy
        (let d = Storage.database ()

         Sqlite.exec
             d
             "CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, charge_id TEXT NOT NULL, stars INTEGER NOT NULL, kind TEXT NOT NULL, at TEXT NOT NULL)"

         d)

let private uid (userId: float) = sprintf "%.0f" userId

/// Append one immutable row to the ledger. kind is "one_time" | "refund".
let private append (userId: float) (chargeId: string) (stars: int) (kind: string) : unit =
    try
        let stmt =
            Sqlite.prepare
                conn.Value
                "INSERT INTO payments (user_id, charge_id, stars, kind, at) VALUES (?, ?, ?, ?, ?)"

        Sqlite.run
            stmt
            [| box (uid userId)
               box chargeId
               box stars
               box kind
               box (System.DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")) |]
        |> ignore
    with ex ->
        Logger.error (sprintf "Payments: append failed: %s" ex.Message)

/// Core grant: append a ledger row, then set PremiumUntil to `days` from
/// whichever is later — today or the user's current expiry — so grants *stack*
/// instead of resetting. Returns the new expiry day ("yyyy-MM-dd").
let grantFor (user: Models.User.UserProfile) (chargeId: string) (stars: int) (kind: string) (days: int) : string =
    append user.Id chargeId stars kind

    let today = System.DateTime.UtcNow.Date

    let baseDate =
        match user.PremiumUntil |> Option.bind Time.parseDay with
        | Some d when d > today -> d
        | _ -> today

    let until = baseDate.AddDays(float days).ToString("yyyy-MM-dd")
    Users.setPremium user.Id until chargeId
    until

/// Grant (or extend) premium after a successful Stars payment (30 days).
let grantPremium (user: Models.User.UserProfile) (chargeId: string) (stars: int) (kind: string) : string =
    grantFor user chargeId stars kind PremiumDays

/// Admin comp: grant premium for N days with NO payment. Recorded as kind
/// "comp" with a synthetic charge id so the ledger still shows who/when.
let grantComp (user: Models.User.UserProfile) (adminId: float) (days: int) : string =
    grantFor user (sprintf "comp:%.0f" adminId) 0 "comp" days

/// Record a refund: append a "refund" row and drop the user back to free.
let recordRefund (user: Models.User.UserProfile) (chargeId: string) (stars: int) : unit =
    append user.Id chargeId stars "refund"
    Users.clearPremium user.Id

/// Admin revoke: drop a user to free immediately (no refund — for comps or
/// abuse). Logged in the ledger for the audit trail.
let revokeComp (user: Models.User.UserProfile) (adminId: float) : unit =
    append user.Id (sprintf "revoke:%.0f" adminId) 0 "revoke"
    Users.clearPremium user.Id

/// A user's payment history, newest first — used by /export.
let historyFor (userId: float) : obj[] =
    try
        let stmt =
            Sqlite.prepare conn.Value "SELECT charge_id, stars, kind, at FROM payments WHERE user_id = ? ORDER BY id DESC"

        Sqlite.all stmt [| box (uid userId) |]
    with ex ->
        Logger.error (sprintf "Payments: historyFor failed: %s" ex.Message)
        [||]
