import { test } from 'node:test';
import assert from 'node:assert/strict';
import { call, api, kv, newAccount, createApi } from './_harness.mjs';
import { createKv } from '../../../_lib/kv.mjs';
import { createRouter, ApiError } from '../../../_lib/router.mjs';
import { memoryStore } from '../../../_lib/kv-memory.mjs';

test('health answers with a request id and CORS', async () => {
  const r = await call({ action: 'health' });
  assert.equal(r.ok, true); assert.equal(r.status, 200); assert.equal(r.api, '4.0.0');
  assert.ok(r.rid && r.rid.length >= 8); assert.equal(r.headers['x-request-id'], r.rid);
  assert.equal(r.headers['access-control-allow-origin'], '*');
  const rid = await call({ action: 'health' }, { headers: { 'x-request-id': 'abc-123' } });
  assert.equal(rid.rid, 'abc-123');
});
test('OPTIONS preflight, wrong method, bad body, unknown action are structured', async () => {
  const o = await call(null, { method: 'OPTIONS' }); assert.equal(o.status, 204);
  const g = await call(null, { method: 'GET' }); assert.equal(g.status, 405); assert.equal(g.code, 'METHOD');
  const b = await call(null, { rawBody: '{not json' }); assert.equal(b.status, 400); assert.equal(b.code, 'BAD_REQUEST');
  const u = await call({ action: 'nope.nope' }); assert.equal(u.status, 400); assert.equal(u.code, 'UNKNOWN_ACTION'); assert.equal(u.ok, false); assert.ok(u.rid);
  const big = await call(null, { rawBody: JSON.stringify({ action: 'health', pad: 'x'.repeat(700_000) }) }); assert.equal(big.status, 413); assert.equal(big.code, 'PAYLOAD_TOO_LARGE');
});
test('versioned handlers: name@version resolves, unknown version fails', async () => {
  assert.equal((await call({ action: 'health@1' })).ok, true);
  assert.equal((await call({ action: 'health@9' })).code, 'UNKNOWN_ACTION');
  const list = api.list();
  assert.ok(list.find((a) => a.name === 'save.push' && a.write && a.auth));
  assert.ok(list.find((a) => a.name === 'v3.daily.start' && a.source === 'v3'));
});
test('v3 passthrough: bare and prefixed names, v3 errors become codes, body cap kept', async () => {
  const h = await call({ action: 'v3.health' }); assert.equal(h.ok, true); assert.equal(h.data, true);
  const seed = await call({ action: 'daily.seed', day: new Date().toISOString().slice(0, 10) });
  assert.equal(seed.ok, false); assert.equal(seed.code, 'V3_DAY'); assert.equal(seed.error, 'day'); assert.equal(seed.status, 200);
  const start = await call({ action: 'daily.start', dev: 'devPassThru01', nick: 'PT' });
  assert.equal(start.ok, true); assert.equal(start.cast.length, 5);
  const big = await call({ action: 'v3.daily.start', dev: 'devPassThru01', pad: 'x'.repeat(5000) });
  assert.equal(big.code, 'PAYLOAD_TOO_LARGE');
});
test('idempotency: same key replays the first reply, concurrent repeat is refused', async () => {
  const dev = 'devIdem0001';
  const a = await call({ action: 'account.hello', dev }, { headers: { 'idempotency-key': 'k1' } });
  const b = await call({ action: 'account.hello', dev }, { headers: { 'idempotency-key': 'k1' } });
  assert.equal(a.ok, true); assert.equal(b.ok, true); assert.equal(b.replay, true); assert.equal(b.token, a.token);
  const c = await call({ action: 'account.hello', dev, idem: 'k2' }); // body.idem without a token: a fresh call, the device is claimed
  assert.equal(c.code, 'FORBIDDEN');
  await kv.set('t1v4:idem:' + dev + ':account.hello:k3', 'p', 30);
  const d = await call({ action: 'account.hello', dev, idem: 'k3' });
  assert.equal(d.code, 'IDEM_IN_PROGRESS'); assert.equal(d.status, 409);
});
test('rate limits per IP and per device', async () => {
  const mem = memoryStore(); const store = createKv({ pipeline: mem.pipeline });
  const r = createRouter({ kv: store, ip: { max: 3, window: 3600 }, dev: { max: 2, window: 3600 } });
  r.register('ping', async () => ({ pong: true }));
  const run = (ip, dev) => r.dispatch({ action: 'ping', dev }, { ip, dev, kv: store });
  await run('1.1.1.1'); await run('1.1.1.1'); await run('1.1.1.1');
  await assert.rejects(run('1.1.1.1'), (e) => e.code === 'RATE_LIMITED');
  await run('2.2.2.2', 'devRate0001'); await run('2.2.2.3', 'devRate0001');
  await assert.rejects(run('2.2.2.4', 'devRate0001'), (e) => e.code === 'RATE_LIMITED');
  const e = r.errorBody(new ApiError('RATE_LIMITED', 'rate'), 'r1');
  assert.equal(e.status, 429); assert.equal(e.body.code, 'RATE_LIMITED');
});
test('offline store answers ok:false OFFLINE, unknown throws become STORE', async () => {
  const off = createApi({ kv: createKv({}), env: process.env, onError() {} });
  const r = await call({ action: 'health' }, { api: off }); assert.equal(r.code, 'OFFLINE'); assert.equal(r.status, 200);
  const boom = createRouter({ kv, onError() {} }); boom.register('boom', async () => { throw new Error('secret detail'); });
  let out = null; const res = { setHeader() {}, status(c) { out = { c }; return res; }, json(o) { out.o = o; return res; }, end() {} };
  await boom.handler({ method: 'POST', body: { action: 'boom' }, headers: {} }, res);
  assert.equal(out.c, 502); assert.equal(out.o.code, 'STORE'); assert.ok(!JSON.stringify(out.o).includes('secret'));
});
test('auth is required where declared', async () => {
  const me = await call({ action: 'account.me', dev: 'devNoAuth001' }); assert.equal(me.code, 'UNAUTHORIZED'); assert.equal(me.status, 401);
  const acc = await newAccount();
  const bad = await call({ action: 'account.me', dev: acc.dev, token: 'wrong' }); assert.equal(bad.code, 'UNAUTHORIZED');
  const ok = await call({ action: 'account.me', ...acc.auth }); assert.equal(ok.ok, true); assert.equal(ok.account.id, acc.id);
});
