// Manual smoke test for Phase 4 reminders.
// Run from the project root AFTER `npm run build`:
//   node tests/smoke-reminders.mjs
// Exercises the live DeepSeek parser (costs a few tokens) and the
// reminder service CRUD + recurrence math with a throwaway user id.
import fs from 'node:fs';

const envMod = await import('../dist/Config/Env.js');
const loaded = envMod.load();
if (loaded.tag !== 0) {
  console.error('Config missing - fill .env first');
  process.exit(1);
}
const cfg = loaded.fields[0];

console.log('--- AI parser (live DeepSeek calls) ---');
const parser = await import('../dist/Ai/ReminderParser.js');
const phrases = [
  'call mum tomorrow 7pm',
  'every monday 8am gym session',
  'in 2 hours drink water',
];
for (const phrase of phrases) {
  const res = await parser.parse(cfg, phrase);
  console.log(
    `"${phrase}" =>`,
    res.tag === 0 ? JSON.stringify(res.fields[0]) : 'ERROR: ' + res.fields[0]
  );
}

console.log('--- service CRUD + recurrence ---');
const svc = await import('../dist/Services/Reminders.js');
const FAKE = 999999;
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

svc.add(FAKE, FAKE, 'test one-time', '2030-01-01', '09:00', 'once');
const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
const daily = svc.add(FAKE, FAKE, 'test daily', ymd(yesterday), '00:01', 'daily');

console.log('listed:', svc.forUser(FAKE).length, 'reminders (expect 2)');

svc.completeOccurrence(daily);
const after = svc.forUser(FAKE).find((r) => r.Id === daily.Id);
console.log(
  'daily advanced from', daily.DueDate, 'to', after.DueDate,
  '(expect tomorrow: past-due times roll forward past now)'
);

console.log('deleteByIndex(1):', svc.deleteByIndex(FAKE, 1) ? 'ok' : 'FAILED');

// Clean up every trace of the fake user.
const remaining = svc.getAll().filter((r) => r.UserId !== FAKE);
fs.writeFileSync('database/reminders.json', JSON.stringify(remaining, null, 2));
console.log('cleanup done, file now has', remaining.length, 'reminders');
