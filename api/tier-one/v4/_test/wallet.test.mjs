import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHmac } from 'node:crypto';
import { call, api, kv, mem, newAccount } from './_harness.mjs';
import { stripeAdapter } from '../../../_lib/purchase/stripe.mjs';
import { googleAdapter } from '../../../_lib/purchase/google.mjs';
import { handle as webhook } from '../_stripe-webhook.js';
import { dayMinus, today } from '../../../_lib/util.mjs';

const snapshotV3 = () => JSON.stringify(mem.dump().filter((k) => k.startsWith('t1v3:')).sort().map((k) => [k, mem.raw.get(k)]));

test('wallet starts empty; earn reasons are validated against what the server knows', async () => {
  const a = await newAccount();
  const w = await call({ action: 'wallet.get', ...a.auth }); assert.equal(w.wallet.balance, 0); assert.deepEqual(w.ledger, []);
  assert.equal((await call({ action: 'wallet.earn', ...a.auth, reason: 'client_says_so' })).code, 'BAD_REQUEST');
  // first Tier 1: only when v3 holds a T1 result doc for one of the account's game devices
  const day = today();
  assert.equal((await call({ action: 'wallet.earn', ...a.auth, reason: 'first_t1', ref: day })).code, 'FORBIDDEN');
  await kv.setJ('t1v3:lb:d:' + day + ':e:' + a.dev, { nick: 'x', score: 400, tier: 'T1', row: '', ex: 2 }, 3600);
  for (let i = 0; i < 30; i++) await kv.set('t1v3:lb:once:' + dayMinus(day, i) + ':' + a.dev, '1', 86400);
  const before = snapshotV3();
  const e = await call({ action: 'wallet.earn', ...a.auth, reason: 'first_t1', ref: day }); assert.equal(e.ok, true); assert.equal(e.earned, 30); assert.equal(e.balance, 30);
  assert.equal((await call({ action: 'wallet.earn', ...a.auth, reason: 'first_t1', ref: day })).code, 'CONFLICT', 'once per account');
  // season end: only after the season ended, once per season
  assert.equal((await call({ action: 'wallet.earn', ...a.auth, reason: 'season_end', ref: '2099-summer' })).code, 'FORBIDDEN');
  assert.equal((await call({ action: 'wallet.earn', ...a.auth, reason: 'season_end', ref: '2026-spring' })).code, 'FORBIDDEN', 'account did not exist');
  // streak: thirty once-markers in a row (a fresh account with none is refused)
  const b = await newAccount();
  assert.equal((await call({ action: 'wallet.earn', ...b.auth, reason: 'streak_30' })).code, 'FORBIDDEN');
  const s = await call({ action: 'wallet.earn', ...a.auth, reason: 'streak_30' }); assert.equal(s.ok, true); assert.equal(s.earned, 40);
  assert.equal((await call({ action: 'wallet.earn', ...a.auth, reason: 'streak_30' })).code, 'CONFLICT');
  assert.equal(snapshotV3(), before, 'the wallet never writes a Daily key');
  const g = await call({ action: 'wallet.get', ...a.auth }); assert.equal(g.wallet.balance, 70); assert.equal(g.ledger.length, 2); assert.equal(g.ledger[0].why, 'earn:streak_30');
});
test('spend: catalog items only, enough credits, entitlements once, idempotent', async () => {
  const a = await newAccount();
  await api.wallet.credit(a.id, 19, 'test', null);
  assert.equal((await call({ action: 'wallet.spend', ...a.auth, item: 'nope' })).code, 'NOT_FOUND');
  assert.equal((await call({ action: 'wallet.spend', ...a.auth, item: 'credits.100' })).code, 'NOT_FOUND', 'money-only items are not spendable');
  const poor = await call({ action: 'wallet.spend', ...a.auth, item: 'masthead.classic' }); assert.equal(poor.code, 'CONFLICT'); assert.equal(poor.balance, 19); assert.equal(poor.need, 20);
  const ok = await call({ action: 'wallet.spend', ...a.auth, item: 'card.foil', idem: 'sp1' }); assert.equal(ok.ok, true); assert.equal(ok.wallet.balance, 7); assert.deepEqual(ok.wallet.entitlements, ['cos:card.foil']);
  const rep = await call({ action: 'wallet.spend', ...a.auth, item: 'card.foil', idem: 'sp1' }); assert.equal(rep.replay, true); assert.equal(rep.wallet.balance, 7);
  assert.equal((await call({ action: 'wallet.spend', ...a.auth, item: 'card.foil' })).code, 'CONFLICT', 'owned');
  assert.equal((await call({ action: 'wallet.spend', ...a.auth, item: 'coins.500' })).code, 'NOT_FOUND', '3.8: coins are never sold');
  assert.equal((await call({ action: 'wallet.coins.claim', ...a.auth })).coins, 0);
  const ents = await call({ action: 'ent.list', ...a.auth }); assert.deepEqual(ents.cosmetics, ['card.foil']); assert.equal(ents.gold.active, false);
});
test('gift: same newsroom only, daily cap, credits or a giftable item', async () => {
  const a = await newAccount(), b = await newAccount();
  await api.wallet.credit(a.id, 200, 'test', null);
  assert.equal((await call({ action: 'wallet.gift', ...a.auth, to: b.id, amount: 10, newsroom: 'ROOM1' })).code, 'FORBIDDEN');
  await kv.pipeline([['SADD', 't1v4:newsroom:ROOM1:members', a.id, b.id]]);
  const g = await call({ action: 'wallet.gift', ...a.auth, to: b.id, amount: 10, newsroom: 'ROOM1', note: 'nice call' }); assert.equal(g.ok, true); assert.equal(g.wallet.balance, 190);
  const bw = await call({ action: 'wallet.get', ...b.auth }); assert.equal(bw.wallet.balance, 10); assert.equal(bw.ledger[0].why, 'gift:in'); assert.equal(bw.ledger[0].note, 'nice call');
  const it = await call({ action: 'wallet.gift', ...a.auth, to: b.id, item: 'ink.gold', newsroom: 'ROOM1' }); assert.equal(it.ok, true); assert.equal(it.amount, 6);
  assert.deepEqual((await call({ action: 'ent.list', ...b.auth })).cosmetics, ['ink.gold']);
  assert.equal((await call({ action: 'wallet.gift', ...a.auth, to: b.id, item: 'paper.name', newsroom: 'ROOM1' })).code, 'BAD_REQUEST');
  assert.equal((await call({ action: 'wallet.gift', ...a.auth, to: b.id, amount: 99, newsroom: 'ROOM1' })).code, 'BAD_REQUEST', 'over max');
  assert.equal((await call({ action: 'wallet.gift', ...a.auth, to: b.id, amount: 50, newsroom: 'ROOM1' })).ok, true);
  assert.equal((await call({ action: 'wallet.gift', ...a.auth, to: b.id, amount: 50, newsroom: 'ROOM1' })).code, 'RATE_LIMITED', 'per-day cap');
  assert.equal((await call({ action: 'wallet.get', ...a.auth })).wallet.balance, 134);
});
test('purchases: sandbox grants once per receipt; providers refuse when off; checkout sandbox', async () => {
  const a = await newAccount();
  assert.equal(api.purchases.sandboxAllowed, true);
  const p = await call({ action: 'wallet.purchase.verify', ...a.auth, provider: 'sandbox', item: 'credits.350', nonce: 'n1' });
  assert.equal(p.ok, true); assert.equal(p.granted.credits, 350); assert.equal(p.wallet.balance, 350); assert.equal(p.duplicate, false);
  const dup = await call({ action: 'wallet.purchase.verify', ...a.auth, provider: 'sandbox', item: 'credits.350', nonce: 'n1' }); assert.equal(dup.duplicate, true); assert.equal(dup.wallet.balance, 350);
  const gold = await call({ action: 'wallet.purchase.verify', ...a.auth, provider: 'sandbox', item: 'gold.2026-autumn' }); assert.equal(gold.granted.ent, 'gold:2026-autumn');
  const ents = await call({ action: 'ent.list', ...a.auth }); assert.equal(ents.gold.active, ents.gold.season === '2026-autumn');
  assert.equal((await call({ action: 'wallet.purchase.verify', ...a.auth, provider: 'sandbox', item: 'coins.500' })).code, 'FORBIDDEN', '3.8: coins are not an item at all');
  assert.equal((await call({ action: 'wallet.purchase.verify', ...a.auth, provider: 'paypal' })).code, 'BAD_REQUEST');
  const g = await call({ action: 'wallet.purchase.verify', ...a.auth, provider: 'google', productId: 'credits_100', purchaseToken: 'sandbox:credits_100' }); assert.equal(g.ok, true); assert.equal(g.granted.credits, 100);
  assert.equal((await call({ action: 'wallet.purchase.verify', ...a.auth, provider: 'google', productId: 'credits_100', purchaseToken: 'real-looking' })).code, 'FORBIDDEN');
  const co = await call({ action: 'wallet.checkout.start', ...a.auth, item: 'credits.800' }); assert.equal(co.sandbox, true); assert.match(co.sessionId, /^cs_sandbox_/); assert.equal(co.url, null);
  const st = await call({ action: 'wallet.purchase.verify', ...a.auth, provider: 'stripe', sessionId: co.sessionId, item: 'credits.800' }); assert.equal(st.granted.credits, 800);
  assert.equal((await call({ action: 'wallet.purchase.verify', ...a.auth, provider: 'stripe', sessionId: 'cs_live_abc' })).code, 'FORBIDDEN');
  // sandbox off in production
  const { createApi } = await import('./_harness.mjs');
  const prod = createApi({ kv, env: { ...process.env, VERCEL_ENV: 'production' }, onError() {} });
  const off = await call({ action: 'wallet.purchase.verify', ...a.auth, provider: 'sandbox', item: 'credits.60' }, { api: prod }); assert.equal(off.code, 'FORBIDDEN');
  const noPay = await call({ action: 'wallet.checkout.start', ...a.auth, item: 'credits.800' }, { api: prod }); assert.equal(noPay.code, 'NOT_IMPLEMENTED');
});
test('stripe adapter: checkout session and verify through a fake Stripe; webhook signatures', async () => {
  const calls = [];
  const fetchFn = async (url, init) => { calls.push({ url, init }); if (url.endsWith('/checkout/sessions')) return { ok: true, json: async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.test/x' }) }; return { ok: true, json: async () => ({ id: 'cs_test_1', payment_status: 'paid', metadata: { sku: 'credits.350', account: 'a_AAAAAAAAAAAA' }, line_items: { data: [{ price: { id: 'price_x' } }] } }) }; };
  const s = stripeAdapter({ secretKey: 'sk_test_x', webhookSecret: 'whsec_x', fetchFn, publicUrl: 'https://example.test' });
  const co = await s.createCheckout({ item: api.config.item('credits.350'), accountId: 'a_AAAAAAAAAAAA' });
  assert.equal(co.sessionId, 'cs_test_1'); assert.ok(calls[0].init.body.includes('metadata%5Bsku%5D=credits.350')); assert.ok(calls[0].init.body.includes('unit_amount%5D=499'));
  const v = await s.verifySession('cs_test_1'); assert.equal(v.paid, true); assert.equal(v.sku, 'credits.350'); assert.equal(v.accountId, 'a_AAAAAAAAAAAA');
  assert.equal((await s.verifySession('nope')).paid, false);
  const body = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_wh', payment_status: 'paid', metadata: { sku: 'credits.100', account: 'a_AAAAAAAAAAAA' } } } });
  const t = Math.floor(Date.now() / 1000), sig = createHmac('sha256', 'whsec_x').update(t + '.' + body).digest('hex');
  assert.equal(s.verifyWebhook(body, 't=' + t + ',v1=' + sig).ok, true);
  assert.equal(s.verifyWebhook(body, 't=' + t + ',v1=' + sig.replace(/./, 'f')).why, 'signature');
  assert.equal(s.verifyWebhook(body, 't=' + (t - 1000) + ',v1=' + sig).why, 'timestamp');
  // the webhook function grants once
  const a = await newAccount();
  const body2 = body.replace('a_AAAAAAAAAAAA', a.id);
  const sig2 = createHmac('sha256', 'whsec_x').update(t + '.' + body2).digest('hex');
  const fake = { ...api, purchases: { ...api.purchases, stripe: s } };
  const run = async (raw, h) => { let st = 0, out = null; const res = { setHeader() {}, status(c) { st = c; return res; }, json(o) { out = o; return res; } }; await webhook(fake, { method: 'POST', body: raw, headers: { 'stripe-signature': h } }, res); return { st, ...out }; };
  const w1 = await run(body2, 't=' + t + ',v1=' + sig2); assert.equal(w1.st, 200); assert.equal(w1.granted, true);
  const w2 = await run(body2, 't=' + t + ',v1=' + sig2); assert.equal(w2.granted, false); assert.equal(w2.duplicate, true);
  assert.equal((await run(body2, 't=' + t + ',v1=bad')).st, 400);
  assert.equal((await call({ action: 'wallet.get', ...a.auth })).wallet.balance, 100);
  const unconfigured = await run(body2, 't=1,v1=x');
  assert.equal(unconfigured.st, 400);
  const none = { ...fake, purchases: { ...fake.purchases, stripe: stripeAdapter({ secretKey: 'sk', fetchFn }) } };
  let st = 0; const res = { setHeader() {}, status(c) { st = c; return res; }, json() { return res; } };
  await webhook(none, { method: 'POST', body: body2, headers: {} }, res); assert.equal(st, 503);
});
test('google adapter verifies through the publisher API with a service-account JWT', async () => {
  const { generateKeyPairSync } = await import('node:crypto');
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const seen = [];
  const fetchFn = async (url, init) => { seen.push(url); if (url.includes('oauth2')) return { ok: true, json: async () => ({ access_token: 'at', expires_in: 3600 }) }; if (url.endsWith(':acknowledge')) return { ok: true, json: async () => ({}) }; return { ok: true, json: async () => ({ purchaseState: 0, orderId: 'GPA.1', acknowledgementState: 0 }) }; };
  const g = googleAdapter({ serviceAccount: JSON.stringify({ client_email: 'x@y', private_key: pem, token_uri: 'https://oauth2.googleapis.com/token' }), packageName: 'com.tierone.game', fetchFn });
  assert.equal(g.sandbox, false);
  const r = await g.verifyProduct({ productId: 'credits_100', purchaseToken: 'tok' });
  assert.equal(r.paid, true); assert.equal(r.receiptId, 'GPA.1'); assert.ok(seen[1].includes('/applications/com.tierone.game/purchases/products/credits_100/tokens/tok'));
  assert.equal(await g.acknowledge({ productId: 'credits_100', purchaseToken: 'tok' }), true);
  assert.equal((await g.verifyProduct({ productId: 'credits_100', purchaseToken: 'tok', packageName: 'com.other' })).paid, false);
});
test('the wallet module never names a Daily board or score key', () => {
  const src = fs.readFileSync(new URL('../../../_lib/wallet.mjs', import.meta.url), 'utf8');
  assert.ok(!src.includes("'t1v3:s:"), 'no session keys'); assert.ok(!/\[\s*'(SET|ZADD|ZINCRBY|HSET|DEL|INCR)[A-Z]*'\s*,\s*'t1v3/.test(src), 'no writes to v3 keys');
});
