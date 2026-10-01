// How to play (RULES4.md §0, §1, §4; CONCEPT4.md §2 Settings): one card. The six ideas, each with a picture made of the
// game's own pieces, then what a call pays and what each contact can tell you. Every number is read from the engine's
// rules (E4.RULES), so this card can't drift from the game. Opened from Settings, Blurt's "?" and the "?" key.
import type { CSSProperties, ReactNode } from 'react';
import { useT } from '../lib/i18n';
import { E4, RULES4, OUTS4, BACKING } from '../lib/engine';
import { TopBar, SrcIcon } from '../ui/game';
import { Pop, Stamp } from '../ui/juice';
import { startTutorial } from '../ui/tutorial';
import type { Chrome } from '../App';

const SRCS = ['barber', 'kitman', 'agent', 'spotter', 'physio'] as const;
const sign = (n: number) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');

export function HowTo(chrome: Chrome) {
  const t = useT();
  const R = RULES4;
  const dd = R.CALLS[R.DAYS - 1], dms = R.CALLS[0], scoop = R.SCOOP[2];
  const ideas = (t.list('ob4.how.ideas') as string[][]) || [];
  const fill = (x: string) => x.replace('{dms}', String(dms)).replace('{dd}', String(dd)).replace('{scoop}', String(scoop));
  const bars = E4.tierBars(R);
  const day = (d: number) => (d >= R.DAYS ? t('ob4.how.src.dd') : t('day4.n', { d }));

  // The pictures: the real pieces, small. Each says the idea's one number out loud.
  const art: ReactNode[] = [
    <span className="how4-outs" key="o">{OUTS4.map((o) => <b key={o} className={'how4-out how4-out--' + o}>{t('out4.' + o)}</b>)}</span>,
    <span className="how4-days" key="d" aria-hidden="true">{R.CALLS.map((n, k) => <span key={k} className={k === R.DAYS - 1 ? 'is-dd' : ''}><span className="how4-dots">{Array.from({ length: n }, (_, j) => <i key={j} />)}</span><small>{k === R.DAYS - 1 ? t('ob4.how.src.dd') : k + 1}</small></span>)}</span>,
    <span className="how4-srcs" key="s">{SRCS.map((k) => <span key={k}><SrcIcon k={k} size={34} /><small dir="auto">{t('src4.name.' + k).replace(/^(The|El|La)\s+/i, '')}</small></span>)}</span>,
    <span className="how4-backs" key="b">{BACKING.map((b, s) => <span key={b} className={'how4-back' + (s === 2 ? ' is-drop' : '')}><b>{t('back4.' + b)}</b><small>{t('back4.' + b + 'D')}</small></span>)}</span>,
    <span className="how4-early" key="e" aria-hidden="true">{Array.from({ length: R.DAYS }, (_, k) => { const v = R.EARLY[2] * (R.DAYS - 1 - k); return <span key={k} style={{ ['--h' as string]: v / Math.max(1, R.EARLY[2] * (R.DAYS - 1)) } as CSSProperties}><i /><b>{v ? '+' + v : '0'}</b><small>{k === R.DAYS - 1 ? t('ob4.how.src.dd') : k + 1}</small></span>; })}</span>,
    <span className="how4-scoop" key="x"><Stamp text={'Scoop +' + scoop} tone="scoop" size="sm" slam={false} sound={false} /></span>,
  ];

  return <div className="g-screen how4">
    <TopBar back={{ label: t('ob4.how.close'), onClick: () => chrome.go({ n: 'settings' }) }} title={t('ob4.how.title')} />
    <article className="how4-card">
      <header className="how4-head">
        <h1>{t('ob4.how.hed')}</h1>
        <p>{t('ob4.how.sub')}</p>
      </header>

      <ol className="how4-ideas">
        {ideas.map(([h, b], k) => <li key={k} className="how4-idea">
          <span className="how4-n" aria-hidden="true">{k + 1}</span>
          <div className="how4-idea__b">
            <h2>{h}</h2>
            <p>{fill(b)}</p>
            <div className="how4-art">{art[k]}</div>
          </div>
        </li>)}
      </ol>

      <section className="how4-sec" aria-labelledby="how4-score">
        <h2 id="how4-score">{t('ob4.how.score.h')}</h2>
        <div className="how4-scroll"><table className="how4-table">
          <thead><tr><th scope="col">{t('ob4.how.score.back')}</th><th scope="col">{t('ob4.how.score.right')}</th><th scope="col">{t('ob4.how.score.wrong')}</th><th scope="col">{t('ob4.how.score.early')}</th><th scope="col">{t('ob4.how.score.scoop')}</th><th scope="col">{t('ob4.how.score.day1')}</th></tr></thead>
          <tbody>{BACKING.map((b, s) => <tr key={b} className={s === 2 ? 'is-drop' : ''}>
            <th scope="row"><b>{t('back4.' + b)}</b> <small>{t('back4.' + b + 'D')}</small></th>
            <td className="is-good">{sign(R.WIN[s])}</td><td className="is-bad">{sign(-R.LOSS[s])}</td><td>{sign(R.EARLY[s])}</td><td>{R.SCOOP[s] ? sign(R.SCOOP[s]) : '—'}</td>
            <td className="is-good"><b>{sign(R.WIN[s] + R.EARLY[s] * (R.DAYS - 1))}</b></td>
          </tr>)}</tbody>
        </table></div>
        <p className="how4-final">{t('back4.final')}</p>
      </section>

      <section className="how4-sec" aria-labelledby="how4-src">
        <h2 id="how4-src">{t('ob4.how.src.h')}</h2>
        <ul className="how4-contacts">{SRCS.map((k) => { const so = R.SOURCES[k]; return <li key={k}>
          <SrcIcon k={k} size={40} />
          <div>
            <div className="how4-contacts__h"><b dir="auto">{t('src4.name.' + k)}</b><span>{so.cost ? t('ob4.how.src.dm') : t('ob4.how.src.free')}</span><span>{so.from > 1 ? (so.from >= R.DAYS ? day(so.from) : t('ob4.how.src.from', { d: so.from })) : t('ob4.how.src.from', { d: 1 })}</span></div>
            <p dir="auto"><b>{t('src4.tells.' + k)}</b>. {t('src4.right.' + k)}</p>
          </div>
        </li>; })}</ul>
      </section>

      <section className="how4-sec" aria-labelledby="how4-gr">
        <h2 id="how4-gr">{t('ob4.how.grades.h')}</h2>
        <p className="how4-grades">{t('ob4.how.grades.line', { t1: R.TIERS.T1, t2: R.TIERS.T2, t3: R.TIERS.T3, a: bars.T1, b: bars.T2, c: bars.T3 })}</p>
      </section>
    </article>

    <div className="how4-acts">
      <Pop className="ob4-go" sound="os.open" onTap={() => startTutorial(chrome.go)}>{t('ob4.how.again')}</Pop>
      <Pop className="ob4-quiet" onTap={() => chrome.go({ n: 'practice' })}>{t('ob4.how.practice')}</Pop>
    </div>
  </div>;
}
