// Smoke test for Phase 24 — focus sessions + journaling.
// Run from project root AFTER `npm run build`:
//   node --disable-warning=ExperimentalWarning tests/smoke-focus-journal.mjs
// Exercises the pure service logic (no live timer) with a throwaway user,
// checks XP hooks + report integration, then self-cleans.
const Users = await import('../dist/Services/Users.js');
const Focus = await import('../dist/Services/Focus.js');
const Refl = await import('../dist/Services/Reflections.js');
const Game = await import('../dist/Services/Gamification.js');
const Reports = await import('../dist/Services/Reports.js');
const UD = await import('../dist/Services/UserData.js');

const FAKE = 999999;
let failures = 0;
const check = (label, cond) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);
};

const user = Users.upsert(FAKE, FAKE, 'FocusTest', undefined);

// ── Focus ─────────────────────────────────────────────────────────────
console.log('--- focus ---');
const xp0 = Game.xpFor(FAKE);
Focus.start(FAKE, 25, {}); // dummy timer handle
check('start → active session exists', Focus.activeFor(FAKE) !== undefined);

const done = Focus.complete(FAKE);
check('complete → session logged, 25 min, Completed', done && done.Minutes === 25 && done.Completed === true);
check('complete → active cleared', Focus.activeFor(FAKE) === undefined);
check('complete (>=10 min) awards Focus XP (+10)', Game.xpFor(FAKE) === xp0 + 10);

const [count, mins] = Focus.todayStats(FAKE);
check('todayStats → 1 session, 25 min', count === 1 && mins === 25);

// Stopped-early session: logged as partial, no XP.
const xp1 = Game.xpFor(FAKE);
Focus.start(FAKE, 5, {});
const stopped = Focus.stop(FAKE);
check('stop → partial session, not Completed', stopped && stopped.Completed === false);
check('stop awards no XP', Game.xpFor(FAKE) === xp1);

// ── Reflections (mood + journal) ──────────────────────────────────────
console.log('--- reflections ---');
const xp2 = Game.xpFor(FAKE);
Refl.add(FAKE, 4, undefined); // mood 4, no note
check('mood logged → recentMoods has 4', Refl.recentMoods(FAKE, 7).includes(4));
check('avgMood7 = 4.0', Refl.avgMood7(FAKE) === 4.0);
check('first reflection today awards Reflect XP (+5)', Game.xpFor(FAKE) === xp2 + 5);

const xp3 = Game.xpFor(FAKE);
Refl.add(FAKE, undefined, 'shipped the focus feature'); // journal note
check('journal entry stored (text present)', Refl.forUser(FAKE).some((r) => r.Text === 'shipped the focus feature'));
check('second reflection same day = no extra XP', Game.xpFor(FAKE) === xp3);

// ── Report integration ────────────────────────────────────────────────
console.log('--- report integration ---');
const weekly = Reports.weeklyData(user);
check('weeklyData mentions Focus', /Focus: 1 sessions/.test(weekly));
check('weeklyData mentions Mood', /Mood: 1 check-ins, average 4\.0/.test(weekly));
check('weeklyData mentions Journal', /Journal: 1 entries/.test(weekly));

// ── Cleanup ───────────────────────────────────────────────────────────
// Storage is SQLite since Phase 15 — wipe through UserData, not the .json backups.
UD.wipe(FAKE);
console.log('cleanup: removed test user 999999');

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
