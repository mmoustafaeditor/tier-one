// Semba Credits on this device. META state: the simulation never reads it (sim/** does not import meta/**), so
// nothing bought or earned here can change a result, a rating or a player. On the web the wallet is local only and
// shared with Tier One through the same origin; nothing is sold. Rewarded ads pay credits only (studio decision).
const KEY = 'semba.credits.v1';
const ADS = 'semba.ads.v1';
export const AD_REWARD = 25;
export const ADS_PER_DAY = 4;

const today = () => new Date().toISOString().slice(0, 10);
export function credits(): number {
  try { return Math.max(0, Math.floor(Number(localStorage.getItem(KEY)) || 0)); } catch { return 0; }
}
export function addCredits(n: number): number {
  const v = credits() + n;
  try { localStorage.setItem(KEY, String(v)); } catch { /* storage blocked: the credit lasts this session only */ }
  return v;
}
export function adsWatchedToday(): number {
  try { const a = JSON.parse(localStorage.getItem(ADS) ?? 'null') as [string, number] | null; return a && a[0] === today() ? a[1] : 0; } catch { return 0; }
}
export function countAd() {
  try { localStorage.setItem(ADS, JSON.stringify([today(), adsWatchedToday() + 1])); } catch { /* ignore */ }
}
