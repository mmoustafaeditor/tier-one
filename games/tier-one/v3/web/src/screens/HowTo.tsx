// How to play (HYBRID.md): "Tier One in 60 seconds" as five swipeable step cards, each an icon composition, one
// sentence and one example. The exact rules stay below, generated from RULES so the numbers can't drift (DESIGN §13).
import { useRef, useState, type ReactNode } from 'react';
import { useT } from '../lib/i18n';
import { RULES, STRENGTHS } from '../lib/engine';
import { sfx } from '../lib/sfx';
import { Icon, GBtn, TopBar, SrcIcon } from '../ui/game';
import { Avatar } from '../ui/screenbits';
import type { Chrome } from '../App';

export function HowTo(chrome: Chrome) {
  const t = useT();
  const R = RULES;
  // What a right call pays if you file it on day 1 (base + the early bonus for every day left): the numbers the call panel shows.
  const day1 = [0, 1, 2].map((k) => R.BASE[k] + R.EARLY[k] * (R.DAYS - 1));
  const v = { c: R.CONTACTS, dd: R.DD_CONTACTS, x: R.EXCL[2], t1: R.TIERS.T1, t2: R.TIERS.T2, t3: R.TIERS.T3, b: R.BASE[2], e: R.EARLY[2], l: R.LOSS[2], b0: day1[0], b1: day1[1], b2: day1[2] };
  const fillV = (s: string) => s.replace(/\{(\w+)\}/g, (m, x) => String((v as Record<string, number>)[x] ?? m));
  const steps = t.list('g.howto.steps') as string[][];
  const [cur, setCur] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  const goTo = (k: number) => {
    const c = rail.current, el = c?.children[k] as HTMLElement | undefined;
    if (!c || !el) return;
    sfx('ui.tap');
    c.scrollBy({ left: el.getBoundingClientRect().left - c.getBoundingClientRect().left - (c.clientWidth - el.clientWidth) / 2, behavior: 'smooth' });
  };
  const onScroll = () => {
    const c = rail.current; if (!c) return;
    const mid = c.getBoundingClientRect().left + c.clientWidth / 2;
    let best = 0, d = 1e9;
    Array.from(c.children).forEach((el, k) => { const r = (el as HTMLElement).getBoundingClientRect(); const dd = Math.abs(r.left + r.width / 2 - mid); if (dd < d) { d = dd; best = k; } });
    if (best !== cur) setCur(best);
  };
  const sec = (k: string) => { const [h, b] = t.list('howto.' + k) as string[]; return <section key={k} className="rule3"><h3>{h}</h3><p>{fillV(b)}</p></section>; };
  const head = t.list('howto.table') as string[], sh = t.list('howto.srcTable') as string[];
  const ART: ReactNode[] = [
    <div className="hart hart--ring" key={0}><SrcIcon k="barber" size={54} /><span className="hart__phone"><Icon n="phone" /></span><SrcIcon k="physio" size={54} /><SrcIcon k="agent" size={54} /></div>,
    <div className="hart hart--ev" key={1}>{['done', 'hijack', 'off', 'fake'].map((o, i) => <span key={o} className={'hchip hchip--' + o}><b>{t('out.' + o)}</b><span>{[2, 1, 0, 0][i] ? Array.from({ length: [2, 1, 0, 0][i] }, (_, j) => <Icon key={j} n="check" size={14} />) : '–'}</span></span>)}</div>,
    <div className="hart hart--pick" key={2}>{['done', 'hijack', 'off', 'fake'].map((o, i) => <span key={o} className={'hpick hpick--' + o + (i === 0 ? ' is-on' : '')}>{t('out.' + o)}</span>)}</div>,
    <div className="hart hart--loud" key={3}>{[0, 1, 2].map((k) => <span key={k} className={'hloud' + (k === 2 ? ' is-on' : '')}><span className="loud__bars">{[0, 1, 2].map((i) => <i key={i} className={i <= k ? 'on' : ''} />)}</span><b>{t('str.' + STRENGTHS[k])}</b><em className="g-num">+{day1[k]}</em><small className="g-num">−{R.LOSS[k]}</small></span>)}</div>,
    <div className="hart hart--race" key={4}><span className="hrivals">{['tabloid', 'itk', 'insider'].map((r) => <Avatar key={r} name={t('rival.' + r).replace(/^@/, '').replace(/([a-z])([A-Z])/g, '$1 $2')} size={40} />)}</span><span className="hclock"><Icon n="clock" /><b className="g-num">0:{String(R.DD_SECONDS).padStart(2, '0')}</b></span></div>,
  ];
  return <div className="g-screen howto3">
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('nav.howto')} onMenu={chrome.openSettings} />
    <div className="stagger g-stack">
      <header className="howto3__head" style={{ ['--i' as string]: 0 }}>
        <span className="g-mono">{t('g.howto.k')}</span>
        <h1 className="g-h1">{t('g.howto.hed')}</h1>
      </header>

      <div className="steps" ref={rail} onScroll={onScroll} style={{ ['--i' as string]: 1 }} role="list">
        {steps.map(([h, s, ex], k) => <article key={k} role="listitem" className={'stepc stepc--' + k + (k === cur ? ' is-cur' : '')} aria-label={t('g.howto.step', { n: k + 1, m: steps.length })}>
          <span className="stepc__n g-num">{k + 1}</span>
          <div className="stepc__art">{ART[k]}</div>
          <h2 className="stepc__h">{h}</h2>
          <p className="stepc__s">{fillV(s)}</p>
          <p className="stepc__ex"><Icon n="bolt" size={14} />{fillV(ex)}</p>
          {k === 3 && <p className="stepc__early"><Icon n="clock" size={14} />{t('g.howto.early')}</p>}
        </article>)}
      </div>
      <div className="stepnav" style={{ ['--i' as string]: 2 }}>
        <button className="g-icbtn" onClick={() => goTo(Math.max(0, cur - 1))} disabled={cur === 0} aria-label={t('g.howto.prev')}><Icon n={t.rtl ? 'arrow' : 'back'} /></button>
        <span className="stepdots">{steps.map((_, k) => <button key={k} className={k === cur ? 'is-on' : ''} onClick={() => goTo(k)} aria-label={t('g.howto.step', { n: k + 1, m: steps.length })} />)}</span>
        <button className="g-icbtn" onClick={() => goTo(Math.min(steps.length - 1, cur + 1))} disabled={cur === steps.length - 1} aria-label={t('g.howto.next')}><Icon n={t.rtl ? 'back' : 'arrow'} /></button>
      </div>
      <GBtn kind="green" size="lg" sound="open" onClick={() => chrome.go({ n: 'practice' })} style={{ ['--i' as string]: 3 }}><Icon n="target" size={24} />{t('g.howto.go')}</GBtn>

      <details className="fullrules g-card" style={{ ['--i' as string]: 4 }}>
        <summary><span><b className="g-h2">{t('g.howto.full')}</b><small className="g-sub">{t('g.howto.fullSub')}</small></span><Icon n="arrow" size={20} /></summary>
        <div className="fullrules__body">
          <div className="fullrules__cols">
            <div>{['s1', 's2', 's3', 's4', 's5'].map(sec)}</div>
            <div>{['s6', 's7', 's8', 's9'].map(sec)}
              {/* Story mode only (lib/career.ts vincePick): the one Career rule that changes what a source says. */}
              <section className="rule3 rule3--story"><h3>{(t.list('g.story.vince.howto') as string[])[0]}</h3><p>{(t.list('g.story.vince.howto') as string[])[1]}</p></section></div>
          </div>
          <h3 className="fullrules__t">{head[0]}</h3>
          <div className="tscroll"><table className="gtable"><thead><tr>{head.map((h, k) => <th key={k}>{h}</th>)}</tr></thead>
            <tbody>{[0, 1, 2].map((s) => <tr key={s}><td><b>{t('str.' + STRENGTHS[s])}</b></td><td>+{R.BASE[s]}</td><td>+{R.EARLY[s]}</td><td>{R.EXCL[s] ? '+' + R.EXCL[s] : '—'}</td><td>−{R.LOSS[s]}</td><td>−{R.UT_PEN[s]}</td></tr>)}</tbody></table></div>
          <p className="fullrules__thumb">{t('g.howto.early')} {t('howto.thumb')}</p>
          <h3 className="fullrules__t">{sh[0]}</h3>
          <div className="srcl">{Object.entries(R.SOURCES).map(([k, so]) => <div key={k} className="srcl__r">
            <SrcIcon k={k} size={36} />
            <div className="srcl__m"><div className="srcl__h"><b>{t('src.' + k)}</b><span className="srcl__chip"><Icon n="phone" size={12} />{sh[1]} {so.cost}</span><span className="srcl__chip"><Icon n="clock" size={12} />{sh[2]} {so.from}</span></div>
              <p>{t('src.' + k + 'Rule')}</p></div>
          </div>)}</div>
        </div>
      </details>
    </div>
  </div>;
}
