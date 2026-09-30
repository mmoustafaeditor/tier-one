// Money switches for Tier One (GOTY.md §3), the house pattern from games/the-gaffer/web/src/monet.ts.
// Everything is OFF: with `enabled: false` and `ads: false` the game makes no ad or payment requests at all, the Gold
// lane shows "Coming soon" with its full reward preview, and every stub below resolves false.
// What can ever be sold: the Gold lane (cosmetics and +10% coins) and coin packs. Never score, sources or Daily edge.
import { update, getSave } from './save';
import { seasonAt, syncSeason, today } from './season';
import { MISSIONS } from './progress';

export interface CoinPack { id: string; price: string; coins: number; bonus: string; url: string }
export const MONET = {
  // Master switch for purchases. Stays false until a verified payment flow exists (Stripe link + server check).
  enabled: false,
  // Rewarded ads (one a day, solo only, 2× mission coins). Needs the Android bridge or an AdSense client below.
  ads: false,
  goldPrice: '€4.99',
  // Stripe Payment Link for this season's Gold lane; success URL ?session_id={CHECKOUT_SESSION_ID}.
  goldUrl: '',
  packs: [
    { id: 'p100', price: '€0.99', coins: 100, bonus: '', url: '' },
    { id: 'p550', price: '€4.99', coins: 550, bonus: '+10%', url: '' },
    { id: 'p1200', price: '€9.99', coins: 1200, bonus: '+20%', url: '' },
  ] as CoinPack[],
  adsenseClient: '',
  verifyEndpoint: '/api/tier-one/verify-purchase',
};

// Android: the wrapper can expose window.TierAds (AdMob rewarded). Not present = no Android ads.
interface TierAds { rewarded: (callback: string) => void }
type AdBreak = (o: Record<string, unknown>) => void;
declare global { interface Window { TierAds?: TierAds; adBreak?: AdBreak; __tierReward?: (ok: boolean) => void } }
const onWeb = () => typeof location !== 'undefined' && /^https?:$/.test(location.protocol);

export const goldOnSale = () => MONET.enabled && !!MONET.goldUrl && onWeb();
export const packsOnSale = () => MONET.enabled && MONET.packs.some((p) => p.url) && onWeb();
export const rewardedAvailable = () => MONET.ads && (!!window.TierAds?.rewarded || (!!MONET.adsenseClient && !!window.adBreak));

// Opens checkout for this season's Gold lane. Resolves false when sales are off. The unlock itself happens only in
// checkPurchase(), after the server confirms payment.
export async function buyGold(): Promise<boolean> {
  if (!goldOnSale()) return false;
  const sid = seasonAt().id;
  location.href = MONET.goldUrl + (MONET.goldUrl.includes('?') ? '&' : '?') + 'client_reference_id=' + encodeURIComponent(getSave().dev + ':' + sid);
  return true;
}
export async function buyPack(id: string): Promise<boolean> {
  const p = MONET.packs.find((x) => x.id === id);
  if (!p || !p.url || !packsOnSale()) return false;
  location.href = p.url + (p.url.includes('?') ? '&' : '?') + 'client_reference_id=' + encodeURIComponent(getSave().dev);
  return true;
}
// After Stripe sends the player back: ask the server; each session unlocks once. Resolves null when off or absent.
export async function checkPurchase(): Promise<{ ok: boolean; kind?: 'gold' | 'pack'; coins?: number } | null> {
  if (!MONET.enabled || !onWeb()) return null;
  const sid = new URLSearchParams(location.search).get('session_id');
  const paid = getSave().stats;
  if (!sid || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid) || paid['pay:' + sid]) return null;
  history.replaceState(null, '', location.pathname + location.hash);
  try {
    const r = await fetch(`${MONET.verifyEndpoint}?session_id=${encodeURIComponent(sid)}`, { cache: 'no-store' });
    const j = await r.json();
    if (j.ok !== true) return { ok: false };
    update((s) => {
      s.stats['pay:' + sid] = Date.now();
      if (j.kind === 'gold') syncSeason(s).gold = true;
      else if (j.kind === 'pack' && typeof j.coins === 'number') { s.credits += j.coins; s.ledger = [{ at: Date.now(), d: j.coins, why: 'pack:' + j.pack }, ...s.ledger].slice(0, 30); }
    });
    return { ok: true, kind: j.kind, coins: j.coins };
  } catch { return { ok: false }; }
}

// Shows a rewarded ad; resolves true only when watched to the end. False when ads are off.
export function showRewarded(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!MONET.ads) { resolve(false); return; }
    if (window.TierAds?.rewarded) {
      window.__tierReward = (ok: boolean) => { window.__tierReward = undefined; resolve(!!ok); };
      window.TierAds.rewarded('__tierReward');
      return;
    }
    if (!window.adBreak) { resolve(false); return; }
    let viewed = false;
    window.adBreak({ type: 'reward', name, beforeReward: (show: () => void) => show(), adViewed: () => { viewed = true; }, adDismissed: () => { viewed = false; }, adBreakDone: () => resolve(viewed) });
  });
}

// ---------- 2× mission coins: one rewarded ad a day, after results, in solo modes only (never rooms).
type Mode = 'daily' | 'practice' | 'story' | 'career' | 'room' | 'wire';
const claimedCoins = () => {
  const s = getSave(), ms = s.missions;
  if (!ms || ms.day !== today()) return 0;
  return ms.claimed.reduce((n, id) => n + (MISSIONS.find((m) => m.id === id)?.coins || 0), 0);
};
export function canDoubleMissions(mode: Mode): boolean {
  if (mode === 'room' || !rewardedAvailable()) return false;
  return getSave().adDay !== today() && claimedCoins() > 0;
}
// Resolves to the coins added (0 when unavailable or the ad was skipped).
export async function doubleMissions(mode: Mode): Promise<number> {
  if (!canDoubleMissions(mode)) return 0;
  const ok = await showRewarded('missions2x');
  if (!ok) return 0;
  const n = claimedCoins();
  let paid = 0;
  update((s) => {
    if (s.adDay === today() || !n) return;
    s.adDay = today(); paid = n;
    s.credits += n; s.ledger = [{ at: Date.now(), d: n, why: 'ad:missions' }, ...s.ledger].slice(0, 30);
  });
  return paid;
}
