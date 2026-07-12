// Manual smoke test for Phase 7 calorie tracker.
// Run from the project root AFTER `npm run build`:
//   node tests/smoke-food.mjs
import fs from 'node:fs';

const envMod = await import('../dist/Config/Env.js');
const cfg = envMod.load().fields[0];
const analyzer = await import('../dist/Ai/FoodAnalyzer.js');

console.log('--- AI nutrition analysis (live calls) ---');
const meal = await analyzer.analyse(cfg, 'chicken rice with extra egg, large portion');
if (meal.tag === 0) {
  const n = meal.fields[0];
  const plausible = n.Calories >= 400 && n.Calories <= 1500 && n.Protein > 10;
  console.log(
    `${plausible ? 'PASS' : 'SUSPICIOUS'}: ${n.Name} — ${n.Calories} kcal, ` +
    `P${n.Protein} C${n.Carbs} F${n.Fat} S${n.Sugar} Fb${n.Fiber}`
  );
} else {
  console.log('FAIL:', meal.fields[0]);
}

const notFood = await analyzer.analyse(cfg, 'my chemistry homework and a stapler');
console.log('non-food rejected:', notFood.tag === 1 ? 'PASS (' + notFood.fields[0] + ')' : 'FAIL — accepted it!');

console.log('--- meal service totals ---');
const svc = await import('../dist/Services/Meals.js');
const FAKE = 999999;
const n1 = { Name: 'test meal A', Calories: 500, Protein: 30, Carbs: 60, Fat: 15, Sugar: 5, Fiber: 4 };
const n2 = { Name: 'test meal B', Calories: 300, Protein: 20, Carbs: 30, Fat: 10, Sugar: 8, Fiber: 2 };
svc.add(FAKE, n1);
svc.add(FAKE, n2);

const today = new Date().toISOString().slice(0, 10);
const t = svc.totalsOn(FAKE, today);
console.log('totals:', t.Calories === 800 && t.Meals === 2 && t.Protein === 50 ? 'PASS (800 kcal, 2 meals, 50g protein)' : 'FAIL ' + JSON.stringify(t));

const week = svc.recentDailyTotals(FAKE, 7);
console.log('weekly grouping:', week.length === 1 && week[0].Calories === 800 ? 'PASS' : 'FAIL');

const undone = svc.deleteLastToday(FAKE);
console.log('undo last:', undone && undone.Name === 'test meal B' ? 'PASS' : 'FAIL');
console.log('totals after undo:', svc.totalsOn(FAKE, today).Calories === 500 ? 'PASS (500)' : 'FAIL');

// Clean up the fake user.
const remaining = svc.getAll().filter((m) => m.UserId !== FAKE);
fs.writeFileSync('database/meals.json', JSON.stringify(remaining, null, 2));
console.log('cleanup done, meals file has', remaining.length);
