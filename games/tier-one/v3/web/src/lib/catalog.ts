// The catalog (GOTY.md §8.4): ONE list of everything that can be bought, unlocked or equipped, whatever screen shows it.
// It wraps the season lane's cosmetics (lib/season.ts) without changing their ids, and adds the new kinds: byline card
// designs, newsroom mastheads, press-pass skins, film poster frames, share-card styles, naming your paper, and Gold.
//
// The fairness line, made structural: an Item has no field that could hold an effect. Nothing here reaches a Daily
// board, its sources or its score; the Career conveniences in §1.2 are not catalog items. `validateCatalog()` (run by
// scripts/economy-test.mjs) refuses any item that grows such a field.
//
// INTEGRATOR (onbpass lane, screens/Pass.tsx): the store sheet can read `itemsOf(kind)` / `storeCatalog()` instead of
// season.storeItems(); ids are identical, `legacy(item)` returns the season.ts Cosmetic for CosSwatch, and
// wallet.buy(id, 'coins') replaces season.buyCosmetic(id) (same save fields, plus the wallet ledger).
// v4 (api lane): `config.get` returns the same shape as `Item[]` plus a featured list; `applyRemoteCatalog()` below is
// the one place to merge it. Until then the catalog is this file.
import {
  cosmetic as seasonCosmetic, storeItems as seasonStore, seasonItems, seasonAt, seasonById, isoWeek,
  type Cosmetic, type CosKind, type FramePat, type SeasonKey,
} from './season';
import type { Sfx } from './sfx';

// ---------------------------------------------------------------- types
export type LegacyKind = CosKind; // 'frame' | 'ink' | 'theme' | 'ringtone' | 'flair' (lib/season.ts)
export type NewKind = 'byline' | 'masthead' | 'presspass' | 'poster' | 'sharecard' | 'paper' | 'gold';
export type Kind = LegacyKind | NewKind;
/** Tab order on "Your desk": the byline first (it is you), then the desk, then the newsroom, then Gold. */
export const KINDS: Kind[] = ['byline', 'flair', 'frame', 'ink', 'theme', 'ringtone', 'presspass', 'poster', 'sharecard', 'masthead', 'paper', 'gold'];
export const LEGACY_KINDS: LegacyKind[] = ['frame', 'ink', 'theme', 'ringtone', 'flair'];
export const isLegacyKind = (k: Kind): k is LegacyKind => (LEGACY_KINDS as string[]).includes(k);

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
/** Where an item comes from. 'store' is the only one with a price; 'standard' is the built-in look everyone owns. */
export type Source = 'store' | 'track' | 'gold' | 'event' | 'standard';
export interface Price { coins?: number; credits?: number }
export interface SaleWindow { from: number; to: number } // ms UTC, `to` exclusive

export type Preview =
  | { k: 'frame'; c: string; c2: string; pat: FramePat }
  | { k: 'ink'; c: string }
  | { k: 'theme'; desk?: [string, string, string]; paper?: boolean }
  | { k: 'ringtone'; sfx: Sfx }
  | { k: 'flair'; g: string; c: string }
  | { k: 'byline'; bg: string; ink: string; accent: string; rule: 'single' | 'double' | 'thick' | 'none'; face: 'display' | 'cond'; tex?: 'halftone' | 'foil' }
  | { k: 'masthead'; bg: string; ink: string; face: 'display' | 'cond' | 'mono'; rule: 'single' | 'double' | 'thick'; orn?: string }
  | { k: 'presspass'; c1: string; c2: string; ink: string; stripe?: string }
  | { k: 'poster'; c: string; c2: string; style: 'film' | 'ticket' | 'gilt' | 'tape' | 'neon' }
  | { k: 'sharecard'; paper: string; ink: string; accent: string; style: 'classic' | 'redtop' | 'broadsheet' | 'night' | 'wire' }
  | { k: 'paper' }
  | { k: 'gold'; season: string };

export interface Item {
  id: string; kind: Kind;
  nameKey: string; nameVars?: Record<string, string | number>; descKey?: string;
  price: Price; source: Source; rarity: Rarity;
  set?: string;          // a family shown together ("redtop", "gilt", a season id)
  window?: SaleWindow;   // season-limited: on sale only inside it (honest countdown in the UI)
  featured?: boolean;    // pinned by remote config; the weekly rotation adds to this
  preview: Preview;
}
/** The only keys an item may carry. validateCatalog() fails on anything else, so an "effect" can never sneak in. */
export const ITEM_KEYS = ['id', 'kind', 'nameKey', 'nameVars', 'descKey', 'price', 'source', 'rarity', 'set', 'window', 'featured', 'preview'] as const;

// ---------------------------------------------------------------- the standard look of every kind (owned by all)
const STD: Record<Kind, Item> = {
  byline: { id: 'std.byline', kind: 'byline', nameKey: 'eco.items.std.byline', price: {}, source: 'standard', rarity: 'common', preview: { k: 'byline', bg: '#F4EFE4', ink: '#15130F', accent: '#C9381A', rule: 'thick', face: 'display' } },
  frame: { id: 'std.frame', kind: 'frame', nameKey: 'eco.items.std.frame', price: {}, source: 'standard', rarity: 'common', preview: { k: 'frame', c: '#15130F', c2: '#F4EFE4', pat: 'solid' } },
  ink: { id: 'std.ink', kind: 'ink', nameKey: 'eco.items.std.ink', price: {}, source: 'standard', rarity: 'common', preview: { k: 'ink', c: '#C9381A' } },
  theme: { id: 'std.theme', kind: 'theme', nameKey: 'eco.items.std.theme', price: {}, source: 'standard', rarity: 'common', preview: { k: 'theme', desk: ['#17140F', '#211D17', '#2C271F'] } },
  ringtone: { id: 'std.ringtone', kind: 'ringtone', nameKey: 'eco.items.std.ringtone', price: {}, source: 'standard', rarity: 'common', preview: { k: 'ringtone', sfx: 'phone.ring' } },
  flair: { id: 'std.flair', kind: 'flair', nameKey: 'eco.items.std.flair', price: {}, source: 'standard', rarity: 'common', preview: { k: 'flair', g: '', c: '#15130F' } },
  masthead: { id: 'std.masthead', kind: 'masthead', nameKey: 'eco.items.std.masthead', price: {}, source: 'standard', rarity: 'common', preview: { k: 'masthead', bg: '#F4EFE4', ink: '#15130F', face: 'display', rule: 'double' } },
  presspass: { id: 'std.presspass', kind: 'presspass', nameKey: 'eco.items.std.presspass', price: {}, source: 'standard', rarity: 'common', preview: { k: 'presspass', c1: '#FF7A52', c2: '#C9381A', ink: '#FFFFFF' } },
  poster: { id: 'std.poster', kind: 'poster', nameKey: 'eco.items.std.poster', price: {}, source: 'standard', rarity: 'common', preview: { k: 'poster', c: '#15130F', c2: '#F4EFE4', style: 'film' } },
  sharecard: { id: 'std.sharecard', kind: 'sharecard', nameKey: 'eco.items.std.sharecard', price: {}, source: 'standard', rarity: 'common', preview: { k: 'sharecard', paper: '#F2EEE5', ink: '#15130F', accent: '#D2381B', style: 'classic' } },
  paper: { id: 'std.paper', kind: 'paper', nameKey: 'eco.items.std.paper', price: {}, source: 'standard', rarity: 'common', preview: { k: 'paper' } },
  gold: { id: 'std.gold', kind: 'gold', nameKey: 'eco.items.std.gold', price: {}, source: 'standard', rarity: 'common', preview: { k: 'gold', season: '' } },
};
export const standardOf = (kind: Kind): Item => STD[kind];
export const isStandard = (id: string) => id.startsWith('std.');

// ---------------------------------------------------------------- new evergreen items (credits, some also coins)
// Coins buy the small things (rare and under); credits buy the things that are seen most: epic and legendary looks,
// season sets, Gold and your paper's name. Every price is fixed; the weekly featured price is the only discount.
const NEW: Item[] = [
  // byline card designs: the card on Me, in the press box tables and on results
  { id: 'by.redtop', kind: 'byline', nameKey: 'eco.items.by.redtop', price: { coins: 400, credits: 80 }, source: 'store', rarity: 'rare', set: 'redtop', preview: { k: 'byline', bg: '#C8102E', ink: '#FFFFFF', accent: '#FFD35C', rule: 'thick', face: 'cond' } },
  { id: 'by.broadsheet', kind: 'byline', nameKey: 'eco.items.by.broadsheet', price: { coins: 400, credits: 80 }, source: 'store', rarity: 'rare', set: 'broadsheet', preview: { k: 'byline', bg: '#FBF6EA', ink: '#1B1A17', accent: '#1B1A17', rule: 'double', face: 'display' } },
  { id: 'by.wire', kind: 'byline', nameKey: 'eco.items.by.wire', price: { credits: 120 }, source: 'store', rarity: 'epic', set: 'wire', preview: { k: 'byline', bg: '#0E1A20', ink: '#E6F7FC', accent: '#35C3E6', rule: 'single', face: 'cond', tex: 'halftone' } },
  { id: 'by.night', kind: 'byline', nameKey: 'eco.items.by.night', price: { credits: 140 }, source: 'store', rarity: 'epic', set: 'night', preview: { k: 'byline', bg: '#15130F', ink: '#F4EFE4', accent: '#F7B928', rule: 'single', face: 'display' } },
  { id: 'by.gilt', kind: 'byline', nameKey: 'eco.items.by.gilt', price: { credits: 320 }, source: 'store', rarity: 'legendary', set: 'gilt', preview: { k: 'byline', bg: '#F4EFE4', ink: '#3A2600', accent: '#B8830B', rule: 'double', face: 'display', tex: 'foil' } },
  // newsroom mastheads (the press box lane's newsroom table wears the masthead of its founder or its vote)
  { id: 'mh.gothic', kind: 'masthead', nameKey: 'eco.items.mh.gothic', price: { coins: 350, credits: 70 }, source: 'store', rarity: 'rare', set: 'broadsheet', preview: { k: 'masthead', bg: '#F4EFE4', ink: '#15130F', face: 'display', rule: 'thick', orn: '✦' } },
  { id: 'mh.redtop', kind: 'masthead', nameKey: 'eco.items.mh.redtop', price: { coins: 350, credits: 70 }, source: 'store', rarity: 'rare', set: 'redtop', preview: { k: 'masthead', bg: '#C8102E', ink: '#FFFFFF', face: 'cond', rule: 'single' } },
  { id: 'mh.wire', kind: 'masthead', nameKey: 'eco.items.mh.wire', price: { credits: 110 }, source: 'store', rarity: 'epic', set: 'wire', preview: { k: 'masthead', bg: '#0E1A20', ink: '#35C3E6', face: 'mono', rule: 'single', orn: '▮' } },
  { id: 'mh.gilt', kind: 'masthead', nameKey: 'eco.items.mh.gilt', price: { credits: 300 }, source: 'store', rarity: 'legendary', set: 'gilt', preview: { k: 'masthead', bg: '#15130F', ink: '#F7B928', face: 'display', rule: 'double', orn: '❦' } },
  // press-pass skins (the badge on Home and Me)
  { id: 'pp.pitch', kind: 'presspass', nameKey: 'eco.items.pp.pitch', price: { coins: 300, credits: 60 }, source: 'store', rarity: 'rare', preview: { k: 'presspass', c1: '#2FBF71', c2: '#1C8A50', ink: '#04200F' } },
  { id: 'pp.midnight', kind: 'presspass', nameKey: 'eco.items.pp.midnight', price: { coins: 300, credits: 60 }, source: 'store', rarity: 'rare', set: 'night', preview: { k: 'presspass', c1: '#1B2A3A', c2: '#0E141B', ink: '#F4EFE4', stripe: '#35C3E6' } },
  { id: 'pp.chrome', kind: 'presspass', nameKey: 'eco.items.pp.chrome', price: { credits: 130 }, source: 'store', rarity: 'epic', set: 'wire', preview: { k: 'presspass', c1: '#D9DEE4', c2: '#8E97A3', ink: '#15130F', stripe: '#FF5A36' } },
  { id: 'pp.gilt', kind: 'presspass', nameKey: 'eco.items.pp.gilt', price: { credits: 220 }, source: 'store', rarity: 'legendary', set: 'gilt', preview: { k: 'presspass', c1: '#FFD35C', c2: '#B8830B', ink: '#3A2600' } },
  // film poster frames (around the poster of every moment film and clip)
  { id: 'po.ticket', kind: 'poster', nameKey: 'eco.items.po.ticket', price: { coins: 250, credits: 50 }, source: 'store', rarity: 'rare', preview: { k: 'poster', c: '#F4EFE4', c2: '#C9381A', style: 'ticket' } },
  { id: 'po.tape', kind: 'poster', nameKey: 'eco.items.po.tape', price: { coins: 250, credits: 50 }, source: 'store', rarity: 'rare', preview: { k: 'poster', c: '#F7B928', c2: '#15130F', style: 'tape' } },
  { id: 'po.neon', kind: 'poster', nameKey: 'eco.items.po.neon', price: { credits: 120 }, source: 'store', rarity: 'epic', set: 'night', preview: { k: 'poster', c: '#FF5A7A', c2: '#35C3E6', style: 'neon' } },
  { id: 'po.gilt', kind: 'poster', nameKey: 'eco.items.po.gilt', price: { credits: 200 }, source: 'store', rarity: 'legendary', set: 'gilt', preview: { k: 'poster', c: '#F7B928', c2: '#7A5200', style: 'gilt' } },
  // share-card styles (the scoop card PNG and every card preview)
  { id: 'sc.redtop', kind: 'sharecard', nameKey: 'eco.items.sc.redtop', price: { coins: 400, credits: 80 }, source: 'store', rarity: 'rare', set: 'redtop', preview: { k: 'sharecard', paper: '#FFFFFF', ink: '#15130F', accent: '#C8102E', style: 'redtop' } },
  { id: 'sc.broadsheet', kind: 'sharecard', nameKey: 'eco.items.sc.broadsheet', price: { coins: 400, credits: 80 }, source: 'store', rarity: 'rare', set: 'broadsheet', preview: { k: 'sharecard', paper: '#FBF6EA', ink: '#1B1A17', accent: '#1B1A17', style: 'broadsheet' } },
  { id: 'sc.night', kind: 'sharecard', nameKey: 'eco.items.sc.night', price: { credits: 120 }, source: 'store', rarity: 'epic', set: 'night', preview: { k: 'sharecard', paper: '#15130F', ink: '#F4EFE4', accent: '#F7B928', style: 'night' } },
  { id: 'sc.wire', kind: 'sharecard', nameKey: 'eco.items.sc.wire', price: { credits: 120 }, source: 'store', rarity: 'epic', set: 'wire', preview: { k: 'sharecard', paper: '#0E1A20', ink: '#E6F7FC', accent: '#35C3E6', style: 'wire' } },
  { id: 'sc.gilt', kind: 'sharecard', nameKey: 'eco.items.sc.gilt', price: { credits: 260 }, source: 'store', rarity: 'legendary', set: 'gilt', preview: { k: 'sharecard', paper: '#F4EFE4', ink: '#3A2600', accent: '#B8830B', style: 'classic' } },
  // naming your paper: one purchase, then rename whenever you like (the name is stored in save.desk.paper)
  { id: 'paper.name', kind: 'paper', nameKey: 'eco.items.paper.name', descKey: 'eco.items.paper.nameD', price: { credits: 150 }, source: 'store', rarity: 'rare', preview: { k: 'paper' } },
];

// ---------------------------------------------------------------- season-limited sets (generated per season id)
// One byline design, one masthead and one poster frame per season, sold for credits only inside the season window.
// Ids carry the year, so "winter-2027.by" is gone for good on 3 Feb 2027; next winter's set is a different item.
type Slot = Omit<Item, 'id' | 'nameKey' | 'nameVars' | 'window' | 'set' | 'source'>;
const SEASON_NEW: Record<SeasonKey, Record<'by' | 'mh' | 'po', Slot>> = {
  rumour: {
    by: { kind: 'byline', price: { credits: 180 }, rarity: 'epic', preview: { k: 'byline', bg: '#2B1C11', ink: '#F2E3C9', accent: '#D9913A', rule: 'double', face: 'display', tex: 'halftone' } },
    mh: { kind: 'masthead', price: { credits: 160 }, rarity: 'epic', preview: { k: 'masthead', bg: '#F2E3C9', ink: '#3A2310', face: 'display', rule: 'double', orn: '❝' } },
    po: { kind: 'poster', price: { credits: 150 }, rarity: 'epic', preview: { k: 'poster', c: '#D9913A', c2: '#3A2310', style: 'gilt' } },
  },
  winter: {
    by: { kind: 'byline', price: { credits: 180 }, rarity: 'epic', preview: { k: 'byline', bg: '#0E2231', ink: '#DDEFF8', accent: '#5BB8E8', rule: 'single', face: 'cond', tex: 'halftone' } },
    mh: { kind: 'masthead', price: { credits: 160 }, rarity: 'epic', preview: { k: 'masthead', bg: '#DDEFF8', ink: '#1B3F66', face: 'display', rule: 'thick', orn: '❄' } },
    po: { kind: 'poster', price: { credits: 150 }, rarity: 'epic', preview: { k: 'poster', c: '#5BB8E8', c2: '#0E2231', style: 'neon' } },
  },
  spring: {
    by: { kind: 'byline', price: { credits: 180 }, rarity: 'epic', preview: { k: 'byline', bg: '#F6FBF1', ink: '#15260F', accent: '#C2477A', rule: 'double', face: 'display' } },
    mh: { kind: 'masthead', price: { credits: 160 }, rarity: 'epic', preview: { k: 'masthead', bg: '#15260F', ink: '#F2A7C3', face: 'display', rule: 'single', orn: '✿' } },
    po: { kind: 'poster', price: { credits: 150 }, rarity: 'epic', preview: { k: 'poster', c: '#7FCB6A', c2: '#F2A7C3', style: 'ticket' } },
  },
  summer: {
    by: { kind: 'byline', price: { credits: 180 }, rarity: 'epic', preview: { k: 'byline', bg: '#FFF3E0', ink: '#2A1206', accent: '#E0552A', rule: 'thick', face: 'cond' } },
    mh: { kind: 'masthead', price: { credits: 160 }, rarity: 'epic', preview: { k: 'masthead', bg: '#E0552A', ink: '#FFF3E0', face: 'cond', rule: 'thick', orn: '☀' } },
    po: { kind: 'poster', price: { credits: 150 }, rarity: 'epic', preview: { k: 'poster', c: '#FFD35C', c2: '#E0552A', style: 'tape' } },
  },
};
export const GOLD_CREDITS = 350; // exactly the €4.99 credit pack (lib/wallet.ts CREDIT_PACKS)
const SEASON_RE = /^((rumour|winter|spring|summer)-(\d{4}))\.(by|mh|po)$/;
const GOLD_RE = /^gold\.((rumour|winter|spring|summer)-(\d{4}))$/;
function seasonNew(id: string): Item | null {
  const m = SEASON_RE.exec(id); if (!m) return null;
  const def = seasonById(m[1]); if (!def) return null;
  const slot = SEASON_NEW[m[2] as SeasonKey][m[4] as 'by' | 'mh' | 'po'];
  return { ...slot, id, source: 'store', set: m[1], window: { from: def.start, to: def.end }, nameKey: 'eco.items.season.' + m[2] + '.' + m[4], nameVars: { y: '’' + m[3].slice(2) } };
}
function goldItem(id: string): Item | null {
  const m = GOLD_RE.exec(id); if (!m) return null;
  const def = seasonById(m[1]); if (!def) return null;
  return { id, kind: 'gold', nameKey: 'eco.items.gold', nameVars: { s: def.nameKey, y: m[3] }, descKey: 'eco.items.goldD', price: { credits: GOLD_CREDITS }, source: 'store', rarity: 'epic', set: m[1], window: { from: def.start, to: def.end }, preview: { k: 'gold', season: m[1] } };
}

// ---------------------------------------------------------------- legacy cosmetics (lib/season.ts), same ids
const RARITY_LEGACY = (c: Cosmetic): Rarity => {
  if (c.price === 'track') return 'epic';
  if (c.price === 'gold') return /\.g8$/.test(c.id) ? 'legendary' : 'rare';
  if (c.price === 'event') return 'rare';
  return typeof c.price === 'number' && c.price >= 300 ? 'rare' : 'common';
};
const previewLegacy = (c: Cosmetic): Preview => {
  switch (c.kind) {
    case 'frame': return { k: 'frame', c: c.c || '#15130F', c2: c.c2 || '#F4EFE4', pat: c.pat || 'solid' };
    case 'ink': return { k: 'ink', c: c.c || '#C9381A' };
    case 'theme': return { k: 'theme', desk: c.desk, paper: c.paper };
    case 'ringtone': return { k: 'ringtone', sfx: c.sfx || 'phone.ring' };
    case 'flair': return { k: 'flair', g: c.g || '', c: c.c || '#15130F' };
  }
};
export function fromLegacy(c: Cosmetic): Item {
  const def = c.season ? seasonById(c.season) : null;
  return {
    id: c.id, kind: c.kind, nameKey: c.nameKey, nameVars: c.nameVars,
    price: typeof c.price === 'number' ? { coins: c.price } : {},
    source: typeof c.price === 'number' ? 'store' : c.price, rarity: RARITY_LEGACY(c),
    set: c.season || (c.id.startsWith('ev.') ? 'event' : undefined),
    window: def && c.price === 'gold' ? { from: def.start, to: def.end } : undefined,
    preview: previewLegacy(c),
  };
}
/** The season.ts Cosmetic behind a legacy item (for CosSwatch, frameCSS, ringtoneSfx). Null for new kinds. */
export const legacy = (it: Item | string): Cosmetic | null => seasonCosmetic(typeof it === 'string' ? it : it.id);

// ---------------------------------------------------------------- lookups
export function item(id: string): Item | null {
  if (isStandard(id)) { const k = id.slice(4) as Kind; return STD[k] || null; }
  const n = NEW.find((x) => x.id === id); if (n) return n;
  return seasonNew(id) || goldItem(id) || (() => { const c = seasonCosmetic(id); return c ? fromLegacy(c) : null; })();
}
export const inWindow = (it: Item, ms = Date.now()) => !it.window || (ms >= it.window.from && ms < it.window.to);
export const onSale = (it: Item, ms = Date.now()) => it.source === 'store' && inWindow(it, ms) && (it.price.coins != null || it.price.credits != null);
/** This season's limited set: the three credits items plus the season lane's track/Gold items. */
export function seasonSet(sid = seasonAt().id): Item[] {
  return [...(['by', 'mh', 'po'] as const).map((k) => seasonNew(sid + '.' + k)!), goldItem('gold.' + sid)!, ...seasonItems(sid).map(fromLegacy)].filter(Boolean);
}
/** Everything with a price today (evergreen + this season's set), catalog order. */
export function storeCatalog(ms = Date.now()): Item[] {
  return [...seasonStore().map(fromLegacy), ...NEW, ...seasonSet(seasonAt(ms).id)].filter((x) => onSale(x, ms));
}
/** Every item that can exist right now (for a tab): the standard look, the store, then this season's earned items. */
export function itemsOf(kind: Kind, ms = Date.now()): Item[] {
  const sid = seasonAt(ms).id;
  const all = [STD[kind], ...seasonStore().map(fromLegacy), ...NEW, ...seasonSet(sid), ...seasonCosmeticsAll()];
  const seen = new Set<string>();
  return all.filter((x) => x.kind === kind && !seen.has(x.id) && seen.add(x.id));
}
// The weekly-event rewards and the current season's track items (earned, never sold) so an owner can equip them.
function seasonCosmeticsAll(): Item[] {
  return ['ev.rival', 'ev.medical', 'ev.frenzy', 'ev.barber', 'ev.local'].map((id) => seasonCosmetic(id)).filter((c): c is Cosmetic => !!c).map(fromLegacy);
}

// ---------------------------------------------------------------- the featured rotation
// Three items a week, deterministic by ISO week, one per kind, never the same item two weeks running, at an honest
// 15% off. Same item, same price the week after; nothing "leaves" unless it has a season window. Remote config
// (v4 config.get) can pin items with `featured: true`; they show first at full price.
export const FEATURED_OFF = 0.15;
const hash = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
const off = (n: number) => Math.max(1, Math.round((n * (1 - FEATURED_OFF)) / 5) * 5);
export const featuredPrice = (p: Price): Price => ({ ...(p.coins != null ? { coins: off(p.coins) } : {}), ...(p.credits != null ? { credits: off(p.credits) } : {}) });
export interface Featured { item: Item; was: Price; price: Price; pinned: boolean }
export function featuredView(ms = Date.now()): { items: Featured[]; ends: number; week: string } {
  const w = isoWeek(ms), prev = isoWeek(w.start - 864e5);
  const pool = storeCatalog(ms).filter((x) => x.kind !== 'gold' && x.kind !== 'paper' && !x.window);
  const pick = (key: string, avoid: Set<string>) => {
    const out: Item[] = []; const kinds = new Set<Kind>();
    const order = [...pool].sort((a, b) => hash(key + a.id) - hash(key + b.id));
    for (const it of order) { if (out.length >= 3) break; if (kinds.has(it.kind) || avoid.has(it.id)) continue; kinds.add(it.kind); out.push(it); }
    return out;
  };
  const last = new Set(pick('t1feat:' + prev.key, new Set()).map((x) => x.id));
  const rot = pick('t1feat:' + w.key, last);
  const pinned = pool.filter((x) => x.featured && !rot.includes(x));
  return { week: w.key, ends: w.end, items: [...pinned.map((item) => ({ item, was: item.price, price: item.price, pinned: true })), ...rot.map((item) => ({ item, was: item.price, price: featuredPrice(item.price), pinned: false }))] };
}
/** The price to pay right now (featured this week or not). */
export function priceNow(it: Item, ms = Date.now()): Price {
  const f = featuredView(ms).items.find((x) => x.item.id === it.id);
  return f ? f.price : it.price;
}

// ---------------------------------------------------------------- remote config (v4 adapter point)
// The api lane's config.get can hand over `{ items?: Item[]; featured?: string[] }`. Items replace same-id entries
// (price or window changes) or add new ones; `featured` pins ids. Additive only: it can never remove an owned id.
let remote: { items: Item[]; featured: string[] } = { items: [], featured: [] };
export function applyRemoteCatalog(cfg: { items?: Item[]; featured?: string[] }) {
  remote = { items: (cfg.items || []).filter((x) => validateItem(x).length === 0), featured: cfg.featured || [] };
  for (const it of remote.items) { const k = NEW.findIndex((x) => x.id === it.id); if (k >= 0) NEW[k] = it; else NEW.push(it); }
  for (const it of NEW) it.featured = remote.featured.includes(it.id) || undefined;
}

// ---------------------------------------------------------------- validation (scripts/economy-test.mjs)
const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
const SOURCES: Source[] = ['store', 'track', 'gold', 'event', 'standard'];
export function validateItem(it: Item): string[] {
  const e: string[] = [];
  const extra = Object.keys(it).filter((k) => !(ITEM_KEYS as readonly string[]).includes(k));
  if (extra.length) e.push(`${it.id}: unknown keys ${extra.join(',')} (an item can carry no effect)`);
  if (!it.id || !/^[a-z0-9.’'\-]+$/i.test(it.id)) e.push(`${it.id}: bad id`);
  if (!(KINDS as string[]).includes(it.kind)) e.push(`${it.id}: bad kind ${it.kind}`);
  if (!it.nameKey) e.push(`${it.id}: no nameKey`);
  if (!RARITIES.includes(it.rarity)) e.push(`${it.id}: bad rarity`);
  if (!SOURCES.includes(it.source)) e.push(`${it.id}: bad source`);
  const pk = Object.keys(it.price).filter((k) => k !== 'coins' && k !== 'credits');
  if (pk.length) e.push(`${it.id}: price has ${pk.join(',')}`);
  for (const k of ['coins', 'credits'] as const) { const v = it.price[k]; if (v != null && (!Number.isInteger(v) || v <= 0)) e.push(`${it.id}: ${k} price must be a positive integer`); }
  const priced = it.price.coins != null || it.price.credits != null;
  if (it.source === 'store' && !priced) e.push(`${it.id}: store item without a price`);
  if (it.source !== 'store' && priced) e.push(`${it.id}: ${it.source} item with a price`);
  if (it.window && !(it.window.from < it.window.to)) e.push(`${it.id}: bad window`);
  if (!it.preview || it.preview.k !== it.kind) e.push(`${it.id}: preview kind mismatch`);
  if (isStandard(it.id) !== (it.source === 'standard')) e.push(`${it.id}: std ids are the standard source, and only they are`);
  return e;
}
export function validateCatalog(ms = Date.now()): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  const all = KINDS.flatMap((k) => itemsOf(k, ms));
  for (const it of all) { if (ids.has(it.id)) errs.push(`${it.id}: duplicate id`); ids.add(it.id); errs.push(...validateItem(it)); }
  for (const k of KINDS) if (!all.some((x) => x.id === 'std.' + k)) errs.push(`no standard item for ${k}`);
  // Every legacy id still resolves through the catalog, unchanged.
  for (const c of [...seasonStore(), ...seasonItems(seasonAt(ms).id)]) { const it = item(c.id); if (!it || it.kind !== c.kind) errs.push(`legacy ${c.id} lost`); }
  const f = featuredView(ms);
  if (f.items.filter((x) => !x.pinned).length !== 3) errs.push('featured rotation is not three items');
  for (const x of f.items) for (const k of ['coins', 'credits'] as const) if (x.was[k] != null && (x.price[k]! > x.was[k]!)) errs.push(`${x.item.id}: featured price above the usual price`);
  return errs;
}
export const rarityRank = (r: Rarity) => RARITIES.indexOf(r);
