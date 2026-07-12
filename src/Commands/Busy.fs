/// /busy — recurring weekly blocks (church every Sunday, class Tuesdays)
/// that /plan treats as immovable and /today displays.
module Commands.Busy

open Fable.Core
open Bindings.Telegraf
open Models.User
open Models.Commitment
open Services
open Utils
open Config

let private usage =
    [ "📌 Busy blocks — recurring things I should plan around"
      ""
      "/busy add sunday 10:00-12:00 church service"
      "/busy add daily 12:30-13:00 lunch break"
      "/busy list — see them all"
      "/busy delete <number> — remove one"
      ""
      "They show in /today and /plan schedules around them automatically." ]
    |> String.concat "\n"

/// Accept "@10:00-12:00" or bare "10:00-12:00" / "10:00".
let private parseTimeToken (t: string) =
    Models.Task.Schedule.tryParseToken (if t.StartsWith "@" then t else "@" + t)

let private addBlock (user: UserProfile) (rest: string[]) (ctx: Context) =
    let day = rest |> Array.tryPick Days.tryParse
    let time = rest |> Array.tryPick parseTimeToken

    let fillers = [ "every"; "on"; "at"; "each" ]

    let name =
        rest
        |> Array.filter (fun t ->
            (Days.tryParse t).IsNone
            && (parseTimeToken t).IsNone
            && not (List.contains (t.ToLowerInvariant()) fillers))
        |> String.concat " "

    match day, time with
    | Some d, Some (at, until) when name.Trim() <> "" ->
        let item = Commitments.add user.Id name d at until
        Logger.info (sprintf "%s added busy block: %s" user.FirstName (describe item))

        ctx.reply (
            sprintf "📌 Got it — %s\nI'll plan around this. See all: /busy list" (describe item)
        )
    | _ ->
        ctx.reply (
            "I need a day, a time and a name, e.g.\n/busy add sunday 10:00-12:00 church service"
        )

let private showList (user: UserProfile) (ctx: Context) =
    let mine = Commitments.forUser user.Id

    if mine.Length = 0 then
        ctx.reply "No busy blocks yet. Add one: /busy add sunday 10:00-12:00 church service"
    else
        let lines =
            mine
            |> Array.mapi (fun i c -> sprintf "%d. %s" (i + 1) (describe c))
            |> String.concat "\n"

        ctx.reply ("📌 Your recurring blocks:\n\n" + lines + "\n\nRemove one: /busy delete <number>")

let private deleteBlock (user: UserProfile) (arg: string) (ctx: Context) =
    match System.Int32.TryParse (arg.Trim()) with
    | true, index ->
        match Commitments.deleteByIndex user.Id index with
        | Some c ->
            Logger.info (sprintf "%s deleted busy block: %s" user.FirstName c.Name)
            ctx.reply ("🗑 Removed: " + describe c)
        | None -> ctx.reply "That number isn't in your list — check /busy list"
    | _ -> ctx.reply "Use the number from /busy list, e.g. /busy delete 2"

/// Dispatcher: /busy [add|list|delete]
let handle (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        let args = Common.commandArgs ctx

        if args.Length = 0 then
            showList user ctx
        else
            match args.[0].ToLowerInvariant() with
            | "add" -> addBlock user (Array.skip 1 args) ctx
            | "list" -> showList user ctx
            | "delete"
            | "remove" -> deleteBlock user (String.concat " " (Array.skip 1 args)) ctx
            | _ ->
                // Allow "/busy sunday 10:00 church" without the word "add".
                if (args |> Array.tryPick Days.tryParse).IsSome then
                    addBlock user args ctx
                else
                    ctx.reply usage
