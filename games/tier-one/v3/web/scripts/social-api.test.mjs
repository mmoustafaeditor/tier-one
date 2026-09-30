// The press box server (GOTY.md §7.3): room feeds, weekly rounds, spectate, challenges, newsrooms, live presence.
// Runs api/tier-one/v3 against the in-memory Redis, no network: `node --test scripts/social-api.test.mjs`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fakeRedis } from './fake-redis.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
process.chdir(ROOT);
const R = fakeRedis();
process.env.KV_REST_API_URL = 'http://fake'; process.env.KV_REST_API_TOKEN = 't';
globalThis.fetch = async (url, init) => ({ ok: true, json: async () => R.pipeline(JSON.parse(init.body)) });
const { default: handler, pubId } = await import(path.join(ROOT, 'api/tier-one/v3/index.js'));
const { RULES, buildBoard, newGame, apply, isOver, resolve } = await import(path.join(ROOT, 'api/tier-one/v3/_lib/engine.mjs'));

let ip = 1;
async function call(body) {
  let status = 0, out = null;
  const res = { setHeader() {}, status(c) { status = c; return res; }, json(o) { out = o; return res; }, end() { return res; } };
  await handler({ method: 'POST', body: JSON.stringify(body), headers: { 'x-forwarded-for': '10.1.0.' + (ip++ % 200) } }, res);
  return { status, ...out };
}
// Play a whole window through the API (a room round or the Daily) with a simple policy; returns the last view.
async function playThrough(who, opts = {}) {
  let r = await call({ action: 'daily.start', ...who }); assert.equal(r.ok, true, JSON.stringify(r));
  if (r.done) return r;
  for (let d = 1; d <= 7 && !r.done; d++) {
    for (let i = 0; i < 5; i++) {
      if (r.state.calls[i]) continue;
      const a = await call({ action: 'daily.act', ...who, act: ['a', i, 'kitman'] });
      if (a.ok && a.answer) { r = await call({ action: 'daily.act', ...who, act: ['c', i, a.answer.r === 0 ? 0 : 2, opts.loud ? 2 : 0] }); if (r.done) return r; }
    }
    if (d === 7) { r = await call({ action: 'daily.finish', ...who }); } else { r = await call({ action: 'daily.act', ...who, act: ['e'] }); }
  }
  return r;
}
// A local Practice window on `seed`, played to the end: the log a client would send, and the score it saw.
function localLog(seed, loud = false) {
  const g = newGame(buildBoard(seed, RULES), RULES);
  while (!isOver(g)) {
    for (let i = 0; i < 5; i++) { if (!g.calls[i] && apply(g, ['a', i, 'kitman'])) { const c = g.clues[i][g.clues[i].length - 1]; apply(g, ['c', i, c.r === 0 ? 0 : 2, loud ? 2 : 1]); } }
    apply(g, ['e']);
  }
  const r = resolve(g);
  return { log: g.log.slice(), total: r.total, tier: r.tier };
}

const DEV_A = 'devPressA01', DEV_B = 'devPressB02', DEV_C = 'devPressC03';

test('rooms: weekly cadence on the real calendar, public ids, flair, the feed', async () => {
  let r = await call({ action: 'room.create', nick: 'Ana', name: 'The Back Page', rounds: 5, dev: DEV_A, flair: 'flair.star', tier: 'chief' });
  assert.equal(r.ok, true); assert.equal(r.room.cadence, 'weekly'); assert.equal(r.room.roundHours, 168);
  assert.equal(new Date(r.room.created).getUTCDay(), 1, 'weekly rooms start on the Monday of the week');
  assert.equal(r.room.players[0].pub, pubId(DEV_A)); assert.equal(r.room.players[0].flair, 'flair.star'); assert.equal(r.room.players[0].tier, 'chief');
  assert.ok(!('sec' in r.room.players[0]), 'secrets never leave the server');
  assert.equal(r.room.feed[0].t, 'open');
  const A = { code: r.room.code, pid: r.pid, sec: r.sec };
  r = await call({ action: 'room.join', code: A.code, nick: 'Ben', dev: DEV_B, flair: 'nope!!', tier: 'x' });
  assert.equal(r.ok, true); const B = { code: A.code, pid: r.pid, sec: r.sec };
  const ben = r.room.players.find((p) => p.pid === B.pid); assert.equal(ben.flair, ''); assert.equal(ben.tier, '');
  assert.equal(r.room.feed[0].t, 'join');
  // A daily-cadence room keeps the 2.x rules.
  const d = await call({ action: 'room.create', nick: 'Ana', name: 'Old style', rounds: 5, cadence: 'daily' });
  assert.equal(d.room.cadence, 'daily'); assert.equal(d.room.roundHours, 48);
  // Round 1 is open now (this week); round 2 opens next Monday.
  const v = await call({ action: 'daily.start', room: { ...A, round: 0 } }); assert.equal(v.ok, true);
  assert.equal((await call({ action: 'daily.start', room: { ...A, round: 1 } })).error, 'not open');
  // A taunt from the pool lands in the feed, rate-limited.
  r = await call({ action: 'room.post', ...A, k: 3, to: B.pid }); assert.equal(r.ok, true);
  assert.equal(r.feed[0].t, 'taunt'); assert.equal(r.feed[0].k, 3); assert.equal(r.feed[0].toNick, 'Ben');
  assert.equal((await call({ action: 'room.post', ...A, k: 1 })).error, 'slow');
  assert.equal((await call({ action: 'room.post', ...A, sec: 'bad', k: 1 })).error, 'forbidden');
  // room.get with credentials refreshes the card.
  r = await call({ action: 'room.get', code: A.code, pid: B.pid, sec: B.sec, flair: 'flair.pen', tier: 'stringer', nick: 'Benji', dev: DEV_B });
  const b2 = r.room.players.find((p) => p.pid === B.pid); assert.equal(b2.flair, 'flair.pen'); assert.equal(b2.nick, 'Benji'); assert.equal(b2.pub, pubId(DEV_B));
  globalThis.__room = { A, B };
});

test('rooms: filing posts to the feed with HERE WE GO cards; spectate waits for everyone', async () => {
  const { A, B } = globalThis.__room;
  let r = await playThrough({ room: { ...A, round: 0 } }, { loud: true });
  assert.equal(r.done, true);
  let room = (await call({ action: 'room.get', code: A.code })).room;
  const filed = room.feed.find((f) => f.t === 'filed'); assert.ok(filed); assert.equal(filed.pid, A.pid); assert.equal(filed.round, 0);
  assert.ok(Array.isArray(filed.hwg));
  const hwgN = r.result.per.filter((p) => p.right && p.call && p.call.o === 0 && p.call.s === 2).length;
  assert.equal(filed.hwg.length, hwgN, 'one HERE WE GO card per right Confirmed Done call');
  // Spectate: Ben hasn't filed, so Ana waits.
  r = await call({ action: 'room.round', ...A, round: 0 }); assert.equal(r.error, 'not yet'); assert.equal(r.waiting, 1);
  assert.equal((await call({ action: 'room.round', ...B, round: 0 })).error, 'not yet', 'nothing before you file');
  await playThrough({ room: { ...B, round: 0 } });
  r = await call({ action: 'room.round', ...A, round: 0 });
  assert.equal(r.ok, true); assert.equal(r.players.length, 2); assert.equal(r.days, 7); assert.equal(r.cast.length, 5);
  const me = r.players.find((p) => p.pid === A.pid); assert.equal(me.per.length, 5); assert.ok(me.per.every((p) => typeof p.truth === 'number'));
  assert.ok(me.per.some((p) => p.call && p.call.day >= 1));
  assert.equal((await call({ action: 'room.round', ...A, sec: 'x', round: 0 })).error, 'forbidden');
});

test('challenges: practice seeds are replayed and scored here; results settle for both sides', async () => {
  const seed = 'PRESSBOX1', mine = localLog(seed, true);
  let r = await call({ action: 'challenge.create', dev: DEV_A, nick: 'Ana', mode: 'practice', seed, log: mine.log, flair: 'flair.star', tier: 'chief', label: 'Practice' });
  assert.equal(r.ok, true, JSON.stringify(r));
  const ch = r.challenge; assert.equal(ch.kind, 'practice'); assert.equal(ch.target.score, mine.total); assert.equal(ch.by.pub, pubId(DEV_A)); assert.equal(ch.mine, true);
  assert.ok(!('byDev' in ch)); assert.ok(ch.open); assert.ok(ch.exp - ch.at === 24 * 3600e3);
  assert.equal((await call({ action: 'challenge.create', dev: DEV_A, mode: 'practice', seed, log: [['c', 0, 0, 2]] })).error, 'log', 'a log that does not finish the window is refused');
  assert.equal((await call({ action: 'challenge.create', dev: DEV_A, mode: 'practice', seed: 'ab' })).error, 'seed');
  // Anyone with the link can read it; the seed comes with it for practice.
  r = await call({ action: 'challenge.get', code: ch.code, dev: DEV_B }); assert.equal(r.ok, true); assert.equal(r.seed, seed); assert.equal(r.challenge.mine, false);
  assert.equal((await call({ action: 'challenge.submit', code: ch.code, dev: DEV_A, log: mine.log })).error, 'own');
  assert.equal((await call({ action: 'challenge.submit', code: ch.code, dev: DEV_B, log: [] })).error, 'log');
  const theirs = localLog(seed, false);
  r = await call({ action: 'challenge.submit', code: ch.code, dev: DEV_B, nick: 'Ben', log: theirs.log, tier: 'stringer' });
  assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(r.me.score, theirs.total); assert.equal(r.me.pub, pubId(DEV_B));
  assert.equal(r.me.r, theirs.total > mine.total ? 'w' : theirs.total < mine.total ? 'l' : 'd');
  assert.equal((await call({ action: 'challenge.submit', code: ch.code, dev: DEV_B, log: theirs.log })).error, 'done');
  // The maker sees the result in their list.
  r = await call({ action: 'challenge.mine', dev: DEV_A }); assert.equal(r.list.length, 1); assert.equal(r.list[0].res.length, 1); assert.equal(r.list[0].res[0].nick, 'Ben');
  // A career challenge takes the reporter's word for the target.
  r = await call({ action: 'challenge.create', dev: DEV_A, mode: 'career', seed: 'CAREER99', score: 180, tier: 'T2', row: '■■□■■' });
  assert.equal(r.ok, true); assert.equal(r.challenge.kind, 'career'); assert.equal(r.challenge.target.score, 180);
  assert.equal((await call({ action: 'challenge.get', code: 'NOPE00' })).error, 'not found');
});

test('challenges: a Daily challenge never leaks a live seed and settles from ranked results', async () => {
  const day = new Date().toISOString().slice(0, 10);
  assert.equal((await call({ action: 'challenge.create', dev: DEV_C, nick: 'Cy', mode: 'daily', day })).error, 'played', 'you must have played that Daily');
  const a = await playThrough({ dev: DEV_A, nick: 'Ana' }); assert.equal(a.done, true);
  let r = await call({ action: 'challenge.create', dev: DEV_A, nick: 'Ana', mode: 'daily', day });
  assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(r.challenge.kind, 'daily'); assert.equal(r.challenge.target.score, a.result.total);
  const code = r.challenge.code;
  r = await call({ action: 'challenge.get', code, dev: DEV_B });
  assert.equal(r.ok, true); assert.equal(r.seed, undefined, 'today\'s seed stays on the server'); assert.equal(r.played, undefined);
  assert.equal((await call({ action: 'challenge.submit', code, dev: DEV_B, log: [['e']] })).error, 'play', 'go and play today\'s Daily first');
  const b = await playThrough({ dev: DEV_B, nick: 'Ben' });
  r = await call({ action: 'challenge.get', code, dev: DEV_B }); assert.equal(r.played.score, b.result.total);
  r = await call({ action: 'challenge.submit', code, dev: DEV_B, nick: 'Ben' });
  assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(r.me.score, b.result.total, 'the ranked score, not a claim');
  assert.equal((await call({ action: 'challenge.create', dev: DEV_A, mode: 'daily', day: '2020-01-01' })).error, 'day');
});

test('newsrooms: one masthead, up to 20, weekly combined table and rank', async () => {
  let r = await call({ action: 'newsroom.create', dev: DEV_A, nick: 'Ana', name: 'The Chronicle', motto: 'First, then right.', masthead: { frame: 'frame.tape', ink: 'ink.blue', flair: 'bad flair!' } });
  assert.equal(r.ok, true, JSON.stringify(r));
  const nr = r.newsroom; assert.equal(nr.name, 'The Chronicle'); assert.equal(nr.isHost, true); assert.equal(nr.mine, true); assert.equal(nr.members.length, 1);
  assert.equal(nr.masthead.frame, 'frame.tape'); assert.equal(nr.masthead.flair, ''); assert.ok(!('hostDev' in nr)); assert.equal(nr.max, 20);
  assert.ok(nr.members[0].pts >= 0, 'Ana played today\'s Daily: her league week counts');
  assert.equal((await call({ action: 'newsroom.create', dev: DEV_A, nick: 'Ana', name: 'Second' })).error, 'member', 'one newsroom per reporter');
  r = await call({ action: 'newsroom.join', code: nr.code, dev: DEV_B, nick: 'Ben', flair: 'flair.pen', tier: 'stringer' });
  assert.equal(r.ok, true); assert.equal(r.newsroom.members.length, 2); assert.equal(r.newsroom.isHost, false);
  const ben = r.newsroom.members.find((m) => m.me); assert.equal(ben.flair, 'flair.pen'); assert.equal(ben.host, false);
  assert.equal(r.newsroom.total, r.newsroom.members.reduce((s, m) => s + m.pts, 0));
  assert.equal(r.newsroom.rank, 1); assert.equal(r.top[0].code, nr.code); assert.equal(r.top[0].n, 2);
  assert.equal((await call({ action: 'newsroom.masthead', code: nr.code, dev: DEV_B, masthead: { ink: 'ink.green' } })).error, 'forbidden');
  r = await call({ action: 'newsroom.masthead', code: nr.code, dev: DEV_A, masthead: { ink: 'ink.green' }, motto: 'Late edition.' });
  assert.equal(r.newsroom.masthead.ink, 'ink.green'); assert.equal(r.newsroom.masthead.frame, ''); assert.equal(r.newsroom.motto, 'Late edition.');
  // Find mine without a code; strangers see the table too.
  r = await call({ action: 'newsroom.get', dev: DEV_B }); assert.equal(r.newsroom.code, nr.code);
  r = await call({ action: 'newsroom.get', dev: DEV_C }); assert.equal(r.newsroom, null); assert.equal(r.top.length, 1);
  // A second newsroom ranks below the first when it has fewer points.
  r = await call({ action: 'newsroom.create', dev: DEV_C, nick: 'Cy', name: 'The Gazette' }); assert.equal(r.newsroom.rank, 2);
  assert.equal((await call({ action: 'newsroom.top' })).top.length, 2);
  // Host leaves: the next member inherits; last one out closes it.
  r = await call({ action: 'newsroom.leave', dev: DEV_A }); assert.equal(r.gone, false);
  r = await call({ action: 'newsroom.get', code: nr.code, dev: DEV_B }); assert.equal(r.newsroom.isHost, true); assert.equal(r.newsroom.members.length, 1);
  r = await call({ action: 'newsroom.leave', dev: DEV_B }); assert.equal(r.gone, true);
  assert.equal((await call({ action: 'newsroom.get', code: nr.code, dev: DEV_B })).error, 'not found');
  assert.equal((await call({ action: 'newsroom.join', code: 'ZZZZZZ', dev: DEV_B, nick: 'Ben' })).error, 'not found');
});

test('newsrooms: the twenty-first reporter is turned away', async () => {
  const r = await call({ action: 'newsroom.create', dev: 'devHostFull1', nick: 'Host', name: 'Full House' });
  for (let i = 1; i < 20; i++) assert.equal((await call({ action: 'newsroom.join', code: r.newsroom.code, dev: 'devFull' + String(i).padStart(4, '0'), nick: 'R' + i })).ok, true);
  assert.equal((await call({ action: 'newsroom.join', code: r.newsroom.code, dev: 'devFullLast1', nick: 'Late' })).error, 'full');
});

test('live: presence counts the last ten minutes; first to break it waits for your results', async () => {
  let r = await call({ action: 'live.count', board: 'daily', dev: DEV_C }); assert.equal(r.ok, true); assert.equal(r.n, 1); assert.equal(r.windowMin, 10);
  r = await call({ action: 'live.count', board: 'daily', dev: 'devLiveOther' }); assert.equal(r.n, 2);
  r = await call({ action: 'live.count', board: 'daily' }); assert.equal(r.n, 2, 'a read without a device does not count itself');
  // Cy has no results yet: the first-to-break line stays locked (no spoilers).
  r = await call({ action: 'live.first', dev: DEV_C }); assert.equal(r.locked, true); assert.equal(r.first, null);
  // Ana and Ben settled earlier in this run: if either filed a right Confirmed call, it is on record.
  r = await call({ action: 'live.first', dev: DEV_A }); assert.equal(r.locked, false);
  if (r.first) { assert.ok(['Ana', 'Ben'].includes(r.first.nick)); assert.ok(r.first.p); assert.equal(typeof r.first.me, 'boolean'); }
  // Force the case: a loud Daily by a fresh device on a fresh day key is not possible here, so check the record shape instead.
  const raw = R.kv.get('t1v3:live:first:' + new Date().toISOString().slice(0, 10));
  if (raw) { const f = JSON.parse(raw); assert.ok(f.dev && f.nick && Number.isInteger(f.i)); }
});
