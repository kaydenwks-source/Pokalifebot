# Momentum AI — Premium Architecture (Phase 17, design-only)

This is a **blueprint, not code**. Phase 17 in the spec is a design exercise:
decide *how* a free/premium model would work before writing a line of payment
logic. Phase 26 in [FUTURE-PHASES.md](FUTURE-PHASES.md) is where this actually
ships. Read this first; build from it later.

Everything here is deliberately shaped to fit the codebase we already have —
one routing file (`Bot.fs`), one persistence layer (`Services/Storage.fs` +
`momentum.db`), the milestone-gated AI-call pattern, and the `events` table
from Phase 16 as the template for new tables.

---

## 1. Why premium at all

Local features are nearly free: habits, tasks, weight, workouts, busy blocks,
reminders — all plain reads/writes. **The money leaves the building only on AI
calls**: `/quote`, `/coach`, `/food` (text + photo vision), `/plan`, `/goal`
breakdowns, `/progress`, weekly/monthly reports. DeepSeek and the Groq vision
bridge both bill per token.

So the tiering principle writes itself:

> **Free keeps every local tracker unlimited. Premium buys AI depth and volume.**

This is honest (users aren't paywalled out of their own data), cheap to run
(free users cost almost nothing), and it makes the upgrade prompt land exactly
when a user is getting value from the AI.

---

## 2. Free vs Premium — the split

| Capability | Free | Premium |
|---|---|---|
| Habits, tasks, sleep, weight, workouts, busy blocks, reminders, goals | ✅ unlimited | ✅ unlimited |
| Daily quote (`/quote`, scheduled) | ✅ (served from a shared daily cache — see §6) | ✅ personalised |
| AI food logging — text (`/food`) | ✅ up to daily AI budget | ✅ unlimited |
| AI food logging — **photo** (`/food` photo → vision) | ❌ | ✅ |
| AI coach (`/coach`) | ✅ 3 messages/day | ✅ unlimited |
| AI planner (`/plan`) | ✅ 1/day | ✅ unlimited |
| Goal 5-step breakdown | ✅ first 1 goal | ✅ every goal |
| Weekly report | ✅ | ✅ |
| **Monthly deep-dive + productivity score** | ❌ (teaser: "Premium unlocks your monthly report") | ✅ |
| Total AI calls/day (safety cap) | **~10** | effectively unlimited (fair-use cap ~200) |

Numbers are starting points, not gospel — tune them once real usage data
(Phase 16 analytics!) shows where free users actually hit the wall.

**Admin is always premium.** `ADMIN_USER_ID` is grandfathered so you never
gate yourself.

---

## 3. Payment rail: Telegram Stars

Use **Telegram Stars (currency code `XTR`)**, not Stripe.

Why Stars:
- **No merchant account, no Stripe, no card handling** — Telegram processes
  everything in-app. We never touch card data (this also keeps us clear of the
  "never enter financial credentials" rule — the user pays inside Telegram's
  own UI, we only receive a confirmation).
- Works worldwide inside Telegram.
- Native **recurring subscriptions** are supported (`subscription_period`,
  30-day period) — so premium can auto-renew.
- Built-in **refunds** (`refundStarPayment`).

The three-step Stars flow (all via the Bot API, so all bindable in
`Bindings/Telegraf.fs`):

1. **Offer** — `createInvoiceLink` / `sendInvoice` with `currency: "XTR"`,
   `provider_token: ""` (empty for Stars), a price in Stars, and for a
   subscription `subscription_period: 2592000`.
2. **Pre-checkout** — Telegram sends a `pre_checkout_query`; we must answer
   `answerPreCheckoutQuery(id, ok: true)` within 10 seconds (validate the user
   and product here, then approve).
3. **Confirm** — a `message.successful_payment` update arrives. This is the
   **trusted, server-side** signal (it comes from Telegram, not the client) —
   only here do we grant entitlement.

Refund path: `refundStarPayment(userId, telegramPaymentChargeId)` — store the
charge id so support can refund.

---

## 4. Data model changes

### 4a. UserProfile (extend `Models/User.fs`)

```fsharp
Tier: string option          // "premium" while active; None/"free" otherwise
PremiumUntil: string option  // "yyyy-MM-dd"; grace beyond this date, then lapse
StarsChargeId: string option // last successful_payment charge id, for refunds
```

`Tier`/`PremiumUntil` are all the enforcement code needs. Keep it on the
profile (KV blob) — it's read on every gated command and rarely written.

### 4b. Two new real SQLite tables

Follow the Phase 16 `events` table pattern exactly (real columns, aggregate
queries), reusing `Storage.database ()`:

```sql
-- daily AI usage, so we never scan an event log to count today's calls
CREATE TABLE ai_usage (
  user_id TEXT NOT NULL,
  day     TEXT NOT NULL,        -- "yyyy-MM-dd"
  feature TEXT NOT NULL,        -- "coach" | "food" | "plan" | ...
  count   INTEGER NOT NULL,
  PRIMARY KEY (user_id, day, feature)
);

-- immutable payments ledger (never updated, only appended)
CREATE TABLE payments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL,
  charge_id     TEXT NOT NULL,
  stars         INTEGER NOT NULL,
  kind          TEXT NOT NULL,  -- "one_time" | "subscription" | "refund"
  at            TEXT NOT NULL
);
```

`ai_usage` is date-keyed, so "reset at midnight" needs **no cron job** — a new
day is simply a new row. Counting today = one indexed `SELECT`.

---

## 5. Code architecture — where each piece slots

The whole design hangs on **one enforcement point**, mirroring the codebase's
existing "one place for X" discipline (Bot.fs routes, Storage persists).

```
Models/User.fs           + Tier / PremiumUntil / StarsChargeId
Services/Usage.fs        NEW  ai_usage table: incr(user,feature), todayCount, remaining
Services/Entitlements.fs NEW  the single source of truth (below)
Services/Payments.fs     NEW  payments ledger + grantPremium / recordRefund
Ai/DeepSeek.fs           unchanged — gating wraps the callers, not the client
Commands/Premium.fs      NEW  /premium (plans + upgrade button), /status (tier+usage)
Commands/*.fs            AI commands ask Entitlements.gate before calling AI
Bot.fs                   + pre_checkout_query + successful_payment handlers
Bindings/Telegraf.fs     + sendInvoice/createInvoiceLink, answerPreCheckoutQuery,
                           refundStarPayment, successful_payment on the message type
Scheduler/Subscriptions.fs NEW  daily tick: DM users whose premium lapses soon
```

### The gate — `Services/Entitlements.fs`

```fsharp
type Decision =
    | Allow
    | Upgrade of reason: string   // show the /premium upsell
    | LimitReached of resetHint: string

/// Is this user premium right now? (admin always true; else Tier=premium and
/// PremiumUntil not past its grace window.)
let isPremium (user: UserProfile) : bool = ...

/// The ONE call every AI command makes before spending money.
let check (user: UserProfile) (feature: string) : Decision =
    if isPremium user then Allow
    else
        match feature with
        | "food_photo"   -> Upgrade "Photo food logging is a Premium feature."
        | "monthly"      -> Upgrade "Monthly deep-dives are Premium."
        | _ ->
            let used = Usage.todayCount user.Id feature
            if used >= freeLimit feature then LimitReached "resets at midnight"
            else Allow

/// Call AFTER a successful AI response so failed calls aren't charged.
let commit (user: UserProfile) (feature: string) : unit =
    if not (isPremium user) then Usage.incr user.Id feature
```

Every AI command becomes: `check` → (on `Allow`) do the AI call → `commit`.
On `Upgrade`/`LimitReached`, reply with a friendly message that points at
`/premium`. That upsell message *is* the conversion funnel.

> This is intentionally the same shape as **Phase 19 (AI cost control)** in
> FUTURE-PHASES — the free daily budget and the cost-control budget are the
> same mechanism. Build `Usage`/`Entitlements` once; premium and cost-control
> both fall out of it.

### Granting premium — `Bot.fs` + `Services/Payments.fs`

```
on "pre_checkout_query"   -> answerPreCheckoutQuery(id, true)   // validate first
on successful_payment     -> Payments.grantPremium user charge stars kind
                             (append ledger row; set Tier=premium,
                              PremiumUntil = today + 30d; store charge id)
```

Only `successful_payment` (trusted, from Telegram) flips the tier. Never trust
a client-side signal.

---

## 6. Cost levers that make free tier sustainable

1. **Shared daily-quote cache.** Free users get one generated quote *per
   category per day*, reused across everyone — not one generation each. (One
   new tiny table or KV entry keyed by `category+date`.) This alone kills the
   biggest free-tier cost.
2. **Milestone-gated AI stays.** The existing habit/goal milestone gating
   already limits encouragement calls — keep it for both tiers.
3. **`commit`-after-success.** Never decrement a user's budget for an AI call
   that errored.

---

## 7. Rollout plan (so nothing breaks live)

Ship in three quiet steps, each independently safe:

1. **Instrument, grandfather everyone.** Add `Usage`/`Entitlements`, but set
   the free limits so high nobody notices, and treat all existing users as
   premium. Watch Phase 16 analytics to see real AI-call distributions.
2. **Add `/premium` + Stars, still no limits.** Let people *choose* to support
   the bot. Verify the full Stars flow (test environment first) end to end.
3. **Flip the limits on** for new free users; grandfather day-1 users a while.
   The upsell messages start converting.

---

## 8. Edge cases to design for now

- **Lapse grace:** keep premium features live for ~3 days past `PremiumUntil`
  before dropping to free — avoids punishing a renewal that's a day late.
- **Downgrade never deletes data.** A lapsed user keeps every log; they just
  re-hit the free gates. Re-subscribing restores full access instantly.
- **Refunds:** `refundStarPayment` + append a `kind="refund"` ledger row +
  clear `Tier`. Keep the charge id for exactly this.
- **Admin comp:** `ADMIN_USER_ID` and any ids in an allow-list are always
  premium, no payment.
- **Subscription auto-renew:** Telegram sends a fresh `successful_payment` each
  period — the same `grantPremium` handler just extends `PremiumUntil` again.
- **Timezone for "resets at midnight":** use the user's `TzOffsetMinutes`
  (Phase 14) so the daily budget resets on *their* midnight, and key
  `ai_usage.day` off `Time.userNow`.

---

## 9. Security & compliance

- **No card data ever touches us** — Stars is entirely inside Telegram. This
  keeps the bot on the right side of the "never enter financial credentials"
  rule: the user pays in Telegram's UI; we receive only a confirmation object.
- **Trust only server-side updates** (`successful_payment`, `pre_checkout_query`)
  — never a value a client could forge.
- **Ledger is append-only** — refunds are new rows, not edits, so the payment
  history is always auditable.
- Before any public launch, the standing secret-rotation task still applies
  (BotFather `/revoke`, rotate DeepSeek + Groq keys).

---

## 10. What to build first (when Phase 26 comes)

1. `Services/Usage.fs` + `Services/Entitlements.fs` (the gate) — pure logic,
   fully smoke-testable with a fake user, no Telegram needed.
2. Wrap the AI commands with `check`/`commit`.
3. `Bindings/Telegraf.fs` payment surface + `Bot.fs` payment handlers +
   `Commands/Premium.fs`.
4. The shared quote cache (§6.1).
5. `Scheduler/Subscriptions.fs` lapse reminders.

Steps 1–2 deliver the entire cost-control benefit even if payments never ship —
which is why they're first.
