// Smoke test for the gamification opt-out (Phase 23 toggle).
// Run from project root AFTER `npm run build`:
//   node --disable-warning=ExperimentalWarning tests/smoke-gamification-toggle.mjs
// Verifies Gamification.award respects the user's GamificationEnabled flag,
// then wipes the throwaway user through Storage (SQLite).
const Users = await import('../dist/Services/Users.js');
const Game = await import('../dist/Services/Gamification.js');
const UD = await import('../dist/Services/UserData.js');

const FAKE = 999999;
let failures = 0;
const check = (label, cond) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);
};

// Fresh user, no explicit flag => gamification defaults ON.
Users.upsert(FAKE, FAKE, 'GateTest', undefined);
const base = Game.xpFor(FAKE);

Game.award(FAKE, 10);
check('default ON awards XP (+10)', Game.xpFor(FAKE) === base + 10);

Users.setGamification(FAKE, false);
const frozen = Game.xpFor(FAKE);
Game.award(FAKE, 10);
check('OFF blocks XP (unchanged)', Game.xpFor(FAKE) === frozen);

Users.setGamification(FAKE, true);
Game.award(FAKE, 10);
check('back ON awards again (+10)', Game.xpFor(FAKE) === frozen + 10);

// Cleanup: storage is SQLite since Phase 15, so wipe through UserData.
UD.wipe(FAKE);
console.log('cleanup: removed test user 999999');

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
