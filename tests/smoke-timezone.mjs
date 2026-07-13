// Smoke test for natural-language timezone in onboarding.
// Run from project root AFTER `npm run build`:
//   node --disable-warning=ExperimentalWarning tests/smoke-timezone.mjs
// Live DeepSeek resolves a few places to offsets, then drives onboarding
// step 1 with a country name and with a raw offset (fast path).
const Env = await import('../dist/Config/Env.js');
const Tz = await import('../dist/Ai/Timezone.js');
const Users = await import('../dist/Services/Users.js');
const Onb = await import('../dist/Commands/Onboarding.js');
const UD = await import('../dist/Services/UserData.js');

let failures = 0;
const check = (label, cond) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);
};

const cfg = Env.load().fields[0];
const mkCtx = (id) => ({
  from: { id, first_name: 'Tz', username: undefined },
  chat: { id },
  message: undefined,
  reply: () => Promise.resolve({}),
  editMessageText: () => Promise.resolve({}),
  answerCbQuery: () => Promise.resolve({}),
  sendChatAction: () => Promise.resolve({}),
});

// ── Live resolver ─────────────────────────────────────────────────────
console.log('--- live place → offset ---');
const cases = [
  ['Singapore', 480],
  ['United Kingdom', 0],
  ['New York', -300],
  ['Japan', 540],
];
for (const [place, want] of cases) {
  const res = await Tz.resolveOffset(cfg, place);
  const got = res.tag === 0 ? res.fields[0] : `ERR(${res.fields[0]})`;
  check(`${place} → ${want} (got ${got})`, res.tag === 0 && res.fields[0] === want);
}

// ── Onboarding step 1 with a country name ─────────────────────────────
console.log('--- onboarding via country ---');
const FAKE = 999999;
let u = Users.upsert(FAKE, FAKE, 'Tz', undefined);
await Onb.launch(u, mkCtx(FAKE));
await Onb.handleText(cfg, Users.find(FAKE), 'Singapore', mkCtx(FAKE));
u = Users.find(FAKE);
check('country "Singapore" set tz to +8 (480)', u.TzOffsetMinutes === 480);
check('advanced to step 2', u.OnboardingStep === 2);

// ── Raw-offset fast path still works ──────────────────────────────────
console.log('--- raw offset fast path ---');
const FAKE2 = 999998;
let u2 = Users.upsert(FAKE2, FAKE2, 'Off', undefined);
await Onb.launch(u2, mkCtx(FAKE2));
await Onb.handleText(cfg, Users.find(FAKE2), '+5:30', mkCtx(FAKE2));
u2 = Users.find(FAKE2);
check('raw "+5:30" set tz to 330', u2.TzOffsetMinutes === 330);
check('advanced to step 2', u2.OnboardingStep === 2);

// ── Cleanup ───────────────────────────────────────────────────────────
for (const id of [FAKE, FAKE2]) UD.wipe(id);
console.log('cleanup: removed test users');

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
