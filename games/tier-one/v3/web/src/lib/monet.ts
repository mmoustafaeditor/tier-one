// Payments (LAUNCH_BRIEF §22, §24; docs/spec/E-economy.md §6): ONE flag. While `PAYMENTS.enabled` is false the game
// makes no payment request, the Store shows credit packs as a plain price list with no buy button, and the only ways to
// get credits are the ones earned by play (lib/wallet.ts CREDITS_EARN). Coins are never sold. There are no adverts.
// Turning payments on: set `enabled: true` and `verifyEndpoint`, register a purchase flow (lib/wallet.ts setPurchaseFlow:
// Stripe Checkout on the web, Play Billing in the Android wrapper) and let api/tier-one/v4 wallet.purchase.verify grant.
import { getSave, update } from './save';

export const PAYMENTS = {
  /** Master switch for every purchase. Stays false until a verified payment flow exists (Stripe/Play + server check). */
  enabled: false,
  /** Where a returning Stripe Checkout session is verified (api/tier-one/v4 wallet.purchase.verify, via the web wrapper). */
  verifyEndpoint: '/api/tier-one/verify-purchase',
};
const onWeb = () => typeof location !== 'undefined' && /^https?:$/.test(location.protocol);
/** True only when a real purchase can happen right now. Every "buy with money" control reads this and nothing else. */
export const paymentsOn = () => PAYMENTS.enabled && onWeb();

/** After Stripe sends the player back (?session_id=cs_…): ask the server; each session grants once. Null when off or
 *  absent. Credits land through lib/wallet.ts applyPurchase (idempotent per receipt). */
export async function checkPurchase(): Promise<{ ok: boolean; pack?: string; credits?: number } | null> {
  if (!paymentsOn()) return null;
  const sid = new URLSearchParams(location.search).get('session_id');
  if (!sid || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid) || getSave().stats['pay:' + sid]) return null;
  history.replaceState(null, '', location.pathname + location.hash);
  try {
    const r = await fetch(`${PAYMENTS.verifyEndpoint}?session_id=${encodeURIComponent(sid)}`, { cache: 'no-store' });
    const j = await r.json();
    if (j.ok !== true || typeof j.credits !== 'number' || typeof j.pack !== 'string') return { ok: false };
    update((s) => { s.stats['pay:' + sid] = Date.now(); });
    const { applyPurchase } = await import('./wallet');
    applyPurchase(sid, j.pack);
    return { ok: true, pack: j.pack, credits: j.credits };
  } catch { return { ok: false }; }
}
