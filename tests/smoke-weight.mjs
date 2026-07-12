// Manual smoke test for Phase 8 weight tracker.
// Run from the project root AFTER `npm run build`:
//   node tests/smoke-weight.mjs
import fs from 'node:fs';

const svc = await import('../dist/Services/WeightLogs.js');
const FAKE = 999999;
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => fmt(new Date(Date.now() - n * 86400000));

console.log('--- upsert merge (weight + bodyfat land on one row) ---');
// NOTE: Fable union constructors take (tag, fieldsARRAY).
svc.upsertToday(FAKE, new svc.Field(0, [70.0]));       // Weight
const merged = svc.upsertToday(FAKE, new svc.Field(1, [20.0])); // Fat
console.log('merged row:', merged.Kg === 70 && merged.BodyFat === 20 ? 'PASS' : 'FAIL ' + JSON.stringify(merged));
console.log('single row for today:', svc.forUser(FAKE).length === 1 ? 'PASS' : 'FAIL');

console.log('--- trend deltas (backdated history) ---');
const others = svc.getAll().filter((l) => l.UserId !== FAKE);
const history = [
  { UserId: FAKE, Date: daysAgo(0), Kg: 70.0, BodyFat: 20.0, MuscleKg: null },
  { UserId: FAKE, Date: daysAgo(8), Kg: 72.0, BodyFat: null, MuscleKg: null },
  { UserId: FAKE, Date: daysAgo(31), Kg: 75.0, BodyFat: null, MuscleKg: null },
];
fs.writeFileSync('database/weights.json', JSON.stringify([...others, ...history], null, 2));

const d7 = svc.weightDelta(FAKE, 7);
const d30 = svc.weightDelta(FAKE, 30);
console.log('7-day delta:', d7 && d7[0] === 70 && d7[1] === -2 ? 'PASS (-2.0 kg)' : 'FAIL ' + JSON.stringify(d7));
console.log('30-day delta:', d30 && d30[0] === 70 && d30[1] === -5 ? 'PASS (-5.0 kg)' : 'FAIL ' + JSON.stringify(d30));

console.log('--- BMI ---');
const bmi = svc.bmi(175, 70);
console.log('bmi(175cm, 70kg):', Math.abs(bmi - 22.86) < 0.01 ? 'PASS (22.9)' : 'FAIL ' + bmi);

console.log('--- AI progress analysis (one live call) ---');
const envMod = await import('../dist/Config/Env.js');
const cfg = envMod.load().fields[0];
const progress = await import('../dist/Ai/Progress.js');
const res = await progress.analyse(cfg, svc.forUser(FAKE), 175, 1900);
console.log(res.tag === 0 ? 'PASS:\n' + res.fields[0] : 'FAIL: ' + res.fields[0]);

// Clean up the fake user.
const remaining = svc.getAll().filter((l) => l.UserId !== FAKE);
fs.writeFileSync('database/weights.json', JSON.stringify(remaining, null, 2));
console.log('cleanup done, weights file has', remaining.length);
