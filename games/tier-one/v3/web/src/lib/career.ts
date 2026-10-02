// Career Mode (3.8, LAUNCH_BRIEF §11–§15, spec F): an emergent climb through football media, played on the Daily engine
// with stage rules, locally, never ranked. Five stages: The Blog → Local Desk → Nationals → The Press Box → Tier One.
//
// One career (3.4): a Career slot is a story, not a second set of numbers. Followers, reputation, the contacts' trust
// (the Contacts Book) and the rival ledgers are the byline's (lib/byline.ts) and move the same way in every mode. What a
// slot owns: stage, windows, favours, club relations, counters, history, the Career log. Promotion reads the global rep.
//
// 3.8 removed the conspiracy: there is no Vince's play, no planted evidence, no villain. What remains of the sources'
// characters is how they react to what you do (lib/storyMode.ts). `vinceOf` is kept as a null stub until the call sites
// in screens/Window.tsx and screens/Saga.tsx (core lane) are deleted.
import { RULES, type Rules, type Source, type Result, type CastSaga, type Game, OUTS } from './engine';
import { activeDraft, getSave, type CareerSave, type Save } from './save';
import { bookOf, lvOfXp, recordInto, careerWindowKey, rivalOf, RIVALS, type WindowSummary } from './byline';
import { toast } from './meta';
import { styleOf, STYLE_MIN, type StyleId } from './style';

export type StageId = 'blog' | 'local' | 'nationals' | 'pressbox' | 'tierone';
export interface Stage {
  id: StageId; sagas: number; contacts: number; src: string[]; rivals: string[]; pool: 'small' | 'top' | 'stars'; maxStar?: number;
  /** [windows played (cumulative), reputation] both needed to enter this stage. */
  gate: [number, number]; dd: number;
  /** Publication reach (§21): the follower multiplier for a window played at this stage. */
  reach: number;
}
// Spec F §2 (sim: games/tier-one/v3/sim career run, 120 careers × 5 archetypes): 20 windows to a finished first career.
// Windows gate the good player (card reader and expert both arrive at Tier One on window 17); reputation gates the
// echo-chamber player (stalls at ~54, never leaves the Local Desk) without stranding the cautious one (settles ~76).
export const STAGES: Stage[] = [
  { id: 'blog', sagas: 3, contacts: 3, src: ['kitman', 'barber', 'agent'], rivals: ['tabloid'], pool: 'small', maxStar: 2, gate: [0, 0], dd: 60, reach: 0.5 },
  { id: 'local', sagas: 4, contacts: 4, src: ['kitman', 'barber', 'agent', 'spotter'], rivals: ['tabloid', 'itk'], pool: 'small', maxStar: 2, gate: [3, 55], dd: 60, reach: 0.75 },
  { id: 'nationals', sagas: 5, contacts: 4, src: ['kitman', 'barber', 'agent', 'spotter', 'physio'], rivals: ['tabloid', 'itk', 'insider'], pool: 'top', gate: [7, 60], dd: 60, reach: 1 },
  { id: 'pressbox', sagas: 5, contacts: 4, src: ['kitman', 'barber', 'agent', 'spotter', 'physio'], rivals: ['tabloid', 'itk', 'insider'], pool: 'top', gate: [12, 65], dd: 60, reach: 1.5 },
  { id: 'tierone', sagas: 6, contacts: 5, src: ['kitman', 'barber', 'agent', 'spotter', 'physio'], rivals: ['tabloid', 'itk', 'insider'], pool: 'stars', gate: [17, 70], dd: 45, reach: 2 },
];
/** Kept name: Results.tsx and Home.tsx read RANKS[n].gate and `career.ranks.<n>`. */
export const RANKS = STAGES;
export const TOP = STAGES.length - 1;
/** Windows at Tier One that make the career "established" (endless + prestige unlock). 3 = window 20 of a first career. */
export const TOP_WINDOWS = 3;
/** The stage from which club relations change a board (press office at +3, frozen-out kit man at −3). */
export const RELATIONS_FROM = 2;
/** The stage from which a trusted agent leaks you a free read (§11 "intentional agent leaks", §12). */
export const LEAK_FROM = 2, LEAK_TRUST = 3, LEAK_REP = 65;

/** A source's trust in Career is its Contacts Book level (1–5, every mode). The accuracy steps below count from
 *  level 2, so a new contact plays exactly as the plain rules do. */
export const careerTrust = (s: Save, src: string) => lvOfXp(bookOf(s, src).xp);
const trustSteps = (s: Save, src: string) => careerTrust(s, src) - 1;
/** Trusted (3): the spotter and the physio open a day early. Direct Line (5): one free second opinion per window. */
export const TRUST_EARLY = 3, TRUST_AGAIN = 5;

export function newCareer(slot = 1, restarts = 0): CareerSave {
  return {
    slot, paper: '', rank: 0, windows: 0, favours: { burner: 1, tipoff: 1, stakeout: 0 },
    relations: {}, t1: 0, exclusives: 0, right: 0, calls: 0, uturns: 0, history: [], live: null, restarts,
  };
}
export const prestigeOf = (c: CareerSave) => c.restarts || 0;
export const topWindows = (c: CareerSave) => c.topW || 0;
export const isEstablished = (c: CareerSave) => c.rank >= TOP && topWindows(c) >= TOP_WINDOWS;

// Trust makes an 'own' source more accurate: each step removes 12% of its remaining error (Direct Line = 48% fewer).
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
function hashStr(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// ---------- the agent leak (replaces Vince's play). From the Nationals, when Rosa is Trusted and your reputation is
// 65+, she rings you first about one saga a window: her read on it costs nothing. The saga is fixed by the cast, so a
// resumed window is the same window. Scoring is untouched; it's the per-saga source override Career already uses.
type Leaked = Source & { leak: true };
export function leakPick(c: CareerSave, cast: CastSaga[], s: Save): { i: number } | null {
  if (c.rank < LEAK_FROM || !cast.length || careerTrust(s, 'agent') < LEAK_TRUST || (s.byline?.rep ?? 50) < LEAK_REP) return null;
  const h = hashStr('leak|' + cast.map((x) => x.player.id + '>' + x.to.id).join('|'));
  return { i: cast[h % cast.length].i };
}
/** The saga the agent leaked on a window's rules, if any. */
export function agentLeakOf(R: Rules): { i: number } | null {
  for (const [i, per] of Object.entries(R.PER || {})) if (per && per.agent && (per.agent as Leaked).leak) return { i: +i };
  return null;
}
/** @deprecated 3.8: Vince's play is gone. Always null; delete the call sites in Window.tsx / Saga.tsx. */
export function vinceOf(_R: Rules): { i: number; src: string } | null { return null; }

export function careerRules(c: CareerSave, cast: CastSaga[], s: Save = getSave()): Rules {
  const rk = STAGES[c.rank];
  const SOURCES: Record<string, Source> = {};
  for (const k of rk.src) SOURCES[k] = trusted(RULES.SOURCES[k], k, trustSteps(s, k));
  const PER: Record<number, Record<string, Source>> = {};
  if (c.rank >= RELATIONS_FROM) cast.forEach((sg) => {
    const rel = Math.max(rel0(c, sg.from.id), rel0(c, sg.to.id)), low = Math.min(rel0(c, sg.from.id), rel0(c, sg.to.id));
    if (rel >= 3) PER[sg.i] = { ...(PER[sg.i] || {}), leak: RULES.LEAK };
    if (low <= -3 && SOURCES.kitman) PER[sg.i] = { ...(PER[sg.i] || {}), kitman: { cost: 1, from: 1, kind: 'street', rel: 0.45, says: ['LEAVING', 'STAYING'], map: [0, 0, 1, 1] } as Source };
  });
  const lk = leakPick(c, cast, s);
  if (lk && SOURCES.agent) PER[lk.i] = { ...(PER[lk.i] || {}), agent: { ...SOURCES.agent, cost: 0, leak: true } as Leaked };
  const AGAIN = c.rank >= 3 ? rk.src.filter((k) => careerTrust(s, k) >= TRUST_AGAIN) : [];
  // Prestige (§13): each run through makes the newsroom harder: the rivals post more and are right more often.
  const p = Math.min(3, prestigeOf(c));
  const RIVALS_ = RULES.RIVALS.filter((r) => rk.rivals.includes(r.id)).map((r) => (p ? { ...r, p: Math.min(0.95, r.p + 0.05 * p), rel: Math.min(0.9, r.rel + 0.05 * p) } : r));
  return { ...RULES, SAGAS: rk.sagas, CONTACTS: rk.contacts, DD_SECONDS: rk.dd, SOURCES, RIVALS: RIVALS_, PER, AGAIN, FAVOURS: true } as Rules;
}
const rel0 = (c: CareerSave, id: string) => (c.relations[id] ? c.relations[id].v : 0);
export const castOpts = (c: CareerSave) => ({ n: STAGES[c.rank].sagas, pool: STAGES[c.rank].pool, ...(STAGES[c.rank].maxStar ? { maxStar: STAGES[c.rank].maxStar } : {}) });

// ---------- club relations (§14): −5 … +5, read as words everywhere they are shown.
export type RelationWord = 'trusted' | 'warm' | 'neutral' | 'cold' | 'frozen';
export const relationWord = (v: number): RelationWord => (v >= 3 ? 'trusted' : v > 0 ? 'warm' : v === 0 ? 'neutral' : v > -3 ? 'cold' : 'frozen');
/** Every club with a relation, strongest feeling first. */
export const relationsOf = (c: CareerSave) => Object.entries(c.relations).filter(([, r]) => r.v !== 0).sort((a, b) => Math.abs(b[1].v) - Math.abs(a[1].v) || b[1].v - a[1].v).map(([id, r]) => ({ id, v: r.v, word: relationWord(r.v) }));

export interface CareerReport {
  /** Reputation before and after: the one global rep. */
  repBefore: number; repAfter: number;
  /** Followers this window moved on the one global count, and the count after. */
  followers: number; followersAfter: number;
  favours: number; promoted: number | null;
  /** This window made the career established (TOP_WINDOWS at Tier One): endless play and prestige unlock. */
  established: boolean;
  /** Contacts Book level before and after, for the sources this window asked. */
  trust: Record<string, [number, number]>;
  rel: Record<string, [number, number]>; leaks: string[]; frozen: string[];
  /** The agent's free read this window: the saga, and whether your call on it was right (null: not filed). */
  leak: { i: number; right: boolean | null } | null;
  /** Times the barber's wrong read matched a wrong call of yours this window, and the career total. */
  barberBurned: number; barberBurnedTotal: number;
  /** House rivals whose run against you reached ±3 this window (streak from the ledger). */
  rivalRuns: { id: string; streak: number }[];
  /** The playstyle title this window changed to, once ten calls are in (lib/style.ts). */
  style: StyleId | null;
  /** Always 0 since 3.4: follower milestones are paid by lib/byline.ts in every mode. Kept for callers. */
  milestoneCredits: number;
  /** What the window did to the byline (lib/byline.ts WindowSummary), for Results. */
  byline: WindowSummary | null;
}
// Apply a finished window to the career. Returns what changed, for Results and the Career log (lib/storyMode.ts).
// Call it inside update(): `c` is the draft's career, and the byline beside it is moved through lib/byline.ts
// recordInto() with the stage's reach, once per window seed. Pass `s` explicitly outside a mutator (tests).
export function applyWindow(c: CareerSave, g: Game, res: Result, cast: CastSaga[], _milestonesPaid?: Record<string, number>, s: Save | null = activeDraft()): CareerReport {
  if (!s || s.career !== c) throw new Error('applyWindow: call inside update() on the draft career');
  const rel0s: Record<string, number> = {};
  const book0: Record<string, number> = {}; for (const src of Object.keys(RULES.SOURCES)) book0[src] = careerTrust(s, src);
  const streak0: Record<string, number> = {}; for (const id of RIVALS) streak0[id] = rivalOf(s, id).streak;
  const style0 = styleOf(s);
  const toasts: [string, string][] = [];
  const key = careerWindowKey(g.board.seed);
  const stage = STAGES[c.rank];
  let sum = recordInto(s, { mode: 'career', key, per: res.per, cast, tier: res.tier, total: res.total, days: g.R.DAYS, reach: stage.reach }, toasts);
  if (!sum && s.byline?.last && s.byline.last.key === key) sum = s.byline.last;
  if (toasts.length) setTimeout(() => { for (const [a, b] of toasts) toast('ach', a, b); }, 0);
  const b = s.byline!;
  const followers = sum ? sum.followers : 0, repAfter = b.rep, rep0 = sum ? b.rep - sum.rep : b.rep;
  let favours = 0, burned = 0;
  const lk = agentLeakOf(g.R);
  let leak: CareerReport['leak'] = lk ? { i: lk.i, right: null } : null;
  res.per.forEach((p) => {
    const sg = cast[p.i];
    const clubs = [sg.from.id, sg.to.id];
    if (!p.call) return;
    c.calls++;
    const st = p.call.s;
    for (const id of clubs) { if (!(id in rel0s)) rel0s[id] = rel0(c, id); }
    if (leak && p.i === leak.i) leak = { i: p.i, right: p.right };
    if (p.right) {
      c.right++;
      if (p.excl) { favours++; c.exclusives++; }
      for (const id of clubs) bump(c, id, p.excl ? 2 : 1);
    } else {
      if (st === 2) for (const id of clubs) bump(c, id, -2);
      if (st === 1) for (const id of clubs) bump(c, id, -1);
      // Trusted the barber and got burned: his wrong read said what you called.
      if (p.reads.some((r) => r.src === 'barber' && !r.right && r.r === p.call!.o)) burned++;
    }
    if (p.call.ut) c.uturns++;
  });
  c.windows++;
  const marks = (c.marks = c.marks || {});
  if (burned) marks.barberBurned = (marks.barberBurned || 0) + burned;
  // Drift: a relation with no story for 10 windows moves one step toward 0.
  for (const [id, r] of Object.entries(c.relations)) if (!(id in rel0s) && c.windows - r.last >= 10 && r.v !== 0) { r.v += r.v > 0 ? -1 : 1; r.last = c.windows; }
  if (res.tier === 'T1') { c.t1++; favours++; if (c.rank === TOP) c.t1Top = (c.t1Top || 0) + 1; }
  let established = false;
  if (c.rank === TOP) { c.topW = (c.topW || 0) + 1; if (c.topW === TOP_WINDOWS) established = true; }
  const fav = favours;
  for (let k = 0; k < fav; k++) { const kinds = ['burner', 'tipoff', 'stakeout'] as const; const kind = kinds[(c.windows + k) % 3]; if (totalFavours(c) < 5) c.favours[kind]++; }
  let promoted: number | null = null;
  const nx = STAGES[c.rank + 1];
  if (nx && c.windows >= nx.gate[0] && repAfter >= nx.gate[1]) { c.rank++; promoted = c.rank; }
  c.history = [{ n: c.windows, total: res.total, tier: res.tier, repAfter, at: Date.now() }, ...c.history].slice(0, 12);
  const trust: Record<string, [number, number]> = {};
  for (const src of Object.keys(sum ? sum.xp : {})) trust[src] = [book0[src] || 1, careerTrust(s, src)];
  const rel: Record<string, [number, number]> = {}, leaks: string[] = [], frozen: string[] = [];
  for (const id of Object.keys(rel0s)) { const a = rel0s[id], b2 = rel0(c, id); rel[id] = [a, b2]; if (a < 3 && b2 >= 3) leaks.push(id); if (a > -3 && b2 <= -3) frozen.push(id); }
  const rivalRuns = RIVALS.map((id) => ({ id, streak: rivalOf(s, id).streak })).filter((r) => Math.abs(r.streak) >= 3 && Math.abs(streak0[r.id]) < 3);
  const style1 = styleOf(s);
  const style = style1.n >= STYLE_MIN && style1.id !== 'rookie' && (style0.id !== style1.id || style0.n < STYLE_MIN) ? style1.id : null;
  return { repBefore: rep0, repAfter, followers, followersAfter: b.followers, favours: fav, promoted, established, trust, rel, leaks, frozen, leak, barberBurned: burned, barberBurnedTotal: marks.barberBurned || 0, rivalRuns, style, milestoneCredits: 0, byline: sum };
}
function bump(c: CareerSave, id: string, d: number) {
  const r = c.relations[id] || { v: 0, last: c.windows };
  r.v = Math.max(-5, Math.min(5, r.v + d)); r.last = c.windows; c.relations[id] = r;
}
export const totalFavours = (c: CareerSave) => c.favours.burner + c.favours.tipoff + c.favours.stakeout;
export const outKey = (o: number) => OUTS[o];
