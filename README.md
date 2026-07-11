# Momentum AI 🚀

An AI-powered Telegram productivity coach — habits, sleep, meals, workouts,
goals and personal analytics, all inside Telegram.

Built with **F# + Fable** (compiled to JavaScript), running on **Node.js**
with **Telegraf** and the **DeepSeek** API.

## Current status

**Phase 1 — Project setup** ✅
Commands: `/start`, `/help`, `/ping`, `/version`

## Prerequisites

- .NET SDK 8+ (for the Fable compiler)
- Node.js 18+ (18+ ships the built-in `fetch` we use for DeepSeek)

## Setup

1. Create a Telegram bot: message **@BotFather** in Telegram, send `/newbot`,
   follow the prompts, and copy the token it gives you.
2. Create a DeepSeek API key at <https://platform.deepseek.com>.
3. Copy `.env.example` to `.env` and paste in both values.
4. Install dependencies:

   ```
   npm install
   dotnet tool restore
   ```

## Run

```
npm run build   # compile F# -> JavaScript (dist/)
npm start       # run the bot
```

For development with auto-rebuild on save:

```
npm run dev
```

Stop the bot with `Ctrl+C`.

## Project layout

```
src/
  Index.fs        entry point: config -> bot -> launch
  Bot.fs          command routing (the only place commands are registered)
  Bindings/       typed F# bindings to Node and Telegraf
  Config/         environment variable loading + validation
  Ai/             DeepSeek API client
  Commands/       one module per command group
  Utils/          logging and helpers
logs/             runtime log files (bot.log)
database/         data storage (JSON now, SQLite later)
```

## Logs

Everything the bot does is written to the console and to `logs/bot.log`.
Check that file first when something misbehaves.
