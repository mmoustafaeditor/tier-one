import { test } from 'node:test';
import assert from 'node:assert/strict';
import { call, newAccount } from './_harness.mjs';
import { merge, diff, expand } from '../../../_lib/merge.mjs';
import { pack, unpack, LIMITS } from '../../../_lib/save.mjs';

const base = () => ({ v: 2, nick: 'A', credits: 100, pp: 10, byline: { followers: 1000, rep: 50, hot: 2, best: 3, keys: ['k1'] }, stats: { daily: 3, 'pay:cs_1': 111 }, book: { agent: { xp: 40, lv: 1, asks: 4, hits: 2 } }, rivals: { itk: { w: 1, l: 1, d: 0, streak: 1, last: 'w' } }, feed: [{ id: 'f1', at: 10, kind: 'x', key: 'k' }], owned: ['ink.blue'], wireSeen: ['r1'], ledger: [{ at: 1, d: 5, why: 'a' }], ach: { first: 5 }, scenes: { intro: 7 }, daily: { 1: { no: 1, total: 100 } }, streak: { n: 3, best: 3, last: 'd', grace: 0 } });

test('diff lists counter deltas only', () => {
  const b = base(), c = structuredClone(b);
  c.credits = 130; c.byline.followers = 1500; c.stats.daily = 4; c.book.agent.xp = 65; c.rivals.itk.w = 2; c.nick = 'B'; c.byline.hot = 9; c.stats['pay:cs_1'] = 999;
  const d = diff(b, c);
  assert.deepEqual(d.counters, { credits: 30, 'byline.followers': 500, 'stats.daily': 1, 'book.agent.xp': 25, 'rivals.itk.w': 1 });
  assert.deepEqual(expand('book.*.xp', [b]), [['book', 'agent', 'xp']]);
});
test('merge: LWW scalars, additive counters with deltas, max, first-seen, unions by id', () => {
  const b = base();
  const server = structuredClone(b), client = structuredClone(b);
  // phone played two windows: +60 coins, +800 followers, agent xp +20, a rival win, a new feed item, a new cosmetic
  client.credits = 160; client.byline.followers = 1800; client.book.agent.xp = 60; client.book.agent.lv = 2; client.rivals.itk.w = 2; client.feed.unshift({ id: 'f2', at: 20, kind: 'x', key: 'k' }); client.owned.push('frame.tape'); client.nick = 'Phone'; client.byline.hot = 5; client.ach.second = 9; client.scenes.intro = 3;
  // desktop meanwhile: spent 50 coins, +200 followers, read f1, another feed item, pay stamp for a second session
  server.credits = 50; server.byline.followers = 1200; server.feed = [{ id: 'f3', at: 15, kind: 'x', key: 'k' }, { id: 'f1', at: 10, kind: 'x', key: 'k', read: true }]; server.nick = 'Desk'; server.byline.hot = 0; server.stats['pay:cs_2'] = 222; server.daily[2] = { no: 2, total: 50 };
  const deltas = diff(b, client);
  const r = merge(server, client, deltas, { serverAt: 100, clientAt: 200 });
  assert.equal(r.nick, 'Phone', 'newer doc wins scalars');
  assert.equal(r.credits, 110, 'server 50 + client delta 60');
  assert.equal(r.byline.followers, 2000, 'server 1200 + client delta 800');
  assert.equal(r.book.agent.xp, 60); assert.equal(r.book.agent.lv, 2); assert.equal(r.rivals.itk.w, 2); assert.equal(r.rivals.itk.l, 1);
  assert.equal(r.byline.hot, 5); assert.equal(r.ach.second, 9); assert.equal(r.ach.first, 5); assert.equal(r.scenes.intro, 3, 'earliest non-zero');
  assert.equal(r.stats['pay:cs_1'], 111); assert.equal(r.stats['pay:cs_2'], 222);
  assert.deepEqual(r.feed.map((f) => f.id), ['f2', 'f3', 'f1']); assert.equal(r.feed[2].read, true, 'read flag survives');
  assert.deepEqual(r.owned.sort(), ['frame.tape', 'ink.blue']); assert.deepEqual(Object.keys(r.daily).sort(), ['1', '2']);
  // the older side wins nothing scalar
  const r2 = merge(server, client, deltas, { serverAt: 300, clientAt: 200 });
  assert.equal(r2.nick, 'Desk'); assert.equal(r2.credits, 110);
  // without deltas counters take the max
  const r3 = merge(server, client, null, { serverAt: 100, clientAt: 200 });
  assert.equal(r3.credits, 160); assert.equal(r3.byline.followers, 1800);
  // clamps
  const r4 = merge({ credits: 5, byline: { followers: 10 } }, { credits: 0 }, { counters: { credits: -50, 'byline.followers': -100 } }, { serverAt: 1, clientAt: 2 });
  assert.equal(r4.credits, 0); assert.equal(r4.byline.followers, 0);
});
test('save.push fast-forwards on a matching base and merges on conflict; pull returns the blob', async () => {
  const a = await newAccount();
  const empty = await call({ action: 'save.pull', ...a.auth }); assert.equal(empty.version, 0); assert.equal(empty.blob, null);
  const doc1 = base();
  const p1 = await call({ action: 'save.push', ...a.auth, blob: pack(doc1), base: 0, updatedAt: 1000 });
  assert.equal(p1.ok, true); assert.equal(p1.version, 1); assert.equal(p1.merged, false); assert.equal(p1.blob, undefined);
  const pull = await call({ action: 'save.pull', ...a.auth }); assert.equal(pull.version, 1); assert.deepEqual(unpack(pull.blob), doc1); assert.equal(pull.deviceId, a.dev);
  // device B pushes from version 1: fast-forward
  const docB = structuredClone(doc1); docB.credits = 50; docB.nick = 'Desk';
  const p2 = await call({ action: 'save.push', ...a.auth, blob: pack(docB), base: 1, updatedAt: 2000 }); assert.equal(p2.version, 2); assert.equal(p2.merged, false);
  // device A still on base 1 pushes its own changes: conflict, merged blob comes back
  const docA = structuredClone(doc1); docA.credits = 160; docA.byline.followers = 1800; docA.nick = 'Phone';
  const p3 = await call({ action: 'save.push', ...a.auth, blob: pack(docA), base: 1, updatedAt: 3000, deltas: diff(doc1, docA) });
  assert.equal(p3.version, 3); assert.equal(p3.merged, true); assert.ok(p3.blob);
  const m = unpack(p3.blob); assert.equal(m.credits, 110); assert.equal(m.byline.followers, 1800); assert.equal(m.nick, 'Phone');
  // idempotent push replay
  const again = await call({ action: 'save.push', ...a.auth, blob: pack(docA), base: 1, updatedAt: 3000, idem: 'push-x' });
  const again2 = await call({ action: 'save.push', ...a.auth, blob: pack(docA), base: 1, updatedAt: 3000, idem: 'push-x' });
  assert.equal(again.version, 4); assert.equal(again2.version, 4); assert.equal(again2.replay, true);
});
test('save.push rejects bad and oversized blobs', async () => {
  const a = await newAccount();
  assert.equal((await call({ action: 'save.push', ...a.auth, blob: 'not-base64!!', base: 0 })).code, 'BAD_REQUEST');
  assert.equal((await call({ action: 'save.push', ...a.auth, blob: pack([1, 2]), base: 0 })).code, 'BAD_REQUEST');
  assert.equal((await call({ action: 'save.push', ...a.auth, blob: 'A'.repeat(LIMITS.blob + 4), base: 0 })).code, 'PAYLOAD_TOO_LARGE');
  const bomb = pack({ v: 2, pad: 'x'.repeat(LIMITS.raw + 10) });
  assert.equal((await call({ action: 'save.push', ...a.auth, blob: bomb, base: 0 })).code, 'BAD_REQUEST');
});
