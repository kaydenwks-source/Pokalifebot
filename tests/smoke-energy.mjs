// Manual smoke test for Phase 9.5: energy engine + busy blocks.
// Run from the project root AFTER `npm run build`:
//   node tests/smoke-energy.mjs
import fs from 'node:fs';

const energy = await import('../dist/Services/Energy.js');
const FAKE = 999999;
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

console.log('--- target math ---');
const gentle = energy.computeTarget(72.5, 68, 10);
const ok1 =
  Math.abs(gentle.MaintenanceKcal - 2247.5) < 1 &&
  Math.abs(gentle.DailyTargetKcal - 1752.5) < 1 &&
  Math.abs(gentle.WeeklyChangeKg - -0.45) < 0.01 &&
  !gentle.Aggressive && !gentle.Floored;
console.log('gentle cut (72.5->68 in 10w):', ok1 ? `PASS (~${Math.round(gentle.DailyTargetKcal)} kcal/day)` : 'FAIL ' + JSON.stringify(gentle));

const crash = energy.computeTarget(70, 60, 4);
console.log('crash diet flagged:', crash.Aggressive && crash.Floored && crash.DailyTargetKcal === 1200 ? 'PASS (aggressive + floored at 1200)' : 'FAIL ' + JSON.stringify(crash));

const bulk = energy.computeTarget(60, 65, 12);
console.log('bulk surplus:', bulk.DailyTargetKcal > bulk.MaintenanceKcal && !bulk.Aggressive ? `PASS (+${Math.round(bulk.DailyTargetKcal - bulk.MaintenanceKcal)} kcal/day surplus)` : 'FAIL');

console.log('--- net day summary ---');
// Seed: 2000 kcal eaten, 500 burned, target 1800.
const meals = JSON.parse(fs.existsSync('database/meals.json') ? fs.readFileSync('database/meals.json', 'utf8') : '[]');
meals.push({ Id: 'test1', UserId: FAKE, Date: today, Time: '12:00', Name: 'test lunch', Calories: 2000, Protein: 50, Carbs: 200, Fat: 60, Sugar: 20, Fiber: 10 });
fs.writeFileSync('database/meals.json', JSON.stringify(meals, null, 2));
const workouts = JSON.parse(fs.existsSync('database/workouts.json') ? fs.readFileSync('database/workouts.json', 'utf8') : '[]');
workouts.push({ Id: 'test2', UserId: FAKE, Date: today, Time: '18:00', Exercise: 'Run', Kind: 'cardio', Sets: null, Reps: null, WeightKg: null, DurationMin: 30, DistanceKm: 5, CaloriesBurned: 500 });
fs.writeFileSync('database/workouts.json', JSON.stringify(workouts, null, 2));

const fakeUser = { Id: FAKE, ChatId: FAKE, FirstName: 'T', Username: null, QuoteCategory: 'Discipline', QuoteTime: null, NudgesEnabled: null, HeightCm: 175, TargetWeightKg: 68, TargetDate: '2026-09-20', DailyKcalTarget: 1800 };
const s = energy.summary(fakeUser, today);
const ok2 = s.Eaten === 2000 && s.Burned === 500 && s.Net === 1500 && s.Remaining === 300 && s.PercentOfTarget === 83;
console.log('summary math:', ok2 ? 'PASS (net 1500/1800, 83%, 300 left)' : 'FAIL ' + JSON.stringify(s));
console.log('describe:', energy.describe(s));

const noTarget = energy.summary({ ...fakeUser, DailyKcalTarget: null }, today);
console.log('no-target mode:', noTarget.Target == null && noTarget.Net === 1500 ? 'PASS' : 'FAIL');

console.log('--- busy blocks ---');
const commits = await import('../dist/Services/Commitments.js');
const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const todayName = days[now.getDay()];
const otherDay = days[(now.getDay() + 3) % 7];
commits.add(FAKE, 'daily standup', 'daily', '09:00', '09:15');
commits.add(FAKE, 'church service', todayName, '10:00', '12:00');
commits.add(FAKE, 'other-day thing', otherDay, '15:00', null);
const todayBlocks = commits.forToday(FAKE);
console.log('forToday picks daily + today only:', todayBlocks.length === 2 ? 'PASS' : 'FAIL (' + todayBlocks.length + ')');
const del = commits.deleteByIndex(FAKE, 1);
console.log('delete #1 (daily first in sort):', del && del.Day === 'daily' ? 'PASS' : 'FAIL');

// Cleanup all fake data.
fs.writeFileSync('database/meals.json', JSON.stringify(JSON.parse(fs.readFileSync('database/meals.json','utf8')).filter(m => m.UserId !== FAKE), null, 2));
fs.writeFileSync('database/workouts.json', JSON.stringify(JSON.parse(fs.readFileSync('database/workouts.json','utf8')).filter(w => w.UserId !== FAKE), null, 2));
fs.writeFileSync('database/busy.json', JSON.stringify(commits.getAll().filter(c => c.UserId !== FAKE), null, 2));
console.log('cleanup done');
