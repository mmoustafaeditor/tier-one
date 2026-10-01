// Sponsors (CONCEPT4.md §4): the money loop that makes coins feel like income. A brand pays you for being RIGHT, per
// call, scaled by how loud you went (a rate card per right Hint / Post / Drop; a Scoop pays double the Drop rate), plus a
// clean-finish bonus at the end of the term. Wrong calls never cost coins: a wrong Hint is ignored, a wrong Post is a
// warning, a wrong Drop is a strike, and at the tier's strike limit the brand walks (you keep what was paid, you lose the
// bonus, the slot opens). Standing per brand is 0–3 stars: +25% on the rate card per star; a branded look and a
// long-term deal at 3. Nothing here touches a ranked score; every number is in lib/economy.ts SPONSOR.
//
// CONTRACT for the Lens / DMs / results lanes:
//   offersFor(save)                 -> Offer[]      the offers waiting in the DMs (1–3 brands; arrive after results and at week start)
//   accept(id) / decline(id)        -> boolean      the player's answer
//   active(save)                    -> Active[]     the running deal(s) with progress (one; two with Gold)
//   standing(save, brand)           -> Standing     stars 0–3, clean finishes, walks
//   onCall(save, { mode, right, s, scoop }) -> CallOutcome | null   per resolved call, inside the save update (lib/byline.ts Wire)
//   onCallAll(save, call)           -> CallOutcome[] the same, one outcome per running deal (two with Gold; lib/meta.ts)
//   onTermEnd(save)                 -> TermOutcome[]  resolves deals whose term ended (window: after the window; week: when the week turns)
//   refreshOffers(save)             -> Offer[]      lib/meta.ts calls it after every result and at week start (the Lens may call syncSponsors())
//   offerLine(offer) / offerDm      -> i18n keys    "Nine · this week · 15 / 30 / 60 per right call · +400 clean · 1 strike"
//   brandsView(save)                -> BrandView[]  every brand: tier, open or what it wants, standing, running deal, waiting offer (Lens › Sponsors)
//   dealLines(active)               -> SponsorLine[] the brand's lines on a running deal, newest first (paid, warned, struck)
import { update, getSave, type Save } from './save';
import { credit, goldOn, rankIndex, SPONSOR, sponsorRate, type SponsorTier, type SponsorLine, type SponsorGain } from './economy';
import { rankOf } from './byline';

export type Brand = 'volt' | 'nine' | 'tempo' | 'oasis' | 'kickoff' | 'halo';
export type BrandWhat = 'boots' | 'airline' | 'headphones' | 'water' | 'fantasy' | 'phones';
export interface BrandDef { id: Brand; what: BrandWhat; tier: SponsorTier; look: string; accent: string }
/** Fictional brands only. Two per tier; `look` is the branded look a 3-star standing sends. */
export const BRANDS: BrandDef[] = [
  { id: 'volt', what: 'boots', tier: 'local', look: 'dl.volt', accent: '#D6FF3A' },
  { id: 'oasis', what: 'water', tier: 'local', look: 'dl.oasis', accent: '#4FD1E0' },
  { id: 'kickoff', what: 'fantasy', tier: 'national', look: 'dl.kickoff', accent: '#2FBF71' },
  { id: 'tempo', what: 'headphones', tier: 'national', look: 'dl.tempo', accent: '#FF4FA3' },
  { id: 'nine', what: 'airline', tier: 'global', look: 'dl.nine', accent: '#FFD35C' },
  { id: 'halo', what: 'phones', tier: 'global', look: 'dl.halo', accent: '#9AD6F5' },
];
export const brandOf = (id: Brand): BrandDef => BRANDS.find((b) => b.id === id)!;
export type Term = 'window' | 'week';
export interface Offer { id: string; brand: Brand; tier: SponsorTier; term: Term; rate: [number, number, number]; bonus: number; strikes: number; warnFirst: boolean; stars: number; long: boolean; at: number; until: number; week: string; first?: boolean }
export interface Progress { paid: number; right: number; wrong: number; warnings: number; strikes: number; calls: number; windows: number; scoops: number; log?: SponsorLine[] }
export interface Active extends Offer { accepted: number; p: Progress }
export type DoneStatus = 'clean' | 'walked' | 'done';
export interface Done { id: string; brand: Brand; tier: SponsorTier; status: DoneStatus; paid: number; bonus: number; at: number; look?: string }
export interface Standing { stars: number; clean: number; walks: number; paid: number; long?: boolean }
export interface DealsSave { active: Active[]; offers: Offer[]; done: Done[]; standing: Partial<Record<Brand, Standing>>; cool: Partial<Record<Brand, number>>; lastOffer?: string }
declare module './save' { interface Save { deals?: DealsSave } }
export type DealMode = 'daily' | 'career' | 'deadline' | 'room' | 'practice' | 'wire';
/** What counts (CONCEPT4 §4): Daily, Career, Live (deadline) and Market (wire) calls. Groups rounds and Practice never. */
export const COUNTS: Record<DealMode, boolean> = { daily: true, career: true, deadline: true, room: false, wire: true, practice: false };
/** The rate card's log on a running deal keeps this many lines (the deal card shows them, newest first). */
export const LOG_CAP = 12;

const DAY = 864e5;
const hash = (x: string) => { let h = 0x811c9dc5; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
function isoWeek(ms = Date.now()) {
  const x = new Date(ms), t = Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  const dow = (new Date(t).getUTCDay() + 6) % 7, thu = t - dow * DAY + 3 * DAY, y = new Date(thu).getUTCFullYear();
  return { key: y + '-W' + String(1 + Math.floor((thu - Date.UTC(y, 0, 1)) / (7 * DAY))).padStart(2, '0'), start: t - dow * DAY, end: t - dow * DAY + 7 * DAY };
}
const fresh = (): DealsSave => ({ active: [], offers: [], done: [], standing: {}, cool: {} });
export const dealsOf = (s: Save): DealsSave => s.deals || fresh();
const ensure = (s: Save): DealsSave => (s.deals = s.deals || fresh());
export const slotsFor = (s: Save = getSave()): number => (goldOn(s) ? SPONSOR.slots.gold : SPONSOR.slots.free);
export const standing = (s: Save, brand: Brand): Standing => dealsOf(s).standing[brand] || { stars: 0, clean: 0, walks: 0, paid: 0 };
export const active = (s: Save = getSave()): Active[] => dealsOf(s).active;
export const history = (s: Save = getSave()): Done[] => dealsOf(s).done;
/** Is this tier open to the player (rank held + followers)? */
export function tierOpen(tier: SponsorTier, s: Save): boolean {
  const d = SPONSOR.tiers[tier], b = s.byline;
  return rankIndex(rankOf(s)) >= rankIndex(d.rank) && (b ? b.followers : 0) >= d.followers;
}
/** The next tier not yet open, with what it wants (Lens › Deals: "National: Rising rank and 2,000 followers"). */
export function nextTier(s: Save = getSave()): { tier: SponsorTier; rank: string; followers: number } | null {
  const t = (['local', 'national', 'global'] as SponsorTier[]).find((x) => !tierOpen(x, s)); if (!t) return null;
  const d = SPONSOR.tiers[t]; return { tier: t, rank: d.rank, followers: Math.max(0, d.followers - (s.byline?.followers || 0)) };
}

// ---------------------------------------------------------------- offers
function offerFor(b: BrandDef, s: Save, ms: number, first = false): Offer {
  const w = isoWeek(ms), st = standing(s, b.id), def = SPONSOR.tiers[b.tier];
  const long = st.stars >= SPONSOR.maxStars;
  return { id: b.id + ':' + w.key + ':' + (dealsOf(s).done.length + dealsOf(s).active.length), brand: b.id, tier: b.tier, term: long ? 'week' : def.term, rate: sponsorRate(b.tier, st.stars), bonus: def.bonus, strikes: def.strikes, warnFirst: def.warnFirst, stars: st.stars, long, at: ms, until: w.end, week: w.key, first };
}
const eligible = (b: BrandDef, s: Save, ms: number) => { const d = dealsOf(s); return tierOpen(b.tier, s) && !((d.cool[b.id] || 0) > ms) && !d.active.some((a) => a.brand === b.id) && !d.offers.some((o) => o.brand === b.id); };
/** The offers waiting in the DMs right now (pure): what refreshOffers() left there, still inside their week. */
export function offersFor(s: Save = getSave(), ms = Date.now()): Offer[] {
  const d = dealsOf(s);
  return d.offers.filter((o) => o.until > ms && !d.active.some((a) => a.brand === o.brand));
}
/** Drops one to three new offers into the DMs: after results and at the start of a week. The very first is a Local
 *  brand right after the First window ("Saw your first call. Want to make some money?"). Mutates `s`; returns the new ones. */
export function refreshOffers(s: Save, ms = Date.now()): Offer[] {
  const d = ensure(s), w = isoWeek(ms);
  d.offers = d.offers.filter((o) => o.until > ms && !d.active.some((a) => a.brand === o.brand));
  if (d.active.length >= slotsFor(s)) return [];
  if (!((s.stats && s.stats.windows) || 0)) return [];   // nothing before the First window is finished (§4: "from the First window")
  const firstEver = !d.done.length && !d.active.length && !d.offers.length && !d.lastOffer;
  const stamp = w.key + ':' + ((s.stats && s.stats.windows) || 0);
  if (!firstEver && d.lastOffer === stamp) return [];   // one drop per result or week, never a flood
  const pool = BRANDS.filter((b) => eligible(b, s, ms));
  if (!pool.length) return [];
  const h = hash((s.dev || '') + '|' + stamp);
  const want = Math.min(SPONSOR.offersMax, firstEver ? 1 : 1 + (h % 3), Math.max(1, SPONSOR.offersMax - d.offers.length));
  const order = firstEver ? pool.filter((b) => b.tier === 'local').concat(pool.filter((b) => b.tier !== 'local')) : [...pool].sort((a, b) => hash(stamp + a.id) - hash(stamp + b.id));
  const out = order.slice(0, want).map((b) => offerFor(b, s, ms, firstEver));
  d.offers.push(...out); d.lastOffer = stamp;
  return out;
}
export function accept(id: string): boolean {
  let ok = false;
  update((s) => {
    const d = ensure(s), o = offersFor(s).find((x) => x.id === id);
    if (!o || d.active.length >= slotsFor(s)) return;
    d.offers = d.offers.filter((x) => x.id !== id);
    d.active.push({ ...o, accepted: Date.now(), p: { paid: 0, right: 0, wrong: 0, warnings: 0, strikes: 0, calls: 0, windows: 0, scoops: 0, log: [] } });
    ok = true;
  });
  return ok;
}
export function decline(id: string): boolean {
  let ok = false;
  update((s) => { const d = ensure(s), o = d.offers.find((x) => x.id === id); if (!o) return; d.offers = d.offers.filter((x) => x.id !== id); d.cool[o.brand] = Date.now() + SPONSOR.cool.declined * DAY; ok = true; });
  return ok;
}

// ---------------------------------------------------------------- per call (inside the save update)
export interface CallIn { mode: DealMode; right: boolean; s: number; scoop?: boolean; i?: number }
export interface CallOutcome { brand: Brand; paid: number; line: SponsorLine; warning?: boolean; strike?: boolean; walked?: boolean }
const line = (kind: SponsorLine['kind'], brand: Brand, paid: number, v: Record<string, string | number> = {}, i?: number): SponsorLine => ({ i, kind, paid, key: 'e4.sp.line.' + kind, v: { b: 'e4.sp.brand.' + brand + '.n', n: paid, ...v } });
function walk(s: Save, d: DealsSave, a: Active, ms: number): Done {
  d.active = d.active.filter((x) => x.id !== a.id);
  const st = (d.standing[a.brand] = d.standing[a.brand] || { stars: 0, clean: 0, walks: 0, paid: 0 });
  st.walks++; st.stars = Math.max(0, st.stars - 1); st.paid += a.p.paid;
  d.cool[a.brand] = ms + SPONSOR.cool.walked * DAY;
  const done: Done = { id: a.id, brand: a.brand, tier: a.tier, status: 'walked', paid: a.p.paid, bonus: 0, at: ms };
  d.done = [done, ...d.done].slice(0, 40);
  s.stats = s.stats || {}; s.stats.deals_walked = (s.stats.deals_walked || 0) + 1;
  return done;
}
/** One resolved call against every running deal (one; two with Gold). Right pays at once (coins through credit(),
 *  a Scoop at double the Drop rate); wrong moves standing only: a wrong Hint is a quiet miss, a wrong Post a warning,
 *  a wrong Drop a strike (a Global brand warns before its one strike), and at the limit the brand walks. */
export function onCallAll(s: Save, c: CallIn, ms = Date.now()): CallOutcome[] {
  const d = s.deals; if (!d || !d.active.length || !COUNTS[c.mode]) return [];
  const out: CallOutcome[] = [];
  const b = Math.max(0, Math.min(2, c.s));
  for (const a of [...d.active]) {
    a.p.calls++;
    let o: CallOutcome;
    if (c.right) {
      const paid = credit(s, c.scoop ? a.rate[2] * SPONSOR.scoopMult : a.rate[b], 'sponsor:' + a.brand);
      a.p.paid += paid; a.p.right++; if (c.scoop) a.p.scoops++;
      o = { brand: a.brand, paid, line: line(c.scoop ? 'scoop' : 'right', a.brand, paid, {}, c.i) };
    } else {
      a.p.wrong++;
      if (b === 0) o = { brand: a.brand, paid: 0, line: line('miss', a.brand, 0, {}, c.i) };
      else if (b === 1) { a.p.warnings++; o = { brand: a.brand, paid: 0, warning: true, line: line('warn', a.brand, 0, {}, c.i) }; }
      else if (a.warnFirst && a.p.strikes === 0 && a.p.warnings === 0) { a.p.warnings++; o = { brand: a.brand, paid: 0, warning: true, line: line('warn', a.brand, 0, { last: 1 }, c.i) }; }
      else {
        a.p.strikes++;
        if (a.p.strikes >= a.strikes) { walk(s, d, a, ms); o = { brand: a.brand, paid: 0, strike: true, walked: true, line: line('walked', a.brand, 0, { kept: a.p.paid }, c.i) }; }
        else o = { brand: a.brand, paid: 0, strike: true, line: line('strike', a.brand, 0, { left: a.strikes - a.p.strikes }, c.i) };
      }
    }
    a.p.log = [o.line, ...(a.p.log || [])].slice(0, LOG_CAP);
    out.push(o);
  }
  return out;
}
/** The first running deal's outcome for one call (the Market's resolver in lib/byline.ts keeps this shape). Every
 *  running deal still moves; use onCallAll() for every deal's line. */
export function onCall(s: Save, c: CallIn, ms = Date.now()): CallOutcome | null { return onCallAll(s, c, ms)[0] || null; }
export interface TermOutcome { brand: Brand; tier: SponsorTier; status: DoneStatus; paid: number; bonus: number; line: SponsorLine; star?: number; look?: string; long?: boolean }
function finish(s: Save, d: DealsSave, a: Active, ms: number): TermOutcome {
  d.active = d.active.filter((x) => x.id !== a.id);
  const st = (d.standing[a.brand] = d.standing[a.brand] || { stars: 0, clean: 0, walks: 0, paid: 0 });
  const clean = a.p.strikes === 0;
  let bonus = 0, star: number | undefined, look: string | undefined;
  if (clean) {
    bonus = credit(s, a.bonus, 'sponsor:' + a.brand + ':bonus');
    st.clean++;
    if (st.stars < SPONSOR.maxStars) { st.stars++; star = st.stars; }
    if (st.stars >= SPONSOR.maxStars) {
      const id = brandOf(a.brand).look;
      if (!s.owned.includes(id)) { s.owned.push(id); look = id; s.desk = s.desk || { equip: {} }; s.desk.fresh = [...(s.desk.fresh || []), id].slice(-12); }
      st.long = true;
    }
  }
  st.paid += a.p.paid + bonus;
  d.cool[a.brand] = ms + SPONSOR.cool.clean * DAY;
  const done: Done = { id: a.id, brand: a.brand, tier: a.tier, status: clean ? 'clean' : 'done', paid: a.p.paid, bonus, at: ms, look };
  d.done = [done, ...d.done].slice(0, 40);
  s.stats = s.stats || {}; s.stats.deals_paid = (s.stats.deals_paid || 0) + 1; if (clean) s.stats.deals_clean = (s.stats.deals_clean || 0) + 1;
  return { brand: a.brand, tier: a.tier, status: done.status, paid: a.p.paid, bonus, star, look, long: st.long, line: line(clean ? 'bonus' : 'done', a.brand, bonus, { paid: a.p.paid, stars: st.stars }) };
}
/** Ends the terms that are over: every window deal after a window (`afterWindow`), every week deal once its week has
 *  turned. Call inside update() after the window's calls went through onCall. */
export function onTermEnd(s: Save, opts: { afterWindow?: boolean } = {}, ms = Date.now()): TermOutcome[] {
  const d = s.deals; if (!d || !d.active.length) return [];
  const week = isoWeek(ms).key, out: TermOutcome[] = [];
  for (const a of [...d.active]) {
    if (a.term === 'window') { if (opts.afterWindow) { a.p.windows++; out.push(finish(s, d, a, ms)); } }
    else if (a.week !== week) out.push(finish(s, d, a, ms));
    else if (opts.afterWindow) a.p.windows++;
  }
  return out;
}
/** The Lens / DMs lane calls this on open: a week that turned while the app was closed settles, and new offers land. */
export function syncSponsors(): { ended: TermOutcome[]; offers: Offer[] } { let out = { ended: [] as TermOutcome[], offers: [] as Offer[] }; update((s) => { out = { ended: onTermEnd(s), offers: refreshOffers(s) }; }); return out; }
/** Folds a window's call outcomes and term ends into the Gain's sponsor block (lib/meta.ts). */
export function sponsorGain(calls: CallOutcome[], ends: TermOutcome[]): SponsorGain | undefined {
  const first = calls[0] || null, end = ends[0] || null;
  if (!first && !end) return undefined;
  const brand = (first ? first.brand : end!.brand), tier = end ? end.tier : brandOf(brand).tier;
  const lines = [...calls.map((c) => c.line), ...ends.map((e) => e.line)];
  if (end?.star) lines.push(line('star', brand, 0, { stars: end.star }));
  if (end?.look) lines.push(line('look', brand, 0, { look: end.look }));
  const walked = calls.some((c) => c.walked && c.brand === brand);
  return { brand, tier, paid: calls.reduce((n, c) => n + c.paid, 0) + (end ? end.bonus : 0), lines, bonus: end?.bonus || undefined, walked: walked || undefined, star: end?.star, look: end?.look };
}

// ---------------------------------------------------------------- words (i18n keys in i18n/parts/economy4.ts)
/** The one-line offer: "Nine · this week · 15 / 30 / 60 per right call · +400 clean · 1 strike". */
export const offerLine = (o: Offer | Active) => ({ key: 'e4.sp.offer.line', v: { b: 'e4.sp.brand.' + o.brand + '.n', term: 'e4.sp.term.' + o.term, h: o.rate[0], p: o.rate[1], d: o.rate[2], bonus: o.bonus, strikes: o.strikes } });
/** The DM that carries an offer: the first one is "Saw your first call. Want to make some money?" */
export const offerDm = (o: Offer) => ({ key: o.first ? 'e4.sp.offer.first' : 'e4.sp.offer.dm', v: { b: 'e4.sp.brand.' + o.brand + '.n' } });
/** Strikes left and warnings on a running deal, for the deal card. */
export const dealState = (a: Active) => ({ strikesLeft: Math.max(0, a.strikes - a.p.strikes), warnings: a.p.warnings, paid: a.p.paid, right: a.p.right, clean: a.p.strikes === 0 });
export const dealDaysLeft = (a: Active, ms = Date.now()) => (a.term === 'week' ? Math.max(0, Math.ceil((a.until - ms) / DAY)) : null);

// ---------------------------------------------------------------- what the Lens › Sponsors screen reads
const TIERS: SponsorTier[] = ['local', 'national', 'global'];
export interface BrandView { def: BrandDef; open: boolean; standing: Standing; active?: Active; offer?: Offer; cooling?: number; next: { rank: string; followers: number } | null }
/** Every brand, in tier order: whether its tier is open (and what it wants if not), standing, the running deal and a
 *  waiting offer. Pure. */
export function brandsView(s: Save = getSave(), ms = Date.now()): BrandView[] {
  const d = dealsOf(s), offers = offersFor(s, ms);
  return TIERS.flatMap((tier) => BRANDS.filter((b) => b.tier === tier)).map((def) => {
    const open = tierOpen(def.tier, s), t = SPONSOR.tiers[def.tier];
    const cool = d.cool[def.id] || 0;
    return { def, open, standing: standing(s, def.id), active: d.active.find((a) => a.brand === def.id), offer: offers.find((o) => o.brand === def.id), cooling: cool > ms ? cool : undefined, next: open ? null : { rank: t.rank, followers: Math.max(0, t.followers - (s.byline?.followers || 0)) } };
  });
}
/** The brand's lines on a running deal, newest first (each "Volt: nice one. +16", "Volt: careful."). */
export const dealLines = (a: Active): SponsorLine[] => a.p.log || [];
/** Coins a deal would pay for a clean finish on top of what it has paid (the deal card's "+60 if you finish clean"). */
export const bonusAtStake = (a: Active) => (a.p.strikes === 0 ? a.bonus : 0);
/** The rate card with the brand's star boost shown apart: base card, the card on offer, the % on top. */
export const rateCard = (o: Offer | Active) => ({ base: SPONSOR.tiers[o.tier].rate as readonly number[], rate: o.rate, pct: Math.round(SPONSOR.starRate * 100 * o.stars), scoop: o.rate[2] * SPONSOR.scoopMult });
export const SPONSOR_TIERS = TIERS;
