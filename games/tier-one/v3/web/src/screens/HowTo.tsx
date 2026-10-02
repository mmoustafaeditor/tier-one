// How to play: "Tier One in 60 seconds" as five step cards, one at a time with ‹ 2/5 › (owner rule: no page scroll),
// then Practice, the full rules (a sheet, generated from RULES so the numbers can't drift) and the training replay.
import { useState, type ReactNode } from 'react';
import { useT } from '../lib/i18n';
import { RULES, STRENGTHS } from '../lib/engine';
import { Icon, Sheet, SheetHead } from '../ui/bits';
import { GBtn, TopBar, SrcIcon } from '../ui/game';
import { Portrait } from '../ui/portrait';
import { usePaged, Pager } from '../ui/fit';
import type { Chrome } from '../App';
import { startTutorial } from './Onboarding';

export function HowTo(chrome: Chrome) {
  const t = useT();
  const R = RULES;
  // What a right call pays if you file it on day 1 (base + the early bonus for every day left): the numbers the call panel shows.
  const day1 = [0, 1, 2].map((k) => R.BASE[k] + R.EARLY[k] * (R.DAYS - 1));
  const v = { c: R.CONTACTS, dd: R.DD_CONTACTS, x: R.EXCL[2], t1: R.TIERS.T1, t2: R.TIERS.T2, t3: R.TIERS.T3, b: R.BASE[2], e: R.EARLY[2], l: R.LOSS[2], b0: day1[0], b1: day1[1], b2: day1[2] };
  const fillV = (s: string) => s.replace(/\{(\w+)\}/g, (m, x) => String((v as Record<string, number>)[x] ?? m));
  const steps = t.list('g.howto.steps') as string[][];
  const pg = usePaged(steps, 1);
  const [rules, setRules] = useState(false);
  const sec = (k: string) => { const [h, b] = t.list('howto.' + k) as string[]; return <section key={k} className="rule3"><h3>{h}</h3><p>{fillV(b)}</p></section>; };
  const head = t.list('howto.table') as string[], sh = t.list('howto.srcTable') as string[];
  const ART: ReactNode[] = [
    <div className="hart hart--ring" key={0}><SrcIcon k="barber" size={54} /><span className="hart__phone"><Icon n="phone" /></span><SrcIcon k="physio" size={54} /><SrcIcon k="agent" size={54} /></div>,
    <div className="hart hart--ev" key={1}>{['done', 'hijack', 'off', 'fake'].map((o, i) => <span key={o} className={'hchip hchip--' + o}><b>{t('out.' + o)}</b><span>{[2, 1, 0, 0][i] ? Array.from({ length: [2, 1, 0, 0][i] }, (_, j) => <Icon key={j} n="check" size={14} />) : '–'}</span></span>)}</div>,
    <div className="hart hart--pick" key={2}>{['done', 'hijack', 'off', 'fake'].map((o, i) => <span key={o} className={'hpick hpick--' + o + (i === 0 ? ' is-on' : '')}>{t('out.' + o)}</span>)}</div>,
    <div className="hart hart--loud" key={3}>{[0, 1, 2].map((k) => <span key={k} className={'hloud' + (k === 2 ? ' is-on' : '')}><span className="loud__bars">{[0, 1, 2].map((i) => <i key={i} className={i <= k ? 'on' : ''} />)}</span><b>{t('str.' + STRENGTHS[k])}</b><em className="g-num">+{day1[k]}</em><small className="g-num">−{R.LOSS[k]}</small></span>)}</div>,
    <div className="hart hart--race" key={4}><span className="hrivals">{['tabloid', 'itk', 'insider'].map((r) => <Portrait key={r} id={'rival:' + r} size={40} shape="round" />)}</span><span className="hclock"><Icon n="clock" /><b className="g-num">0:{String(R.DD_SECONDS).padStart(2, '0')}</b></span></div>,
  ];
  const k = pg.page, [h, s, ex] = steps[k] || ['', '', ''];
  return <div className="g-screen howto3 fit">
    <TopBar back={{ label: t('sh.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('nav.howto')} />
    <div className="fit__body">
      <header className="howto3__head">
        <span className="g-mono">{t('g.howto.k')}</span>
        <h1 className="g-h1">{t('g.howto.hed')}</h1>
      </header>
      <article key={k} className={'stepc stepc--' + k + ' is-cur fit__grow'} aria-label={t('sh.howto.step', { n: k + 1, m: steps.length })}>
        <span className="stepc__n g-num">{k + 1}</span>
        <div className="stepc__art">{ART[k]}</div>
        <h2 className="stepc__h">{h}</h2>
        <p className="stepc__s">{fillV(s)}</p>
        <p className="stepc__ex"><Icon n="bolt" size={14} />{fillV(ex)}</p>
        {k === 3 && <p className="stepc__early"><Icon n="clock" size={14} />{t('g.howto.early')}</p>}
      </article>
      <Pager p={pg} />
      <GBtn kind="green" sound="open" onClick={() => chrome.go({ n: 'practice' })}><Icon n="target" size={22} />{t('g.howto.go')}</GBtn>
      <div className="howto3__row">
        <GBtn kind="dark" size="sm" onClick={() => setRules(true)}><Icon n="evidence" size={18} />{t('sh.howto.rules')}</GBtn>
        <GBtn kind="paper" size="sm" sound="open" onClick={() => startTutorial(chrome.go)}><Icon n="uturn" size={18} />{t('g.me.training')}</GBtn>
      </div>
    </div>

    <Sheet open={rules} onClose={() => setRules(false)} label={t('sh.howto.rules')} wide>
      <div className="sheet__body fullrules__body">
        <SheetHead title={t('g.howto.full')} aside={t('g.howto.fullSub')} onClose={() => setRules(false)} />
        <div className="fullrules__cols">
          <div>{['s1', 's2', 's3', 's4', 's5'].map(sec)}</div>
          <div>{['s6', 's7', 's8', 's9', 's10'].map(sec)}</div>
        </div>
        <h3 className="fullrules__t">{head[0]}</h3>
        <div className="tscroll"><table className="gtable"><thead><tr>{head.map((x, i) => <th key={i}>{x}</th>)}</tr></thead>
          <tbody>{[0, 1, 2].map((st) => <tr key={st}><td><b>{t('str.' + STRENGTHS[st])}</b></td><td>+{R.BASE[st]}</td><td>+{R.EARLY[st]}</td><td>{R.EXCL[st] ? '+' + R.EXCL[st] : '—'}</td><td>−{R.LOSS[st]}</td><td>−{R.UT_PEN[st]}</td></tr>)}</tbody></table></div>
        <p className="fullrules__thumb">{t('g.howto.early')} {t('howto.thumb')}</p>
        <h3 className="fullrules__t">{sh[0]}</h3>
        <div className="srcl">{Object.entries(R.SOURCES).map(([key, so]) => <div key={key} className="srcl__r">
          <Portrait id={'src:' + key} size={36} />
          <div className="srcl__m"><div className="srcl__h"><b>{t('src.' + key)}</b><span className="srcl__chip"><Icon n="phone" size={12} />{sh[1]} {so.cost}</span><span className="srcl__chip"><Icon n="clock" size={12} />{sh[2]} {so.from}</span></div>
            <p>{t('src.' + key + 'Rule')}</p></div>
        </div>)}</div>
      </div>
    </Sheet>
  </div>;
}
