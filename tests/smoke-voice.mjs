// Smoke test for Phase 27 — voice transcription.
// Run from project root AFTER `npm run build`:
//   node --disable-warning=ExperimentalWarning tests/smoke-voice.mjs
// Serves a locally-generated spoken WAV over localhost and drives the REAL
// Transcribe.transcribe (download → Groq Whisper → text), then routes the
// transcription intent to confirm the voice→NL bridge lands correctly.
import fs from 'node:fs';
import http from 'node:http';

const Env = await import('../dist/Config/Env.js');
const Tz = await import('../dist/Ai/Transcribe.js');
const Router = await import('../dist/Ai/Router.js');

const WAV = 'C:/Users/kayde/AppData/Local/Temp/claude/C--Users-kayde--claude/a295d33e-979b-4a63-b3d3-e4cdfcd7a07b/scratchpad/voice.wav';

let failures = 0;
const check = (label, cond) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);
};

const cfg = Env.load().fields[0];
check('transcription enabled (VISION_API_KEY set)', Tz.enabled(cfg) === true);

if (!fs.existsSync(WAV)) {
  console.log('FAIL missing fixture WAV — generate it first'); process.exit(1);
}
const bytes = fs.readFileSync(WAV);

// Serve the audio so the module's URL-download path is exercised for real.
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': bytes.length });
  res.end(bytes);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/voice`;

console.log('--- transcribe (spoken: "ate chicken rice and did gym") ---');
const res = await Tz.transcribe(cfg, url);
if (res.tag === 0) {
  const text = res.fields[0];
  console.log(`  heard: "${text}"`);
  // Note: synthetic TTS makes homophones ("gym"→"Jim", "ate"→"8"), so assert
  // on the cleanly-transcribed words — the pipeline itself is what's under test.
  const low = text.toLowerCase();
  check('transcription mentions chicken', low.includes('chicken'));
  check('transcription mentions rice', low.includes('rice'));

  // The transcription should route to a tracker intent (food or workout).
  const routed = await Router.classify(cfg, text);
  const tag = routed.tag === 0 ? routed.fields[0]?.tag : 'ERR';
  console.log(`  router intent tag: ${tag} (Food/Workout expected)`);
  check('router classified the transcription (not error)', routed.tag === 0);
} else {
  console.log('  transcribe error:', res.fields[0]);
  failures++;
}

server.close();
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
