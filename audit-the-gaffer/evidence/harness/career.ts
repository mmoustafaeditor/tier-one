// Audit harness: multi-season careers, staff-recommended choice on every decision, all matches simulated.
import { generateRealWorld } from '/home/user/tier-one/games/the-gaffer/web/src/sim/seed';
import { newCareer, seasonOver, table } from '/home/user/tier-one/games/the-gaffer/web/src/sim/season';
import { advance, endOfSeason } from '/home/user/tier-one/games/the-gaffer/web/src/sim/clock';
import { dispatch } from '/home/user/tier-one/games/the-gaffer/web/src/sim/commands';
import { decisions } from '/home/user/tier-one/games/the-gaffer/web/src/sim/decisions';
import { checkWorld, squadOf } from '/home/user/tier-one/games/the-gaffer/web/src/sim/world';
import { FREE_AGENT } from '/home/user/tier-one/games/the-gaffer/web/src/model/types';
import { checkCareer } from '/home/user/tier-one/games/the-gaffer/web/src/sim/save';
import type { World } from '/home/user/tier-one/games/the-gaffer/web/src/sim/world';
const [clubId, seasons = '3', seed = '7', mode = 'pick'] = process.argv.slice(2);
let w: World = generateRealWorld(+seed);
let c = newCareer(w, +seed, clubId, 'Audit', { age: 40, nationality: 'ENG' }, 2026);
const out: any[] = [];
const top = (ids: string[]) => ids.length;
const snap = (w: World) => {
  const lg = w.clubs.find((x) => x.id === c.clubId)!.leagueId;
  const sq = squadOf(w, c.clubId);
  const r = sq.map((p) => p.rating).sort((a, b) => b - a);
  const lc = w.clubs.filter((x) => x.leagueId === lg);
  const sizes = lc.map((x) => squadOf(w, x.id).length);
  const top11 = (id: string) => { const rr = squadOf(w, id).map((p) => p.rating).sort((a, b) => b - a).slice(0, 11); return rr.reduce((s, v) => s + v, 0) / Math.max(1, rr.length); };
  const lgStr = lc.map((x) => top11(x.id)).sort((a, b) => b - a);
  const all = w.players.filter((p) => p.clubId !== FREE_AGENT).map((p) => p.rating).sort((a, b) => b - a);
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  return {
    cash: Math.round(club.budget / 1e3), cap: Math.round(club.wageCap / 1e3), bill: Math.round(sq.reduce((s, p) => s + p.wage, 0) / 1e3),
    squad: sq.length, top11: +(r.slice(0, 11).reduce((s, v) => s + v, 0) / 11).toFixed(1), age: +(sq.reduce((s, p) => s + (c.season - p.birthYear), 0) / sq.length).toFixed(1),
    morale: Math.round(sq.reduce((s, p) => s + p.morale, 0) / sq.length), minMorale: Math.min(...sq.map((p) => p.morale)),
    inj: sq.filter((p) => p.injured > 0).length, board: Math.round(c.board.confidence), fans: Math.round(c.board.fans), coh: club.cohesion ?? 55,
    lgSizeMin: Math.min(...sizes), lgSizeMax: Math.max(...sizes), lgTop11Best: +lgStr[0].toFixed(1), lgTop11Worst: +lgStr[lgStr.length - 1].toFixed(1),
    worldTop100: +(all.slice(0, 100).reduce((s, v) => s + v, 0) / 100).toFixed(1), worldN: all.length,
    expiring: sq.filter((p) => p.contractUntil <= c.season + 1).length,
  };
};
const log: any = { club: clubId, seed: +seed, mode, start: snap(w), seasons: [] };
const t0 = performance.now();
let decisionsSeen = 0, refused: Record<string, number> = {}, kinds: Record<string, number> = {};
for (let s = 0; s < +seasons; s++) {
  const perRound: any[] = [];
  let res = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  while (!seasonOver(c) && !c.sacked) {
    const ds = decisions(w, c);
    decisionsSeen += ds.length;
    for (const d of ds) {
      kinds[d.kind + '/' + d.title.key] = (kinds[d.kind + '/' + d.title.key] ?? 0) + 1;
      if (mode === 'ignore') continue;
      const ch = d.kind === 'job' ? d.choices.find((x) => x.id === 'stay')! : (d.choices.find((x) => x.pick) ?? d.choices[0]);
      for (const cmd of ch.cmds) { const r = dispatch(w, c, cmd); if (r.ok) { w = r.world; c = r.career; } else refused[cmd.type + ':' + r.reason] = (refused[cmd.type + ':' + r.reason] ?? 0) + 1; }
      const r = dispatch(w, c, { type: 'decision.done', id: d.id }); if (r.ok) { w = r.world; c = r.career; }
    }
    const st = advance(w, c); w = st.world; c = st.career;
    if (st.after) { const a = st.after; if (a.res === 'W') res.w++; else if (a.res === 'D') res.d++; else res.l++; res.gf += a.mine; res.ga += a.theirs; }
    if (c.round % 5 === 0) perRound.push({ r: c.round, ...snap(w) });
  }
  const lg = w.clubs.find((x) => x.id === c.clubId)!.leagueId;
  const tb = table(w, c, lg);
  const pos = tb.findIndex((x) => x.clubId === c.clubId) + 1;
  const pre = snap(w);
  const ledger = { ...c.ops.ledger };
  if (c.sacked) { log.seasons.push({ season: c.season, sacked: true, round: c.round, pos, res, pre, perRound, ledger }); break; }
  const e = endOfSeason(w, c); w = e.world; c = e.career;
  log.seasons.push({ season: c.season - 1, pos, obj: e.summary.record.objective, met: e.summary.record.met, champ: e.summary.record.champion, res, pts: tb[pos - 1].pts,
    left: e.summary.left.length, academy: e.summary.academy.length, retired: e.summary.retired, cups: e.summary.cups, jobs: c.jobs.length, sackedAtEnd: !!c.sacked,
    lastLedger: c.ops.lastLedger, pre, post: snap(w), perRound, checkWorld: checkWorld(w).length, checkCareer: checkCareer(w, c).length });
  if (c.sacked) break;
}
log.decisionsSeen = decisionsSeen; log.kinds = kinds; log.refused = refused; log.secs = Math.round((performance.now() - t0) / 1000);
console.log(JSON.stringify(log));
