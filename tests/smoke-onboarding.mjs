// Smoke test for Phase 21 — guided onboarding.
// Run from project root AFTER `npm run build`:
//   node --disable-warning=ExperimentalWarning tests/smoke-onboarding.mjs
// Drives the wizard state machine with a fake Telegram context: the happy
// path (type each answer) and the skip path (tap Skip on every step).
const Users = await import('../dist/Services/Users.js');
const Habits = await import('../dist/Services/Habits.js');
const Onb = await import('../dist/Commands/Onboarding.js');
const Env = await import('../dist/Config/Env.js');
const UD = await import('../dist/Services/UserData.js'); // storage-level wipe (SQLite, not .json)

const cfg = Env.load().fields[0]; // handleText needs config (AI timezone fallback)

let failures = 0;
const check = (label, cond) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);
};

const mkCtx = (id) => ({
  from: { id, first_name: 'Wiz', username: undefined },
  chat: { id },
  message: undefined,
  reply: () => Promise.resolve({}),
  editMessageText: () => Promise.resolve({}),
  answerCbQuery: () => Promise.resolve({}),
  sendChatAction: () => Promise.resolve({}),
});

const FAKE = 999999; // typed-answers path
const FAKE2 = 999998; // skip path

// ── Happy path: type each answer ──────────────────────────────────────
console.log('--- typed answers ---');
let u = Users.upsert(FAKE, FAKE, 'Wiz', undefined);
const ctx = mkCtx(FAKE);
check('fresh user needs onboarding', Onb.needsOnboarding(u) === true);

await Onb.launch(u, ctx);
check('launch → step 1 pending', Users.find(FAKE).OnboardingStep === 1);

await Onb.handleText(cfg, Users.find(FAKE), '+8', ctx);
u = Users.find(FAKE);
check('step 1 → timezone set to +8 (480 min)', u.TzOffsetMinutes === 480);
check('advanced to step 2', u.OnboardingStep === 2);

await Onb.handleText(cfg, Users.find(FAKE), 'gym', ctx);
u = Users.find(FAKE);
check('step 2 → habit "gym" tracked', Habits.forUser(FAKE).some((h) => h.Name === 'gym'));
check('advanced to step 3', u.OnboardingStep === 3);

await Onb.handleText(cfg, Users.find(FAKE), '07:00', ctx);
u = Users.find(FAKE);
check('step 3 → daily quote at 07:00', u.QuoteTime === '07:00');
check('onboarding marked done', u.OnboardingDone === true);
check('step cleared', u.OnboardingStep == null);
check('completed user no longer needs onboarding', Onb.needsOnboarding(u) === false);

// An unresolvable place should NOT advance the step (AI returns error).
console.log('--- validation ---');
let v = Users.upsert(1234567, 1234567, 'Val', undefined);
await Onb.launch(v, mkCtx(1234567));
await Onb.handleText(cfg, Users.find(1234567), 'qwzxlkj not a place 999', mkCtx(1234567));
check('unresolvable place keeps step 1', Users.find(1234567).OnboardingStep === 1);

// ── Skip path: tap Skip on every step ─────────────────────────────────
console.log('--- skip path ---');
const u2 = Users.upsert(FAKE2, FAKE2, 'Skip', undefined);
const ctx2 = mkCtx(FAKE2);
await Onb.launch(u2, ctx2);
await Onb.handleSkip(1, ctx2);
check('skip 1 → step 2', Users.find(FAKE2).OnboardingStep === 2);
await Onb.handleSkip(2, ctx2);
check('skip 2 → step 3', Users.find(FAKE2).OnboardingStep === 3);
await Onb.handleSkip(3, ctx2);
const s = Users.find(FAKE2);
check('skip 3 → done', s.OnboardingDone === true && s.OnboardingStep == null);
check('skipping set no timezone', s.TzOffsetMinutes == null);

// ── Cleanup ───────────────────────────────────────────────────────────
// Storage is SQLite (momentum.db) since Phase 15 — wipe through UserData so
// the DB is cleared, not just the frozen .json backups.
for (const id of [FAKE, FAKE2, 1234567]) UD.wipe(id);
console.log('cleanup: removed test users');

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
