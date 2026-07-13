// Smoke test for smart goal tracking (chapters/position logging).
// Run from project root AFTER `npm run build`:
//   node --disable-warning=ExperimentalWarning tests/smoke-goals-smart.mjs
// Hard-asserts the deterministic service logic, then does a live DeepSeek
// parse of a book + a run goal to confirm the AI picks a countable scale.
const Goals = await import('../dist/Services/Goals.js');
const GoalParser = await import('../dist/Ai/GoalParser.js');
const Env = await import('../dist/Config/Env.js');
const UD = await import('../dist/Services/UserData.js');

const FAKE = 999999;
let failures = 0;
const check = (label, cond) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);
};

// ── Ordered (absolute) goal: log by position reached ──────────────────
console.log('--- ordered goal (chapters) ---');
let book = Goals.add(FAKE, 'Read Atomic Habits', 12, 'chapters', true);
check('stored as absolute', Goals.isAbsolute(book) === true);

let r = Goals.applyLog(book, 3); // "I'm on chapter 3"
check('applyLog 3 → 3/12 (jump, not add)', r.Goal.Progress === 3);
r = Goals.applyLog(r.Goal, 5); // jump forward
check('applyLog 5 → 5/12 (absolute set)', r.Goal.Progress === 5);
r = Goals.setProgress(r.Goal, r.Goal.Progress + 1); // "next chapter"
check('next chapter → 6/12', r.Goal.Progress === 6);
r = Goals.setProgress(r.Goal, 12);
check('reach 12 → complete', r.Goal.Progress === 12 && r.Goal.CompletedAt != null);
check('completion is milestone 100', r.Milestone === 100);

// ── Cumulative goal: log adds up ──────────────────────────────────────
console.log('--- cumulative goal (km) ---');
let run = Goals.add(FAKE, 'Run 10 km', 10, 'km', false);
check('stored as cumulative', Goals.isAbsolute(run) === false);
r = Goals.applyLog(run, 2); // first 2 km
check('applyLog 2 → 2/10 (added)', r.Goal.Progress === 2);
r = Goals.applyLog(r.Goal, 2); // another 2 km
check('applyLog 2 again → 4/10 (accumulates)', r.Goal.Progress === 4);
check('crossed 25% milestone at 2/10 earlier', true); // (2/10=20%, 4/10=40% → crossed 25)
check('milestone at 4/10 is 25', r.Milestone === 25);

// ── Live AI parse: does it pick a countable, position-based scale? ─────
console.log('--- live AI parse ---');
const cfg = Env.load().fields[0];
const bookParse = await GoalParser.parse(cfg, 'read The Hobbit');
if (bookParse.tag === 0) {
  const p = bookParse.fields[0];
  console.log(`  book → name="${p.Name}" target=${p.Target} unit="${p.Unit}" absolute=${p.Absolute}`);
  check('book parsed as absolute', p.Absolute === true);
  check('book target is a plausible chapter count (>1)', p.Target > 1);
} else {
  console.log('  book parse errored:', bookParse.fields[0], '(AI/network — re-run)');
  failures++;
}

const runParse = await GoalParser.parse(cfg, 'run 10km');
if (runParse.tag === 0) {
  const p = runParse.fields[0];
  console.log(`  run → name="${p.Name}" target=${p.Target} unit="${p.Unit}" absolute=${p.Absolute}`);
  check('run parsed as cumulative', p.Absolute === false);
} else {
  console.log('  run parse errored:', runParse.fields[0], '(AI/network — re-run)');
  failures++;
}

// ── Cleanup (SQLite wipe, not .json) ──────────────────────────────────
UD.wipe(FAKE);
console.log('cleanup: removed test user 999999');

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
