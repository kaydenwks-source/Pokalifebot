// Manual smoke test for Phase 6 tasks + planner.
// Run from the project root AFTER `npm run build`:
//   node tests/smoke-tasks.mjs
import fs from 'node:fs';

const svc = await import('../dist/Services/Tasks.js');
const FAKE = 999999;

console.log('--- CRUD + priority ordering ---');
svc.add(FAKE, 'low prio thing', 'low');
svc.add(FAKE, 'urgent thing', 'high');
svc.add(FAKE, 'normal thing', 'medium');

const order = svc.openFor(FAKE).map((t) => t.Priority).join(',');
console.log('ordering:', order === 'high,medium,low' ? 'PASS' : 'FAIL (' + order + ')');

const done = svc.completeByIndex(FAKE, 1);
console.log('complete #1 (should be urgent):', done && done.Text === 'urgent thing' ? 'PASS' : 'FAIL');
console.log('open count now 2:', svc.openFor(FAKE).length === 2 ? 'PASS' : 'FAIL');
console.log('doneTodayCount 1:', svc.doneTodayCount(FAKE) === 1 ? 'PASS' : 'FAIL');

const del = svc.deleteByIndex(FAKE, 1);
console.log('delete #1 (should be normal):', del && del.Text === 'normal thing' ? 'PASS' : 'FAIL');
console.log('bad index rejected:', svc.completeByIndex(FAKE, 99) === undefined ? 'PASS' : 'FAIL');

console.log('--- AI planner (one live call) ---');
const envMod = await import('../dist/Config/Env.js');
const cfg = envMod.load().fields[0];
const planner = await import('../dist/Ai/Planner.js');

const fakeUser = {
  Id: FAKE, ChatId: FAKE, FirstName: 'Test', Username: 'test',
  QuoteCategory: 'Discipline', QuoteTime: null, NudgesEnabled: null,
};
const fakeHabits = [
  { Id: 'x', UserId: FAKE, Name: 'gym', Cadence: 'daily', CreatedAt: '2026-07-01', Completions: [] },
];
const res = await planner.plan(cfg, fakeUser, svc.openFor(FAKE), fakeHabits, '23:30');
console.log(res.tag === 0 ? 'PASS:\n' + res.fields[0] : 'FAIL: ' + res.fields[0]);

// Clean up the fake user.
const remaining = svc.getAll().filter((t) => t.UserId !== FAKE);
fs.writeFileSync('database/tasks.json', JSON.stringify(remaining, null, 2));
console.log('cleanup done, tasks file has', remaining.length);
