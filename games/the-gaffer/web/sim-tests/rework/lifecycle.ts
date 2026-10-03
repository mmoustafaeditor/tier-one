// Rework M5: multi-season lifecycle regression. A real-world career plays several full seasons on the clock (the staff
// take every call), and at each season end the world must still pass its checks, a save must round-trip exactly, the
// two slots must stay apart, and the football must stay inside sane bands (goals, home wins, draws, talent level,
// squad sizes, club money). node sim-tests/build.mjs rework/lifecycle [seasons=3] [seed=7]
const mem: Record<string, string> = {};
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = String(v); }, removeItem: (k: string) => { delete mem[k]; } };
const { generateRealWorld } = await import('../../src/sim/seed');
const { newCareer, seasonOver, leagueOf } = await import('../../src/sim/season');
const { advance, endOfSeason } = await import('../../src/sim/clock');
const { checkWorld, squadOf } = await import('../../src/sim/world');
const { checkCareer, makeSave, parseSave, saveText, store, loadSlot, tidyCareer } = await import('../../src/sim/save');
const { seedAcademies } = await import('../../src/sim/youth');
import type { Career } from '../../src/model/types';

const seasons = +(process.argv[2] ?? 3);
const seed = +(process.argv[3] ?? 7);
let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };

let w = generateRealWorld(seed);
let c = newCareer(w, seed, 'eng-aston-villa', 'Test', { age: 40, nationality: 'ENG' }, 2026);
w = seedAcademies(w, c);
// A second career in slot 2, saved once and never touched again: it must load unchanged at the end.
const w2 = generateRealWorld(seed + 1);
const c2 = newCareer(w2, seed + 1, 'esp-betis', 'Other', { age: 45, nationality: 'ESP' }, 2026);
ok((await store(w2, c2, 2)).ok, 'slot 2: a second career is saved');

const top100 = () => w.players.filter((p) => p.clubId !== 'free').map((p) => p.rating).sort((a, b) => b - a).slice(0, 100).reduce((s, v) => s + v, 0) / 100;
const mean = () => { const a = w.players.filter((p) => p.clubId !== 'free'); return a.reduce((s, p) => s + p.rating, 0) / a.length; };
const start = { top: top100(), mean: mean(), budget: w.clubs.reduce((s, x) => s + x.budget, 0) };
console.log(`start: top100 ${start.top.toFixed(1)}, mean ${start.mean.toFixed(2)}, clubs ${w.clubs.length}, players ${w.players.length}`);

// League numbers of one season, all leagues.
function leagueStats(car: Career) {
  let n = 0, goals = 0, home = 0, draws = 0;
  for (const rounds of Object.values(car.fixtures)) for (const r of rounds) for (const [, , hg, ag] of r) {
    if (hg < 0) continue;
    n++; goals += hg + ag; if (hg > ag) home++; else if (hg === ag) draws++;
  }
  return { n, gpm: goals / Math.max(1, n), home: home / Math.max(1, n), draws: draws / Math.max(1, n) };
}

for (let s = 0; s < seasons; s++) {
  const t0 = performance.now();
  let steps = 0;
  while (!seasonOver(c) && steps < 2000) { const st = advance(w, c); w = st.world; c = st.career; steps++; }
  const ls = leagueStats(c);
  const lid = leagueOf(w, c.clubId);
  const secs = (performance.now() - t0) / 1000;
  console.log(`season ${c.season}: ${ls.n} league matches, ${ls.gpm.toFixed(2)} goals, home ${(ls.home * 100).toFixed(1)}%, draws ${(ls.draws * 100).toFixed(1)}%, ${steps} clock steps, ${secs.toFixed(1)} s`);
  ok(seasonOver(c), `season ${c.season} finishes on the clock`);
  ok(ls.gpm > 2.2 && ls.gpm < 3.4, `season ${c.season}: goals per match ${ls.gpm.toFixed(2)} inside 2.2–3.4`);
  ok(ls.home > 0.36 && ls.home < 0.54, `season ${c.season}: home wins ${(ls.home * 100).toFixed(1)}% inside 36–54%`);
  ok(ls.draws > 0.17 && ls.draws < 0.33, `season ${c.season}: draws ${(ls.draws * 100).toFixed(1)}% inside 17–33%`);
  const e = endOfSeason(w, c);
  w = e.world; c = e.career;
  const wi = checkWorld(w), ci = checkCareer(w, c);
  ok(!wi.length && !ci.length, `season end: world ${wi.length} / career ${ci.length} issues${wi.length || ci.length ? ' — ' + [...wi, ...ci].slice(0, 3).join('; ') : ''}`);
  const sizes = w.clubs.map((x) => squadOf(w, x.id).length);
  ok(Math.min(...sizes) >= 16 && Math.max(...sizes) <= 45, `season end: every squad between 16 and 45 (${Math.min(...sizes)}–${Math.max(...sizes)})`);
  const t = top100(), m = mean();
  ok(Math.abs(t - start.top) <= 3, `talent at the top stays level: top100 ${start.top.toFixed(1)} → ${t.toFixed(1)}`);
  ok(Math.abs(m - start.mean) <= 3, `talent overall stays level: mean ${start.mean.toFixed(2)} → ${m.toFixed(2)}`);
  const budgets = w.clubs.map((x) => x.budget);
  ok(budgets.every((b) => Number.isFinite(b)) && budgets.reduce((a, b) => a + b, 0) < start.budget * 4, `club money stays finite and doesn't run away (total ×${(budgets.reduce((a, b) => a + b, 0) / start.budget).toFixed(2)})`);
  // Save round trip: what loads is exactly what was saved. The app tidies before every save (App.commit: dangling
  // references to retired players go), so the test does the same.
  c = tidyCareer(w, c);
  const text = await saveText(w, c);
  const back = await parseSave(text);
  const same = back.ok && JSON.stringify((await makeSave(back.save.world as typeof w, back.save.career!)).world) === JSON.stringify((await makeSave(w, c)).world)
    && JSON.stringify(back.save.career) === JSON.stringify((await makeSave(w, c)).career);
  ok(same, `season end: the save round-trips exactly (${(text.length / 1024).toFixed(0)} KB packed)`);
  ok((await store(w, c, 1)).ok, 'slot 1: the career saves');
  console.log(`  table: ${lid}, user position ${(await import('../../src/sim/season')).table(w, c, lid).findIndex((r) => r.clubId === c.clubId) + 1}`);
}
const l1 = await loadSlot(1), l2 = await loadSlot(2);
ok(l1.ok && l1.save.career!.season === c.season && l1.save.career!.clubId === c.clubId, `slot 1 loads the latest season (${l1.ok ? l1.save.career!.season : '—'})`);
ok(l2.ok && l2.save.career!.clubId === c2.clubId && l2.save.career!.season === c2.season && l2.save.career!.round === c2.round, 'slot 2 is untouched by three seasons in slot 1');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
