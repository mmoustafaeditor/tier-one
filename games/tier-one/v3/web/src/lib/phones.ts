// Phones (CONCEPT4 §18): the device is your gear. A phone is a device skin (a `device` look in lib/catalog.ts: bezel,
// frame, corner radius, notch, boot) plus four parts upgraded with coins:
//   Screen  — widget slots on the home screen (2 → 4 → 6) and a second page; the same on every board (it is your home screen)
//   Battery — extras you can carry into a Story window (0 → 1 → 2 → 3): an extra DM, a tip-off, a second opinion
//   Camera  — from Chapter 3, a spotter photo on one story a day early, once a window (1 photo → 2)
//   SIM     — the burner (Priya's second line, Chapter 4): whistleblower tips land here, 75% right → 90% upgraded
// FAIRNESS, made structural: perksFor() returns NO_PERKS for every ranked mode (the Daily, Live on a real deadline day,
// rooms). On a ranked board the phone is a look. Perks are coins only, never credits.
//
// This file also resolves the phone's whole LOOK (lock face, wallpaper, OS theme, icon pack, device) with a try-on
// layer, so every look is previewable on the player's own phone before buying (CONCEPT4 §5, §17).
//
// EXPORTS other lanes rely on:
//   PHONES, phoneDef(id), PARTS, PART_PRICES, partLevel(id, part, s?), partValue(id, part, s?), upgradePrice(id, part, s?)
//   ownedPhones(s?), equipped(save, mode) → PhoneDef, equipPhone(id, mode?), upgrade(id, part) → UpgradeTx
//   perksFor(save, mode, ranked?) → Perks (NO_PERKS on ranked modes), slotsFor(s?), pagesFor(s?), RANKED_NOTE_KEY
//   phoneLook(s?) → Look, tryLook(id | null), useTry(), useLook()
import { useSyncExternalStore } from 'react';
import { update, getSave, useSave, type Save } from './save';
import { item, standardOf, type Item } from './catalog';
import { owns, equipped as equippedLook, desk } from './wallet';
import { debit, PRICES, type Mode4 } from './economy';
import { chapterOf } from './storyMode';
import type { Kind } from './kinds';

// ---------------------------------------------------------------- the parts
export type Part = 'screen' | 'battery' | 'camera' | 'sim';
export const PARTS: Part[] = ['screen', 'battery', 'camera', 'sim'];
/** What each part level gives (CONCEPT4 §18). Index = level. SIM: the burner's tip accuracy (0 = no burner line). */
export const PART_VALUES: Record<Part, readonly number[]> = {
  screen: [2, 4, 6],
  battery: [0, 1, 2, 3],
  camera: [0, 1, 2],
  sim: [0, 0.75, 0.9],
};
/** Coins to go from level L to L+1 (index L). CONCEPT4 §18: Screen 150 / 400 (the common and rare look prices), Battery
 *  200 / 450 / 900, Camera 600 (one photo → two), SIM 500 (the burner, 75% → 90%). Coins only, never credits. */
export const PART_PRICES: Record<Part, readonly (number | null)[]> = {
  screen: [PRICES.look.common, PRICES.look.rare],
  battery: [200, 450, 900],
  camera: [null, 600],   // the camera itself is hardware (the flagship has one); the upgrade adds the second photo
  sim: [null, 500],      // the burner line is given in Chapter 4; the upgrade makes Priya's tips 90% right
};
/** From which Story chapter a part's perk works (chapter index, 0 = Chapter 1). */
const PART_FROM: Record<Part, number> = { screen: 0, battery: 0, camera: 2, sim: 3 };

// ---------------------------------------------------------------- the phones
export type PhoneId = 'pocket' | 'brick' | 'post' | 'halo' | 'burner' | 'chronicle' | 'terrace' | 'haloone';
export interface PhoneDef {
  id: PhoneId;
  /** The `device` look in the catalog (std.device for your own phone). */
  look: string;
  /** Part levels out of the box, and the most each part can be upgraded to. */
  base: Record<Part, number>;
  max: Record<Part, number>;
  /** The Story chapter (index) that hands you this phone, or null for a phone you own outside the story. */
  chapter: number | null;
  /** The lock face that comes with it (a default; the player can wear any face they own). */
  face?: string;
  /** A second line, not a main phone: it can't be equipped; its SIM is what it carries (the burner). */
  second?: boolean;
}
const L = (screen: number, battery: number, camera: number, sim: number): Record<Part, number> => ({ screen, battery, camera, sim });
export const PHONES: PhoneDef[] = [
  { id: 'pocket', look: 'std.device', base: L(1, 0, 0, 0), max: L(2, 2, 0, 0), chapter: null },
  { id: 'brick', look: 'dv.brick', base: L(0, 0, 0, 0), max: L(1, 1, 0, 0), chapter: 0 },
  { id: 'post', look: 'dv.post', base: L(1, 1, 0, 0), max: L(2, 2, 0, 0), chapter: 1 },
  { id: 'halo', look: 'dv.halo', base: L(2, 2, 1, 0), max: L(2, 3, 2, 0), chapter: 2 },
  { id: 'burner', look: 'dv.burner', base: L(0, 0, 0, 1), max: L(0, 0, 0, 2), chapter: 3, second: true },
  { id: 'chronicle', look: 'dv.chronicle', base: L(2, 3, 2, 0), max: L(2, 3, 2, 0), chapter: 4, face: 'lf.chronicle' },
  { id: 'terrace', look: 'dv.terrace', base: L(1, 1, 0, 0), max: L(2, 3, 0, 0), chapter: null },
  { id: 'haloone', look: 'dv.haloone', base: L(2, 1, 1, 0), max: L(2, 3, 2, 0), chapter: null },
];
export const phoneDef = (id: string): PhoneDef => PHONES.find((p) => p.id === id || p.look === id) || PHONES[0];
export const phoneItem = (p: PhoneDef): Item => item(p.look) || standardOf('device');

// ---------------------------------------------------------------- the save (module augmentation: no edit to save.ts)
export interface PhonesSave {
  /** Upgrades bought per phone: levels ABOVE the phone's base. */
  up: Partial<Record<PhoneId, Partial<Record<Part, number>>>>;
  /** The phone you carry in Story (null = the chapter's phone). The Daily phone is the equipped `device` look. */
  story?: PhoneId | null;
}
declare module './save' { interface Save { phones?: PhonesSave } }
const phonesOf = (s: Save): PhonesSave => s.phones || { up: {} };

export const ownsPhone = (p: PhoneDef, s: Save = getSave()) => owns(p.look, s);
export const ownedPhones = (s: Save = getSave()): PhoneDef[] => PHONES.filter((p) => ownsPhone(p, s));
export function partLevel(id: PhoneId | string, part: Part, s: Save = getSave()): number {
  const p = phoneDef(id);
  return Math.min(p.max[part], p.base[part] + (phonesOf(s).up[p.id]?.[part] || 0));
}
export const partValue = (id: PhoneId | string, part: Part, s: Save = getSave()) => PART_VALUES[part][partLevel(id, part, s)];
/** The coin price of the next upgrade of a part, or null when it is maxed or not upgradable on this phone. */
export function upgradePrice(id: PhoneId | string, part: Part, s: Save = getSave()): number | null {
  const p = phoneDef(id); const lv = partLevel(p.id, part, s);
  if (lv >= p.max[part]) return null;
  return PART_PRICES[part][lv] ?? null;
}

// ---------------------------------------------------------------- equipping
const RANKED: Mode4[] = ['daily', 'room'];
/** Is this mode ranked (phones are looks only)? Live (deadline) is ranked on real deadline days; pass `ranked` to say. */
export const isRankedMode = (mode: Mode4 | 'tutorial' | 'challenge', ranked?: boolean) => ranked ?? (RANKED.includes(mode as Mode4) || mode === 'deadline' || mode === 'challenge');
/** The chapter's phone (the newest story phone you own), or your own phone before the story starts. */
function chapterPhone(s: Save): PhoneDef {
  const ch = chapterOf(s)?.i ?? -1;
  const story = PHONES.filter((p) => p.chapter != null && !p.second && p.chapter <= ch && ownsPhone(p, s));
  return story.sort((a, b) => (b.chapter || 0) - (a.chapter || 0))[0] || dailyPhone(s);
}
function dailyPhone(s: Save): PhoneDef {
  const look = equippedLook('device', s);
  return PHONES.find((p) => p.look === look.id && !p.second) || PHONES[0];
}
/** The phone in your hand for a mode: Story carries the chosen (or chapter) phone; every other mode the Daily phone. */
export function equipped(save: Save, mode: Mode4 | 'tutorial' | 'challenge' = 'daily'): PhoneDef {
  if (mode === 'career') { const id = phonesOf(save).story; const p = id ? phoneDef(id) : null; return p && ownsPhone(p, save) && !p.second ? p : chapterPhone(save); }
  return dailyPhone(save);
}
/** Equips a phone you own: for the Daily (the showpiece, also its device look) or for Story. False when not owned. */
export function equipPhone(id: PhoneId, mode: 'daily' | 'career' = 'daily'): boolean {
  const p = phoneDef(id); const s = getSave();
  if (!ownsPhone(p, s) || p.second) return false;
  update((x) => {
    if (mode === 'career') { x.phones = { ...phonesOf(x), story: p.id }; return; }
    const d = desk(x); d.equip = { ...d.equip, device: p.look.startsWith('std.') ? undefined : p.look };
  });
  return true;
}

// ---------------------------------------------------------------- upgrading (coins only)
export type UpgradeTx = { ok: true; part: Part; level: number; coins: number } | { ok: false; error: 'max' | 'short' | 'owned' };
/** One tap, one price: buys the next level of a part on a phone you own. */
export function upgrade(id: PhoneId | string, part: Part): UpgradeTx {
  const p = phoneDef(id); const s = getSave();
  if (!ownsPhone(p, s)) return { ok: false, error: 'owned' };
  const price = upgradePrice(p.id, part, s);
  if (price == null) return { ok: false, error: 'max' };
  if (s.credits < price) return { ok: false, error: 'short' };
  let ok = false;
  update((x) => {
    if (!debit(x, price, 'phone:' + p.id + ':' + part)) return;
    const ph = phonesOf(x); const up = { ...(ph.up[p.id] || {}) }; up[part] = (up[part] || 0) + 1;
    x.phones = { ...ph, up: { ...ph.up, [p.id]: up } }; ok = true;
  });
  return ok ? { ok: true, part, level: partLevel(p.id, part), coins: price } : { ok: false, error: 'short' };
}

// ---------------------------------------------------------------- perks (Story and Practice only)
export interface Perks {
  /** Extras you can carry into a window (an extra DM, a tip-off, a second opinion). */
  extras: number;
  /** Spotter photos a window ("seen there / elsewhere / not seen", a day early), from Chapter 3. */
  photos: number;
  /** The burner's tip accuracy (0.75 / 0.9), or 0 with no burner line. From Chapter 4. */
  burner: number;
  /** The phone these came from. */
  phone: PhoneId | null;
}
export const NO_PERKS: Perks = Object.freeze({ extras: 0, photos: 0, burner: 0, phone: null }) as Perks;
/** The copy every ranked surface prints once (CONCEPT4 §18). i18n key. */
export const RANKED_NOTE_KEY = 'sh.ph.ranked';
/** The perks a phone gives in a mode. NOTHING on ranked modes (the Daily, rooms, Live on a real deadline day): pass
 *  `ranked: false` for a Live practice. Story reads this for Career; Practice gets battery extras only. */
export function perksFor(save: Save, mode: Mode4 | 'tutorial' | 'challenge', ranked?: boolean): Perks {
  if (isRankedMode(mode, ranked) || mode === 'wire' || mode === 'tutorial') return NO_PERKS;
  if (mode !== 'career' && mode !== 'practice' && mode !== 'deadline') return NO_PERKS;
  const p = equipped(save, mode === 'deadline' ? 'practice' : mode);
  const ch = mode === 'career' ? chapterOf(save)?.i ?? 0 : -1;
  const burner = PHONES.find((x) => x.second);
  return {
    extras: partValue(p.id, 'battery', save),
    photos: mode === 'career' && ch >= PART_FROM.camera ? partValue(p.id, 'camera', save) : 0,
    burner: mode === 'career' && ch >= PART_FROM.sim && burner && ownsPhone(burner, save) ? partValue(burner.id, 'sim', save) : 0,
    phone: p.id,
  };
}

// ---------------------------------------------------------------- the home screen's room (Screen part)
/** Widget slots on the home screen (a 2×2 widget takes one, a 4×2 takes two): the Daily phone's Screen. */
export const slotsFor = (s: Save = getSave()) => partValue(dailyPhone(s).id, 'screen', s);
/** Home pages: the second page needs a Screen above the Brick's. */
export const pagesFor = (s: Save = getSave()) => (partLevel(dailyPhone(s).id, 'screen', s) >= 1 ? 2 : 1);

// ---------------------------------------------------------------- the look, with try-on (preview before buying)
export type LookKind = 'lockface' | 'wallpaper' | 'theme' | 'iconpack' | 'device';
const LOOK_KINDS: LookKind[] = ['lockface', 'wallpaper', 'theme', 'iconpack', 'device'];
let trying: Partial<Record<LookKind, string>> = {};
const tSubs = new Set<() => void>();
const getTry = () => trying;
/** Shows a look on the player's own phone without buying it (null clears every try-on). Kind comes from the item. */
export function tryLook(id: string | null) {
  if (!id) { if (!Object.keys(trying).length) return; trying = {}; tSubs.forEach((f) => f()); return; }
  const it = item(id); if (!it || !(LOOK_KINDS as string[]).includes(it.kind)) return;
  trying = { ...trying, [it.kind]: id }; tSubs.forEach((f) => f());
}
export const useTry = () => useSyncExternalStore((f) => { tSubs.add(f); return () => { tSubs.delete(f); }; }, getTry, getTry);
export interface Look { lockface: Item; wallpaper: Item; theme: Item; iconpack: Item; device: Item; accent: string; trying: boolean }
const lookItem = (k: LookKind, s: Save, tr: Partial<Record<LookKind, string>>): Item => {
  const id = tr[k]; const it = id ? item(id) : null;
  if (it) return it;
  if (k === 'theme') { const th = s.theme && s.theme !== 'standard' ? item(s.theme) : null; return th && th.kind === 'theme' ? th : standardOf('theme'); }
  return equippedLook(k as Kind, s);
};
/** The phone's whole look right now (equipped + whatever is being tried on). `accent` is the ONE accent: the theme's,
 *  else the wallpaper's, else the lock face's. */
export function phoneLook(s: Save = getSave(), tr: Partial<Record<LookKind, string>> = trying): Look {
  const L = Object.fromEntries(LOOK_KINDS.map((k) => [k, lookItem(k, s, tr)])) as Record<LookKind, Item>;
  const th = L.theme.preview.k === 'theme' && L.theme.source !== 'standard' ? L.theme.preview.os?.accent : null;
  const wp = L.wallpaper.preview.k === 'wallpaper' && L.wallpaper.source !== 'standard' ? L.wallpaper.preview.accent : null;
  const lf = L.lockface.preview.k === 'lockface' ? L.lockface.preview.accent : '#F2B632';
  return { ...L, accent: th || wp || lf, trying: Object.keys(tr).length > 0 };
}
export function useLook(): Look { const s = useSave(); const tr = useTry(); return phoneLook(s, tr); }
