---
name: verify
description: Build Momentum AI and prove it works — compile F# with Fable, run all smoke tests, restart the bot and confirm healthy startup. Use after any code change, before committing a phase, or when the user asks whether the bot still works.
---

Run every step from the project root (`C:\Users\kayde\Projects\momentum-ai`).
Report PASS/FAIL per step; stop and diagnose on the first failure.

1. **Compile:** `dotnet fable src --outDir dist` — must finish with zero
   errors. If `dotnet` isn't found, refresh PATH from the Machine+User
   environment first. If a brand-new .fs file is "not defined", it's missing
   from `src/MomentumAI.fsproj` (files compile in listed order).

2. **Smoke tests** (each cleans up its fake user 999999; a few make cheap
   live DeepSeek calls, so `.env` must be filled):
   - `node tests/smoke-reminders.mjs`
   - `node tests/smoke-habits.mjs`
   - `node tests/smoke-tasks.mjs`
   - `node tests/smoke-food.mjs`
   Every line should read PASS. Eyeball any AI-generated output for sanity.

3. **Restart the bot** (only ONE instance may poll — Telegram returns 409
   otherwise): find and stop any running instance
   (`Get-CimInstance Win32_Process -Filter "Name = 'node.exe'"` where
   CommandLine matches `dist*Index.js`, then `Stop-Process`), then start
   `node dist/Index.js` in the background.

4. **Confirm healthy startup** in the output within ~10 s:
   - `Connected to Telegram as @pokalifebot`
   - `DeepSeek connection OK`
   - one "scheduler started" line per scheduler
   A `401` here means BOT_TOKEN is wrong; a DeepSeek warning means the AI key
   is missing/unfunded (bot still runs, AI features won't).

5. If the change touched a scheduler, verify it live: seed a trigger a couple
   of minutes out (see tests/smoke-reminders.mjs for the pattern), watch the
   log for the fire line, then clean up.
