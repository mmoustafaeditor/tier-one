import { test } from 'node:test';
import assert from 'node:assert/strict';
import { call, kv, newAccount } from './_harness.mjs';
import { cleanEvent } from '../../../_lib/telemetry.mjs';
import { today, dayMinus } from '../../../_lib/util.mjs';

test('events are cleaned: names, prop caps, PII dropped', () => {
  assert.equal(cleanEvent({ name: 'Bad Name' }), null);
  assert.equal(cleanEvent({ name: 'x'.repeat(50) }), null);
  const e = cleanEvent({ t: Date.now(), name: 'window.start', props: { mode: 'daily', email: 'a@b.c', note: 'mail me at a@b.c', phone: '1', n: 1.23456, ok: true, long: 'y'.repeat(200), url: 'https://x.y', 'bad key': 1 } });
  assert.deepEqual(Object.keys(e.props).sort(), ['long', 'mode', 'n', 'ok']); assert.equal(e.props.long.length, 80); assert.equal(e.props.n, 1.235);
  const many = cleanEvent({ name: 'ab', props: Object.fromEntries(Array.from({ length: 30 }, (_, i) => ['k' + i, i])) });
  assert.equal(Object.keys(many.props).length, 12);
});
test('batch: caps, day buckets, DAU and mode mix; ops.stats behind the token', async () => {
  const a = await newAccount();
  assert.equal((await call({ action: 'telemetry.batch', ...a.auth, events: 'x' })).code, 'BAD_REQUEST');
  const tooMany = await call({ action: 'telemetry.batch', ...a.auth, events: Array.from({ length: 51 }, () => ({ name: 'x' })) });
  assert.equal(tooMany.code, 'PAYLOAD_TOO_LARGE'); assert.equal(tooMany.max, 50);
  const r = await call({ action: 'telemetry.batch', ...a.auth, events: [{ t: Date.now(), name: 'window.start', props: { mode: 'daily' } }, { t: Date.now(), name: 'window.start', props: { mode: 'career' } }, { name: 'store.open' }, { name: 'BAD' }, { t: Date.now() - 10 * 86400e3, name: 'old.event' }] });
  assert.equal(r.ok, true); assert.equal(r.accepted, 4); assert.equal(r.stored, 6, 'two window.start + two mode counts, store.open ev + conv; the 10-day-old event dropped');
  const day = today();
  assert.equal(await kv.one('HGET', 't1v4:tm:' + day + ':ev', 'window.start'), '2');
  assert.equal(await kv.one('HGET', 't1v4:tm:' + day + ':mode', 'career'), '1');
  assert.equal(await kv.one('HGET', 't1v4:tm:' + day + ':ev', 'old.event'), null);
  // anonymous before hello: keyed by device
  const anon = await call({ action: 'telemetry.batch', dev: 'devAnonTm001', events: [{ name: 'boot' }] }); assert.equal(anon.ok, true);
  assert.equal((await call({ action: 'telemetry.batch', events: [{ name: 'boot' }] })).code, 'BAD_REQUEST');
  // retention: a subject first seen yesterday counts as a D1 returner today
  await kv.set('t1v4:tm:first:' + a.id, dayMinus(day, 1), 3600);
  await call({ action: 'telemetry.batch', ...a.auth, events: [{ name: 'boot' }] });
  assert.equal((await call({ action: 'ops.stats', token: 'wrong' })).code, 'UNAUTHORIZED');
  const s = await call({ action: 'ops.stats', token: 'ops-secret', days: 14 });
  assert.equal(s.ok, true); assert.equal(s.days.length, 14); assert.equal(s.days[0].day, day);
  assert.ok(s.days[0].dau >= 2); assert.equal(s.days[0].d1, 1); assert.equal(s.days[0].modes.daily, 1); assert.equal(s.days[0].conv['store.open'], 1); assert.ok(s.totals.dau >= 2);
});
