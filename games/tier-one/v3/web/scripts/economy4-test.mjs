// Tier One 4 economy test: `node scripts/economy4-test.mjs`. Bundles lib/economy.ts + lib/deals.ts + lib/meta.ts (save on an in-memory localStorage, i18n/react stubbed) and
// drives one Daily through onDailyDone with a v4 Result4 from engine4: the Gain, a brand deal, a Secret file.
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src');
const out = mkdtempSync(join(process.env.SCRATCH || tmpdir(), 't1eco4-'));
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.window = globalThis; Object.defineProperty(globalThis, 'navigator', { value: { language: 'en-GB' }, configurable: true });
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.document = { addEventListener() {}, getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {} }), head: { appendChild() {} }, documentElement: { dataset: {}, setAttribute() {} } };
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.location = { protocol: 'https:', hostname: 'localhost', href: 'https://localhost/', search: '', pathname: '/', origin: 'https://localhost' };
globalThis.history = { replaceState() {} };
writeFileSync(join(out, 'i18n.js'), `export const t = (k) => k; export const tr = (l, k) => k; export const trList = () => []; export const tl = () => []; export const useT = () => t; export const num = (n) => String(n); export const fmtDate = () => ''; export const has = () => true; export const fill = (s) => s; export const LANGS = [];`);
writeFileSync(join(out, 'react.js'), `export const useRef = () => ({ current: null }); export const useSyncExternalStore = () => { throw new Error('no react'); }; export const useState = () => []; export const useEffect = () => {}; export default {};`);
writeFileSync(join(out, 'synth.js'), 'export default { play() {} };');
writeFileSync(join(out, 'entry.ts'), `export * as eco from '${SRC}/lib/economy.ts'; export * as deals from '${SRC}/lib/deals.ts'; export * as meta from '${SRC}/lib/meta.ts'; export * as save from '${SRC}/lib/save.ts'; export * as byline from '${SRC}/lib/byline.ts'; export * as season from '${SRC}/lib/season.ts'; export * as wallet from '${SRC}/lib/wallet.ts'; export * as catalog from '${SRC}/lib/catalog.ts'; export { E4 } from '${SRC}/lib/engine.ts';`);
await build({
  entryPoints: [join(out, 'entry.ts')], bundle: true, format: 'esm', platform: 'node', outfile: join(out, 'bundle.mjs'), logLevel: 'error',
  plugins: [{ name: 'stubs', setup(b) {
    b.onResolve({ filter: /(^|\/)i18n$/ }, () => ({ path: join(out, 'i18n.js') }));
    b.onResolve({ filter: /\/synth$/ }, () => ({ path: join(out, 'synth.js') }));
    b.onResolve({ filter: /^react$/ }, () => ({ path: join(out, 'react.js') }));
  } }],
});
const M = await import(pathToFileURL(join(out, 'bundle.mjs')).href);
const { eco, deals, meta, save, byline, season, wallet, catalog, E4 } = M;
let n = 0; const ok = (name, f) => { f(); n++; console.log('  ok  ' + name); };

ok('level maths: 100 + 30 × (L − 1); level 2 in a session, 10 in ~11 days, 25 in ~2 months', () => {
  assert.equal(eco.xpForLevel(1), 100); assert.equal(eco.xpForLevel(5), 220);
  assert.equal(eco.levelOf(125).n, 2); assert.equal(eco.levelOf(1980).n, 10); assert.equal(eco.levelOf(10680).n, 25); assert.equal(eco.levelOf(40180).n, 50);
  assert.equal(eco.levelCoins(3), 30); assert.equal(eco.levelCoins(30), 200);
  assert.deepEqual(eco.newUnlocks(2, 5), ['live', 'groups', 'wire']);
  assert.ok(eco.regularDayXp() >= 170 && eco.regularDayXp() <= 190);
});
ok('rep and followers by backing, mode factor, hot streak, ranks kept and under review', () => {
  assert.equal(eco.repDelta('daily', 2, true, true), 5); assert.equal(eco.repDelta('daily', 2, false, false), -6); assert.equal(eco.repDelta('practice', 2, true, true), 0); assert.equal(eco.repDelta('wire', 1, false, false), -1);
  assert.equal(eco.followerDelta('daily', 2, true, true, 0), 520); assert.equal(eco.followerDelta('daily', 2, true, true, 10), 1040); assert.equal(eco.followerDelta('wire', 0, false, false, 3), -30); assert.equal(eco.followerDelta('practice', 1, true, false, 0), 25);
  assert.equal(eco.rankByRep(54), 'rising'); assert.equal(eco.rankHeld(30, 3), 'insider'); assert.equal(eco.underReview(59, 3), true); assert.equal(eco.underReview(61, 3), false);
  assert.equal(eco.seasonTierOf(12000).n, 30); assert.equal(eco.seasonTierOf(799).n, 2);
  assert.deepEqual(eco.lookPrice('epic'), { coins: 900 }); assert.deepEqual(eco.lookPrice('legendary'), { credits: 300 });
  assert.equal(eco.trustOfXp(560), 1); assert.equal(eco.trustOfXp(0), 0);
});
ok('the one pack table comes from catalog.json; Gold is the 350 pack', () => {
  assert.deepEqual(catalog.CREDIT_PACKS.map((p) => p.credits), [100, 350, 800, 1800]); assert.equal(catalog.GOLD_CREDITS, 350);
  assert.equal(catalog.CREDIT_PACKS[1].price, '€4.99'); assert.equal(catalog.STARTER.level, 3); assert.equal(catalog.COIN_PACKS.length, 3);
  assert.equal(wallet.CREDITS_EARN.firstT1, 30); assert.equal(wallet.CREDIT_PACKS, catalog.CREDIT_PACKS);
  assert.deepEqual(catalog.validateCatalog(Date.UTC(2026, 9, 5)), []);
  assert.equal(catalog.item('rumour-2026.g10').rarity, 'legendary'); assert.equal(catalog.item('rumour-2026.f1').kind, 'wallpaper');
  assert.equal(catalog.priceNow(catalog.item('wp.redtop')).coins, 400);
});
// a Daily through onDailyDone with a v4 board
save.update((s) => { s.byline = { followers: 400, rep: 40, hot: 0, best: 0, rank: 1 }; s.credits = 0; s.xp = 0; s.pp = 0; });
const offers = deals.offersFor(save.getSave());
ok('Volt slides into the DMs once followers 300 and Rep 32 are crossed; one slot without Gold', () => {
  assert.equal(offers.length, 1); assert.equal(offers[0].brand, 'volt'); assert.ok(offers[0].payout >= 150);
  assert.equal(deals.slotsFor(save.getSave()), 1); assert.ok(deals.accept(offers[0].id)); assert.equal(deals.active().length, 1); assert.deepEqual(deals.offersFor(save.getSave()), []);
});
const g = E4.newGame(E4.buildBoard('smoke-1'));
for (let i = 0; i < 5; i++) { E4.ask(g, i, 'barber'); E4.call(g, i, g.board.stories[i].truth, 2); } // all in, all right, day 1 (a test board: the truth is known)
E4.finish(g);
const r = { ...E4.resolve(g), rank: 3, players: 40 };
const gain = meta.onDailyDone('2026-10-06', 36, r);
ok('onDailyDone returns the Gain: XP 100 (Daily 60 + T1 40), level up to 2 with coins, rep +, followers +, files', () => {
  assert.equal(r.tier, 'T1'); assert.ok(gain.xp >= 100, 'xp ' + gain.xp); assert.equal(gain.levelUp, true); assert.ok(gain.level >= 2);
  assert.ok(gain.coins >= 30 + 20, 'coins ' + gain.coins); assert.ok(gain.repDelta >= 15, 'rep ' + gain.repDelta); assert.ok(gain.followersDelta > 1000, 'followers ' + gain.followersDelta);
  assert.equal(gain.rank, 'itk'); assert.equal(gain.rankUp, true); assert.ok(gain.files.includes('cleanSheet') && gain.files.includes('dayOne'), 'files ' + gain.files);
  const s = save.getSave(); assert.equal(s.daily['2026-10-06'].v, 4); assert.equal(s.ach.cleanSheet > 0, true); assert.equal(s.ledger.some((l) => l.why === 'daily:36'), true);
  assert.equal(byline.rankOf(s), 'itk'); assert.equal(s.season.xp, s.xp);
});
ok('a window-term deal resolves with the window (paid or missed), a wrong Drop pulls it, the ledger says deal:volt', () => {
  const s = save.getSave(); const done = deals.history(s);
  assert.equal(done.length, 1); assert.equal(done[0].brand, 'volt'); assert.ok(['paid', 'missed'].includes(done[0].status));
  if (done[0].status === 'paid') { assert.ok(gain.deal && gain.deal.status === 'paid'); assert.ok(s.ledger.some((l) => l.why === 'deal:volt')); }
  assert.ok(s.deals.cool.volt > Date.now());
  // a wrong Drop during a deal
  save.update((x) => { x.deals.cool = {}; x.byline.followers = 20000; x.byline.rep = 60; });
  const o2 = deals.offersFor(save.getSave()); assert.ok(o2.length >= 2); assert.ok(deals.accept(o2.find((o) => o.brand === 'tempo').id));
  const g2 = E4.newGame(E4.buildBoard('smoke-2')); E4.ask(g2, 0, 'barber'); E4.call(g2, 0, (g2.board.stories[0].truth + 1) % 3, 2); E4.finish(g2);
  const gain2 = meta.onPracticeDone(E4.resolve(g2), false, 'p1'); assert.equal(gain2.deal, undefined, 'practice never touches a deal');
  const gain3 = meta.onRoomDone(E4.resolve(g2), { code: 'ROOM1', round: 1 });
  assert.equal(gain3.deal && gain3.deal.status, 'pulled'); assert.equal(deals.active().length, 0);
});
ok('season track: 30 tiers, free look every 5, Gold look every 3, Legendary at 30; claims pay through the one ledger', () => {
  const tv = season.trackView(save.getSave()); assert.equal(tv.rows.length, 30); assert.equal(tv.rows[4].free.cos, 'rumour-2026.f1'); assert.equal(tv.rows[2].gold.cos, 'rumour-2026.g1'); assert.equal(tv.rows[29].gold.cos, 'rumour-2026.g10'); assert.equal(tv.rows[0].free.coins, 20);
  const c0 = save.getSave().credits; const paid = season.claimReward('free', 1); assert.equal(paid.coins, 20); assert.equal(save.getSave().credits, c0 + 20);
});
ok('coins: the shop buys with coins through the one ledger; coffee, extras and the handle are priced from economy.ts', () => {
  save.update((x) => { x.credits = 1000; });
  const tx = wallet.buy('wp.redtop', 'coins'); assert.equal(tx.ok, true); assert.equal(save.getSave().credits, 600); assert.ok(save.getSave().owned.includes('wp.redtop')); assert.equal(wallet.equipped('wallpaper').id, 'wp.redtop');
  assert.equal(season.buyCosmetic('frame.press'), true); assert.equal(save.getSave().credits, 450);
  assert.equal(wallet.buyCareerExtra('extraDm', 'w1'), true); assert.equal(wallet.buyCareerExtra('tipoff', 'w1'), true); assert.equal(wallet.buyCareerExtra('tipoff', 'w1'), false, 'two a window');
  assert.equal(save.getSave().credits, 350); assert.equal(wallet.renamePrice(), 0); assert.equal(wallet.renameHandle('MagsDoyle').ok, true); assert.equal(wallet.renamePrice(), 250);
});
console.log(`\n${n} checks passed`);
