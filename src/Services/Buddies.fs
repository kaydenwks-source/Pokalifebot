/// Accountability-buddy pairing: invite codes, the mutual link, and lookups.
/// One buddy per user, kept deliberately simple. Storage only — display names
/// and progress are assembled in the command from the existing trackers.
module Services.Buddies

open Models.Buddy
open Utils

let private invitesPath = "database/buddy-invites.json"
let private linksPath = "database/buddies.json"

let private invites () : BuddyInvite[] =
    Storage.load<BuddyInvite[]> invitesPath |> Option.defaultValue [||]

let private saveInvites (xs: BuddyInvite[]) = Storage.save invitesPath xs

let private links () : BuddyLink[] =
    Storage.load<BuddyLink[]> linksPath |> Option.defaultValue [||]

let private saveLinks (xs: BuddyLink[]) = Storage.save linksPath xs

/// The id of a user's current buddy, if paired.
let buddyOf (userId: float) : float option =
    links ()
    |> Array.tryPick (fun l ->
        if l.AId = userId then Some l.BId
        elif l.BId = userId then Some l.AId
        else None)

let private newCode () =
    System.Guid.NewGuid().ToString("N").Substring(0, 6).ToUpperInvariant()

/// Create (replacing any existing) this user's pending invite; returns the code.
let createInvite (userId: float) : string =
    let code = newCode ()
    let kept = invites () |> Array.filter (fun i -> i.InviterId <> userId)

    saveInvites (
        Array.append
            kept
            [| { Code = code
                 InviterId = userId
                 CreatedAt = System.DateTime.Now.ToString("yyyy-MM-dd HH:mm") } |]
    )

    code

type AcceptResult =
    | Paired of float // inviter id
    | NotFound
    | SelfPair
    | AlreadyPaired // accepter already has a buddy
    | InviterPaired // inviter got a buddy in the meantime

/// Redeem an invite code, forming the pairing if everything checks out.
let accept (rawCode: string) (accepterId: float) : AcceptResult =
    let code = rawCode.Trim().ToUpperInvariant()

    match invites () |> Array.tryFind (fun i -> i.Code = code) with
    | None -> NotFound
    | Some inv when inv.InviterId = accepterId -> SelfPair
    | Some inv ->
        if (buddyOf accepterId).IsSome then
            AlreadyPaired
        elif (buddyOf inv.InviterId).IsSome then
            saveInvites (invites () |> Array.filter (fun i -> i.Code <> code))
            InviterPaired
        else
            saveLinks (
                Array.append
                    (links ())
                    [| { AId = inv.InviterId
                         BId = accepterId
                         Since = System.DateTime.Now.ToString("yyyy-MM-dd") } |]
            )
            // Drop the used code and any other stale invite from the inviter.
            saveInvites (invites () |> Array.filter (fun i -> i.Code <> code && i.InviterId <> inv.InviterId))
            Paired inv.InviterId

/// Remove any pairing involving the user; returns the ex-buddy id, if any.
let unpair (userId: float) : float option =
    let b = buddyOf userId
    saveLinks (links () |> Array.filter (fun l -> l.AId <> userId && l.BId <> userId))
    b

/// Account-deletion cleanup: drop every link and invite involving the user.
let purgeUser (userId: float) : unit =
    saveLinks (links () |> Array.filter (fun l -> l.AId <> userId && l.BId <> userId))
    saveInvites (invites () |> Array.filter (fun i -> i.InviterId <> userId))
