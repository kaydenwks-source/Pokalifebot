/// /mood and /journal — daily reflection. Both write to the same store; the
/// weekly/monthly report reads mood trends and journal themes back out.
///   /mood 4 [note]   log how you feel, 1 (rough) – 5 (great), optional note
///   /mood            your 7-day mood average
///   /journal <text>  write a private journal entry
///   /journal         show your last few entries
module Commands.Journal

open Fable.Core
open Bindings.Telegraf
open Services
open Utils

let private moodEmoji =
    function
    | 1 -> "😞"
    | 2 -> "🙁"
    | 3 -> "😐"
    | 4 -> "🙂"
    | _ -> "😄"

let private moodWord =
    function
    | 1 -> "rough"
    | 2 -> "low"
    | 3 -> "okay"
    | 4 -> "good"
    | _ -> "great"

let handleMood (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        let args = Common.commandArgs ctx

        if args.Length = 0 then
            match Reflections.avgMood7 user.Id with
            | Some avg ->
                ctx.reply (
                    sprintf
                        "%s Your mood — last 7 days average %.1f/5.\n\nLog now: /mood 4 (add a note: /mood 4 tired but productive)."
                        (moodEmoji (int (System.Math.Round avg)))
                        avg
                )
            | None ->
                ctx.reply "How are you feeling? /mood 1–5 (1 rough … 5 great). Add a note too: /mood 4 shipped a lot today."
        else
            match System.Int32.TryParse args.[0] with
            | true, n when n >= 1 && n <= 5 ->
                let note =
                    if args.Length > 1 then
                        Some(String.concat " " (Array.skip 1 args))
                    else
                        None

                Reflections.add user.Id (Some n) note |> ignore
                Logger.info (sprintf "%s logged mood %d" user.FirstName n)

                let tail =
                    match note with
                    | Some _ -> " Noted. 🧠"
                    | None -> " Want to add why? /journal <thoughts>"

                ctx.reply (sprintf "%s Mood logged: %d/5 (%s).%s" (moodEmoji n) n (moodWord n) tail)
            | _ -> ctx.reply "Use a number 1–5: /mood 4. (1 rough, 3 okay, 5 great.)"

let handleJournal (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        match Common.commandArg ctx with
        | None ->
            let recent = Reflections.forUser user.Id |> Array.truncate 5

            if recent.Length = 0 then
                ctx.reply "📓 Your journal is empty. Write an entry: /journal today I finally started that project.\n\nIt's private to you, and I'll factor your reflections into your weekly review."
            else
                let lines =
                    recent
                    |> Array.map (fun r ->
                        let mood =
                            match r.Mood with
                            | Some m -> sprintf " %s" (moodEmoji m)
                            | None -> ""

                        let body =
                            match r.Text with
                            | Some t -> t
                            | None -> "(mood check-in)"

                        sprintf "• %s%s — %s" r.Stamp mood body)
                    |> String.concat "\n"

                ctx.reply ("📓 Recent journal entries:\n\n" + lines)
        | Some text ->
            Reflections.add user.Id None (Some text) |> ignore
            Logger.info (sprintf "%s wrote a journal entry (%d chars)" user.FirstName text.Length)
            ctx.reply "📓 Saved to your journal. I'll weave your reflections into your weekly review. 🧠"
