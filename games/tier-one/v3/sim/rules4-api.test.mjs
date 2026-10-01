// 4.0 on the server (RULES4.md §5): a v4 Daily is replayed and scored by engine4 with `v: 4`, older days stay v3,
// room rounds that open from the cutover are v4, and a challenge replays under the rules the maker played.
// Runs api/tier-one/v3 against the in-memory Redis, no network: `node --test games/tier-one/v3/sim/rules4-api.test.mjs`
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fakeRedis } from '../web/scripts/fake-redis.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
process.chdir(ROOT);
const R = fakeRedis();
process.env.KV_REST_API_URL = 'http://fake'; process.env.KV_REST_API_TOKEN = 't'; process.env.VERCEL_ENV = 'test';
Date.now = () => Date.parse('2026-10-07T12:00:00Z');   // two days past the cutover: 10-05 and 10-06 are v4 days with published seeds
globalThis.fetch = async (url, init) => ({ ok: true, json: async () => R.pipeline(JSON.parse(init.body)) });
const { default: handler } = await import(path.join(ROOT, 'api/tier-one/v3/index.js'));
const E4 = await import(path.join(ROOT, 'api/tier-one/v3/_lib/engine4.mjs'));

let ip = 1;
async function call(body) {
  let status = 0, out = null;
  const res = { setHeader() {}, status(c) { status = c; return res; }, json(o) { out = o; return res; }, end() { return res; } };
  await handler({ method: 'POST', body: JSON.stringify(body), headers: { 'x-forwarded-for': '10.2.0.' + (ip++ % 200) } }, res);
  return { status, ...out };
}
// Plays a window through the API like a reader: barber everywhere, kit man where there's a DM, post ×2 on day 2+.
async function playThrough(who) {
  let r = await call({ action: 'daily.start', ...who }); assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.v, 4); assert.equal(r.state.v, 4);
  if (r.done) return r;
  const n = r.cast.length;
  for (let d = 1; d <= 5 && !r.done; d++) {
    for (let i = 0; i < n; i++) {
      if (r.state.calls[i]) continue;
      const a = await call({ action: 'daily.act', ...who, act: ['a', i, 'barber'] });
      if (a.ok && a.answer && d >= 2) { r = await call({ action: 'daily.act', ...who, act: ['c', i, a.answer.r, 1] }); if (r.done) return r; }
    }
    r = await call({ action: 'daily.act', ...who, act: ['e'] });
  }
  return r;
}
function localLog4(seed, spec) {
  const Rr = E4.rulesOf(spec), g = E4.newGame(E4.buildBoard(seed, Rr), Rr);
  while (!E4.isOver(g)) {
    for (let i = 0; i < Rr.STORIES; i++) { if (!g.calls[i] && E4.apply(g, ['a', i, 'barber'])) { const c = g.clues[i][g.clues[i].length - 1]; E4.apply(g, ['c', i, c.r, 1]); } }
    E4.apply(g, ['e']);
  }
  const r = E4.resolve(g);
  return { log: g.log.slice(), total: r.total, tier: r.tier };
}
const DEV_A = 'devRulesA001', DEV_B = 'devRulesB002';

test('a v4 Daily: five stories, five days, scored by engine4 with v:4, on the board with league points', async () => {
  const r = await playThrough({ dev: DEV_A, nick: 'Ana' });
  assert.equal(r.done, true); assert.equal(r.result.v, 4);
  assert.equal(r.cast.length, E4.RULES.STORIES);
  assert.equal(r.state.day, E4.RULES.DAYS + 1);
  assert.ok(typeof r.result.scoops === 'number'); assert.ok(['T1', 'T2', 'T3', 'T4', 'SPIKED'].includes(r.result.tier));
  assert.equal(r.result.ex, r.result.scoops);
  const lb = await call({ action: 'lb.top', dev: DEV_A });
  assert.equal(lb.rows.length, 1); assert.equal(lb.rows[0].score, r.result.total);
  const lg = await call({ action: 'league.me', dev: DEV_A, nick: 'Ana' });
  assert.ok(lg.rows.find((x) => x.me).daily > 0);
  // Done is done: another act is refused with the view.
  const again = await call({ action: 'daily.act', dev: DEV_A, act: ['e'] });
  assert.equal(again.ok, false); assert.equal(again.error, 'done'); assert.equal(again.result.v, 4);
});

test('the rules are the rules: a U-turn is refused, a 4th DM on day 1 is refused, a post needs a contact', async () => {
  const who = { dev: DEV_B, nick: 'Bo' };
  let r = await call({ action: 'daily.start', ...who }); assert.equal(r.v, 4);
  r = await call({ action: 'daily.act', ...who, act: ['c', 0, 0, 2] }); assert.equal(r.error, 'rule');
  for (let i = 0; i < 3; i++) { r = await call({ action: 'daily.act', ...who, act: ['a', i, 'kitman'] }); assert.equal(r.ok, true, JSON.stringify(r)); }
  r = await call({ action: 'daily.act', ...who, act: ['a', 3, 'kitman'] }); assert.equal(r.error, 'rule');
  r = await call({ action: 'daily.act', ...who, act: ['a', 3, 'barber'] }); assert.equal(r.ok, true);   // the barber is free
  r = await call({ action: 'daily.act', ...who, act: ['c', 0, 0, 2] }); assert.equal(r.ok, true);
  r = await call({ action: 'daily.act', ...who, act: ['u', 0, 1, 1] }); assert.equal(r.error, 'rule');
  r = await call({ action: 'daily.act', ...who, act: ['a', 4, 'physio'] }); assert.equal(r.error, 'rule');   // Deadline Day only
  // The 3.x clock has no place here.
  r = await call({ action: 'daily.dd', ...who }); assert.equal(r.ok, true); assert.equal(r.ddLeftMs, undefined);
});

test('daily.seed: a day before the cutover is v3 (5 sagas), a day after is v4 (5 stories)', async () => {
  const old = await call({ action: 'daily.seed', day: '2026-10-02' });
  assert.equal(old.ok, true); assert.equal(old.v, 3); assert.equal(old.cast.length, 5);
  const v4 = await call({ action: 'daily.seed', day: '2026-10-06' });
  assert.equal(v4.ok, true); assert.equal(v4.v, 4); assert.equal(v4.cast.length, E4.RULES.STORIES);
  // The published seed is the board everyone played: a local replay of it scores like the server would.
  const l = localLog4(v4.seed, E4.specOf('daily'));
  assert.ok(Number.isFinite(l.total));
});

test('a v4 practice challenge replays under the stored rule spec; the bounds come from the rules', async () => {
  const seed = 'K7Q2PXV4';
  const mine = localLog4(seed, E4.specOf('daily'));
  let r = await call({ action: 'challenge.create', dev: DEV_A, nick: 'Ana', mode: 'practice', v: 4, rules: { mode: 'practice' }, seed, log: mine.log });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.challenge.v, 4); assert.equal(r.challenge.target.score, mine.total); assert.equal(r.challenge.rules.mode, 'practice'); assert.equal(r.challenge.kind, 'practice');
  const got = await call({ action: 'challenge.get', code: r.challenge.code, dev: DEV_B });
  assert.equal(got.v, 4); assert.equal(got.seed, seed);
  // The taker plays the same seed and rules: the same log scores the same, a draw.
  const sub = await call({ action: 'challenge.submit', dev: DEV_B, nick: 'Bo', code: r.challenge.code, log: mine.log });
  assert.equal(sub.ok, true, JSON.stringify(sub)); assert.equal(sub.me.r, 'd'); assert.equal(sub.me.score, mine.total);
  // A log that doesn't finish the window, or a bad act, is refused.
  const bad = await call({ action: 'challenge.create', dev: DEV_B, nick: 'Bo', mode: 'practice', v: 4, seed, log: mine.log.slice(0, 3) });
  assert.equal(bad.error, 'log');
});

test('a career challenge carries rank and trust; the same log under other rules is a different score or invalid', async () => {
  const seed = 'CAREERV4';
  const spec = E4.specOf('career', { rank: 2, trust: { kitman: 0.5, physio: 1 } });
  const mine = localLog4(seed, spec);
  const r = await call({ action: 'challenge.create', dev: DEV_A, nick: 'Ana', mode: 'career', v: 4, rules: { mode: 'career', opts: { rank: 2, trust: { kitman: 0.5, physio: 1, bogus: 3 } } }, seed, log: mine.log });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.challenge.rules, spec); assert.equal(r.challenge.kind, 'career');
  assert.equal(r.challenge.rules.opts.trust.bogus, undefined);
  // Rank 0 has 3 stories: the 5-story log can't replay there, so a different spec would have been refused.
  const other = localLog4(seed, E4.specOf('career', { rank: 0 }));
  assert.notEqual(other.log.length, mine.log.length);
});

test('bounds(R) brackets every sim player and matches the rules', () => {
  const b = E4.bounds(E4.RULES);
  assert.equal(b.min, -60 * 5); assert.equal(b.max, (30 + 4 * 4 + 25) * 5);
  const d = E4.bounds(E4.rulesFor('deadline'));
  assert.equal(d.max, (30 + 25) * 6);
  for (let k = 0; k < 200; k++) { const l = localLog4('b' + k, E4.specOf('daily')); assert.ok(l.total >= b.min && l.total <= b.max); }
});

test('tutorial rules: seed tutorial-1, career rank 0, three stories, no trust', () => {
  const Rt = E4.rulesFor('tutorial'), Rc = E4.rulesFor('career', { rank: 0 });
  assert.equal(E4.TUTORIAL_SEED, 'tutorial-1');
  assert.equal(Rt.STORIES, 3); assert.deepEqual(Rt, Rc);
  assert.deepEqual(E4.specOf('tutorial'), { mode: 'tutorial' });
  assert.equal(E4.buildBoard(E4.TUTORIAL_SEED, Rt).stories.length, 3);
});

test('a room whose round opens after the cutover plays v4', async () => {
  const c = await call({ action: 'room.create', nick: 'Ana', dev: DEV_A, rounds: 5, cadence: 'daily' });
  assert.equal(c.ok, true, JSON.stringify(c));
  const who = { room: { code: c.room.code, pid: c.pid, sec: c.sec, round: 0 } };
  const r = await call({ action: 'daily.start', ...who });
  assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(r.v, 4); assert.equal(r.cast.length, 5);
  let v = r;
  for (let d = 1; d <= 5 && !v.done; d++) {
    for (let i = 0; i < 5 && !v.done; i++) { if (v.state.calls[i]) continue; const a = await call({ action: 'daily.act', ...who, act: ['a', i, 'barber'] }); if (a.ok && a.answer) v = await call({ action: 'daily.act', ...who, act: ['c', i, a.answer.r, 2] }); }
    if (!v.done) v = await call({ action: 'daily.act', ...who, act: ['e'] });
  }
  assert.equal(v.done, true); assert.equal(v.result.v, 4);
  const round = await call({ action: 'room.round', code: c.room.code, pid: c.pid, sec: c.sec, round: 0 });
  assert.equal(round.ok, true, JSON.stringify(round)); assert.equal(round.v, 4); assert.equal(round.days, 5);
  assert.equal(round.players[0].v, 4);
  const room = await call({ action: 'room.get', code: c.room.code });
  const filed = room.room.feed.find((f) => f.t === 'filed');
  assert.equal(filed.v, 4); assert.ok(Array.isArray(filed.drops));
});
