# Deploying Momentum AI (Render + Neon, no credit card)

The bot runs 24/7 as a **Render** free web service; its data lives durably in
**Neon** (Postgres). Render's disk is wiped on every restart, so on boot the bot
restores its SQLite database from a Neon snapshot, and snapshots back every ~2
minutes and on shutdown (see `src/Services/Cloud.fs`). Neither service needs a
credit card.

Do the parts in order. **Part 0 is mandatory — rotate the secrets first.**

---

## Part 0 — Rotate your secrets (do this first)

The current bot token and API keys were shared in chat, so replace them before
going public. You'll paste the new values into Render later (never into a file
that gets committed).

1. **Telegram bot token** — open **@BotFather** → `/revoke` → pick `@pokalifebot`
   → it gives you a **new token**. (This instantly invalidates the old one.)
2. **DeepSeek key** — https://platform.deepseek.com → *API Keys* → delete the old
   key, **Create new key**.
3. **Groq key** (photo food logging) — https://console.groq.com → *API Keys* →
   delete the old key, **Create API Key**.

Keep the three new values somewhere safe for Part 3.

---

## Part 1 — Create the Neon database (free, no card)

1. Go to https://neon.tech and sign up (GitHub or Google — no card).
2. **Create a project** (any name, any region near you).
3. Copy the **connection string** it shows. It looks like:
   `postgresql://user:pass@ep-xxx-123.us-east-2.aws.neon.tech/dbname?sslmode=require`
   This is your `DATABASE_URL`. That's all — the bot creates its own table.

---

## Part 2 — Put the code on GitHub (free, no card)

Render deploys from GitHub. The compiled `dist/` folder is committed, so Render
doesn't need the .NET build tools — it just installs and runs.

1. Create a new **private** repo at https://github.com/new (e.g. `momentum-ai`).
2. In the project folder on your PC:
   ```bash
   git remote add origin https://github.com/<your-username>/momentum-ai.git
   git push -u origin master
   ```
   (Your `.env` is git-ignored, so no secrets are uploaded.)

---

## Part 3 — Deploy on Render (free, no card)

1. Go to https://render.com and sign up (GitHub — no card).
2. **New → Blueprint**, connect your GitHub, pick the `momentum-ai` repo. Render
   reads `render.yaml` automatically.
3. It will prompt for the secret env vars — fill them in:
   - `BOT_TOKEN` — the **new** BotFather token
   - `DEEPSEEK_API_KEY` — the **new** DeepSeek key
   - `VISION_API_KEY` — the **new** Groq key
   - `DATABASE_URL` — your Neon connection string from Part 1
   - `ADMIN_USER_ID` — `1656397304`
4. Click **Apply / Deploy**. Watch the logs for:
   ```
   Cloud: no snapshot in Neon yet — starting with a fresh database.   (first deploy)
   Health server listening on port ...
   Connected to Telegram as @pokalifebot
   Bot is live ...
   DeepSeek connection OK (model replied: pong)
   ```
5. Note your service URL, e.g. `https://momentum-ai-xxxx.onrender.com`.

---

## Part 4 — Keep it awake (automatic, nothing to do)

Render free services sleep after 15 minutes with no **inbound** traffic (the
bot's outbound Telegram polling doesn't count). The bot now keeps **itself**
awake: on Render it pings its own public URL every 5 minutes, using the
`RENDER_EXTERNAL_URL` that Render sets automatically. You'll see
`Keep-alive: self-ping every 5 min enabled.` in the logs. No external service
required.

Optional extra safety net: also set up a free pinger (https://cron-job.org, no
card) hitting your Render URL every ~10 minutes, in case the process ever
restarts in a way that misses a self-ping.

---

## Part 5 — Stop your local bot

Telegram allows only **one** poller per token. Once Render is live, stop the
`npm start` on your PC (close the terminal / Ctrl+C) or you'll get a "409
Conflict". From now on Render is the one and only instance.

---

## Optional — Carry over your existing data

On the first deploy Render starts with an empty database. To bring your current
data (habits, goals, weights…) along, upload your local DB to Neon once, and
Render will restore it:

1. On your PC, temporarily set the Neon URL and start the bot:
   ```bash
   # PowerShell
   $env:DATABASE_URL='postgresql://...your neon string...'
   npm start
   ```
2. Wait for `Bot is live`, then press **Ctrl+C**. On shutdown it runs
   `Cloud: snapshot saved to Neon.` — your local data is now in Neon.
3. `Remove-Item Env:\DATABASE_URL` (so local runs go back to the local file).
4. Redeploy / restart on Render — it logs `Cloud: restored the database
   snapshot from Neon.` and your data is there.

*(Do this while the Render instance is stopped, to avoid two pollers at once.)*

---

## Updating the bot later

Because `dist/` is committed, each update is:
```bash
npm run build              # recompile F# → dist/
git add -A && git add -f dist   # -f dist also catches Fable's runtime library,
                                 # which Fable marks git-ignored inside dist/fable_modules
git commit -m "…"
git push                   # Render auto-deploys
```
Render redeploys on push; the bot snapshots to Neon on shutdown and restores on
the new instance, so no data is lost across deploys.
