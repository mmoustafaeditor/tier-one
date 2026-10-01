// The kind registry (GOTY.md §10.3 "customization is a long tail"): every kind of look the game can sell, earn or
// equip is one entry here. An entry says where the kind renders (its surfaces), which preview draws it on "Your
// desk", where its equipped id is stored, and its slot rules. Nothing else in the code enumerates kinds: the catalog,
// the wallet, the store tabs, the collection book and the previews all read this table.
//
// ADDING A KIND = one entry below (+ its `Preview` shape) and one preview component in ui/customize.tsx PREVIEWS.
// The store, the collection book, the featured rotation, gifting, refunds and the validators pick it up unchanged.
// A kind can never carry a gameplay effect: a KindDef has no field for one, and `validateRegistry()` (run by
// scripts/longtail-test.mjs) refuses unknown keys.
import type { FramePat } from './season';
import type { Sfx } from './sfx';

/** Where a look shows up. A feature that gets cosmetics registers its surface here and reads the helper in wallet.ts. */
export type Surface =
  | 'byline'      // the byline card (Me, press box tables, results strip)
  | 'sharecard'   // the scoop card PNG (lib/share.ts) and its previews
  | 'frontpage'   // the results front page headline
  | 'roomtable'   // press box / newsroom tables
  | 'masthead'    // the newsroom masthead
  | 'presspass'   // the press pass badge (Home, Me)
  | 'poster'      // moment films' poster frame
  | 'stamp'       // stamp ink on posts and cards
  | 'phone'       // the caller card ring (ui/CallScene.tsx via ringtoneFor)
  | 'desk'        // the desk colours (theme)
  | 'home'        // Home's film stage (the lamp)
  | 'feed'        // feed rows (ui/connect.tsx FeedRow via data-feedskin)
  | 'film'        // film overlay style
  | 'newsroom'    // the clan's shared front page
  | 'paper';      // the paper's name

export type Group = 'byline' | 'desk' | 'newsroom' | 'gold';
/** Which preview component draws the kind on stage (ui/customize.tsx PREVIEWS). */
export type PreviewKey = 'byline' | 'post' | 'sharecard' | 'presspass' | 'masthead' | 'poster' | 'ring' | 'headline' | 'lamp' | 'ringpack' | 'feed' | 'frontpage' | 'catch';
/** Where the equipped id lives: legacy kinds keep lib/season.ts fields, everything else is save.desk.equip. */
export type Store = 'legacy' | 'theme' | 'desk' | 'gold';

export type HeadlineFace = 'wood' | 'serif' | 'slab' | 'stencil' | 'mono';
export type FeedSkinStyle = 'wire' | 'ticker' | 'memo' | 'redtop' | 'night';
export type RingSource = 'kitman' | 'barber' | 'agent' | 'spotter' | 'physio' | 'leak';
/** How a catchphrase lands: the stamp's colour family, its sound and its film title treatment (GOTY §12). */
export type CatchTone = 'loud' | 'cool' | 'dry' | 'gold';
export const RING_SOURCES: RingSource[] = ['kitman', 'barber', 'agent', 'spotter', 'physio', 'leak'];

/** What a preview needs to draw an item: colours, faces, a cue. Never a number that reaches the engine. */
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
  | { k: 'gold'; season: string }
  // 3.4 long tail: kinds that ride on features already built
  | { k: 'headline'; face: HeadlineFace; ink?: string; upper?: boolean }                 // results front page + byline card name
  | { k: 'lamp'; glow: string; pool: string; warmth: 'warm' | 'cool' | 'neon' }         // Home's film stage tone
  | { k: 'ringpack'; rings: Partial<Record<RingSource, Sfx>>; fallback: Sfx }           // one ring per source
  | { k: 'feedskin'; style: FeedSkinStyle; rule: string; bg: string; ink: string }      // feed row style
  | { k: 'frontpage'; cols: 1 | 2 | 3; hed: HeadlineFace; kicker: string; rule: 'single' | 'double' | 'thick'; paper: string; ink: string } // the newsroom's shared front page
  | { k: 'catchphrase'; key: string; tone: CatchTone; c: string };                      // a line (i18n key) that fires on a Confirmed call that lands

export interface KindDef {
  /** Tab group on "Your desk" and chapter in the collection book. */
  group: Group;
  /** Where it renders. Documentation for integrators and the collection book's "shows on" line. */
  surfaces: Surface[];
  /** The preview component (ui/customize.tsx PREVIEWS[preview]). */
  preview: PreviewKey;
  /** The standard look everyone owns (id std.<kind>). */
  std: Preview;
  /** Where the equipped id is stored. */
  store: Store;
  /** Slot rules: one item on at a time; `overrides` names a kind this one silences when equipped (ring pack > ringtone). */
  slot: { one: true; overrides?: string };
  /** Can be pinned to the byline card's showcase (three slots). */
  showcase: boolean;
  /** Order inside its group (tabs, book). */
  order: number;
}
export const KIND_DEF_KEYS = ['group', 'surfaces', 'preview', 'std', 'store', 'slot', 'showcase', 'order'] as const;

const P = '#F4EFE4', INK = '#15130F', RED = '#C9381A';
export const REGISTRY = {
  // ---- the byline (it is you)
  byline:    { group: 'byline', order: 0, surfaces: ['byline', 'roomtable'], preview: 'byline', store: 'desk', slot: { one: true }, showcase: true, std: { k: 'byline', bg: P, ink: INK, accent: RED, rule: 'thick', face: 'display' } },
  flair:     { group: 'byline', order: 1, surfaces: ['byline', 'roomtable', 'sharecard'], preview: 'byline', store: 'legacy', slot: { one: true }, showcase: true, std: { k: 'flair', g: '', c: INK } },
  presspass: { group: 'byline', order: 2, surfaces: ['presspass', 'byline'], preview: 'presspass', store: 'desk', slot: { one: true }, showcase: true, std: { k: 'presspass', c1: '#FF7A52', c2: RED, ink: '#FFFFFF' } },
  headline:  { group: 'byline', order: 3, surfaces: ['frontpage', 'byline'], preview: 'headline', store: 'desk', slot: { one: true }, showcase: true, std: { k: 'headline', face: 'wood', upper: true } },
  catchphrase: { group: 'byline', order: 4, surfaces: ['byline', 'sharecard', 'stamp', 'film'], preview: 'catch', store: 'desk', slot: { one: true }, showcase: true, std: { k: 'catchphrase', key: 'cp.house.default', tone: 'loud', c: '#F7B928' } },
  // ---- the desk
  frame:     { group: 'desk', order: 0, surfaces: ['sharecard', 'stamp'], preview: 'post', store: 'legacy', slot: { one: true }, showcase: true, std: { k: 'frame', c: INK, c2: P, pat: 'solid' } },
  ink:       { group: 'desk', order: 1, surfaces: ['stamp', 'sharecard', 'byline'], preview: 'post', store: 'legacy', slot: { one: true }, showcase: true, std: { k: 'ink', c: RED } },
  theme:     { group: 'desk', order: 2, surfaces: ['desk'], preview: 'byline', store: 'theme', slot: { one: true }, showcase: false, std: { k: 'theme', desk: ['#17140F', '#211D17', '#2C271F'] } },
  lamp:      { group: 'desk', order: 3, surfaces: ['home', 'film'], preview: 'lamp', store: 'desk', slot: { one: true }, showcase: true, std: { k: 'lamp', glow: '#FFB25C', pool: '#2A1E10', warmth: 'warm' } },
  ringtone:  { group: 'desk', order: 4, surfaces: ['phone'], preview: 'ring', store: 'legacy', slot: { one: true }, showcase: false, std: { k: 'ringtone', sfx: 'phone.ring' } },
  ringpack:  { group: 'desk', order: 5, surfaces: ['phone'], preview: 'ringpack', store: 'desk', slot: { one: true, overrides: 'ringtone' }, showcase: true, std: { k: 'ringpack', rings: {}, fallback: 'phone.ring' } },
  poster:    { group: 'desk', order: 6, surfaces: ['poster', 'film'], preview: 'poster', store: 'desk', slot: { one: true }, showcase: true, std: { k: 'poster', c: INK, c2: P, style: 'film' } },
  sharecard: { group: 'desk', order: 7, surfaces: ['sharecard'], preview: 'sharecard', store: 'desk', slot: { one: true }, showcase: true, std: { k: 'sharecard', paper: '#F2EEE5', ink: INK, accent: '#D2381B', style: 'classic' } },
  feedskin:  { group: 'desk', order: 8, surfaces: ['feed', 'home'], preview: 'feed', store: 'desk', slot: { one: true }, showcase: true, std: { k: 'feedskin', style: 'wire', rule: '#B9AF9C', bg: '#FFFFFF', ink: INK } },
  // ---- the newsroom
  masthead:  { group: 'newsroom', order: 0, surfaces: ['masthead', 'roomtable', 'newsroom'], preview: 'masthead', store: 'desk', slot: { one: true }, showcase: true, std: { k: 'masthead', bg: P, ink: INK, face: 'display', rule: 'double' } },
  frontpage: { group: 'newsroom', order: 1, surfaces: ['newsroom', 'roomtable'], preview: 'frontpage', store: 'desk', slot: { one: true }, showcase: true, std: { k: 'frontpage', cols: 2, hed: 'wood', kicker: RED, rule: 'double', paper: P, ink: INK } },
  paper:     { group: 'newsroom', order: 2, surfaces: ['paper', 'sharecard', 'masthead'], preview: 'masthead', store: 'desk', slot: { one: true }, showcase: false, std: { k: 'paper' } },
  // ---- Gold
  gold:      { group: 'gold', order: 0, surfaces: ['byline'], preview: 'sharecard', store: 'gold', slot: { one: true }, showcase: false, std: { k: 'gold', season: '' } },
} as const satisfies Record<string, KindDef>;

export type Kind = keyof typeof REGISTRY;
export const GROUPS: Group[] = ['byline', 'desk', 'newsroom', 'gold'];
/** Tab order on "Your desk": the byline first (it is you), then the desk, then the newsroom, then Gold. */
export const KINDS: Kind[] = (Object.keys(REGISTRY) as Kind[]).sort((a, b) => GROUPS.indexOf(REGISTRY[a].group) - GROUPS.indexOf(REGISTRY[b].group) || REGISTRY[a].order - REGISTRY[b].order);
export const kindDef = (k: Kind): KindDef => REGISTRY[k];
export const kindsOf = (g: Group): Kind[] => KINDS.filter((k) => REGISTRY[k].group === g);
export const isKind = (x: string): x is Kind => Object.prototype.hasOwnProperty.call(REGISTRY, x);
/** The kind whose equipped item silences `k` (a ring pack over a single ringtone), or null. */
export const overriddenBy = (k: Kind): Kind | null => (KINDS.find((x) => (REGISTRY[x].slot as KindDef['slot']).overrides === k) as Kind | undefined) || null;

const SURFACES: Surface[] = ['byline', 'sharecard', 'frontpage', 'roomtable', 'masthead', 'presspass', 'poster', 'stamp', 'phone', 'desk', 'home', 'feed', 'film', 'newsroom', 'paper'];
const PREVIEWS: PreviewKey[] = ['byline', 'post', 'sharecard', 'presspass', 'masthead', 'poster', 'ring', 'headline', 'lamp', 'ringpack', 'feed', 'frontpage', 'catch'];
const STORES: Store[] = ['legacy', 'theme', 'desk', 'gold'];
/** The registry is data: check it like data (scripts/longtail-test.mjs). */
export function validateRegistry(): string[] {
  const e: string[] = [];
  for (const k of KINDS) {
    const d = REGISTRY[k] as KindDef;
    if (!/^[a-z]{3,14}$/.test(k)) e.push(`${k}: a kind id is 3–14 lowercase letters`);
    const extra = Object.keys(d).filter((x) => !(KIND_DEF_KEYS as readonly string[]).includes(x));
    if (extra.length) e.push(`${k}: unknown keys ${extra.join(',')} (a kind can carry no effect)`);
    if (!GROUPS.includes(d.group)) e.push(`${k}: bad group`);
    if (!d.surfaces.length || d.surfaces.some((s) => !SURFACES.includes(s))) e.push(`${k}: bad surfaces`);
    if (!PREVIEWS.includes(d.preview)) e.push(`${k}: bad preview`);
    if (!STORES.includes(d.store)) e.push(`${k}: bad store`);
    if (!d.std || d.std.k !== k) e.push(`${k}: the standard preview must be of kind ${k}`);
    if (d.slot.overrides && !isKind(d.slot.overrides)) e.push(`${k}: overrides an unknown kind`);
    if (d.slot.overrides === k) e.push(`${k}: overrides itself`);
    if (typeof d.showcase !== 'boolean') e.push(`${k}: showcase must be a boolean`);
  }
  if (KINDS.filter((k) => REGISTRY[k].store === 'gold').length !== 1) e.push('exactly one kind stores as gold');
  return e;
}
