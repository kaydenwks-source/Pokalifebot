// Manual smoke test for Phase 10 goals.
// Run from the project root AFTER `npm run build`:
//   node tests/smoke-goals.mjs
import fs from 'node:fs';

const envMod = await import('../dist/Config/Env.js');
const cfg = envMod.load().fields[0];
const parser = await import('../dist/Ai/GoalParser.js');

console.log('--- AI goal parsing (live calls) ---');
const books = await parser.parse(cfg, 'read 20 books this year');
if (books.tag === 0) {
  const p = books.fields[0];
  console.log(`${p.Target === 20 ? 'PASS' : 'FAIL'}: "${p.Name}" — ${p.Target} ${p.Unit}`);
} else console.log('FAIL:', books.fields[0]);

const savings = await parser.parse(cfg, 'save $5k for a holiday');
if (savings.tag === 0) {
  const p = savings.fields[0];
  console.log(`${p.Target === 5000 ? 'PASS' : 'FAIL'}: "${p.Name}" — ${p.Target} ${p.Unit} ($5k expanded)`);
} else console.log('FAIL:', savings.fields[0]);

const binary = await parser.parse(cfg, 'finish my python course');
if (binary.tag === 0) {
  const p = binary.fields[0];
  console.log(`${p.Target === 1 ? 'PASS' : 'FAIL'}: binary goal "${p.Name}" — target ${p.Target}`);
} else console.log('FAIL:', binary.fields[0]);

const weight = await parser.parse(cfg, 'lose 10kg');
console.log('weight goal redirected:', weight.tag === 1 ? 'PASS (' + weight.fields[0] + ')' : 'FAIL — accepted it');

console.log('--- progress + milestones ---');
const svc = await import('../dist/Services/Goals.js');
const FAKE = 999999;
const goal = svc.add(FAKE, 'Run 100 km', 100, 'km');

let r = svc.logProgress(goal, 20);
console.log('20/100 no milestone... wait, crosses nothing? ', r.Milestone == null ? 'PASS (20% < 25%)' : 'FAIL');
r = svc.logProgress(r.Goal, 10);
console.log('30% crosses 25:', r.Milestone === 25 ? 'PASS' : 'FAIL ' + r.Milestone);
r = svc.logProgress(r.Goal, 45);
console.log('75% crosses 75 (highest):', r.Milestone === 75 ? 'PASS' : 'FAIL ' + r.Milestone);
r = svc.logProgress(r.Goal, 25);
console.log('100% completes:', r.Milestone === 100 && r.Goal.CompletedAt != null ? 'PASS' : 'FAIL');

console.log('--- auto-progress from cardio (km unit) ---');
const runGoal = svc.add(FAKE, 'Cycle 50 km', 50, 'km');
const results = svc.autoProgress(FAKE, 'km', 5);
// Only the ACTIVE km goal should advance (the completed one must not).
console.log('only active km goal advanced:', results.length === 1 && results[0].Goal.Progress === 5 ? 'PASS' : 'FAIL (' + results.length + ')');

console.log('percentOf capped:', svc.percentOf({ ...goal, Progress: 150, TargetValue: 100 }) === 100 ? 'PASS' : 'FAIL');

fs.writeFileSync('database/goals.json', JSON.stringify(svc.getAll().filter(g => g.UserId !== FAKE), null, 2));
console.log('cleanup done');
