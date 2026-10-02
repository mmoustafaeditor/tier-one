// Leaderboards (SAIF-03, 3.6 tabs): Daily · Rooms · Transfer Market. Your rank up top, the top rows paged below, prizes
// for a finished day or week collected here. Daily and Transfer Market are the server's own boards (`lb.top`); Rooms is
// your place in each room you hold a seat in. Prizes are coins and never a score. One screen, no page scroll.
import { useEffect, useState } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave, getSave } from '../lib/save';
import { v3 } from '../lib/api';
import { checkPrizes, PRIZE, medalOf, type Period } from '../lib/awards';
import { loadRoom, forgetRoom, standings } from '../lib/social';
import { toast } from '../lib/meta';
import { sfx } from '../lib/sfx';
import { Icon, GBtn, TopBar } from '../ui/game';
import { Avatar } from '../ui/screenbits';
import { PrizeCards } from '../ui/awards';
import { usePaged, Pager } from '../ui/fit';
import type { Chrome, Route } from '../App';

type Board = { rows: { nick: string; score: number; tier?: string; me: boolean }[]; me?: { rank: number; score: number }; players: number };
type Tab = 'daily' | 'rooms' | 'wire';
const TABS: Tab[] = ['daily', 'rooms', 'wire'];

export function BoardsScreen({ period: p0, from, ...chrome }: Chrome & { period?: Period | 'rooms'; from?: Route }) {
  const t = useT();
  const s = useSave();
  const [tab, setTab] = useState<Tab>(p0 === 'wire' ? 'wire' : p0 === 'rooms' || p0 === 'weekly' ? 'rooms' : 'daily');
  const [boards, setBoards] = useState<Partial<Record<Period, Board | 'off'>>>({});
  useEffect(() => { checkPrizes(); }, []);
  useEffect(() => {
    if (tab === 'rooms' || boards[tab]) return;
    v3<Board>('lb.top', { period: tab, dev: s.dev }).then((r) => setBoards((b) => ({ ...b, [tab]: r.ok ? r : 'off' })));
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const b = tab === 'rooms' ? undefined : boards[tab];
  const me = b && b !== 'off' ? b.me : undefined;
  const prize = tab === 'daily' ? PRIZE.daily : null;
  const play = () => chrome.go(tab === 'wire' ? { n: 'wire' } : { n: 'daily' });
  const rows = b && b !== 'off' ? b.rows : [];
  const pg = usePaged(rows, 6, tab);
  const back = from ? { label: t('hub.back'), onClick: () => chrome.go(from) } : { label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) };

  return <div className="g-screen aw fit">
    <TopBar back={back} title={t('aw.title')} />
    <div className="fit__body">
      <PrizeCards s={s} />
      <div className="g-tabs2 aw-tabs" role="tablist" aria-label={t('aw.title')}>
        {TABS.map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { sfx('ui.tap'); setTab(k); }}>{t('hub.boards.' + k)}</button>)}
      </div>

      {tab === 'rooms' ? <RoomsBoard chrome={chrome} /> : <>
        <section className={'aw-you g-card' + (me && me.rank <= 3 ? ' is-' + medalOf(me.rank) : '')} aria-live="polite">
          {me ? <>
            <span className="aw-you__rank g-num"><small>#</small>{me.rank}</span>
            <div className="aw-you__b"><b>{t('aw.youRank', { r: me.rank, n: b && b !== 'off' ? b.players : 0 })}</b><span className="g-mono">{num(Math.round(me.score))} {t(tab === 'wire' ? 'wire.cred' : 'aw.pts')}</span></div>
          </> : <>
            <span className="aw-you__rank aw-you__rank--none"><Icon n="trophy" size={30} /></span>
            <div className="aw-you__b"><b>{b === 'off' ? t('aw.off') : t('aw.notOn.' + tab)}</b>
              {b !== 'off' && <GBtn kind="dark" size="sm" onClick={play}><Icon n={tab === 'wire' ? 'wire' : 'news'} size={18} />{t('aw.play.' + tab)}</GBtn>}</div>
          </>}
        </section>
        {prize && <p className="aw-ladder"><Icon n="gift" size={16} />{t('aw.ladder.daily', { a: prize[0], b: prize[1], c: prize[2], d: prize[3] })}</p>}

        {b === undefined ? <p className="g-mono aw-wait">{t('common.loading')}</p>
          : rows.length > 0 && <ol className="aw-list g-card" start={pg.page * 6 + 1}>
            {pg.rows.map((x, j) => { const k = pg.page * 6 + j; return <li key={k} className={(x.me ? 'is-me ' : '') + (k < 3 ? 'is-' + medalOf(k + 1) : '')}>
              <span className="aw-list__r g-num">{k < 3 ? <Icon n="crown" size={18} /> : k + 1}</span>
              <Avatar name={x.nick} size={28} me={x.me} />
              <span className="aw-list__n" dir="auto">{x.me ? t('common.you') : x.nick}</span>
              {x.tier ? <span className="g-mono aw-list__t">{t('tier.' + x.tier)}</span> : <span />}
              <b className="g-num">{num(Math.round(x.score))}</b>
            </li>; })}
          </ol>}
        {b && b !== 'off' && !rows.length && <p className="g-empty">{t('aw.empty')}</p>}
        <Pager p={pg} />
      </>}
    </div>
  </div>;
}

// Your place in each room you hold a seat in. A room the server no longer has is dropped with a one-line note.
function RoomsBoard({ chrome }: { chrome: Chrome }) {
  const t = useT();
  const s = useSave();
  const [list, setList] = useState<{ code: string; name: string; rank: number; n: number; pts: number }[] | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all(getSave().rooms.map(async (ref) => {
      const x = await loadRoom(ref);
      if ('gone' in x) { forgetRoom(ref.code); toast('info', t('hub.rooms.gone', { n: ref.name })); return null; }
      if ('seat' in x) { forgetRoom(ref.code); return null; }
      if ('error' in x) return { code: ref.code, name: ref.name, rank: 0, n: 0, pts: 0 };
      const st = standings(x.room, ref.pid), i = st.findIndex((r) => r.me);
      return { code: ref.code, name: x.room.name, rank: i + 1, n: st.length, pts: i >= 0 ? st[i].total : 0 };
    })).then((r) => { if (alive) setList(r.filter((x): x is NonNullable<typeof x> => !!x)); });
    return () => { alive = false; };
  }, [s.rooms.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const pg = usePaged(list || [], 5);
  if (!s.rooms.length) return <><p className="g-empty">{t('hub.boards.roomsNone')}</p><GBtn kind="dark" size="sm" onClick={() => chrome.go({ n: 'rooms' })}><Icon n="friends" size={18} />{t('hub.rooms.title')}</GBtn></>;
  if (!list) return <p className="g-mono aw-wait">{t('common.loading')}</p>;
  return <>
    <ol className="aw-list g-card">
      {pg.rows.map((r) => <li key={r.code} className={r.rank === 1 ? 'is-gold' : ''}>
        <span className="aw-list__r g-num">{r.rank === 1 ? <Icon n="crown" size={18} /> : r.rank || '–'}</span>
        <Avatar name={r.name} size={28} />
        <button className="aw-list__n aw-list__go" dir="auto" onClick={() => { sfx('open'); chrome.go({ n: 'rooms', code: r.code }); }}>{r.name}</button>
        <span className="g-mono aw-list__t">{r.rank ? t('hub.boards.roomRow', { r: r.rank, n: r.n, p: num(r.pts) }) : ''}</span>
        <b className="g-num">{num(r.pts)}</b>
      </li>)}
    </ol>
    <Pager p={pg} />
  </>;
}
