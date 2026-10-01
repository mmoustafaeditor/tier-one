// How to play (UI41.md: one screen): three tabs, The game · Scoring · Sources, every number read from the engine's
// rules (RULES4), so this page can't drift from the game. Footer: replay the first Daily (tutorial) or a practice board.
import { useState } from 'react';
import { useT } from '../lib/i18n';
import { E4, RULES4, BACKING } from '../lib/engine';
import { sfx } from '../lib/sfx';
import { SrcIcon } from '../ui/game';
import { Screen, Pager, Chips } from '../ui/screen';
import { startTutorial } from '../ui/tutorial';
import type { Chrome } from '../App';

const SRCS = ['barber', 'kitman', 'agent', 'spotter', 'physio'] as const;
const sign = (n: number) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');
type Tab = 'game' | 'score' | 'sources';

export function HowTo(chrome: Chrome) {
  const t = useT();
  const R = RULES4;
  const [tab, setTab] = useState<Tab>('game');
  const ideas = (t.list('s41.how.ideas') as string[][]) || [];
  const fill = (x: string) => x.replace('{calls}', String(R.CALLS[0])).replace('{dd}', String(R.CALLS[R.DAYS - 1])).replace('{days}', String(R.DAYS)).replace('{scoop}', String(R.SCOOP[2]));
  return <Screen title={t('s41.howto')} onBack={chrome.back} footer={<>
    <button type="button" className="s41-btn s41-btn--quiet" onClick={() => startTutorial(chrome.go)}>{t('s41.how.tutorial')}</button>
    <button type="button" className="s41-btn s41-btn--main" onClick={() => chrome.go({ n: 'practice' })}>{t('s41.how.practice')}</button>
  </>}>
    <Chips value={tab} onChange={(k) => { sfx('ui.tap'); setTab(k); }} options={(['game', 'score', 'sources'] as Tab[]).map((k) => ({ k, label: t('s41.how.tab.' + k) }))} />
    {tab === 'game' && <Pager items={ideas} per={3} render={([h, b], k) => <div key={k} className="how-idea"><b>{h}</b><p>{fill(b)}</p></div>} />}
    {tab === 'score' && <>
      <table className="how-table">
        <thead><tr><th scope="col" /><th scope="col">{t('ob4.how.score.right')}</th><th scope="col">{t('ob4.how.score.wrong')}</th><th scope="col">{t('s41.how.early')}</th><th scope="col">{t('ob4.how.score.scoop')}</th></tr></thead>
        <tbody>{BACKING.map((b, s) => <tr key={b}><th scope="row">{t('back4.' + b)}</th><td className="is-good">{sign(R.WIN[s])}</td><td className="is-bad">{sign(-R.LOSS[s])}</td><td>{sign(R.EARLY[s])}</td><td>{R.SCOOP[s] ? sign(R.SCOOP[s]) : '–'}</td></tr>)}</tbody>
      </table>
      <p className="pc-line">{t('s41.how.earlyNote')}</p>
      <p className="pc-line">{t('ob4.how.grades.line', { t1: R.TIERS.T1, t2: R.TIERS.T2, t3: R.TIERS.T3, a: E4.tierBars(R).T1, b: E4.tierBars(R).T2, c: E4.tierBars(R).T3 })}</p>
    </>}
    {tab === 'sources' && <Pager items={[...SRCS]} per={5} render={(k) => { const so = R.SOURCES[k]; return <div key={k} className="how-src">
      <SrcIcon k={k} size={34} />
      <span className="how-src__b"><b dir="auto">{t('src4.name.' + k)}</b><small dir="auto">{t('src4.tells.' + k)} · {t('src4.right.' + k)}</small></span>
      <span className="how-src__c">{so.cost ? t('s41.how.cost', { n: so.cost }) : t('s41.how.free')}{so.from > 1 ? <small>{t('s41.how.from', { d: so.from })}</small> : null}</span>
    </div>; }} />}
  </Screen>;
}
