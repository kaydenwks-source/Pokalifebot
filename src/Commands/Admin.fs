/// /admin — bot health/usage stats plus premium management, restricted to
/// ADMIN_USER_ID. Deliberately absent from /help; only the admin needs it.
///   /admin                     → the stats panel
///   /admin grant <userId> [days] → comp premium (no payment; default 30 days)
///   /admin revoke <userId>       → drop a user back to free
///   /admin premium               → list current premium users
module Commands.Admin

open Bindings
open Bindings.Telegraf
open Services
open Utils
open Config

/// The read-only health/usage panel (the original /admin behaviour).
let private showStats (config: Env.AppConfig) (ctx: Context) =
    let users = Users.getAll ()

    let dailyQuotesOn =
        users |> Array.filter (fun u -> u.QuoteTime.IsSome) |> Array.length

    let premiumCount =
        users
        |> Array.filter (fun u -> Entitlements.isPremium config.AdminUserId u && not (Entitlements.isExempt config.AdminUserId u))
        |> Array.length

    let sleepLogCount = SleepLogs.getAll () |> Array.length
    let a = Analytics.summary ()

    let topLines =
        if a.Top.Length = 0 then
            [ "  (no commands recorded yet)" ]
        else
            a.Top
            |> Array.toList
            |> List.map (fun t -> sprintf "  /%s — %d" t.Command t.Count)

    [ "🛠 Admin panel"
      ""
      sprintf "Version: v%s (%s)" Env.Version config.Environment
      sprintf "Uptime: %s" (Time.formatUptime (Node.nodeProcess.uptime ()))
      sprintf "Users: %d (daily quote on: %d)" users.Length dailyQuotesOn
      sprintf "Premium users: %d" premiumCount
      sprintf "Sleep logs: %d" sleepLogCount
      sprintf "Reminders: %d" (Reminders.getAll () |> Array.length)
      sprintf "Habits: %d" (Habits.getAll () |> Array.length)
      sprintf "Tasks: %d" (Tasks.getAll () |> Array.length)
      sprintf "Meals: %d" (Meals.getAll () |> Array.length)
      sprintf "Weight logs: %d" (WeightLogs.getAll () |> Array.length)
      sprintf "Workouts: %d" (Workouts.getAll () |> Array.length)
      sprintf "Busy blocks: %d" (Commitments.getAll () |> Array.length)
      sprintf "Goals: %d" (Goals.getAll () |> Array.length)
      ""
      "📈 Activity"
      sprintf "Commands: %d total · %d in 24h · %d in 7d" a.Total a.Last24h a.Last7d
      sprintf "Active users (7d): %d" a.ActiveUsers7d
      "Top commands:" ]
    @ topLines
    @ [ ""
        "⭐ Premium controls"
        "/admin grant <userId> [days] — comp premium (default 30)"
        "/admin revoke <userId> — back to free"
        "/admin premium — list premium users" ]
    |> String.concat "\n"
    |> ctx.reply

/// Parse the first arg as a Telegram user id.
let private parseUserId (args: string[]) : float option =
    args
    |> Array.tryItem 1
    |> Option.bind (fun s ->
        match System.Double.TryParse s with
        | true, v -> Some v
        | _ -> None)

/// Fire-and-forget DM to a user; never let a blocked/unknown chat break /admin.
let private notify (ctx: Context) (chatId: float) (text: string) =
    try
        ctx.telegram.sendMessage (chatId, text) |> ignore
    with _ ->
        ()

let private handleGrant (adminId: float) (args: string[]) (ctx: Context) =
    match parseUserId args with
    | None -> ctx.reply "Usage: /admin grant <userId> [days]"
    | Some targetId ->
        match Users.find targetId with
        | None -> ctx.reply (sprintf "No user with id %.0f — they need to /start the bot first." targetId)
        | Some user ->
            let days =
                args
                |> Array.tryItem 2
                |> Option.bind (fun s ->
                    match System.Int32.TryParse s with
                    | true, v when v > 0 -> Some v
                    | _ -> None)
                |> Option.defaultValue Payments.PremiumDays

            let until = Payments.grantComp user adminId days

            Logger.info (
                sprintf "Admin %.0f granted %d-day premium comp to %s (id %.0f) until %s" adminId days user.FirstName targetId until
            )

            notify
                ctx
                user.ChatId
                (sprintf
                    "🎁 You've been given Momentum Premium until %s — enjoy unlimited AI, photo food logging and the monthly deep-dive. Check /status anytime."
                    until)

            ctx.reply (sprintf "✅ Granted Premium to %s (id %.0f) for %d days — active until %s." user.FirstName targetId days until)

let private handleRevoke (adminId: float) (args: string[]) (ctx: Context) =
    match parseUserId args with
    | None -> ctx.reply "Usage: /admin revoke <userId>"
    | Some targetId ->
        match Users.find targetId with
        | None -> ctx.reply (sprintf "No user with id %.0f." targetId)
        | Some user ->
            Payments.revokeComp user adminId
            Logger.info (sprintf "Admin %.0f revoked premium from %s (id %.0f)" adminId user.FirstName targetId)

            ctx.reply (
                sprintf "✅ Revoked Premium from %s (id %.0f). Their data is untouched — they're just back on the free tier." user.FirstName targetId
            )

let private handlePremiumList (config: Env.AppConfig) (ctx: Context) =
    let premium =
        Users.getAll ()
        |> Array.filter (fun u -> Entitlements.isPremium config.AdminUserId u && not (Entitlements.isExempt config.AdminUserId u))

    if premium.Length = 0 then
        ctx.reply "No paying/comped premium users yet."
    else
        premium
        |> Array.toList
        |> List.map (fun u ->
            let until = u.PremiumUntil |> Option.defaultValue "?"
            sprintf "• %s (id %.0f) — until %s" u.FirstName u.Id until)
        |> fun lines -> "⭐ Premium users" :: "" :: lines
        |> String.concat "\n"
        |> ctx.reply

let handle (config: Env.AppConfig) (ctx: Context) =
    match ctx.from, config.AdminUserId with
    | Some from, Some adminId when from.id = adminId ->
        let args = Common.commandArgs ctx

        match args |> Array.tryHead |> Option.map (fun s -> s.ToLowerInvariant()) with
        | None -> showStats config ctx
        | Some "grant" -> handleGrant adminId args ctx
        | Some "revoke" -> handleRevoke adminId args ctx
        | Some "premium"
        | Some "list" -> handlePremiumList config ctx
        | Some other ->
            ctx.reply (
                sprintf "Unknown admin command '%s'. Try: /admin · /admin grant <userId> [days] · /admin revoke <userId> · /admin premium" other
            )
    | Some from, _ ->
        Logger.warn (sprintf "Unauthorized /admin attempt by %s (id %.0f)" from.first_name from.id)
        ctx.reply "Sorry, /admin is only available to the bot admin."
    | _ -> ctx.reply "Sorry, I couldn't identify you — please try again."
