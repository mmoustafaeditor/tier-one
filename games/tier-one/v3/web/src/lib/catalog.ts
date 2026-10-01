// The catalog (GOTY.md §8.4): ONE list of everything that can be bought, unlocked or equipped, whatever screen shows it.
// It wraps the season lane's cosmetics (lib/season.ts) without changing their ids, and adds every other kind from the
// kind registry (lib/kinds.ts): byline card designs, mastheads, press-pass skins, poster frames, share-card styles,
// naming your paper, Gold, and the 3.4 long-tail kinds (headline fonts, desk lamps, ring packs, feed skins, front pages).
//
// The fairness line, made structural: an Item has no field that could hold an effect. Nothing here reaches a Daily
// board, its sources or its score; the Career conveniences in §1.2 are not catalog items. `validateCatalog()` (run by
// scripts/economy-test.mjs and scripts/longtail-test.mjs) refuses any item that grows such a field.
//
// The long tail (§10.3): items carry a `drop` (when they arrived, for the "new this week" rail), a `window` (season-
// limited: "leaves at season end"), `vault` windows ("back for one week") and, for earned-only items, an `earn` rule
// that says how they are won and marks them never purchasable. lib/drops.ts reads these for the rails and the
// collection book; lib/earned.ts grants the earned ones.
//
// v4 (api lane): `config.get` hands over `catalog.looks` (this Item shape), `drops`, `vault` and `rails`;
// `applyRemoteCatalog()` below is the one place to merge them. Until then the catalog is this file.
import {
  cosmetic as seasonCosmetic, storeItems as seasonStore, seasonItems, seasonAt, seasonById, isoWeek,
  type Cosmetic, type CosKind, type SeasonKey,
} from './season';
import { REGISTRY, KINDS, KINDS4, LEGACY4, GROUPS, kindDef, kindsOf, isKind, isKind4, overriddenBy, validateRegistry, type Kind, type Kind4, type Preview, type Group } from './kinds';
import { PRICES, lookPrice, levelUnlocks, type Rarity4 } from './economy';
// The server's table (RULES4 §5): credit packs, Gold, coin packs, the starter bundle and the credit earns are read
// from here so the client and api/tier-one/v4 can never disagree. Vite bundles the JSON; the server validates it on load.
import serverCatalog from '../../../../../../api/tier-one/v4/config/catalog.json';

export { KINDS, KINDS4, LEGACY4, GROUPS, REGISTRY, kindDef, kindsOf, isKind, isKind4, overriddenBy, validateRegistry, type Kind, type Kind4, type Preview, type Group };

// ---------------------------------------------------------------- the server table (api/tier-one/v4/config/catalog.json)
interface ServerItem { id: string; kind: 'credits' | 'gold' | 'cosmetic' | 'coins' | 'name'; name: string; desc?: string; price: { credits?: number; eur?: number; usd?: number }; grants: { credits?: number; coins?: number; ent?: string }; season?: string; featured?: boolean; from?: string; until?: string; giftable?: boolean }
interface ServerCatalog { items: ServerItem[]; earn: Record<string, number>; gift: { max: number; perDay: number } }
export const SERVER: ServerCatalog = serverCatalog as ServerCatalog;
/** A credit pack: what money buys. `eur` is cents on the server; `price` is the display string. */
export interface CreditPack { id: string; credits: number; eur: number; price: string; tag?: 'gold' | 'starter'; coins?: number; ent?: string; desc?: string }
const eurText = (cents: number) => '€' + (cents / 100).toFixed(2);
const packOf = (it: ServerItem): CreditPack => ({ id: it.id, credits: it.grants.credits || 0, eur: (it.price.eur || 0) / 100, price: eurText(it.price.eur || 0), tag: it.id.startsWith('starter') ? 'starter' : it.grants.credits === GOLD_CREDITS_JSON ? 'gold' : undefined, coins: it.grants.coins, ent: it.grants.ent, desc: it.desc });
const GOLD_CREDITS_JSON = SERVER.items.find((x) => x.kind === 'gold')?.price.credits || 350;
/** Gold costs exactly one credit pack (RULES4 §3: 350 credits ≈ €4.99). */
export const GOLD_CREDITS = GOLD_CREDITS_JSON;
/** The ONE credit pack table (money → credits), in price order. */
export const CREDIT_PACKS: CreditPack[] = SERVER.items.filter((x) => x.kind === 'credits' && !x.id.startsWith('starter')).map(packOf).sort((a, b) => a.eur - b.eur);
/** Coin packs (credits → coins). */
export interface CoinPack { id: string; credits: number; coins: number; desc?: string }
export const COIN_PACKS: CoinPack[] = SERVER.items.filter((x) => x.kind === 'coins').map((x) => ({ id: x.id, credits: x.price.credits || 0, coins: x.grants.coins || 0, desc: x.desc }));
/** The one-time starter bundle, shown once in Lens › Looks from Level 3 (CONCEPT4 §5), never as a popup. */
export const STARTER: (CreditPack & { level: number; look: string }) | null = (() => { const it = SERVER.items.find((x) => x.id.startsWith('starter')); return it ? { ...packOf(it), level: levelUnlocks.live, look: 'wp.starter' } : null; })();
/** Credits earned by playing, server amounts (lib/wallet.ts CREDITS_EARN reads these). */
export const SERVER_EARN = SERVER.earn;
export const packBonus = (p: CreditPack) => { const base = CREDIT_PACKS[0]; return !base || !p.eur || !base.eur ? 0 : Math.round(((p.credits / p.eur) / (base.credits / base.eur) - 1) * 100); };

// ---------------------------------------------------------------- types
/** The 3.x kinds whose equipped id lives in lib/season.ts fields (save.equip / save.theme). wallpaper and dropcard are
 *  CosKinds too (the season track hands them out) but store in save.desk.equip like every 4.0 kind. */
export type LegacyKind = Exclude<CosKind, 'wallpaper' | 'dropcard'>;
export const LEGACY_KINDS: LegacyKind[] = ['frame', 'ink', 'theme', 'ringtone', 'flair'];
export const isLegacyKind = (k: Kind): k is LegacyKind => (LEGACY_KINDS as string[]).includes(k);

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
/** Where an item comes from. 'store' is the only one with a price; 'standard' is the built-in look everyone owns;
 *  'earned' is never purchasable and carries an `earn` rule. */
export type Source = 'store' | 'track' | 'gold' | 'event' | 'standard' | 'earned';
export interface Price { coins?: number; credits?: number }
export interface SaleWindow { from: number; to: number } // ms UTC, `to` exclusive
/** How an earned-only item is won. `via` is a closed list; the evaluator is lib/earned.ts. */
export type EarnVia = 'story' | 'rank' | 'streak' | 'rivalry' | 'referral' | 'event' | 'ddlive' | 'anniversary' | 'pass' | 'gold';
export interface Earn { via: EarnVia; n?: number; ref?: string }
export const EARN_VIAS: EarnVia[] = ['story', 'rank', 'streak', 'rivalry', 'referral', 'event', 'ddlive', 'anniversary', 'pass', 'gold'];

export interface Item {
  id: string; kind: Kind;
  nameKey: string; nameVars?: Record<string, string | number>; descKey?: string;
  price: Price; source: Source; rarity: Rarity;
  set?: string;          // a family shown together ("redtop", "gilt", a season id, "story")
  window?: SaleWindow;   // season-limited: on sale only inside it (honest countdown in the UI)
  vault?: SaleWindow[];  // vault returns: extra sale windows after `window` closed ("back for one week")
  drop?: number;         // ms UTC the item arrived (the "new this week" rail); absent = launch stock
  earn?: Earn;           // earned-only rule (source 'earned'); never priced, never gifted
  featured?: boolean;    // pinned by remote config; the weekly rotation adds to this
  preview: Preview;
}
/** The only keys an item may carry. validateCatalog() fails on anything else, so an "effect" can never sneak in. */
export const ITEM_KEYS = ['id', 'kind', 'nameKey', 'nameVars', 'descKey', 'price', 'source', 'rarity', 'set', 'window', 'vault', 'drop', 'earn', 'featured', 'preview'] as const;

const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);
const DAY = 864e5;

// ---------------------------------------------------------------- the standard look of every kind (owned by all)
const STD = Object.fromEntries(KINDS.map((k) => [k, { id: 'std.' + k, kind: k, nameKey: 'eco.items.std.' + k, price: {}, source: 'standard', rarity: 'common', preview: REGISTRY[k].std }])) as Record<Kind, Item>;
export const standardOf = (kind: Kind): Item => STD[kind];
export const isStandard = (id: string) => id.startsWith('std.');

// ---------------------------------------------------------------- evergreen items (credits, some also coins)
// Coins buy the small things (rare and under); credits buy the things that are seen most: epic and legendary looks,
// season sets, Gold and your paper's name. Every price is fixed; the weekly featured price is the only discount.
// `drop` dates put an item on the "new this week" rail for its first week; launch stock has none.
const P4 = (r: Rarity4) => lookPrice(r);
const NEW: Item[] = [
  // ---- 4.0 the phone (CONCEPT4 §5 Looks): wallpapers, Drop card styles, OS themes, frames. Prices are the one rarity
  // table (lib/economy.ts PRICES.look): common 150 · rare 400 · epic 900 coins; legendary is credits or the Gold lane.
  // Drawn, specific looks: grain, halftone, pitch lines, wood type. No gradients blobs, no glass.
  { id: 'wp.night', kind: 'wallpaper', nameKey: 'e4.items.wp.night', price: P4('common'), source: 'store', rarity: 'common', set: 'night', preview: { k: 'wallpaper', bg: '#0F0E0C', ink: '#F4EFE4', accent: '#F7B928', motif: 'grain' } },
  { id: 'wp.pitch', kind: 'wallpaper', nameKey: 'e4.items.wp.pitch', price: P4('common'), source: 'store', rarity: 'common', preview: { k: 'wallpaper', bg: '#0F2A18', ink: '#E9F6EC', accent: '#7FCB6A', motif: 'pitch' } },
  { id: 'wp.redtop', kind: 'wallpaper', nameKey: 'e4.items.wp.redtop', price: P4('rare'), source: 'store', rarity: 'rare', set: 'redtop', preview: { k: 'wallpaper', bg: '#C8102E', ink: '#FFFFFF', accent: '#FFD35C', motif: 'halftone' } },
  { id: 'wp.wire', kind: 'wallpaper', nameKey: 'e4.items.wp.wire', price: P4('rare'), source: 'store', rarity: 'rare', set: 'wire', preview: { k: 'wallpaper', bg: '#0E1A20', ink: '#E6F7FC', accent: '#35C3E6', motif: 'grid' } },
  { id: 'wp.terrace', kind: 'wallpaper', nameKey: 'e4.items.wp.terrace', price: P4('epic'), source: 'store', rarity: 'epic', preview: { k: 'wallpaper', bg: '#1B1A17', ink: '#FBF6EA', accent: '#FF5A36', motif: 'stripe' } },
  { id: 'wp.gilt', kind: 'wallpaper', nameKey: 'e4.items.wp.gilt', price: P4('legendary'), source: 'store', rarity: 'legendary', set: 'gilt', preview: { k: 'wallpaper', bg: '#15130F', ink: '#F4EFE4', accent: '#F7B928', motif: 'halftone' } },
  { id: 'dc.ticker', kind: 'dropcard', nameKey: 'e4.items.dc.ticker', price: P4('common'), source: 'store', rarity: 'common', set: 'wire', preview: { k: 'dropcard', bg: '#0E1A20', ink: '#E6F7FC', accent: '#35C3E6', style: 'ticker' } },
  { id: 'dc.redtop', kind: 'dropcard', nameKey: 'e4.items.dc.redtop', price: P4('common'), source: 'store', rarity: 'common', set: 'redtop', preview: { k: 'dropcard', bg: '#FFFFFF', ink: '#15130F', accent: '#C8102E', style: 'bold' } },
  { id: 'dc.poster', kind: 'dropcard', nameKey: 'e4.items.dc.poster', price: P4('rare'), source: 'store', rarity: 'rare', set: 'night', preview: { k: 'dropcard', bg: '#15130F', ink: '#F4EFE4', accent: '#F7B928', style: 'poster' } },
  { id: 'dc.stamp', kind: 'dropcard', nameKey: 'e4.items.dc.stamp', price: P4('rare'), source: 'store', rarity: 'rare', set: 'broadsheet', preview: { k: 'dropcard', bg: '#FBF6EA', ink: '#1B1A17', accent: '#C9381A', style: 'stamp' } },
  { id: 'dc.neon', kind: 'dropcard', nameKey: 'e4.items.dc.neon', price: P4('epic'), source: 'store', rarity: 'epic', set: 'night', preview: { k: 'dropcard', bg: '#0B0B10', ink: '#FFFFFF', accent: '#FF5A7A', style: 'poster' } },
  { id: 'dc.gilt', kind: 'dropcard', nameKey: 'e4.items.dc.gilt', price: P4('legendary'), source: 'store', rarity: 'legendary', set: 'gilt', preview: { k: 'dropcard', bg: '#F4EFE4', ink: '#3A2600', accent: '#B8830B', style: 'stamp' } },
  { id: 'th.paper', kind: 'theme', nameKey: 'e4.items.th.paper', price: P4('rare'), source: 'store', rarity: 'rare', set: 'broadsheet', preview: { k: 'theme', desk: ['#F4EFE4', '#E6DFCF', '#D8CFBA'], os: { bg: '#F4EFE4', ink: '#15130F', accent: '#C9381A', bar: '#E6DFCF' } } },
  { id: 'th.wire', kind: 'theme', nameKey: 'e4.items.th.wire', price: P4('epic'), source: 'store', rarity: 'epic', set: 'wire', preview: { k: 'theme', desk: ['#0E1A20', '#132530', '#1B3340'], os: { bg: '#0E1A20', ink: '#E6F7FC', accent: '#35C3E6', bar: '#132530' } } },
  { id: 'th.redtop', kind: 'theme', nameKey: 'e4.items.th.redtop', price: P4('epic'), source: 'store', rarity: 'epic', set: 'redtop', preview: { k: 'theme', desk: ['#2A0A10', '#3D0F17', '#C8102E'], os: { bg: '#2A0A10', ink: '#FFFFFF', accent: '#FFD35C', bar: '#3D0F17' } } },
  { id: 'th.gilt', kind: 'theme', nameKey: 'e4.items.th.gilt', price: P4('legendary'), source: 'store', rarity: 'legendary', set: 'gilt', preview: { k: 'theme', desk: ['#15130F', '#2A2210', '#3A2600'], os: { bg: '#15130F', ink: '#F4EFE4', accent: '#F7B928', bar: '#2A2210' } } },
  { id: 'fr.chalk', kind: 'frame', nameKey: 'e4.items.fr.chalk', price: P4('rare'), source: 'store', rarity: 'rare', preview: { k: 'frame', c: '#FBF6EA', c2: '#1B1A17', pat: 'dash' } },
  { id: 'fr.neon', kind: 'frame', nameKey: 'e4.items.fr.neon', price: P4('epic'), source: 'store', rarity: 'epic', set: 'night', preview: { k: 'frame', c: '#35C3E6', c2: '#0E1A20', pat: 'foil' } },
  { id: 'fr.gilt', kind: 'frame', nameKey: 'e4.items.fr.gilt', price: P4('legendary'), source: 'store', rarity: 'legendary', set: 'gilt', preview: { k: 'frame', c: '#F7B928', c2: '#3A2600', pat: 'foil' } },
  // ---- 4.0 the shell (CONCEPT4 §17/§18): lock faces, icon packs, OS themes, device skins. The same rarity table.
  // Lock faces: six house faces (std.lockface and lf.edition are free), the chapter face comes with the Chronicle phone.
  { id: 'lf.ticker', kind: 'lockface', nameKey: 'sh.items.lf.ticker', price: P4('common'), source: 'store', rarity: 'common', set: 'wire', preview: { k: 'lockface', bg: '#101518', ink: '#E9EEF0', accent: '#3FC1E0', motif: 'grid', clock: 'ticker', stamp: 'followers', tray: 'strip' } },
  { id: 'lf.split', kind: 'lockface', nameKey: 'sh.items.lf.split', price: P4('rare'), source: 'store', rarity: 'rare', preview: { k: 'lockface', bg: '#1B4D2E', ink: '#F3ECDD', accent: '#F2B632', c2: '#EDE4D0', motif: 'plain', clock: 'split', stamp: 'streak', tray: 'cards' } },
  { id: 'lf.floodlight', kind: 'lockface', nameKey: 'sh.items.lf.floodlight', price: P4('epic'), source: 'store', rarity: 'epic', set: 'night', preview: { k: 'lockface', bg: '#0E0D0B', ink: '#FFFFFF', accent: '#FFD86B', motif: 'halftone', clock: 'numerals', stamp: 'catch', tray: 'strip' } },
  { id: 'lf.gilt', kind: 'lockface', nameKey: 'sh.items.lf.gilt', price: P4('legendary'), source: 'store', rarity: 'legendary', set: 'gilt', preview: { k: 'lockface', bg: '#15120B', ink: '#F4E7C2', accent: '#D4A23A', motif: 'stripe', clock: 'stacked', stamp: 'handle', tray: 'paper' } },
  // Icon packs: every app icon changes together (default paper tiles, outline, editorial stamp, club crest, retro).
  { id: 'ip.outline', kind: 'iconpack', nameKey: 'sh.items.ip.outline', price: P4('common'), source: 'store', rarity: 'common', preview: { k: 'iconpack', style: 'outline', tile: '#14110D', ink: '#F3ECDD' } },
  { id: 'ip.stamp', kind: 'iconpack', nameKey: 'sh.items.ip.stamp', price: P4('rare'), source: 'store', rarity: 'rare', set: 'broadsheet', preview: { k: 'iconpack', style: 'stamp', tile: '#EDE4D0', ink: '#B3261E' } },
  { id: 'ip.retro', kind: 'iconpack', nameKey: 'sh.items.ip.retro', price: P4('rare'), source: 'store', rarity: 'rare', preview: { k: 'iconpack', style: 'retro', tile: '#F2B632', ink: '#1A1611' } },
  { id: 'ip.crest', kind: 'iconpack', nameKey: 'sh.items.ip.crest', price: P4('epic'), source: 'store', rarity: 'epic', preview: { k: 'iconpack', style: 'crest', tile: '#1B4D2E', ink: '#F3ECDD' } },
  // OS themes (tokens: surface, ink, accent, radius, type): the epic/legendary tier of the shell.
  { id: 'th.chalk', kind: 'theme', nameKey: 'sh.items.th.chalk', price: P4('rare'), source: 'store', rarity: 'rare', preview: { k: 'theme', desk: ['#17201A', '#1F2A22', '#2A372D'], os: { bg: '#17201A', ink: '#E8EDE4', accent: '#F2E15B', bar: '#1F2A22', radius: 10, face: 'cond' } } },
  { id: 'th.programme', kind: 'theme', nameKey: 'sh.items.th.programme', price: P4('epic'), source: 'store', rarity: 'epic', set: 'broadsheet', preview: { k: 'theme', desk: ['#F1E9D8', '#E6DCC6', '#D8CCB2'], paper: true, os: { bg: '#F1E9D8', ink: '#1A1714', accent: '#1F4FBF', bar: '#E6DCC6', radius: 18, face: 'editorial' } } },
  // Device skins (CONCEPT4 §18): the top cosmetic line. Perks are lib/phones.ts, coins only, never on a ranked board.
  { id: 'dv.terrace', kind: 'device', nameKey: 'sh.items.dv.terrace', price: P4('epic'), source: 'store', rarity: 'epic', preview: { k: 'device', bezel: '#12301E', frame: '#E8E1CF', radius: 40, notch: 'dot', boot: 'quick' } },
  { id: 'dv.haloone', kind: 'device', nameKey: 'sh.items.dv.haloone', price: P4('legendary'), source: 'store', rarity: 'legendary', set: 'deals', preview: { k: 'device', bezel: '#0B0B0D', frame: '#D9D2C3', radius: 50, notch: 'pill', boot: 'quick' } },
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

  // ---- 3.4 long tail: kinds that ride on features already built. Each arrives on a Monday (its `drop`), one or two
  // a week through the Rumour Mill '26, so the desk has something new to look at every week (docs/GROWTH.md).
  // headline fonts: the results front page's headline and the byline card's name (App.tsx data-hd)
  { id: 'hd.serif', kind: 'headline', nameKey: 'eco.items.hd.serif', price: { coins: 300, credits: 60 }, source: 'store', rarity: 'rare', set: 'broadsheet', drop: utc(2026, 9, 28), preview: { k: 'headline', face: 'serif' } },
  { id: 'hd.slab', kind: 'headline', nameKey: 'eco.items.hd.slab', price: { coins: 300, credits: 60 }, source: 'store', rarity: 'rare', set: 'redtop', drop: utc(2026, 10, 12), preview: { k: 'headline', face: 'slab', upper: true } },
  { id: 'hd.mono', kind: 'headline', nameKey: 'eco.items.hd.mono', price: { credits: 110 }, source: 'store', rarity: 'epic', set: 'wire', drop: utc(2026, 10, 26), preview: { k: 'headline', face: 'mono', upper: true, ink: '#35C3E6' } },
  { id: 'hd.stencil', kind: 'headline', nameKey: 'eco.items.hd.stencil', price: { credits: 130 }, source: 'store', rarity: 'epic', set: 'night', drop: utc(2026, 11, 9), preview: { k: 'headline', face: 'stencil', upper: true } },
  // desk lamps: the pool of light on Home's film stage
  { id: 'lp.amber', kind: 'lamp', nameKey: 'eco.items.lp.amber', price: { coins: 180 }, source: 'store', rarity: 'common', drop: utc(2026, 9, 28), preview: { k: 'lamp', glow: '#FFC46B', pool: '#3A2610', warmth: 'warm' } },
  { id: 'lp.dawn', kind: 'lamp', nameKey: 'eco.items.lp.dawn', price: { coins: 300, credits: 60 }, source: 'store', rarity: 'rare', drop: utc(2026, 10, 5), preview: { k: 'lamp', glow: '#F7B0C8', pool: '#2A1A2E', warmth: 'cool' } },
  { id: 'lp.neon', kind: 'lamp', nameKey: 'eco.items.lp.neon', price: { coins: 300, credits: 60 }, source: 'store', rarity: 'rare', set: 'night', drop: utc(2026, 10, 19), preview: { k: 'lamp', glow: '#35C3E6', pool: '#0E1A20', warmth: 'neon' } },
  { id: 'lp.gilt', kind: 'lamp', nameKey: 'eco.items.lp.gilt', price: { credits: 200 }, source: 'store', rarity: 'legendary', set: 'gilt', drop: utc(2026, 11, 23), preview: { k: 'lamp', glow: '#FFE08A', pool: '#3A2600', warmth: 'warm' } },
  // ring packs v2: one ring per source, so you know who is calling before the card lands
  { id: 'rp.newsroom', kind: 'ringpack', nameKey: 'eco.items.rp.newsroom', descKey: 'eco.items.rp.newsroomD', price: { coins: 350, credits: 70 }, source: 'store', rarity: 'rare', drop: utc(2026, 10, 5), preview: { k: 'ringpack', rings: { kitman: 'dd.whistle', barber: 'scene.barber', agent: 'scene.agent', spotter: 'scene.spotter', physio: 'scene.physio', leak: 'scene.leak' }, fallback: 'phone.ring' } },
  { id: 'rp.terrace', kind: 'ringpack', nameKey: 'eco.items.rp.terrace', descKey: 'eco.items.rp.terraceD', price: { coins: 300 }, source: 'store', rarity: 'rare', drop: utc(2026, 10, 26), preview: { k: 'ringpack', rings: { kitman: 'thock', barber: 'type', agent: 'coin', spotter: 'whoosh', physio: 'count', leak: 'stamp.done' }, fallback: 'phone.ring' } },
  { id: 'rp.stadium', kind: 'ringpack', nameKey: 'eco.items.rp.stadium', descKey: 'eco.items.rp.stadiumD', price: { credits: 120 }, source: 'store', rarity: 'epic', drop: utc(2026, 11, 2), preview: { k: 'ringpack', rings: { kitman: 'dd.whistle', barber: 'sparkle', agent: 'fanfare', spotter: 'dd.siren', physio: 'dd.heart', leak: 'typewriter' }, fallback: 'dd.whistle' } },
  // feed skins: the rows of the Feed and Home's "For you"
  { id: 'fs.memo', kind: 'feedskin', nameKey: 'eco.items.fs.memo', price: { coins: 180 }, source: 'store', rarity: 'common', drop: utc(2026, 9, 28), preview: { k: 'feedskin', style: 'memo', rule: '#F7B928', bg: '#FFF7D6', ink: '#3A2600' } },
  { id: 'fs.ticker', kind: 'feedskin', nameKey: 'eco.items.fs.ticker', price: { coins: 300, credits: 60 }, source: 'store', rarity: 'rare', set: 'wire', drop: utc(2026, 9, 28), preview: { k: 'feedskin', style: 'ticker', rule: '#35C3E6', bg: '#0E1A20', ink: '#E6F7FC' } },
  { id: 'fs.redtop', kind: 'feedskin', nameKey: 'eco.items.fs.redtop', price: { coins: 300, credits: 60 }, source: 'store', rarity: 'rare', set: 'redtop', drop: utc(2026, 10, 12), preview: { k: 'feedskin', style: 'redtop', rule: '#C8102E', bg: '#FFFFFF', ink: '#15130F' } },
  { id: 'fs.night', kind: 'feedskin', nameKey: 'eco.items.fs.night', price: { credits: 110 }, source: 'store', rarity: 'epic', set: 'night', drop: utc(2026, 11, 16), preview: { k: 'feedskin', style: 'night', rule: '#F7B928', bg: '#15130F', ink: '#F4EFE4' } },
  // front pages: the newsroom's shared style (the founder equips it; the press box lane reads newsroomStyle())
  { id: 'fp.broadsheet', kind: 'frontpage', nameKey: 'eco.items.fp.broadsheet', price: { coins: 350, credits: 70 }, source: 'store', rarity: 'rare', set: 'broadsheet', drop: utc(2026, 10, 19), preview: { k: 'frontpage', cols: 3, hed: 'serif', kicker: '#1B1A17', rule: 'single', paper: '#FBF6EA', ink: '#1B1A17' } },
  { id: 'fp.redtop', kind: 'frontpage', nameKey: 'eco.items.fp.redtop', price: { coins: 350, credits: 70 }, source: 'store', rarity: 'rare', set: 'redtop', drop: utc(2026, 10, 19), preview: { k: 'frontpage', cols: 1, hed: 'wood', kicker: '#C8102E', rule: 'thick', paper: '#FFFFFF', ink: '#15130F' } },
  { id: 'fp.wire', kind: 'frontpage', nameKey: 'eco.items.fp.wire', price: { credits: 110 }, source: 'store', rarity: 'epic', set: 'wire', drop: utc(2026, 11, 2), preview: { k: 'frontpage', cols: 2, hed: 'mono', kicker: '#35C3E6', rule: 'single', paper: '#0E1A20', ink: '#E6F7FC' } },
  { id: 'fp.gilt', kind: 'frontpage', nameKey: 'eco.items.fp.gilt', price: { credits: 280 }, source: 'store', rarity: 'legendary', set: 'gilt', drop: utc(2026, 12, 7), preview: { k: 'frontpage', cols: 2, hed: 'serif', kicker: '#B8830B', rule: 'double', paper: '#F4EFE4', ink: '#3A2600' } },
  // signature catchphrases (GOTY §12): lines you buy with credits. They fire on a Confirmed call that lands: the stamp,
  // the sound, the share card, the film title. Words only: a line never changes a board, a source or a score.
  { id: 'cp.shades', kind: 'catchphrase', nameKey: 'cp.sig.shades', price: { credits: 60 }, source: 'store', rarity: 'rare', set: 'lines', drop: utc(2026, 9, 28), preview: { k: 'catchphrase', key: 'cp.sig.shades', tone: 'cool', c: '#35C3E6' } },
  { id: 'cp.pens', kind: 'catchphrase', nameKey: 'cp.sig.pens', price: { credits: 60 }, source: 'store', rarity: 'rare', set: 'lines', drop: utc(2026, 9, 28), preview: { k: 'catchphrase', key: 'cp.sig.pens', tone: 'dry', c: '#15130F' } },
  { id: 'cp.boots', kind: 'catchphrase', nameKey: 'cp.sig.boots', price: { credits: 80 }, source: 'store', rarity: 'rare', set: 'lines', drop: utc(2026, 10, 5), preview: { k: 'catchphrase', key: 'cp.sig.boots', tone: 'loud', c: '#C8102E' } },
  { id: 'cp.photos', kind: 'catchphrase', nameKey: 'cp.sig.photos', price: { credits: 100 }, source: 'store', rarity: 'epic', set: 'lines', drop: utc(2026, 10, 19), preview: { k: 'catchphrase', key: 'cp.sig.photos', tone: 'loud', c: '#FF5A36' } },
  { id: 'cp.shut', kind: 'catchphrase', nameKey: 'cp.sig.shut', price: { credits: 100 }, source: 'store', rarity: 'epic', set: 'lines', drop: utc(2026, 11, 2), preview: { k: 'catchphrase', key: 'cp.sig.shut', tone: 'cool', c: '#7147D6' } },
  { id: 'cp.kettle', kind: 'catchphrase', nameKey: 'cp.sig.kettle', price: { credits: 150 }, source: 'store', rarity: 'legendary', set: 'lines', drop: utc(2026, 11, 30), preview: { k: 'catchphrase', key: 'cp.sig.kettle', tone: 'gold', c: '#B8830B' } },
];

// ---------------------------------------------------------------- earned-only items (never purchasable, never gifted)
// Story chapter completions, the Tier One rank, long streaks, rivalry trophies, a referred trio, Deadline Day Live.
// lib/earned.ts evaluates `earn` against the save and grants into save.owned; the collection book shows how.
const EARNED: Item[] = [
  // 4.0: the starter bundle's wallpaper and the brand deals' looks (CONCEPT4 §4: a big deal pays a branded look).
  // Deal looks are granted by lib/deals.ts through grantEarned() when the deal pays; `via: 'event'` keeps them unpriced.
  { id: 'wp.starter', kind: 'wallpaper', nameKey: 'e4.items.wp.starter', price: {}, source: 'earned', rarity: 'rare', set: 'starter', earn: { via: 'event', ref: 'starter' }, preview: { k: 'wallpaper', bg: '#1B1A17', ink: '#F4EFE4', accent: '#FF5A36', motif: 'grain' } },
  { id: 'dl.volt', kind: 'dropcard', nameKey: 'e4.items.dl.volt', price: {}, source: 'earned', rarity: 'rare', set: 'deals', earn: { via: 'event', ref: 'deal-volt' }, preview: { k: 'dropcard', bg: '#0B0B10', ink: '#FFFFFF', accent: '#D6FF3A', style: 'brand', mark: 'VOLT' } },
  { id: 'dl.oasis', kind: 'wallpaper', nameKey: 'e4.items.dl.oasis', price: {}, source: 'earned', rarity: 'rare', set: 'deals', earn: { via: 'event', ref: 'deal-oasis' }, preview: { k: 'wallpaper', bg: '#0A2A33', ink: '#E6F7FC', accent: '#4FD1E0', motif: 'stripe' } },
  { id: 'dl.kickoff', kind: 'frame', nameKey: 'e4.items.dl.kickoff', price: {}, source: 'earned', rarity: 'rare', set: 'deals', earn: { via: 'event', ref: 'deal-kickoff' }, preview: { k: 'frame', c: '#2FBF71', c2: '#04200F', pat: 'tape' } },
  { id: 'dl.tempo', kind: 'wallpaper', nameKey: 'e4.items.dl.tempo', price: {}, source: 'earned', rarity: 'epic', set: 'deals', earn: { via: 'event', ref: 'deal-tempo' }, preview: { k: 'wallpaper', bg: '#141018', ink: '#F4EFE4', accent: '#FF4FA3', motif: 'halftone' } },
  { id: 'dl.nine', kind: 'dropcard', nameKey: 'e4.items.dl.nine', price: {}, source: 'earned', rarity: 'epic', set: 'deals', earn: { via: 'event', ref: 'deal-nine' }, preview: { k: 'dropcard', bg: '#0E2231', ink: '#DDEFF8', accent: '#FFD35C', style: 'brand', mark: 'NINE' } },
  { id: 'dl.halo', kind: 'theme', nameKey: 'e4.items.dl.halo', price: {}, source: 'earned', rarity: 'legendary', set: 'deals', earn: { via: 'event', ref: 'deal-halo' }, preview: { k: 'theme', desk: ['#101014', '#1A1A22', '#26263A'], os: { bg: '#101014', ink: '#FFFFFF', accent: '#9AD6F5', bar: '#1A1A22' } } },
  // 4.0 the shell: the second free lock face (your first day), the widgets that come with looks, and The Comeback's
  // phones (CONCEPT4 §18): each chapter hands you a device; the burner is Priya's second SIM in Chapter 4.
  { id: 'lf.edition', kind: 'lockface', nameKey: 'sh.items.lf.edition', price: {}, source: 'earned', rarity: 'common', earn: { via: 'streak', n: 1 }, preview: { k: 'lockface', bg: '#EDE4D0', ink: '#1A1611', accent: '#B3261E', motif: 'grain', clock: 'stacked', stamp: 'catch', tray: 'paper' } },
  { id: 'lf.chronicle', kind: 'lockface', nameKey: 'sh.items.lf.chronicle', price: {}, source: 'earned', rarity: 'legendary', set: 'story', earn: { via: 'story', n: 5 }, preview: { k: 'lockface', bg: '#DCD6C8', ink: '#111111', accent: '#8B1A10', motif: 'plain', clock: 'stacked', stamp: 'handle', tray: 'paper' } },
  { id: 'wg.boss', kind: 'widget', nameKey: 'sh.items.wg.boss', price: {}, source: 'earned', rarity: 'rare', set: 'story', earn: { via: 'story', n: 1 }, preview: { k: 'widget', w: 'boss' } },
  { id: 'wg.files', kind: 'widget', nameKey: 'sh.items.wg.files', price: {}, source: 'earned', rarity: 'rare', set: 'rank', earn: { via: 'rank', ref: 'rising' }, preview: { k: 'widget', w: 'files' } },
  { id: 'dv.brick', kind: 'device', nameKey: 'sh.items.dv.brick', price: {}, source: 'earned', rarity: 'common', set: 'story', earn: { via: 'story', n: 1 }, preview: { k: 'device', bezel: '#2B2925', frame: '#4A453C', radius: 28, notch: 'bar', crack: true, boot: 'beat' } },
  { id: 'dv.post', kind: 'device', nameKey: 'sh.items.dv.post', price: {}, source: 'earned', rarity: 'rare', set: 'story', earn: { via: 'story', n: 2 }, preview: { k: 'device', bezel: '#22252A', frame: '#5C6370', radius: 36, notch: 'dot', boot: 'quick' } },
  { id: 'dv.halo', kind: 'device', nameKey: 'sh.items.dv.halo', price: {}, source: 'earned', rarity: 'epic', set: 'story', earn: { via: 'story', n: 3 }, preview: { k: 'device', bezel: '#0E0E10', frame: '#BFC3C9', radius: 48, notch: 'pill', boot: 'quick' } },
  { id: 'dv.burner', kind: 'device', nameKey: 'sh.items.dv.burner', price: {}, source: 'earned', rarity: 'rare', set: 'story', earn: { via: 'story', n: 4 }, preview: { k: 'device', bezel: '#1A1A1A', frame: '#2E2E2E', radius: 18, notch: 'none', boot: 'beat' } },
  { id: 'dv.chronicle', kind: 'device', nameKey: 'sh.items.dv.chronicle', price: {}, source: 'earned', rarity: 'legendary', set: 'story', earn: { via: 'story', n: 5 }, preview: { k: 'device', bezel: '#15130F', frame: '#8B7A55', radius: 46, notch: 'pill', boot: 'quick' } },
  { id: 'st.ch1', kind: 'flair', nameKey: 'eco.items.st.ch1', price: {}, source: 'earned', rarity: 'rare', set: 'story', earn: { via: 'story', n: 1 }, preview: { k: 'flair', g: '¶', c: '#2657C9' } },
  { id: 'st.ch2', kind: 'ink', nameKey: 'eco.items.st.ch2', price: {}, source: 'earned', rarity: 'rare', set: 'story', earn: { via: 'story', n: 2 }, preview: { k: 'ink', c: '#5B3E96' } },
  { id: 'st.ch3', kind: 'frame', nameKey: 'eco.items.st.ch3', price: {}, source: 'earned', rarity: 'epic', set: 'story', earn: { via: 'story', n: 3 }, preview: { k: 'frame', c: '#1B1A17', c2: '#FBF6EA', pat: 'double' } },
  { id: 'st.ch4', kind: 'poster', nameKey: 'eco.items.st.ch4', price: {}, source: 'earned', rarity: 'epic', set: 'story', earn: { via: 'story', n: 4 }, preview: { k: 'poster', c: '#5B3E96', c2: '#F4EFE4', style: 'tape' } },
  { id: 'st.ch5', kind: 'byline', nameKey: 'eco.items.st.ch5', price: {}, source: 'earned', rarity: 'legendary', set: 'story', earn: { via: 'story', n: 5 }, preview: { k: 'byline', bg: '#1B1A17', ink: '#FBF6EA', accent: '#D9913A', rule: 'double', face: 'display', tex: 'foil' } },
  { id: 'rk.chief', kind: 'presspass', nameKey: 'eco.items.rk.chief', price: {}, source: 'earned', rarity: 'epic', set: 'rank', earn: { via: 'rank', ref: 'insider' }, preview: { k: 'presspass', c1: '#3A2600', c2: '#15130F', ink: '#FFD35C', stripe: '#F7B928' } },
  { id: 'rk.tierone', kind: 'byline', nameKey: 'eco.items.rk.tierone', price: {}, source: 'earned', rarity: 'legendary', set: 'rank', earn: { via: 'rank', ref: 'tierone' }, preview: { k: 'byline', bg: '#15130F', ink: '#F4EFE4', accent: '#FF5A36', rule: 'thick', face: 'cond', tex: 'halftone' } },
  { id: 'sk.30', kind: 'ink', nameKey: 'eco.items.sk.30', price: {}, source: 'earned', rarity: 'rare', set: 'streak', earn: { via: 'streak', n: 30 }, preview: { k: 'ink', c: '#FF5A36' } },
  { id: 'sk.100', kind: 'presspass', nameKey: 'eco.items.sk.100', price: {}, source: 'earned', rarity: 'legendary', set: 'streak', earn: { via: 'streak', n: 100 }, preview: { k: 'presspass', c1: '#FF5A36', c2: '#C9381A', ink: '#FFF3E0', stripe: '#FFD35C' } },
  { id: 'rv.tabloid', kind: 'flair', nameKey: 'eco.items.rv.tabloid', price: {}, source: 'earned', rarity: 'epic', set: 'rivalry', earn: { via: 'rivalry', ref: 'tabloid' }, preview: { k: 'flair', g: '♛', c: '#C8102E' } },
  { id: 'rv.itk', kind: 'flair', nameKey: 'eco.items.rv.itk', price: {}, source: 'earned', rarity: 'epic', set: 'rivalry', earn: { via: 'rivalry', ref: 'itk' }, preview: { k: 'flair', g: '♛', c: '#35C3E6' } },
  { id: 'rv.insider', kind: 'flair', nameKey: 'eco.items.rv.insider', price: {}, source: 'earned', rarity: 'epic', set: 'rivalry', earn: { via: 'rivalry', ref: 'insider' }, preview: { k: 'flair', g: '♛', c: '#7147D6' } },
  { id: 'rf.3', kind: 'lamp', nameKey: 'eco.items.rf.3', price: {}, source: 'earned', rarity: 'rare', set: 'referral', earn: { via: 'referral', n: 3 }, preview: { k: 'lamp', glow: '#7FCB6A', pool: '#15260F', warmth: 'cool' } },
  { id: 'dd.2027-02-02', kind: 'masthead', nameKey: 'eco.items.dd.winter', nameVars: { y: '’27' }, price: {}, source: 'earned', rarity: 'epic', set: 'ddlive', earn: { via: 'ddlive', ref: '2027-02-02' }, preview: { k: 'masthead', bg: '#0E2231', ink: '#FFD35C', face: 'cond', rule: 'thick', orn: '⏱' } },
  { id: 'dd.2027-09-01', kind: 'poster', nameKey: 'eco.items.dd.summer', nameVars: { y: '’27' }, price: {}, source: 'earned', rarity: 'epic', set: 'ddlive', earn: { via: 'ddlive', ref: '2027-09-01' }, preview: { k: 'poster', c: '#FFD35C', c2: '#2A1206', style: 'neon' } },
  // house catchphrases you earn by playing (GOTY §12): rank, streaks, story chapters. `cp.custom` is the line you write
  // yourself once you reach Chief (lib/catchphrase.ts setCustomCatchphrase; server-checked by v4 catchphrase.set).
  { id: 'cp.pen', kind: 'catchphrase', nameKey: 'cp.house.pen', price: {}, source: 'earned', rarity: 'common', set: 'lines', earn: { via: 'rank', ref: 'rising' }, preview: { k: 'catchphrase', key: 'cp.house.pen', tone: 'dry', c: '#15130F' } },
  { id: 'cp.dusted', kind: 'catchphrase', nameKey: 'cp.house.dusted', price: {}, source: 'earned', rarity: 'rare', set: 'lines', earn: { via: 'rank', ref: 'itk' }, preview: { k: 'catchphrase', key: 'cp.house.dusted', tone: 'loud', c: '#C9381A' } },
  { id: 'cp.announce', kind: 'catchphrase', nameKey: 'cp.house.announce', price: {}, source: 'earned', rarity: 'epic', set: 'lines', earn: { via: 'rank', ref: 'insider' }, preview: { k: 'catchphrase', key: 'cp.house.announce', tone: 'loud', c: '#FF5A36' } },
  { id: 'cp.sealed', kind: 'catchphrase', nameKey: 'cp.house.sealed', price: {}, source: 'earned', rarity: 'legendary', set: 'lines', earn: { via: 'rank', ref: 'tierone' }, preview: { k: 'catchphrase', key: 'cp.house.sealed', tone: 'gold', c: '#F7B928' } },
  { id: 'cp.medical', kind: 'catchphrase', nameKey: 'cp.house.medical', price: {}, source: 'earned', rarity: 'common', set: 'lines', earn: { via: 'streak', n: 7 }, preview: { k: 'catchphrase', key: 'cp.house.medical', tone: 'cool', c: '#2FBF71' } },
  { id: 'cp.bags', kind: 'catchphrase', nameKey: 'cp.house.bags', price: {}, source: 'earned', rarity: 'rare', set: 'lines', earn: { via: 'streak', n: 30 }, preview: { k: 'catchphrase', key: 'cp.house.bags', tone: 'dry', c: '#5B3E96' } },
  { id: 'cp.front', kind: 'catchphrase', nameKey: 'cp.house.front', price: {}, source: 'earned', rarity: 'legendary', set: 'lines', earn: { via: 'streak', n: 100 }, preview: { k: 'catchphrase', key: 'cp.house.front', tone: 'gold', c: '#FFD35C' } },
  { id: 'cp.shirt', kind: 'catchphrase', nameKey: 'cp.house.shirt', price: {}, source: 'earned', rarity: 'common', set: 'lines', earn: { via: 'story', n: 1 }, preview: { k: 'catchphrase', key: 'cp.house.shirt', tone: 'loud', c: '#2657C9' } },
  { id: 'cp.inkdry', kind: 'catchphrase', nameKey: 'cp.house.inkdry', price: {}, source: 'earned', rarity: 'rare', set: 'lines', earn: { via: 'story', n: 3 }, preview: { k: 'catchphrase', key: 'cp.house.inkdry', tone: 'dry', c: '#1B1A17' } },
  { id: 'cp.wheels', kind: 'catchphrase', nameKey: 'cp.house.wheels', price: {}, source: 'earned', rarity: 'epic', set: 'lines', earn: { via: 'story', n: 5 }, preview: { k: 'catchphrase', key: 'cp.house.wheels', tone: 'cool', c: '#35C3E6' } },
  { id: 'cp.custom', kind: 'catchphrase', nameKey: 'cp.custom.name', descKey: 'cp.custom.desc', price: {}, source: 'earned', rarity: 'legendary', set: 'lines', earn: { via: 'rank', ref: 'insider' }, preview: { k: 'catchphrase', key: 'cp.custom.name', tone: 'gold', c: '#F7B928' } },
];

// ---------------------------------------------------------------- season-limited sets (generated per season id)
// Per season: a byline design, a masthead, a poster frame, a headline font, a lamp and a feed skin, sold for credits
// only inside the season window. Ids carry the year, so "winter-2027.by" is gone for good on 3 Feb 2027 (unless the
// vault brings it back for a week); next winter's set is a different item. This is the template every future season
// fills: add a SeasonKey block and the four years of ids exist at once.
type Slot = Omit<Item, 'id' | 'nameKey' | 'nameVars' | 'window' | 'set' | 'source'>;
export const SEASON_SLOTS = ['by', 'mh', 'po', 'hd', 'lp', 'fs', 'cp'] as const;
export type SeasonSlot = typeof SEASON_SLOTS[number];
const SEASON_NEW: Record<SeasonKey, Record<SeasonSlot, Slot>> = {
  rumour: {
    by: { kind: 'byline', price: { credits: 180 }, rarity: 'epic', preview: { k: 'byline', bg: '#2B1C11', ink: '#F2E3C9', accent: '#D9913A', rule: 'double', face: 'display', tex: 'halftone' } },
    mh: { kind: 'masthead', price: { credits: 160 }, rarity: 'epic', preview: { k: 'masthead', bg: '#F2E3C9', ink: '#3A2310', face: 'display', rule: 'double', orn: '❝' } },
    po: { kind: 'poster', price: { credits: 150 }, rarity: 'epic', preview: { k: 'poster', c: '#D9913A', c2: '#3A2310', style: 'gilt' } },
    hd: { kind: 'headline', price: { credits: 120 }, rarity: 'epic', preview: { k: 'headline', face: 'serif', ink: '#D9913A' } },
    lp: { kind: 'lamp', price: { credits: 120 }, rarity: 'epic', preview: { k: 'lamp', glow: '#D9913A', pool: '#2B1C11', warmth: 'warm' } },
    fs: { kind: 'feedskin', price: { credits: 120 }, rarity: 'epic', preview: { k: 'feedskin', style: 'memo', rule: '#D9913A', bg: '#F2E3C9', ink: '#3A2310' } },
    cp: { kind: 'catchphrase', price: { credits: 90 }, rarity: 'epic', preview: { k: 'catchphrase', key: 'cp.season.rumour', tone: 'cool', c: '#D9913A' } },
  },
  winter: {
    by: { kind: 'byline', price: { credits: 180 }, rarity: 'epic', preview: { k: 'byline', bg: '#0E2231', ink: '#DDEFF8', accent: '#5BB8E8', rule: 'single', face: 'cond', tex: 'halftone' } },
    mh: { kind: 'masthead', price: { credits: 160 }, rarity: 'epic', preview: { k: 'masthead', bg: '#DDEFF8', ink: '#1B3F66', face: 'display', rule: 'thick', orn: '❄' } },
    po: { kind: 'poster', price: { credits: 150 }, rarity: 'epic', preview: { k: 'poster', c: '#5BB8E8', c2: '#0E2231', style: 'neon' } },
    hd: { kind: 'headline', price: { credits: 120 }, rarity: 'epic', preview: { k: 'headline', face: 'stencil', upper: true, ink: '#5BB8E8' } },
    lp: { kind: 'lamp', price: { credits: 120 }, rarity: 'epic', preview: { k: 'lamp', glow: '#9AD6F5', pool: '#0E2231', warmth: 'cool' } },
    fs: { kind: 'feedskin', price: { credits: 120 }, rarity: 'epic', preview: { k: 'feedskin', style: 'ticker', rule: '#5BB8E8', bg: '#0E2231', ink: '#DDEFF8' } },
    cp: { kind: 'catchphrase', price: { credits: 90 }, rarity: 'epic', preview: { k: 'catchphrase', key: 'cp.season.winter', tone: 'loud', c: '#5BB8E8' } },
  },
  spring: {
    by: { kind: 'byline', price: { credits: 180 }, rarity: 'epic', preview: { k: 'byline', bg: '#F6FBF1', ink: '#15260F', accent: '#C2477A', rule: 'double', face: 'display' } },
    mh: { kind: 'masthead', price: { credits: 160 }, rarity: 'epic', preview: { k: 'masthead', bg: '#15260F', ink: '#F2A7C3', face: 'display', rule: 'single', orn: '✿' } },
    po: { kind: 'poster', price: { credits: 150 }, rarity: 'epic', preview: { k: 'poster', c: '#7FCB6A', c2: '#F2A7C3', style: 'ticket' } },
    hd: { kind: 'headline', price: { credits: 120 }, rarity: 'epic', preview: { k: 'headline', face: 'slab', ink: '#C2477A' } },
    lp: { kind: 'lamp', price: { credits: 120 }, rarity: 'epic', preview: { k: 'lamp', glow: '#F2A7C3', pool: '#15260F', warmth: 'cool' } },
    fs: { kind: 'feedskin', price: { credits: 120 }, rarity: 'epic', preview: { k: 'feedskin', style: 'memo', rule: '#7FCB6A', bg: '#F6FBF1', ink: '#15260F' } },
    cp: { kind: 'catchphrase', price: { credits: 90 }, rarity: 'epic', preview: { k: 'catchphrase', key: 'cp.season.spring', tone: 'dry', c: '#C2477A' } },
  },
  summer: {
    by: { kind: 'byline', price: { credits: 180 }, rarity: 'epic', preview: { k: 'byline', bg: '#FFF3E0', ink: '#2A1206', accent: '#E0552A', rule: 'thick', face: 'cond' } },
    mh: { kind: 'masthead', price: { credits: 160 }, rarity: 'epic', preview: { k: 'masthead', bg: '#E0552A', ink: '#FFF3E0', face: 'cond', rule: 'thick', orn: '☀' } },
    po: { kind: 'poster', price: { credits: 150 }, rarity: 'epic', preview: { k: 'poster', c: '#FFD35C', c2: '#E0552A', style: 'tape' } },
    hd: { kind: 'headline', price: { credits: 120 }, rarity: 'epic', preview: { k: 'headline', face: 'wood', upper: true, ink: '#E0552A' } },
    lp: { kind: 'lamp', price: { credits: 120 }, rarity: 'epic', preview: { k: 'lamp', glow: '#FFB02E', pool: '#2A1206', warmth: 'warm' } },
    fs: { kind: 'feedskin', price: { credits: 120 }, rarity: 'epic', preview: { k: 'feedskin', style: 'redtop', rule: '#E0552A', bg: '#FFF3E0', ink: '#2A1206' } },
    cp: { kind: 'catchphrase', price: { credits: 90 }, rarity: 'epic', preview: { k: 'catchphrase', key: 'cp.season.summer', tone: 'gold', c: '#E0552A' } },
  },
};
const SEASON_RE = /^((rumour|winter|spring|summer)-(\d{4}))\.(by|mh|po|hd|lp|fs|cp)$/;
const GOLD_RE = /^gold\.((rumour|winter|spring|summer)-(\d{4}))$/;
function seasonNew(id: string): Item | null {
  const m = SEASON_RE.exec(id); if (!m) return null;
  const def = seasonById(m[1]); if (!def) return null;
  const slot = SEASON_NEW[m[2] as SeasonKey][m[4] as SeasonSlot];
  const vault = VAULT.filter((v) => v.id === id).map((v) => ({ from: v.from, to: v.to }));
  return { ...slot, id, source: 'store', set: m[1], window: { from: def.start, to: def.end }, drop: def.start, ...(vault.length ? { vault } : {}), ...(m[4] === 'cp' ? { nameKey: 'cp.season.' + m[2] } : { nameKey: 'eco.items.season.' + m[2] + '.' + m[4], nameVars: { y: '’' + m[3].slice(2) } }) };
}
function goldItem(id: string): Item | null {
  const m = GOLD_RE.exec(id); if (!m) return null;
  const def = seasonById(m[1]); if (!def) return null;
  return { id, kind: 'gold', nameKey: 'eco.items.gold', nameVars: { s: def.nameKey, y: m[3] }, descKey: 'eco.items.goldD', price: { credits: GOLD_CREDITS }, source: 'store', rarity: 'epic', set: m[1], window: { from: def.start, to: def.end }, drop: def.start, preview: { k: 'gold', season: m[1] } };
}

// ---------------------------------------------------------------- the vault: "back for one week"
// A season-limited item can return for exactly one ISO week, at its usual price, once a season at most, never in the
// season it belongs to. The list is data (remote config `vault[]` replaces it); honest by construction: the item, its
// price and its dates are all shown, and `validateCatalog()` refuses a vault window longer than seven days.
export interface VaultReturn { id: string; from: number; to: number }
export const VAULT_MAX_DAYS = 7;
let VAULT: VaultReturn[] = [
  { id: 'summer-2026.mh', from: utc(2026, 9, 28), to: utc(2026, 10, 5) },
  { id: 'spring-2026.by', from: utc(2026, 10, 12), to: utc(2026, 10, 19) },
  { id: 'winter-2026.po', from: utc(2026, 11, 16), to: utc(2026, 11, 23) },
  { id: 'summer-2026.by', from: utc(2027, 3, 1), to: utc(2027, 3, 8) },
];
export const vaultList = (): VaultReturn[] => VAULT;

// ---------------------------------------------------------------- legacy cosmetics (lib/season.ts), same ids
const RARITY_LEGACY = (c: Cosmetic): Rarity => {
  if (c.rarity) return c.rarity;
  if (c.price === 'track') return 'epic';
  if (c.price === 'gold') return /\.g8$/.test(c.id) ? 'legendary' : 'rare';
  if (c.price === 'event') return 'rare';
  return typeof c.price === 'number' && c.price >= 300 ? 'rare' : 'common';
};
const previewLegacy = (c: Cosmetic): Preview => {
  switch (c.kind) {
    case 'frame': return { k: 'frame', c: c.c || '#15130F', c2: c.c2 || '#F4EFE4', pat: c.pat || 'solid' };
    case 'ink': return { k: 'ink', c: c.c || '#C9381A' };
    case 'theme': return { k: 'theme', desk: c.desk, paper: c.paper, os: c.os };
    case 'ringtone': return { k: 'ringtone', sfx: c.sfx || 'phone.ring' };
    case 'flair': return { k: 'flair', g: c.g || '', c: c.c || '#15130F' };
    case 'wallpaper': return { k: 'wallpaper', bg: c.bg || '#15130F', ink: c.ink || '#F4EFE4', accent: c.accent || '#FF5A36', motif: c.motif || 'grain' };
    case 'dropcard': return { k: 'dropcard', bg: c.bg || '#F4EFE4', ink: c.ink || '#15130F', accent: c.accent || '#C9381A', style: c.style || 'bold' };
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
    ...(def ? { drop: def.start } : {}),
    preview: previewLegacy(c),
  };
}
/** The season.ts Cosmetic behind a legacy item (for CosSwatch, frameCSS, ringtoneSfx). Null for new kinds. */
export const legacy = (it: Item | string): Cosmetic | null => seasonCosmetic(typeof it === 'string' ? it : it.id);

// ---------------------------------------------------------------- lookups
export function item(id: string): Item | null {
  if (isStandard(id)) { const k = id.slice(4); return isKind(k) ? STD[k] : null; }
  const n = NEW.find((x) => x.id === id) || EARNED.find((x) => x.id === id); if (n) return n;
  return seasonNew(id) || goldItem(id) || (() => { const c = seasonCosmetic(id); return c ? fromLegacy(c) : null; })();
}
export const earnedItems = (): Item[] => EARNED.slice();
/** Every sale window of an item: its season window, then any vault returns. Empty = evergreen. */
export const windowsOf = (it: Item): SaleWindow[] => [...(it.window ? [it.window] : []), ...(it.vault || [])];
/** The sale window open at `ms`, or null. Evergreen items have none (and are always "in window"). */
export const activeWindow = (it: Item, ms = Date.now()): SaleWindow | null => windowsOf(it).find((w) => ms >= w.from && ms < w.to) || null;
export const inWindow = (it: Item, ms = Date.now()) => windowsOf(it).length === 0 || !!activeWindow(it, ms);
/** True while a vault return (not the original season window) is the open window. */
export const inVault = (it: Item, ms = Date.now()) => { const w = activeWindow(it, ms); return !!w && !!it.vault && it.vault.includes(w); };
export const dropped = (it: Item, ms = Date.now()) => it.drop == null || it.drop <= ms;
export const onSale = (it: Item, ms = Date.now()) => it.source === 'store' && dropped(it, ms) && inWindow(it, ms) && (it.price.coins != null || it.price.credits != null);
export const isEarnedOnly = (it: Item) => it.source === 'earned';
/** This season's limited set: the six credits items plus Gold and the season lane's track/Gold items. */
export function seasonSet(sid = seasonAt().id): Item[] {
  return [...SEASON_SLOTS.map((k) => seasonNew(sid + '.' + k)!), goldItem('gold.' + sid)!, ...seasonItems(sid).map(fromLegacy)].filter(Boolean);
}
/** Everything with a price today (evergreen + this season's set + vault returns), catalog order. */
export function storeCatalog(ms = Date.now()): Item[] {
  const vault = VAULT.map((v) => item(v.id)).filter((x): x is Item => !!x);
  const seen = new Set<string>();
  return [...seasonStore().map(fromLegacy), ...NEW, ...seasonSet(seasonAt(ms).id), ...vault].filter((x) => onSale(x, ms) && !seen.has(x.id) && seen.add(x.id));
}
/** Every item that can exist right now (for a tab): the standard look, the store, this season's set, the earned ones. */
export function itemsOf(kind: Kind, ms = Date.now()): Item[] {
  const sid = seasonAt(ms).id;
  const vault = VAULT.filter((v) => v.to > ms - 90 * DAY).map((v) => item(v.id)).filter((x): x is Item => !!x);
  const all = [STD[kind], ...seasonStore().map(fromLegacy), ...NEW.filter((x) => dropped(x, ms)), ...seasonSet(sid), ...vault, ...EARNED, ...seasonCosmeticsAll()];
  const seen = new Set<string>();
  return all.filter((x) => x.kind === kind && !seen.has(x.id) && seen.add(x.id));
}
// The weekly-event rewards and the current season's track items (earned, never sold) so an owner can equip them.
function seasonCosmeticsAll(): Item[] {
  return ['ev.rival', 'ev.medical', 'ev.frenzy', 'ev.barber', 'ev.local'].map((id) => seasonCosmetic(id)).filter((c): c is Cosmetic => !!c).map(fromLegacy);
}
/** Every earned-only id a season track or the weekly events can hand out (owned ids resolve through item()). */
export const isTrackItem = (id: string) => /^(rumour|winter|spring|summer)-\d{4}\.(f[1-6]|g(?:[1-9]|10))$/.test(id);
/** 4.0 Lens › Looks: everything the v4 shop lists for a kind (standard + stock + this season + earned), one of KINDS4. */
export const looks4 = (kind: Kind4, ms = Date.now()): Item[] => itemsOf(kind, ms);
/** 4.0: what is on sale today across the six v4 kinds (the rails and the featured rotation read storeCatalog). */
export const store4 = (ms = Date.now()): Item[] => storeCatalog(ms).filter((x) => isKind4(x.kind));
/** The coin or credit price of a look: the rarity table for v4 stock, the item's own price otherwise. */
export const priceOf = (it: Item): Price => (isKind4(it.kind) && it.source === 'store' && !it.window ? lookPrice(it.rarity) : it.price);
export const RARITY_PRICES = PRICES.look;
/** Items that are part of a named set (evergreen families, seasons, earned families). */
export const setOf = (set: string, ms = Date.now()): Item[] => KINDS.flatMap((k) => itemsOf(k, ms)).filter((x) => x.set === set);

// ---------------------------------------------------------------- rails: "new this week", "last chance", the vault
// Drops are data: an item's `drop` date (remote config `drops` can move it) puts it on "new this week" for RAILS.newDays;
// "last chance" lists what is on sale inside a window that closes within RAILS.lastDays. Nothing is invented: every
// date shown is the item's real window, and an evergreen item never appears on "last chance".
export const RAILS = { newDays: 7, lastDays: 7, max: 8 };
export function newThisWeek(ms = Date.now()): Item[] {
  return storeCatalog(ms).filter((x) => (x.drop != null && x.drop <= ms && ms - x.drop < RAILS.newDays * DAY && !inVault(x, ms))).sort((a, b) => (b.drop || 0) - (a.drop || 0)).slice(0, RAILS.max);
}
export function lastChance(ms = Date.now()): { item: Item; ends: number; vault: boolean }[] {
  return storeCatalog(ms).map((x) => ({ item: x, w: activeWindow(x, ms) })).filter((x): x is { item: Item; w: SaleWindow } => !!x.w && x.w.to - ms <= RAILS.lastDays * DAY)
    .map(({ item: it, w }) => ({ item: it, ends: w.to, vault: inVault(it, ms) })).sort((a, b) => a.ends - b.ends).slice(0, RAILS.max);
}
export const vaultNow = (ms = Date.now()): Item[] => VAULT.filter((v) => ms >= v.from && ms < v.to).map((v) => item(v.id)).filter((x): x is Item => !!x && inVault(x, ms));

// ---------------------------------------------------------------- the collection book (sets)
// Every set with every item in it: evergreen families, the lines, earned families, and each season (past seasons
// stay in the book: gone items show "may return from the vault"). Ownership is decided by the caller (wallet.owns).
/** The book lists season sets up to the end of the 2026/27 football year (the summer window closes 1 Sep 2027). */
export const SEASON_BOOK_END = utc(2027, 9, 2);
export const BOOK_ORDER = ['deals', 'starter', 'lines', 'story', 'rank', 'streak', 'rivalry', 'referral', 'ddlive', 'redtop', 'broadsheet', 'wire', 'night', 'gilt', 'event'];
export function bookSets(ms = Date.now()): { set: string; season: boolean; items: Item[] }[] {
  const all = [...NEW.filter((x) => x.source !== 'standard'), ...EARNED, ...seasonCosmeticsAll(), ...seasonStore().map(fromLegacy)];
  const map = new Map<string, Item[]>();
  const add = (it: Item) => { const k = it.set || 'other'; const l = map.get(k) || []; if (!l.some((x) => x.id === it.id)) l.push(it); map.set(k, l); };
  all.forEach(add);
  // the whole 2026/27 football year and the three seasons before this one: the seven-slot set and the season track (Gold is its own tab).
  // Upcoming sets show "arrives", the live one counts down, past ones say the vault may bring a piece back.
  const now = seasonAt(ms);
  const ids: string[] = [];
  for (let c = now, i = 0; i < 4; i++) { ids.push(c.id); const p = seasonAt(c.start - DAY); if (p.id === c.id) break; c = p; }
  for (let c = seasonAt(now.end + DAY / 2); c.start < SEASON_BOOK_END && !ids.includes(c.id); c = seasonAt(c.end + DAY / 2)) ids.push(c.id);
  for (const sid of ids) seasonSet(sid).forEach((it) => { if (it.kind !== 'gold') add({ ...it, set: sid }); });
  const when = (x: { items: Item[] }) => { const w = x.items[0].window; return !w ? 0 : ms >= w.from && ms < w.to ? 0 : w.from > ms ? 1 + (w.from - ms) / 1e13 : 2 + (ms - w.from) / 1e13; };
  const rank = (k: string) => { const i = BOOK_ORDER.indexOf(k); return i >= 0 ? i : /^\w+-\d{4}$/.test(k) ? -1 : 99; };
  return [...map.entries()].map(([set, items]) => ({ set, season: /^\w+-\d{4}$/.test(set), items })).sort((a, b) => rank(a.set) - rank(b.set) || (a.season && b.season ? when(a) - when(b) : 0));
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
  return { week: w.key, ends: w.end, items: [...pinned.map((item) => ({ item, was: priceOf(item), price: priceOf(item), pinned: true })), ...rot.map((item) => ({ item, was: priceOf(item), price: featuredPrice(priceOf(item)), pinned: false }))] };
}
/** The price to pay right now (featured this week or not; v4 stock at the rarity table). */
export function priceNow(it: Item, ms = Date.now()): Price {
  const f = featuredView(ms).items.find((x) => x.item.id === it.id);
  return f ? f.price : priceOf(it);
}

// ---------------------------------------------------------------- remote config (v4 adapter point)
// The api lane's config.get hands over `{ looks?: Item[]; featured?: string[]; vault?: VaultReturn[] }` (lib/drops.ts
// installRemoteDrops wires it). Looks replace same-id entries (price, window or drop changes) or add new ones; earned
// looks go to the earned list; `featured` pins ids; `vault` replaces the return calendar. Additive only: it can never
// remove an owned id, and every look is validated first, so an effect can't arrive from the server either.
let remote: { items: Item[]; featured: string[] } = { items: [], featured: [] };
export interface RemoteCatalog {
  items?: Item[]; looks?: Item[]; featured?: string[];
  vault?: { id: string; from: number | string; to: number | string }[];
  drops?: { id: string; at: number | string }[];                 // move an item's arrival (the "new this week" rail)
  rails?: { newDays?: number; lastDays?: number; max?: number };  // rail lengths
  earnedOnly?: string[];                                         // ids that may never carry a price (belt and braces)
}
const toMs = (x: number | string) => (typeof x === 'number' ? x : Date.parse(String(x).length === 10 ? x + 'T00:00:00Z' : x));
export function applyRemoteCatalog(cfg: RemoteCatalog) {
  const never = new Set([...(cfg.earnedOnly || []), ...EARNED.map((x) => x.id)]);
  const looks = (cfg.looks || cfg.items || []).filter((x) => validateItem(x).length === 0 && !(never.has(x.id) && x.source !== 'earned'));
  remote = { items: looks, featured: cfg.featured || [] };
  for (const it of looks) {
    const list = it.source === 'earned' ? EARNED : NEW;
    const k = list.findIndex((x) => x.id === it.id); if (k >= 0) list[k] = it; else list.push(it);
  }
  for (const it of NEW) it.featured = remote.featured.includes(it.id) || undefined;
  for (const d of cfg.drops || []) { const it = NEW.find((x) => x.id === d.id); const at = toMs(d.at); if (it && Number.isFinite(at)) it.drop = at; }
  if (cfg.rails) for (const k of ['newDays', 'lastDays', 'max'] as const) { const v = cfg.rails[k]; if (Number.isInteger(v) && v! > 0 && v! <= 30) RAILS[k] = v!; }
  if (cfg.vault) {
    const ms = toMs;
    const v = cfg.vault.map((x) => ({ id: x.id, from: ms(x.from), to: ms(x.to) })).filter((x) => Number.isFinite(x.from) && Number.isFinite(x.to) && x.from < x.to && x.to - x.from <= VAULT_MAX_DAYS * DAY + 1 && !!item(x.id));
    VAULT = v;
  }
}

// ---------------------------------------------------------------- validation (scripts/economy-test.mjs, scripts/longtail-test.mjs)
const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
const SOURCES: Source[] = ['store', 'track', 'gold', 'event', 'standard', 'earned'];
export function validateItem(it: Item): string[] {
  const e: string[] = [];
  const extra = Object.keys(it).filter((k) => !(ITEM_KEYS as readonly string[]).includes(k));
  if (extra.length) e.push(`${it.id}: unknown keys ${extra.join(',')} (an item can carry no effect)`);
  if (!it.id || !/^[a-z0-9.’'\-]+$/i.test(it.id)) e.push(`${it.id}: bad id`);
  if (!isKind(it.kind)) e.push(`${it.id}: bad kind ${it.kind}`);
  if (!it.nameKey) e.push(`${it.id}: no nameKey`);
  if (!RARITIES.includes(it.rarity)) e.push(`${it.id}: bad rarity`);
  if (!SOURCES.includes(it.source)) e.push(`${it.id}: bad source`);
  const pk = Object.keys(it.price || {}).filter((k) => k !== 'coins' && k !== 'credits');
  if (!it.price) e.push(`${it.id}: no price object`); else if (pk.length) e.push(`${it.id}: price has ${pk.join(',')}`);
  for (const k of ['coins', 'credits'] as const) { const v = it.price?.[k]; if (v != null && (!Number.isInteger(v) || v <= 0)) e.push(`${it.id}: ${k} price must be a positive integer`); }
  const priced = it.price?.coins != null || it.price?.credits != null;
  if (it.source === 'store' && !priced) e.push(`${it.id}: store item without a price`);
  if (it.source !== 'store' && priced) e.push(`${it.id}: ${it.source} item with a price`);
  for (const w of windowsOf(it)) if (!(Number.isFinite(w.from) && Number.isFinite(w.to) && w.from < w.to)) e.push(`${it.id}: bad window`);
  for (const w of it.vault || []) { if (w.to - w.from > VAULT_MAX_DAYS * DAY + 1) e.push(`${it.id}: a vault return is one week at most`); if (it.window && w.from < it.window.to) e.push(`${it.id}: a vault return must come after the season window`); }
  if (it.vault && !it.window) e.push(`${it.id}: only a season-limited item can return from the vault`);
  if (it.drop != null && !Number.isFinite(it.drop)) e.push(`${it.id}: bad drop date`);
  if (!it.preview || it.preview.k !== it.kind) e.push(`${it.id}: preview kind mismatch`);
  if (isStandard(it.id) !== (it.source === 'standard')) e.push(`${it.id}: std ids are the standard source, and only they are`);
  if ((it.source === 'earned') !== !!it.earn) e.push(`${it.id}: earned items carry an earn rule, and only they do`);
  if (it.earn) {
    const ek = Object.keys(it.earn).filter((k) => !['via', 'n', 'ref'].includes(k));
    if (ek.length) e.push(`${it.id}: earn has ${ek.join(',')}`);
    if (!EARN_VIAS.includes(it.earn.via)) e.push(`${it.id}: bad earn.via`);
    if (it.earn.n != null && (!Number.isInteger(it.earn.n) || it.earn.n <= 0)) e.push(`${it.id}: earn.n must be a positive integer`);
    if (it.earn.ref != null && !/^[a-z0-9\-]{1,24}$/i.test(it.earn.ref)) e.push(`${it.id}: bad earn.ref`);
  }
  if (it.preview && isKind(it.kind)) e.push(...validatePreview(it));
  return e;
}
// A preview is colours, faces and cues: strings from closed lists. A number that isn't a column count is refused.
const HEX = /^#[0-9a-f]{6}$/i;
function validatePreview(it: Item): string[] {
  const e: string[] = []; const p = it.preview as Record<string, unknown>;
  const col = (k: string) => { if (p[k] != null && !HEX.test(String(p[k]))) e.push(`${it.id}: preview.${k} is not a colour`); };
  switch (it.preview.k) {
    case 'headline': if (!['wood', 'serif', 'slab', 'stencil', 'mono'].includes(it.preview.face)) e.push(`${it.id}: bad headline face`); col('ink'); break;
    case 'lamp': col('glow'); col('pool'); if (!['warm', 'cool', 'neon'].includes(it.preview.warmth)) e.push(`${it.id}: bad lamp warmth`); break;
    case 'ringpack': if (!it.preview.rings || typeof it.preview.rings !== 'object') e.push(`${it.id}: ring pack needs rings`); else for (const [src, cue] of Object.entries(it.preview.rings)) if (!['kitman', 'barber', 'agent', 'spotter', 'physio', 'leak'].includes(src) || typeof cue !== 'string') e.push(`${it.id}: bad ring for ${src}`); break;
    case 'feedskin': if (!['wire', 'ticker', 'memo', 'redtop', 'night'].includes(it.preview.style)) e.push(`${it.id}: bad feed skin style`); col('rule'); col('bg'); col('ink'); break;
    case 'frontpage': if (![1, 2, 3].includes(it.preview.cols)) e.push(`${it.id}: front page columns are 1–3`); col('kicker'); col('paper'); col('ink'); break;
    case 'byline': col('bg'); col('ink'); col('accent'); break;
    case 'masthead': col('bg'); col('ink'); break;
    case 'sharecard': col('paper'); col('ink'); col('accent'); break;
    case 'presspass': col('c1'); col('c2'); col('ink'); col('stripe'); break;
    case 'poster': col('c'); col('c2'); break;
    case 'ink': col('c'); break;
    case 'flair': col('c'); break;
    case 'lockface': col('bg'); col('ink'); col('accent'); col('c2'); if (!['numerals', 'stacked', 'ticker', 'split'].includes(it.preview.clock)) e.push(`${it.id}: bad clock style`); if (!['handle', 'catch', 'followers', 'streak'].includes(it.preview.stamp)) e.push(`${it.id}: bad lock stamp`); if (!['cards', 'strip', 'paper'].includes(it.preview.tray)) e.push(`${it.id}: bad tray style`); break;
    case 'iconpack': col('tile'); col('ink'); if (!['paper', 'outline', 'stamp', 'crest', 'retro'].includes(it.preview.style)) e.push(`${it.id}: bad icon style`); break;
    case 'device': col('bezel'); col('frame'); if (!['pill', 'dot', 'bar', 'none'].includes(it.preview.notch)) e.push(`${it.id}: bad notch`); if (!Number.isInteger(it.preview.radius) || it.preview.radius < 0 || it.preview.radius > 64) e.push(`${it.id}: device radius is 0–64`); break;
    case 'catchphrase': if (!/^cp\.[a-z]+\.[a-z]+$/.test(it.preview.key)) e.push(`${it.id}: a catchphrase is an i18n key cp.<group>.<id>`); if (!['loud', 'cool', 'dry', 'gold'].includes(it.preview.tone)) e.push(`${it.id}: bad catchphrase tone`); col('c'); break;
    default: break;
  }
  return e;
}
export function validateCatalog(ms = Date.now()): string[] {
  const errs: string[] = [...validateRegistry()];
  const ids = new Set<string>();
  const all = KINDS.flatMap((k) => itemsOf(k, ms));
  for (const it of all) { if (ids.has(it.id)) errs.push(`${it.id}: duplicate id`); ids.add(it.id); errs.push(...validateItem(it)); }
  for (const k of KINDS) if (!all.some((x) => x.id === 'std.' + k)) errs.push(`no standard item for ${k}`);
  // Every legacy id still resolves through the catalog, unchanged.
  for (const c of [...seasonStore(), ...seasonItems(seasonAt(ms).id)]) { const it = item(c.id); if (!it || it.kind !== c.kind) errs.push(`legacy ${c.id} lost`); }
  // Every vault return names a season-limited item, lasts a week at most, and never overlaps that item's own season.
  for (const v of VAULT) { const it = item(v.id); if (!it || !it.window) errs.push(`vault ${v.id}: not a season-limited item`); else if (v.from < it.window.to) errs.push(`vault ${v.id}: inside its own season`); if (v.to - v.from > VAULT_MAX_DAYS * DAY + 1) errs.push(`vault ${v.id}: longer than a week`); }
  // Earned-only items are never on sale, whatever the date, and never carry a window (a rule is not a countdown).
  for (const it of EARNED) { if (onSale(it, ms) || onSale(it, ms + 400 * DAY)) errs.push(`${it.id}: earned item on sale`); if (it.window || it.vault) errs.push(`${it.id}: earned item with a window`); }
  const f = featuredView(ms);
  if (f.items.filter((x) => !x.pinned).length !== 3) errs.push('featured rotation is not three items');
  for (const x of f.items) for (const k of ['coins', 'credits'] as const) if (x.was[k] != null && (x.price[k]! > x.was[k]!)) errs.push(`${x.item.id}: featured price above the usual price`);
  return errs;
}
export const rarityRank = (r: Rarity) => RARITIES.indexOf(r);
