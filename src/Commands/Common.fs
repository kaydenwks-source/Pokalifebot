/// Helpers shared by every command module — argument parsing and user
/// registration. Lives here so no command file duplicates them.
module Commands.Common

open Bindings.Telegraf
open Models.User
open Services

let aiUnavailable =
    "😓 I couldn't reach my AI brain just now. Please try again in a minute."

/// Raw argument string after a command: "/quote gym now" -> Some "gym now".
let commandArg (ctx: Context) : string option =
    ctx.message
    |> Option.bind (fun m -> m.text)
    |> Option.bind (fun text ->
        let parts =
            text.Trim().Split(' ') |> Array.filter (fun p -> p.Trim() <> "")

        if parts.Length >= 2 then
            Some(String.concat " " (Array.skip 1 parts))
        else
            None)

/// Argument words after a command: "/sleep 23:00 07:00" -> [|"23:00"; "07:00"|].
let commandArgs (ctx: Context) : string[] =
    commandArg ctx
    |> Option.map (fun s -> s.Split(' ') |> Array.filter (fun p -> p.Trim() <> ""))
    |> Option.defaultValue [||]

/// Register/refresh the user so a profile always exists before we act.
let ensureUser (ctx: Context) : UserProfile option =
    match ctx.from, ctx.chat with
    | Some from, Some chat -> Some(Users.upsert from.id chat.id from.first_name from.username)
    | _ -> None
