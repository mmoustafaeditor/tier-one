// Progress around the window (RULES4 §3): the streak, XP and the Level (forever), coins, the 12 Secret files, brand
// deals, and toasts. Every number is in lib/economy.ts. Everything here is local: none of it touches a ranked score.
//
// CONTRACT for the results thread (CONCEPT4 §7): every on*Done takes a v4 Result4 (or a v3 Result for old data) and
// RETURNS a Gain: { xp, level, levelUp, coins, rep, repDelta, followers, followersDelta, rank, rankUp, unlocked, deal?, files? }.
// The byline (followers, Rep, rank, Contacts Book, rivals) moves in the same update through lib/byline.ts recordInto,
// so a later recordWindow() from a Results screen is a no-op for the same window key.
import { update, getSave, type Save } from './save';
import type { Result, Result4, CastSaga } from './engine';
import { t } from './i18n';
import { trackWindow, setAddXp, type TrackMode } from './progress';
import { addSeasonXP, seasonAt } from './season';
import { earnHook } from './earnhook';
import {
  XP, COINS, SECRET_FILES, SECRET_FILE_XP, credit as credit0, debit, levelOf, levelCoins, newUnlocks, xpOf, xpForWindow, coinsForWindow,
  emptyGain, rankIndex, underReview, creditHooks, fireGain, followerDelta, xpAtLevel, type Gain, type SecretFile, type Mode4,
} from './economy';
export { onGain } from './economy';
import type { Driver4, Outcome4 } from './driver';
/** A result as a screen hands it over: the engine's Result (v3) or Result4, plus what the server adds (rank, par…). */
export type AnyResult = (Result | Result4) & { rank?: number | null; players?: number; par?: number | null; row?: string; cast?: CastSaga[] };
import { noteWindow } from './lens';
import { recordInto, liteOf, bylineOf, rankOf, windowKey, type CallLite } from './byline';
import { onCallAll as sponsorCalls, onTermEnd as sponsorTermEnd, refreshOffers, sponsorGain, COUNTS, type CallOutcome, type TermOutcome, type DealMode, type Offer } from './deals';
type Sponsor = { calls: CallOutcome[]; ends: TermOutcome[]; offers: Offer[] };
const noSponsor = (): Sponsor => ({ calls: [], ends: [], offers: [] });

type Toast = { id: number; kind: 'ach' | 'info' | 'warn'; title: string; body?: string };
const listeners = new Set<(t: Toast[]) => void>();
let toasts: Toast[] = [];
let tid = 0;
export function toast(kind: Toast['kind'], title: string, body?: string, ms = 3600) {
  const x = { id: ++tid, kind, title, body };
  toasts = [...toasts, x]; listeners.forEach((f) => f(toasts));
  setTimeout(() => { toasts = toasts.filter((y) => y.id !== x.id); listeners.forEach((f) => f(toasts)); }, ms);
}
export function onToasts(f: (t: Toast[]) => void) { listeners.add(f); return () => { listeners.delete(f); }; }

// ---------------------------------------------------------------- coins and XP (the only writers)
/** Every coin grant goes through here (lib/economy.ts credit: the Gold +10%, the ledger line). */
export const credit = credit0;
export function spend(n: number, why: string): boolean {
  if (getSave().credits < n) return false;
  let ok = false;
  update((s) => { ok = debit(s, n, why); });
  return ok;
}
/** Adds XP to the account and the season track; a level-up pays coins (10 × level, capped 200). Returns the levels crossed. */
export function addXP(s: Save, n: number): number[] {
  if (!(n > 0)) return [];
  const before = levelOf(xpOf(s)).n;
  s.xp = xpOf(s) + Math.round(n); s.pp = s.xp; // `pp` is the 3.x name, kept in step until every screen reads `xp`
  addSeasonXP(s, Math.round(n));
  const after = levelOf(s.xp).n, crossed: number[] = [];
  for (let L = before + 1; L <= after; L++) { crossed.push(L); credit(s, levelCoins(L), 'level:' + L); }
  return crossed;
}
/** 3.x name. */
export const addPP = addXP;
setAddXp(addXP);

export const ymdUTC = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);

// ---------------------------------------------------------------- Secret files (RULES4 §3 Mystery)
// 12 hidden achievements, shown as sealed files until earned. Each pays 50 XP. `ACH` keeps the 3.x name so the Me
// screen still lists them; the value is the XP a file pays (coins come only from the RULES4 table).
export const ACH: Record<string, number> = Object.fromEntries(SECRET_FILES.map((id) => [id, SECRET_FILE_XP]));
export const ACH_IDS: string[] = [...SECRET_FILES];
export const ACH_XP = SECRET_FILE_XP;
function grant(s: Save, id: SecretFile, got: SecretFile[]) {
  if (s.ach[id] || !(id in ACH)) return;
  s.ach[id] = Date.now();
  addXP(s, ACH[id]);
  got.push(id);
  const name = t('e4.sf.' + id + '.n');
  setTimeout(() => toast('ach', t('e4.sf.got', { n: name }), t('e4.sf.xp', { n: ACH[id] })), 300);
}
const isV4 = (r: AnyResult): r is Result4 & AnyResult => (r as Result4).v === 4;
/** The files a finished window can open. v4 results carry the truth per story; v3 results open only the mode-free ones. */
function windowFiles(s: Save, r: AnyResult, mode: Mode4, got: SecretFile[]) {
  const per = r.per.map(liteOf), calls = per.filter((p) => p.called);
  const n = r.per.length;
  if (calls.length === n && calls.every((p) => p.right) && n >= 5) grant(s, 'cleanSheet', got);
  if (calls.filter((p) => p.scoop).length >= 2) grant(s, 'scoop2', got);
  if (calls.some((p) => p.right && p.s === 2 && p.day === 1)) grant(s, 'dayOne', got);
  if (calls.some((p) => p.right && p.s === 2 && !p.reads.some((c) => c.src === 'physio'))) grant(s, 'physioNo', got);
  if (mode === 'daily' && r.tier === 'T1' && !per.some((p) => p.reads.some((c) => c.src === 'barber'))) grant(s, 'noBarber', got);
  if ((r.tier === 'T1' || r.tier === 'T2') && calls.length >= 3 && calls.every((p) => p.s === 0)) grant(s, 'quiet', got);
  if (calls.some((p) => p.scoop && p.rivals.some((f) => f.id === 'insider' && f.right && f.day >= p.day))) grant(s, 'rivalBeat', got);
  if (mode === 'deadline' && r.tier === 'T1') grant(s, 'liveT1', got);
  if (isV4(r) && mode === 'daily' && r.per.filter((p) => p.right && p.call && p.call.s === 2 && p.truth === 2).length >= 3) grant(s, 'stays3', got);
  if ((s.byline?.hot || 0) >= 10) grant(s, 'hot10', got);
  if ((s.stats.deals_paid || 0) >= 3) grant(s, 'deal3', got);
}

// ---------------------------------------------------------------- the Gain (what the results thread reads)
interface Snap { level: number; xp: number; rep: number; followers: number; rank: Gain['rank']; credits: number }
const snapOf = (s: Save): Snap => { const b = bylineOf(s); return { level: levelOf(xpOf(s)).n, xp: xpOf(s), rep: b.rep, followers: b.followers, rank: rankOf(s), credits: s.credits }; };
function gainOf(before: Snap, s: Save, sp: Sponsor, files: SecretFile[], mode: Parameters<typeof fireGain>[1]): Gain {
  const a = snapOf(s), g = emptyGain(a.level, a.rep, a.followers, a.rank);
  g.xp = a.xp - before.xp; g.levelUp = a.level > before.level; g.unlocked = newUnlocks(before.level, a.level);
  g.coins = a.credits - before.credits;
  g.repDelta = a.rep - before.rep; g.followersDelta = a.followers - before.followers;
  g.rankUp = rankIndex(a.rank) > rankIndex(before.rank);
  g.review = underReview(a.rep, bylineOf(s).rank || 0);
  const sg = sponsorGain(sp.calls, sp.ends);
  if (sg) { g.sponsor = sg; g.deal = { brand: sg.brand, status: sg.walked ? 'pulled' : 'paid', coins: sg.paid }; }
  if (sp.offers.length) g.offers = sp.offers.map((o) => ({ id: o.id, brand: o.brand, first: o.first }));
  if (files.length) g.files = files;
  fireGain(g, mode);
  return g;
}
const modeKey = (mode: Mode4, extra: { no?: number; seed?: string; room?: { code: string; round: number } }) => windowKey({ mode, ...extra });

/** The shared end-of-window move, inside one update: byline, deals, missions, files, XP and coins. */
function settleWindow(s: Save, r: AnyResult, mode: Mode4, key: string, opts: { xp?: number; coins?: number; cast?: CastSaga[]; no?: number; room?: { code: string; round: number } } = {}): { sp: Sponsor; files: SecretFile[]; lite: CallLite[] } {
  const got: SecretFile[] = [];
  const bmode = mode === 'deadline' ? 'daily' : mode === 'wire' ? 'practice' : mode;
  if (mode !== 'career') recordInto(s, { mode: bmode as 'daily' | 'room' | 'practice' | 'career', key, per: r.per, cast: r.cast && r.cast.length ? r.cast : opts.cast, tier: r.tier, total: r.total, no: opts.no, room: opts.room });
  const lite = r.per.map(liteOf);
  // Sponsors (CONCEPT4 §4): every resolved call, in the order they were posted, then the term; then new offers land.
  const sp = noSponsor();
  for (const p of lite.filter((x) => x.called).sort((a, c) => a.day - c.day || a.i - c.i)) sp.calls.push(...sponsorCalls(s, { mode: mode as DealMode, right: p.right, s: p.s, scoop: p.scoop, i: p.i }));
  s.stats.windows = (s.stats.windows || 0) + 1;
  if (COUNTS[mode as DealMode]) sp.ends.push(...sponsorTermEnd(s, { afterWindow: true })); // a window deal's term is a window that counts (§4)
  sp.offers.push(...refreshOffers(s));
  if (opts.coins) credit(s, opts.coins, mode + ':' + (opts.no || key));
  addXP(s, opts.xp ?? xpForWindow(mode, r.tier));
  trackWindow(s, r, (mode === 'career' ? 'story' : mode === 'wire' ? 'practice' : mode) as TrackMode);
  windowFiles(s, r, mode, got);
  if (!s.stats.firstWindow) { s.stats.firstWindow = Date.now(); creditHooks.firstWindow?.(s); } // a referred friend's first window pays (lib/wallet.ts)
  noteWindow(s, r, mode, key, opts.cast); // Lens: the follower graph's day and the grid of right Drops (lib/lens.ts)
  earnHook(s);
  return { sp, files: got, lite };
}

export function onDailyDone(dayKey: string, no: number, r: AnyResult, extra: { ddLast15?: boolean } = {}): Gain {
  const before = snapOf(getSave());
  let out: { sp: Sponsor; files: SecretFile[] } = { sp: noSponsor(), files: [] };
  update((s) => {
    if (s.daily[dayKey]) { s.daily[dayKey] = { ...s.daily[dayKey], rank: r.rank, players: r.players, par: r.par }; return; }
    const ex = isV4(r) ? r.scoops : r.ex;
    s.daily[dayKey] = { no, total: r.total, tier: r.tier, row: r.row || '', ex, rank: r.rank, players: r.players, par: r.par, v: isV4(r) ? 4 : 3 };
    // Streak with grace days: one earned per 7-day run (bank up to 2); a missed day spends one.
    const st = s.streak;
    const gap = st.last ? dayDiff(st.last, dayKey) : 99;
    if (gap === 1) st.n++;
    else if (gap > 1 && gap - 1 <= st.grace && st.n > 0) { st.grace -= gap - 1; st.n++; }
    else if (gap !== 0) st.n = 1;
    st.last = dayKey; st.best = Math.max(st.best, st.n);
    if (st.n % 7 === 0) { st.grace = Math.min(2, st.grace + 1); credit(s, COINS.streak7, 'streak:' + st.n); }
    creditHooks.streak?.(s, st.n); // 30-day streaks earn credits (lib/wallet.ts, server-matching)
    s.stats.dailies = (s.stats.dailies || 0) + 1;
    if (r.tier === 'T1') { s.stats.t1 = (s.stats.t1 || 0) + 1; creditHooks.firstT1?.(s, dayKey); }
    if (extra.ddLast15) s.stats.ddLate = (s.stats.ddLate || 0) + 1;
    // Spiked yesterday, Tier One today: the "ratioed" file.
    const prev = Object.keys(s.daily).filter((k) => k < dayKey).sort().pop();
    const files: SecretFile[] = [];
    out = settleWindow(s, r, 'daily', windowKey({ mode: 'daily', no }), { coins: coinsForWindow('daily', r.tier), no });
    if (prev && s.daily[prev].tier === 'SPIKED' && r.tier === 'T1') grant(s, 'ratioed', files);
    out.files.push(...files);
    wireCredit?.(s, r.tier); // §7.1: a Tier One Daily earns a Wire credit (lib/desk.ts registers the hook)
  });
  return gainOf(before, getSave(), out.sp, out.files, 'daily');
}
export function onPracticeDone(r: AnyResult, coach: boolean, seed = ''): Gain {
  const before = snapOf(getSave());
  let out: { sp: Sponsor; files: SecretFile[] } = { sp: noSponsor(), files: [] };
  update((s) => {
    const d = ymdUTC();
    if (s.practice.day !== d) { s.practice.day = d; s.practice.today = 0; }
    s.practice.today++; s.practice.played++;
    if (coach) s.stats.coach = (s.stats.coach || 0) + 1;
    out = settleWindow(s, r, 'practice', modeKey('practice', { seed: seed || 'p' + s.practice.played }), { xp: s.practice.today <= XP.practiceFreePerDay ? XP.practice : 0 });
  });
  return gainOf(before, getSave(), out.sp, out.files, 'practice');
}
/** The First window (CONCEPT4 §12, RULES4 §2): settles like Practice (no Rep, no ranked board, no sponsor pay) but the
 *  first time it lands the account's first followers at full weight and Level 2 (the Market's calls open), so the
 *  results thread can roll 200 → about 500 and show the unlock. A replay from Lens is a plain Practice window. The Gain
 *  fires under 'practice' (Blurt listens for the tutorial there). Owned by the onboarding lane. */
export function onTutorialDone(r: AnyResult, seed = ''): Gain {
  if (getSave().stats.tutorial) return onPracticeDone(r, true, seed);
  const before = snapOf(getSave());
  let out: { sp: Sponsor; files: SecretFile[] } = { sp: noSponsor(), files: [] };
  update((s) => {
    s.stats.tutorial = Date.now();
    const f0 = bylineOf(s).followers, hot0 = bylineOf(s).hot;
    out = settleWindow(s, r, 'practice', 'tutorial:' + (seed || 'tutorial-1'), { xp: Math.max(XP.career, xpAtLevel(2) - xpOf(s)) });
    // Followers at full weight (Practice's quarter weight would land a handful): the calls in the order they were posted.
    let hot = hot0, full = 0;
    for (const p of r.per.map(liteOf).filter((x) => x.called).sort((a, c) => a.day - c.day || a.i - c.i)) { full += followerDelta('career', p.s, p.right, p.scoop, hot); hot = p.right ? hot + 1 : 0; }
    const b = (s.byline = bylineOf(s)); b.followers = Math.max(0, f0 + full);
  });
  return gainOf(before, getSave(), out.sp, out.files, 'practice');
}
/** A Career window. lib/career.ts applyWindow has already moved the byline (recordInto under the pre-key) in the same
 *  Results settle; this adds the XP, the coins, deals and files. `milestoneCredits` is the 3.x argument, unused. */
export function onCareerDone(r: AnyResult, _milestoneCredits?: number): Gain {
  const before = snapOf(getSave());
  const last = getSave().byline?.last;
  let out: { sp: Sponsor; files: SecretFile[] } = { sp: noSponsor(), files: [] };
  update((s) => {
    const c = s.career; if (!c) return;
    out = settleWindow(s, r, 'career', 'career:' + c.windows, { coins: coinsForWindow('career') });
  });
  const g = gainOf(before, getSave(), out.sp, out.files, 'career');
  // The byline moved before this call: read the window's own followers/rep from the recorded summary.
  if (last && /^pre:career:/.test(last.key)) { g.followersDelta = last.followers; g.repDelta = last.rep; g.rankUp = !!last.rankUp; }
  return g;
}
export function onRoomDone(r: AnyResult, room?: { code: string; round: number }): Gain {
  const before = snapOf(getSave());
  let out: { sp: Sponsor; files: SecretFile[] } = { sp: noSponsor(), files: [] };
  update((s) => { s.stats.rooms = (s.stats.rooms || 0) + 1; out = settleWindow(s, r, 'room', modeKey('room', { room }), { room }); });
  return gainOf(before, getSave(), out.sp, out.files, 'room');
}
/** Deadline Day (Live or Practice). `ranked` is a DD Live day; practice runs still pay XP, never a ranked score. */
export function onDeadlineDone(r: AnyResult, seed: string, ranked = false): Gain {
  const before = snapOf(getSave());
  let out: { sp: Sponsor; files: SecretFile[] } = { sp: noSponsor(), files: [] };
  update((s) => { s.stats.deadline = (s.stats.deadline || 0) + 1; if (ranked) s.stats.ddLive = (s.stats.ddLive || 0) + 1; out = settleWindow(s, r, 'deadline', 'deadline:' + seed); });
  return gainOf(before, getSave(), out.sp, out.files, 'deadline');
}
/** A Wire call posted: 10 XP. The call's result (followers, Rep at half) lands through lib/byline.ts recordWireResolution. */
export function onWireFiled(): Gain {
  const before = snapOf(getSave());
  update((s) => { s.stats.wire = (s.stats.wire || 0) + 1; s.stats.m_wire = (s.stats.m_wire || 0) + 1; addXP(s, XP.wire); earnHook(s); });
  return gainOf(before, getSave(), noSponsor(), [], 'wire');
}
/** A Wire call settled right: +15 XP (and the coins the Wire screen pays are routed through credit()). The sponsor's
 *  per-call pay for Market calls lands in lib/byline.ts recordWireResolution, where the call resolves. */
export function onWireRight(coins = 0, rid = ''): Gain {
  const before = snapOf(getSave());
  const sp = noSponsor();
  update((s) => { addXP(s, XP.wireRight); if (coins) credit(s, coins, 'wire:' + rid); sp.ends.push(...sponsorTermEnd(s)); sp.offers.push(...refreshOffers(s)); const got: SecretFile[] = []; if ((s.byline?.hot || 0) >= 10) grant(s, 'hot10', got); earnHook(s); });
  return gainOf(before, getSave(), sp, [], 'wire');
}

// ---------------------------------------------------------------- the one place a Driver4 window settles
/** Pass as `onDone` to lib/driver.ts makeDriver (or call with `d.result()` once `d.isOver()`): routes the window's
 *  Outcome4 to the right settle by the driver's mode and returns the Gain the results thread reads. Local modes
 *  settle at once; the Daily and a room round settle when the server's scored result lands. The tutorial and a
 *  challenge play by Practice's book (XP 20, the free-per-day cap, no coins, no sponsor); a challenge's log still
 *  goes to the server through the play screen. Idempotent per window key, like every on*Done. */
export function onDriverDone(r: Outcome4, d: Pick<Driver4, 'mode' | 'seed' | 'no' | 'room' | 'coach' | 'code'>): Gain {
  switch (d.mode) {
    case 'daily': return onDailyDone(ymdUTC(), d.no || r.no || 0, r);
    case 'room': return onRoomDone(r, d.room ? { code: d.room.code, round: d.room.round } : undefined);
    case 'career': return onCareerDone(r);
    case 'deadline': return onDeadlineDone(r, d.seed, false);
    case 'tutorial': return onTutorialDone(r, d.seed);
    case 'challenge': return onPracticeDone(r, !!d.coach, d.code || d.seed);
    default: return onPracticeDone(r, !!d.coach, d.seed);
  }
}
export function onShared() { update((s) => { s.stats.shared = (s.stats.shared || 0) + 1; }); }
/** 3.x hook kept for lib/desk.ts: a Tier One Daily earns one Wire credit. */
let wireCredit: ((s: Save, tier: string) => void) | null = null;
export const setWireCreditHook = (f: typeof wireCredit) => { wireCredit = f; };
// The real-calendar season (lib/season.ts): Rumour Mill, Winter Window, Spring Whispers, Summer Window.
export function seasonName(ms = Date.now()) { return t(seasonAt(ms).nameKey); }
