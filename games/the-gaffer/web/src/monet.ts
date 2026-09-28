// Monetization switches. Everything is OFF until an id is filled in, so a build without them makes no ad or
// payment requests at all. See games/the-gaffer/MONETIZATION.md for the plan and the setup steps.
export const MONET = {
  // Google AdSense publisher id ("ca-pub-…"). Turns on web ads: the Home sponsor card and optional rewarded ads.
  adsenseClient: '',
  // Display ad slot id for the Home sponsor card.
  adsenseSlotHome: '',
  // Stripe Payment Link for the Supporter pack. Its success URL must be
  // https://sembagames.app/the-gaffer/?session_id={CHECKOUT_SESSION_ID}
  supporterUrl: '',
  // Where the game checks a finished Stripe payment (api/the-gaffer/verify-purchase.js).
  verifyEndpoint: '/api/the-gaffer/verify-purchase',
};

// Android: MainActivity can expose window.GafferAds (AdMob rewarded ads). Not present = no Android ads.
interface GafferAds { rewarded: (callback: string) => void }
type AdBreak = (o: Record<string, unknown>) => void;
declare global { interface Window { GafferAds?: GafferAds; adBreak?: AdBreak; adConfig?: AdBreak; adsbygoogle?: unknown[]; __gafferReward?: (ok: boolean) => void } }

const onWeb = () => /^https?:$/.test(location.protocol);
let loaded = false;

// Loads AdSense once, only when it's configured, on the web, and the player isn't a supporter.
export function loadAds(supporter: boolean) {
  if (loaded || supporter || !MONET.adsenseClient || !onWeb()) return;
  loaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(MONET.adsenseClient)}`;
  s.dataset.adFrequencyHint = '60s';
  document.head.appendChild(s);
  window.adsbygoogle = window.adsbygoogle || [];
  window.adBreak = window.adConfig = (o) => { (window.adsbygoogle as unknown[]).push(o); };
  window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
}

export const adsOn = (supporter: boolean) => !supporter && !!MONET.adsenseClient && onWeb();
export const rewardedAvailable = (supporter: boolean) => !!window.GafferAds?.rewarded || adsOn(supporter);

// Shows a rewarded ad; resolves true only when the player watched it to the end.
export function showRewarded(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.GafferAds?.rewarded) {
      window.__gafferReward = (ok: boolean) => { window.__gafferReward = undefined; resolve(!!ok); };
      window.GafferAds.rewarded('__gafferReward');
      return;
    }
    if (!window.adBreak) { resolve(false); return; }
    let viewed = false;
    window.adBreak({
      type: 'reward', name,
      beforeReward: (show: () => void) => show(),
      adViewed: () => { viewed = true; },
      adDismissed: () => { viewed = false; },
      adBreakDone: () => resolve(viewed),
    });
  });
}

export const supporterOnWeb = () => !!MONET.supporterUrl && onWeb();

// After Stripe sends the player back: ask our server whether the session is paid. Each session unlocks once.
export async function checkPurchase(paid: string[]): Promise<{ ok: boolean; session: string } | null> {
  const sid = new URLSearchParams(location.search).get('session_id');
  if (!sid || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid) || paid.includes(sid)) return null;
  history.replaceState(null, '', location.pathname + location.hash);
  try {
    const r = await fetch(`${MONET.verifyEndpoint}?session_id=${encodeURIComponent(sid)}`, { cache: 'no-store' });
    const j = await r.json();
    return { ok: j.ok === true && j.pack === 'supporter', session: sid };
  } catch {
    return { ok: false, session: sid };
  }
}
