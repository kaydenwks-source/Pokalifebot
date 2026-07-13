// Smoke test for Phase 25 — accountability buddies.
// Run from project root AFTER `npm run build`:
//   node --disable-warning=ExperimentalWarning tests/smoke-buddy.mjs
// Drives the pairing state machine (invite / accept / errors / unpair / purge)
// with throwaway users, then wipes them.
const Users = await import('../dist/Services/Users.js');
const B = await import('../dist/Services/Buddies.js');
const UD = await import('../dist/Services/UserData.js');

// AcceptResult tags (declaration order): Paired 0, NotFound 1, SelfPair 2,
// AlreadyPaired 3, InviterPaired 4.
const A = 999999, C = 999998, D = 999997, E = 999996, F = 999995;
for (const [id, name] of [[A, 'Ana'], [C, 'Cal'], [D, 'Dee'], [E, 'Eli'], [F, 'Fin']])
  Users.upsert(id, id, name, undefined);

let failures = 0;
const check = (label, cond) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);
};

console.log('--- invite & accept ---');
check('no buddy initially', B.buddyOf(A) === undefined);
const codeA = B.createInvite(A);
check('createInvite returns a 6-char code', typeof codeA === 'string' && codeA.length === 6);
check('own code → SelfPair', B.accept(codeA, A).tag === 2);
check('bad code → NotFound', B.accept('ZZZZZZ', C).tag === 1);

const res = B.accept(codeA, C);
check('valid accept → Paired(inviter A)', res.tag === 0 && res.fields[0] === A);
check('A and C are mutually linked', B.buddyOf(A) === C && B.buddyOf(C) === A);
check('code is consumed (reuse → NotFound)', B.accept(codeA, D).tag === 1);

console.log('--- guards ---');
// A is already paired (with C); accepting anyone's code → AlreadyPaired.
const codeD = B.createInvite(D);
check('accepter already paired → AlreadyPaired', B.accept(codeD, A).tag === 3);

// Pair D with E, then D (now paired) issues a code a FREE user tries → InviterPaired.
check('D↔E pair forms', B.accept(codeD, E).tag === 0 && B.buddyOf(D) === E);
const staleFromD = B.createInvite(D); // D is already paired now
check('inviter already paired → InviterPaired (F is free)', B.accept(staleFromD, F).tag === 4);
check('F stayed unpaired', B.buddyOf(F) === undefined);

console.log('--- unpair & purge ---');
const ex = B.unpair(A);
check('unpair returns ex-buddy C', ex === C);
check('both sides cleared', B.buddyOf(A) === undefined && B.buddyOf(C) === undefined);

// purge (used by /deleteme): D↔E link removed when D is wiped.
check('D still paired with E before purge', B.buddyOf(D) === E);
B.purgeUser(D);
check('purge removed D↔E link', B.buddyOf(D) === undefined && B.buddyOf(E) === undefined);

// ── Cleanup ───────────────────────────────────────────────────────────
for (const id of [A, C, D, E, F]) UD.wipe(id); // UD.wipe also purges buddy data
console.log('cleanup: removed test users');

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
