// Quick smoke test of api/tier-one/v3 against an in-memory Redis (no network). `npm run smoke:api`.
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { fakeRedis } from './fake-redis.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
process.chdir(ROOT);
const R = fakeRedis();
process.env.KV_REST_API_URL = 'http://fake'; process.env.KV_REST_API_TOKEN = 't';
globalThis.fetch = async (url, init) => ({ ok: true, json: async () => R.pipeline(JSON.parse(init.body)) });
const { default: handler } = await import(path.join(ROOT, 'api/tier-one/v3/index.js'));
let ip = 1;
async function call(body, opts = {}) {
  let status = 0, out = null;
  const res = { setHeader() {}, status(c) { status = c; return res; }, json(o) { out = o; return res; }, end() { return res; } };
  await handler({ method: 'POST', body: JSON.stringify(body), headers: { 'x-forwarded-for': opts.ip || '10.0.0.' + ip } }, res);
  return { status, ...out };
}
const dev = 'devSmoke01', dev2 = 'devSmoke02';
let r = await call({ action: 'health' }); assert.equal(r.ok, true); assert.equal(r.data, true);
r = await call({ action: 'daily.start', dev, nick: 'Smoke' });
assert.equal(r.ok, true); assert.equal(r.cast.length, 5); assert.equal(r.state.day, 1);
assert.ok(!('alt' in r.cast[0]), 'hijack club hidden before results');
assert.ok(!JSON.stringify(r).includes('"truth"'), 'no truth in a live board');
assert.equal((await call({ action: 'daily.act', dev, act: ['x'] })).error, 'act');
assert.equal((await call({ action: 'daily.act', dev, act: ['c', 0, 0, 2] })).error, 'rule', 'no sources, no story');
assert.equal((await call({ action: 'daily.act', dev, act: ['a', 0, 'physio'] })).error, 'rule', 'physio closed on day 1');
r = await call({ action: 'daily.act', dev, act: ['a', 0, 'agent'] }); assert.equal(r.ok, true); assert.ok(r.answer); assert.equal(r.state.left, 2);
r = await call({ action: 'daily.act', dev, act: ['c', 0, r.answer.r, 2] }); assert.equal(r.ok, true); assert.ok(r.state.calls[0]);
for (let d = 1; d < 7; d++) {
  for (let i = 1; i < 5; i++) { const a = await call({ action: 'daily.act', dev, act: ['a', i, 'kitman'] }); if (a.ok && !a.state.calls[i]) await call({ action: 'daily.act', dev, act: ['c', i, a.answer.r === 0 ? 0 : 2, 0] }); }
  r = await call({ action: 'daily.act', dev, act: ['e'] }); assert.equal(r.ok, true);
}
assert.equal(r.state.day, 7); assert.equal(r.ddLeftMs, undefined, 'clock waits for the page turn');
r = await call({ action: 'daily.dd', dev }); assert.ok(r.ddLeftMs > 50000 && r.ddLeftMs <= 60000, 'deadline clock started');
assert.equal((await call({ action: 'daily.act', dev, act: ['f', 'burner'] })).error, 'act', 'no favours on a ranked board');
r = await call({ action: 'daily.finish', dev });
assert.equal(r.ok, true); assert.equal(r.done, true);
const res = r.result; assert.ok(res.total >= -450 && res.total <= 420); assert.equal(res.rank, 1); assert.ok(res.cast[0].alt, 'hijack club shown in results');
console.log('daily', res.total, res.tier, res.row, 'rank', res.rank, '/', res.players);
r = await call({ action: 'daily.act', dev, act: ['e'] }); assert.equal(r.error, 'done', 'one attempt');
r = await call({ action: 'daily.start', dev }); assert.equal(r.done, true);
// a second player sees the same board
r = await call({ action: 'daily.start', dev: dev2 }); assert.equal(r.cast.map((c) => c.player.id).join(), res.cast.map((c) => c.player.id).join());
r = await call({ action: 'daily.act', dev: dev2, act: ['a', 0, 'agent'] });
const first = (await call({ action: 'daily.start', dev: 'devSmoke03' }));
const again = await call({ action: 'daily.act', dev: 'devSmoke03', act: ['a', 0, 'agent'] });
assert.equal(again.answer.r, r.answer.r, 'same question, same answer');
assert.ok(first.ok);
r = await call({ action: 'lb.top', period: 'daily', dev }); assert.equal(r.rows[0].me, true); assert.equal(r.me.rank, 1);
r = await call({ action: 'daily.seed', day: new Date().toISOString().slice(0, 10) }); assert.equal(r.error, 'day', 'today’s seed stays secret');
r = await call({ action: 'daily.seed', day: new Date(Date.now() - 864e5).toISOString().slice(0, 10) }); assert.ok(r.seed);
// league
r = await call({ action: 'league.me', dev, nick: 'Smoke' }); assert.equal(r.ok, true); assert.equal(r.rows[0].pts, { T1: 30, T2: 20, T3: 12, T4: 6, SPIKED: 2 }[res.tier]);
// wire
r = await call({ action: 'wire.board', dev }); assert.equal(r.ok, true);
const rid = Object.keys(r.items)[0]; assert.ok(rid);
r = await call({ action: 'wire.file', dev, rid, yes: true, s: 3 }); assert.equal(r.ok, true);
assert.equal((await call({ action: 'wire.file', dev, rid, yes: false, s: 1 })).error, 'filed');
r = await call({ action: 'wire.correct', dev, rid, yes: false, s: 2 }); assert.equal(r.ok, true); assert.equal(r.call.yes, false);
assert.equal((await call({ action: 'wire.correct', dev, rid, yes: true, s: 2 })).error, 'locked', 'one correction only');
r = await call({ action: 'wire.mine', dev }); assert.equal(r.ok, true); assert.equal(r.calls.length, 1);
r = await call({ action: 'wire.board', dev }); assert.equal(r.items[rid].split.no, 1); assert.equal(r.items[rid].split.yes, 0);
// rooms: server-scored round with the room's own board
r = await call({ action: 'room.create', nick: 'Host', name: 'Group chat', rounds: 5 }); assert.equal(r.ok, true);
const room = { code: r.room.code, pid: r.pid, sec: r.sec, round: 0 };
assert.equal((await call({ action: 'daily.start', room: { ...room, sec: 'nope' } })).error, 'forbidden');
r = await call({ action: 'daily.start', room }); assert.equal(r.ok, true); assert.equal(r.scope.kind, 'r');
assert.equal((await call({ action: 'daily.start', room: { ...room, round: 1 } })).error, 'not open');
r = await call({ action: 'daily.finish', room }); assert.equal(r.done, true);
const j = await call({ action: 'room.join', code: room.code, nick: 'Friend' }); assert.equal(j.room.players.length, 2);
r = await call({ action: 'room.get', code: room.code }); assert.ok(r.room.players.some((p) => p.results[0]));
assert.ok(!JSON.stringify(r).includes('"sec"'), 'room secrets never leave');
// validation + rate limit
assert.equal((await call({ action: 'nope' })).status, 400);
assert.equal((await call({ action: 'daily.start', dev: 'bad id!' })).error, 'dev');
let limited = false; for (let i = 0; i < 950 && !limited; i++) limited = (await call({ action: 'lb.top' }, { ip: '9.9.9.9' })).status === 429;
assert.ok(limited, 'rate limited');
console.log('api smoke: ok');
