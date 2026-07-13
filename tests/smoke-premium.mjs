// Smoke test for Phase 26 — premium (entitlement + payments ledger).
// Run from project root AFTER `npm run build`:
//   node --disable-warning=ExperimentalWarning tests/smoke-premium.mjs
// Drives the pure logic (no Telegram needed): free cap → grant → bypass →
// stack → lapse → grace → refund → admin, then wipes the throwaway user.
const Users = await import('../dist/Services/Users.js');
const E = await import('../dist/Services/Entitlements.js');
const P = await import('../dist/Services/Payments.js');
const UD = await import('../dist/Services/UserData.js');

const CAP = 25; // Entitlements.FreeDailyAiCap is an inlined literal, not exported
const U = 999999;

let failures = 0;
const check = (label, cond) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);
};

// Clean slate (clears any residue in ai_usage / payments from a prior run).
UD.wipe(U);
Users.upsert(U, U, 'Pat', undefined);

console.log('--- free tier ---');
let u = Users.find(U);
check('fresh user is not premium', E.isPremium(undefined, u) === false);
check('free user may spend an AI call', E.check(undefined, u, 'coach').tag === 0);
check('remaining starts at the cap', E.remaining(undefined, u) === CAP);

// Exhaust today's free budget.
for (let i = 0; i < CAP; i++) E.commit(undefined, u, 'coach');
u = Users.find(U);
check('free user hits the wall at the cap', E.check(undefined, u, 'coach').tag === 1);
check('remaining is 0', E.remaining(undefined, u) === 0);

console.log('--- grant premium ---');
const until = P.grantPremium(u, 'CHARGE_TEST_1', P.PriceStars ?? 150, 'one_time');
check('grantPremium returns a yyyy-MM-dd expiry', typeof until === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(until));
u = Users.find(U);
check('user is now premium', E.isPremium(undefined, u) === true);
check('premium bypasses the cap', E.check(undefined, u, 'coach').tag === 0);
check('premium remaining is unlimited (None)', E.remaining(undefined, u) === undefined);
const h1 = P.historyFor(U);
check('ledger recorded the purchase', h1.length === 1 && h1[0].kind === 'one_time');

console.log('--- renewals stack ---');
const until2 = P.grantPremium(Users.find(U), 'CHARGE_TEST_2', 150, 'one_time');
check('second purchase extends the expiry further out', until2 > until);
check('ledger now has two rows', P.historyFor(U).length === 2);

console.log('--- lapse & grace ---');
Users.setPremium(U, '2000-01-01', 'CHARGE_TEST_2'); // expired long ago
check('expired premium (past grace) is not premium', E.isPremium(undefined, Users.find(U)) === false);
check('lapsed user re-hits the free cap (still 25 used today)', E.check(undefined, Users.find(U), 'coach').tag === 1);

const y = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // yesterday
Users.setPremium(U, y, 'CHARGE_TEST_2');
check('within the grace window still premium', E.isPremium(undefined, Users.find(U)) === true);

console.log('--- refund ---');
P.recordRefund(Users.find(U), 'CHARGE_TEST_2', 150);
check('refunded user is not premium', E.isPremium(undefined, Users.find(U)) === false);
check('ledger records the refund', P.historyFor(U).some((r) => r.kind === 'refund'));

console.log('--- admin comp ---');
check('admin id is always premium (no payment)', E.isPremium(U, Users.find(U)) === true);

console.log('--- cleanup ---');
UD.wipe(U);
check('wipe removes the profile', Users.find(U) === undefined);
check('wipe purges the payments ledger', P.historyFor(U).length === 0);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
