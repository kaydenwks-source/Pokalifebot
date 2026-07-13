/// /usage — show how much of today's AI budget is left. Transparency is the
/// friendly face of the Phase 19 cost cap: users can see the limit, not just
/// hit it.
module Commands.Account

open Fable.Core
open Bindings.Telegraf
open Services
open Config

let handleUsage (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        let body =
            match Entitlements.remaining config.AdminUserId user with
            | None ->
                [ "📊 AI usage"
                  ""
                  "Unlimited ✨ (admin)"
                  "Your trackers are always unlimited too." ]
            | Some left ->
                let used = Entitlements.FreeDailyAiCap - left

                [ "📊 AI usage today"
                  ""
                  sprintf "Used: %d of %d AI requests" used Entitlements.FreeDailyAiCap
                  sprintf "Remaining: %d" left
                  "Resets at midnight, your time."
                  ""
                  "Trackers (habits, tasks, weight, workouts…) are always unlimited — only AI features count here." ]

        body |> String.concat "\n" |> ctx.reply
