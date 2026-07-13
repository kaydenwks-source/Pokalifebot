// Smoke test for the admin premium controls (Phase 26 add-on).
// Run from project root AFTER `npm run build`:
//   node --disable-warning=ExperimentalWarning tests/smoke-admin-premium.mjs
// Covers the pure logic behind /admin grant and /admin revoke.
const Users = await import('../dist/Services/Users.js');
const E = await import('../dist/Services/Entitlements.js');
const P = await import('../dist/Services/Payments.js');
const UD = await import('../dist/Services/UserData.js');

const ADMIN = 111111;
const U = 999999;

let failures = 0;
const check = (label, cond) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);
};

UD.wipe(U);
Users.upsert(U, U, 'Pat', undefined);

console.log('--- admin grant (comp) ---');
check('fresh user is not premium', E.isPremium(undefined, Users.find(U)) === false);

const until = P.grantComp(Users.find(U), ADMIN, 7);
const expected = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
check('grantComp returns +7 days from today', until === expected);
check('comped user is now premium', E.isPremium(undefined, Users.find(U)) === true);

const h = P.historyFor(U);
check('ledger records a free comp (stars=0, kind=comp)', h.length === 1 && h[0].kind === 'comp' && h[0].stars === 0);

console.log('--- stacking a second comp ---');
const until2 = P.grantComp(Users.find(U), ADMIN, 30);
check('second comp stacks on top (extends further)', until2 > until);
check('ledger now has two comp rows', P.historyFor(U).length === 2);

console.log('--- admin revoke ---');
P.revokeComp(Users.find(U), ADMIN);
check('revoked user is back to free', E.isPremium(undefined, Users.find(U)) === false);
check('ledger records the revoke', P.historyFor(U).some((r) => r.kind === 'revoke'));

console.log('--- cleanup ---');
UD.wipe(U);
check('wipe removes the profile', Users.find(U) === undefined);
check('wipe purges the ledger', P.historyFor(U).length === 0);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
