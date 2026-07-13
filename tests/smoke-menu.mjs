// Smoke test for Phase 28 — the tap-first menu (+ force-reply input actions).
// Run from project root AFTER `npm run build`:
//   node --disable-warning=ExperimentalWarning tests/smoke-menu.mjs
const Menu = await import('../dist/Commands/Menu.js');
const NL = await import('../dist/Commands/NaturalLanguage.js');
const Users = await import('../dist/Services/Users.js');
const UD = await import('../dist/Services/UserData.js');

const U = 999999;
const config = { AdminUserId: undefined };

let failures = 0;
const check = (label, cond) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);
};

// A fake ctx that records reply / editMessageText / answerCbQuery calls.
function mkCtx(data, text) {
  const calls = { reply: [], edit: [], answered: 0 };
  const ok = () => Promise.resolve({});
  const ctx = {
    from: { id: U, first_name: 'Pat', username: undefined },
    chat: { id: U },
    message: { text: text },
    callbackQuery: data === undefined ? undefined : { data },
    telegram: { sendMessage: ok, getFileLink: ok, setMyCommands: ok },
    reply: (t, e) => { calls.reply.push({ t, e }); return ok(); },
    editMessageText: (t, e) => { calls.edit.push({ t, e }); return ok(); },
    answerCbQuery: () => { calls.answered++; return ok(); },
    sendChatAction: ok,
    replyWithDocument: ok,
    replyWithInvoice: ok,
  };
  return { ctx, calls };
}

const hasKeyboard = (extra) =>
  !!extra && !!extra.reply_markup && Array.isArray(extra.reply_markup.inline_keyboard);
const isForceReply = (extra) =>
  !!extra && extra.parse_mode === 'HTML' && !!extra.reply_markup && extra.reply_markup.force_reply === true;

UD.wipe(U);

console.log('--- structure ---');
check('triggers is a non-empty array', Array.isArray(Menu.triggers) && Menu.triggers.length > 0);
check('triggers has no duplicates', new Set(Menu.triggers).size === Menu.triggers.length);
check('triggers includes home', Menu.triggers.includes('menu:home'));
check('botCommands includes /menu', Menu.botCommands.some((c) => c.command === 'menu'));

const catTriggers = Menu.triggers.filter((t) => t.startsWith('menu:cat:'));
const askTriggers = Menu.triggers.filter((t) => t.startsWith('menu:ask:'));
const tipTriggers = Menu.triggers.filter((t) => t.startsWith('menu:tip:'));
const runTriggers = Menu.triggers.filter((t) => t.startsWith('menu:run:'));
check('has categories/asks/tips/runs', catTriggers.length > 5 && askTriggers.length > 5 && tipTriggers.length > 2 && runTriggers.length > 5);

console.log('--- /menu opens home ---');
{
  const { ctx, calls } = mkCtx(undefined);
  await Menu.handleMenu(ctx);
  check('handleMenu replies with a keyboard', calls.reply.length === 1 && hasKeyboard(calls.reply[0].e));
}

console.log('--- every category expands on tap ---');
for (const t of catTriggers) {
  const { ctx, calls } = mkCtx(t);
  await Menu.handleAction(config, ctx);
  check(`${t} edits to a keyboard`, calls.edit.length === 1 && hasKeyboard(calls.edit[0].e));
}

console.log('--- every input action force-replies & arms pending ---');
for (const t of askTriggers) {
  const token = t.slice('menu:ask:'.length);
  const { ctx, calls } = mkCtx(t);
  await Menu.handleAction(config, ctx);
  const armed = Users.find(U)?.PendingInput === token;
  const forced = calls.reply.length === 1 && isForceReply(calls.reply[0].e);
  check(`${t} → force_reply + pending=${token}`, armed && forced);
}
Users.clearPendingInput(U);

console.log('--- every info action is tap-to-copy (HTML) ---');
for (const t of tipTriggers) {
  const { ctx, calls } = mkCtx(t);
  await Menu.handleAction(config, ctx);
  const good = calls.reply.length === 1 && calls.reply[0].e && calls.reply[0].e.parse_mode === 'HTML';
  check(`${t} replies as HTML`, good);
}

console.log('--- pending round-trip: tap → type value → routed ---');
{
  // Arm "mood" via the menu, then send a plain value as the follow-up message.
  const arm = mkCtx('menu:ask:mood');
  await Menu.handleAction(config, arm.ctx);
  check('mood armed', Users.find(U)?.PendingInput === 'mood');

  const reply = mkCtx(undefined, '4 feeling good');
  await NL.handle(config, reply.ctx);
  check('pending cleared after value', Users.find(U)?.PendingInput === undefined);
  check('value produced a reply', reply.calls.reply.length >= 1);
}

console.log('--- opening the menu cancels a stale pending ---');
{
  Users.setPendingInput(U, 'food');
  const { ctx } = mkCtx(undefined);
  await Menu.handleMenu(ctx);
  check('handleMenu cleared pending', Users.find(U)?.PendingInput === undefined);
}

console.log('--- safe view actions actually run ---');
for (const token of ['reminders', 'habits', 'today', 'tasks', 'calories', 'goals', 'buddy', 'stats', 'status', 'usage', 'category']) {
  const { ctx, calls } = mkCtx('menu:run:' + token);
  await Menu.handleAction(config, ctx);
  check(`run:${token} produced a reply`, calls.reply.length >= 1);
}

console.log('--- cleanup ---');
UD.wipe(U);
check('test user wiped', Users.find(U) === undefined);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
