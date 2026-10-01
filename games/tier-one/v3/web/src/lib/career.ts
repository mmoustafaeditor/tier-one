// Career: the slot container and the 3.x Career rules, kept only for the v3 window until the play lane moves to Driver4.
// 4.0: Career IS Story mode (lib/storyMode.ts): chapters, bosses, extras and the settle live there; the v4 rules come from
// E4.rulesFor('career', …) through storyMode.nextCareerWindow(). What 3.x had that 4.0 cut (CONCEPT4 §11): club leaks,
// the frozen-out kit man and favours are gone from these rules; a 3.x save's favours fold into Story's free extras.
//
// One career (3.4, GOTY.md §7.2): a Career slot is a story, not a second set of numbers. Followers, reputation
// ("credibility" is Career's word for the same 0–100), the contacts' trust (the Contacts Book level) and the rival
// ledgers are the byline's (lib/byline.ts) and move the same way in every mode. What a slot owns: rank/chapter, windows,
// favours, club relations, counters, history and Vince's play. Promotion reads the global rep; the rep gates are the
// byline's tier thresholds, so a promotion and the new word on your byline arrive together.
import { RULES, type Rules, type Source, type Result, type CastSaga, type Game, OUTS } from './engine';
import { activeDraft, getSave, type CareerSave, type Save } from './save';
import { REP_TIERS, bookOf, lvOfXp, recordInto, careerWindowKey, type WindowSummary } from './byline';
import { toast } from './meta';

const repGate = (i: number) => REP_TIERS[i][1];
export const RANKS = [
  { sagas: 3, contacts: 3, src: ['kitman', 'barber', 'agent'], rivals: ['tabloid'], pool: 'small' as const, gate: [0, repGate(0)], dd: 60 },
  { sagas: 4, contacts: 4, src: ['kitman', 'barber', 'agent', 'spotter'], rivals: ['tabloid', 'itk'], pool: 'small' as const, gate: [8, repGate(1)], dd: 60 },
  { sagas: 5, contacts: 4, src: ['kitman', 'barber', 'agent', 'spotter', 'physio'], rivals: ['tabloid', 'itk', 'insider'], pool: 'top' as const, gate: [20, repGate(2)], dd: 60 },
  { sagas: 5, contacts: 4, src: ['kitman', 'barber', 'agent', 'spotter', 'physio'], rivals: ['tabloid', 'itk', 'insider'], pool: 'top' as const, gate: [36, repGate(3)], dd: 60 },
  { sagas: 6, contacts: 5, src: ['kitman', 'barber', 'agent', 'spotter', 'physio'], rivals: ['tabloid', 'itk', 'insider'], pool: 'stars' as const, gate: [56, repGate(4)], dd: 45 },
];
/** A source's trust in Career is its Contacts Book level (1–5, every mode). The accuracy steps below count from
 *  level 2, so a new contact plays exactly as the plain rules do. */
export const careerTrust = (s: Save, src: string) => lvOfXp(bookOf(s, src).xp);
const trustSteps = (s: Save, src: string) => careerTrust(s, src) - 1;
/** The Contacts Book level at which a source opens a day early (spotter, physio) and at which a second opinion is free. */
export const TRUST_EARLY = 3, TRUST_AGAIN = 5;

export function newCareer(slot = 1, restarts = 0): CareerSave {
  return {
    slot, paper: '', rank: 0, windows: 0, favours: { burner: 0, tipoff: 0, stakeout: 0 },
    relations: {}, t1: 0, exclusives: 0, right: 0, calls: 0, uturns: 0, history: [], live: null, restarts,
  };
}

// Trust makes an 'own' source more accurate: each step removes 12% of its remaining error (book Lv5 = 48% fewer).
function trusted(so: Source, src: string, lv: number): Source {
  if (!lv) return so;
  if (so.kind === 'street') return { ...so, rel: Math.min(0.95, (so.rel || 0.45) + 0.05 * lv) };
  if (!so.M) return so;
  const f = 1 - 0.12 * lv, right = (t: number) => rightReport(src, t);
  const M = so.M.map((row, t) => {
    const r0 = right(t); const wrong = row.map((p, r) => (r === r0 ? 0 : p * f));
    const sumW = wrong.reduce((a, b) => a + b, 0);
    return row.map((_, r) => (r === r0 ? 1 - sumW : wrong[r]));
  });
  const from = lv >= TRUST_EARLY - 1 && src === 'spotter' ? 2 : lv >= TRUST_EARLY - 1 && src === 'physio' ? 4 : so.from;
  return { ...so, M, from };
}
function rightReport(src: string, t: number) {
  if (src === 'kitman') return t <= 1 ? 0 : 1;
  if (src === 'spotter' || src === 'physio') return t === 0 ? 0 : t === 1 ? 1 : 2;
  return t;
}

export function careerRules(c: CareerSave, cast: CastSaga[], s: Save = getSave()): Rules {
  const rk = RANKS[c.rank];
  const SOURCES: Record<string, Source> = {};
  for (const k of rk.src) SOURCES[k] = trusted(RULES.SOURCES[k], k, trustSteps(s, k));
  const PER: Record<number, Record<string, Source>> = {};
  // Vince's play (chapter 4 on): one saga, one source fed a planted line. Same PER hook as the frozen-out kit man.
  const vp = vincePick(c, cast);
  if (vp && SOURCES[vp.src]) PER[vp.i] = { ...(PER[vp.i] || {}), [vp.src]: planted(SOURCES[vp.src], vp.src) };
  const AGAIN = c.rank >= 3 ? rk.src.filter((k) => careerTrust(s, k) >= TRUST_AGAIN) : [];
  return { ...RULES, SAGAS: rk.sagas, CONTACTS: rk.contacts, DD_SECONDS: rk.dd, SOURCES, RIVALS: RULES.RIVALS.filter((r) => rk.rivals.includes(r.id)), PER, AGAIN, FAVOURS: false } as Rules;
}

// ---------- Vince's play (STORY.html, chapter 4 "The War": rank index 3 on; Career only, never the Daily, rooms or Practice).
// One saga per window is Vince's play, and one of its sources (the agent, the barber or the airport spotter) has been fed
// Vince's planted story: for that saga the source becomes a street voice with no reliability, so every read it gives is
// the saga's spin (the rumour mill's planted outcome, which is never the truth at the time). The saga and the source are
// fixed by the window's cast, so a resumed window is the same window, and the pick is the same on every device.
// Scoring is untouched: this is the per-saga source override Career already uses for leaks and frozen-out kit men
// (Rules.PER), read by the shared engine like any other source; the tally weights, the two-source rule and the points
// don't change. The engine never sees the `vince` tag: it's a Career-only marker on the override, read by vinceOf().
export const VINCE_RANK = 3;
const VINCE_SRC = ['agent', 'barber', 'spotter'];
type Planted = Source & { vince: true };
function hashStr(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function vincePick(c: CareerSave, cast: CastSaga[]): { i: number; src: string } | null {
  if (c.rank < VINCE_RANK || !cast.length) return null;
  const opts = VINCE_SRC.filter((k) => RANKS[c.rank].src.includes(k));
  if (!opts.length) return null;
  const h = hashStr('vince|' + cast.map((s) => s.player.id + '>' + s.to.id).join('|'));
  return { i: cast[h % cast.length].i, src: opts[(h >>> 11) % opts.length] };
}
function planted(so: Source, src: string): Source {
  // A street voice keeps the source's own vocabulary (the spotter's LINKED/OTHER/NOTHING) through `map`.
  const map = src === 'spotter' || src === 'physio' ? [0, 1, 2, 2] : src === 'kitman' ? [0, 0, 1, 1] : undefined;
  const p: Planted = { cost: so.cost, from: so.from, says: so.says, kind: 'street', rel: 0, ...(map ? { map } : {}), vince: true };
  return p;
}
/** Vince's play on a window's rules, if any: the saga and the source that was fed the line. */
export function vinceOf(R: Rules): { i: number; src: string } | null {
  for (const [i, per] of Object.entries(R.PER || {})) for (const [src, so] of Object.entries(per)) if (so && (so as Planted).vince) return { i: +i, src };
  return null;
}
const rel0 = (c: CareerSave, id: string) => (c.relations[id] ? c.relations[id].v : 0);
export const castOpts = (c: CareerSave) => ({ n: RANKS[c.rank].sagas, pool: RANKS[c.rank].pool, ...(c.rank < 2 ? { maxStar: 2 } : {}) });

export interface CareerReport {
  /** Reputation (Career's "credibility") before and after: the one global rep. */
  repBefore: number; repAfter: number;
  /** Followers this window moved on the one global count, and the count after. */
  followers: number; followersAfter: number;
  favours: number; promoted: number | null;
  /** Contacts Book level before and after, for the sources this window asked. */
  trust: Record<string, [number, number]>;
  rel: Record<string, [number, number]>; leaks: string[]; frozen: string[];
  /** Always 0 since 3.4: follower milestones are paid by lib/byline.ts in every mode. Kept for callers. */
  milestoneCredits: number;
  /** What the window did to the byline (lib/byline.ts WindowSummary), for Results. */
  byline: WindowSummary | null;
}
// Apply a finished window to the career (DESIGN §6.2–6.6). Returns what changed, for the results page.
// Call it inside update(): `c` is the draft's career, and the byline beside it is moved through lib/byline.ts
// recordInto() with the Career mode factor (GOTY.md §1.1), once per window seed. `milestonesPaid` is kept for the
// call signature; milestones are paid by the byline now. Pass `s` explicitly outside a mutator (tests).
export function applyWindow(c: CareerSave, g: Game, res: Result, cast: CastSaga[], _milestonesPaid?: Record<string, number>, s: Save | null = activeDraft()): CareerReport {
  if (!s || s.career !== c) throw new Error('applyWindow: call inside update() on the draft career');
  const rel0s: Record<string, number> = {};
  const book0: Record<string, number> = {}; for (const src of Object.keys(RULES.SOURCES)) book0[src] = careerTrust(s, src);
  // One career: the byline, the book and the ledgers move exactly as they do in every other mode.
  const toasts: [string, string][] = [];
  const key = careerWindowKey(g.board.seed);
  let sum = recordInto(s, { mode: 'career', key, per: res.per, cast, tier: res.tier, total: res.total }, toasts);
  if (!sum && s.byline?.last && s.byline.last.key === key) sum = s.byline.last;
  if (toasts.length) setTimeout(() => { for (const [a, b] of toasts) toast('ach', a, b); }, 0);
  const b = s.byline!;
  const followers = sum ? sum.followers : 0, repAfter = b.rep, rep0 = sum ? b.rep - sum.rep : b.rep;
  let favours = 0;
  res.per.forEach((p) => {
    const sg = cast[p.i];
    const clubs = [sg.from.id, sg.to.id];
    if (!p.call) return;
    c.calls++;
    const st = p.call.s;
    for (const id of clubs) { if (!(id in rel0s)) rel0s[id] = rel0(c, id); }
    if (p.right) { c.right++; if (p.excl) c.exclusives++; }
    void st;
    if (p.call.ut) c.uturns++;
  });
  c.windows++;
  if (res.tier === 'T1') { c.t1++; if (c.rank === RANKS.length - 1) c.t1Top = (c.t1Top || 0) + 1; }
  const fav = favours;
  let promoted: number | null = null;
  const nx = RANKS[c.rank + 1];
  if (nx && c.windows >= nx.gate[0] && repAfter >= nx.gate[1]) { c.rank++; promoted = c.rank; }
  c.history = [{ n: c.windows, total: res.total, tier: res.tier, repAfter, at: Date.now() }, ...c.history].slice(0, 12);
  const trust: Record<string, [number, number]> = {};
  for (const src of Object.keys(sum ? sum.xp : {})) trust[src] = [book0[src] || 1, careerTrust(s, src)];
  const rel: Record<string, [number, number]> = {}, leaks: string[] = [], frozen: string[] = [];
  for (const id of Object.keys(rel0s)) { const a = rel0s[id], b2 = rel0(c, id); rel[id] = [a, b2]; if (a < 3 && b2 >= 3) leaks.push(id); if (a > -3 && b2 <= -3) frozen.push(id); }
  return { repBefore: rep0, repAfter, followers, followersAfter: b.followers, favours: fav, promoted, trust, rel, leaks, frozen, milestoneCredits: 0, byline: sum };
}
export const totalFavours = (c: CareerSave) => c.favours.burner + c.favours.tipoff + c.favours.stakeout;
export const outKey = (o: number) => OUTS[o];
