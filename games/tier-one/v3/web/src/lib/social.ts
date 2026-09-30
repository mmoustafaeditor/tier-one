// The press box (GOTY.md §7.3): friend rivals, "beat my board" challenges, room and newsroom bookkeeping, live presence.
// Everything here is local and cosmetic: nothing changes a Daily board, its sources or its score. Ranked truth stays on
// the server (api/tier-one/v3 room.* / challenge.* / newsroom.* / live.*); this file keeps the player's side of it in
// `save.social` and writes the friend ledgers into `save.rivals` under the `friend:<pub>` namespace (byline.ts).
//
// INTEGRATION (one line each; owners of those files add them):
//   • App.tsx        → mount <SocialWatch /> once (ui/social.tsx): it notices a Practice/Career window ending and
//                      answers an accepted challenge with that window's log. Already done on this branch.
//   • Results.tsx    → <ChallengeButton view={view} /> next to Share: mints a challenge link for the window just played.
//   • Connect.tsx    → friendRivals(save) gives the friend cards; <FriendRivalCard rec={r} /> renders one in the
//                      existing rival grid. (The press box screen shows them too, so nothing waits on this.)
//   • Window.tsx     → <LivePresence board="daily" /> on the Daily board (live lane).
import { update, getSave, type Save, type LocalWindow } from './save';
import { E, RULES, castFor, type Act, type Tier } from './engine';
import { careerRules, castOpts } from './career';
import { v3 } from './api';
import { credit, ymdUTC } from './meta';
import { pushFeed, bylineOf, repTier, netOf, rivalState, FRIEND_NS, isFriendRival, SCALP_NET, SCALP_COINS, TAUNTS, type RivalRec, type RivalResult } from './byline';
import { equipped } from './season';
import { playScene } from './scenes';
import { t } from './i18n';

// ---------------------------------------------------------------- types (all optional in the save)
export interface Who { pub: string; nick: string; flair?: string; tier?: string }
export interface ChallengeRes extends Who { score: number; rtier: Tier; row: string; ex: number; at: number; r: RivalResult }
export interface Challenge {
  code: string; kind: 'daily' | 'practice' | 'career'; day?: string; no?: number; seed?: string; label?: string;
  by: Who; target: { score: number; tier: Tier; row: string; ex: number }; at: number; exp: number; res: ChallengeRes[]; open: boolean; mine: boolean;
}
/** A challenge you accepted and are playing locally (Practice, on its seed). */
export interface Pending { code: string; seed: string; kind: Challenge['kind']; by: Who; target: Challenge['target']; at: number; exp: number }
/** The last local window that finished (Practice or Career), reconstructed from its log: what a challenge is minted from. */
export interface LastLocal { seed: string; mode: 'practice' | 'career'; total: number; tier: Tier; row: string; ex: number; at: number; log: Act[]; label?: string }
export interface SocialSave {
  seen?: string[]; pub?: string; pending?: Pending | null; lastLocal?: LastLocal | null;
  newsroom?: { code: string; name: string } | null; made?: string[]; answered?: string[];
}
export interface RoomPlayer { pid: string; nick: string; pub: string; flair?: string; tier?: string; joined: number; seen?: number; results: ({ score: number; tier: Tier; ex: number; row: string; at?: number } | null)[] }
export type RoomEvent = { t: 'open' | 'join' | 'filed' | 'taunt'; pid: string; nick: string; at: number; name?: string; round?: number; score?: number; tier?: Tier; ex?: number; row?: string; hwg?: string[]; k?: number; to?: string | null; toNick?: string };
export interface Room { code: string; name: string; rounds: number; created: number; host: string; cadence: 'weekly' | 'daily'; season?: string; players: RoomPlayer[]; now: number; roundHours: number; stepMs: number; feed: RoomEvent[] }
export interface RoomRoundPlayer { pid: string; nick: string; pub: string; flair: string; tier: string; score: number; tier2: Tier; ex: number; row: string; per: { i: number; call: { day: number; o: number; s: number; ut: boolean } | null; right: boolean; excl: boolean; pts: number; truth: number }[] }
export interface RoomRound { code: string; round: number; days: number; cast: { i: number; player: { id: string; n: string; s: string; no: number }; from: { id: string; s: string; c1: string; c2: string }; to: { id: string; s: string; c1: string; c2: string }; alt?: { id: string; s: string; c1: string; c2: string } }[]; players: RoomRoundPlayer[] }
export interface NewsroomMember extends Who { joined: number; seen: number; daily: number; wire: number; pts: number; last: number; me: boolean; host: boolean }
export interface Newsroom { code: string; name: string; motto: string; created: number; host: string; masthead: { frame: string; ink: string; flair: string }; members: NewsroomMember[]; week: string; prevWeek: string; total: number; lastTotal: number; rank: number; lastRank: number | null; mine: boolean; isHost: boolean; max: number }
export interface NewsroomTop { code: string; name: string; n: number; pts: number }

export const FRIEND_MIN = 3;
const SEEN_CAP = 400;
const hash = (x: string) => { let h = 0x811c9dc5; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
const soc = (s: Save): SocialSave => (s.social = s.social || {});
const seen = (s: Save, k: string) => !!s.social?.seen?.includes(k);
const mark = (s: Save, k: string) => { const so = soc(s); so.seen = [k, ...(so.seen || []).filter((x) => x !== k)].slice(0, SEEN_CAP); };

/** What the server wants to know about you on every social call: device, byline, equipped flair, rep tier. */
export function identity(s: Save = getSave()) {
  return { dev: s.dev, nick: s.nick.trim().slice(0, 16), flair: equipped('flair', s)?.id || '', tier: repTier(bylineOf(s).rep) };
}
export const myPub = (s: Save = getSave()) => s.social?.pub || '';
export const rememberPub = (pub: string) => { if (pub && getSave().social?.pub !== pub) update((s) => { soc(s).pub = pub; }); };
/** Challenge link for a code (the page's own URL, so it works on the live site and the Android build alike). */
export const challengeUrl = (code: string) => location.origin + location.pathname + '?challenge=' + code;
export const newsroomUrl = (code: string) => location.origin + location.pathname + '?newsroom=' + code;
export const roomUrl = (code: string) => location.origin + location.pathname + '?room=' + code;

// ---------------------------------------------------------------- friend rivals (§7.3, same ledger as §1.3)
export const friendId = (pub: string) => FRIEND_NS + pub;
/** Every friend you've met, most-played first; `named` marks the ones at FRIEND_MIN meetings (the Rivals screen's rows). */
export function friendRivals(s: Save = getSave()): (RivalRec & { id: string; pub: string; named: boolean })[] {
  return Object.entries(s.rivals || {}).filter(([id]) => isFriendRival(id))
    .map(([id, r]) => ({ ...r, id, pub: r.pub || id.slice(FRIEND_NS.length), named: (r.plays || 0) >= FRIEND_MIN }))
    .sort((a, b) => Number(b.named) - Number(a.named) || (b.plays || 0) - (a.plays || 0) || (b.at || 0) - (a.at || 0));
}
export const friendTaunt = (r: RivalRec) => (r.taunt ? t('so.taunt.' + r.taunt, { n: r.name || '?', rec: r.w + '–' + r.l + (r.d ? '–' + r.d : ''), p: r.tp || '' }) : '');
/**
 * One meeting with a friend, settled: `r` is your result against them. Idempotent per `key`. Mutates `s` (call inside
 * update()). At three meetings they become a named rival; at five net wins you take their scalp (film + coins).
 */
export function friendDuel(s: Save, who: Who, r: RivalResult, key: string, ctx: { p?: string; to?: { n: 'rooms' | 'newsroom'; code?: string; challenge?: string } } = {}) {
  if (!who.pub || who.pub === myPub(s) || seen(s, key)) return;
  mark(s, key);
  const id = friendId(who.pub), rv = (s.rivals = s.rivals || {});
  const rec: RivalRec = (rv[id] = rv[id] || { w: 0, l: 0, d: 0, streak: 0, last: '' });
  rec.pub = who.pub; rec.name = who.nick || rec.name || '?'; rec.plays = (rec.plays || 0) + 1; rec.at = Date.now();
  if (r === 'w') { rec.w++; rec.streak = rec.streak > 0 ? rec.streak + 1 : 1; } else if (r === 'l') { rec.l++; rec.streak = rec.streak < 0 ? rec.streak - 1 : -1; } else rec.d++;
  rec.last = r;
  const st = rivalState(rec);
  const prev = rec.taunt && rec.taunt.startsWith(st + '.') ? Number(rec.taunt.split('.')[1]) : -1;
  let idx = hash(key + who.pub) % TAUNTS; if (idx === prev) idx = (idx + 1) % TAUNTS;
  rec.taunt = st + '.' + idx; rec.tp = ctx.p || '';
  const named = rec.plays >= FRIEND_MIN;
  if (named && rec.plays === FRIEND_MIN) pushFeed(s, { kind: 'friend', from: id, key: 'so.feed.friendRival', v: { n: rec.name }, to: { n: 'rivals' }, tone: 'gold' });
  if (named) pushFeed(s, { kind: 'friend', from: id, key: 'so.taunt.' + rec.taunt, v: { n: rec.name, rec: rec.w + '–' + rec.l + (rec.d ? '–' + rec.d : ''), p: ctx.p || '' }, to: ctx.to || { n: 'rivals' }, tone: r === 'l' ? 'bad' : r === 'w' ? 'good' : undefined });
  if (named && netOf(rec) >= SCALP_NET && !rec.scalp) {
    rec.scalp = Date.now(); credit(s, SCALP_COINS, 'scalp:' + id);
    pushFeed(s, { kind: 'friend', from: id, key: 'so.feed.friendScalp', v: { n: rec.name, c: SCALP_COINS }, to: { n: 'rivals' }, tone: 'gold' });
    queueFilm('moment-friend-scalp', { name: rec.name, w: rec.w, l: rec.l });
  }
}
// Films raised inside update() play after the save settles (the scene queue is outside React's render).
const films: [string, Record<string, unknown>][] = [];
let filmT = 0;
function queueFilm(id: string, props: Record<string, unknown>) { films.push([id, props]); if (!filmT) filmT = setTimeout(() => { filmT = 0; for (const [i, p] of films.splice(0)) playScene(i, p); }, 0) as unknown as number; }

// ---------------------------------------------------------------- rooms: standings, ledgers, the round-win film
export const roundOpens = (room: Room, k: number) => room.created + k * room.stepMs;
export const roundCloses = (room: Room, k: number) => roundOpens(room, k) + room.roundHours * 3600e3;
export type RoundState = 'soon' | 'open' | 'played' | 'closed';
export function roundState(room: Room, k: number, me?: RoomPlayer): RoundState {
  if (me?.results[k]) return 'played';
  if (room.now < roundOpens(room, k)) return 'soon';
  return room.now > roundCloses(room, k) ? 'closed' : 'open';
}
/** The current round index (the one open now), or the next to open, or the last. */
export function currentRound(room: Room) {
  for (let k = 0; k < room.rounds; k++) if (room.now <= roundCloses(room, k)) return k;
  return room.rounds - 1;
}
export interface Standing { p: RoomPlayer; total: number; n: number; wins: number; form: ('w' | 'l' | 'd' | '-')[]; me: boolean; last: number | null }
/** The season table: total points, rounds filed, rounds won (top score, strict), and the form strip. */
export function standings(room: Room, myPid: string): Standing[] {
  const settled = Array.from({ length: room.rounds }, (_, k) => {
    const done = room.now > roundCloses(room, k) || room.players.every((p) => p.results[k]);
    const scores = room.players.map((p) => (p.results[k] ? p.results[k]!.score : null)).filter((x): x is number => x != null);
    return { done, top: scores.length ? Math.max(...scores) : null, n: scores.length };
  });
  return room.players.map((p) => {
    const form = settled.map((s, k) => { const r = p.results[k]; if (!r || !s.done || s.n < 2) return '-' as const; return r.score === s.top ? (settled[k].n > 1 && room.players.filter((q) => q.results[k] && q.results[k]!.score === s.top).length > 1 ? 'd' : 'w') : 'l'; });
    const last = [...p.results].reverse().find(Boolean);
    return { p, total: p.results.reduce((a, x) => a + (x ? x.score : 0), 0), n: p.results.filter(Boolean).length, wins: form.filter((f) => f === 'w').length, form, me: p.pid === myPid, last: last ? last.score : null };
  }).sort((a, b) => b.total - a.total || b.wins - a.wins || a.p.joined - b.p.joined);
}
/** After every room.get: friend ledgers for every settled round you both filed, and the round-win film. Idempotent. */
export function syncRoom(room: Room, myPid: string) {
  const me = room.players.find((p) => p.pid === myPid); if (!me) return;
  if (me.pub && me.pub !== me.pid) rememberPub(me.pub);
  const rows = standings(room, myPid);
  update((s) => {
    for (let k = 0; k < room.rounds; k++) {
      const mine = me.results[k]; if (!mine) continue;
      const done = room.now > roundCloses(room, k) || room.players.every((p) => p.results[k]);
      for (const p of room.players) {
        const theirs = p.results[k]; if (p.pid === myPid || !theirs || !done) continue;
        friendDuel(s, { pub: p.pub || p.pid, nick: p.nick, flair: p.flair, tier: p.tier }, mine.score > theirs.score ? 'w' : mine.score < theirs.score ? 'l' : 'd', 'room:' + room.code + ':' + k + ':' + (p.pub || p.pid), { p: room.name, to: { n: 'rooms', code: room.code } });
      }
      const key = 'roomwin:' + room.code + ':' + k;
      if (done && room.players.length > 1 && !seen(s, key)) {
        mark(s, key);
        const top = Math.max(...room.players.map((p) => (p.results[k] ? p.results[k]!.score : -Infinity)));
        const won = mine.score === top && room.players.filter((p) => p.results[k] && p.results[k]!.score === top).length === 1;
        const runner = room.players.filter((p) => p.pid !== myPid && p.results[k]).sort((a, b) => b.results[k]!.score - a.results[k]!.score)[0];
        pushFeed(s, { kind: 'room', key: won ? 'so.feed.roomWin' : 'so.feed.roomRound', v: { n: k + 1, room: room.name, p: mine.score, top: rows[0]?.p.nick || '' }, to: { n: 'rooms', code: room.code }, tone: won ? 'gold' : undefined });
        if (won) queueFilm('moment-room-win', { room: room.name, round: k + 1, score: mine.score, margin: runner ? mine.score - runner.results[k]!.score : 0, who: runner?.nick || '' });
      }
    }
  });
}

// ---------------------------------------------------------------- challenges: mint, accept, answer, settle
/** The window a challenge can be minted from right now, newest first: today's Daily (once played), the last local window. */
export function mintable(s: Save = getSave()): { mode: 'daily' | 'practice' | 'career'; day?: string; no?: number; seed?: string; score: number; tier: Tier; row: string; ex: number; at: number; label: string; log?: Act[] }[] {
  const out = [];
  const today = ymdUTC(), d = s.daily[today];
  if (d) out.push({ mode: 'daily' as const, day: today, no: d.no, score: d.total, tier: d.tier, row: d.row, ex: d.ex, at: Date.parse(today + 'T12:00:00Z'), label: t('front.dailyNo', { n: d.no }) });
  const l = s.social?.lastLocal;
  if (l) out.push({ mode: l.mode, seed: l.seed, score: l.total, tier: l.tier, row: l.row, ex: l.ex, at: l.at, label: l.label || (l.mode === 'career' ? t('cn.mode.career') : t('cn.mode.practice')) + ' · ' + l.seed, log: l.log });
  return out.sort((a, b) => b.at - a.at);
}
export async function mintChallenge(m: ReturnType<typeof mintable>[number]) {
  const id = identity();
  const r = await v3<{ challenge: Challenge }>('challenge.create', { ...id, mode: m.mode, day: m.day, seed: m.seed, log: m.mode === 'practice' ? m.log : undefined, score: m.score, tier: m.tier, row: m.row, ex: m.ex, label: m.label.slice(0, 40) });
  if (!r.ok) return r;
  rememberPub(r.challenge.by.pub);
  update((s) => { const so = soc(s); so.made = [r.challenge.code, ...(so.made || []).filter((c) => c !== r.challenge.code)].slice(0, 20); });
  return r;
}
export const pending = (s: Save = getSave()) => s.social?.pending || null;
/**
 * Take a challenge: opens its board as a Practice window on the same seed. 'busy' when another Practice window is
 * live (finish or drop that first); 'expired' when the 24 h are up. Career challenges replay under Daily rules.
 */
export function acceptChallenge(ch: Challenge, seed: string): 'ok' | 'busy' | 'expired' | 'own' {
  if (!ch.open) return 'expired';
  if (ch.mine) return 'own';
  const s = getSave();
  if (s.practice.live && s.practice.live.seed !== seed) return 'busy';
  update((x) => {
    soc(x).pending = { code: ch.code, seed, kind: ch.kind, by: ch.by, target: ch.target, at: Date.now(), exp: ch.exp };
    if (!x.practice.live) x.practice.live = { seed, mode: 'practice', log: [], started: Date.now(), coach: false, label: t('so.ch.label', { n: ch.by.nick }) };
  });
  return 'ok';
}
export const dropPending = () => update((s) => { soc(s).pending = null; });
/** Answer a challenge with a finished log (or, for a Daily, with your ranked result). Settles the ledger on success. */
export async function submitChallenge(code: string, log?: Act[]) {
  const r = await v3<{ challenge: Challenge; me: ChallengeRes }>('challenge.submit', { ...identity(), code, log });
  if (r.ok) { rememberPub(r.me.pub); settleChallenge(r.challenge); }
  if (r.ok || ['expired', 'done', 'own', 'not found', 'full'].includes(r.error)) update((s) => { if (soc(s).pending?.code === code) soc(s).pending = null; });
  return r;
}
/** Feed lines and friend ledgers for a challenge's results, from either side. Idempotent per (code, pub). */
export function settleChallenge(ch: Challenge) {
  update((s) => {
    const me = myPub(s);
    for (const r of ch.res) {
      if (ch.mine) {
        const inv: RivalResult = r.r === 'w' ? 'l' : r.r === 'l' ? 'w' : 'd';
        const k = 'ch:' + ch.code + ':' + r.pub; if (seen(s, k)) continue;
        pushFeed(s, { kind: 'challenge', key: 'so.feed.chRes', v: { n: r.nick, s: r.score, t: ch.target.score, r: 'so.ch.' + inv }, to: { n: 'rooms', challenge: ch.code }, tone: inv === 'w' ? 'good' : inv === 'l' ? 'bad' : undefined });
        friendDuel(s, r, inv, k, { p: ch.label || '', to: { n: 'rooms', challenge: ch.code } });
      } else if (r.pub === me) {
        const k = 'ch:' + ch.code + ':me'; if (seen(s, k)) continue;
        pushFeed(s, { kind: 'challenge', key: 'so.feed.chMine', v: { n: ch.by.nick, s: r.score, t: ch.target.score, r: 'so.ch.' + r.r }, to: { n: 'rooms', challenge: ch.code }, tone: r.r === 'w' ? 'good' : r.r === 'l' ? 'bad' : undefined });
        friendDuel(s, ch.by, r.r, k, { p: ch.label || '', to: { n: 'rooms', challenge: ch.code } });
        const so = soc(s); so.answered = [ch.code, ...(so.answered || []).filter((c) => c !== ch.code)].slice(0, 20);
      }
    }
  });
}
/** Pull the results of challenges you made (call from the press box); settles anything new. */
export async function refreshMine() {
  const r = await v3<{ list: Challenge[] }>('challenge.mine', { dev: getSave().dev });
  if (r.ok) for (const ch of r.list) settleChallenge(ch);
  return r;
}

// ---------------------------------------------------------------- the watcher: a local window just ended
/** Rebuilds a finished local window from the log the save held before it closed (the closing act is `finish`). */
export function reconstruct(prev: Save, lw: LocalWindow): LastLocal | null {
  try {
    const career = lw.mode === 'career' ? prev.career : null;
    const cast = career ? castFor(lw.seed, castOpts(career)) : castFor(lw.seed, { n: RULES.SAGAS });
    const R = career ? careerRules(career, cast) : RULES;
    const g = E.replay(E.buildBoard(lw.seed, R), lw.log, R); if (!g) return null;
    if (!E.isOver(g)) E.finish(g);
    const r = E.resolve(g);
    return { seed: lw.seed, mode: lw.mode, total: r.total, tier: r.tier, row: E.gridRow(r), ex: r.ex, at: Date.now(), log: g.log.slice(), label: lw.label };
  } catch { return null; }
}
/** Pure: which local windows closed between two saves (the live slot went from that seed to empty). */
export function closedWindows(prev: Save, next: Save): LocalWindow[] {
  const out: LocalWindow[] = [];
  if (prev.practice.live && !next.practice.live && prev.practice.live.log.length) out.push(prev.practice.live);
  if (prev.career?.live && next.career && !next.career.live && prev.career.live.log.length) out.push(prev.career.live);
  return out;
}
/** Called by <SocialWatch/> on every save change: records the last local window and answers a pending challenge. */
export function onSaveChange(prev: Save, next: Save) {
  for (const lw of closedWindows(prev, next)) {
    const last = reconstruct(prev, lw); if (!last) continue;
    update((s) => { soc(s).lastLocal = last; });
    const p = next.social?.pending;
    if (p && p.seed === lw.seed && lw.mode === 'practice') void submitChallenge(p.code, last.log);
  }
}

// ---------------------------------------------------------------- newsroom bookkeeping
export function syncNewsroom(nr: Newsroom | null) {
  update((s) => {
    const so = soc(s);
    so.newsroom = nr ? { code: nr.code, name: nr.name } : null;
    if (!nr) return;
    const me = nr.members.find((m) => m.me); if (me?.pub) so.pub = me.pub;
    // Last week's finish, once per week: the feed line and the newsroom-week film.
    const k = 'nrweek:' + nr.code + ':' + nr.prevWeek;
    if (nr.lastRank && nr.lastTotal > 0 && !seen(s, k)) {
      mark(s, k);
      pushFeed(s, { kind: 'newsroom', key: 'so.feed.nrWeek', v: { name: nr.name, r: nr.lastRank, p: nr.lastTotal }, to: { n: 'newsroom', code: nr.code }, tone: nr.lastRank <= 3 ? 'gold' : undefined });
      queueFilm('moment-newsroom-week', { name: nr.name, rank: nr.lastRank, pts: nr.lastTotal, n: nr.members.length });
    }
  });
}

// ---------------------------------------------------------------- copy helpers
export const shortRecord = (r: RivalRec) => r.w + '–' + r.l + (r.d ? '–' + r.d : '');
export const hoursLeft = (exp: number) => Math.max(0, Math.ceil((exp - Date.now()) / 3600e3));
