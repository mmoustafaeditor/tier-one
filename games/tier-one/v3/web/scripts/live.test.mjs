// DD Live (4.0) and presence (api/tier-one/v3 › live.*) against the in-memory Redis. `node --test scripts/live.test.mjs`.
// T1_DD_PREVIEW lets the tests pick a deadline day off the calendar; production ignores it.
import path from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { fakeRedis } from './fake-redis.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
process.chdir(ROOT);
const R = fakeRedis();
process.env.KV_REST_API_URL = 'http://fake'; process.env.KV_REST_API_TOKEN = 't'; process.env.T1_DD_PREVIEW = '1';
globalThis.fetch = async (url, init) => ({ ok: true, json: async () => R.pipeline(JSON.parse(init.body)) });
const mod = await import(path.join(ROOT, 'api/tier-one/v3/index.js'));
const handler = mod.default;
let ip = 1;
async function call(body) {
  let status = 0, out = null;
  const res = { setHeader() {}, status(c) { status = c; return res; }, json(o) { out = o; return res; }, end() { return res; } };
  await handler({ method: 'POST', body: JSON.stringify(body), headers: { 'x-forwarded-for': '10.1.0.' + (ip++ % 200) } }, res);
  return { status, ...out };
}
const DAY = '2027-02-02', dev = 'devLiveTest1', dev2 = 'devLiveTest2';

test('the calendar: the two deadline days match the client list', () => {
  assert.deepEqual(Object.keys(mod.DD_DAYS).sort(), ['2027-02-02', '2027-09-01']);
  assert.equal(mod.DD_DAYS['2027-02-02'], '2027-01');
  assert.equal(mod.DD_DAYS['2027-09-01'], '2027-summer');
  assert.equal(mod.DD_SPEC.mode, 'deadline', 'DD Live plays engine4 rulesFor("deadline")');
});

// A finished 90-second stream: one DM per story, then a Hint on what came back (or SIGNS), then the day ends.
async function finishedLog(seed) {
  const E4 = await import(path.join(ROOT, 'api/tier-one/v3/_lib/engine4.mjs'));
  const R = E4.rulesFor('deadline'), g = E4.newGame(E4.buildBoard(seed, R), R);
  for (let i = 0; i < R.STORIES; i++) { const c = E4.ask(g, i, 'physio'); E4.call(g, i, c && c.r < 3 ? c.r : 0, 0); }
  E4.endDay(g);
  return { log: g.log, total: E4.resolve(g).total };
}

test('DD Live: one seed for everyone, one ranked run each, replayed under deadline rules', async () => {
  const a = await call({ action: 'live.dd.board', dev, day: DAY });
  assert.equal(a.ok, true); assert.equal(a.clockS, 90); assert.equal(a.stories, 6); assert.equal(a.started, null);
  const s1 = await call({ action: 'live.dd.start', dev, nick: 'Tester', day: DAY });
  const s2 = await call({ action: 'live.dd.start', dev: dev2, nick: 'Other', day: DAY });
  assert.equal(s1.seed, s2.seed, 'the same board for every player');
  const again = await call({ action: 'live.dd.start', dev, day: DAY });
  assert.equal(again.at, s1.at, 'a second start resumes the first');
  const { log, total } = await finishedLog(s1.seed);
  assert.equal((await call({ action: 'live.dd.submit', dev, day: DAY, log: log.slice(0, -1) })).error, 'log', 'an unfinished window is refused');
  const r = await call({ action: 'live.dd.submit', dev, nick: 'Tester', day: DAY, log });
  assert.equal(r.ok, true); assert.equal(r.run.score, total); assert.equal(r.me.rank, 1);
  assert.equal((await call({ action: 'live.dd.submit', dev, day: DAY, log })).error, 'done', 'one ranked run a day');
  assert.equal((await call({ action: 'live.dd.submit', dev: 'devNeverStarted', day: DAY, log })).error, 'start');
  const res = await call({ action: 'live.dd.results', dev, day: DAY });
  assert.equal(res.players, 1); assert.equal(res.rows[0].me, true); assert.equal(res.me.score, total);
  const b = await call({ action: 'live.dd.board', dev, day: DAY });
  assert.equal(b.mine.score, total); assert.equal(b.started.seed, s1.seed);
});

test('presence: a rolling count of reporters on today’s board, no names', async () => {
  let r = await call({ action: 'live.presence', dev });
  assert.equal(r.ok, true); assert.equal(r.now, 1);
  r = await call({ action: 'live.presence', dev: dev2 }); assert.equal(r.now, 2);
  r = await call({ action: 'live.presence', dev }); assert.equal(r.now, 2, 'the same device counts once');
  r = await call({ action: 'live.presence' }); assert.equal(r.now, 2, 'reading without a device adds nobody');
});

test('off the calendar with no preview the board is not live', async () => {
  delete process.env.T1_DD_PREVIEW;
  const r = await call({ action: 'live.dd.board', dev, day: DAY });
  const todayIsDD = ['2027-02-02', '2027-09-01'].includes(new Date().toISOString().slice(0, 10));
  if (!todayIsDD) { assert.equal(r.ok, false); assert.equal(r.error, 'not live'); assert.ok(r.next === null || /^\d{4}-\d{2}-\d{2}$/.test(r.next)); }
  const c = await call({ action: 'live.dd.start', dev, day: DAY });
  if (!todayIsDD) assert.equal(c.error, 'not live');
  process.env.T1_DD_PREVIEW = '1';
});
