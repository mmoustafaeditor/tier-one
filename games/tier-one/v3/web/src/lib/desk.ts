// The editor's desk (GOTY.md §7.1–7.2): one assignment queue across every mode, the morning papers, the streak
// stake, the welcome-back note, and the cross-mode consequences that ride the byline's events.
// Pure readers take the save and `now`; the only writers are touchDesk() (called when Home opens), the mark* helpers
// and the byline listener at the bottom, which writes into the same draft the byline is already writing.
import { getSave, update, type Save } from './save';
import type { Route } from '../App';
import { onByline, setWireShield, pushFeed, unreadOf, toRoute, RIVALS, rivalOf, netOf, type FeedItem } from './byline';
import { missionsView } from './progress';
import { ymdUTC } from './meta';
import { totalFavours } from './career';
import { moment } from './moments';
import { trackStyle } from './style';
import { ddLiveActive, ddResultsDue, ddCountdown, liveOf, liveDraft, myDDCalls, type LiveSave } from './live';
import type { DeadlineDay } from './season';
import type { WireCall, BoardItem } from './wireData';

const DAY = 864e5;
const hash = (x: string) => { let h = 0x811c9dc5; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY);
export const WELCOME_DAYS = 3, WIRE_CREDIT_CAP = 3, STREAK_FILMS = [7, 30, 100];

// ---------------------------------------------------------------- §7.1 the queue
export type AssignKind = 'ddlive' | 'ddresults' | 'daily' | 'resume' | 'wire' | 'career' | 'room' | 'wireSettling' | 'mission' | 'practice';
export interface Assignment { kind: AssignKind; to: Route; v?: Record<string, string | number>; voice: number; feedId?: string; hot?: boolean; dd?: DeadlineDay }
/** What the desk knows from elsewhere: the Wire cache (open calls) and how many rooms have a round open. Optional. */
export interface DeskCtx { wire?: { calls: WireCall[]; board: Record<string, BoardItem> } | null; roomsOpen?: number; roomCode?: string }
const VOICES = 5040; // a wide seed: ui/live.tsx takes it modulo the editor's pool (live.desk.voice + live.desk.voice3)

/** The assignments in the order the editor hands them out. Each carries a `voice` index into the editor's lines. */
export function assignments(s: Save, now = Date.now(), ctx: DeskCtx = {}): Assignment[] {
  const today = ymdUTC(now), out: Assignment[] = [];
  const voice = (k: string) => hash(today + '|' + k + '|' + s.dev) % VOICES;
  const dd = ddLiveActive(now);
  if (dd) { const n = Object.keys(myDDCalls(s, dd.day)).length; out.push({ kind: 'ddlive', to: { n: 'ddlive' } as Route, v: { n, left: hmsShort(ddCountdown(dd, now).ms) }, voice: voice('ddlive'), hot: true, dd }); }
  const live = s.last && ymdUTC(s.last.at) === today && !s.last.pub.over ? s.last.pub : null;
  if (!s.daily[today]) out.push({ kind: 'daily', to: { n: 'daily' }, v: live ? { d: live.day } : undefined, voice: voice('daily'), hot: !dd });
  const res = ddResultsDue(now);
  if (res && !dd) out.push({ kind: 'ddresults', to: { n: 'ddlive' } as Route, voice: voice('ddresults'), dd: res });
  if (s.practice.live) out.push({ kind: 'resume', to: { n: 'play', mode: 'practice', key: 0 }, v: { m: 'practice', d: s.practice.live.log.filter((a) => a[0] === 'e').length + 1 }, voice: voice('resume') });
  else if (s.career && s.career.live) out.push({ kind: 'resume', to: { n: 'story' }, v: { m: 'career', d: s.career.live.log.filter((a) => a[0] === 'e').length + 1 }, voice: voice('resume') });
  const un = unreadOf(s);
  const wire = un.find((f) => f.kind === 'wire');
  if (wire) out.push({ kind: 'wire', to: toRoute(wire.to), v: wire.v, feedId: wire.id, voice: voice('wire') });
  if (s.career && !s.career.live && !(s.career.history[0] && ymdUTC(s.career.history[0].at) === today)) out.push({ kind: 'career', to: { n: 'story' }, v: { w: s.career.windows + 1 }, voice: voice('career') });
  const room = un.find((f) => f.kind === 'room');
  if (room) out.push({ kind: 'room', to: toRoute(room.to), v: room.v, feedId: room.id, voice: voice('room') });
  else if (ctx.roomsOpen) out.push({ kind: 'room', to: { n: 'rooms', code: ctx.roomCode }, v: { n: ctx.roomsOpen }, voice: voice('room') });
  const settling = ctx.wire ? ctx.wire.calls.filter((c) => !c.done && ctx.wire!.board[c.rid]?.state === 'frozen').length : 0;
  if (settling && !wire) out.push({ kind: 'wireSettling', to: { n: 'wire' }, v: { n: settling }, voice: voice('wireSettling') });
  const ready = (missionsView(s) || []).filter((m) => m.done && !m.claimed).length;
  if (ready) out.push({ kind: 'mission', to: { n: 'front' }, v: { n: ready }, voice: voice('mission') });
  if (out.length < 2) out.push({ kind: 'practice', to: { n: 'practice' }, voice: voice('practice') });
  return out;
}
const hmsShort = (ms: number) => { const h = Math.floor(ms / 36e5), m = Math.floor((ms % 36e5) / 6e4); return h ? h + 'h ' + String(m).padStart(2, '0') + 'm' : m + 'm'; };
/** The one line the editor says about the whole day (the brief's kicker): what's first on the queue, in their voice. */
export const leadAssignment = (s: Save, now = Date.now(), ctx?: DeskCtx) => assignments(s, now, ctx)[0];

// ---------------------------------------------------------------- §7.2 the streak stake and the welcome back
export interface StreakStake { n: number; best: number; grace: number; playedToday: boolean; atRisk: boolean; lost: LiveSave['streakLost'] | null; taker: string; resetsIn: number }
/** The rival who "takes your slot": the one currently ahead of you on the ledger, else a stable pick for the day. */
export function slotTaker(s: Save, day = ymdUTC()): string {
  const ahead = RIVALS.map((id) => ({ id, net: netOf(rivalOf(s, id)) })).filter((r) => r.net < 0).sort((a, b) => a.net - b.net)[0];
  return ahead ? ahead.id : RIVALS[hash('taker|' + day + '|' + s.dev) % RIVALS.length];
}
export function streakStake(s: Save, now = Date.now()): StreakStake {
  const today = ymdUTC(now), played = !!s.daily[today];
  const lost = liveOf(s).streakLost || null;
  const live = lost && !played && now - lost.at < 7 * DAY ? lost : null;
  const gap = s.streak.last ? dayDiff(s.streak.last, today) : 99;
  const alive = s.streak.n > 0 && (gap <= 1 || gap - 1 <= s.streak.grace);
  return {
    n: alive ? s.streak.n : 0, best: s.streak.best, grace: s.streak.grace, playedToday: played, atRisk: alive && !played && s.streak.n > 0, lost: live,
    taker: live ? live.by : slotTaker(s, today), resetsIn: Date.parse(today + 'T00:00:00Z') + DAY - now,
  };
}
export interface Welcome { days: number; at: number }
export const welcomeBack = (s: Save): Welcome | null => { const w = liveOf(s).welcome; return w && !w.seen ? { days: w.days, at: w.at } : null; };

/** The desk notices you: call once when Home mounts. Records the visit, sets the welcome-back note after 3+ days
 *  away, and books the streak a rival took when a miss can't be covered by grace. Idempotent within a day. */
export function touchDesk(now = Date.now()) {
  const today = ymdUTC(now);
  update((x) => {
    const l = liveDraft(x);
    if (l.lastDay !== today) {
      const away = l.lastDay ? dayDiff(l.lastDay, today) : 0;
      if (away >= WELCOME_DAYS) l.welcome = { days: away, at: now };
      l.lastDay = today;
    }
    l.lastOpen = now;
    const st = x.streak, gap = st.last ? dayDiff(st.last, today) : 0;
    if (st.n >= 2 && gap >= 2 && gap - 1 > st.grace && !x.daily[today] && !(l.streakLost && l.streakLost.last === st.last)) {
      l.streakLost = { n: st.n, by: slotTaker(x, today), at: now, last: st.last };
      pushFeed(x, { id: 'slot:' + st.last, kind: 'streak', key: 'live.feed.slotTaken', v: { rival: l.streakLost.by, n: st.n }, to: { n: 'daily' }, tone: 'bad' });
    }
  });
}
export const markWelcomeSeen = () => update((x) => { const l = liveDraft(x); if (l.welcome) l.welcome.seen = true; });

// ---------------------------------------------------------------- §7.1 the morning papers
export interface Paper {
  day: string; sinceMs: number; items: FeedItem[]; taunts: FeedItem[];
  rank: { no: number; tier: string; total: number; rank: number | null; players: number } | null;
  stake: StreakStake; welcome: Welcome | null; assignments: Assignment[]; dd: DeadlineDay | null; ddResults: DeadlineDay | null;
}
export const paperSeenToday = (s: Save, now = Date.now()) => liveOf(s).paperDay === ymdUTC(now);
/** Today's recap, or null when it was already read today or there's nothing to recap yet (a brand-new save). */
export function morningPaper(s: Save, now = Date.now(), ctx: DeskCtx = {}): Paper | null {
  if (paperSeenToday(s, now)) return null;
  // A career only counts once a window has been played: onboarding creates one, and the tutorial's first day is no time for a recap.
  const hasHistory = Object.keys(s.daily).length > 0 || (s.feed || []).length > 0 || !!(s.career && s.career.windows > 0);
  if (!hasHistory) return null;
  const today = ymdUTC(now), l = liveOf(s);
  const since = Math.max(l.lastOpen && l.lastDay !== today ? l.lastOpen : 0, now - 36 * 3600e3);
  const fresh = (s.feed || []).filter((f) => f.at >= since);
  const items = fresh.filter((f) => f.kind !== 'rival' && f.kind !== 'streak' && f.kind !== 'mission').slice(0, 5);
  const taunts = fresh.filter((f) => f.kind === 'rival').slice(0, 2);
  const yday = ymdUTC(now - DAY), r = s.daily[yday] || null;
  return {
    day: today, sinceMs: since, items, taunts, rank: r ? { no: r.no, tier: r.tier, total: r.total, rank: r.rank ?? null, players: r.players || 0 } : null,
    stake: streakStake(s, now), welcome: welcomeBack(s), assignments: assignments(s, now, ctx).slice(0, 3), dd: ddLiveActive(now), ddResults: ddResultsDue(now),
  };
}
export const markPaperSeen = (now = Date.now()) => update((x) => { const l = liveDraft(x); l.paperDay = ymdUTC(now); if (l.welcome) l.welcome.seen = true; if (l.streakLost) l.streakLost.seen = true; });

// ---------------------------------------------------------------- the Daily brief (before day 1)
export const briefSeenToday = (s: Save, now = Date.now()) => liveOf(s).briefDay === ymdUTC(now);
export const markBriefSeen = (now = Date.now()) => update((x) => { liveDraft(x).briefDay = ymdUTC(now); });
/** The share-card flair a Career promotion earned (a rank index into career.ranks.<n>), for the share lane. */
export const shareFlair = (s: Save = getSave()) => liveOf(s).flair || null;
export const wireCredits = (s: Save = getSave()) => liveOf(s).wireCredits || 0;

// ---------------------------------------------------------------- desk events for other lanes (the press box)
export type DeskEvent = { kind: 'room-result'; code: string; round: number; tier?: string; total?: number; followers: number };
const deskSubs = new Set<(e: DeskEvent) => void>();
export function onDesk(f: (e: DeskEvent) => void) { deskSubs.add(f); return () => { deskSubs.delete(f); }; }

// ---------------------------------------------------------------- §7.1 cross-mode consequences (ride the byline's events)
const once = (l: LiveSave, key: string) => { const keys = (l.keys = l.keys || []); if (keys.includes(key)) return false; keys.unshift(key); if (keys.length > 120) keys.length = 120; return true; };
onByline((e) => {
  const s = e.save, l = liveDraft(s);
  switch (e.kind) {
    case 'wire': {
      // A Wire call that lands moves the Career editor's opinion and unlocks a favour (Story only; never the Daily).
      if (!e.call.right || !s.career || !once(l, 'wire:' + e.call.rid)) return;
      const st = (s.story = s.story || {});
      st.inbox = [...(st.inbox || []), { at: Date.now(), from: 'editor', key: 'wireLanded', v: { p: e.player || '?' } }].slice(-30);
      if (totalFavours(s.career) < 5) { s.career.favours.tipoff++; pushFeed(s, { kind: 'editor', from: 'editor', key: 'live.feed.favour', v: { p: e.player || '?' }, to: { n: 'story' }, tone: 'gold' }); }
      return;
    }
    case 'career-promo': {
      if (!once(l, 'promo:' + e.rank)) return;
      l.flair = { rank: e.rank, at: Date.now() };
      pushFeed(s, { kind: 'level', key: 'live.feed.flair', v: { m: 'career.ranks.' + e.rank }, to: { n: 'me' }, tone: 'gold' });
      return;
    }
    case 'daily-t1': {
      if (!once(l, 't1:' + e.no)) return;
      l.wireCredits = Math.min(WIRE_CREDIT_CAP, (l.wireCredits || 0) + 1);
      pushFeed(s, { kind: 'wire', key: 'live.feed.credit', v: { n: l.wireCredits }, to: { n: 'wire' }, tone: 'gold' });
      return;
    }
    case 'room-window': {
      for (const f of deskSubs) { try { f({ kind: 'room-result', code: e.code, round: e.round, tier: e.tier, total: e.total, followers: e.sum.followers }); } catch { /* */ } }
      return;
    }
    case 'window': {
      trackStyle(s, e.w.per, e.w.mode);
      if (e.w.mode !== 'daily') return;
      const films = (l.streakFilms = l.streakFilms || {});
      for (const m of STREAK_FILMS) if (s.streak.n === m && !films[m]) { films[m] = Date.now(); moment('streak:' + m, { n: m }); }
      if (l.streakLost && !l.streakLost.seen) l.streakLost.seen = true;
      return;
    }
  }
});
// A Wire credit shields one wrong Wire call (followers and rep), consumed in the byline's own draft.
setWireShield((s) => { const l = liveDraft(s); if ((l.wireCredits || 0) <= 0) return false; l.wireCredits!--; return true; });
