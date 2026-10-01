// Brand deals (CONCEPT4.md §4): the money loop that makes coins feel like income. A brand slides into your DMs when you
// cross a follower + Rep bar. A deal = a term (this window / this week) + one-line condition + a payout (150 → 600
// coins as you grow; the big brands add a branded look). One active deal at a time, two with Gold. A wrong Drop during
// a deal: "<Brand> has pulled out." You lose the payout, nothing else; the brand comes back later.
// Deals never touch a ranked score. Everything here is local, deterministic per account and week, and idempotent.
//
// CONTRACT for the Lens / DMs / results lanes:
//   offersFor(save)            -> Offer[]       the offers open right now (pure; nothing is written until accept)
//   accept(id) / decline(id)   -> boolean       the player's answer in the DM
//   active(save)               -> ActiveDeal[]  what's running (with progress), for Lens › Deals and the DM thread
//   evaluate(save, result, mode) -> DealOutcome | null   called by lib/meta.ts on*Done inside the save update
//   settle(save)               -> DealOutcome[] resolves week deals whose week has ended (lib/meta.ts calls it; the
//                                               Lens lane may call syncDeals() on open)
//   dealLine(deal)             -> { key, v }    the i18n key + vars of the one-line condition (i18n/parts/economy4.ts)
//   slotsFor(save)             -> 1 | 2
import { update, getSave, type Save } from './save';
import { credit, levelOf, xpOf, goldOn } from './economy';
import type { CallLite } from './byline';

export type Brand = 'volt' | 'nine' | 'tempo' | 'oasis' | 'kickoff' | 'halo';
export type BrandWhat = 'boots' | 'airline' | 'headphones' | 'water' | 'fantasy' | 'phones';
export interface BrandDef { id: Brand; what: BrandWhat; bar: { followers: number; rep: number }; base: number; big: boolean; look: string; accent: string }
/** Fictional brands only. `bar` is the follower + Rep line that opens the brand's DMs; `base` its payout at level 1. */
export const BRANDS: BrandDef[] = [
  { id: 'volt', what: 'boots', bar: { followers: 300, rep: 32 }, base: 150, big: false, look: 'dl.volt', accent: '#D6FF3A' },
  { id: 'oasis', what: 'water', bar: { followers: 1500, rep: 40 }, base: 200, big: false, look: 'dl.oasis', accent: '#4FD1E0' },
  { id: 'kickoff', what: 'fantasy', bar: { followers: 4000, rep: 45 }, base: 250, big: false, look: 'dl.kickoff', accent: '#2FBF71' },
  { id: 'tempo', what: 'headphones', bar: { followers: 10000, rep: 55 }, base: 350, big: true, look: 'dl.tempo', accent: '#FF4FA3' },
  { id: 'nine', what: 'airline', bar: { followers: 25000, rep: 65 }, base: 450, big: true, look: 'dl.nine', accent: '#FFD35C' },
  { id: 'halo', what: 'phones', bar: { followers: 60000, rep: 75 }, base: 600, big: true, look: 'dl.halo', accent: '#9AD6F5' },
];
export const brandOf = (id: Brand): BrandDef => BRANDS.find((b) => b.id === id)!;
export type Term = 'window' | 'week';
export type Cond = 'repAbove' | 'rightCalls' | 'scoop' | 'noWrongDrop' | 'playDaily';
export const DEALS = {
  payoutMin: 150, payoutMax: 600, perLevel: 5,          // payout = min(600, base + 5 × (level − 1)), rounded to 10
  coolPaid: 14, coolPulled: 7, coolMissed: 5,            // days before the brand comes back
  windowConds: ['repAbove', 'rightCalls', 'scoop', 'noWrongDrop'] as Cond[],
  weekConds: ['playDaily', 'rightCalls', 'noWrongDrop', 'repAbove'] as Cond[],
  rightCalls: { window: 3, week: 5 }, playDailyMin: 3,  // a week deal offered late in the week still asks for 3 days
  slots: { free: 1, gold: 2 },
} as const;

export interface Offer { id: string; brand: Brand; term: Term; cond: Cond; n: number; payout: number; look?: string; at: number; until: number; week: string }
export interface DealProgress { right: number; scoop: boolean; wrongDrop: boolean; days: string[]; windows: number }
export interface ActiveDeal extends Offer { accepted: number; p: DealProgress }
export type DealStatus = 'paid' | 'pulled' | 'missed';
export interface DealDone { id: string; brand: Brand; status: DealStatus; coins: number; at: number; look?: string; cond: Cond; term: Term }
export interface DealsSave { active: ActiveDeal[]; done: DealDone[]; declined: string[]; cool: Record<string, number> }
export interface DealOutcome { id: string; brand: Brand; status: DealStatus; coins: number; look?: string }
declare module './save' { interface Save { deals?: DealsSave } }

const DAY = 864e5;
const hash = (x: string) => { let h = 0x811c9dc5; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
const ymd = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);
function isoWeek(ms = Date.now()) {
  const x = new Date(ms), t = Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  const dow = (new Date(t).getUTCDay() + 6) % 7, thu = t - dow * DAY + 3 * DAY, y = new Date(thu).getUTCFullYear();
  return { key: y + '-W' + String(1 + Math.floor((thu - Date.UTC(y, 0, 1)) / (7 * DAY))).padStart(2, '0'), start: t - dow * DAY, end: t - dow * DAY + 7 * DAY };
}
export const dealsOf = (s: Save): DealsSave => s.deals || { active: [], done: [], declined: [], cool: {} };
const ensure = (s: Save): DealsSave => (s.deals = s.deals || { active: [], done: [], declined: [], cool: {} });
export const slotsFor = (s: Save = getSave()): number => (goldOn(s) ? DEALS.slots.gold : DEALS.slots.free);
/** Payout at a level: 150 → 600 as you grow, rounded to 10. */
export const payoutFor = (brand: BrandDef, level: number) => Math.min(DEALS.payoutMax, Math.round((brand.base + DEALS.perLevel * Math.max(0, level - 1)) / 10) * 10);
/** Has the player crossed this brand's bar? */
export const barCrossed = (brand: BrandDef, s: Save) => { const b = s.byline; return !!b && b.followers >= brand.bar.followers && b.rep >= brand.bar.rep; };
/** The next brand not yet reached, with how far the bars are (Lens › Deals "Volt wants 300 followers and Rep 32"). */
export function nextBar(s: Save = getSave()): { brand: BrandDef; followers: number; rep: number } | null {
  const b = s.byline || { followers: 0, rep: 0 };
  const nx = BRANDS.find((x) => !barCrossed(x, s)); if (!nx) return null;
  return { brand: nx, followers: Math.max(0, nx.bar.followers - b.followers), rep: Math.max(0, nx.bar.rep - b.rep) };
}

// ---------------------------------------------------------------- offers (pure)
function offerFor(brand: BrandDef, s: Save, ms: number): Offer {
  const w = isoWeek(ms), h = hash((s.dev || '') + '|' + brand.id + '|' + w.key);
  const term: Term = h % 3 === 0 ? 'week' : 'window';
  const pool = term === 'week' ? DEALS.weekConds : DEALS.windowConds;
  let cond = pool[(h >>> 4) % pool.length];
  const daysLeft = Math.max(1, Math.ceil((w.end - ms) / DAY));
  if (cond === 'playDaily' && daysLeft < DEALS.playDailyMin) cond = 'rightCalls';
  const n = cond === 'rightCalls' ? DEALS.rightCalls[term] : cond === 'repAbove' ? brand.bar.rep : cond === 'playDaily' ? Math.min(7, daysLeft) : 1;
  return { id: brand.id + ':' + w.key, brand: brand.id, term, cond, n, payout: payoutFor(brand, levelOf(xpOf(s)).n), look: brand.big ? brand.look : undefined, at: w.start, until: w.end, week: w.key };
}
/** The offers open right now: every brand whose bar is crossed, not cooling down, not active, not declined this week. */
export function offersFor(s: Save = getSave(), ms = Date.now()): Offer[] {
  const d = dealsOf(s), w = isoWeek(ms);
  return BRANDS.filter((b) => barCrossed(b, s) && !(d.cool[b.id] > ms) && !d.active.some((a) => a.brand === b.id) && !d.declined.includes(b.id + ':' + w.key)).map((b) => offerFor(b, s, ms));
}
export const active = (s: Save = getSave()): ActiveDeal[] => dealsOf(s).active;
export const history = (s: Save = getSave()): DealDone[] => dealsOf(s).done;
/** Lens badge: offers waiting + deals paid but not yet seen. */
export const offersWaiting = (s: Save = getSave()) => offersFor(s).length;

// ---------------------------------------------------------------- accept / decline
export function accept(id: string): boolean {
  let ok = false;
  update((s) => {
    const d = ensure(s), o = offersFor(s).find((x) => x.id === id);
    if (!o || d.active.length >= slotsFor(s)) return;
    d.active.push({ ...o, accepted: Date.now(), p: { right: 0, scoop: false, wrongDrop: false, days: [], windows: 0 } });
    ok = true;
  });
  return ok;
}
export function decline(id: string): boolean {
  let ok = false;
  update((s) => { const d = ensure(s); if (!offersFor(s).some((x) => x.id === id) || d.declined.includes(id)) return; d.declined = [id, ...d.declined].slice(0, 24); ok = true; });
  return ok;
}

// ---------------------------------------------------------------- evaluation (inside the save update)
export type DealMode = 'daily' | 'career' | 'deadline' | 'room' | 'practice' | 'wire';
const COUNTS: Record<DealMode, boolean> = { daily: true, career: true, deadline: true, room: true, practice: false, wire: false };
function finish(s: Save, d: DealsSave, a: ActiveDeal, status: DealStatus, ms: number): DealOutcome {
  d.active = d.active.filter((x) => x.id !== a.id);
  let look: string | undefined;
  let coins = 0;
  if (status === 'paid') {
    coins = credit(s, a.payout, 'deal:' + a.brand);
    if (a.look && !s.owned.includes(a.look)) { s.owned.push(a.look); look = a.look; s.desk = s.desk || { equip: {} }; s.desk.fresh = [...(s.desk.fresh || []), a.look].slice(-12); }
  }
  d.cool[a.brand] = ms + DAY * (status === 'paid' ? DEALS.coolPaid : status === 'pulled' ? DEALS.coolPulled : DEALS.coolMissed);
  d.done = [{ id: a.id, brand: a.brand, status, coins, at: ms, look, cond: a.cond, term: a.term }, ...d.done].slice(0, 40);
  s.stats = s.stats || {};
  s.stats['deals_' + status] = (s.stats['deals_' + status] || 0) + 1;
  return { id: a.id, brand: a.brand, status, coins: status === 'paid' ? coins : a.payout, look };
}
const met = (a: ActiveDeal, rep: number) => (a.cond === 'repAbove' ? rep >= a.n : a.cond === 'rightCalls' ? a.p.right >= a.n : a.cond === 'scoop' ? a.p.scoop : a.cond === 'noWrongDrop' ? !a.p.wrongDrop : a.p.days.length >= a.n);
/** Resolves week deals whose week has ended, and repAbove deals that have dropped under the line. Mutates `s`. */
export function settle(s: Save, ms = Date.now()): DealOutcome[] {
  const d = s.deals; if (!d || !d.active.length) return [];
  const out: DealOutcome[] = [], rep = s.byline?.rep ?? 0, week = isoWeek(ms).key;
  for (const a of [...d.active]) {
    if (a.cond === 'repAbove' && rep < a.n) { out.push(finish(s, d, a, 'missed', ms)); continue; }
    if (a.term === 'week' && a.week !== week) out.push(finish(s, d, a, met(a, rep) ? 'paid' : 'missed', ms));
  }
  return out;
}
/** One finished window against every active deal. Call inside update(), after the byline moved (rep is current).
 *  Practice and the Wire never count. Returns the first deal that resolved (paid / pulled / missed), or null. */
export function evaluate(s: Save, per: CallLite[], mode: DealMode, ms = Date.now()): DealOutcome | null {
  const d = s.deals; if (!d || !d.active.length) return settle(s, ms)[0] || null;
  const settled = settle(s, ms);
  if (!COUNTS[mode]) return settled[0] || null;
  const rep = s.byline?.rep ?? 0, day = ymd(ms);
  const calls = per.filter((p) => p.called);
  const right = calls.filter((p) => p.right).length, scoop = calls.some((p) => p.scoop), wrongDrop = calls.some((p) => !p.right && p.s === 2);
  const out: DealOutcome[] = [...settled];
  for (const a of [...d.active]) {
    a.p.windows++; a.p.right += right; a.p.scoop = a.p.scoop || scoop; a.p.wrongDrop = a.p.wrongDrop || wrongDrop;
    if (mode === 'daily' && !a.p.days.includes(day)) a.p.days.push(day);
    if (wrongDrop) { out.push(finish(s, d, a, 'pulled', ms)); continue; }   // "Volt has pulled out."
    if (a.term === 'window') { out.push(finish(s, d, a, met(a, rep) ? 'paid' : 'missed', ms)); continue; }
    // week: pay as soon as the condition can't be undone (right calls / a Scoop); the rest waits for the week to end
    if ((a.cond === 'rightCalls' || a.cond === 'scoop') && met(a, rep)) out.push(finish(s, d, a, 'paid', ms));
    else if (a.cond === 'playDaily' && a.p.days.length >= a.n) out.push(finish(s, d, a, 'paid', ms));
  }
  return out[0] || null;
}
/** The Lens lane calls this on open so a week that ended while the app was closed still pays. */
export function syncDeals(): DealOutcome[] { let out: DealOutcome[] = []; update((s) => { out = settle(s); }); return out; }

// ---------------------------------------------------------------- words (i18n keys in i18n/parts/economy4.ts)
/** The one-line condition: `t(key, v)`. */
export function dealLine(d: Offer | ActiveDeal | DealDone): { key: string; v: Record<string, string | number> } {
  const n = 'n' in d ? d.n : 0;
  return { key: 'e4.deal.cond.' + d.cond + (d.term === 'week' && d.cond === 'rightCalls' ? 'Week' : ''), v: { n } };
}
/** Progress toward the condition: [have, need] (a bar on the deal card). */
export function dealProgress(a: ActiveDeal, s: Save = getSave()): [number, number] {
  const rep = s.byline?.rep ?? 0;
  switch (a.cond) {
    case 'repAbove': return [Math.min(rep, a.n), a.n];
    case 'rightCalls': return [Math.min(a.p.right, a.n), a.n];
    case 'scoop': return [a.p.scoop ? 1 : 0, 1];
    case 'noWrongDrop': return [a.p.wrongDrop ? 0 : 1, 1];
    default: return [Math.min(a.p.days.length, a.n), a.n];
  }
}
/** Days left on a deal (a week deal) or null for a window deal. */
export const dealDaysLeft = (a: ActiveDeal, ms = Date.now()) => (a.term === 'week' ? Math.max(0, Math.ceil((a.until - ms) / DAY)) : null);
