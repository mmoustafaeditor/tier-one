// Tier One 4 balance sim: a handful of player types play N boards of each mode. `node sim4.mjs [n] [mode]`
import * as E from '../../../../api/tier-one/v3/_lib/engine4.mjs';
import { RNG, mean, q, pct } from '../../../../api/tier-one/v3/_lib/rng.mjs';

const N = +process.argv[2] || 2000, MODE = process.argv[3] || 'daily';
const K = JSON.parse(process.env.K || '{}');   // knob overrides for tuning, e.g. K='{"WIN":[10,20,30]}'
const R0 = MODE === 'daily' ? structuredClone(E.RULES) : E.rulesFor(MODE.split(':')[0], { rank: +(MODE.split(':')[1] || 0) });
Object.assign(R0, K);

// What a person can add up: each read/post is a vote with an integer weight printed on the contact card.
const VOTE = { barber: 1, kitman: 1, agent: 2, spotter: 3, physio: 5, tabloid: 1, itk: 1, insider: 3 };
function votes(g, i) {
  const t = [0, 0, 0];
  for (const c of g.clues[i]) {
    const so = g.R.SOURCES[c.src];
    if (so.says && so.says.length === 2) { if (c.r === 0) { t[0] += 0.5; t[1] += 0.5; } else t[2] += 1; }
    else t[c.r] += VOTE[c.src];
  }
  for (const f of g.feed) if (f.i === i) t[f.claim] += VOTE[f.id];
  return t;
}
const best = (a) => a.indexOf(Math.max(...a));
const evOf = (g, i, p) => { let b = { ev: 0, o: -1, s: -1 }; for (let o = 0; o < 3; o++) for (let s = 0; s < 3; s++) { const pv = E.preview(g, i, o, s), ev = p[o] * pv.win + (1 - p[o]) * pv.lose; if (ev > b.ev) b = { ev, o, s }; } return b; };

// --- players -------------------------------------------------------------------------------------------------------
const P = {
  // Taps around: a couple of random contacts a story, posts the loudest answer backed ×2 on day 2.
  casual(g, rng) {
    for (let i = 0; i < g.R.STORIES; i++) if (!g.calls[i]) for (const src of rng.shuffle(E.SRC).slice(0, 2)) E.ask(g, i, src);
    if (g.day >= Math.min(2, g.R.DAYS)) for (let i = 0; i < g.R.STORIES; i++) if (!g.calls[i] && g.clues[i].length) E.call(g, i, best(votes(g, i)), 1);
  },
  // Plays it like the cards say: free barber, best contacts on the unsure stories, posts when the votes clearly lead.
  reader(g, rng, th = { lead: [4, 4, 3, 3, 1], all: 5 }) {
    for (let i = 0; i < g.R.STORIES; i++) E.ask(g, i, 'barber');
    const order = [...Array(g.R.STORIES).keys()].filter((i) => !g.calls[i]).sort((a, b) => lead(g, a) - lead(g, b));
    for (const src of ['physio', 'spotter', 'agent', 'kitman']) for (const i of order) if (g.left > 0) E.ask(g, i, src);
    const last = g.day === g.R.DAYS;
    for (let i = 0; i < g.R.STORIES; i++) {
      if (g.calls[i]) continue;
      const v = votes(g, i), o = best(v), l = lead(g, i);
      if (l >= th.lead[Math.min(g.day, 5) - 1] || last) E.call(g, i, o, l >= th.all ? 2 : l >= 2 ? 1 : 0);
    }
  },
  // Exact odds + expected value; posts when waiting a day isn't worth more (crude value of waiting).
  sharp(g) {
    const n = g.R.STORIES;
    for (let i = 0; i < n; i++) E.ask(g, i, 'barber');
    for (let k = 0; k < 8 && g.left > 0; k++) {
      let bi = -1, bs = '', bv = -1;
      for (let i = 0; i < n; i++) { if (g.calls[i]) continue; const p = E.posterior(g, i), h = 1 - Math.max(...p);
        for (const src of ['physio', 'spotter', 'agent', 'kitman']) if (E.askState(g, i, src) === 'ok') { const v = h * ({ physio: 1.6, spotter: 1.3, agent: 1, kitman: 0.6 })[src]; if (v > bv) { bv = v; bi = i; bs = src; } } }
      if (bi < 0) break; E.ask(g, bi, bs);
    }
    const last = g.day === g.R.DAYS;
    for (let i = 0; i < n; i++) {
      if (g.calls[i]) continue;
      const p = E.posterior(g, i), b = evOf(g, i, p);
      if (b.o < 0) { if (last) continue; else continue; }
      const sure = Math.max(...p), wait = [0.80, 0.75, 0.70, 0.62, 0][Math.min(g.day, 5) - 1];
      if (last || sure >= wait) E.call(g, i, b.o, b.s);
    }
  },
  // Exploits the sim should punish:
  allinDay1(g) { for (let i = 0; i < g.R.STORIES; i++) { E.ask(g, i, 'barber'); if (!g.calls[i]) E.call(g, i, g.clues[i][0].r, 2); } },
  whisperAll(g) { for (let i = 0; i < g.R.STORIES; i++) { E.ask(g, i, 'barber'); if (g.left) E.ask(g, i, 'agent'); if (!g.calls[i]) E.call(g, i, best(votes(g, i)), 0); } },
  copyInsider(g) {
    for (let i = 0; i < g.R.STORIES; i++) { const ins = g.feed.find((f) => f.i === i && f.id === 'insider');
      if (!g.calls[i] && (ins || g.day === g.R.DAYS)) { E.ask(g, i, 'barber'); E.call(g, i, ins ? ins.claim : g.clues[i][0].r, 2); } }
  },
  lateSafe(g) {   // waits for Deadline Day, physio on everything it can, all in
    if (g.day < g.R.DAYS) return;
    for (let i = 0; i < g.R.STORIES; i++) { E.ask(g, i, 'barber'); E.ask(g, i, 'physio'); }
    for (let i = 0; i < g.R.STORIES; i++) { if (g.calls[i]) continue; const v = votes(g, i); E.call(g, i, best(v), lead(g, i) >= 4 ? 2 : 1); }
  },
};
function lead(g, i) { const v = votes(g, i).slice().sort((a, b) => b - a); return v[0] - v[1]; }

function play(name, seed) {
  const R = structuredClone(R0), g = E.newGame(E.buildBoard(seed, R), R), rng = new RNG('p:' + name + seed);
  while (!E.isOver(g)) { P[name](g, rng); E.endDay(g); }
  return E.resolve(g);
}

const rows = [];
for (const name of Object.keys(P)) {
  const rs = Array.from({ length: N }, (_, k) => play(name, 'sim' + k));
  const tot = rs.map((r) => r.total), tiers = {};
  for (const r of rs) tiers[r.tier] = (tiers[r.tier] || 0) + 1;
  const acc = rs.reduce((a, r) => a + r.right, 0) / Math.max(1, rs.reduce((a, r) => a + r.called, 0));
  rows.push({ player: name, mean: mean(tot).toFixed(0), p10: q(tot, 0.1).toFixed(0), p90: q(tot, 0.9).toFixed(0), acc: pct(acc), scoops: mean(rs.map((r) => r.scoops)).toFixed(2),
    T1: pct((tiers.T1 || 0) / N), T2: pct((tiers.T2 || 0) / N), T3: pct((tiers.T3 || 0) / N), T4: pct((tiers.T4 || 0) / N), SPIKED: pct((tiers.SPIKED || 0) / N) });
}
console.log(`mode=${MODE} n=${N}`); console.table(rows);
