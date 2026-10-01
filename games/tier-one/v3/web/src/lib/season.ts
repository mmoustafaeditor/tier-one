// Seasons and the season track (RULES4.md §3 "Season track", CONCEPT4.md §5). Real-calendar seasons, each with a
// 30-tier track of 400 XP a tier fed by the same XP as the account level, a free lane (coins and a look every 5 tiers)
// and a Gold lane (350 credits: a look every 3 tiers, the season's Legendary at tier 30, +10% coins).
// The fairness line: nothing here reaches a board, its sources or its score. Everything is cosmetic or coins.
// The old 3.x coin store that lived here (BASE below) is now just stock in the one shop (lib/catalog.ts); the numbers
// come from lib/economy.ts, and buyCosmetic() routes through the wallet.
import { update, getSave, type Save } from './save';
import type { Tier } from './engine';
import type { Sfx } from './sfx';
import { t } from './i18n';
import { SEASON, PRICES, seasonTierOf, credit, setGoldCheck, goldBonus as goldBonus0, creditHooks } from './economy';
import type { WallpaperMotif, DropStyle } from './kinds';

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
  days: number; daysLeft: number;
  /** XP per tier (400, every season). `ppPerLv` is the 3.x name of the same number, kept for screens not yet moved. */
  xpPerTier: number; ppPerLv: number;
}
export const MAX_SLV = SEASON.tiers;

export function seasonAt(ms = Date.now()): Season {
  const y = new Date(ms).getUTCFullYear();
  const c = CAL.find((x) => ms < utc(y, x.to[0], x.to[1]) + DAY) || CAL[CAL.length - 1];
  const start = utc(y, c.from[0], c.from[1]), end = utc(y, c.to[0], c.to[1]) + DAY;
  const days = Math.round((end - start) / DAY);
  return {
    id: c.key + '-' + y, key: c.key, year: y, nameKey: 'season.names.' + c.key, accent: c.accent, start, end, days,
    daysLeft: Math.max(0, Math.ceil((end - ms) / DAY)), xpPerTier: SEASON.xpPerTier, ppPerLv: SEASON.xpPerTier,
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
  id: string; xp: number; gold: boolean; claimed: string[]; // claimed: 'f<tier>' free lane, 'g<tier>' Gold lane
  pp?: number; // 3.x name of `xp`; the v4 migration folds it in and it is never written again
  best?: Tier; top?: { pts: number; mode: string; at: number } | null; seen?: boolean;
}
export interface SeasonRecap { id: string; lv: number; xp: number; gold: boolean; best?: Tier; top?: { pts: number; mode: string; at: number } | null; banked: number; seen?: boolean; pp?: number }
export interface WeekEvState { wk: string; n: number; got?: boolean }

/** The season tier `xp` stands at. `per` is accepted for 3.x callers and ignored: a tier is always 400 XP. */
export function seasonLevel(xp: number, _per?: number) { const v = seasonTierOf(xp); return { n: v.n, into: v.into, need: v.need, pct: v.pct, max: v.max }; }
export const seasonXp = (st: SeasonSave | undefined | null) => Math.max(0, Math.round((st && (st.xp ?? st.pp)) || 0));

// Rolls the season over when the calendar moves on: the old season becomes a recap (its unclaimed free coins are
// banked for the player, not lost) and the track starts again at tier 1. Safe to call any time; mutates `s`.
export function syncSeason(s: Save, ms = Date.now()): SeasonSave {
  const cur = seasonAt(ms);
  if (s.season && s.season.id === cur.id) { if (s.season.xp == null) { s.season.xp = seasonXp(s.season); delete s.season.pp; } return s.season; }
  if (s.season && seasonXp(s.season) > 0) {
    const old = s.season, xp = seasonXp(old);
    const lv = seasonLevel(xp).n;
    let banked = 0;
    for (let L = 1; L <= lv; L++) { const r = freeReward(old.id, L); if (r && r.coins && !old.claimed.includes('f' + L)) banked += r.coins; }
    for (let L = 1; L <= lv && old.gold; L++) { const r = goldReward(old.id, L); if (r && r.coins && !old.claimed.includes('g' + L)) banked += r.coins; }
    // Unclaimed looks from the old season are granted too: they were earned.
    for (let L = 1; L <= lv; L++) {
      const f = freeReward(old.id, L); if (f?.cos && !s.owned.includes(f.cos)) s.owned.push(f.cos);
      const g = old.gold ? goldReward(old.id, L) : null; if (g?.cos && !s.owned.includes(g.cos)) s.owned.push(g.cos);
    }
    if (banked) credit(s, banked, 'season:' + old.id);
    creditHooks.seasonEnd?.(s, old.id, lv); // season-end credits (lib/wallet.ts, server-matching)
    s.seasonLog = [{ id: old.id, lv, xp, gold: old.gold, best: old.best, top: old.top || null, banked }, ...(s.seasonLog || [])].slice(0, 12);
  }
  s.season = { id: cur.id, xp: 0, gold: false, claimed: [] };
  return s.season;
}
export const isGold = (s: Save = getSave()) => !!s.season && s.season.id === seasonAt().id && s.season.gold;
setGoldCheck(isGold); // lib/economy.ts credit() applies the Gold +10% through this
export const goldBonus = goldBonus0;

/** Called wherever XP is earned (lib/meta.ts addXP): the season track moves with the account level. */
export function addSeasonXP(s: Save, n: number) { if (n > 0) syncSeason(s).xp += n; }
/** 3.x name. */
export const addSeasonPP = addSeasonXP;

// ---------- The two lanes (30 tiers; RULES4 §3)
export interface Reward { lane: 'free' | 'gold'; lv: number; coins?: number; cos?: string }
/** Free: a look every 5 tiers (f1…f6), 20 coins on every other tier (480 a season). */
export function freeReward(sid: string, lv: number): Reward | null {
  if (lv < 1 || lv > MAX_SLV) return null;
  if (lv % SEASON.freeLookEvery === 0) return { lane: 'free', lv, cos: sid + '.f' + lv / SEASON.freeLookEvery };
  return { lane: 'free', lv, coins: SEASON.freeCoins };
}
/** Gold: a look every 3 tiers (g1…g10, g10 is the season's Legendary at tier 30), 15 coins on the other tiers. */
export function goldReward(sid: string, lv: number): Reward | null {
  if (lv < 1 || lv > MAX_SLV) return null;
  if (lv % SEASON.goldLookEvery === 0) return { lane: 'gold', lv, cos: sid + '.g' + lv / SEASON.goldLookEvery };
  return { lane: 'gold', lv, coins: SEASON.goldCoins };
}
export function trackView(s: Save = getSave(), ms = Date.now()) {
  const def = seasonAt(ms);
  const st: SeasonSave = s.season && s.season.id === def.id ? s.season : { id: def.id, xp: 0, gold: false, claimed: [] as string[] };
  const lv = seasonLevel(seasonXp(st));
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
// Claims one reward; returns what was paid (coins after the Gold bonus, or the look's id), or null.
export function claimReward(lane: 'free' | 'gold', L: number): { coins?: number; cos?: string } | null {
  let out: { coins?: number; cos?: string } | null = null;
  update((s) => {
    const st = syncSeason(s);
    if (L > seasonLevel(st.xp).n) return;
    const tag = (lane === 'free' ? 'f' : 'g') + L;
    if (st.claimed.includes(tag) || (lane === 'gold' && !st.gold)) return;
    const r = lane === 'free' ? freeReward(st.id, L) : goldReward(st.id, L); if (!r) return;
    st.claimed.push(tag);
    if (r.coins) out = { coins: credit(s, r.coins, 'track:' + st.id + ':' + L) };
    if (r.cos) { if (!s.owned.includes(r.cos)) s.owned.push(r.cos); out = { cos: r.cos }; }
  });
  return out;
}
/** Every reward still unclaimed on reached tiers, both lanes: the Lens lane's "claim all". */
export function claimAll(): { coins: number; cos: string[] } {
  const out = { coins: 0, cos: [] as string[] };
  for (const row of trackView().rows) {
    if (!row.reached) continue;
    if (row.free && !row.freeClaimed) { const r = claimReward('free', row.lv); if (r?.coins) out.coins += r.coins; if (r?.cos) out.cos.push(r.cos); }
    if (row.gold && !row.goldClaimed && isGold()) { const r = claimReward('gold', row.lv); if (r?.coins) out.coins += r.coins; if (r?.cos) out.cos.push(r.cos); }
  }
  return out;
}

// ---------- Cosmetics (the 3.x shape; lib/catalog.ts wraps every one of these as an Item without changing its id)
export type CosKind = 'frame' | 'ink' | 'theme' | 'ringtone' | 'flair' | 'wallpaper' | 'dropcard';
export const COS_KINDS: CosKind[] = ['wallpaper', 'theme', 'dropcard', 'frame', 'ringtone', 'ink', 'flair'];
export type FramePat = 'solid' | 'double' | 'dash' | 'foil' | 'tape';
export interface Cosmetic {
  id: string; kind: CosKind;
  price: number | 'gold' | 'track' | 'event'; // coins, the Gold lane, the free lane, or a weekly event
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  season?: string;         // season id for season items
  nameKey: string; nameVars?: Record<string, string | number>;
  c?: string; c2?: string; // frame colours, ink colour, flair colour
  pat?: FramePat;          // frame pattern
  g?: string;              // flair glyph shown after the byline
  sfx?: Sfx;               // ringtone cue
  desk?: [string, string, string]; // desk theme: --desk, --desk-2, --desk-3
  os?: { bg: string; ink: string; accent: string; bar: string }; // 4.0 whole-phone theme
  paper?: boolean;         // legacy paper themes (styles/app.css), not generated here
  bg?: string; ink?: string; accent?: string; motif?: WallpaperMotif; style?: DropStyle; // 4.0 wallpapers and Drop cards
}
const C = PRICES.look.common, R = PRICES.look.rare;
// Evergreen items sold for coins (3.x stock, re-priced to the one rarity table), the old paper themes, and the
// weekly-event rewards. New 4.0 stock (wallpapers, Drop cards, OS themes) lives in lib/catalog.ts.
const BASE: Cosmetic[] = [
  { id: 'salmon', kind: 'theme', price: R, rarity: 'rare', nameKey: 'pass.items.salmon.0', paper: true },
  { id: 'tabloid', kind: 'theme', price: R, rarity: 'rare', nameKey: 'pass.items.tabloid.0', paper: true },
  { id: 'neon', kind: 'theme', price: R, rarity: 'rare', nameKey: 'pass.items.neon.0', paper: true },
  { id: 'desk.oak', kind: 'theme', price: R, rarity: 'rare', nameKey: 'season.cos.deskOak', desk: ['#1E1610', '#2A1F16', '#37291D'], os: { bg: '#1E1610', ink: '#F4EFE4', accent: '#D9913A', bar: '#2A1F16' } },
  { id: 'desk.slate', kind: 'theme', price: R, rarity: 'rare', nameKey: 'season.cos.deskSlate', desk: ['#12161B', '#1A2027', '#242C35'], os: { bg: '#12161B', ink: '#E6EDF3', accent: '#35C3E6', bar: '#1A2027' } },
  { id: 'frame.press', kind: 'frame', price: C, rarity: 'common', nameKey: 'season.cos.framePress', c: '#15130F', c2: '#F4EFE4', pat: 'double' },
  { id: 'frame.redtop', kind: 'frame', price: C, rarity: 'common', nameKey: 'season.cos.frameRedtop', c: '#C8102E', c2: '#FFFFFF', pat: 'solid' },
  { id: 'frame.tape', kind: 'frame', price: C, rarity: 'common', nameKey: 'season.cos.frameTape', c: '#F7B928', c2: '#15130F', pat: 'tape' },
  { id: 'ink.blue', kind: 'ink', price: C, rarity: 'common', nameKey: 'season.cos.inkBlue', c: '#2657C9' },
  { id: 'ink.green', kind: 'ink', price: C, rarity: 'common', nameKey: 'season.cos.inkGreen', c: '#1C8A50' },
  { id: 'ink.violet', kind: 'ink', price: C, rarity: 'common', nameKey: 'season.cos.inkViolet', c: '#7147D6' },
  { id: 'ring.whistle', kind: 'ringtone', price: C, rarity: 'common', nameKey: 'season.cos.ringWhistle', sfx: 'dd.whistle' },
  { id: 'ring.fax', kind: 'ringtone', price: C, rarity: 'common', nameKey: 'season.cos.ringFax', sfx: 'scene.leak' },
  { id: 'ring.type', kind: 'ringtone', price: C, rarity: 'common', nameKey: 'season.cos.ringType', sfx: 'typewriter' },
  { id: 'flair.pen', kind: 'flair', price: C, rarity: 'common', nameKey: 'season.cos.flairPen', g: '✎', c: '#F4EFE4' },
  { id: 'flair.star', kind: 'flair', price: C, rarity: 'common', nameKey: 'season.cos.flairStar', g: '★', c: '#F7B928' },
  // Weekly-event rewards (one per event, earned by playing that week; never sold).
  { id: 'ev.rival', kind: 'flair', price: 'event', nameKey: 'season.cos.evRival', g: '⚔', c: '#FF5A36' },
  { id: 'ev.medical', kind: 'ink', price: 'event', nameKey: 'season.cos.evMedical', c: '#2BB3A3' },
  { id: 'ev.frenzy', kind: 'frame', price: 'event', nameKey: 'season.cos.evFrenzy', c: '#FF5A36', c2: '#15130F', pat: 'dash' },
  { id: 'ev.barber', kind: 'ringtone', price: 'event', nameKey: 'season.cos.evBarber', sfx: 'scene.barber' },
  { id: 'ev.local', kind: 'flair', price: 'event', nameKey: 'season.cos.evLocal', g: '⌂', c: '#2FBF71' },
];
// Season items are generated from the season id, so every season (and every year) gets its own set: six free-lane
// looks (f1…f6, tiers 5…30) and ten Gold-lane looks (g1…g10, tiers 3…30; g10 is the Legendary). Each season has a
// palette and a drawn motif; the kinds rotate so a season dresses the whole phone.
type SeasonSlot = Omit<Cosmetic, 'id' | 'price' | 'season' | 'nameKey' | 'nameVars'>;
const PALETTE: Record<SeasonKey, { bg: string; ink: string; accent: string; c2: string; motif: WallpaperMotif; sfx: Sfx }> = {
  rumour: { bg: '#2B1C11', ink: '#F2E3C9', accent: '#D9913A', c2: '#8A5A2B', motif: 'halftone', sfx: 'scene.agent' },
  winter: { bg: '#0E2231', ink: '#DDEFF8', accent: '#5BB8E8', c2: '#1B3F66', motif: 'grid', sfx: 'dd.siren' },
  spring: { bg: '#15260F', ink: '#F6FBF1', accent: '#7FCB6A', c2: '#C2477A', motif: 'pitch', sfx: 'sparkle' },
  summer: { bg: '#2A1206', ink: '#FFF3E0', accent: '#FF7A3D', c2: '#E0552A', motif: 'stripe', sfx: 'fanfare' },
};
const GOLD = '#F7B928';
function seasonSlot(key: SeasonKey, slot: string): SeasonSlot | null {
  const p = PALETTE[key];
  const wall = (rarity: SeasonSlot['rarity'], motif: WallpaperMotif, accent = p.accent): SeasonSlot => ({ kind: 'wallpaper', rarity, bg: p.bg, ink: p.ink, accent, motif });
  const drop = (rarity: SeasonSlot['rarity'], style: DropStyle, bg = p.bg, ink = p.ink): SeasonSlot => ({ kind: 'dropcard', rarity, bg, ink, accent: p.accent, style });
  const frame = (rarity: SeasonSlot['rarity'], pat: FramePat, c = p.accent, c2 = p.c2): SeasonSlot => ({ kind: 'frame', rarity, c, c2, pat });
  const ring = (rarity: SeasonSlot['rarity']): SeasonSlot => ({ kind: 'ringtone', rarity, sfx: p.sfx });
  const theme = (rarity: SeasonSlot['rarity'], bg = p.bg): SeasonSlot => ({ kind: 'theme', rarity, desk: [bg, p.c2, p.accent], os: { bg, ink: p.ink, accent: p.accent, bar: p.c2 } });
  const F: Record<string, SeasonSlot> = { f1: wall('common', 'plain'), f2: drop('common', 'bold'), f3: frame('rare', 'double'), f4: ring('rare'), f5: wall('rare', p.motif), f6: theme('epic') };
  const G: Record<string, SeasonSlot> = {
    g1: drop('rare', 'ticker'), g2: wall('rare', 'grain'), g3: ring('rare'), g4: frame('rare', 'tape'), g5: drop('epic', 'poster', p.accent, p.bg),
    g6: theme('epic', p.c2), g7: wall('epic', p.motif, GOLD), g8: frame('epic', 'foil', GOLD, p.c2), g9: drop('epic', 'stamp'),
    g10: wall('legendary', 'halftone', GOLD),
  };
  return F[slot] || G[slot] || null;
}
export function cosmetic(id: string): Cosmetic | null {
  const b = BASE.find((x) => x.id === id); if (b) return b;
  const m = /^((rumour|winter|spring|summer)-(\d{4}))\.(f[1-6]|g(?:[1-9]|10))$/.exec(id); if (!m) return null;
  const slot = seasonSlot(m[2] as SeasonKey, m[4]); if (!slot) return null;
  return { ...slot, id, price: m[4][0] === 'f' ? 'track' : 'gold', season: m[1], nameKey: 'e4.cos.' + m[2] + '.' + slot.kind, nameVars: { y: '’' + m[3].slice(2) } };
}
export const SEASON_FREE_SLOTS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'] as const;
export const SEASON_GOLD_SLOTS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10'] as const;
export const storeItems = () => BASE.filter((x) => typeof x.price === 'number');
export const seasonItems = (sid = seasonAt().id) => [...SEASON_FREE_SLOTS, ...SEASON_GOLD_SLOTS].map((k) => cosmetic(sid + '.' + k)!);
export const goldPreview = (sid = seasonAt().id) => SEASON_GOLD_SLOTS.map((k) => cosmetic(sid + '.' + k)!);
export const freePreview = (sid = seasonAt().id) => SEASON_FREE_SLOTS.map((k) => cosmetic(sid + '.' + k)!);
// Everything the player owns, in catalogue order (store items first, then season and event items).
export function ownedItems(s: Save = getSave(), kind?: CosKind) {
  return s.owned.map(cosmetic).filter((x): x is Cosmetic => !!x && (!kind || x.kind === kind));
}
export const owns = (id: string, s: Save = getSave()) => s.owned.includes(id);

// What other screens read: the equipped post frame, stamp ink, ringtone, byline flair or theme (null = standard).
// 4.0 kinds (wallpaper, dropcard) are stored by lib/wallet.ts in save.desk.equip; read them through wallet.equipped().
export function equipped(kind: CosKind, s: Save = getSave()): Cosmetic | null {
  const id = kind === 'theme' ? s.theme : kind === 'wallpaper' || kind === 'dropcard' ? s.desk?.equip?.[kind] : s.equip?.[kind];
  if (!id || id === 'standard') return null;
  const c = cosmetic(id);
  return c && c.kind === kind && s.owned.includes(id) ? c : null;
}
export function equip(id: string | null, kind: CosKind) {
  update((s) => {
    if (id && (!s.owned.includes(id) || cosmetic(id)?.kind !== kind)) return;
    if (kind === 'theme') { s.theme = id || 'standard'; return; }
    if (kind === 'wallpaper' || kind === 'dropcard') { s.desk = s.desk || { equip: {} }; s.desk.equip = { ...s.desk.equip, [kind]: id || undefined }; return; }
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

// Desk / OS themes plug into the existing theme mechanism: App.tsx sets <html data-theme="{s.theme}">; these rules
// are generated from the catalogue once. The morning edition keeps its pale wood. A 4.0 `os` block also sets the
// phone's variables (--os-bg, --os-ink, --os-accent, --os-bar) for the shell lane.
function themeRule(c: Cosmetic) {
  const [d1, d2, d3] = c.desk!;
  const os = c.os ? `--os-bg:${c.os.bg};--os-ink:${c.os.ink};--os-accent:${c.os.accent};--os-bar:${c.os.bar};` : '';
  return `:root[data-theme="${c.id}"]:not([data-edition="morning"]){--desk:${d1};--desk-2:${d2};--desk-3:${d3};${os}}`;
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
installThemeCSS(seasonItems().filter((c) => c.kind === 'theme').map((c) => c.id));

// Buying with coins: the one shop is lib/wallet.ts buy(); this 3.x entry point hands over to it (the wallet registers
// itself here so season → wallet never becomes an import cycle). Returns false when short or not for sale.
let shopBuy: ((id: string) => boolean) | null = null;
export const setShopBuy = (f: ((id: string) => boolean) | null) => { shopBuy = f; };
export function buyCosmetic(id: string): boolean {
  const c = cosmetic(id);
  if (!c || typeof c.price !== 'number' || getSave().owned.includes(id)) return false;
  if (shopBuy) return shopBuy(id);
  // Before the wallet has loaded (tests, early boot): the same move, straight on the save.
  const price = c.price;
  if (getSave().credits < price) return false;
  update((x) => { x.credits -= price; x.ledger = [{ at: Date.now(), d: -price, why: 'buy:' + id }, ...x.ledger].slice(0, 30); x.owned.push(id); });
  equip(id, c.kind);
  if (c.kind === 'theme') installThemeCSS();
  return true;
}

// ---------- Weekly events (Practice and Career only; seeded by ISO week). Cosmetic: a look for playing that week.
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
// Deterministic by ISO week, and never the same event two weeks running. The `rules` block is data only (4.0 never
// changes a rule for an event: every mode runs engine4 as written); it stays for the Practice screen's copy.
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
/** What seasonWindow needs from any result (v3 Result or v4 Result4): the tier and, per story, right/points/ITK duel. */
export interface SeasonResultLite { tier: Tier; per: { right: boolean; called: boolean; pts: number; beatItk?: boolean }[] }
function eventProgress(s: Save, r: SeasonResultLite, mode: string) {
  if (mode !== 'practice' && mode !== 'story' && mode !== 'career') return;
  const ev = weekEvent();
  if (!s.weekEv || s.weekEv.wk !== ev.wk) s.weekEv = { wk: ev.wk, n: 0 };
  s.weekEv.n += ev.id === 'rival' ? r.per.filter((p) => p.beatItk).length : 1;
  if (s.weekEv.n >= ev.goal && !s.weekEv.got) { s.weekEv.got = true; if (!s.owned.includes(ev.reward)) s.owned.push(ev.reward); s.stats.m_evWon = (s.stats.m_evWon || 0) + 1; }
}

// ---------- Hooks from lib/progress.ts trackWindow (every finished window): the recap's best tier and top call.
const TIER_RANK: Record<string, number> = { T1: 5, T2: 4, T3: 3, T4: 2, SPIKED: 1 };
export function seasonWindow(s: Save, r: SeasonResultLite, mode: string) {
  const st = syncSeason(s);
  if (!st.best || TIER_RANK[r.tier] > TIER_RANK[st.best]) st.best = r.tier;
  const top = r.per.reduce((m, p) => (p.right && p.called && p.pts > m ? p.pts : m), 0);
  if (top > 0 && (!st.top || top > st.top.pts)) st.top = { pts: top, mode, at: Date.now() };
  eventProgress(s, r, mode);
}
export const pendingRecap = (s: Save = getSave()) => (s.seasonLog && s.seasonLog[0] && !s.seasonLog[0].seen ? s.seasonLog[0] : null);
export const dismissRecap = () => update((s) => { if (s.seasonLog && s.seasonLog[0]) s.seasonLog[0].seen = true; });
export const ensureSeason = () => { const s = getSave(); if (!s.season || s.season.id !== seasonAt().id || s.season.xp == null) update((x) => { syncSeason(x); }); };

// ---------- Deadline days (GOTY §7.1): the real transfer deadlines, one source of truth for the client.
// The Wire's windows and their deadline days. `deadline` is the UTC date the 24 h Deadline Day Live board runs on;
// `closes` is when the real window shuts (UK 23:00 in winter, 18:00 in summer, in UTC). The server's copy is
// api/tier-one/v3/index.js › DD_DAYS (and wire.mjs › WIRE.CURRENT for the live window); keep them in step.
export interface WireWindowDef { id: string; opens: string; closes: string; deadline: string; key: 'winter' | 'summer' }
export const WIRE_WINDOWS: WireWindowDef[] = [
  { id: '2027-01', key: 'winter', opens: '2027-01-01T00:00:00Z', closes: '2027-02-02T23:00:00Z', deadline: '2027-02-02' },
  { id: '2027-summer', key: 'summer', opens: '2027-06-15T23:00:00Z', closes: '2027-09-01T18:00:00Z', deadline: '2027-09-01' },
];
export interface DeadlineDay { id: string; day: string; window: string; key: 'winter' | 'summer'; opensAt: number; closesAt: number; windowClosesAt: number }
export const DEADLINE_DAYS: DeadlineDay[] = WIRE_WINDOWS.map((w) => ({
  id: 'dd-' + w.deadline, day: w.deadline, window: w.id, key: w.key,
  opensAt: Date.parse(w.deadline + 'T00:00:00Z'), closesAt: Date.parse(w.deadline + 'T00:00:00Z') + DAY, windowClosesAt: Date.parse(w.closes),
}));
/** The deadline day running right now (UTC date), or null. */
export const deadlineDayAt = (ms = Date.now()): DeadlineDay | null => DEADLINE_DAYS.find((d) => ms >= d.opensAt && ms < d.closesAt) || null;
/** The next deadline day after `ms`, or null once the table runs out. */
export const nextDeadlineDay = (ms = Date.now()): DeadlineDay | null => DEADLINE_DAYS.find((d) => d.opensAt > ms) || null;
/** The most recent deadline day that has already closed, or null. */
export const lastDeadlineDay = (ms = Date.now()): DeadlineDay | null => [...DEADLINE_DAYS].reverse().find((d) => d.closesAt <= ms) || null;
/** The Wire window the game is framed for now: the one that is open, else the next to open, else the last. */
export function currentWireWindow(ms = Date.now()): WireWindowDef {
  return WIRE_WINDOWS.find((w) => ms < Date.parse(w.closes)) || WIRE_WINDOWS[WIRE_WINDOWS.length - 1];
}
