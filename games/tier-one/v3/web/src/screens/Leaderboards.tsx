// Leaderboards (UI41 §Leaderboards): one screen, three tabs. Daily Challenge (today · this week), Rooms (each of your
// rooms' standings), Transfer Market (this season). Top rows page with <Pager>; your own rank sits pinned under the list.
// Each mode's own "Leaderboard" button opens this screen on its tab ({ n: 'boards', tab }).
import { useEffect, useState } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave } from '../lib/save';
import { sfx } from '../lib/sfx';
import { v3 } from '../lib/api';
import { toast } from '../lib/meta';
import { unpaid, claimPrize, checkPrizes } from '../lib/awards';
import { identity, standings, type Room } from '../lib/social';
import { Screen, Pager, Chips } from '../ui/screen';
import { ordinal } from '../ui/social';
import { isUnlocked, unlockLevel } from '../ui/phone';
import type { Chrome, BoardTab } from '../App';

type Period = 'daily' | 'weekly' | 'wire';
type Board = { rows: { nick: string; score: number; tier?: string; me: boolean }[]; me?: { rank: number; score: number }; players: number };
type Row = { nick: string; score: number; me: boolean };

export function BoardsScreen({ tab: want, period, ...chrome }: Chrome & { tab?: BoardTab; period?: 'weekly' }) {
  const t = useT();
  const s = useSave();
  const [tab, setTab] = useState<BoardTab>(want || 'daily');
  useEffect(() => { void checkPrizes(); }, []);
  const foot = tab === 'daily' ? <button type="button" className="s41-btn s41-btn--main" onClick={() => chrome.go({ n: 'daily' })}>{s.daily[new Date().toISOString().slice(0, 10)] ? t('s41.pc.seeToday') : t('s41.pc.playDaily')}</button>
    : tab === 'rooms' ? (isUnlocked('rooms', s) ? <button type="button" className="s41-btn s41-btn--main" onClick={() => chrome.go({ n: 'rooms' })}>{t('s41.pc.openRooms')}</button> : undefined)
    : <button type="button" className="s41-btn s41-btn--main" onClick={() => chrome.go({ n: 'wire' })}>{t('s41.pc.openWire')}</button>;
  return <Screen title={t('s41.app.boards')} onBack={chrome.back} footer={foot}>
    <Chips value={tab} onChange={(k) => { sfx('ui.tap'); setTab(k); }} options={[
      { k: 'daily', label: t('s41.app.daily') }, { k: 'rooms', label: t('s41.lb.rooms') }, { k: 'wire', label: t('s41.app.wire') },
    ]} />
    <div className="pc-body" key={tab}>
      {tab === 'daily' && <ServerBoard periods={['daily', 'weekly']} first={period === 'weekly' ? 'weekly' : 'daily'} />}
      {tab === 'wire' && <ServerBoard periods={['wire']} first="wire" />}
      {tab === 'rooms' && (isUnlocked('rooms', s) ? <RoomBoards /> : <p className="pc-empty">{t('s41.pc.locked', { app: t('s41.app.rooms'), n: unlockLevel('rooms') })}</p>)}
    </div>
  </Screen>;
}

function Rows({ rows, me, players }: { rows: Row[]; me: { rank: number } | null; players?: number }) {
  const t = useT();
  return <>
    <Pager items={rows} per={5} empty={t('s41.pc.notOn')} render={(x, k) => <div key={k} className={'pc-row' + (x.me ? ' is-me' : '')}>
      <b className="pc-row__r">{ordinal(t, k + 1)}</b><span className="pc-row__n" dir="auto">{x.me ? t('common.you') : '@' + x.nick}</span><b className="pc-row__s g-num">{num(Math.round(x.score))}</b>
    </div>} />
    <p className="pc-you">{me ? <><b>{ordinal(t, me.rank)}</b>{players ? <span>{t('md4.bd.of', { n: num(players) })}</span> : null}</> : <span>{t('s41.pc.notOn')}</span>}</p>
  </>;
}

function ServerBoard({ periods, first }: { periods: Period[]; first: Period }) {
  const t = useT();
  const s = useSave();
  const [p, setP] = useState<Period>(first);
  const [boards, setBoards] = useState<Partial<Record<Period, Board | 'off'>>>({});
  useEffect(() => {
    if (boards[p]) return;
    v3<Board>('lb.top', { period: p, dev: s.dev }).then((r) => setBoards((b) => ({ ...b, [p]: r.ok ? r : 'off' })));
  }, [p]); // eslint-disable-line react-hooks/exhaustive-deps
  const b = boards[p];
  const due = unpaid(s);
  const collect = (key: string) => { const n = claimPrize(key); if (n) { sfx('sparkle'); toast('ach', t('md4.bd.collected', { n })); } };
  return <>
    {periods.length > 1 && <Chips value={p} onChange={(k) => { sfx('ui.tap'); setP(k); }} options={[{ k: 'daily', label: t('s41.pc.today') }, { k: 'weekly', label: t('s41.pc.week') }]} />}
    {p !== 'wire' && due[0] && <div className="pc-prize"><span>{t('s41.pc.prize', { r: ordinal(t, due[0].rank) })}</span><button type="button" className="s41-btn s41-btn--sm" onClick={() => collect(due[0].key)}>{t('s41.pc.collect', { n: due[0].coins })}</button></div>}
    {b === undefined ? <p className="pc-empty">{t('md4.loading')}</p>
      : b === 'off' ? <p className="pc-empty">{t('s41.lb.off')}</p>
      : <Rows rows={b.rows} me={b.me || null} players={b.players} />}
  </>;
}

function RoomBoards() {
  const t = useT();
  const s = useSave();
  const [i, setI] = useState(0);
  const [rooms, setRooms] = useState<Record<string, Room | 'off'>>({});
  const mine = s.rooms[i];
  useEffect(() => {
    if (!mine || rooms[mine.code]) return;
    v3<{ room: Room }>('room.get', { code: mine.code, pid: mine.pid, sec: mine.sec, ...identity() }).then((x) => setRooms((r) => ({ ...r, [mine.code]: x.ok && x.room ? x.room : 'off' })));
  }, [mine?.code]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!mine) return <p className="pc-empty">{t('s41.lb.noRooms')}</p>;
  const r = rooms[mine.code];
  const rows = r && r !== 'off' ? standings(r, mine.pid).map((x) => ({ nick: x.p.nick, score: x.total, me: x.me })) : [];
  const meAt = rows.findIndex((x) => x.me);
  return <>
    <nav className="pg__nav lb-room">
      <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} aria-label={t('s41.lb.prevRoom')}>‹</button>
      <b dir="auto">{mine.name || mine.code}</b>
      <button type="button" disabled={i >= s.rooms.length - 1} onClick={() => setI(i + 1)} aria-label={t('s41.lb.nextRoom')}>›</button>
    </nav>
    {r === undefined ? <p className="pc-empty">{t('md4.loading')}</p>
      : r === 'off' ? <p className="pc-empty">{t('s41.lb.off')}</p>
      : <Rows rows={rows} me={meAt >= 0 ? { rank: meAt + 1 } : null} players={rows.length} />}
  </>;
}
