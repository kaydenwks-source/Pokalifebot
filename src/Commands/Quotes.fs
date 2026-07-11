/// Handlers for the motivation feature: /quote, /category, /quotetime,
/// plus the inline-button callback when a user picks a category.
module Commands.Quotes

open Fable.Core
open Fable.Core.JsInterop
open Bindings.Telegraf
open Models.User
open Services
open Utils
open Config

let handleQuote (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    promise {
        match Common.ensureUser ctx with
        | None -> return! ctx.reply "Sorry, I couldn't identify you — please try again."
        | Some user ->
            // Category priority: explicit argument > stored preference.
            let category, hint =
                match Common.commandArg ctx with
                | Some arg ->
                    match Categories.tryFind arg with
                    | Some cat -> cat, None
                    | None ->
                        user.QuoteCategory,
                        Some(
                            sprintf
                                "I don't know the category \"%s\", so I used %s. Options: %s"
                                arg
                                user.QuoteCategory
                                (String.concat ", " Categories.all)
                        )
                | None -> user.QuoteCategory, None

            Logger.info (sprintf "/quote (%s) for %s" category user.FirstName)
            ctx.sendChatAction "typing" |> ignore

            let! result = Ai.Quotes.generate config category

            let text =
                match result with
                | Ok quote ->
                    let extra =
                        hint
                        |> Option.map (fun h -> "\n\nℹ️ " + h)
                        |> Option.defaultValue ""

                    sprintf "💪 %s\n\n%s%s" category quote extra
                | Error _ -> Common.aiUnavailable

            return! ctx.reply text
    }

let private categoryKeyboard =
    let button (cat: string) =
        createObj [ "text" ==> cat; "callback_data" ==> ("cat:" + cat) ]

    let rows =
        Categories.all
        |> List.map button
        |> List.chunkBySize 2
        |> List.map List.toArray
        |> List.toArray

    createObj [ "reply_markup" ==> createObj [ "inline_keyboard" ==> rows ] ]

let handleCategory (ctx: Context) : JS.Promise<obj> =
    let current =
        Common.ensureUser ctx
        |> Option.map (fun u -> sprintf " (current: %s)" u.QuoteCategory)
        |> Option.defaultValue ""

    ctx.reply (sprintf "Pick your preferred quote category%s:" current, categoryKeyboard)

/// Inline button pressed — Bot.fs registers one of these per category.
let handleCategoryChosen (category: string) (ctx: Context) : JS.Promise<obj> =
    promise {
        match ctx.from, ctx.chat with
        | Some from, Some chat ->
            Users.upsert from.id chat.id from.first_name from.username |> ignore
            Users.setCategory from.id category
            Logger.info (sprintf "%s set quote category to %s" from.first_name category)
            ctx.answerCbQuery () |> ignore

            return!
                ctx.editMessageText (
                    sprintf
                        "✅ Preferred category set to %s.\n\nUse /quote anytime, and /quotetime HH:MM to get one every morning."
                        category
                )
        | _ -> return! ctx.answerCbQuery ()
    }

let handleQuoteTime (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        match Common.commandArg ctx with
        | None ->
            let status =
                user.QuoteTime
                |> Option.map (sprintf "🕖 Your daily quote is scheduled for %s.")
                |> Option.defaultValue "You have no daily quote scheduled."

            ctx.reply (
                status
                + "\n\nUsage:\n/quotetime 07:00 — daily quote at 7 AM\n/quotetime off — turn it off"
            )
        | Some arg when arg.Trim().ToLowerInvariant() = "off" ->
            Users.setQuoteTime user.Id None
            Logger.info (sprintf "%s turned daily quote off" user.FirstName)
            ctx.reply "Daily quote turned off. Re-enable anytime with /quotetime HH:MM."
        | Some arg ->
            match Time.parseTime arg with
            | Some time ->
                Users.setQuoteTime user.Id (Some time)
                Logger.info (sprintf "%s set daily quote time to %s" user.FirstName time)

                ctx.reply (
                    sprintf
                        "✅ Daily %s quote scheduled for %s every day.\nChange the style with /category, or /quotetime off to stop."
                        user.QuoteCategory
                        time
                )
            | None ->
                ctx.reply (
                    sprintf "\"%s\" doesn't look like a time. Use 24h HH:MM, e.g. /quotetime 07:00" arg
                )
