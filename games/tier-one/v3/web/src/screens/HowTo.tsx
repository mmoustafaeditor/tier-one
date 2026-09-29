// How to play: generated from RULES, so the numbers can't drift from the engine (DESIGN §13).
import { useT } from '../lib/i18n';
import { RULES, STRENGTHS } from '../lib/engine';
import { Bar } from '../ui/chrome';
import { Flag } from '../ui/bits';
import type { Chrome } from '../App';

export function HowTo(chrome: Chrome) {
  const t = useT();
  const R = RULES;
  const v = { c: R.CONTACTS, dd: R.DD_CONTACTS, x: R.EXCL[2], t1: R.TIERS.T1, t2: R.TIERS.T2, t3: R.TIERS.T3 };
  const sec = (k: string) => { const [h, b] = t.list('howto.' + k) as string[]; return <section key={k}><Flag title={h} /><p className="prose">{b.replace(/\{(\w+)\}/g, (m, x) => String((v as Record<string, number>)[x] ?? m))}</p></section>; };
  const head = t.list('howto.table') as string[], sh = t.list('howto.srcTable') as string[];
  return <div className="page howto">
    <Bar chrome={chrome} back={{ label: t('nav.front') }} cur="front" />
    <section className="head"><div className="kicker">{t('nav.howto')}</div><h1 className="hed hed--1">{t('howto.title')}</h1><p className="dek" style={{ marginTop: 8 }}>{t('howto.dek')}</p></section>
    <div className="cols cols--2-even">
      <main>{['s1', 's2', 's3', 's4', 's5'].map(sec)}</main>
      <aside>{['s6', 's7', 's8', 's9'].map(sec)}
        <Flag title={head[0]} />
        <div className="table-wrap"><table className="table"><thead><tr>{head.map((h, k) => <th key={k} className={k ? '' : 'l'}>{h}</th>)}</tr></thead>
          <tbody>{[0, 1, 2].map((s) => <tr key={s}><td className="l"><b>{t('str.' + STRENGTHS[s])}</b></td><td>+{R.BASE[s]}</td><td>+{R.EARLY[s]}</td><td>{R.EXCL[s] ? '+' + R.EXCL[s] : '—'}</td><td>−{R.LOSS[s]}</td><td>−{R.UT_PEN[s]}</td></tr>)}</tbody></table></div>
        <p className="pq" style={{ marginTop: 16 }}>{t('howto.thumb')}</p>
        <Flag title={sh[0]} />
        <table className="table"><thead><tr>{sh.map((h, k) => <th key={k} className={k === 0 || k === 3 ? 'l' : ''}>{h}</th>)}</tr></thead>
          <tbody>{Object.entries(R.SOURCES).map(([k, so]) => <tr key={k}><td className="l"><b>{t('src.' + k)}</b></td><td>{so.cost}</td><td>{so.from}</td><td className="l meta">{t('src.' + k + 'Rule')}</td></tr>)}</tbody></table>
      </aside>
    </div>
  </div>;
}
