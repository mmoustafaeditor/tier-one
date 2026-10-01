// Boards (CONCEPT4 §2, §10): you against real players. Today's Daily, this week, the Market season and your groups.
// Your place is the biggest thing on the screen ("4th of 1,240"), prizes to collect sit on top, and every rank is a word
// ("1st"), never a crown (RULES4 §4). Boards are the server's own (lb.top, room.get, newsroom.get); prizes are coins.
import { useEffect, useState } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave } from '../lib/save';
import { v3 } from '../lib/api';
import { checkPrizes, claimPrize, unpaid, PRIZE } from '../lib/awards';
import { identity, myPlace, type Room, type Newsroom } from '../lib/social';
import { sfx } from '../lib/sfx';
import { Icon, TopBar, confetti } from '../ui/game';
import { Avatar } from '../ui/screenbits';
import { Pop, Count } from '../ui/juice';
import { ordinal, Handle, GridRow } from '../ui/social';
import { toast } from '../lib/meta';
import type { Chrome } from '../App';
import '../styles/social.css';

type Period = 'daily' | 'weekly' | 'wire';
type Tab = Period | 'groups';
type Board = { rows: { nick: string; score: number; tier?: string; row?: string; me: boolean }[]; me?: { rank: number; score: number }; players: number };
const TABS: Tab[] = ['daily', 'weekly', 'wire', 'groups'];

export function BoardsScreen({ period: p0, ...chrome }: Chrome & { period?: Period }) {
  const t = useT(); const s = useSave();
  const [tab, setTab] = useState<Tab>(p0 || 'daily');
  const [boards, setBoards] = useState<Partial<Record<Period, Board | 'off'>>>({});
  useEffect(() => { void checkPrizes(); }, []);
  useEffect(() => {
    if (tab === 'groups' || boards[tab]) return;
    v3<Board>('lb.top', { period: tab, dev: s.dev }).then((r) => setBoards((b) => ({ ...b, [tab]: r.ok ? r : 'off' })));
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const b = tab === 'groups' ? undefined : boards[tab];
  return <div className="g-screen bd">
    <TopBar back={{ label: t('md4.home'), onClick: chrome.home }} title={t('os.app.boards')} />
    <Prizes />
    <div className="bd-tabs" role="tablist" aria-label={t('os.app.boards')}>
      {TABS.map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { sfx('ui.tap'); setTab(k); }}>{t('md4.bd.tab.' + k)}</button>)}
    </div>
    {tab === 'groups' ? <GroupsBoard go={chrome.go} /> : <>
      <You b={b} period={tab} onPlay={() => chrome.go(tab === 'wire' ? { n: 'wire' } : { n: 'daily' })} />
      {tab !== 'wire' && <p className="bd-ladder">{t('md4.bd.ladder.' + tab, { a: PRIZE[tab][0], b: PRIZE[tab][1], c: PRIZE[tab][2], d: PRIZE[tab][3] })}</p>}
      {b === undefined ? <p className="bd-quiet">{t('md4.loading')}</p>
        : b === 'off' ? null
          : b.rows.length ? <ol className="bd-list">{b.rows.map((x, k) => <li key={k} className={(x.me ? 'is-me ' : '') + (k < 3 ? 'is-top' : '')}>
            <span className="bd-list__r">{ordinal(t, k + 1)}</span>
            <Avatar name={x.nick} size={30} me={x.me} />
            <span className="bd-list__n">{x.me ? t('common.you') : <Handle>{x.nick}</Handle>}{x.tier ? <small>{t('tier4.' + x.tier)}</small> : null}</span>
            {x.row ? <GridRow row={x.row} size="sm" /> : <span />}
            <b className="bd-list__s">{num(Math.round(x.score))}</b>
          </li>)}</ol>
            : <p className="bd-quiet">{t('md4.bd.empty.' + tab)}</p>}
      <p className="bd-fine">{t(tab === 'wire' ? 'md4.bd.fineWire' : 'md4.bd.fine')}</p>
    </>}
  </div>;
}

// ---------------------------------------------------------------- your place: the biggest thing on the screen
function You({ b, period, onPlay }: { b: Board | 'off' | undefined; period: Period; onPlay: () => void }) {
  const t = useT();
  const me = b && b !== 'off' ? b.me : undefined;
  if (me) return <section className="bd-you" aria-live="polite">
    <b className="bd-you__r">{ordinal(t, me.rank)}</b>
    <p className="bd-you__of">{t('md4.bd.of', { n: num(b && b !== 'off' ? b.players : 0) })}</p>
    <p className="bd-you__s"><Count n={Math.round(me.score)} /> {t(period === 'wire' ? 'md4.bd.cred' : 'md4.bd.pts')}</p>
  </section>;
  return <section className="bd-you bd-you--none">
    <p className="bd-you__t">{b === 'off' ? t('md4.bd.off') : t('md4.bd.notOn.' + period)}</p>
    {b !== 'off' && <Pop className="bd-play" onTap={onPlay} sound="os.open">{t('md4.bd.play.' + period)}</Pop>}
  </section>;
}

// ---------------------------------------------------------------- prizes to collect (finished days and weeks)
function Prizes() {
  const t = useT(); const s = useSave();
  const due = unpaid(s);
  if (!due.length) return null;
  const collect = (key: string) => { const n = claimPrize(key); if (!n) return; sfx('sparkle'); confetti(['#F2B632', '#FFD76A', '#3B82F6', '#F3F1EC'], 70); toast('ach', t('md4.bd.collected', { n })); };
  return <section className="bd-prizes" aria-label={t('md4.bd.prizes')}>
    {due.map((p) => <div key={p.key} className="bd-prize">
      <b className="bd-prize__r">{ordinal(t, p.rank)}</b>
      <span className="bd-prize__b"><b>{t('md4.bd.won.' + p.period)}</b><small>{t('md4.bd.of', { n: num(p.players) })}</small></span>
      <Pop className="bd-collect" onTap={() => collect(p.key)} sound={null}>{t('md4.bd.collect', { n: p.coins })}</Pop>
    </div>)}
  </section>;
}

// ---------------------------------------------------------------- your groups: each room's table and your crew
function GroupsBoard({ go }: { go: Chrome['go'] }) {
  const t = useT(); const s = useSave();
  const [rooms, setRooms] = useState<{ code: string; name: string; place: ReturnType<typeof myPlace> }[] | null>(null);
  const [crew, setCrew] = useState<Newsroom | null | undefined>(undefined);
  useEffect(() => {
    let on = true;
    (async () => {
      const out: { code: string; name: string; place: ReturnType<typeof myPlace> }[] = [];
      for (const r of s.rooms.slice(0, 8)) {
        const x = await v3<{ room: Room }>('room.get', { code: r.code }, 6000);
        out.push({ code: r.code, name: r.name, place: x.ok ? myPlace({ ...x.room, stepMs: x.room.stepMs || 864e5, feed: x.room.feed || [], now: x.room.now || Date.now() }, r.pid) : null });
      }
      if (on) setRooms(out);
      const n = await v3<{ newsroom: Newsroom | null }>('newsroom.get', { ...identity() });
      if (on) setCrew(n.ok ? n.newsroom : null);
    })();
    return () => { on = false; };
  }, [s.rooms.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s.rooms.length && crew === null) return <div className="bd-blank"><b>{t('md4.bd.groupsNone')}</b><p>{t('md4.bd.groupsNoneB')}</p><Pop className="bd-play" onTap={() => go({ n: 'rooms' })} sound="os.open">{t('md4.bd.openGroups')}</Pop></div>;
  return <div className="bd-groups">
    {rooms === null && <p className="bd-quiet">{t('md4.loading')}</p>}
    {rooms?.map((r) => <Pop key={r.code} className="bd-group" onTap={() => go({ n: 'rooms', code: r.code })} sound="os.open">
      <span className="bd-group__r">{r.place ? ordinal(t, r.place.place) : '–'}</span>
      <span className="bd-group__b"><b dir="auto">{r.name}</b><small>{r.place ? t('md4.bd.inRoom', { n: r.place.of, p: num(r.place.total) }) : t('md4.bd.roomOff')}</small></span>
      <Icon n={t.rtl ? 'back' : 'arrow'} size={18} />
    </Pop>)}
    {crew && <Pop className="bd-group bd-group--crew" onTap={() => go({ n: 'newsroom', code: crew.code })} sound="os.open">
      <span className="bd-group__r">{ordinal(t, crew.rank)}</span>
      <span className="bd-group__b"><b dir="auto">{crew.name}</b><small>{t('md4.bd.crewLine', { p: num(crew.total), n: crew.members.length })}</small></span>
      <Icon n={t.rtl ? 'back' : 'arrow'} size={18} />
    </Pop>}
  </div>;
}
