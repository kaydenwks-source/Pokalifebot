/// /coach — talk to the AI coach. Keeps a short rolling conversation
/// so follow-ups flow; /coach reset starts fresh.
module Commands.Coach

open Fable.Core
open Bindings.Telegraf
open Services
open Utils
open Config

let private intro =
    [ "🧠 I'm here. Tell me what's going on:"
      ""
      "/coach I feel lazy today"
      "/coach I skipped the gym again"
      "/coach I'm stressed about exams"
      "/coach I keep procrastinating"
      ""
      "I remember our recent conversation — /coach reset wipes it." ]
    |> String.concat "\n"

let handle (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    promise {
        match Common.ensureUser ctx with
        | None -> return! ctx.reply "Sorry, I couldn't identify you — please try again."
        | Some user ->
            match Common.commandArg ctx with
            | None -> return! ctx.reply intro
            | Some arg when arg.Trim().ToLowerInvariant() = "reset" ->
                CoachHistory.clear user.Id
                return! ctx.reply "🧠 Fresh start. What's on your mind?"
            | Some message ->
                Logger.info (sprintf "/coach from %s" user.FirstName)
                ctx.sendChatAction "typing" |> ignore

                let context = Reports.weeklyData user

                let turns =
                    Array.append
                        (CoachHistory.historyFor user.Id |> Array.map (fun m -> m.Role, m.Content))
                        [| ("user", message) |]

                let! result = Ai.Coach.respond config user context turns

                match result with
                | Ok reply ->
                    CoachHistory.append user.Id "user" message
                    CoachHistory.append user.Id "assistant" (reply.Trim())
                    return! ctx.reply ("🧠 " + reply.Trim())
                | Error err ->
                    Logger.error ("Coach failed: " + err)
                    return! ctx.reply Common.aiUnavailable
    }
