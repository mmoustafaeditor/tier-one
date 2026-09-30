// Earned-only looks (GOTY.md §8.4, §12): the rules in lib/catalog.ts `earn` evaluated against the save. They are
// never priced, never gifted and never on sale; the collection book shows how each one is won.
//   story n      the Story has reached chapter index n (save.story.chapterSeen >= n: n chapters behind you)
//   rank ref     your byline has reached that rep tier (blogger … tierone), or did once (desk.peak keeps it)
//   streak n     your best Daily streak is at least n
//   rivalry ref  you hold the trophy over that rival (save.rivals[ref].trophy)
//   referral n   n friends you brought finished their first window (server-confirmed)
//   other vias   granted by the lane that runs them: grantEarned(id) (Deadline Day Live, events, anniversaries)
// Reading a rule never writes the save; syncEarned() copies met rules into save.owned so an earned look stays yours.
import type { Save } from './save';
import { update } from './save';
import { REP_TIERS, repTier, bylineOf } from './byline';
import { earnedItems, type Earn, type Item } from './catalog';

const TIER_IDS = REP_TIERS.map(([id]) => id as string);
const tierIx = (id: string) => TIER_IDS.indexOf(id);
/** The highest rep tier this save has reached (current, or the high-water mark kept in desk.peak). */
export function peakTier(s: Save): string {
  const now = repTier(bylineOf(s).rep);
  const kept = s.desk?.peak || 'blogger';
  return tierIx(kept) > tierIx(now) ? kept : now;
}
export function earnMet(e: Earn, s: Save): boolean {
  switch (e.via) {
    case 'story': return (s.story?.chapterSeen ?? 0) >= (e.n ?? 1);
    case 'rank': return tierIx(peakTier(s)) >= Math.max(0, tierIx(e.ref || 'tierone'));
    case 'streak': return Math.max(s.streak?.best || 0, s.streak?.n || 0) >= (e.n ?? 1);
    case 'rivalry': return !!(e.ref && s.rivals?.[e.ref]?.trophy);
    case 'referral': return (s.wallet?.ref?.friends || 0) >= (e.n ?? 1);
    default: return false;
  }
}
/** Progress toward a rule, for the collection book: [have, need]. */
export function earnProgress(e: Earn, s: Save): [number, number] {
  switch (e.via) {
    case 'story': return [Math.min(s.story?.chapterSeen ?? 0, e.n ?? 1), e.n ?? 1];
    case 'rank': return [Math.min(tierIx(peakTier(s)), tierIx(e.ref || 'tierone')), tierIx(e.ref || 'tierone')];
    case 'streak': return [Math.min(Math.max(s.streak?.best || 0, s.streak?.n || 0), e.n ?? 1), e.n ?? 1];
    case 'referral': return [Math.min(s.wallet?.ref?.friends || 0, e.n ?? 1), e.n ?? 1];
    default: return [earnMet(e, s) ? 1 : 0, 1];
  }
}
export const isEarnedBy = (it: Item, s: Save) => it.source === 'earned' && !!it.earn && (s.owned.includes(it.id) || earnMet(it.earn, s));
/** Copies every met rule into save.owned and keeps the rank high-water mark. Idempotent; call on "Your desk" open. */
export function syncEarned(): string[] {
  const out: string[] = [];
  update((s) => {
    const peak = peakTier(s);
    s.desk = s.desk || { equip: {} };
    if (s.desk.peak !== peak) s.desk.peak = peak;
    for (const it of earnedItems()) if (it.earn && !s.owned.includes(it.id) && earnMet(it.earn, s)) { s.owned.push(it.id); out.push(it.id); }
  });
  return out;
}
/** For the lanes that run the other rules (Deadline Day Live, events): grant one earned-only look. Idempotent. */
export function grantEarned(id: string): boolean {
  if (!earnedItems().some((x) => x.id === id)) return false;
  let ok = false;
  update((s) => { if (!s.owned.includes(id)) { s.owned.push(id); ok = true; } });
  return ok;
}
