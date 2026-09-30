import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { call, newAccount } from './_harness.mjs';
import { loadConfig, createConfig, bucketFor, DEFAULT_DIR, cmpVer } from '../../../_lib/config.mjs';
import { validate } from '../../../_lib/schema.mjs';

const tmpDir = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 't1v4cfg-')); for (const f of ['catalog', 'events', 'flags']) fs.copyFileSync(path.join(DEFAULT_DIR, f + '.json'), path.join(d, f + '.json')); return d; };

test('the shipped config files validate', () => {
  const c = loadConfig();
  assert.ok(c.catalog.items.length > 5); assert.equal(c.events.ddlive[0].day, '2027-02-02'); assert.equal(c.events.ddlive[1].day, '2027-09-01');
  assert.equal(typeof c.flags.flags.cloudSync, 'boolean');
});
test('invalid config is refused on load with a path', () => {
  const d = tmpDir();
  const cat = JSON.parse(fs.readFileSync(path.join(d, 'catalog.json'), 'utf8'));
  cat.items.push({ id: 'dupe', kind: 'cosmetic', name: 'x', price: {}, grants: { ent: 'cos:x' } });
  fs.writeFileSync(path.join(d, 'catalog.json'), JSON.stringify(cat));
  assert.throws(() => loadConfig(d), /catalog invalid: .*dupe.*no price/);
  cat.items.pop(); cat.items.push({ ...cat.items[0], id: cat.items[0].id });
  fs.writeFileSync(path.join(d, 'catalog.json'), JSON.stringify(cat));
  assert.throws(() => loadConfig(d), /duplicate id/);
  fs.copyFileSync(path.join(DEFAULT_DIR, 'catalog.json'), path.join(d, 'catalog.json'));
  const fl = JSON.parse(fs.readFileSync(path.join(d, 'flags.json'), 'utf8'));
  fl.ab.experiments[0].weights = [1];
  fs.writeFileSync(path.join(d, 'flags.json'), JSON.stringify(fl));
  assert.throws(() => loadConfig(d), /weights\/buckets/);
  fl.ab.experiments[0].weights = [1, 1]; fl.flags.bad = { nested: true };
  fs.writeFileSync(path.join(d, 'flags.json'), JSON.stringify(fl));
  assert.throws(() => loadConfig(d), /flags.bad/);
  assert.deepEqual(validate({ type: 'object', required: ['a'], properties: { a: { type: 'integer', minimum: 1 } }, additionalProperties: false }, { a: 0, b: 1 }), ['$.a: below 1', '$: unknown key b']);
});
test('A/B buckets are deterministic per subject and honour weights', () => {
  const exp = { id: 'x', buckets: ['a', 'b'], weights: [90, 10] };
  assert.equal(bucketFor(exp, 'a_ONE'), bucketFor(exp, 'a_ONE'));
  let b = 0; for (let i = 0; i < 2000; i++) if (bucketFor(exp, 'subj' + i) === 'b') b++;
  assert.ok(b > 120 && b < 280, 'about 10%: ' + b);
  assert.equal(cmpVer('3.4.0', '3.10.0') < 0, true); assert.equal(cmpVer('3.4.0', '3.4.0'), 0);
});
test('config.get: catalog without provider ids, featured, events, flags, ab, update advice', async () => {
  const anon = await call({ action: 'config.get', dev: 'devCfg000001', client: { ver: '3.2.0' } });
  assert.equal(anon.ok, true); assert.equal(anon.update, 'required'); assert.equal(anon.subject, 'account'); assert.ok(anon.featured.includes('credits.60'));
  assert.ok(anon.catalog.items.every((i) => !('stripePrice' in i) && !('googleSku' in i)));
  assert.equal(anon.events.ddlive[0].id, 'ddlive-2027-winter'); assert.ok('onboarding_brief' in anon.ab); assert.ok(!('featured_slot' in anon.ab));
  assert.equal(anon.flags.cloudSync, true); assert.equal(typeof anon.minClientVersion, 'string');
  const a = await newAccount();
  const mine = await call({ action: 'config.get', ...a.auth, client: { ver: '3.4.0' } });
  assert.equal(mine.update, 'none'); assert.equal(mine.ab.onboarding_brief, bucketFor({ id: 'onboarding_brief', buckets: ['control', 'short'], weights: [50, 50] }, a.id));
  const items = new Set(mine.catalog.items.map((i) => i.id)); assert.ok(!items.has('gold.2027-winter') || new Date().toISOString().slice(0, 10) >= '2026-12-01', 'future items hidden');
});
test('an edited file is picked up after the cache ttl', () => {
  const d = tmpDir();
  const cfg = createConfig({ dir: d, ttlMs: 0 });
  assert.equal(cfg.view('x').flags.newsroom, false);
  const fl = JSON.parse(fs.readFileSync(path.join(d, 'flags.json'), 'utf8')); fl.flags.newsroom = true;
  fs.writeFileSync(path.join(d, 'flags.json'), JSON.stringify(fl));
  assert.equal(cfg.view('x').flags.newsroom, true);
});
