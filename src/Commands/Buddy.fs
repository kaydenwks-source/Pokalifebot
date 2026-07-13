/// /buddy — accountability partners (Phase 25). Double opt-in: one person
/// shares an invite code, the other accepts. Paired users can see each other's
/// momentum and send a templated cheer. Messages to a buddy are fixed templates
/// (no free text), so this can't be used to relay arbitrary messages.
module Commands.Buddy

open Fable.Core
open Bindings.Telegraf
open Services
open Utils

let private cheers =
    [| "is cheering you on — go grab today's wins! 💪"
       "just checked in on you. Keep the streak alive! 🔥"
       "believes in you. One small action, right now. 👊"
       "says: don't break the chain today! ⛓️" |]

let private nameOf (id: float) =
    Users.find id |> Option.map (fun u -> u.FirstName) |> Option.defaultValue "your buddy"

/// Fire-and-forget DM to a buddy that never throws (they may have blocked the bot).
let private notify (ctx: Context) (chatId: float) (text: string) : JS.Promise<unit> =
    promise {
        try
            let! _ = ctx.telegram.sendMessage (chatId, text)
            return ()
        with _ ->
            return ()
    }

/// A compact progress snapshot assembled from the buddy's existing trackers.
let private buddyCard (id: float) : string =
    let xp = Gamification.xpFor id
    let lvl = Gamification.levelFor xp
    let habits = Habits.forUser id

    let bestStreak =
        if habits.Length = 0 then
            0
        else
            habits |> Array.map (fun h -> (Habits.streaksForHabit h).Current) |> Array.max

    let doneThisPeriod =
        habits |> Array.filter (fun h -> (Habits.streaksForHabit h).DoneThisPeriod) |> Array.length

    let cutoff = System.DateTime.Now.AddDays(-7.0).ToString("yyyy-MM-dd")
    let workouts = Workouts.forUser id |> Array.filter (fun w -> w.Date > cutoff) |> Array.length

    [ sprintf "🤝 %s's momentum" (nameOf id)
      sprintf "🎮 Level %d — %s (%d XP)" (lvl.Index + 1) lvl.Name xp
      sprintf "🔥 Best streak: %d · ✅ %d/%d habits done this period" bestStreak doneThisPeriod habits.Length
      sprintf "🏋️ %d workouts in the last 7 days" workouts ]
    |> String.concat "\n"

let handle (ctx: Context) : JS.Promise<obj> =
    promise {
        match Common.ensureUser ctx with
        | None -> return! ctx.reply "Sorry, I couldn't identify you — please try again."
        | Some user ->
            let args = Common.commandArgs ctx
            let sub = if args.Length > 0 then args.[0].ToLowerInvariant() else ""

            match sub with
            | "" ->
                match Buddies.buddyOf user.Id with
                | Some bId -> return! ctx.reply (buddyCard bId + "\n\n👊 Cheer them on: /buddy nudge · Unpair: /buddy remove")
                | None ->
                    return!
                        ctx.reply (
                            "🤝 No accountability buddy yet.\n\n"
                            + "A buddy can see your streaks and cheer you on — and you theirs.\n\n"
                            + "• /buddy invite — get a code to share with a friend\n"
                            + "• /buddy accept <code> — join with a code they gave you"
                        )
            | "invite" ->
                match Buddies.buddyOf user.Id with
                | Some bId ->
                    return! ctx.reply (sprintf "You're already paired with %s. Unpair first with /buddy remove." (nameOf bId))
                | None ->
                    let code = Buddies.createInvite user.Id
                    Logger.info (sprintf "%s created a buddy invite" user.FirstName)

                    return!
                        ctx.reply (
                            sprintf
                                "🤝 Your buddy code: %s\n\nShare it with a friend who also uses me. They pair by sending:\n/buddy accept %s\n\nOne buddy at a time — the code stops working once someone joins."
                                code
                                code
                        )
            | "accept" ->
                let code = if args.Length > 1 then args.[1] else ""

                match Buddies.accept code user.Id with
                | Buddies.NotFound ->
                    return! ctx.reply "That code isn't valid (or was already used). Ask your friend for a fresh /buddy invite code."
                | Buddies.SelfPair -> return! ctx.reply "That's your own code 🙂 — share it with someone else."
                | Buddies.AlreadyPaired -> return! ctx.reply "You already have a buddy. Unpair with /buddy remove to switch."
                | Buddies.InviterPaired -> return! ctx.reply "Too late — they've already paired with someone else."
                | Buddies.Paired inviterId ->
                    Logger.info (sprintf "%s paired as a buddy with %.0f" user.FirstName inviterId)

                    match Users.find inviterId with
                    | Some inv ->
                        do!
                            notify
                                ctx
                                inv.ChatId
                                (sprintf "🤝 %s accepted your buddy invite! You're accountability partners now. See their progress: /buddy" user.FirstName)
                    | None -> ()

                    return! ctx.reply (sprintf "🎉 You're now accountability buddies with %s! See their momentum anytime: /buddy" (nameOf inviterId))
            | "nudge"
            | "cheer" ->
                match Buddies.buddyOf user.Id with
                | None -> return! ctx.reply "No buddy to cheer yet. /buddy invite to pair up."
                | Some bId ->
                    match Users.find bId with
                    | Some b ->
                        let cheer = cheers.[System.DateTime.Now.Second % cheers.Length]
                        do! notify ctx b.ChatId (sprintf "👋 Your buddy %s %s" user.FirstName cheer)
                        Logger.info (sprintf "%s nudged buddy %s" user.FirstName b.FirstName)
                        return! ctx.reply (sprintf "Sent a cheer to %s 👊" b.FirstName)
                    | None -> return! ctx.reply "Couldn't reach your buddy right now — try again shortly."
            | "remove"
            | "unpair" ->
                match Buddies.unpair user.Id with
                | Some bId ->
                    match Users.find bId with
                    | Some b ->
                        do!
                            notify
                                ctx
                                b.ChatId
                                (sprintf "🤝 %s ended the buddy pairing. You can pair with someone new via /buddy invite." user.FirstName)
                    | None -> ()

                    return! ctx.reply (sprintf "Unpaired from %s. /buddy invite to pair with someone new." (nameOf bId))
                | None -> return! ctx.reply "You don't have a buddy to remove."
            | _ -> return! ctx.reply "Usage: /buddy · /buddy invite · /buddy accept <code> · /buddy nudge · /buddy remove"
    }
