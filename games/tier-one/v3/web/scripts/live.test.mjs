// Deadline Day Live and presence (api/tier-one/v3 › live.*) against the in-memory Redis. `node --test scripts/live.test.mjs`.
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
});

test('board: five real sagas, seeded per day, stable, no names of callers', async () => {
  const a = await call({ action: 'live.dd.board', dev, day: DAY });
  assert.equal(a.ok, true); assert.equal(a.day, DAY); assert.equal(a.window, '2027-01');
  assert.equal(a.sagas.length, 5);
  for (const s of a.sagas) { assert.ok(s.rid && s.player && s.to && s.to.name, 'saga shape'); assert.ok(s.market > 0 && s.market < 1); }
  assert.deepEqual(a.mine, {}); assert.equal(a.players, 0);
  const b = await call({ action: 'live.dd.board', dev: dev2, day: DAY });
  assert.deepEqual(b.sagas.map((s) => s.rid), a.sagas.map((s) => s.rid), 'same board for everyone');
  const other = await call({ action: 'live.dd.board', dev, day: '2027-09-01' });
  assert.equal(other.ok, true); assert.equal(other.window, '2027-summer');
  assert.ok(!JSON.stringify(a).includes('devLiveTest'), 'no device ids on the board');
  const off = await call({ action: 'live.dd.board', dev, day: '2027-03-03' });
  // Off the calendar the board falls back to today, which is not a deadline day in this test run.
  assert.ok(off.ok === false || off.day === DAY || off.day === '2027-09-01');
});

test('calls: one per saga, one U-turn, the tally counts outcomes and players only', async () => {
  const board = await call({ action: 'live.dd.board', dev, day: DAY });
  const [s0, s1] = board.sagas;
  let r = await call({ action: 'live.dd.call', dev, nick: 'Tester', day: DAY, rid: s0.rid, o: 0, s: 3 });
  assert.equal(r.ok, true); assert.equal(r.call.o, 0); assert.equal(r.call.s, 3); assert.equal(r.call.ut, undefined);
  assert.deepEqual(r.counts[s0.rid], [1, 0, 0]); assert.equal(r.players, 1);
  r = await call({ action: 'live.dd.call', dev, day: DAY, rid: s0.rid, o: 0, s: 3 });
  assert.equal(r.ok, true); assert.equal(r.call.ut, undefined, 'the same call again is a no-op');
  r = await call({ action: 'live.dd.call', dev, day: DAY, rid: s0.rid, o: 2, s: 1 });
  assert.equal(r.ok, true); assert.equal(r.call.ut, true); assert.deepEqual(r.call.from, { o: 0, s: 3 });
  assert.deepEqual(r.counts[s0.rid], [0, 0, 1], 'the tally moves with the U-turn');
  r = await call({ action: 'live.dd.call', dev, day: DAY, rid: s0.rid, o: 1, s: 2 });
  assert.equal(r.error, 'locked', 'one U-turn only');
  assert.equal((await call({ action: 'live.dd.call', dev, day: DAY, rid: 'nope', o: 1, s: 2 })).error, 'saga');
  assert.equal((await call({ action: 'live.dd.call', day: DAY, rid: s0.rid, o: 1, s: 2 })).error, 'dev');
  r = await call({ action: 'live.dd.call', dev: dev2, nick: 'Other', day: DAY, rid: s0.rid, o: 2, s: 2 });
  assert.deepEqual(r.counts[s0.rid], [0, 0, 2]); assert.equal(r.players, 2);
  await call({ action: 'live.dd.call', dev: dev2, day: DAY, rid: s1.rid, o: 0, s: 1 });
  const t = await call({ action: 'live.dd.tally', day: DAY });
  assert.equal(t.ok, true); assert.deepEqual(t.counts[s0.rid], [0, 0, 2]); assert.deepEqual(t.counts[s1.rid], [1, 0, 0]); assert.equal(t.players, 2);
  assert.ok(!JSON.stringify(t).includes('Tester') && !JSON.stringify(t).includes('devLive'), 'the tally has no names');
  const mine = await call({ action: 'live.dd.board', dev, day: DAY });
  assert.equal(mine.mine[s0.rid].o, 2); assert.equal(mine.mine[s0.rid].ut, true);
});

test('results: pending sagas score nobody yet; the table ranks settled points; my row is mine', async () => {
  const r = await call({ action: 'live.dd.results', dev, day: DAY });
  assert.equal(r.ok, true); assert.equal(r.day, DAY); assert.equal(r.sagas.length, 5);
  // The snapshot is from before the window: every saga is still pending, so nothing is final and the table is level.
  assert.equal(r.final, false); assert.equal(r.settled, 0);
  assert.ok(r.sagas.every((s) => s.pending && s.out == null));
  assert.equal(r.players, 2);
  assert.ok(r.rows.every((x) => x.pts === 0));
  assert.ok(r.me && r.me.rank >= 1 && r.me.pts === 0 && r.me.calls[r.sagas[0].rid]);
  assert.ok(r.rows.some((x) => x.me));
  assert.ok(!JSON.stringify(r.rows).includes('devLive'), 'rows carry nicks, not device ids');
});

test('points: right pays by loudness with the early-bird bonus, wrong costs less than right pays', () => {
  const opensAt = Date.parse(DAY + 'T00:00:00Z');
  const early = { o: 0, s: 3, at: opensAt + 3600e3 }, late = { o: 0, s: 3, at: opensAt + 20 * 3600e3 };
  assert.equal(mod.ddPoints(early, { o: 0 }, opensAt).pts, 50);
  assert.equal(mod.ddPoints(late, { o: 0 }, opensAt).pts, 40);
  assert.equal(mod.ddPoints(late, { o: 2 }, opensAt).pts, -30);
  assert.equal(mod.ddPoints({ o: 1, s: 1, at: opensAt }, { o: 1 }, opensAt).pts, 13);
  assert.equal(mod.ddPoints({ o: 1, s: 1, at: opensAt }, { o: 0 }, opensAt).pts, -4);
  assert.equal(mod.ddPoints({ o: 1, s: 1, at: opensAt }, { o: null }, opensAt), null, 'pending scores nothing');
  // A U-turn re-times the early bonus from the U-turn itself.
  assert.equal(mod.ddPoints({ o: 0, s: 2, at: opensAt, ut: true, utAt: opensAt + 13 * 3600e3 }, { o: 0 }, opensAt).pts, 22);
  for (let k = 0; k < 3; k++) assert.ok(mod.DD_WRONG[k] < mod.DD_RIGHT[k]);
});

test('results: a move in the data settles its saga and re-scores the table', async () => {
  const { loadSnapshot } = await import(path.join(ROOT, 'api/data/_lib/store.js'));
  const snap = loadSnapshot();
  const board = await call({ action: 'live.dd.board', dev, day: DAY });
  const s0 = board.sagas[0], s1 = board.sagas[1];
  const rum = snap.rumours.find((r) => r.id === s0.rid), rum1 = snap.rumours.find((r) => r.id === s1.rid);
  // Saga 0: the player joins the linked club (Done). Saga 1: joins someone else entirely (Hijack).
  snap.transfers.push({ playerId: rum.playerId, fromClubId: rum.currentClubId, toClubId: s0.to.id, date: DAY, type: 'permanent', fee: null });
  snap.transfers.push({ playerId: rum1.playerId, fromClubId: rum1.currentClubId, toClubId: 'zzz-elsewhere', date: DAY, type: 'permanent', fee: null });
  try {
    const r = await call({ action: 'live.dd.results', dev, day: DAY });
    assert.equal(r.settled, 2); assert.equal(r.final, false);
    assert.equal(r.sagas[0].out, 0); assert.equal(r.sagas[0].pending, false);
    assert.equal(r.sagas[1].out, 1); assert.equal(r.sagas[1].outClub, 'other', 'an unlinked destination reads as "other", as on the Wire');
    // dev U-turned to "stays" at Talks on saga 0: −4. dev2 said "stays" at Advanced on saga 0 (−12) and Done at Talks on saga 1 (wrong: −4).
    const me = r.rows.find((x) => x.me), other = r.rows.find((x) => !x.me);
    assert.equal(me.pts, -4); assert.equal(other.pts, -16);
    assert.equal(r.rows[0].me, true, 'the smaller loss ranks first'); assert.equal(r.me.rank, 1);
    const again = await call({ action: 'live.dd.results', dev: dev2, day: DAY });
    assert.equal(again.me.rank, 2); assert.equal(again.me.pts, -16);
  } finally { snap.transfers.splice(-2, 2); }
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
  const c = await call({ action: 'live.dd.call', dev, day: DAY, rid: 'x', o: 0, s: 1 });
  if (!todayIsDD) assert.equal(c.error, 'not live');
  process.env.T1_DD_PREVIEW = '1';
});
