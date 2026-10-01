// Tier One 4 economy test: `node scripts/economy4-test.mjs`. Bundles lib/economy.ts + lib/deals.ts + lib/meta.ts (the
// save on an in-memory localStorage, i18n/react stubbed) and drives a Daily, a Practice board and room rounds through the
// real on*Done with v4 Result4 boards from engine4: the Gain, the Sponsors (CONCEPT4 §4), Secret files, the season track,
// the one coin ledger and the one pack table.
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
  assert.deepEqual(eco.newUnlocks(1, 5), ['wire', 'live', 'groups']);
  assert.deepEqual(eco.newUnlocks(2, 5), ['live', 'groups']);
  assert.equal(eco.levelUnlocks.wire, 2); // Market calls at Level 2 (watching is free), RULES4 §3
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
ok('sponsors: a Local offer lands right after the first window; one slot without Gold; the offer line has the rate card', () => {
  assert.deepEqual(deals.offersFor(save.getSave()), []);
  save.update((s) => { deals.refreshOffers(s); });
  const offers = deals.offersFor(save.getSave());
  assert.equal(offers.length, 1); assert.equal(offers[0].tier, 'local'); assert.equal(offers[0].first, true); assert.deepEqual(offers[0].rate, [4, 8, 16]); assert.equal(offers[0].bonus, 60); assert.equal(offers[0].strikes, 3);
  assert.equal(deals.offerLine(offers[0]).v.h, 4); assert.equal(deals.offerDm(offers[0]).key, 'e4.sp.offer.first');
  assert.equal(deals.slotsFor(save.getSave()), 1); assert.ok(deals.accept(offers[0].id)); assert.equal(deals.active().length, 1); assert.deepEqual(deals.offersFor(save.getSave()), []);
  assert.equal(deals.tierOpen('national', save.getSave()), false); assert.equal(deals.nextTier(save.getSave()).tier, 'national');
});
const g = E4.newGame(E4.buildBoard('smoke-1'));
for (let i = 0; i < 5; i++) { E4.ask(g, i, 'barber'); E4.call(g, i, g.board.stories[i].truth, 2); } // all in, all right, day 1 (a test board: the truth is known)
E4.finish(g);
const r = { ...E4.resolve(g), rank: 3, players: 40 };
const gain = meta.onDailyDone('2026-10-06', 36, r);
ok('onDailyDone returns the Gain: XP 100 (Daily 60 + T1 40), level up to 2 with coins, rep +, followers +, files, sponsor lines per call', () => {
  assert.equal(r.tier, 'T1'); assert.ok(gain.xp >= 100, 'xp ' + gain.xp); assert.equal(gain.levelUp, true); assert.ok(gain.level >= 2);
  assert.ok(gain.repDelta >= 15, 'rep ' + gain.repDelta); assert.ok(gain.followersDelta > 1000, 'followers ' + gain.followersDelta);
  assert.equal(gain.rank, 'itk'); assert.equal(gain.rankUp, true); assert.ok(gain.files.includes('cleanSheet') && gain.files.includes('dayOne'), 'files ' + gain.files);
  const sp = gain.sponsor; assert.ok(sp, 'sponsor block'); assert.equal(sp.brand, deals.history()[0].brand);
  const perCall = sp.lines.filter((l) => l.i != null); assert.equal(perCall.length, 5); assert.ok(perCall.every((l) => l.kind === 'scoop' || l.kind === 'right'));
  const scoops = r.scoops, expectPaid = scoops * 32 + (5 - scoops) * 16 + 60;
  assert.equal(sp.paid, expectPaid, 'paid ' + sp.paid); assert.equal(sp.bonus, 60); assert.equal(sp.star, 1); assert.equal(gain.deal.status, 'paid'); assert.equal(gain.deal.coins, expectPaid);
  assert.ok(gain.coins >= expectPaid + 30 + 20, 'coins ' + gain.coins);
  const s = save.getSave(); assert.equal(s.daily['2026-10-06'].v, 4); assert.equal(s.ledger.some((l) => l.why.startsWith('sponsor:')), true);
  assert.equal(deals.standing(s, sp.brand).stars, 1); assert.equal(deals.active().length, 0); assert.equal(deals.history()[0].status, 'clean');
  assert.equal(byline.rankOf(s), 'itk'); assert.equal(s.season.xp, s.xp);
});
ok('wrong calls never cost coins: a wrong Hint is ignored, a wrong Post warns, a wrong Drop strikes; a window deal ends with the window; Practice never counts', () => {
  save.update((x) => { x.deals.cool = {}; x.deals.lastOffer = undefined; x.byline.followers = 20000; x.byline.rep = 60; deals.refreshOffers(x); });
  const o = deals.offersFor(save.getSave()); assert.ok(o.length >= 1 && o.length <= 3, 'offers ' + o.length);
  const nat = o.find((x) => x.tier === 'national') || o[0]; assert.ok(deals.accept(nat.id));
  const c0 = save.getSave().credits;
  const g2 = E4.newGame(E4.buildBoard('smoke-2')); for (let i = 0; i < 3; i++) { E4.ask(g2, i, 'barber'); E4.call(g2, i, (g2.board.stories[i].truth + 1) % 3, i); } E4.finish(g2);
  const gp = meta.onPracticeDone(E4.resolve(g2), false, 'p1'); assert.equal(gp.sponsor, undefined, 'practice never touches a sponsor'); assert.equal(deals.active().length, 1);
  const gr = meta.onRoomDone(E4.resolve(g2), { code: 'ROOM1', round: 1 });
  assert.ok(save.getSave().credits >= c0, 'wrong calls never cost coins'); assert.ok(!save.getSave().ledger.some((l) => l.why.startsWith('sponsor:') && l.d < 0));
  const kinds = gr.sponsor.lines.map((l) => l.kind); assert.deepEqual(kinds.slice(0, 3), ['miss', 'warn', 'strike']);
  if (nat.term === 'window') { assert.equal(deals.active().length, 0, 'a window deal ends with the window'); assert.equal(deals.history()[0].status, 'done'); assert.equal(deals.history()[0].bonus, 0, 'no bonus after a strike'); assert.equal(kinds[3], 'done'); }
  assert.deepEqual(eco.sponsorRate('local', 2), [6, 12, 24]); assert.deepEqual(eco.sponsorRate('global', 3), [26, 53, 105]);
});
ok('a Global week deal: ITK rank + 10,000 followers, warned first, walks on the second wrong Drop; you keep what was paid; standing drops a star', () => {
  save.update((x) => { x.deals.active = []; x.deals.offers = []; x.deals.lastOffer = undefined; const far = Date.now() + 30 * 864e5; x.deals.cool = { volt: far, oasis: far, kickoff: far, tempo: far }; x.byline.followers = 20000; x.byline.rep = 60; x.byline.rank = 2; deals.refreshOffers(x); });
  const gl = deals.offersFor(save.getSave()).find((x) => x.tier === 'global'); assert.ok(gl, 'a global offer'); assert.equal(gl.term, 'week'); assert.deepEqual(gl.rate, [15, 30, 60]); assert.equal(gl.strikes, 1); assert.equal(gl.warnFirst, true);
  assert.ok(deals.accept(gl.id));
  const g3 = E4.newGame(E4.buildBoard('smoke-3')); E4.ask(g3, 0, 'barber'); E4.call(g3, 0, g3.board.stories[0].truth, 2); E4.ask(g3, 1, 'barber'); E4.call(g3, 1, (g3.board.stories[1].truth + 1) % 3, 2); E4.finish(g3);
  const g1 = meta.onRoomDone(E4.resolve(g3), { code: 'ROOM1', round: 2 });
  const k1 = g1.sponsor.lines.map((l) => l.kind); assert.ok(k1.includes('warn'), 'warned first: ' + k1); assert.ok(!k1.includes('walked')); assert.equal(deals.active().length, 1, 'a week deal survives the window');
  const paidSoFar = deals.active()[0].p.paid; assert.ok(paidSoFar >= 60, 'a right Drop paid 60 or a Scoop 120: ' + paidSoFar);
  const g4 = E4.newGame(E4.buildBoard('smoke-4')); E4.ask(g4, 0, 'barber'); E4.call(g4, 0, (g4.board.stories[0].truth + 1) % 3, 2); E4.finish(g4);
  const g2r = meta.onRoomDone(E4.resolve(g4), { code: 'ROOM1', round: 3 });
  assert.equal(g2r.sponsor.walked, true); assert.equal(g2r.deal.status, 'pulled'); assert.equal(deals.active().length, 0); assert.equal(deals.standing(save.getSave(), gl.brand).walks, 1); assert.equal(deals.history()[0].paid, paidSoFar);
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
