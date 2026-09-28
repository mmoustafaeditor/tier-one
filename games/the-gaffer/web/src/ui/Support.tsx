// Support and ads: the Home sponsor card (web, when AdSense is set up), optional rewarded ads,
// the one-off Supporter pack and the club looks it unlocks. Nothing here blocks or slows the game.
import { useEffect, useRef, useState } from 'react';
import type { Strings } from '../i18n';
import { MONET, adsOn, rewardedAvailable, showRewarded, supporterOnWeb } from '../monet';
import { loadPrefs, type Prefs } from '../sim/prefs';

export const LOOKS = ['default', 'neon', 'stadium', 'derby'] as const;
export const applyLook = (p: Prefs) => { document.documentElement.dataset.skin = LOOKS[p.supporter ? p.look : 0]; };

// A clearly labelled sponsor card. Renders nothing unless ads are configured and the player isn't a supporter.
export function AdSlot({ t, placement }: { t: Strings; placement: 'home' }) {
  const ref = useRef<HTMLModElement>(null);
  const on = adsOn(loadPrefs().supporter) && !!MONET.adsenseSlotHome;
  useEffect(() => {
    if (!on || !ref.current || ref.current.dataset.done) return;
    ref.current.dataset.done = '1';
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* blocked: the card stays empty */ }
  }, [on]);
  if (!on) return null;
  return (
    <aside className="card g-ad" aria-label={t.sponsoredT} data-placement={placement}>
      <span className="over">{t.sponsoredT}</span>
      <ins ref={ref} className="adsbygoogle" style={{ display: 'block' }} data-ad-client={MONET.adsenseClient} data-ad-slot={MONET.adsenseSlotHome} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}

// "Watch a short ad: free report." Only shown when an ad can actually be shown.
export function RewardedButton({ t, name, onReward, onFail }: { t: Strings; name: string; onReward: () => void; onFail: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  if (!rewardedAvailable(loadPrefs().supporter)) return null;
  return (
    <>
      <button className={`btn ghost${busy ? ' loading' : ''}`} disabled={busy} onClick={async () => {
        setBusy(true);
        const ok = await showRewarded(name);
        setBusy(false);
        if (ok) onReward(); else onFail(t.adFailed);
      }}>▶ {t.rewardedBtn}</button>
      <small className="muted">{t.rewardedHint}</small>
    </>
  );
}

// The Supporter pack card and the looks picker (Settings and more).
export function SupportCard({ t, prefs, onPrefs }: { t: Strings; prefs: Prefs; onPrefs: (p: Prefs) => void }) {
  return (
    <section className="card g-support">
      <div className="over">{t.supportT}</div>
      {prefs.supporter ? <p className="g-ok" style={{ margin: 'var(--s2) 0' }}>★ {t.supportThanks}</p> : <p className="muted" style={{ margin: 'var(--s2) 0' }}>{t.supportBody}</p>}
      <div className="sechead" style={{ marginTop: 'var(--s2)' }}><span className="over">{t.looksT}</span></div>
      <div className="g-looks">
        {t.looks.map((name, i) => {
          const locked = i > 0 && !prefs.supporter;
          return (
            <button key={name} className={`g-look g-look-${LOOKS[i]}${prefs.look === i ? ' on' : ''}`} disabled={locked} aria-pressed={prefs.look === i}
              onClick={() => onPrefs({ ...prefs, look: i as Prefs['look'] })}>
              <i aria-hidden="true" />
              <span>{name}</span>
              {locked && <small>{t.looksLocked}</small>}
            </button>
          );
        })}
      </div>
      {!prefs.supporter && (supporterOnWeb()
        ? <a className="btn primary" style={{ width: '100%', marginTop: 'var(--s3)' }} href={MONET.supporterUrl}>{t.supportBtn}</a>
        : <p className="muted" style={{ margin: 'var(--s3) 0 0' }}>{t.supportSoon}</p>)}
    </section>
  );
}
