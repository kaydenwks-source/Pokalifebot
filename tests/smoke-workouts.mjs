// Manual smoke test for Phase 9 exercise tracker.
// Run from the project root AFTER `npm run build`:
//   node tests/smoke-workouts.mjs
import fs from 'node:fs';

const envMod = await import('../dist/Config/Env.js');
const cfg = envMod.load().fields[0];
const ai = await import('../dist/Ai/Workouts.js');

console.log('--- AI workout parsing (live calls) ---');
const strength = await ai.parse(cfg, 70, 'bench press 3x8 60kg');
if (strength.tag === 0) {
  const p = strength.fields[0];
  const ok = p.Kind === 'strength' && p.Sets === 3 && p.Reps === 8 && p.WeightKg === 60 && p.Calories > 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${p.Exercise} — ${p.Sets}x${p.Reps} @ ${p.WeightKg}kg, ~${p.Calories} kcal`);
} else console.log('FAIL:', strength.fields[0]);

const cardio = await ai.parse(cfg, 70, 'ran 5km in 30 minutes');
if (cardio.tag === 0) {
  const p = cardio.fields[0];
  const ok = p.Kind === 'cardio' && p.DistanceKm === 5 && p.DurationMin === 30 && p.Calories > 100;
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${p.Exercise} — ${p.DistanceKm}km in ${p.DurationMin}min, ~${p.Calories} kcal`);
} else console.log('FAIL:', cardio.fields[0]);

// Fitness-tracker case: user states measured calories — must be used as-is.
const tracker = await ai.parse(cfg, 70, '45 min spin class, my watch says 412 calories burned');
if (tracker.tag === 0) {
  const p = tracker.fields[0];
  console.log(`${p.Calories === 412 ? 'PASS' : 'FAIL'}: tracker calories honoured (${p.Calories}, want 412)`);
} else console.log('FAIL:', tracker.fields[0]);

const notWorkout = await ai.parse(cfg, 70, 'ate a sandwich and watched tv');
console.log('non-workout rejected:', notWorkout.tag === 1 ? 'PASS' : 'FAIL — accepted it!');

console.log('--- PR logic ---');
const svc = await import('../dist/Services/Workouts.js');
const FAKE = 999999;
const mk = (kg) => ({ Exercise: 'Bench press', Kind: 'strength', Sets: 3, Reps: 8, WeightKg: kg, DurationMin: null, DistanceKm: null, Calories: 150 });
const first = svc.add(FAKE, mk(60));
const before1 = svc.bestsFor(FAKE, 'bench press', first.Id);
console.log('first log has no prior best:', before1.BestKg == null ? 'PASS' : 'FAIL');
const second = svc.add(FAKE, mk(65));
const before2 = svc.bestsFor(FAKE, 'Bench Press', second.Id);
console.log('PR detected (65 > prior best 60):', before2.BestKg === 60 ? 'PASS' : 'FAIL ' + before2.BestKg);
const bests = svc.allBests(FAKE);
console.log('allBests:', bests.length === 1 && bests[0].BestKg === 65 ? 'PASS (best 65kg)' : 'FAIL');

const remaining = svc.getAll().filter((w) => w.UserId !== FAKE);
fs.writeFileSync('database/workouts.json', JSON.stringify(remaining, null, 2));
console.log('cleanup done, workouts file has', remaining.length);
