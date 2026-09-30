// The catchphrase system (GOTY.md §12): it replaces "HERE WE GO". A Confirmed call that lands fires YOUR line: the
// stamp, the sound, the share card, the film title. Words only: nothing here reaches a Daily board, a source or a score.
//
// CONTRACT for other lanes (stamp, results, share card, films):
//   catchphraseOf(save) -> { id, text, tone }
//     id    'cp.house.default' until something else is equipped; then the item id ('cp.pen', 'cp.shades',
//           'winter-2027.cp', 'cp.custom', ...)
//     text  the line in the save's language (a custom line is shown as written)
//     tone  'loud' | 'cool' | 'dry' | 'gold' — how it lands: stamp colour family, sound (TONE_SFX), film title style
//   catchphraseColor(save) -> the stamp colour of the equipped line (hex)
//
// Where lines come from (all are `catchphrase` catalog items, lib/catalog.ts):
//   house     'Book it.' (cp.house.default): everyone's, from the first call
//   earned    rank, streaks and story chapters (source 'earned'; lib/earned.ts) — never sold
//   signature bought with credits (source 'store'), fixed prices, refundable like any look
//   season    one line per season set, on sale only inside the season (vault returns possible)
//   custom    your own line from Chief rank: 24 characters, client blocklist here, then v4 `catchphrase.set` checks it
//             server-side (profanity + brand/real-person blocklist). Rejected by the server = back to the house line.
// Nothing in the game uses another person's catchphrase: every line is an original, and the blocklist refuses the
// famous ones.
import { getSave, update, type Save } from './save';
import { tr } from './i18n';
import { v4 } from './api';
import { itemsOf, standardOf, type Item } from './catalog';
import type { CatchTone } from './kinds';
import type { Sfx } from './sfx';
import { equipped, desk } from './wallet';
import { peakTier } from './earned';
import { REP_TIERS } from './byline';

export type { CatchTone };
export interface Catchphrase { id: string; text: string; tone: CatchTone }
export type CatchFrom = 'house' | 'earned' | 'signature' | 'season' | 'custom';
export interface CatchDef { id: string; key: string; tone: CatchTone; c: string; from: CatchFrom; item: Item }

export const HOUSE_ID = 'cp.house.default';
export const HOUSE_KEY = 'cp.house.default';
export const CUSTOM_ID = 'cp.custom';
export const CUSTOM_MAX = 24;
export const CUSTOM_RANK = 'chief';
/** The sound a line lands with (lib/sfx cues that already exist). */
export const TONE_SFX: Record<CatchTone, Sfx> = { loud: 'stamp.done', cool: 'unlock', dry: 'typewriter', gold: 'fanfare' };

const fromOf = (it: Item): CatchFrom => (it.id === CUSTOM_ID ? 'custom' : it.source === 'standard' ? 'house' : it.source === 'earned' ? 'earned' : it.window ? 'season' : 'signature');
const defOf = (it: Item): CatchDef => { const p = it.preview.k === 'catchphrase' ? it.preview : { key: HOUSE_KEY, tone: 'loud' as CatchTone, c: '#F7B928' }; return { id: it.source === 'standard' ? HOUSE_ID : it.id, key: p.key, tone: p.tone, c: p.c, from: fromOf(it), item: it }; };
/** Every line that can exist right now: the house line, the earned ones, the signature lines, this season's line. */
export const catchphrases = (ms = Date.now()): CatchDef[] => itemsOf('catchphrase', ms).map(defOf);
/** The registry at load time (house + earned + signature + this season). Use catchphrases() for a live list. */
export const CATCHPHRASES: CatchDef[] = catchphrases();

/** The line a Confirmed call that lands fires: the house default, then whatever is equipped. */
export function catchphraseOf(s: Save = getSave()): Catchphrase {
  const it = equipped('catchphrase', s);
  const d = defOf(it);
  if (d.id === CUSTOM_ID) {
    const text = s.desk?.cp?.text;
    if (text && s.desk?.cp?.ok !== false) return { id: CUSTOM_ID, text, tone: d.tone };
    return { id: HOUSE_ID, text: tr(s.lang, HOUSE_KEY), tone: 'loud' };
  }
  return { id: d.id, text: tr(s.lang, d.key), tone: d.tone };
}
export const catchphraseColor = (s: Save = getSave()): string => { const p = equipped('catchphrase', s).preview; return p.k === 'catchphrase' ? p.c : '#F7B928'; };
export const catchDef = (it: Item) => defOf(it);
export const houseLine = () => defOf(standardOf('catchphrase'));

// ---------------------------------------------------------------- your own line (Chief rank)
// The client list is a first pass so a player sees a refusal at once; the server list (api/tier-one/v4/catchphrase.mjs)
// is the one that counts. Both normalise leetspeak and separators before matching.
const BLOCK = [
  'fuck', 'fuk', 'shit', 'cunt', 'bitch', 'bastard', 'wanker', 'twat', 'dick', 'cock', 'pussy', 'whore', 'slut', 'nigg', 'fag', 'retard', 'spastic',
  'rape', 'nazi', 'hitler', 'kys', 'paki', 'chink', 'tranny', 'kike', 'coon', 'porn', 'sex', 'penis', 'vagina',
  // another person's line, brands and our own name: nobody borrows a catchphrase here
  'herewego', 'aquivamos', 'romano', 'fabrizio', 'ornstein', 'schira', 'plettenberg', 'moretto', 'dimarzio',
  'nike', 'adidas', 'puma', 'skysports', 'espn', 'bbc', 'dazn', 'talksport', 'goal.com', 'tierone', 'semba', 'official',
];
const ALLOW = ['scunthorpe', 'cumberland', 'dickens', 'sussex', 'essex', 'middlesex', 'analyst', 'assassin'];
const LEET: Record<string, string> = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'l' };
export const normaliseLine = (x: string) => x.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[0134578@$!|]/g, (c) => LEET[c] || c).replace(/[^a-z؀-ۿ.]/g, '');
export function lineAllowed(x: string): boolean {
  let n = normaliseLine(x).replace(/\./g, '');
  for (const a of ALLOW) n = n.split(a).join('');
  return !BLOCK.some((w) => n.includes(w.replace(/\./g, '')));
}
/** Tidy a draft: no control chars or markup, single spaces, 24 characters. */
export const cleanLine = (x: string) => x.replace(/[<>{}\u0000-\u001f\u200b-\u200f\u2028-\u202e]/g, '').replace(/\s+/g, ' ').trim().slice(0, CUSTOM_MAX);
export const customUnlocked = (s: Save = getSave()) => REP_TIERS.findIndex(([id]) => id === peakTier(s)) >= REP_TIERS.findIndex(([id]) => id === CUSTOM_RANK) || s.owned.includes(CUSTOM_ID);
export type CustomResult = { ok: true; text: string } | { ok: false; error: 'rank' | 'empty' | 'long' | 'blocked' };
/** Write your own line (Chief rank and up). Equips it at once; the server check follows and can take it back. */
export function setCustomCatchphrase(text: string): CustomResult {
  const s = getSave();
  if (!customUnlocked(s)) return { ok: false, error: 'rank' };
  if (text.trim().length > CUSTOM_MAX + 8) return { ok: false, error: 'long' };
  const clean = cleanLine(text);
  if (!clean) return { ok: false, error: 'empty' };
  if (!lineAllowed(clean)) return { ok: false, error: 'blocked' };
  update((x) => {
    if (!x.owned.includes(CUSTOM_ID)) x.owned.push(CUSTOM_ID);
    const d = desk(x); d.cp = { text: clean, at: Date.now() }; d.equip = { ...d.equip, catchphrase: CUSTOM_ID };
  });
  const at = getSave().desk?.cp?.at;
  v4<{ text: string }>('catchphrase.set', { text: clean }).then((r) => {
    update((x) => {
      const cp = x.desk?.cp; if (!cp || cp.at !== at) return;
      if (r.ok) { cp.ok = true; cp.text = r.text || cp.text; }
      else if (r.code === 'CATCHPHRASE_BLOCKED' || r.code === 'CATCHPHRASE_RANK') cp.ok = false; // offline: stays pending, shown locally
    });
  }).catch(() => { /* offline: the line stays local until the next set */ });
  return { ok: true, text: clean };
}
export const customLine = (s: Save = getSave()) => s.desk?.cp || null;
