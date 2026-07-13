/// Premium (Phase 26). /premium offers a Telegram Stars subscription and,
/// once paid, the pre_checkout + successful_payment handlers grant the tier.
/// /status shows the user's current plan. Payments happen entirely inside
/// Telegram's own UI — we never see or touch card data, only the trusted
/// confirmation object Telegram sends back.
module Commands.Premium

open Fable.Core
open Fable.Core.JsInterop
open Bindings.Telegraf
open Services
open Utils
open Config

let private benefits =
    [ "⭐ Momentum Premium"
      ""
      "Everything you already track stays free and unlimited. Premium removes the"
      "daily cap on the AI features and unlocks the deeper ones:"
      ""
      "• Unlimited AI coaching, planning and food logging"
      "• 📸 Photo food logging"
      "• 📅 Monthly deep-dive report + productivity score"
      "• Priority when the AI is busy"
      ""
      sprintf "%d ⭐ for 30 days. Renew anytime — days stack, they don't reset." Payments.PriceStars ]
    |> String.concat "\n"

/// Build the Stars invoice. currency "XTR" + empty provider_token = Stars;
/// the payload lets us recognise our own invoice at pre-checkout time.
let private invoiceFor (userId: float) : obj =
    createObj
        [ "title" ==> "Momentum Premium"
          "description"
          ==> "Unlimited AI coaching, planning, photo food logging and monthly deep-dives for 30 days."
          "payload" ==> sprintf "premium:%.0f" userId
          "provider_token" ==> ""
          "currency" ==> "XTR"
          "prices"
          ==> [| createObj [ "label" ==> "Premium — 30 days"; "amount" ==> Payments.PriceStars ] |] ]

let private premiumStatusText (until: string option) =
    [ "⭐ You're on Momentum Premium — thank you! 💛"
      ""
      match until with
      | Some d -> sprintf "Active until %s (with a few days' grace after)." d
      | None -> "Active."
      ""
      "Every AI feature is unlimited, plus photo food logging and the monthly"
      "deep-dive. Nothing to do — just keep going." ]
    |> String.concat "\n"

let handle (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        if Entitlements.isPremium config.AdminUserId user then
            ctx.reply (premiumStatusText user.PremiumUntil)
        else
            promise {
                let! _ = ctx.reply benefits
                return! ctx.replyWithInvoice (invoiceFor user.Id)
            }

let handleStatus (config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx with
    | None -> ctx.reply "Sorry, I couldn't identify you — please try again."
    | Some user ->
        let lines =
            if Entitlements.isPremium config.AdminUserId user then
                let plan =
                    if Entitlements.isExempt config.AdminUserId user then
                        "Premium ✨ (admin)"
                    else
                        match user.PremiumUntil with
                        | Some d -> sprintf "Premium ⭐ — active until %s" d
                        | None -> "Premium ⭐"

                [ "📋 Your plan"; ""; plan; "AI features: unlimited"; "Trackers: unlimited (always)" ]
            else
                let left =
                    Entitlements.remaining config.AdminUserId user |> Option.defaultValue 0

                [ "📋 Your plan"
                  ""
                  "Free"
                  sprintf "AI features left today: %d of %d (resets at midnight, your time)" left Entitlements.FreeDailyAiCap
                  "Trackers: unlimited (always)"
                  ""
                  "Want no limits + photo food logging + monthly deep-dives? /premium" ]

        lines |> String.concat "\n" |> ctx.reply

/// Telegram asks us to approve the charge (within 10s). We only ever issue
/// premium invoices, so we approve ours and log anything unexpected.
let handlePreCheckout (ctx: Context) : JS.Promise<obj> =
    match ctx.preCheckoutQuery with
    | Some q when q.invoice_payload.StartsWith "premium:" -> ctx.answerPreCheckoutQuery true
    | Some q ->
        Logger.warn (sprintf "Pre-checkout with unexpected payload: %s" q.invoice_payload)
        ctx.answerPreCheckoutQuery true
    | None -> ctx.answerPreCheckoutQuery true

/// The trusted confirmation. This — and only this — grants premium.
let handleSuccessfulPayment (_config: Env.AppConfig) (ctx: Context) : JS.Promise<obj> =
    match Common.ensureUser ctx, ctx.message |> Option.bind (fun m -> m.successful_payment) with
    | Some user, Some pay ->
        let until =
            Payments.grantPremium user pay.telegram_payment_charge_id (int pay.total_amount) "one_time"

        Logger.info (
            sprintf "Premium granted to %s (id %.0f) until %s (charge %s)" user.FirstName user.Id until pay.telegram_payment_charge_id
        )

        ctx.reply (
            [ "🎉 Payment received — you're Premium!"
              ""
              sprintf "Active until %s. Every AI feature is now unlimited, and photo" until
              "food logging + the monthly deep-dive are unlocked."
              ""
              "Thank you for supporting Momentum. 💛" ]
            |> String.concat "\n"
        )
    | _ ->
        ctx.reply
            "✅ Payment received — thank you! If your Premium isn't active in a minute, please reach out and we'll sort it."
