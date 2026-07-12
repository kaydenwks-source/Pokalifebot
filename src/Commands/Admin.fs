/// /admin — bot health and usage stats, restricted to ADMIN_USER_ID.
/// Deliberately absent from /help; only the admin needs to know it exists.
module Commands.Admin

open Bindings
open Bindings.Telegraf
open Services
open Utils
open Config

let handle (config: Env.AppConfig) (ctx: Context) =
    match ctx.from, config.AdminUserId with
    | Some from, Some adminId when from.id = adminId ->
        let users = Users.getAll ()

        let dailyQuotesOn =
            users |> Array.filter (fun u -> u.QuoteTime.IsSome) |> Array.length

        let sleepLogCount = SleepLogs.getAll () |> Array.length

        [ "🛠 Admin panel"
          ""
          sprintf "Version: v%s (%s)" Env.Version config.Environment
          sprintf "Uptime: %s" (Time.formatUptime (Node.nodeProcess.uptime ()))
          sprintf "Users: %d (daily quote on: %d)" users.Length dailyQuotesOn
          sprintf "Sleep logs: %d" sleepLogCount
          sprintf "Reminders: %d" (Reminders.getAll () |> Array.length)
          sprintf "Habits: %d" (Habits.getAll () |> Array.length)
          sprintf "Tasks: %d" (Tasks.getAll () |> Array.length) ]
        |> String.concat "\n"
        |> ctx.reply
    | Some from, _ ->
        Logger.warn (sprintf "Unauthorized /admin attempt by %s (id %.0f)" from.first_name from.id)
        ctx.reply "Sorry, /admin is only available to the bot admin."
    | _ -> ctx.reply "Sorry, I couldn't identify you — please try again."
