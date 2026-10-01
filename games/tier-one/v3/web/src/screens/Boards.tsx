// Leaderboards (SAIF-03): today's Daily, this week, the Wire season. Your rank up top, the top 25 below, prizes for a
// finished day or week collected here. Every board is the server's own (`lb.top`); prizes are coins and never a score.
import { useEffect, useState } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave } from '../lib/save';
import { v3 } from '../lib/api';
import { checkPrizes, PRIZE, medalOf, type Period } from '../lib/awards';
import { sfx } from '../lib/sfx';
import { Icon, GBtn, TopBar } from '../ui/game';
import { Avatar } from '../ui/screenbits';
import { PrizeCards } from '../ui/awards';
import type { Chrome } from '../App';

type Board = { rows: { nick: string; score: number; tier?: string; me: boolean }[]; me?: { rank: number; score: number }; players: number };
const PERIODS: Period[] = ['daily', 'weekly', 'wire'];

export function BoardsScreen({ period: p0, ...chrome }: Chrome & { period?: Period }) {
  const t = useT();
  const s = useSave();
  const [period, setPeriod] = useState<Period>(p0 || 'daily');
  const [boards, setBoards] = useState<Partial<Record<Period, Board | 'off'>>>({});
  useEffect(() => { checkPrizes(); }, []);
  useEffect(() => {
    if (boards[period]) return;
    v3<Board>('lb.top', { period, dev: s.dev }).then((r) => setBoards((b) => ({ ...b, [period]: r.ok ? r : 'off' })));
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps
  const b = boards[period];
  const me = b && b !== 'off' ? b.me : undefined;
  const prize = period === 'wire' ? null : PRIZE[period];
  const play = () => chrome.go(period === 'wire' ? { n: 'wire' } : { n: 'daily' });

  return <div className="g-screen aw">
    <TopBar back={{ label: t('g.tabs.me'), onClick: () => chrome.go({ n: 'me' }) }} title={t('aw.title')} />
    <div className="stagger g-stack">
      <PrizeCards s={s} />
      <div className="g-tabs2 aw-tabs" role="tablist" aria-label={t('aw.title')}>
        {PERIODS.map((k) => <button key={k} role="tab" aria-selected={period === k} onClick={() => { sfx('ui.tap'); setPeriod(k); }}>{t('aw.p.' + k)}</button>)}
      </div>

      <section className={'aw-you g-card' + (me && me.rank <= 3 ? ' is-' + medalOf(me.rank) : '')} aria-live="polite">
        {me ? <>
          <span className="aw-you__rank g-num"><small>#</small>{me.rank}</span>
          <div className="aw-you__b"><b>{t('aw.youRank', { r: me.rank, n: b && b !== 'off' ? b.players : 0 })}</b><span className="g-mono">{num(Math.round(me.score))} {t(period === 'wire' ? 'wire.cred' : 'aw.pts')}</span></div>
        </> : <>
          <span className="aw-you__rank aw-you__rank--none"><Icon n="trophy" size={30} /></span>
          <div className="aw-you__b"><b>{b === 'off' ? t('aw.off') : t('aw.notOn.' + period)}</b>
            {b !== 'off' && <GBtn kind="dark" size="sm" onClick={play}><Icon n={period === 'wire' ? 'wire' : 'news'} size={18} />{t('aw.play.' + period)}</GBtn>}</div>
        </>}
      </section>
      {prize && <p className="aw-ladder"><Icon n="gift" size={16} />{t('aw.ladder.' + period, { a: prize[0], b: prize[1], c: prize[2], d: prize[3] })}</p>}

      {b === undefined ? <p className="g-mono aw-wait">{t('common.loading')}</p>
        : b !== 'off' && b.rows.length > 0 && <ol className="aw-list g-card">
          {b.rows.map((x, k) => <li key={k} className={(x.me ? 'is-me ' : '') + (k < 3 ? 'is-' + medalOf(k + 1) : '')}>
            <span className="aw-list__r g-num">{k < 3 ? <Icon n="crown" size={18} /> : k + 1}</span>
            <Avatar name={x.nick} size={28} me={x.me} />
            <span className="aw-list__n" dir="auto">{x.me ? t('common.you') : x.nick}</span>
            {x.tier ? <span className="g-mono aw-list__t">{t('tier.' + x.tier)}</span> : <span />}
            <b className="g-num">{num(Math.round(x.score))}</b>
          </li>)}
        </ol>}
      {b && b !== 'off' && !b.rows.length && <p className="g-empty">{t('aw.empty')}</p>}
      <p className="g-mono aw-fine">{t('aw.fine')}</p>
    </div>
  </div>;
}
