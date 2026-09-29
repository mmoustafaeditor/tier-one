// Club Pass: a concept page on the web. Semba Credits are local, rewarded ads pay credits only, and nothing here can
// buy results, players or form. Prices are shown as concepts; no purchase flow exists until it can be verified.
import { useState } from 'react';
import type { Prefs } from '../sim/prefs';
import { rewardedAvailable, showRewarded } from '../monet';
import { AD_REWARD, ADS_PER_DAY, addCredits, adsWatchedToday, countAd, credits } from '../meta/wallet';
import { I } from './kit';
import { Panel, PanelHead } from './shell';
import { useGame } from './game';

export function PassScreen({ prefs }: { prefs: Prefs; onPrefs: (p: Prefs) => void }) {
  const g = useGame();
  const P = g.x.pass;
  const [bal, setBal] = useState(credits);
  const [ads, setAds] = useState(adsWatchedToday);
  const canAd = rewardedAvailable(prefs.supporter) && ads < ADS_PER_DAY;
  const looks = [['#7A263A', '#95BFE5'], ['#0B3B5C', '#7DEBCB'], ['#A87612', '#0B2A26']];
  return (
    <div className="sc-pass">
      <div className="p-head on-ground">
        <div><span className="concept">{P.concept}</span><h1 className="h-hero">{P.title}</h1><p>{P.lead}</p></div>
      </div>
      <div className="grid">
        <section className="g-pass pass">
          <span className="eyebrow">{P.concept}</span>
          <h2 className="h1">{P.title}</h2>
          <div className="price"><b>{P.price}</b><span>{P.per}</span></div>
          <ul>{P.perks.map(([a, b]) => <li key={a}><I n="check" /><span>{a}<small>{b}</small></span></li>)}</ul>
          <button className="btn btn--accent" disabled>{P.cta}</button>
          <p className="note">{P.note}</p>
        </section>
        <Panel i={1} label={P.credits}>
          <PanelHead title={P.credits} right={<span className="eyebrow">{P.balance(bal)}</span>} />
          <p className="small muted">{P.creditsSub}</p>
          <button className="btn btn--ghost btn--sm" disabled={!canAd} onClick={async () => {
            const ok = await showRewarded('credits');
            if (ok) { countAd(); setAds(adsWatchedToday()); setBal(addCredits(AD_REWARD)); g.toast(P.earned); }
          }}><I n="play" size="sm" />{P.earn}</button>
          <p className="small muted">{rewardedAvailable(prefs.supporter) ? P.daily(ads) : P.adsOff}</p>
        </Panel>
        <Panel i={2} label={P.never}>
          <PanelHead title={P.never} />
          <div className="never">{P.nevers.map((n) => <div key={n}><I n="x" /><span>{n}</span></div>)}</div>
        </Panel>
        <Panel i={3} label={P.looks}>
          <PanelHead title={P.looks} right={<span className="eyebrow">{P.lookPrice}</span>} />
          <div className="looks">{looks.map(([a, b], i) => <div key={i} className="look"><span className="sw" style={{ background: `linear-gradient(160deg, ${a}, #021311)`, ['--c' as string]: b }} /><b>{P.lookNames[i]}</b><span>{P.lookPrice}</span></div>)}</div>
        </Panel>
        <Panel i={4} label={P.items}>
          <PanelHead title={P.items} />
          {P.itemList.map(([a, b]) => <div key={a} className="item"><span className="ic"><I n="store" /></span><div><b>{a}</b><span className="s">{b} · {P.concept}</span></div></div>)}
        </Panel>
      </div>
    </div>
  );
}
