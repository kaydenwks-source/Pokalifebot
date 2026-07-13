// Manual smoke test for Phase 5 habits.
// Run from the project root AFTER `npm run build`:
//   node tests/smoke-habits.mjs
// Tests the pure streak math for all three cadences, the CRUD paths
// with a throwaway user, and one live AI encouragement call.
import fs from 'node:fs';

const svc = await import('../dist/Services/Habits.js');

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => fmt(new Date(Date.now() - n * 86400000));

console.log('--- streak math ---');
const now = new Date();
const firstOfThisMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
const lastOfPrevMonth = fmt(new Date(now.getFullYear(), now.getMonth(), 0));

const cases = [
  ['daily 3-run incl today', 'daily', [daysAgo(0), daysAgo(1), daysAgo(2)], { C: 3, L: 3, D: true }],
  ['daily 2-run ending yesterday (not broken)', 'daily', [daysAgo(1), daysAgo(2)], { C: 2, L: 2, D: false }],
  ['daily broken (last done 2 days ago)', 'daily', [daysAgo(2), daysAgo(3)], { C: 0, L: 2, D: false }],
  ['daily with old gap', 'daily', [daysAgo(0), daysAgo(1), daysAgo(5), daysAgo(6), daysAgo(7)], { C: 2, L: 3, D: true }],
  ['weekly 3 weeks running', 'weekly', [daysAgo(0), daysAgo(7), daysAgo(14)], { C: 3, L: 3, D: true }],
  ['monthly this + previous month', 'monthly', [firstOfThisMonth, lastOfPrevMonth], { C: 2, L: 2, D: true }],
];

let failures = 0;
for (const [label, cadence, completions, exp] of cases) {
  const s = svc.streaksFor(cadence, completions);
  const pass = s.Current === exp.C && s.Longest === exp.L && s.DoneThisPeriod === exp.D;
  if (!pass) failures++;
  console.log(
    `${pass ? 'PASS' : 'FAIL'} ${label}: current ${s.Current} (want ${exp.C}), longest ${s.Longest} (want ${exp.L}), done ${s.DoneThisPeriod} (want ${exp.D})`
  );
}

console.log('--- CRUD ---');
const FAKE = 999999;
console.log('add:', svc.add(FAKE, 'Test Gym', 'daily').tag === 0 ? 'PASS' : 'FAIL');
console.log('duplicate rejected:', svc.add(FAKE, 'test gym', 'daily').tag === 1 ? 'PASS' : 'FAIL');

const habit = svc.tryFind(FAKE, 'Test Gym');
const r1 = svc.markDone(habit);
console.log('markDone:', r1.tag === 0 && r1.fields[1].Current === 1 ? 'PASS (streak 1)' : 'FAIL');

const habit2 = svc.tryFind(FAKE, 'Test Gym');
const r2 = svc.markDone(habit2);
// DoneResult tags: Marked=0, MarkedWithFreeze=1, AlreadyDone=2
console.log('second markDone same day:', r2.tag === 2 ? 'PASS (AlreadyDone)' : 'FAIL');

// Clean up the fake user.
const remaining = svc.getAll().filter((h) => h.UserId !== FAKE);
fs.writeFileSync('database/habits.json', JSON.stringify(remaining, null, 2));
console.log('cleanup done, habits file has', remaining.length);

console.log('--- AI encouragement (one live call) ---');
const envMod = await import('../dist/Config/Env.js');
const cfg = envMod.load().fields[0];
const enc = await import('../dist/Ai/Encourage.js');
const e = await enc.generate(cfg, 'Gym', 'daily', 7);
console.log(e.tag === 0 ? 'PASS: ' + e.fields[0] : 'FAIL: ' + e.fields[0]);

process.exit(failures > 0 ? 1 : 0);
