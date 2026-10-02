// Progress around the window: streak (with grace days), coins, Season XP on the season track, the 30 achievements,
// earned credits, and toasts. Everything here is local and cosmetic: none of it touches a ranked score.
// 3.8 (docs/spec/E-economy.md): the hidden coin drip (20 coins every 400 lifetime XP) is gone; a finished Daily pays
// 8 coins (+12 at Tier 1, +4 at Tier 2); every 7-day streak pays 25; credits are earned for real (lib/earnhook.ts →
// lib/wallet.ts): the first Tier 1 and every 30-day streak.
import { update, getSave, type Save } from './save';
import type { Result } from './engine';
import { t } from './i18n';
import { trackWindow } from './progress';
import { addSeasonPP, seasonAt } from './season';
import { earnHook, creditHook } from './earnhook';

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

/** Coins a finished Daily pays, by tier (E §2). */
export const DAILY_COINS = { base: 8, T1: 12, T2: 4 } as const;
export const STREAK_COINS = 25; // every 7th consecutive Daily
/** Season XP a finished window pays (E §4). */
export const XP = { daily: 20, T1: 15, T2: 10, T3: 5, practice: 10, practiceCap: 3, career: 10, room: 15, wireFiled: 5, wireRight: 10, ach: 25 } as const;

export const ACH: Record<string, number> = {
  first: 10, t1: 50, t1x3: 50, excl: 20, excl3: 50, clean: 30, uturn: 15, twist: 20, dd: 15, silent: 10,
  fake: 20, hijack: 15, agent: 20, echo: 10, physio: 15, streak7: 20, streak30: 50, practice5: 15, coach: 10, career1: 10,
  rank2: 20, rank3: 30, rank5: 50, trust5: 30, leak: 25, wire1: 10, wireRight: 25, room: 15, share: 10, rich: 20,
};
export const ACH_IDS = Object.keys(ACH);

function grant(s: Save, id: string) {
  if (s.ach[id] || !(id in ACH)) return;
  s.ach[id] = Date.now();
  credit(s, ACH[id], 'ach:' + id);
  addPP(s, XP.ach);
  const name = t('ach.list.' + id + '.0') || id;
  setTimeout(() => toast('ach', t('ach.got', { n: name }), t('ach.reward', { n: ACH[id] })), 300);
}
/** Coins earned by play land here (and in the legacy ledger the Store's receipts read). */
export function credit(s: Save, d: number, why: string) {
  if (!d) return;
  s.credits += d; s.ledger = [{ at: Date.now(), d, why }, ...s.ledger].slice(0, 30);
  s.stats.earned = (s.stats.earned || 0) + Math.max(0, d);
  if ((s.stats.earned || 0) >= 500) grant(s, 'rich');
}
/** Season XP: lifetime Press Points keep counting (sync merges them), the season track moves by the same amount. */
export function addPP(s: Save, n: number) {
  if (n <= 0) return;
  s.pp += n; addSeasonPP(s, n);
}

export const ymdUTC = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);

// Per-window achievements shared by every mode.
function windowAch(s: Save, r: Result) {
  if (r.ex >= 1) grant(s, 'excl');
  if (r.ex >= 3) grant(s, 'excl3');
  if (r.called === r.per.length && r.right === r.per.length && r.per.length >= 5) grant(s, 'clean');
  if (r.per.some((p) => p.right && p.call && p.call.ut)) grant(s, 'uturn');
  if (r.per.some((p) => p.right && p.tw)) grant(s, 'twist');
  if (r.called === 0 && r.total >= 0) grant(s, 'silent');
  if (r.per.some((p) => p.right && p.truth === 3 && p.call && p.call.s === 2)) grant(s, 'fake');
  if (r.per.some((p) => p.right && p.truth === 1)) grant(s, 'hijack');
  if (r.per.some((p) => p.right && p.call && p.reads.some((c) => c.src === 'agent' && c.r >= 2 && c.r === p.call!.o))) grant(s, 'agent');
  if (r.per.some((p) => p.right && p.call && p.call.s === 2 && p.reads.some((c) => c.src === 'physio' && c.day <= p.call!.day))) grant(s, 'physio');
  if (r.per.some((p) => !p.right && p.call && p.reads.filter((c) => c.src === 'barber' && c.r === p.call!.o).length + p.posts.filter((f) => f.id !== 'insider' && f.claim === p.call!.o && f.day < p.call!.day).length >= 2)) grant(s, 'echo');
}
/** Every finished window: achievements, the mission counters, the season recap, earned looks and the referral's first window. */
function finishWindow(s: Save, r: Result, mode: 'daily' | 'practice' | 'story' | 'room') {
  windowAch(s, r);
  trackWindow(s, r, mode);
  if (mode !== 'practice') creditHook('firstWindow', s);
  earnHook(s);
}

export function onDailyDone(dayKey: string, no: number, r: Result, extra: { ddLast15?: boolean } = {}) {
  update((s) => {
    if (s.daily[dayKey]) { s.daily[dayKey] = { ...s.daily[dayKey], rank: r.rank, players: r.players, par: r.par }; return; }
    s.daily[dayKey] = { no, total: r.total, tier: r.tier, row: r.row || '', ex: r.ex, rank: r.rank, players: r.players, par: r.par };
    // Streak with grace days: one earned per 7-day run (bank up to 2); a missed day spends one.
    const st = s.streak;
    const gap = st.last ? dayDiff(st.last, dayKey) : 99;
    if (gap === 1) st.n++;
    else if (gap > 1 && gap - 1 <= st.grace && st.n > 0) { st.grace -= gap - 1; st.n++; }
    else if (gap !== 0) st.n = 1;
    st.last = dayKey; st.best = Math.max(st.best, st.n);
    if (st.n % 7 === 0) { st.grace = Math.min(2, st.grace + 1); credit(s, STREAK_COINS, 'streak:' + st.n); }
    if (st.n >= 7) grant(s, 'streak7');
    if (st.n >= 30) grant(s, 'streak30');
    creditHook('streak', st.n, s); // 40 credits at every 30 days (lib/wallet.ts)
    credit(s, DAILY_COINS.base + (r.tier === 'T1' ? DAILY_COINS.T1 : r.tier === 'T2' ? DAILY_COINS.T2 : 0), 'daily:' + no);
    addPP(s, XP.daily + (({ T1: XP.T1, T2: XP.T2, T3: XP.T3 } as Record<string, number>)[r.tier] || 0));
    s.stats.dailies = (s.stats.dailies || 0) + 1;
    if (r.tier === 'T1') { s.stats.t1 = (s.stats.t1 || 0) + 1; creditHook('firstTier1', s); }
    grant(s, 'first');
    if (r.tier === 'T1') grant(s, 't1');
    if ((s.stats.t1 || 0) >= 3) grant(s, 't1x3');
    if (extra.ddLast15) grant(s, 'dd');
    finishWindow(s, r, 'daily');
  });
}
export function onPracticeDone(r: Result, coach: boolean) {
  update((s) => {
    const d = ymdUTC();
    if (s.practice.day !== d) { s.practice.day = d; s.practice.today = 0; }
    s.practice.today++; s.practice.played++;
    if (s.practice.today <= XP.practiceCap) addPP(s, XP.practice);
    if (s.practice.played >= 5) grant(s, 'practice5');
    if (coach) grant(s, 'coach');
    finishWindow(s, r, 'practice');
  });
}
export function onCareerDone(r: Result, milestoneCredits: number) {
  update((s) => {
    const c = s.career; if (!c) return;
    grant(s, 'career1');
    if (c.rank >= 1) grant(s, 'rank2');
    if (c.rank >= 2) grant(s, 'rank3');
    if (c.rank >= 4) grant(s, 'rank5');
    if (Object.values(s.book || {}).some((x) => x.xp >= 560)) grant(s, 'trust5'); // a gold card in the Contacts Book
    if (Object.values(c.relations).some((x) => x.v >= 3)) grant(s, 'leak');
    if (milestoneCredits) credit(s, milestoneCredits, 'followers');
    addPP(s, XP.career);
    finishWindow(s, r, 'story');
  });
}
export function onRoomDone(r: Result) { update((s) => { grant(s, 'room'); addPP(s, XP.room); finishWindow(s, r, 'room'); }); }
export function onWireFiled() { update((s) => { grant(s, 'wire1'); s.stats.wire = (s.stats.wire || 0) + 1; s.stats.m_wire = (s.stats.m_wire || 0) + 1; addPP(s, XP.wireFiled); }); }
export function onWireRight() { update((s) => { grant(s, 'wireRight'); addPP(s, XP.wireRight); }); }
/** A result shared (the share sheet, X, a saved card): the trophy and the "share a result" mission. */
export function onShared() { update((s) => { grant(s, 'share'); s.stats.m_share = (s.stats.m_share || 0) + 1; }); }
/** Spends coins (Career favours, coffee, a blog rename, the Store). False when short. */
export function spend(n: number, why: string): boolean {
  if (getSave().credits < n) return false;
  update((s) => { s.credits -= n; s.ledger = [{ at: Date.now(), d: -n, why }, ...s.ledger].slice(0, 30); });
  return true;
}
// The real-calendar season (lib/season.ts): Rumour Mill, Winter Window, Spring Whispers, Summer Window.
export function seasonName(ms = Date.now()) { return t(seasonAt(ms).nameKey); }
