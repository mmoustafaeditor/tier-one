// Tier One 3.8 balance simulator (brief §4, §7, §9, §17, §36). Plays the live rules engine, never a copy of it.
//   node sim3.mjs [mode] [n]          mode: info | play | rivals | points | knobs | all      n: boards per archetype (default 2000)
//   K='{"BASE":[10,20,40]}' node sim3.mjs play     knob overrides (deep-merged onto RULES) for A/B runs
//   V=baseline node sim3.mjs knobs                 compare named variants (see VARIANTS) against the current rules
// Output is text tables; the numbers quoted in docs/spec/D-game-math.md come from here.
import * as E from '../../../../api/tier-one/v3/_lib/engine.mjs';
import { RNG, mean, sd, q, pct } from '../../../../api/tier-one/v3/_lib/rng.mjs';

const MODE = process.argv[2] || 'all', N = +process.argv[3] || 2000;
const K = JSON.parse(process.env.K || '{}');
const O4 = [0, 1, 2, 3];
const merge = (a, b) => { const o = structuredClone(a); for (const k of Object.keys(b)) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && o[k] && !Array.isArray(o[k]) ? merge(o[k], b[k]) : b[k]; return o; };
const rulesWith = (over) => merge(E.RULES, over || {});

// ---------- the ladder as a player sees it ------------------------------------------------------------------------
const evCall = (R, p, s, day, excl = false) => {
  const k = Math.max(0, R.DAYS - day), win = R.BASE[s] + R.EARLY[s] * k + (excl ? R.EXCL[s] : 0);
  return p * win - (1 - p) * R.LOSS[s];
};
function bestCall(g, i, post) {
  const R = g.R; let b = { ev: 0, o: -1, s: -1 };
  for (const o of O4) for (let s = 0; s < 3; s++) {
    const pv = E.preview(g, i, o, s), ev = post[o] * pv.win + (1 - post[o]) * pv.lose;
    if (ev > b.ev) b = { ev, o, s };
  }
  return b;
}

// ---------- analytic information per contact point (mode: info) ---------------------------------------------------
const H = (p) => -p.reduce((a, x) => a + (x > 0 ? x * Math.log2(x) : 0), 0);
// P(report | truth) with the planted spin marginalised out (what the player cannot see).
const likT = (R, so, t, r) => O4.reduce((a, sp) => a + R.SPIN[t][sp] * E.lik(so, t, sp, r), 0);
function infoOf(R, so, prior, day) {
  const n = E.nSays(so), pr = Array.from({ length: n }, (_, r) => O4.reduce((a, t) => a + prior[t] * likT(R, so, t, r), 0));
  let Hpost = 0, evAfter = 0;
  const evBest = (p) => Math.max(0, ...O4.flatMap((o) => [0, 1, 2].map((s) => evCall(R, p[o], s, day))));
  for (let r = 0; r < n; r++) {
    if (!pr[r]) continue;
    const post = O4.map((t) => (prior[t] * likT(R, so, t, r)) / pr[r]);
    Hpost += pr[r] * H(post); evAfter += pr[r] * evBest(post);
  }
  return { bits: H(prior) - Hpost, evoi: evAfter - evBest(prior), pr };
}
function infoTable(R) {
  const rows = [];
  // Two typical evidence states: cold (the prior) and after a kit man "Leaving" / "Staying" read (the most common day-1 state).
  const states = { cold: R.PRIOR };
  for (const [name, r] of [['afterLeaving', 0], ['afterStaying', 1]]) {
    const z = O4.map((t) => R.PRIOR[t] * likT(R, R.SOURCES.kitman, t, r)), s = z.reduce((a, b) => a + b, 0);
    states[name] = z.map((x) => x / s);
  }
  for (const [src, so] of Object.entries(R.SOURCES)) for (const [st, prior] of Object.entries(states)) {
    if (src === 'kitman' && st !== 'cold') continue;
    const { bits, evoi } = infoOf(R, so, prior, so.from);
    rows.push({ source: src, state: st, cost: so.cost, opens: so.from, bits: bits.toFixed(3), 'bits/pt': (bits / so.cost).toFixed(3), 'EVOI pts': evoi.toFixed(1), 'EVOI/pt': (evoi / so.cost).toFixed(1) });
  }
  // The same read, if it were available on day 1 vs its real opening day (what the opening day costs in early bonus).
  for (const src of ['spotter', 'physio']) { const so = R.SOURCES[src]; const a = infoOf(R, so, R.PRIOR, 1), b = infoOf(R, so, R.PRIOR, so.from); rows.push({ source: src, state: 'cold@day1 vs @open', cost: so.cost, opens: so.from, bits: a.bits.toFixed(3), 'bits/pt': '', 'EVOI pts': `${a.evoi.toFixed(1)} → ${b.evoi.toFixed(1)}`, 'EVOI/pt': '' }); }
  return rows;
}
function stayAxis(R) {
  // Off vs Fake once "he stays" is known: how much each source can separate them (bits on the 2-outcome subproblem).
  const prior = [0, 0, R.PRIOR[2], R.PRIOR[3]].map((x) => x / (R.PRIOR[2] + R.PRIOR[3]));
  return Object.entries(R.SOURCES).map(([src, so]) => ({ source: src, 'bits on Off/Fake': infoOf(R, so, prior, so.from).bits.toFixed(3) }));
}

// ---------- archetypes --------------------------------------------------------------------------------------------
const lead = (t) => { const v = t.slice().sort((a, b) => b - a); return v[0] - v[1]; };
const argmax = (a) => a.indexOf(Math.max(...a));
const open = (g) => [...Array(g.R.SAGAS).keys()].filter((i) => !g.calls[i]);
const askAll = (g, src, order) => { for (const i of order) if (E.askState(g, i, src) === 'ok') E.ask(g, i, src); };
// What the tally player sees on the card: engine tally (reads + live rival posts) and circle count.
const card = (g, i) => { const t = E.tally(g, i), o = argmax(t); return { t, o, lead: lead(t), two: E.circlesFor(g, i, o).size >= 2 }; };
const dd = (g) => g.day === g.R.DAYS;

export const PLAYERS = {
  // Rings whoever is affordable on a random saga; posts a random outcome at a random strength on a random day.
  random(g, rng) {
    for (let k = 0; k < 6 && g.left > 0; k++) { const i = rng.int(g.R.SAGAS), src = rng.pick(E.SRC); if (E.askState(g, i, src) === 'ok') E.ask(g, i, src); }
    for (const i of open(g)) if (E.canCall(g, i) && (dd(g) || rng.chance(0.25))) E.call(g, i, rng.int(4), rng.int(3));
  },
  // Cheap reads, never Confirmed, posts once the card leads by 2 (In talks) or 3 (Advanced).
  cautious(g) {
    askAll(g, 'kitman', open(g)); askAll(g, 'barber', open(g)); askAll(g, 'spotter', open(g)); askAll(g, 'agent', open(g));
    for (const i of open(g)) { if (!E.canCall(g, i)) continue; const c = card(g, i); if (c.lead >= 3 || dd(g)) E.call(g, i, c.o, 1); else if (c.lead >= 2 && g.day >= 4) E.call(g, i, c.o, 0); }
  },
  // Plays the card as printed: spends on the shakiest sagas, Confirms on ✓✓ with a clear lead, Advanced on a lead, Talks on DD.
  tally(g) {
    const order = open(g).sort((a, b) => card(g, a).lead - card(g, b).lead);
    for (const src of ['physio', 'spotter', 'agent', 'kitman', 'barber']) askAll(g, src, order);
    for (const i of open(g)) {
      if (!E.canCall(g, i)) continue; const c = card(g, i);
      if (c.two && c.lead >= 4) E.call(g, i, c.o, 2); else if (c.lead >= 3 && g.day >= 3) E.call(g, i, c.o, 1); else if (dd(g) || (c.lead >= 2 && g.day >= 5)) E.call(g, i, c.o, c.lead >= 2 ? 1 : 0);
    }
  },
  // Day 1: kit man + agent where affordable, Confirms the card leader on day 1–2 whatever the evidence.
  aggressiveEarly(g) {
    askAll(g, 'agent', open(g)); askAll(g, 'kitman', open(g)); askAll(g, 'barber', open(g));
    for (const i of open(g)) if (E.canCall(g, i)) { const c = card(g, i); E.call(g, i, c.o, g.day <= 2 ? 2 : 1); }
  },
  // Sits on points until the physio opens, rings the physio on everything it can, posts Advanced/Confirmed late.
  lateConservative(g) {
    if (g.day < 5) { askAll(g, 'kitman', open(g)); return; }
    askAll(g, 'physio', open(g)); askAll(g, 'spotter', open(g)); askAll(g, 'kitman', open(g));
    for (const i of open(g)) if (E.canCall(g, i)) { const c = card(g, i); if (c.lead >= 5 && c.two) E.call(g, i, c.o, 2); else if (c.lead >= 2 || dd(g)) E.call(g, i, c.o, 1); }
  },
  // Waits for @PressBoxPete, rings the barber (needs a read of its own), Confirms Pete's line; DD: Advanced on the card.
  copyInsider(g) {
    for (const i of open(g)) {
      const pete = E.livePosts(g, i).find((f) => f.id === 'insider');
      if (pete) { if (E.askState(g, i, 'barber') === 'ok') E.ask(g, i, 'barber'); else if (E.askState(g, i, 'kitman') === 'ok') E.ask(g, i, 'kitman'); if (E.canCall(g, i)) E.call(g, i, pete.claim, 2); }
      else if (dd(g)) { if (E.askState(g, i, 'kitman') === 'ok') E.ask(g, i, 'kitman'); if (E.canCall(g, i)) E.call(g, i, card(g, i).o, 1); }
    }
  },
  // Counts every street voice as its own confirmation: barber + @BackPageBants + @ITK_Kev agreeing = "three sources".
  echoChamber(g) {
    askAll(g, 'barber', open(g)); askAll(g, 'kitman', open(g));
    for (const i of open(g)) {
      if (!E.canCall(g, i)) continue;
      const votes = [0, 0, 0, 0];
      for (const c of E.curReads(g, i)) if (c.src === 'barber') votes[c.r] += 1; else E.weights(g.R, c.src, c.r).forEach((w, o) => (votes[o] += w));
      for (const f of E.livePosts(g, i)) votes[f.claim] += 1;
      const o = argmax(votes), n = votes[o];
      if (n >= 3) E.call(g, i, o, 2); else if (n >= 2) E.call(g, i, o, 1); else if (dd(g)) E.call(g, i, o, 0);
    }
  },
  // Exact posterior; buys the read with the best expected value of information per point; posts when sure enough for the day.
  bayes(g, rng, cfg = {}) {
    const R = g.R, waitAt = cfg.wait || [0.80, 0.75, 0.70, 0.65, 0.60, 0.50, 0];
    for (let k = 0; k < 12 && g.left > 0; k++) {
      let best = { v: 0.15, i: -1, src: '' };
      for (const i of open(g)) {
        const post = E.posterior(g, i), base = Math.max(0, bestCall(g, i, post).ev);
        for (const src of E.SRC) {
          if (E.askState(g, i, src) !== 'ok') continue;
          const so = E.srcOf(R, i, src), n = E.nSays(so), e = E.eraOf(g.board.sagas[i], g.day);
          let evoi = 0;
          for (let r = 0; r < n; r++) {
            const pr = O4.reduce((a, t) => a + post[t] * likT(R, so, t, r), 0); if (!pr) continue;
            g.clues[i].push({ src, day: g.day, r, era: e }); const p2 = E.posterior(g, i); g.clues[i].pop();
            evoi += pr * Math.max(0, bestCall(g, i, p2).ev);
          }
          const v = (evoi - base) / so.cost;
          if (v > best.v) best = { v, i, src };
        }
      }
      if (best.i < 0) break;
      E.ask(g, best.i, best.src);
    }
    for (const i of open(g)) {
      if (!E.canCall(g, i)) continue;
      const post = E.posterior(g, i), b = bestCall(g, i, post);
      if (b.o < 0) continue;
      if (dd(g) || post[b.o] >= waitAt[g.day - 1]) E.call(g, i, b.o, b.s);
    }
    // U-turn when the evidence has turned hard against a filed call (never on DD once the posts are gone).
    for (let i = 0; i < R.SAGAS; i++) {
      const c = g.calls[i]; if (!c || c.ut || !E.canUturn(g, i)) continue;
      const post = E.posterior(g, i); if (post[c.o] >= 0.35) continue;
      const alt = argmax(post); const stay = evCall(R, post[c.o], c.s, c.day) ;
      let bb = { ev: -1e9, s: 0 }; for (let s = 0; s < 3; s++) { const ev = evCall(R, post[alt], s, g.day) - R.UT_PEN[c.s]; if (ev > bb.ev) bb = { ev, s }; }
      if (bb.ev > stay + 5) E.uturn(g, i, alt, bb.s);
    }
  },
};

export function play(name, seed, R, cfg) {
  const g = E.newGame(E.buildBoard(seed, R), R), rng = new RNG('p:' + name + seed);
  while (!E.isOver(g)) { PLAYERS[name](g, rng, cfg); E.endDay(g); }
  const r = E.resolve(g);
  r.earlyDays = r.per.filter((p) => p.call).map((p) => p.call.day);
  r.beaten = r.per.filter((p) => p.why === 'beaten').length;
  return r;
}
const summary = (rs, n = rs.length) => {
  const tot = rs.map((r) => r.total), tiers = {};
  for (const r of rs) tiers[r.tier] = (tiers[r.tier] || 0) + 1;
  const called = rs.reduce((a, r) => a + r.called, 0), right = rs.reduce((a, r) => a + r.right, 0);
  const days = rs.flatMap((r) => r.earlyDays);
  return { mean: +mean(tot).toFixed(1), sd: +sd(tot).toFixed(0), p10: +q(tot, 0.1).toFixed(0), p50: +q(tot, 0.5).toFixed(0), p90: +q(tot, 0.9).toFixed(0), acc: pct(right / Math.max(1, called)), called: +(called / n).toFixed(1), excl: +(rs.reduce((a, r) => a + r.ex, 0) / n).toFixed(2), beaten: +(rs.reduce((a, r) => a + r.beaten, 0) / n).toFixed(2), uturn: +(rs.reduce((a, r) => a + r.uturns, 0) / n).toFixed(2), callDay: +mean(days).toFixed(1), T1: pct((tiers.T1 || 0) / n), T2: pct((tiers.T2 || 0) / n), T3: pct((tiers.T3 || 0) / n), T4: pct((tiers.T4 || 0) / n), SPIKED: pct((tiers.SPIKED || 0) / n) };
};
export function runAll(R, n = N, names = Object.keys(PLAYERS)) {
  const out = {};
  for (const name of names) out[name] = Array.from({ length: n }, (_, k) => play(name, 'sim' + k, R));
  return out;
}
function playTable(R, n = N) {
  const all = runAll(R, n), rows = [];
  for (const [name, rs] of Object.entries(all)) rows.push({ player: name, ...summary(rs) });
  console.table(rows);
  // Skill vs luck: paired on the same boards.
  const b = all.bayes, r = all.random, t = all.tally, c = all.cautious;
  const wins = (x, y) => pct(x.filter((a, k) => a.total > y[k].total).length / n);
  console.log(`bayes beats random on ${wins(b, r)} of boards · bayes beats tally on ${wins(b, t)} · tally beats cautious on ${wins(t, c)} · tally beats random on ${wins(t, r)}`);
  // Variance decomposition for the skilled player: how much of a bayes score is the board (luck) vs. the rest.
  const names = Object.keys(all).filter((k) => !['random', 'aggressiveEarly', 'echoChamber', 'copyInsider'].includes(k));
  const boardMean = Array.from({ length: n }, (_, k) => mean(names.map((nm) => all[nm][k].total)));
  const vb = sd(boardMean) ** 2, vs = sd(names.map((nm) => mean(all[nm].map((x) => x.total)))) ** 2, vt = sd(names.flatMap((nm) => all[nm].map((x) => x.total))) ** 2;
  console.log(`engaged pool (${names.join(', ')}): board variance ${vb.toFixed(0)} · archetype variance ${vs.toFixed(0)} · total ${vt.toFixed(0)} → luck share ${pct(vb / vt)} · skill share ${pct(vs / vt)}`);
  const pool = names.flatMap((nm) => all[nm]);
  console.log('engaged pool tiers:', JSON.stringify(summary(pool, pool.length)));
  // Stay-axis accuracy: Off vs Fake once the player called one of them.
  const stayAcc = (rs) => { let n1 = 0, ok = 0; for (const x of rs) for (const p of x.per) if (p.call && p.call.o >= 2 && p.truth >= 2) { n1++; if (p.right) ok++; } return pct(ok / Math.max(1, n1)); };
  console.log(`Off/Fake accuracy when calling a stay (bayes ${stayAcc(b)}, tally ${stayAcc(t)}) · move accuracy (bayes ${(() => { let n1 = 0, ok = 0; for (const x of b) for (const p of x.per) if (p.call && p.call.o < 2 && p.truth < 2) { n1++; if (p.right) ok++; } return pct(ok / Math.max(1, n1)); })()})`);
  return all;
}

// ---------- rivals (mode: rivals) --------------------------------------------------------------------------------
function rivalTable(R, n = N) {
  const acc = {}, byDay = Array(R.DAYS + 2).fill(0), twisted = { reads: 0, boards: 0, days: {} };
  let sagas = 0;
  for (let k = 0; k < n; k++) {
    const b = E.buildBoard('sim' + k, R);
    if (b.twI >= 0) { twisted.boards++; twisted.days[b.twDay] = (twisted.days[b.twDay] || 0) + 1; }
    for (const s of b.sagas) {
      sagas++;
      let first = 99;
      for (const p of s.rivals) {
        const a = (acc[p.id] = acc[p.id] || { posts: 0, right: 0, spin: 0 }); a.posts++;
        const t = E.truthAt(s, p.day), e = E.eraOf(s, p.day);
        if (p.claim === t) { a.right++; if (!s.tw || p.day >= s.tw) first = Math.min(first, p.day); } else if (p.claim === s.spin[e]) a.spin++;
      }
      for (let d = 1; d <= R.DAYS; d++) if (first < d) byDay[d]++;
    }
  }
  console.table(Object.entries(acc).map(([id, a]) => ({ rival: id, 'posts/saga': (a.posts / sagas).toFixed(2), accuracy: pct(a.right / a.posts), 'wrong=spin': pct(a.spin / Math.max(1, a.posts - a.right)) })));
  console.log('share of sagas where a correct rival post already stands when you post on day d (exclusive gone):', Object.fromEntries(byDay.map((x, d) => [d, pct(x / sagas)]).filter(([d]) => d >= 1 && d <= R.DAYS)));
  console.log(`twists: ${pct(twisted.boards / n)} of boards (none only when all five are Fake), day split ${JSON.stringify(twisted.days)}`);
}

// ---------- contact points (mode: points) ------------------------------------------------------------------------
function pointsTable(n = Math.min(N, 1500)) {
  const rows = [];
  for (const [label, over] of [['3/day', { CONTACTS: 3 }], ['4/day (live)', {}], ['5/day', { CONTACTS: 5 }], ['6/day', { CONTACTS: 6 }], ['4/day + carry 1', { ROLLOVER: 1 }], ['4/day + carry 2', { ROLLOVER: 2 }], ['4/day, DD 2', { DD_CONTACTS: 2 }], ['4/day, DD 4', { DD_CONTACTS: 4 }]]) {
    const R = rulesWith(over), rs = { bayes: Array.from({ length: n }, (_, k) => play('bayes', 'sim' + k, R)), tally: Array.from({ length: n }, (_, k) => play('tally', 'sim' + k, R)) };
    rows.push({ points: label, bayes: summary(rs.bayes).mean, tally: summary(rs.tally).mean, bayesCallDay: summary(rs.bayes).callDay, bayesT1: summary(rs.bayes).T1, tallyT1: summary(rs.tally).T1, tallySpiked: summary(rs.tally).SPIKED });
  }
  console.table(rows);
}

// ---------- named variants for A/B (mode: knobs) -----------------------------------------------------------------
export const VARIANTS = {
  baseline37: { BASE: [10, 20, 40], LOSS: [5, 15, 60], EARLY: [1, 2, 4], EXCL: [0, 0, 20], UT_PEN: [3, 8, 30], TIERS: { T1: 180, T2: 120, T3: 70, T4: 0 },
    SOURCES: { agent: { M: [[0.85, 0.05, 0.05, 0.05], [0.35, 0.55, 0.05, 0.05], [0.35, 0.05, 0.55, 0.05], [0.60, 0.05, 0.10, 0.25]] }, physio: { cost: 3, from: 5 }, barber: { rel: 0.45 } },
    RIVALS: [{ id: 'tabloid', days: [1, 2], p: 0.60, rel: 0.35, kind: 'street' }, { id: 'itk', days: [2, 4], p: 0.70, rel: 0.55, kind: 'street' }, { id: 'insider', days: [5, 6], p: 0.85, rel: 0.75, kind: 'own' }] },
  softerConfirmed: { LOSS: [5, 15, 50] },
  bigExclusive: { EXCL: [0, 0, 30] },
  physioDay4: { SOURCES: { physio: { from: 4 } } },
  physioCost2: { SOURCES: { physio: { cost: 2 } } },
  sharperAgent: { SOURCES: { agent: { M: [[0.85, 0.05, 0.05, 0.05], [0.35, 0.55, 0.05, 0.05], [0.30, 0.05, 0.60, 0.05], [0.50, 0.05, 0.10, 0.35]] } } },
  barber55: { SOURCES: { barber: { rel: 0.55 } } },
  early135: { EARLY: [1, 3, 5] },
};
function knobsTable(n = Math.min(N, 1500)) {
  const names = ['tally', 'cautious', 'bayes', 'aggressiveEarly', 'lateConservative'];
  const want = (process.env.V || Object.keys(VARIANTS).join(',')).split(',');
  const rows = [];
  for (const v of ['live', ...want]) {
    const R = v === 'live' ? rulesWith(K) : rulesWith(VARIANTS[v]);
    const row = { variant: v };
    for (const nm of names) { const s = summary(Array.from({ length: n }, (_, k) => play(nm, 'sim' + k, R))); row[nm] = `${s.mean} (T1 ${s.T1}, S ${s.SPIKED}, ex ${s.excl}, d${s.callDay})`; }
    rows.push(row);
  }
  console.table(rows);
}

// ---------- main -------------------------------------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const R = rulesWith(K);
  console.log(`sim3 · n=${N} · ladder ${R.BASE}/${R.LOSS}/early ${R.EARLY}/excl ${R.EXCL[2]} · tiers ${JSON.stringify(R.TIERS)} · points ${R.CONTACTS}+DD${R.DD_CONTACTS}${R.ROLLOVER ? ' carry ' + R.ROLLOVER : ''}`);
  if (MODE === 'info' || MODE === 'all') { console.log('\n== information per contact point (bits = mutual information with the truth; EVOI = points of expected value a rational caller gains from the read on its opening day) =='); console.table(infoTable(R)); console.log('Off vs Fake, once "he stays" is known:'); console.table(stayAxis(R)); }
  if (MODE === 'play' || MODE === 'all') { console.log('\n== archetypes =='); playTable(R); }
  if (MODE === 'rivals' || MODE === 'all') { console.log('\n== rivals & twists =='); rivalTable(R); }
  if (MODE === 'points' || MODE === 'all') { console.log('\n== contact points =='); pointsTable(); }
  if (MODE === 'knobs') { console.log('\n== variants =='); knobsTable(); }
}
