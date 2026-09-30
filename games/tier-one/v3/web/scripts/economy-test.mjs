// Node test for the wallet ledger and the catalog (GOTY.md §8.4): `node scripts/economy-test.mjs`.
// Bundles lib/wallet.ts + lib/catalog.ts with esbuild (the save layer runs on an in-memory localStorage; i18n is
// stubbed to return keys) and checks: catalog validation, legacy ids, featured rotation, buy/equip/refund/gift,
// idempotent earning, referral capture, price display, and the fairness rule (no item can carry an effect).
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '../src');
const out = mkdtempSync(join(process.env.SCRATCH || tmpdir(), 't1eco-'));

// ---------- browser-ish globals the save layer needs
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.window = globalThis; Object.defineProperty(globalThis, 'navigator', { value: { language: 'en-GB' }, configurable: true });
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

const stub = join(out, 'i18n-stub.js');
writeFileSync(stub, `export const t = (k, v) => k + (v ? ' ' + JSON.stringify(v) : ''); export const tl = () => []; export const useT = () => t; export const num = (n) => String(n); export const fmtDate = () => '';`);
writeFileSync(join(out, 'synth.js'), 'export default { play() {} };');
writeFileSync(join(out, 'react.js'), 'export const useSyncExternalStore = () => { throw new Error("no react in the node test"); };');
const entry = join(out, 'entry.ts');
writeFileSync(entry, `export * as wallet from '${SRC}/lib/wallet.ts'; export * as catalog from '${SRC}/lib/catalog.ts'; export * as save from '${SRC}/lib/save.ts'; export * as season from '${SRC}/lib/season.ts';`);
await build({
  entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: join(out, 'bundle.mjs'), logLevel: 'error',
  plugins: [{ name: 'stubs', setup(b) {
    b.onResolve({ filter: /(^|\/)i18n$/ }, () => ({ path: stub }));
    b.onResolve({ filter: /\/synth$/ }, () => ({ path: join(out, 'synth.js') }));
    b.onResolve({ filter: /^react$/ }, () => ({ path: join(out, 'react.js') })); // the save layer's hook is never called here
  } }],
});
const { wallet: W, catalog: C, save: S } = await import(pathToFileURL(join(out, 'bundle.mjs')).href);

let n = 0; const ok = (name, f) => { f(); n++; console.log('  ok  ' + name); };
const NOW = Date.UTC(2026, 9, 5, 12); // 5 Oct 2026, inside the Rumour Mill 2026 season

console.log('catalog');
ok('validates with no errors', () => { const e = C.validateCatalog(NOW); assert.deepEqual(e, []); });
ok('every kind has a standard look and the tab order covers every kind', () => { for (const k of C.KINDS) assert.equal(C.standardOf(k).id, 'std.' + k); assert.equal(new Set(C.KINDS).size, 12); });
ok('legacy season.ts ids resolve unchanged', () => {
  for (const id of ['frame.press', 'ink.blue', 'ring.whistle', 'flair.star', 'desk.oak', 'salmon', 'ev.rival', 'rumour-2026.x', 'rumour-2026.g8']) { const it = C.item(id); assert.ok(it, id); assert.equal(it.id, id); assert.equal(it.kind, C.legacy(it).kind); }
  assert.equal(C.item('frame.press').price.coins, 150); assert.equal(C.item('rumour-2026.x').source, 'track'); assert.equal(C.item('rumour-2026.g8').rarity, 'legendary');
});
ok('season-limited items carry the season window and Gold costs exactly one pack', () => {
  const by = C.item('rumour-2026.by'); assert.ok(by.window && by.window.from < NOW && NOW < by.window.to);
  assert.equal(C.onSale(by, NOW), true); assert.equal(C.onSale(by, Date.UTC(2027, 1, 10)), false);
  const g = C.item('gold.rumour-2026'); assert.equal(g.kind, 'gold'); assert.equal(g.price.credits, C.GOLD_CREDITS);
  assert.equal(W.CREDIT_PACKS.find((p) => p.tag === 'gold').credits, C.GOLD_CREDITS);
});
ok('an item can never carry an effect (unknown keys are refused)', () => {
  const bad = { ...C.item('by.redtop'), bonus: { coins: 0.1 } }; assert.ok(C.validateItem(bad).some((e) => /unknown keys/.test(e)));
  const adv = { ...C.item('by.redtop'), price: { coins: 10, contacts: 1 } }; assert.ok(C.validateItem(adv).some((e) => /price has/.test(e)));
});
ok('featured rotation: three items, one per kind, deterministic, never above the usual price, different next week', () => {
  const a = C.featuredView(NOW), b = C.featuredView(NOW), c = C.featuredView(NOW + 7 * 864e5);
  assert.deepEqual(a.items.map((x) => x.item.id), b.items.map((x) => x.item.id));
  assert.equal(new Set(a.items.map((x) => x.item.kind)).size, a.items.length);
  for (const x of a.items) { if (x.was.credits) assert.ok(x.price.credits < x.was.credits); if (x.was.coins) assert.ok(x.price.coins < x.was.coins); assert.ok(!c.items.some((y) => y.item.id === x.item.id)); }
  assert.ok(a.ends > NOW && a.ends - NOW <= 7 * 864e5);
});
ok('credit packs: honest tiers, none over €20, bonus grows with size', () => {
  let last = -1; for (const p of W.CREDIT_PACKS) { assert.ok(p.eur <= 20); const b = W.packBonus(p); assert.ok(b >= last); last = b; }
});

console.log('wallet');
const reset = (extra = {}) => { const s = { ...S.fresh(), nick: 'Sam', onboarded: true, credits: 500, owned: [], wallet: { credits: 0, ledger: [], earned: {} }, desk: { equip: {} }, ...extra }; store.set('tierone_v3', JSON.stringify(s)); S.update((x) => Object.assign(x, s)); };
reset();
ok('starts empty; balances read both currencies', () => { assert.deepEqual(W.balances(S.getSave()), { coins: 500, credits: 0 }); assert.equal(W.ledger().length, 0); });
ok('earning is idempotent per key and lands in the ledger', () => {
  assert.ok(W.awardFirstTier1()); assert.equal(W.awardFirstTier1(), null);
  assert.equal(W.balance('credits'), W.CREDITS_EARN.firstT1);
  assert.equal(W.awardStreak(29), null); assert.ok(W.awardStreak(30)); assert.equal(W.awardStreak(30), null); assert.ok(W.awardStreak(60));
  assert.ok(W.awardSeasonEnd('summer-2026', 40)); assert.equal(W.awardSeasonEnd('summer-2026', 40), null);
  assert.equal(W.balance('credits'), 30 + 40 + 40 + 25 + 25);
  assert.equal(W.ledger()[0].cur, 'credits'); assert.ok(W.ledger().every((e) => e.id));
});
ok('earning inside an update() draft works (no nested update)', () => {
  S.update((s) => { W.earnCredits('draft:1', 5, 'earn:test', s); W.earnCredits('draft:1', 5, 'earn:test', s); });
  assert.equal(W.balance('credits'), 165);
});
ok('buy with coins: pays, owns, equips, writes both ledgers', () => {
  const want = C.priceNow(C.item('frame.press'), NOW).coins; // 150, or 130 in a week it is featured
  const r = W.buy('frame.press', 'coins', NOW); assert.equal(r.ok, true); assert.equal(r.n, want);
  const s = S.getSave(); assert.equal(s.credits, 500 - want); assert.ok(s.owned.includes('frame.press')); assert.equal(s.equip.frame, 'frame.press');
  assert.equal(W.equipped('frame').id, 'frame.press'); assert.equal(s.ledger[0].why, 'buy:frame.press'); assert.equal(W.ledger()[0].item, 'frame.press');
  assert.deepEqual(W.buy('frame.press', 'coins', NOW), { ok: false, error: 'owned' });
});
ok('buy with credits at the featured price when featured, else the usual price', () => {
  const f = C.featuredView(NOW).items.find((x) => x.item.price.credits && !x.pinned);
  W.earnCredits('test:topup', 1000, 'earn:test');
  const before = W.balance('credits'); const r = W.buy(f.item.id, 'credits', NOW); assert.equal(r.ok, true); assert.equal(before - W.balance('credits'), f.price.credits);
  assert.ok(f.price.credits < f.item.price.credits);
});
ok('short, off-window and unknown items are refused without touching balances', () => {
  S.update((x) => { x.wallet.credits = 10; });
  const b = W.balances(S.getSave());
  assert.equal(W.buy('sc.gilt', 'credits', NOW).error, 'short'); assert.equal(W.buy('winter-2027.by', 'credits', NOW).error, 'window'); assert.equal(W.buy('nope', 'coins', NOW).error, 'bad'); assert.equal(W.buy('std.byline', 'coins', NOW).error, 'bad');
  assert.deepEqual(W.balances(S.getSave()), b);
});
ok('equip / take off, only what you own, kind-checked', () => {
  assert.equal(W.equipItem('sc.gilt', 'sharecard'), false); assert.equal(W.equipItem('frame.press', 'ink'), false);
  assert.equal(W.equipItem(null, 'frame'), true); assert.equal(W.equipped('frame').id, 'std.frame');
  assert.equal(W.equipItem('frame.press', 'frame'), true); assert.equal(W.isEquipped('frame.press'), true);
});
ok('refund within 48 h returns the money and takes the item off; twice is refused', () => {
  const e = W.ledger().find((x) => x.why === 'buy:frame.press'); const coins = S.getSave().credits;
  const r = W.refund(e.id); assert.equal(r.ok, true); assert.equal(S.getSave().credits, coins - e.d); assert.ok(!S.getSave().owned.includes('frame.press')); assert.equal(W.equipped('frame').id, 'std.frame');
  assert.equal(W.refund(e.id).error, 'bad'); assert.equal(S.getSave().wallet.refunds, 1);
  S.update((s) => { const x = s.wallet.ledger.find((y) => y.why.startsWith('buy:') && !y.refunded); x.at -= 49 * 36e5; });
  assert.equal(W.refund(W.ledger().find((y) => y.why.startsWith('buy:') && !y.refunded).id).error, 'late');
});
ok('Gold: bought with credits for this season only; refund refused once a Gold reward is claimed', () => {
  reset({ wallet: { credits: 400, ledger: [], earned: {} } });
  const r = W.buy('gold.rumour-2026', 'credits', NOW); assert.equal(r.ok, true); assert.equal(S.getSave().season.gold, true); assert.equal(W.owns('gold.rumour-2026'), true);
  S.update((s) => { s.season.claimed.push('g5'); }); assert.equal(W.refund(r.id).error, 'late');
});
ok('gifting: credits only, valid code, not yourself, queued in the outbox', () => {
  reset({ wallet: { credits: 200, ledger: [], earned: {} } });
  const me = W.referralCode(S.getSave()); assert.match(me, /^[A-Z2-9]{6}$/);
  assert.equal(W.gift('by.redtop', me).error, 'self'); assert.equal(W.gift('by.redtop', 'abc').error, 'bad'); assert.equal(W.gift('paper.name', 'ABC234').error, 'nogift'); assert.equal(W.gift('frame.press', 'ABC234').error, 'nogift');
  const r = W.gift('by.redtop', 'abc234', 'for the scoop'); assert.equal(r.ok, true); assert.equal(W.balance('credits'), 120);
  assert.equal(W.giftOutbox()[0].to, 'ABC234'); assert.equal(W.giftOutbox()[0].status, 'queued'); assert.equal(W.ledger()[0].to, 'ABC234');
  assert.equal(W.receiveGift('g1', 'sc.night', 'ABC234'), true); assert.equal(W.receiveGift('g1', 'sc.night', 'ABC234'), false); assert.ok(S.getSave().owned.includes('sc.night'));
});
ok('referral: captured once, never your own code, pays the friend after the first window', () => {
  reset(); const me = W.referralCode(S.getSave());
  assert.equal(W.captureReferral('?ref=' + me), null); assert.equal(W.captureReferral('?ref=zz'), null);
  assert.equal(W.captureReferral('?ref=qwerty'), 'QWERTY'); assert.equal(W.captureReferral('?ref=ABC234'), null);
  assert.ok(W.onFirstWindowFinished()); assert.equal(W.onFirstWindowFinished(), null); assert.equal(W.balance('credits'), W.CREDITS_EARN.referral);
  assert.ok(W.onReferralConfirmed('ABC234')); assert.equal(W.onReferralConfirmed('ABC234'), null); assert.equal(S.getSave().wallet.ref.friends, 1);
});
ok('paper name needs the purchase; is cleaned and capped', () => {
  reset({ wallet: { credits: 200, ledger: [], earned: {} } });
  assert.equal(W.setPaperName('The Chronicle'), false); assert.equal(W.paperName(), 'Tier One');
  assert.equal(W.buy('paper.name', 'credits', NOW).ok, true); assert.equal(W.setPaperName('  The <b>Chronicle</b> of a very very long name  '), true);
  assert.equal(W.paperName(), 'The bChronicle/b of a ve'); assert.ok(W.paperName().length <= W.PAPER_NAME_MAX);
});
ok('what other screens read: bylineStyle / shareStyle / posterStyle follow what is equipped', () => {
  reset({ wallet: { credits: 1000, ledger: [], earned: {} } });
  assert.equal(W.shareStyle().style, 'classic'); assert.equal(W.shareStyle().frame, null);
  W.buy('sc.night', 'credits', NOW); W.buy('po.neon', 'credits', NOW); W.buy('by.wire', 'credits', NOW); W.buy('frame.tape', 'coins', NOW);
  assert.equal(W.shareStyle().style, 'night'); assert.equal(W.shareStyle().frame.pat, 'tape'); assert.ok(W.posterStyle().boxShadow.includes('#FF5A7A')); assert.equal(W.bylineStyle()['--by-acc'], '#35C3E6');
});
ok('price display helpers', () => {
  const both = W.priceText({ credits: 80, coins: 400 }); assert.ok(both.startsWith('eco.price.or') && both.includes('eco.price.credits') && both.includes('eco.price.coins'));
  assert.ok(W.priceText({ credits: 80, coins: 400 }, 'coins').startsWith('eco.price.coins')); assert.ok(!W.priceText({ credits: 80 }).includes('coins'));
  assert.equal(W.priceText({}), 'eco.price.free'); assert.equal(W.shortBy({ credits: 2000 }, 'credits'), 2000 - W.balance('credits'));
});
ok('the v4 sync sink receives every entry with its idempotency key', async () => {
  const seen = []; W.setWalletSync({ async push(e) { seen.push(e.id); } });
  W.earnCredits('sync:1', 1, 'earn:test'); W.buy('pp.pitch', 'coins', NOW);
  await new Promise((r) => setTimeout(r, 5)); assert.equal(seen.length, 2); W.setWalletSync(null);
});
console.log(`\n${n} checks passed`);
