# Momentum AI — Proposed Extra Phases (18+)

The core roadmap (Phases 1–17) covers features. What it under-covers is
**operations** (keeping the bot alive 24/7, controlling AI costs, protecting
data) and **retention** (why users come back after week 2). These proposals
fill those gaps. Numbers are suggestions — some deserve to be pulled earlier
into the schedule (marked ⚠️).

---

## Tier 1 — Do these or the bot can't serve real users

### Phase 18 ⚠️ — Deployment & 24/7 uptime
**Recommended slot: right after Phase 6 (planner), before habit streaks matter.**
Today the bot only runs while your PC is on. Streaks, reminders and daily
quotes are worthless if the bot sleeps when your laptop does.
- Deploy to a small VPS or free-tier host (Railway / Fly.io / Oracle free VM)
- PM2 process manager: auto-restart on crash, boot on server restart
- Switch long-polling → webhooks when stable (cheaper, faster)
- Separate dev bot token vs production bot token (test without disturbing users)

### Phase 19 ⚠️ — AI cost control & rate limiting
**Recommended slot: before inviting anyone else to use the bot.**
Every /quote and /coach call costs money. One spammy user = surprise bill.
- Per-user daily AI budget (e.g. 20 AI calls/day free tier)
- Cache: reuse daily quotes per category instead of one generation per user
- Track DeepSeek token spend per user per day in the database
- Graceful "you've hit today's limit" message (also the future premium upsell)

### Phase 20 — Data safety & portability
- Nightly automatic SQLite backup (rotate last 7)
- /export — send the user a JSON/CSV of all their data (trust + GDPR-style)
- /deleteme — full account wipe with confirmation (required for a real SaaS)

---

## Tier 2 — Product depth (retention)

### Phase 21 — Guided onboarding
First-time users currently face a wall of commands. Replace with a short
conversation: name → timezone → wake time → pick 1–3 starter habits → first
quote delivered instantly. Biggest UX win per hour of work on this list.

### Phase 22 — Natural-language everything
Let users type "slept 1am woke 8am", "ate chicken rice", "gym done" without
commands. One AI intent-router classifies free text → routes to the right
tracker. Turns the bot from a CLI into a coach. (DeepSeek does the parsing;
we already have the pattern from Phase 4's natural-language reminders.)

### Phase 23 — Gamification
- XP per completed habit/task/log; levels with names (Starter → Machine)
- Badges: 7-day streak, first 10 workouts, perfect week
- 1 streak-freeze token/week (missing one day doesn't nuke a 60-day streak —
  the single best retention mechanic in habit apps)

### Phase 24 — Focus sessions & journaling
- /focus 25 — Pomodoro timer with start/end check-ins, logged to analytics
- /journal + /mood (1–5 scale) — AI spots mood patterns in weekly reports
  (pairs naturally with Phase 13's coach)

---

## Tier 3 — Growth & revenue

### Phase 25 — Accountability & social
- Buddy pairing: two users see each other's habit completion
- Group leaderboards for shared chats (opt-in)
- Shareable achievement cards (image via Sharp — already in our stack)

### Phase 26 — Premium implementation
Phase 17 designs it; this ships it. Telegram Stars is the native payment
rail (no Stripe account needed, works worldwide inside Telegram). Free tier
limits from Phase 19 become the upgrade trigger.

### Phase 27 — Voice input
Voice note → transcription → routed through the Phase 22 intent router.
Needs a speech-to-text API (DeepSeek doesn't do audio — likely Whisper via
Groq/OpenAI, small extra cost). Big accessibility win for logging meals/
workouts on the go.

---

## Engineering hygiene (not a phase — weave into every phase)

- **Tests + CI**: populate tests/ with unit tests for parsers (time, calories,
  natural language) and a GitHub Actions workflow that runs `dotnet fable` on
  every push — catches compile breaks before deploy.
- **Admin toolkit**: /admin stats (users, AI spend, errors last 24h) gated to
  your Telegram id; error-spike alert DM'd to you.
- **Log rotation**: bot.log grows forever; rotate weekly, keep 4.

## Suggested integrated ordering

1–6 core → **18 deploy** → 7–10 core → **19 cost control, 21 onboarding** →
11–14 core → 15 SQLite → **20 data safety** → 16–17 → **22 NL input** →
**23 gamification** → 24 → 26 premium → 25 → 27
