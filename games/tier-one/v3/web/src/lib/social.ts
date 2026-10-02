// Multiplayer rooms (3.8, brief §16–17, docs/spec/H-multiplayer-system.md): the player's side of a room. A room is a
// group chat of football obsessives with a table: one shared board per round under Daily rules exactly, scored on the
// server (api/tier-one/v3 room.*). Everything here is bookkeeping and presentation: standings, the Press Box recap,
// rivalry stats, friend-rival ledgers (save.rivals under the `friend:<pub>` namespace, byline.ts) and share text/cards.
// Nothing here changes a board, a source or a score. Challenges and newsrooms (3.4) are gone: their links land on the
// lobby with "This link has expired".
//
// Used elsewhere: Boards.tsx (loadRoom, forgetRoom, standings), Connect.tsx (friendRivals), save.ts (SocialSave).
import { update, getSave, type Save } from './save';
import type { Tier } from './engine';
import { credit } from './meta';
import { pushFeed, bylineOf, repTier, netOf, rivalState, FRIEND_NS, isFriendRival, SCALP_NET, SCALP_COINS, TAUNTS, type RivalRec, type RivalResult } from './byline';
import { equipped } from './season';
import { playScene } from './scenes';
import { t, tr, num } from './i18n';
import { v3 } from './api';
import { GAME_URL } from './share';

// ---------------------------------------------------------------- types
export interface Who { pub: string; nick: string; flair?: string; tier?: string }
/** What the save keeps for social play: idempotency keys and your public id. Older fields (challenges, newsroom) are tolerated and ignored. */
export interface SocialSave { seen?: string[]; pub?: string; [legacy: string]: unknown }
export interface RoomResult { score: number; tier: Tier; ex: number; row: string; at?: number }
export interface RoomPlayer { pid: string; nick: string; pub: string; flair?: string; tier?: string; joined: number; seen?: number; results: (RoomResult | null)[] }
export type RoomEvent = {
  t: 'open' | 'join' | 'filed' | 'taunt' | 'leave' | 'kick' | 'recap' | 'rematch';
  pid: string; nick: string; at: number; name?: string; round?: number; score?: number; tier?: Tier; ex?: number; row?: string; hwg?: string[]; excl?: string[];
  k?: number; to?: string | null; toNick?: string; code?: string;
  top?: { pid: string; nick: string; score: number; ex: number; tier: Tier }[]; scoop?: { nick: string; p: string; excl: boolean; pts: number } | null;
  disaster?: { nick: string; p: string; o: number; s: number; truth: number; pts: number } | null; filed?: number;
};
export interface Room {
  code: string; name: string; rounds: number; created: number; host: string; cadence: 'weekly' | 'daily'; season?: string; players: RoomPlayer[];
  now: number; roundHours: number; stepMs: number; feed: RoomEvent[]; max: number; over: boolean; next?: string; tauntGap?: number;
}
export interface RoomCall { day: number; o: number; s: number; ut: boolean }
export interface RoomRoundPlayer { pid: string; nick: string; pub: string; flair: string; tier: string; score: number; tier2: Tier; ex: number; row: string; at: number; per: { i: number; call: RoomCall | null; right: boolean; excl: boolean; pts: number; truth: number }[] }
export interface RecapCall { nick: string; pid: string; p: string; o: number; s: number; day: number; pts: number; right: boolean; excl: boolean; truth: number }
export interface Recap { table: { pid: string; nick: string; score: number; ex: number; tier: Tier }[]; scoop: RecapCall | null; disaster: RecapCall | null; first: RecapCall | null; filed: number }
export interface RoomRound { code: string; round: number; days: number; cast: { i: number; player: { id: string; n: string; s: string; no: number }; from: { id: string; s: string; c1: string; c2: string }; to: { id: string; s: string; c1: string; c2: string }; alt?: { id: string; s: string; c1: string; c2: string } }[]; players: RoomRoundPlayer[]; recap: Recap }
export type RoomRef = { code: string; name: string; pid: string; sec: string; nick: string };

// ---------------------------------------------------------------- room math (mirrors the server's constants; the server decides)
/** Recommended size band and the hard cap (brief §17): a group chat, not a tournament. */
export const ROOM_SIZE = { min: 2, bestLo: 2, bestHi: 12, max: 16 } as const;
export const ROOM_ROUNDS = [3, 7, 14] as const;
export const ROOM_ROUNDS_DEFAULT = 7;
export const ROOM_CODE_LEN = 5;
export const ROOM_IDLE_DAYS = 21;
export const TAUNT_GAP_S = 30;
export const FRIEND_MIN = 3;
const SEEN_CAP = 400;

const hash = (x: string) => { let h = 0x811c9dc5; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
const soc = (s: Save): SocialSave => (s.social = s.social || {});
const seen = (s: Save, k: string) => !!s.social?.seen?.includes(k);
const mark = (s: Save, k: string) => { const so = soc(s); so.seen = [k, ...(so.seen || []).filter((x) => x !== k)].slice(0, SEEN_CAP); };

/** What the server wants to know about you on every room call: device, byline, equipped flair, rep tier. */
export function identity(s: Save = getSave()) {
  return { dev: s.dev, nick: s.nick.trim().slice(0, 16), flair: equipped('flair', s)?.id || '', tier: repTier(bylineOf(s).rep) };
}
export const myPub = (s: Save = getSave()) => s.social?.pub || '';
export const rememberPub = (pub: string) => { if (pub && getSave().social?.pub !== pub) update((s) => { soc(s).pub = pub; }); };
/** Invite link for a code (the page's own URL, so it works on the live site and the Android build alike). */
export const roomUrl = (code: string) => location.origin + location.pathname + '?room=' + code;

// ---------------------------------------------------------------- rounds and states
export const roundOpens = (room: Room, k: number) => room.created + k * room.stepMs;
export const roundCloses = (room: Room, k: number) => roundOpens(room, k) + room.roundHours * 3600e3;
export type RoundState = 'soon' | 'open' | 'played' | 'closed';
export function roundState(room: Room, k: number, me?: RoomPlayer): RoundState {
  if (me?.results[k]) return 'played';
  if (room.now < roundOpens(room, k)) return 'soon';
  return room.now > roundCloses(room, k) ? 'closed' : 'open';
}
/** A round is settled (table counts it, recap and film exist) when its clock ran out or every seat filed. */
export const roundSettled = (room: Room, k: number) => room.now > roundCloses(room, k) || (room.players.length > 0 && room.players.every((p) => p.results[k]));
/** The current round index (the one open now), or the next to open, or the last. */
export function currentRound(room: Room) {
  for (let k = 0; k < room.rounds; k++) if (room.now <= roundCloses(room, k)) return k;
  return room.rounds - 1;
}
export const roomOver = (room: Room) => room.over ?? room.now > roundCloses(room, room.rounds - 1);
/** Days until an untouched room is archived (the idle clock restarts on every visit). */
export const archiveDays = (room: Room) => Math.max(0, Math.ceil((Math.max(room.now, ...room.players.map((p) => p.seen || p.joined)) + ROOM_IDLE_DAYS * 864e5 - room.now) / 864e5));

// ---------------------------------------------------------------- the season table
export interface Standing { p: RoomPlayer; total: number; n: number; wins: number; ex: number; form: ('w' | 'l' | 'd' | '-' | 'x')[]; me: boolean; last: number | null; missed: number }
/**
 * Standings, by the spec's tie-breakers: total points → round wins → exclusives → longest seated. A round counts once
 * it's settled; a win is the top score among those who filed (two or more), shared on a tie ('d'). A settled round you
 * didn't file is a miss ('x', 0 points): no penalty beyond the points you didn't score (spec H §5).
 */
export function standings(room: Room, myPid: string, upTo = room.rounds): Standing[] {
  const settled = Array.from({ length: Math.min(upTo, room.rounds) }, (_, k) => {
    const done = roundSettled(room, k);
    const scores = room.players.map((p) => (p.results[k] ? p.results[k]!.score : null)).filter((x): x is number => x != null);
    const top = scores.length ? Math.max(...scores) : null;
    return { done, top, n: scores.length, tops: top == null ? 0 : scores.filter((x) => x === top).length };
  });
  return room.players.map((p) => {
    const form = settled.map((s, k) => { const r = p.results[k]; if (!s.done) return '-' as const; if (!r) return 'x' as const; if (s.n < 2) return '-' as const; return r.score === s.top ? (s.tops > 1 ? 'd' as const : 'w' as const) : 'l' as const; });
    const played = p.results.slice(0, settled.length);
    const last = [...played].reverse().find(Boolean);
    return {
      p, total: played.reduce((a, x) => a + (x ? x.score : 0), 0), n: played.filter(Boolean).length, wins: form.filter((f) => f === 'w').length,
      ex: played.reduce((a, x) => a + (x ? x.ex : 0), 0), form, me: p.pid === myPid, last: last ? last.score : null, missed: form.filter((f) => f === 'x').length,
    };
  }).sort((a, b) => b.total - a.total || b.wins - a.wins || b.ex - a.ex || a.p.joined - b.p.joined);
}
/** Rank movement from the table before round k to the table after it: pid → places gained (+) or lost (−). */
export function movement(room: Room, k: number): Record<string, number> {
  const before = standings(room, '', k), after = standings(room, '', k + 1);
  const pos = (rows: Standing[]) => Object.fromEntries(rows.map((r, i) => [r.p.pid, i]));
  const a = pos(before), b = pos(after), out: Record<string, number> = {};
  for (const pid of Object.keys(b)) out[pid] = (a[pid] ?? b[pid]) - b[pid];
  return out;
}
/** Head-to-head inside this room: rounds you both filed, and who took them. */
export interface Rivalry { w: number; l: number; d: number; n: number; best: number | null; theirBest: number | null; streak: number }
export function rivalry(room: Room, myPid: string, pid: string): Rivalry {
  const me = room.players.find((p) => p.pid === myPid), them = room.players.find((p) => p.pid === pid);
  const out: Rivalry = { w: 0, l: 0, d: 0, n: 0, best: null, theirBest: null, streak: 0 };
  if (!me || !them) return out;
  for (let k = 0; k < room.rounds; k++) {
    const a = me.results[k], b = them.results[k];
    if (a) out.best = Math.max(out.best ?? -Infinity, a.score);
    if (b) out.theirBest = Math.max(out.theirBest ?? -Infinity, b.score);
    if (!a || !b || !roundSettled(room, k)) continue;
    out.n++;
    const r = a.score > b.score ? 'w' : a.score < b.score ? 'l' : 'd';
    out[r]++;
    out.streak = r === 'd' ? 0 : r === 'w' ? (out.streak > 0 ? out.streak + 1 : 1) : (out.streak < 0 ? out.streak - 1 : -1);
  }
  return out;
}

// ---------------------------------------------------------------- the Press Box recap: words, text, image
const OUT_KEYS = ['done', 'hijack', 'off', 'fake'] as const;
const STR_KEYS = ['talks', 'advanced', 'confirmed'] as const;
/** "Confirmed Fake" / "Advanced Done": how a call reads on the card. */
export const callWords = (o: number, s: number, lang = getSave().lang) => tr(lang, 'str.' + STR_KEYS[Math.max(0, Math.min(2, s))]) + ' ' + tr(lang, 'out.' + OUT_KEYS[Math.max(0, Math.min(3, o))]);
export interface RecapView { round: number; room: string; lines: { nick: string; score: number; ex: number; me: boolean; move: number }[]; scoop: string; disaster: string; first: string; missed: string[] }
/** The recap as the screen and the share text show it: table lines with rank movement, the three awards, who missed. */
export function recapView(room: Room, rr: RoomRound, myPid: string, lang = getSave().lang): RecapView {
  const mv = movement(room, rr.round);
  const rc = rr.recap || { table: [], scoop: null, disaster: null, first: null, filed: 0 };
  const T = (k: string, v?: Record<string, string | number>) => tr(lang, k, v);
  const lines = rc.table.map((p) => ({ nick: p.nick, score: p.score, ex: p.ex, me: p.pid === myPid, move: mv[p.pid] || 0 }));
  const scoop = rc.scoop ? (rc.scoop.excl ? T('rm.recap.scoopExcl', { n: rc.scoop.nick, p: rc.scoop.p, pts: num(rc.scoop.pts, true) }) : T('rm.recap.scoopPlain', { n: rc.scoop.nick, p: rc.scoop.p, c: callWords(rc.scoop.o, rc.scoop.s, lang), pts: num(rc.scoop.pts, true) })) : T('rm.recap.none');
  const disaster = rc.disaster ? T('rm.recap.disasterLine', { n: rc.disaster.nick, p: rc.disaster.p, c: callWords(rc.disaster.o, rc.disaster.s, lang), pts: num(rc.disaster.pts) }) : T('rm.recap.clean');
  const first = rc.first ? T('rm.recap.firstLine', { n: rc.first.nick, p: rc.first.p, d: rc.first.day }) : T('rm.recap.noExcl');
  const missed = room.players.filter((p) => !p.results[rr.round]).map((p) => p.nick);
  return { round: rr.round + 1, room: room.name, lines, scoop, disaster, first, missed };
}
/** The recap as plain text for WhatsApp / Discord / any group chat. Spoiler-free: names, points, calls; never the truth of a board still open elsewhere. */
export function recapText(v: RecapView, lang = getSave().lang): string {
  const T = (k: string, vv?: Record<string, string | number>) => tr(lang, k, vv);
  const move = (m: number) => (m > 0 ? ' ▲' + m : m < 0 ? ' ▼' + -m : '');
  const rows = v.lines.map((l, i) => `${i + 1}. ${l.nick} ${l.score}${l.ex ? ' ★' + l.ex : ''}${move(l.move)}`);
  return [T('rm.recap.title', { n: v.round, room: v.room }), ...rows, '', T('rm.recap.scoop') + ': ' + v.scoop, T('rm.recap.disaster') + ': ' + v.disaster, v.missed.length ? T('rm.recap.missed', { n: v.missed.join(', ') }) : '', '', GAME_URL].filter((x) => x !== '').join('\n');
}
export const whatsappUrl = (text: string) => 'https://wa.me/?text=' + encodeURIComponent(text);

/** The recap card as a 1080×1350 PNG (the same paper as the scoop card), drawn on a canvas. No network. */
export async function renderRecapCard(v: RecapView, lang = getSave().lang): Promise<Blob | null> {
  try { await document.fonts.ready; } catch { /* fonts: fall back */ }
  const W = 1080, H = 1350, P = 64, ar = lang === 'ar';
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); if (!ctx) return null;
  const T = (k: string, vv?: Record<string, string | number>) => tr(lang, k, vv);
  const cond = ar ? '"IBM Plex Sans Arabic", sans-serif' : '"Archivo", "Arial Narrow", sans-serif';
  const disp = ar ? '"Noto Naskh Arabic", serif' : '"Newsreader", Georgia, serif';
  const mono = ar ? '"IBM Plex Sans Arabic", sans-serif' : '"IBM Plex Mono", monospace';
  const PAPER = '#F2EEE5', INK = '#15130F', INK2 = '#5E584D', CORAL = '#D2381B', GOLD = '#B8860B', GREEN = '#17613F';
  const S = ar ? W - P : P, E = ar ? P : W - P, alS: CanvasTextAlign = ar ? 'right' : 'left', alE: CanvasTextAlign = ar ? 'left' : 'right';
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  for (let k = 0; k < 8000; k++) { ctx.fillStyle = `rgba(80,70,55,${Math.random() * 0.05})`; ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
  ctx.direction = ar ? 'rtl' : 'ltr'; ctx.textBaseline = 'alphabetic';
  // masthead
  ctx.fillStyle = INK; ctx.font = `700 92px "Newsreader", Georgia, serif`; ctx.direction = 'ltr'; ctx.textAlign = ar ? 'right' : 'left'; ctx.fillText('Tier One', S, P + 76, W * 0.55);
  ctx.direction = ar ? 'rtl' : 'ltr';
  ctx.font = `500 26px ${mono}`; ctx.fillStyle = INK2; ctx.textAlign = alE; ctx.fillText(v.room.toUpperCase().slice(0, 28), E, P + 44, W * 0.4); ctx.fillText(T('rm.recap.kicker').toUpperCase(), E, P + 80, W * 0.4);
  ctx.fillStyle = INK; ctx.fillRect(P, P + 100, W - 2 * P, 10); ctx.fillRect(P, P + 118, W - 2 * P, 3);
  // THE PRESS BOX · ROUND N
  ctx.textAlign = alS; ctx.fillStyle = CORAL; ctx.font = `900 46px ${cond}`; ctx.fillText(T('rm.recap.head', { n: v.round }).toUpperCase(), S, P + 190);
  // table
  const top = P + 236, rowH = Math.min(96, Math.floor(560 / Math.max(3, v.lines.length)));
  v.lines.slice(0, 16).forEach((l, i) => {
    const y = top + rowH * i + rowH * 0.68;
    ctx.fillStyle = i === 0 ? GOLD : INK; ctx.font = `900 ${Math.min(52, rowH - 30)}px ${cond}`; ctx.textAlign = alS;
    ctx.direction = 'ltr'; ctx.fillText((i + 1) + '.', S, y);
    ctx.fillText(l.nick, ar ? S - 74 : S + 74, y, W * 0.5);
    ctx.direction = ar ? 'rtl' : 'ltr';
    ctx.textAlign = alE; ctx.fillStyle = l.score < 0 ? CORAL : i === 0 ? GOLD : INK; ctx.fillText(String(l.score) + (l.ex ? ' ★' : ''), E, y);
    if (l.move) { ctx.font = `700 26px ${mono}`; ctx.fillStyle = l.move > 0 ? GREEN : CORAL; ctx.fillText((l.move > 0 ? '▲' : '▼') + Math.abs(l.move), ar ? E + 150 : E - 150, y); }
    ctx.fillStyle = 'rgba(21,19,15,.16)'; ctx.fillRect(P, top + rowH * (i + 1) - 2, W - 2 * P, 2);
  });
  // awards
  let y = Math.min(top + rowH * Math.min(16, Math.max(3, v.lines.length)) + 70, H - P - 290);
  const award = (k: string, line: string, col: string) => {
    ctx.textAlign = alS; ctx.fillStyle = col; ctx.font = `900 30px ${cond}`; ctx.fillText(T(k).toUpperCase(), S, y);
    ctx.fillStyle = INK; ctx.font = `italic 400 38px ${disp}`;
    const words = line.split(/\s+/); let cur = '', lines: string[] = [];
    for (const w of words) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > W - 2 * P && cur) { lines.push(cur); cur = w; } else cur = n; }
    if (cur) lines.push(cur);
    for (const l of lines.slice(0, 2)) { y += 46; ctx.fillText(l, S, y, W - 2 * P); }
    y += 58;
  };
  award('rm.recap.scoop', v.scoop, GOLD); award('rm.recap.disaster', v.disaster, CORAL);
  // foot
  ctx.fillStyle = INK; ctx.fillRect(P, H - P - 64, W - 2 * P, 3);
  ctx.font = `italic 400 36px ${disp}`; ctx.textAlign = alS; ctx.fillText(T('rm.recap.foot'), S, H - P - 14, W * 0.55);
  ctx.font = `500 26px ${mono}`; ctx.textAlign = alE; ctx.direction = 'ltr'; ctx.fillText(GAME_URL.replace(/^https?:\/\//, '').toUpperCase(), E, H - P - 16);
  return new Promise((res) => cv.toBlob((b) => res(b), 'image/png'));
}
/** Share the recap: the system sheet with the image where the device takes files, else the text; copies the text as a fallback. */
export async function shareRecap(v: RecapView): Promise<'shared' | 'copied' | 'cancelled'> {
  const text = recapText(v);
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  try {
    if (nav.share) {
      let files: File[] | undefined;
      try { const blob = await renderRecapCard(v); if (blob && nav.canShare && nav.canShare({ files: [new File([blob], 'x.png', { type: 'image/png' })] })) files = [new File([blob], 'tier-one-press-box.png', { type: 'image/png' })]; } catch { files = undefined; }
      await nav.share(files ? { files, text } : { text });
      return 'shared';
    }
  } catch { return 'cancelled'; }
  try { await navigator.clipboard?.writeText(text); } catch { /* clipboard blocked */ }
  return 'copied';
}

// ---------------------------------------------------------------- friend rivals (same ledger as the house rivals)
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
export function friendDuel(s: Save, who: Who, r: RivalResult, key: string, ctx: { p?: string; to?: { n: 'rooms'; code?: string } } = {}) {
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

/** After every room.get: friend ledgers for every settled round you both filed, the round-win film, the recap note. Idempotent. */
export function syncRoom(room: Room, myPid: string) {
  const me = room.players.find((p) => p.pid === myPid); if (!me) return;
  if (me.pub && me.pub !== me.pid) rememberPub(me.pub);
  const rows = standings(room, myPid);
  update((s) => {
    for (let k = 0; k < room.rounds; k++) {
      const mine = me.results[k]; if (!mine) continue;
      const done = roundSettled(room, k);
      for (const p of room.players) {
        const theirs = p.results[k]; if (p.pid === myPid || !theirs || !done) continue;
        friendDuel(s, { pub: p.pub || p.pid, nick: p.nick, flair: p.flair, tier: p.tier }, mine.score > theirs.score ? 'w' : mine.score < theirs.score ? 'l' : 'd', 'room:' + room.code + ':' + k + ':' + (p.pub || p.pid), { p: room.name, to: { n: 'rooms', code: room.code } });
      }
      const key = 'roomwin:' + room.code + ':' + k;
      const filers = room.players.filter((p) => p.results[k]);
      if (done && filers.length > 1 && !seen(s, key)) {
        mark(s, key);
        const top = Math.max(...filers.map((p) => p.results[k]!.score));
        const won = mine.score === top && filers.filter((p) => p.results[k]!.score === top).length === 1;
        const runner = filers.filter((p) => p.pid !== myPid).sort((a, b) => b.results[k]!.score - a.results[k]!.score)[0];
        pushFeed(s, { kind: 'room', key: won ? 'so.feed.roomWin' : 'so.feed.roomRound', v: { n: k + 1, room: room.name, p: mine.score, top: rows[0]?.p.nick || '' }, to: { n: 'rooms', code: room.code }, tone: won ? 'gold' : undefined });
        if (won) s.stats.roomWins = (s.stats.roomWins || 0) + 1; // My Press Card: Multiplayer wins
        if (won) queueFilm('moment-room-win', { room: room.name, round: k + 1, score: mine.score, margin: runner ? mine.score - runner.results[k]!.score : 0, who: runner?.nick || '' });
      }
    }
  });
}

// ---------------------------------------------------------------- rooms you hold a seat in
/** A saved room, read from the server. 'gone' when the server no longer has it (idle 21 days, or the last seat left);
 *  'seat' when the room is there but your seat isn't (the host showed you the door). */
export async function loadRoom(ref: RoomRef): Promise<{ room: Room } | { gone: true } | { seat: true } | { error: string }> {
  const x = await v3<{ room: Room }>('room.get', { code: ref.code, pid: ref.pid, sec: ref.sec, ...identity() });
  if (!x.ok) return x.error === 'not found' ? { gone: true } : x.error === 'seat' ? { seat: true } : { error: String(x.error || 'generic') };
  // A room from an older server carries no cadence, feed, step or cap: it ran a round a day, and its feed is simply empty.
  const old = x.room as Partial<Room> & Pick<Room, 'code' | 'name' | 'rounds' | 'created' | 'host' | 'players' | 'roundHours'>;
  const room: Room = { ...old, cadence: old.cadence || 'daily', stepMs: old.stepMs || 864e5, feed: old.feed || [], now: old.now || Date.now(), max: old.max || ROOM_SIZE.max, over: false };
  room.over = old.over ?? room.now > roundCloses(room, room.rounds - 1);
  return { room };
}
/** Drop a room from the saved list (left, kicked, or closed on the server). */
export function forgetRoom(code: string) { update((s) => { s.rooms = s.rooms.filter((r) => r.code !== code); }); }
/** Leave a room on the server (`room.leave`), then forget it. A room already gone counts as left. */
export async function leaveRoom(ref: RoomRef): Promise<boolean> {
  const x = await v3<{ closed?: boolean }>('room.leave', { code: ref.code, pid: ref.pid, sec: ref.sec });
  if (!x.ok && x.error !== 'not found') return false;
  forgetRoom(ref.code);
  return true;
}
/** Host only: show a reporter the door. */
export async function kickFromRoom(ref: RoomRef, who: string) {
  return v3<{ room: Room }>('room.kick', { code: ref.code, pid: ref.pid, sec: ref.sec, who });
}
/** Host only, after the last round: a fresh room with the same settings; the old feed carries the code. */
export async function rematchRoom(ref: RoomRef) {
  return v3<{ room: Room; pid: string; sec: string }>('room.rematch', { ...identity(), code: ref.code, pid: ref.pid, sec: ref.sec });
}
/** Remember a seat (create, join, rematch) at the top of the list. */
export function rememberRoom(r: { room: Room; pid: string; sec: string }, nick: string) {
  update((x) => { x.rooms = [{ code: r.room.code, name: r.room.name, pid: r.pid, sec: r.sec, nick }, ...x.rooms.filter((q) => q.code !== r.room.code)]; });
}

// ---------------------------------------------------------------- copy helpers
export const shortRecord = (r: RivalRec) => r.w + '–' + r.l + (r.d ? '–' + r.d : '');
