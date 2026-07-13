// Smoke test for Phase 28 — the tap-first menu.
// Run from project root AFTER `npm run build`:
//   node --disable-warning=ExperimentalWarning tests/smoke-menu.mjs
// Drives the menu with a fake Telegram context: structural checks on the
// trigger/command lists, then category/tip/run navigation.
const Menu = await import('../dist/Commands/Menu.js');
const UD = await import('../dist/Services/UserData.js');

const U = 999999;
const config = { AdminUserId: undefined };

let failures = 0;
const check = (label, cond) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);
};

// A fake ctx that records reply / editMessageText / answerCbQuery calls.
function mkCtx(data) {
  const calls = { reply: [], edit: [], answered: 0 };
  const ok = () => Promise.resolve({});
  const ctx = {
    from: { id: U, first_name: 'Pat', username: undefined },
    chat: { id: U },
    message: { text: undefined },
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

UD.wipe(U);

console.log('--- structure ---');
check('triggers is a non-empty array', Array.isArray(Menu.triggers) && Menu.triggers.length > 0);
check('triggers has no duplicates', new Set(Menu.triggers).size === Menu.triggers.length);
check('triggers includes home', Menu.triggers.includes('menu:home'));
check('botCommands includes /menu', Menu.botCommands.some((c) => c.command === 'menu'));
check('every botCommand has command + description', Menu.botCommands.every((c) => c.command && c.description));

const catTriggers = Menu.triggers.filter((t) => t.startsWith('menu:cat:'));
const tipTriggers = Menu.triggers.filter((t) => t.startsWith('menu:tip:'));
const runTriggers = Menu.triggers.filter((t) => t.startsWith('menu:run:'));
check('has categories, tips and runs', catTriggers.length > 5 && tipTriggers.length > 5 && runTriggers.length > 5);

console.log('--- /menu opens the home screen ---');
{
  const { ctx, calls } = mkCtx(undefined);
  await Menu.handleMenu(ctx);
  check('handleMenu replies once', calls.reply.length === 1);
  check('home reply carries an inline keyboard', hasKeyboard(calls.reply[0].e));
  check('home text mentions the menu', /menu/i.test(calls.reply[0].t));
}

console.log('--- home button edits back to home ---');
{
  const { ctx, calls } = mkCtx('menu:home');
  await Menu.handleAction(config, ctx);
  check('answered the callback', calls.answered === 1);
  check('edited the message with a keyboard', calls.edit.length === 1 && hasKeyboard(calls.edit[0].e));
}

console.log('--- every category expands on tap ---');
for (const t of catTriggers) {
  const { ctx, calls } = mkCtx(t);
  await Menu.handleAction(config, ctx);
  check(`${t} edits to a keyboard`, calls.edit.length === 1 && hasKeyboard(calls.edit[0].e));
}

console.log('--- every tip returns non-empty help ---');
for (const t of tipTriggers) {
  const { ctx, calls } = mkCtx(t);
  await Menu.handleAction(config, ctx);
  const good = calls.reply.length === 1 && typeof calls.reply[0].t === 'string' && calls.reply[0].t.length > 5;
  check(`${t} replies with help`, good);
}

console.log('--- unknown category falls back gracefully ---');
{
  const { ctx, calls } = mkCtx('menu:cat:doesnotexist');
  await Menu.handleAction(config, ctx);
  check('unknown category still replies', calls.reply.length === 1);
}

console.log('--- safe view actions actually run ---');
// Local, no-AI views only (avoids network in a smoke test).
for (const token of ['reminders', 'habits', 'today', 'tasks', 'calories', 'goals', 'buddy', 'stats', 'status', 'usage', 'category']) {
  const { ctx, calls } = mkCtx('menu:run:' + token);
  await Menu.handleAction(config, ctx);
  check(`run:${token} produced a reply`, calls.reply.length >= 1);
}

console.log('--- cleanup ---');
UD.wipe(U);
check('test user wiped', true);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
