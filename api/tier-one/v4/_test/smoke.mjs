// Local smoke run of the v4 function against the in-memory store (no network):
//   node api/tier-one/v4/_test/smoke.mjs
// Walks the client flow once: hello, config, push/pull a save, play a v3 Daily through v4, buy in the sandbox, telemetry.
import assert from 'node:assert/strict';
import { call } from './_harness.mjs';
import { pack, unpack } from '../../../_lib/save.mjs';

const log = (...a) => console.log('[smoke]', ...a);
const dev = 'devSmokeV4001';
let r = await call({ action: 'health' }); assert.equal(r.ok, true); log('health', r.api, 'store', r.storeName, 'sandbox', r.sandbox, 'actions', r.actions);
r = await call({ action: 'account.hello', dev, nick: 'Smoke', client: { ver: '3.4.0', platform: 'web' } }); assert.equal(r.ok, true);
const auth = { dev, token: r.token }; log('account', r.account.id, 'created', r.created);
r = await call({ action: 'config.get', ...auth, client: { ver: '3.4.0' } }); assert.equal(r.ok, true); log('config: items', r.catalog.items.length, 'featured', r.featured.join(','), 'ddlive', r.events.ddlive.map((e) => e.day).join(','), 'ab', JSON.stringify(r.ab));
r = await call({ action: 'save.push', ...auth, blob: pack({ v: 2, dev, nick: 'Smoke', credits: 10 }), base: 0, updatedAt: Date.now() }); assert.equal(r.version, 1);
r = await call({ action: 'save.pull', ...auth }); assert.equal(unpack(r.blob).credits, 10); log('save v' + r.version, r.hash);
r = await call({ action: 'daily.start', dev, nick: 'Smoke' }); assert.equal(r.ok, true); log('v3 daily through v4: no.', r.no, 'day', r.state.day);
r = await call({ action: 'v3.lb.top', dev }); assert.equal(r.ok, true);
r = await call({ action: 'wallet.purchase.verify', ...auth, provider: 'sandbox', item: 'credits.350', idem: 'smoke-1' }); assert.equal(r.granted.credits, 350);
r = await call({ action: 'wallet.spend', ...auth, item: 'cp.photos', idem: 'smoke-2' }); assert.equal(r.ok, true); log('wallet', r.wallet.balance, r.wallet.entitlements.join(','));
r = await call({ action: 'telemetry.batch', ...auth, events: [{ t: Date.now(), name: 'window.start', props: { mode: 'daily' } }] }); assert.equal(r.stored, 2);
r = await call({ action: 'ops.stats', token: 'ops-secret', days: 1 }); log('ops dau today', r.days[0].dau);
r = await call({ action: 'account.link.start', ...auth, email: 'smoke@example.test' }); assert.equal(r.sandbox, true);
r = await call({ action: 'account.link.finish', ...auth, link: r.link }); assert.equal(r.account.linked, true);
log('ok');
