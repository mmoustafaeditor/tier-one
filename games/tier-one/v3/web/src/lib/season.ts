// Seasons and the cosmetic economy (GOTY.md §3). Real-calendar seasons, each with its own 40-level track fed by the
// same Press Points as the account level, a free and a Gold lane, a cosmetics catalogue, and a weekly event.
// The fairness line: nothing here reaches a Daily board, its sources or its score. Everything is cosmetic or coins.
// Weekly-event rule deltas are data only; the Practice/Career integrator applies them to local windows.
import { update, getSave, type Save } from './save';
import type { Result, Tier } from './engine';
import type { Sfx } from './sfx';
import { t } from './i18n';

const DAY = 864e5;
const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);
const hash = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
export const today = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);

// ---------- Seasons on the real calendar (UTC dates, inclusive)
export type SeasonKey = 'rumour' | 'winter' | 'spring' | 'summer';
const CAL: { key: SeasonKey; from: [number, number]; to: [number, number]; accent: string }[] = [
  { key: 'winter', from: [1, 1], to: [2, 2], accent: '#5BB8E8' },
  { key: 'spring', from: [2, 3], to: [6, 15], accent: '#7FCB6A' },
  { key: 'summer', from: [6, 16], to: [9, 1], accent: '#FF7A3D' },
  { key: 'rumour', from: [9, 2], to: [12, 31], accent: '#D9913A' },
];
export interface Season {
  id: string; key: SeasonKey; year: number; nameKey: string; accent: string;
  start: number; end: number; // ms, end is exclusive (00:00 UTC the day after the last day)
  days: number; daysLeft: number; ppPerLv: number;
}
// XP per season level. The track should take a committed player (Daily + missions, about 100 XP a day) roughly three
// quarters of the season to finish, so short windows get cheaper levels: Winter 60, Summer 150, Rumour Mill 230,
// Spring 260. Rounded to 10 and never under 60.
const perLevel = (days: number) => Math.max(60, Math.round((days * 0.75 * 100) / (MAX_SLV - 1) / 10) * 10);
export const MAX_SLV = 40;

export function seasonAt(ms = Date.now()): Season {
  const y = new Date(ms).getUTCFullYear();
  const c = CAL.find((x) => ms < utc(y, x.to[0], x.to[1]) + DAY) || CAL[CAL.length - 1];
  const start = utc(y, c.from[0], c.from[1]), end = utc(y, c.to[0], c.to[1]) + DAY;
  const days = Math.round((end - start) / DAY);
  return {
    id: c.key + '-' + y, key: c.key, year: y, nameKey: 'season.names.' + c.key, accent: c.accent, start, end, days,
    daysLeft: Math.max(0, Math.ceil((end - ms) / DAY)), ppPerLv: perLevel(days),
  };
}
export function seasonById(id: string): Season | null {
  const m = /^(rumour|winter|spring|summer)-(\d{4})$/.exec(id); if (!m) return null;
  const c = CAL.find((x) => x.key === m[1])!;
  return seasonAt(utc(+m[2], c.from[0], c.from[1]) + DAY / 2);
}
// For the season opener and other lanes: the live season, its display name in the player's language and its accent.
export function currentSeason(ms = Date.now()) { const x = seasonAt(ms); return { id: x.id, name: t(x.nameKey), accent: x.accent, start: x.start, end: x.end }; }
export const nextSeason = (ms = Date.now()) => seasonAt(seasonAt(ms).end + DAY / 2);

// ---------- Season state in the save
export interface SeasonSave {
  id: string; pp: number; gold: boolean; claimed: string[]; // claimed: 'f<lv>' free lane, 'g<lv>' Gold lane
  best?: Tier; top?: { pts: number; mode: string; at: number } | null; seen?: boolean;
}
export interface SeasonRecap { id: string; lv: number; pp: number; gold: boolean; best?: Tier; top?: { pts: number; mode: string; at: number } | null; banked: number; seen?: boolean }
export interface WeekEvState { wk: string; n: number; got?: boolean }

export function seasonLevel(pp: number, per: number) {
  const n = Math.min(MAX_SLV, Math.floor(pp / per) + 1);
  const into = n >= MAX_SLV ? per : pp - (n - 1) * per;
  return { n, into, need: per, pct: Math.round((into / per) * 100), max: n >= MAX_SLV };
}

// Rolls the season over when the calendar moves on: the old season becomes a recap (its unclaimed free coins are
// banked for the player, not lost) and the track starts again at level 1. Safe to call any time; mutates `s`.
export function syncSeason(s: Save, ms = Date.now()): SeasonSave {
  const cur = seasonAt(ms);
  if (s.season && s.season.id === cur.id) return s.season;
  if (s.season && s.season.pp > 0) {
    const old = s.season, def = seasonById(old.id);
    const lv = def ? seasonLevel(old.pp, def.ppPerLv).n : 1;
    let banked = 0;
    for (let L = 1; L <= lv; L++) { const r = freeReward(old.id, L); if (r && r.coins && !old.claimed.includes('f' + L)) banked += r.coins; }
    for (let L = 1; L <= lv && old.gold; L++) { const r = goldReward(old.id, L); if (r && r.coins && !old.claimed.includes('g' + L)) banked += r.coins; }
    // Unclaimed cosmetics from the old season are granted too: they were earned.
    for (let L = 1; L <= lv; L++) {
      const f = freeReward(old.id, L); if (f?.cos && !s.owned.includes(f.cos)) s.owned.push(f.cos);
      const g = old.gold ? goldReward(old.id, L) : null; if (g?.cos && !s.owned.includes(g.cos)) s.owned.push(g.cos);
    }
    if (banked) pay(s, banked, 'season:' + old.id, false);
    s.seasonLog = [{ id: old.id, lv, pp: old.pp, gold: old.gold, best: old.best, top: old.top || null, banked }, ...(s.seasonLog || [])].slice(0, 12);
  }
  s.season = { id: cur.id, pp: 0, gold: false, claimed: [] };
  return s.season;
}
export const isGold = (s: Save = getSave()) => !!s.season && s.season.id === seasonAt().id && s.season.gold;
// +10% coins for Gold holders, on coins earned by playing. Rounded up so small rewards still show it.
export const goldBonus = (s: Save, d: number) => (d > 0 && isGold(s) ? Math.ceil(d * 1.1) : d);

// Called wherever Press Points are earned (lib/meta.ts addPP): the season track moves with the account level.
export function addSeasonPP(s: Save, n: number) { if (n > 0) syncSeason(s).pp += n; }

function pay(s: Save, d: number, why: string, bonus = true) {
  const n = bonus ? goldBonus(s, d) : d;
  s.credits += n; s.ledger = [{ at: Date.now(), d: n, why }, ...s.ledger].slice(0, 30);
  s.stats.earned = (s.stats.earned || 0) + Math.max(0, n);
  return n;
}

// ---------- The two lanes (40 levels)
export interface Reward { lane: 'free' | 'gold'; lv: number; coins?: number; cos?: string }
// Free: coins every third level (10 → 25 as you climb, 235 in all) and the season's exclusive frame at 40.
export function freeReward(sid: string, lv: number): Reward | null {
  if (lv === MAX_SLV) return { lane: 'free', lv, cos: sid + '.x' };
  if (lv % 3 === 0) return { lane: 'free', lv, coins: lv < 10 ? 10 : lv < 20 ? 15 : lv < 30 ? 20 : 25 };
  return null;
}
// Gold: a cosmetic every fifth level (8 a season) and 10 coins on the other even levels (160 in all).
const GOLD_SLOTS: Record<number, string> = { 5: 'g1', 10: 'g2', 15: 'g3', 20: 'g4', 25: 'g5', 30: 'g6', 35: 'g7', 40: 'g8' };
export function goldReward(sid: string, lv: number): Reward | null {
  if (GOLD_SLOTS[lv]) return { lane: 'gold', lv, cos: sid + '.' + GOLD_SLOTS[lv] };
  if (lv % 2 === 0) return { lane: 'gold', lv, coins: 10 };
  return null;
}
export function trackView(s: Save = getSave(), ms = Date.now()) {
  const def = seasonAt(ms);
  const st = s.season && s.season.id === def.id ? s.season : { id: def.id, pp: 0, gold: false, claimed: [] as string[] };
  const lv = seasonLevel(st.pp, def.ppPerLv);
  const rows = Array.from({ length: MAX_SLV }, (_, k) => {
    const L = k + 1, f = freeReward(def.id, L), g = goldReward(def.id, L);
    return {
      lv: L, free: f, gold: g, reached: L <= lv.n,
      freeClaimed: st.claimed.includes('f' + L), goldClaimed: st.claimed.includes('g' + L),
    };
  });
  const ready = rows.filter((r) => r.reached && ((r.free && !r.freeClaimed) || (st.gold && r.gold && !r.goldClaimed))).length;
  return { def, st, lv, rows, ready, gold: st.gold };
}
// Claims one reward; returns what was paid (coins after the Gold bonus, or the cosmetic id), or null.
export function claimReward(lane: 'free' | 'gold', L: number): { coins?: number; cos?: string } | null {
  let out: { coins?: number; cos?: string } | null = null;
  update((s) => {
    const st = syncSeason(s), def = seasonAt();
    if (L > seasonLevel(st.pp, def.ppPerLv).n) return;
    const tag = (lane === 'free' ? 'f' : 'g') + L;
    if (st.claimed.includes(tag) || (lane === 'gold' && !st.gold)) return;
    const r = lane === 'free' ? freeReward(st.id, L) : goldReward(st.id, L); if (!r) return;
    st.claimed.push(tag);
    if (r.coins) out = { coins: pay(s, r.coins, 'track:' + st.id + ':' + L) };
    if (r.cos) { if (!s.owned.includes(r.cos)) s.owned.push(r.cos); out = { cos: r.cos }; }
  });
  return out;
}

// ---------- Cosmetics
export type CosKind = 'frame' | 'ink' | 'theme' | 'ringtone' | 'flair';
export const COS_KINDS: CosKind[] = ['frame', 'ink', 'theme', 'ringtone', 'flair'];
export type FramePat = 'solid' | 'double' | 'dash' | 'foil' | 'tape';
export interface Cosmetic {
  id: string; kind: CosKind;
  price: number | 'gold' | 'track' | 'event'; // coins, the Gold lane, the free lane's level 40, or a weekly event
  season?: string;         // season id for season items
  nameKey: string; nameVars?: Record<string, string | number>;
  c?: string; c2?: string; // frame colours, ink colour, flair colour
  pat?: FramePat;          // frame pattern
  g?: string;              // flair glyph shown after the byline
  sfx?: Sfx;               // ringtone cue
  desk?: [string, string, string]; // desk theme: --desk, --desk-2, --desk-3
  paper?: boolean;         // legacy paper themes (styles/app.css), not generated here
}
// Evergreen items sold for coins, the old paper themes, and the weekly-event rewards.
const BASE: Cosmetic[] = [
  { id: 'salmon', kind: 'theme', price: 400, nameKey: 'pass.items.salmon.0', paper: true },
  { id: 'tabloid', kind: 'theme', price: 400, nameKey: 'pass.items.tabloid.0', paper: true },
  { id: 'neon', kind: 'theme', price: 400, nameKey: 'pass.items.neon.0', paper: true },
  { id: 'desk.oak', kind: 'theme', price: 350, nameKey: 'season.cos.deskOak', desk: ['#1E1610', '#2A1F16', '#37291D'] },
  { id: 'desk.slate', kind: 'theme', price: 350, nameKey: 'season.cos.deskSlate', desk: ['#12161B', '#1A2027', '#242C35'] },
  { id: 'frame.press', kind: 'frame', price: 150, nameKey: 'season.cos.framePress', c: '#15130F', c2: '#F4EFE4', pat: 'double' },
  { id: 'frame.redtop', kind: 'frame', price: 150, nameKey: 'season.cos.frameRedtop', c: '#C8102E', c2: '#FFFFFF', pat: 'solid' },
  { id: 'frame.tape', kind: 'frame', price: 180, nameKey: 'season.cos.frameTape', c: '#F7B928', c2: '#15130F', pat: 'tape' },
  { id: 'ink.blue', kind: 'ink', price: 120, nameKey: 'season.cos.inkBlue', c: '#2657C9' },
  { id: 'ink.green', kind: 'ink', price: 120, nameKey: 'season.cos.inkGreen', c: '#1C8A50' },
  { id: 'ink.violet', kind: 'ink', price: 120, nameKey: 'season.cos.inkViolet', c: '#7147D6' },
  { id: 'ring.whistle', kind: 'ringtone', price: 120, nameKey: 'season.cos.ringWhistle', sfx: 'dd.whistle' },
  { id: 'ring.fax', kind: 'ringtone', price: 120, nameKey: 'season.cos.ringFax', sfx: 'scene.leak' },
  { id: 'ring.type', kind: 'ringtone', price: 120, nameKey: 'season.cos.ringType', sfx: 'typewriter' },
  { id: 'flair.pen', kind: 'flair', price: 100, nameKey: 'season.cos.flairPen', g: '✎', c: '#F4EFE4' },
  { id: 'flair.star', kind: 'flair', price: 100, nameKey: 'season.cos.flairStar', g: '★', c: '#F7B928' },
  // Weekly-event rewards (one per event, earned by playing that week; never sold).
  { id: 'ev.rival', kind: 'flair', price: 'event', nameKey: 'season.cos.evRival', g: '⚔', c: '#FF5A36' },
  { id: 'ev.medical', kind: 'ink', price: 'event', nameKey: 'season.cos.evMedical', c: '#2BB3A3' },
  { id: 'ev.frenzy', kind: 'frame', price: 'event', nameKey: 'season.cos.evFrenzy', c: '#FF5A36', c2: '#15130F', pat: 'dash' },
  { id: 'ev.barber', kind: 'ringtone', price: 'event', nameKey: 'season.cos.evBarber', sfx: 'scene.barber' },
  { id: 'ev.local', kind: 'flair', price: 'event', nameKey: 'season.cos.evLocal', g: '⌂', c: '#2FBF71' },
];
// Season items are generated from the season id, so every season (and every year) gets its own set.
type SeasonSlot = Omit<Cosmetic, 'id' | 'price' | 'season' | 'nameKey' | 'nameVars'>;
const SEASON_SETS: Record<SeasonKey, Record<string, SeasonSlot>> = {
  rumour: {
    x: { kind: 'frame', c: '#D9913A', c2: '#3A2310', pat: 'foil' },
    g1: { kind: 'flair', g: '❝', c: '#D9913A' }, g2: { kind: 'ink', c: '#B4531F' }, g3: { kind: 'ringtone', sfx: 'scene.agent' },
    g4: { kind: 'frame', c: '#8A5A2B', c2: '#F2E3C9', pat: 'double' }, g5: { kind: 'flair', g: '☕', c: '#C9A27A' },
    g6: { kind: 'ink', c: '#6E3B1E' }, g7: { kind: 'theme', desk: ['#1F140C', '#2B1C11', '#382517'] }, g8: { kind: 'frame', c: '#F7B928', c2: '#8A5A2B', pat: 'foil' },
  },
  winter: {
    x: { kind: 'frame', c: '#5BB8E8', c2: '#0E2231', pat: 'foil' },
    g1: { kind: 'flair', g: '❄', c: '#9AD6F5' }, g2: { kind: 'ink', c: '#2C7FB8' }, g3: { kind: 'ringtone', sfx: 'dd.siren' },
    g4: { kind: 'frame', c: '#DDEFF8', c2: '#2C7FB8', pat: 'double' }, g5: { kind: 'flair', g: '⏱', c: '#5BB8E8' },
    g6: { kind: 'ink', c: '#1B3F66' }, g7: { kind: 'theme', desk: ['#0E141B', '#151E28', '#1E2A37'] }, g8: { kind: 'frame', c: '#F7B928', c2: '#1B3F66', pat: 'foil' },
  },
  spring: {
    x: { kind: 'frame', c: '#7FCB6A', c2: '#15260F', pat: 'foil' },
    g1: { kind: 'flair', g: '✿', c: '#F2A7C3' }, g2: { kind: 'ink', c: '#3E8E2F' }, g3: { kind: 'ringtone', sfx: 'sparkle' },
    g4: { kind: 'frame', c: '#F2A7C3', c2: '#3E8E2F', pat: 'dash' }, g5: { kind: 'flair', g: '☂', c: '#7FCB6A' },
    g6: { kind: 'ink', c: '#C2477A' }, g7: { kind: 'theme', desk: ['#111810', '#182218', '#212E20'] }, g8: { kind: 'frame', c: '#F7B928', c2: '#3E8E2F', pat: 'foil' },
  },
  summer: {
    x: { kind: 'frame', c: '#FF7A3D', c2: '#2A1206', pat: 'foil' },
    g1: { kind: 'flair', g: '☀', c: '#FFB02E' }, g2: { kind: 'ink', c: '#E0552A' }, g3: { kind: 'ringtone', sfx: 'fanfare' },
    g4: { kind: 'frame', c: '#FFD35C', c2: '#E0552A', pat: 'tape' }, g5: { kind: 'flair', g: '✈', c: '#FF7A3D' },
    g6: { kind: 'ink', c: '#0F8A8A' }, g7: { kind: 'theme', desk: ['#1C130D', '#281A11', '#352316'] }, g8: { kind: 'frame', c: '#F7B928', c2: '#E0552A', pat: 'foil' },
  },
};
export function cosmetic(id: string): Cosmetic | null {
  const b = BASE.find((x) => x.id === id); if (b) return b;
  const m = /^((rumour|winter|spring|summer)-(\d{4}))\.(x|g[1-8])$/.exec(id); if (!m) return null;
  const slot = SEASON_SETS[m[2] as SeasonKey][m[4]];
  return { ...slot, id, price: m[4] === 'x' ? 'track' : 'gold', season: m[1], nameKey: 'season.cos.' + m[2] + '.' + m[4], nameVars: { y: '’' + m[3].slice(2) } };
}
export const storeItems = () => BASE.filter((x) => typeof x.price === 'number');
export const seasonItems = (sid = seasonAt().id) => ['x', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'].map((k) => cosmetic(sid + '.' + k)!);
export const goldPreview = (sid = seasonAt().id) => seasonItems(sid).slice(1);
// Everything the player owns, in catalogue order (store items first, then season and event items).
export function ownedItems(s: Save = getSave(), kind?: CosKind) {
  return s.owned.map(cosmetic).filter((x): x is Cosmetic => !!x && (!kind || x.kind === kind));
}
export const owns = (id: string, s: Save = getSave()) => s.owned.includes(id);

// What other screens read: the equipped post frame, stamp ink, ringtone, byline flair or desk theme (null = standard).
export function equipped(kind: CosKind, s: Save = getSave()): Cosmetic | null {
  const id = kind === 'theme' ? s.theme : s.equip?.[kind];
  if (!id || id === 'standard') return null;
  const c = cosmetic(id);
  return c && c.kind === kind && s.owned.includes(id) ? c : null;
}
export function equip(id: string | null, kind: CosKind) {
  update((s) => {
    if (id && (!s.owned.includes(id) || cosmetic(id)?.kind !== kind)) return;
    if (kind === 'theme') { s.theme = id || 'standard'; return; }
    s.equip = { ...(s.equip || {}), [kind]: id || undefined };
  });
}
// The ringtone cue a caller card should play (CallScene integration).
export const ringtoneSfx = (s: Save = getSave()): Sfx => equipped('ringtone', s)?.sfx || 'phone.ring';
// A CSS border for a frame, for PostScene and the share card.
export function frameCSS(c: Cosmetic | null): Record<string, string> {
  if (!c || c.kind !== 'frame') return {};
  const a = c.c || '#15130F', b = c.c2 || '#F4EFE4';
  switch (c.pat) {
    case 'double': return { border: '5px double ' + a, outline: '2px solid ' + b, outlineOffset: '-7px' };
    case 'dash': return { border: '3px dashed ' + a, boxShadow: 'inset 0 0 0 3px ' + b };
    case 'tape': return { border: '3px solid ' + a, boxShadow: '0 0 0 3px ' + b };
    case 'foil': return { border: '3px solid transparent', background: `linear-gradient(var(--card), var(--card)) padding-box, linear-gradient(135deg, ${a}, ${b}, ${a}) border-box` };
    default: return { border: '3px solid ' + a, boxShadow: 'inset 0 0 0 2px ' + b };
  }
}

// Desk themes plug into the existing theme mechanism: App.tsx sets <html data-theme="{s.theme}">; these rules are
// generated from the catalogue once. The morning edition keeps its pale wood.
function themeRule(c: Cosmetic) {
  const [d1, d2, d3] = c.desk!;
  return `:root[data-theme="${c.id}"]:not([data-edition="morning"]){--desk:${d1};--desk-2:${d2};--desk-3:${d3};}`;
}
let themed = '';
export function installThemeCSS(extra: string[] = []) {
  if (typeof document === 'undefined') return;
  const ids = [...BASE.filter((x) => x.desk).map((x) => x.id), ...extra, ...getSave().owned].filter((id, k, a) => a.indexOf(id) === k);
  const css = ids.map(cosmetic).filter((c): c is Cosmetic => !!c && c.kind === 'theme' && !!c.desk).map(themeRule).join('\n');
  if (css === themed) return; themed = css;
  let el = document.getElementById('t1-season-themes') as HTMLStyleElement | null;
  if (!el) { el = document.createElement('style'); el.id = 't1-season-themes'; document.head.appendChild(el); }
  el.textContent = css;
}
installThemeCSS(goldPreview().filter((c) => c.kind === 'theme').map((c) => c.id));

// Buying with coins (the store). Returns false when short or not for sale.
export function buyCosmetic(id: string): boolean {
  const c = cosmetic(id); const s = getSave();
  if (!c || typeof c.price !== 'number' || s.owned.includes(id) || s.credits < c.price) return false;
  const price = c.price;
  update((x) => { x.credits -= price; x.ledger = [{ at: Date.now(), d: -price, why: 'shop:' + id }, ...x.ledger].slice(0, 30); x.owned.push(id); });
  equip(id, c.kind);
  if (c.kind === 'theme') installThemeCSS();
  return true;
}

// ---------- Weekly events (Practice and Career only; seeded by ISO week)
export function isoWeek(d: Date | number = Date.now()) {
  const x = new Date(typeof d === 'number' ? d : d.getTime());
  const t = Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  const dow = (new Date(t).getUTCDay() + 6) % 7; // Monday 0
  const thu = t - dow * DAY + 3 * DAY;
  const y = new Date(thu).getUTCFullYear();
  const wk = 1 + Math.floor((thu - Date.UTC(y, 0, 1)) / (7 * DAY));
  return { key: y + '-W' + String(wk).padStart(2, '0'), start: t - dow * DAY, end: t - dow * DAY + 7 * DAY };
}
export type EventRules = { rivalGoal?: 'itk'; n?: number } & { physioFrom?: number } & { ddSeconds?: number } & { barberRel?: number } & { league?: string };
export interface WeekEvent {
  id: 'rival' | 'medical' | 'frenzy' | 'barber' | 'local'; wk: string; nameKey: string; descKey: string;
  rules: EventRules; reward: string; goal: number; // goal: windows played (or ITK beaten, for Rival Week)
  start: number; end: number; accent: string;
}
const EVENTS: Omit<WeekEvent, 'wk' | 'start' | 'end' | 'rules' | 'nameKey' | 'descKey'>[] = [
  { id: 'rival', reward: 'ev.rival', goal: 3, accent: '#FF5A36' },
  { id: 'medical', reward: 'ev.medical', goal: 3, accent: '#2BB3A3' },
  { id: 'frenzy', reward: 'ev.frenzy', goal: 3, accent: '#FF3B1F' },
  { id: 'barber', reward: 'ev.barber', goal: 3, accent: '#C9A27A' },
  { id: 'local', reward: 'ev.local', goal: 3, accent: '#2FBF71' },
];
const LEAGUES = ['eng1', 'esp1', 'ita1', 'ger1', 'fra1'];
const eventIdx = (wk: string) => hash('t1ev:' + wk) % EVENTS.length;
// Deterministic by ISO week, and never the same event two weeks running.
export function weekEvent(date: Date | number = Date.now()): WeekEvent {
  const w = isoWeek(date), prev = isoWeek(w.start - DAY);
  let i = eventIdx(w.key);
  if (i === eventIdx(prev.key)) i = (i + 1 + (hash(w.key) >>> 7) % (EVENTS.length - 1)) % EVENTS.length;
  const e = EVENTS[i];
  const rules: EventRules = e.id === 'rival' ? { rivalGoal: 'itk', n: 3 } : e.id === 'medical' ? { physioFrom: 3 } : e.id === 'frenzy' ? { ddSeconds: 90 }
    : e.id === 'barber' ? { barberRel: 0.6 } : { league: LEAGUES[hash('t1lg:' + w.key) % LEAGUES.length] };
  return { ...e, wk: w.key, nameKey: 'season.ev.' + e.id + '.n', descKey: 'season.ev.' + e.id + '.d', rules, start: w.start, end: w.end };
}
export function weekEventView(s: Save = getSave(), ms = Date.now()) {
  const ev = weekEvent(ms), st = s.weekEv && s.weekEv.wk === ev.wk ? s.weekEv : { wk: ev.wk, n: 0 };
  return { ev, n: Math.min(ev.goal, st.n), got: !!st.got || s.owned.includes(ev.reward), daysLeft: Math.max(1, Math.ceil((ev.end - ms) / DAY)) };
}
// ITK beaten on a saga: you called it right, and ITK either called it wrong or posted after you.
const beatItk = (r: Result) => r.per.filter((p) => p.right && p.call && p.posts.some((f) => f.id === 'itk' && (!f.right || f.day > p.call!.day))).length;
function eventProgress(s: Save, r: Result, mode: string) {
  if (mode !== 'practice' && mode !== 'story') return;
  const ev = weekEvent();
  if (!s.weekEv || s.weekEv.wk !== ev.wk) s.weekEv = { wk: ev.wk, n: 0 };
  s.weekEv.n += ev.id === 'rival' ? beatItk(r) : 1;
  if (s.weekEv.n >= ev.goal && !s.weekEv.got) { s.weekEv.got = true; if (!s.owned.includes(ev.reward)) s.owned.push(ev.reward); s.stats.m_evWon = (s.stats.m_evWon || 0) + 1; }
}

// ---------- Hooks from lib/progress.ts trackWindow (every finished window): the recap's best tier and top call.
const TIER_RANK: Record<string, number> = { T1: 5, T2: 4, T3: 3, T4: 2, SPIKED: 1 };
export function seasonWindow(s: Save, r: Result, mode: string) {
  const st = syncSeason(s);
  if (!st.best || TIER_RANK[r.tier] > TIER_RANK[st.best]) st.best = r.tier;
  const top = r.per.reduce((m, p) => (p.right && p.call && p.pts > m ? p.pts : m), 0);
  if (top > 0 && (!st.top || top > st.top.pts)) st.top = { pts: top, mode, at: Date.now() };
  eventProgress(s, r, mode);
}
export const pendingRecap = (s: Save = getSave()) => (s.seasonLog && s.seasonLog[0] && !s.seasonLog[0].seen ? s.seasonLog[0] : null);
export const dismissRecap = () => update((s) => { if (s.seasonLog && s.seasonLog[0]) s.seasonLog[0].seen = true; });
export const ensureSeason = () => { const s = getSave(); if (!s.season || s.season.id !== seasonAt().id) update((x) => { syncSeason(x); }); };
