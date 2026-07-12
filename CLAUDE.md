# CLAUDE.md — Momentum AI

AI productivity coach on Telegram (**@pokalifebot**): quotes, sleep, reminders,
habits, planner, calories — built **one phase at a time** (17-phase roadmap;
extras in docs/FUTURE-PHASES.md). The owner is a **non-coder**: explain plainly,
run and verify everything yourself, commit each phase when verified.

## Stack

F# compiled by **Fable 5** (dotnet local tool) → ESM JavaScript on Node 24.
Telegraf 4.16 (long polling), DeepSeek API (OpenAI-compatible, via global
fetch), node-cron, dotenv, JSON-file storage in `database/` until Phase 15
migrates to SQLite.

## Commands

```
npm run build     # dotnet fable src --outDir dist   (compile F# -> JS)
npm start         # node dist/Index.js               (run the bot)
npm run dev       # fable watch + auto-restart
dotnet tool restore                                  # first checkout only
node tests/smoke-reminders.mjs                       # smoke tests — run from
node tests/smoke-habits.mjs                          # the PROJECT ROOT; some
node tests/smoke-tasks.mjs                           # make live DeepSeek calls
node tests/smoke-food.mjs                            # (cheap) and clean up
                                                     # their fake user 999999
```

Only **one** bot instance may poll at a time (Telegram 409). Stop the old one
before starting a new build.

## Iron rules

- **Every new .fs file must be added to `src/MomentumAI.fsproj`** in dependency
  order (F# compiles top-to-bottom; a file can only use modules above it).
  Forgetting this is the #1 build error in this repo.
- Phased workflow: one phase per session-chunk, must compile + pass smoke
  tests before the next; never rewrite existing files wholesale. **Phases 1–7
  complete** (v0.7.0). Next: Phase 8 (weight tracker).
- Command routing lives ONLY in `src/Bot.fs`. Bindings (Node/Telegraf/cron
  interop) are quarantined in `src/Bindings/`. One module per command group in
  `src/Commands/`; business logic in `src/Services/`; prompts in `src/Ai/`.
- AI calls return `Result` and every AI JSON field is **validated before
  storage** (see Ai/ReminderParser.fs, Ai/FoodAnalyzer.fs for the pattern).
- Persisted types use **arrays, never F# lists** (lists don't survive the JSON
  round-trip). Records round-trip fine; option fields serialize as
  missing/null.
- **DeepSeek's API is TEXT-ONLY** (verified 2026-07-12: rejects `image_url`
  content even on deepseek-v4 models). Photo food logging therefore goes
  through `src/Ai/Vision.fs` — a pluggable OpenAI-compatible vision bridge
  (VISION_API_KEY/BASE_URL/MODEL in .env; Gemini free tier recommended) whose
  text description feeds the DeepSeek FoodAnalyzer. No key = graceful text
  fallback. Telegram compresses photos server-side, so Sharp stays uninstalled.
- Each phase bumps the version in BOTH `src/Config/Env.fs` (`Version` literal)
  and `package.json`, plus the phase name in `/version` (Commands/Basic.fs).
- Schedulers share the one-minute cron tick pattern (`src/Scheduler/`); user
  times are server-local until Phase 14 adds timezones.

## Environment quirks

- `dotnet` may need a fresh terminal or PATH refresh (SDK 10 installed
  2026-07-12 via winget).
- Windows PowerShell 5.1 misrenders UTF-8 log output (cosmetic — files are
  fine).
- Secrets in `.env`: BOT_TOKEN, DEEPSEEK_API_KEY, ADMIN_USER_ID (owner's
  Telegram id 1656397304, gates /admin). Both keys were pasted in chat during
  development — **rotate before public launch** (BotFather /revoke + DeepSeek
  dashboard).
