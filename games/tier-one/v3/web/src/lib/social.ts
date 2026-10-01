// Groups (CONCEPT4 §2, RULES4 §2): rooms with friends on a shared seed (Daily rules exactly, scored on the server),
// challenges (a finished window becomes a 24 h link; the friend plays the exact rules you played, replayed on the
// server), and crews (the newsroom.* actions: up to 20 players whose week adds up). Nothing here changes a Daily board
// or score. This file keeps the player's side of it in `save.social` and the friend ledgers in `save.rivals` under the
// `friend:<pub>` namespace (lib/byline.ts).
import { update, getSave, type Save } from './save';
import { E4, type Act4, type RuleSpec4, type Tier } from './engine';
import { makeDriver, lastWindow, liveWindow } from './driver';
import { v3 } from './api';
import { credit, ymdUTC } from './meta';
import { onGain } from './economy';
import { pushFeed, bylineOf, repTier, netOf, rivalState, FRIEND_NS, isFriendRival, SCALP_NET, SCALP_COINS, TAUNTS, type RivalRec, type RivalResult } from './byline';
import { equipped } from './season';
import { isRankedSeed } from './live';
import { t } from './i18n';

// ---------------------------------------------------------------- types (all optional in the save)
export interface Who { pub: string; nick: string; flair?: string; tier?: string }
export interface ChallengeRes extends Who { score: number; rtier: Tier; row: string; ex: number; at: number; r: RivalResult }
export interface Challenge {
  code: string; kind: 'daily' | 'practice' | 'career' | 'deadline' | 'tutorial'; day?: string; no?: number; seed?: string; label?: string; v?: number; rules?: RuleSpec4;
  by: Who; target: { score: number; tier: Tier; row: string; ex: number; scoops?: number }; at: number; exp: number; res: ChallengeRes[]; open: boolean; mine: boolean;
}
/** A challenge you took and are playing locally (driver mode 'challenge', on its seed and rules). */
export interface Pending { code: string; seed: string; rules: RuleSpec4; kind: Challenge['kind']; by: Who; target: Challenge['target']; at: number; exp: number; sent?: number }
export interface SocialSave {
  seen?: string[]; pub?: string; pending?: Pending | null;
  newsroom?: { code: string; name: string } | null; made?: string[]; answered?: string[];
}
export interface RoomPlayer { pid: string; nick: string; pub: string; flair?: string; tier?: string; joined: number; seen?: number; results: ({ score: number; tier: Tier; ex: number; row: string; at?: number; v?: number; scoops?: number } | null)[] }
export type RoomEvent = { t: 'open' | 'join' | 'filed' | 'taunt'; pid: string; nick: string; at: number; name?: string; round?: number; score?: number; tier?: Tier; ex?: number; scoops?: number; row?: string; hwg?: string[]; drops?: string[]; v?: number; k?: number; to?: string | null; toNick?: string };
export interface Room { code: string; name: string; rounds: number; created: number; host: string; cadence: 'weekly' | 'daily'; season?: string; players: RoomPlayer[]; now: number; roundHours: number; stepMs: number; feed: RoomEvent[] }
export interface RoomRoundCall { day: number; o: number; s: number }
export interface RoomRoundPlayer { pid: string; nick: string; pub: string; flair: string; tier: string; score: number; tier2: Tier; ex: number; scoops?: number; row: string; v?: number; per: { i: number; call: RoomRoundCall | null; right: boolean; excl: boolean; scoop?: boolean; pts: number; truth: number }[] }
export interface RoomRound { code: string; round: number; days: number; v?: number; cast: { i: number; player: { id: string; n: string; s: string; no: number }; from: { id: string; s: string; c1: string; c2: string }; to: { id: string; s: string; c1: string; c2: string }; alt?: { id: string; s: string; c1: string; c2: string } }[]; players: RoomRoundPlayer[] }
export interface NewsroomMember extends Who { joined: number; seen: number; daily: number; wire: number; pts: number; last: number; me: boolean; host: boolean }
export interface Newsroom { code: string; name: string; motto: string; created: number; host: string; masthead: { frame: string; ink: string; flair: string }; members: NewsroomMember[]; week: string; prevWeek: string; total: number; lastTotal: number; rank: number; lastRank: number | null; mine: boolean; isHost: boolean; max: number }
export interface NewsroomTop { code: string; name: string; n: number; pts: number }

export const FRIEND_MIN = 3;
const SEEN_CAP = 400;
const hash = (x: string) => { let h = 0x811c9dc5; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
const soc = (s: Save): SocialSave => (s.social = s.social || {});
const seen = (s: Save, k: string) => !!s.social?.seen?.includes(k);
const mark = (s: Save, k: string) => { const so = soc(s); so.seen = [k, ...(so.seen || []).filter((x) => x !== k)].slice(0, SEEN_CAP); };

/** What the server wants to know about you on every Groups call: device, handle, equipped flair, rank. */
export function identity(s: Save = getSave()) {
  return { dev: s.dev, nick: s.nick.trim().slice(0, 16), flair: equipped('flair', s)?.id || '', tier: repTier(bylineOf(s).rep) };
}
export const myPub = (s: Save = getSave()) => s.social?.pub || '';
export const rememberPub = (pub: string) => { if (pub && getSave().social?.pub !== pub) update((s) => { soc(s).pub = pub; }); };
/** Links (the page's own URL, so they work on the site and the Android build alike). */
export const challengeUrl = (code: string) => location.origin + location.pathname + '?challenge=' + code;
export const newsroomUrl = (code: string) => location.origin + location.pathname + '?newsroom=' + code;
export const roomUrl = (code: string) => location.origin + location.pathname + '?room=' + code;

// ---------------------------------------------------------------- friend rivals (same ledger as the house accounts)
export const friendId = (pub: string) => FRIEND_NS + pub;
/** Every friend you've met, most-played first; `named` marks the ones at FRIEND_MIN meetings. */
export function friendRivals(s: Save = getSave()): (RivalRec & { id: string; pub: string; named: boolean })[] {
  return Object.entries(s.rivals || {}).filter(([id]) => isFriendRival(id))
    .map(([id, r]) => ({ ...r, id, pub: r.pub || id.slice(FRIEND_NS.length), named: (r.plays || 0) >= FRIEND_MIN }))
    .sort((a, b) => Number(b.named) - Number(a.named) || (b.plays || 0) - (a.plays || 0) || (b.at || 0) - (a.at || 0));
}
export const friendTaunt = (r: RivalRec) => (r.taunt ? t('md4.gp.taunt.' + r.taunt, { n: r.name || '?', rec: shortRecord(r), p: r.tp || '' }) : '');
/** One meeting with a friend, settled (`r` is your result). Idempotent per `key`. Mutates `s` (call inside update()). */
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
  if (named && rec.plays === FRIEND_MIN) pushFeed(s, { kind: 'friend', from: id, key: 'md4.gp.feed.friendRival', v: { n: rec.name }, to: { n: 'rivals' }, tone: 'gold' });
  if (named) pushFeed(s, { kind: 'friend', from: id, key: 'md4.gp.taunt.' + rec.taunt, v: { n: rec.name, rec: shortRecord(rec), p: ctx.p || '' }, to: ctx.to || { n: 'rivals' }, tone: r === 'l' ? 'bad' : r === 'w' ? 'good' : undefined });
  if (named && netOf(rec) >= SCALP_NET && !rec.scalp) {
    rec.scalp = Date.now(); credit(s, SCALP_COINS, 'scalp:' + id);
    pushFeed(s, { kind: 'friend', from: id, key: 'md4.gp.feed.friendScalp', v: { n: rec.name, c: SCALP_COINS }, to: { n: 'rivals' }, tone: 'gold' });
  }
}

// ---------------------------------------------------------------- rooms: standings and ledgers
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
/** The room's table: total points, rounds played, rounds won (top score, strict), and the form strip. */
export function standings(room: Room, myPid: string): Standing[] {
  const settled = Array.from({ length: room.rounds }, (_, k) => {
    const done = room.now > roundCloses(room, k) || room.players.every((p) => p.results[k]);
    const scores = room.players.map((p) => (p.results[k] ? p.results[k]!.score : null)).filter((x): x is number => x != null);
    return { done, top: scores.length ? Math.max(...scores) : null, n: scores.length };
  });
  return room.players.map((p) => {
    const form = settled.map((s, k) => { const r = p.results[k]; if (!r || !s.done || s.n < 2) return '-' as const; return r.score === s.top ? (room.players.filter((q) => q.results[k] && q.results[k]!.score === s.top).length > 1 ? 'd' : 'w') : 'l'; });
    const last = [...p.results].reverse().find(Boolean);
    return { p, total: p.results.reduce((a, x) => a + (x ? x.score : 0), 0), n: p.results.filter(Boolean).length, wins: form.filter((f) => f === 'w').length, form, me: p.pid === myPid, last: last ? last.score : null };
  }).sort((a, b) => b.total - a.total || b.wins - a.wins || a.p.joined - b.p.joined);
}
/** After every room.get: friend ledgers for every settled round you both played, and the round's feed line. Idempotent. */
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
        pushFeed(s, { kind: 'room', key: won ? 'md4.gp.feed.roomWin' : 'md4.gp.feed.roomRound', v: { n: k + 1, room: room.name, p: mine.score, top: rows[0]?.p.nick || '' }, to: { n: 'rooms', code: room.code }, tone: won ? 'gold' : undefined });
      }
    }
  });
}
/** Where you stand in a room right now: your place and how many are in it (Boards › Groups). */
export function myPlace(room: Room, myPid: string): { place: number; of: number; total: number } | null {
  const rows = standings(room, myPid), k = rows.findIndex((r) => r.me);
  return k < 0 ? null : { place: k + 1, of: rows.length, total: rows[k].total };
}

// ---------------------------------------------------------------- challenges: make, take, answer, settle
const SEED_OK = /^[A-Z0-9]{4,12}$/; // what the server accepts as a travelling seed
export interface Mintable { mode: 'daily' | 'practice' | 'career' | 'deadline'; day?: string; no?: number; seed?: string; rules?: RuleSpec4; score: number; tier: Tier; row: string; ex: number; at: number; label: string; log?: Act4[] }
/** What a challenge can be made from right now, newest first: today's Daily (once played), the last local window. */
export function mintable(s: Save = getSave()): Mintable[] {
  const out: Mintable[] = [];
  const today = ymdUTC(), d = s.daily[today];
  if (d) out.push({ mode: 'daily', day: today, no: d.no, score: d.total, tier: d.tier, row: d.row, ex: d.ex, at: Date.parse(today + 'T12:00:00Z'), label: t('md4.gp.ch.daily', { n: d.no }) });
  for (const mode of ['practice', 'career', 'deadline'] as const) {
    const l = lastWindow(mode, s);
    if (!l || !SEED_OK.test(l.seed) || isRankedSeed(s, l.seed)) continue; // a ranked DD Live seed never travels
    out.push({ mode, seed: l.seed, rules: l.rules, score: l.total, tier: l.tier, row: l.row, ex: l.scoops, at: l.at, label: l.label || t('md4.gp.ch.mode.' + mode), log: l.log });
  }
  return out.sort((a, b) => b.at - a.at);
}
export async function mintChallenge(m: Mintable) {
  const id = identity();
  const body = m.mode === 'daily' ? { mode: 'daily', day: m.day } : { v: 4, mode: m.mode, seed: m.seed, rules: m.rules, log: m.log };
  const r = await v3<{ challenge: Challenge }>('challenge.create', { ...id, ...body, label: m.label.slice(0, 40) });
  if (!r.ok) return r;
  rememberPub(r.challenge.by.pub);
  update((s) => { const so = soc(s); so.made = [r.challenge.code, ...(so.made || []).filter((c) => c !== r.challenge.code)].slice(0, 20); });
  return r;
}
export const pending = (s: Save = getSave()) => s.social?.pending || null;
/**
 * Take a challenge: opens its board as a local window (driver mode 'challenge') on the maker's seed and rules. The
 * caller routes to the play screen. 'busy' when another challenge window is still open; 'expired' after 24 h.
 */
export async function acceptChallenge(ch: Challenge, seed: string, rules?: RuleSpec4): Promise<'ok' | 'busy' | 'expired' | 'own' | 'old'> {
  if (!ch.open) return 'expired';
  if (ch.mine) return 'own';
  if (ch.v !== 4 && ch.kind !== 'daily') return 'old';
  const live = liveWindow('challenge');
  if (live && live.code !== ch.code) return 'busy';
  const spec = rules || ch.rules || E4.specOf('daily');
  update((x) => { soc(x).pending = { code: ch.code, seed, rules: spec, kind: ch.kind, by: ch.by, target: ch.target, at: Date.now(), exp: ch.exp }; });
  const d = makeDriver({ mode: 'challenge', seed, rules: spec, code: ch.code, resume: !!live, label: t('md4.gp.ch.label', { n: ch.by.nick }) });
  await d.start();
  return 'ok';
}
export const dropPending = () => update((s) => { soc(s).pending = null; });
/** Answer a challenge with a finished log (or, for a Daily, with your ranked result). Settles the ledger on success. */
export async function submitChallenge(code: string, log?: Act4[]) {
  const r = await v3<{ challenge: Challenge; me: ChallengeRes }>('challenge.submit', { ...identity(), code, log });
  if (r.ok) { rememberPub(r.me.pub); settleChallenge(r.challenge); }
  if (r.ok || ['expired', 'done', 'own', 'not found', 'full', 'log'].includes(r.error)) update((s) => { if (soc(s).pending?.code === code) soc(s).pending = null; });
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
        pushFeed(s, { kind: 'challenge', key: 'md4.gp.feed.chRes.' + inv, v: { n: r.nick, s: r.score, t: ch.target.score }, to: { n: 'rooms', challenge: ch.code }, tone: inv === 'w' ? 'good' : inv === 'l' ? 'bad' : undefined });
        friendDuel(s, r, inv, k, { p: ch.label || '', to: { n: 'rooms', challenge: ch.code } });
      } else if (r.pub === me) {
        const k = 'ch:' + ch.code + ':me'; if (seen(s, k)) continue;
        pushFeed(s, { kind: 'challenge', key: 'md4.gp.feed.chMine.' + r.r, v: { n: ch.by.nick, s: r.score, t: ch.target.score }, to: { n: 'rooms', challenge: ch.code }, tone: r.r === 'w' ? 'good' : r.r === 'l' ? 'bad' : undefined });
        friendDuel(s, ch.by, r.r, k, { p: ch.label || '', to: { n: 'rooms', challenge: ch.code } });
        const so = soc(s); so.answered = [ch.code, ...(so.answered || []).filter((c) => c !== ch.code)].slice(0, 20);
      }
    }
  });
}
/** Pull the results of challenges you made; settles anything new. */
export async function refreshMine() {
  const r = await v3<{ list: Challenge[] }>('challenge.mine', { dev: getSave().dev });
  if (r.ok) for (const ch of r.list) settleChallenge(ch);
  return r;
}
/** A finished challenge window (lib/driver.ts keeps it in v4.last.challenge) goes to the server once. */
export async function syncChallenge() {
  const s = getSave(), p = s.social?.pending, last = lastWindow('challenge', s);
  if (!p || !last || last.code !== p.code || last.seed !== p.seed) return;
  await submitChallenge(p.code, last.log);
}
let hooked = false;
/** Registers the settle hook once (ui/social.tsx SocialWatch): a finished challenge window → syncChallenge. */
export function installGroupHooks() {
  if (hooked) return; hooked = true;
  onGain((_g, mode) => { if (mode === 'challenge') setTimeout(() => { void syncChallenge(); }, 0); });
  void syncChallenge();
}

// ---------------------------------------------------------------- crews (newsroom.* on the server)
export function syncNewsroom(nr: Newsroom | null) {
  update((s) => {
    const so = soc(s);
    so.newsroom = nr ? { code: nr.code, name: nr.name } : null;
    if (!nr) return;
    const me = nr.members.find((m) => m.me); if (me?.pub) so.pub = me.pub;
    const k = 'nrweek:' + nr.code + ':' + nr.prevWeek;
    if (nr.lastRank && nr.lastTotal > 0 && !seen(s, k)) {
      mark(s, k);
      pushFeed(s, { kind: 'newsroom', key: 'md4.gp.feed.crewWeek', v: { name: nr.name, r: nr.lastRank, p: nr.lastTotal }, to: { n: 'newsroom', code: nr.code }, tone: nr.lastRank <= 3 ? 'gold' : undefined });
    }
  });
}

// ---------------------------------------------------------------- copy helpers
export const shortRecord = (r: RivalRec) => r.w + '–' + r.l + (r.d ? '–' + r.d : '');
export const hoursLeft = (exp: number) => Math.max(0, Math.ceil((exp - Date.now()) / 3600e3));
