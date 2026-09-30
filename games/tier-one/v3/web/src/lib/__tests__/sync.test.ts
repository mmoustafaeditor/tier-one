// Merge-rule tests for lib/sync.ts, run with node --test after an esbuild bundle (api/tier-one/v4/test/client.mjs).
// The stubs below stand in for the browser globals lib/save.ts touches at import time.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, String(v)); }, removeItem: (k: string) => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0 } as Storage;
Object.defineProperty(globalThis, 'navigator', { value: { language: 'en-GB' }, configurable: true });
Object.defineProperty(globalThis, 'location', { value: { protocol: 'https:', hostname: 'localhost', href: 'https://localhost/tier-one/' }, configurable: true });

const sync = await import('../sync');
const { merge, diff, snapshot, applyRemote, pack, unpack, RULES } = sync;

const base = () => ({ v: 2, dev: 'devLocal0001', nick: 'A', sound: true, reduced: false, credits: 100, pp: 10, byline: { followers: 1000, rep: 50, hot: 2, best: 3, keys: ['k1'] }, stats: { daily: 3, 'pay:cs_1': 111 } as Record<string, number>, book: { agent: { xp: 40, lv: 1, asks: 4, hits: 2 } }, rivals: { itk: { w: 1, l: 1, d: 0, streak: 1, last: 'w' } }, feed: [{ id: 'f1', at: 10, kind: 'x', key: 'k' }], owned: ['ink.blue'], wireSeen: ['r1'], ledger: [{ at: 1, d: 5, why: 'a' }], ach: { first: 5 }, scenes: { intro: 7 }, daily: { 1: { no: 1, total: 100 } }, streak: { n: 3, best: 3, last: 'd', grace: 0 } });

test('diff: counter deltas from a full base or a snapshot', () => {
  const b = base(), c = structuredClone(b);
  c.credits = 130; c.byline.followers = 1500; c.stats.daily = 4; c.book.agent.xp = 65; c.rivals.itk.w = 2; c.nick = 'B'; c.byline.hot = 9; c.stats['pay:cs_1'] = 999;
  const want = { credits: 30, 'byline.followers': 500, 'stats.daily': 1, 'book.agent.xp': 25, 'rivals.itk.w': 1 };
  assert.deepEqual(diff(b, c).counters, want);
  assert.deepEqual(diff(snapshot(b), c).counters, want);
  assert.equal(snapshot(b)['book.agent.xp'], 40); assert.equal(snapshot(b)['stats.pay:cs_1'], undefined, 'first-seen stamps are not counters');
});
test('merge: newer doc wins scalars; counters add server + delta; max; first-seen; unions', () => {
  const b = base(), server = structuredClone(b), client = structuredClone(b);
  client.credits = 160; client.byline.followers = 1800; client.book.agent.xp = 60; client.book.agent.lv = 2; client.rivals.itk.w = 2; client.feed.unshift({ id: 'f2', at: 20, kind: 'x', key: 'k' }); client.owned.push('frame.tape'); client.nick = 'Phone'; client.byline.hot = 5; (client.ach as Record<string, number>).second = 9; client.scenes.intro = 3;
  server.credits = 50; server.byline.followers = 1200; server.feed = [{ id: 'f3', at: 15, kind: 'x', key: 'k' }, { id: 'f1', at: 10, kind: 'x', key: 'k', read: true } as { id: string; at: number; kind: string; key: string; read?: boolean }]; server.nick = 'Desk'; server.byline.hot = 0; server.stats['pay:cs_2'] = 222; (server.daily as Record<string, unknown>)[2] = { no: 2, total: 50 };
  const r = merge(server, client, diff(b, client), { serverAt: 100, clientAt: 200 });
  assert.equal(r.nick, 'Phone'); assert.equal(r.credits, 110); assert.equal(r.byline.followers, 2000);
  assert.equal(r.book.agent.xp, 60); assert.equal(r.book.agent.lv, 2); assert.equal(r.rivals.itk.w, 2); assert.equal(r.rivals.itk.l, 1);
  assert.equal(r.byline.hot, 5); assert.equal((r.ach as Record<string, number>).second, 9); assert.equal(r.scenes.intro, 3);
  assert.equal(r.stats['pay:cs_1'], 111); assert.equal(r.stats['pay:cs_2'], 222);
  assert.deepEqual(r.feed.map((f) => f.id), ['f2', 'f3', 'f1']); assert.equal((r.feed[2] as { read?: boolean }).read, true);
  assert.deepEqual([...r.owned].sort(), ['frame.tape', 'ink.blue']); assert.deepEqual(Object.keys(r.daily).sort(), ['1', '2']);
  assert.equal(merge(server, client, diff(b, client), { serverAt: 300, clientAt: 200 }).nick, 'Desk');
  assert.equal(merge(server, client, null, { serverAt: 100, clientAt: 200 }).credits, 160, 'no deltas: max');
  const clamp = merge({ credits: 5, byline: { followers: 10 } }, { credits: 0 }, { counters: { credits: -50, 'byline.followers': -100 } }, { serverAt: 1, clientAt: 2 });
  assert.equal(clamp.credits, 0); assert.equal((clamp.byline as { followers: number }).followers, 0);
  assert.ok(RULES.counters.includes('byline.followers'));
});
test('applyRemote keeps device-only fields and migrates', () => {
  const local = { ...base(), dev: 'devLocal0001', sound: false, reduced: true } as unknown as import('../save').Save;
  const remote = { ...base(), dev: 'devOther0002', sound: true, reduced: false, nick: 'Remote', v: 1, career: null };
  const out = applyRemote(remote, local);
  assert.equal(out.dev, 'devLocal0001'); assert.equal(out.sound, false); assert.equal(out.reduced, true); assert.equal(out.nick, 'Remote'); assert.equal(out.v, 2, 'migrated to the current save version'); assert.ok(Array.isArray(out.slots));
});
test('pack/unpack round-trips through gzip base64', async () => {
  const doc = base();
  const blob = await pack(doc);
  assert.match(blob, /^[A-Za-z0-9+/=]+$/);
  assert.deepEqual(await unpack(blob), doc);
});
