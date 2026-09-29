// Friends (DESIGN §5, HYBRID.md §3): private rooms (Daily rules exactly, one shared board per round, open 48 h, scored
// on our server) and the weekly league. 3.1: two tabs, big code entry, initials badges, a league table with lines.
import { Fragment, useEffect, useState } from 'react';
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave, update, getSave } from '../lib/save';
import { v3 } from '../lib/api';
import { useLeague } from '../lib/leagueData';
import { sfx } from '../lib/sfx';
import { Icon, GBtn, TopBar } from '../ui/game';
import { Avatar, Seg } from '../ui/screenbits';
import type { Chrome } from '../App';

interface RoomPlayer { pid: string; nick: string; results: ({ score: number; tier: string; ex: number; row: string } | null)[] }
interface Room { code: string; name: string; rounds: number; created: number; host: string; players: RoomPlayer[]; now: number; roundHours: number }

export function RoomsScreen({ code, ...chrome }: Chrome & { code?: string }) {
  const t = useT();
  const s = useSave();
  const [tab, setTab] = useState<'rooms' | 'league'>('rooms');
  const [open, setOpen] = useState<string | undefined>(s.rooms.find((r) => r.code === code) ? code : undefined);
  const [joinCode, setJoin] = useState(code && !s.rooms.find((r) => r.code === code) ? code : '');
  const [name, setName] = useState('');
  const [rounds, setRounds] = useState(5);
  const [nick, setNick] = useState(s.nick);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const mine = s.rooms.find((r) => r.code === open);
  const saveNick = () => { if (nick.trim()) update((x) => { x.nick = nick.trim().slice(0, 16); }); return nick.trim(); };
  const create = async () => {
    const n = saveNick(); if (!n) { setErr(t('rooms.errors.nick')); return; }
    setBusy(true); const r = await v3<{ room: Room; pid: string; sec: string }>('room.create', { nick: n, name: name || 'Tier One room', rounds }); setBusy(false);
    if (!r.ok) { setErr(t('rooms.errors.' + r.error)); return; }
    update((x) => { x.rooms.unshift({ code: r.room.code, name: r.room.name, pid: r.pid, sec: r.sec, nick: n }); }); setOpen(r.room.code);
  };
  const join = async () => {
    const n = saveNick(); if (!n) { setErr(t('rooms.errors.nick')); return; }
    const c = joinCode.trim().toUpperCase();
    if (getSave().rooms.some((r) => r.code === c)) { setOpen(c); return; }
    setBusy(true); const r = await v3<{ room: Room; pid: string; sec: string }>('room.join', { nick: n, code: c }); setBusy(false);
    if (!r.ok) { setErr(t('rooms.errors.' + r.error) || t('err.generic')); return; }
    update((x) => { x.rooms.unshift({ code: r.room.code, name: r.room.name, pid: r.pid, sec: r.sec, nick: n }); }); setOpen(r.room.code);
  };
  if (mine) return <RoomPage key={mine.code} room={mine} chrome={chrome} onBack={() => setOpen(undefined)} />;
  return <div className="g-screen rooms3">
    <TopBar onHelp={() => chrome.go({ n: 'howto' })} onMenu={chrome.openSettings} />
    <div className="stagger g-stack">
      <div className="g-tabs2" role="tablist" style={{ ['--i' as string]: 0 }}>
        {(['rooms', 'league'] as const).map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { sfx('ui.tap'); setTab(k); }}><Icon n={k === 'rooms' ? 'friends' : 'trophy'} size={18} />{t('g.rooms.tabs.' + k)}</button>)}
      </div>
      {tab === 'league' ? <LeagueCard /> : <>
        <section className="g-hero g-hero--rooms" style={{ ['--i' as string]: 1 }}>
          <span className="g-hero__art" aria-hidden="true"><Icon n="friends" /></span>
          <span className="g-mono g-hero__k">{t('g.rooms.k')}</span>
          <h1 className="g-hero__t">{t('g.rooms.hed')}</h1>
          <p className="g-hero__s">{t('g.rooms.sub')}</p>
          <label className="byline"><Avatar name={nick || '?'} size={40} me /><span className="byline__f"><small className="g-mono">{t('g.rooms.byline')}</small><input value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} onBlur={saveNick} aria-label={t('common.nick')} /></span><Icon n="story" size={16} /></label>
        </section>

        {s.rooms.length > 0 && <>
          <div className="g-sec" style={{ ['--i' as string]: 2 }}><h2>{t('rooms.mine')}</h2><span className="g-mono">{s.rooms.length}</span></div>
          <div className="myrooms" style={{ ['--i' as string]: 2 }}>{s.rooms.map((r) => <button key={r.code} className="myroom" onClick={() => { sfx('open'); setOpen(r.code); }}>
            <span className="myroom__code g-num">{r.code}</span>
            <span className="myroom__t"><b>{r.name}</b><small className="g-mono">{t('common.you')}: {r.nick}</small></span>
            <Icon n={t.rtl ? 'back' : 'arrow'} size={20} />
          </button>)}</div>
        </>}

        <div className="rooms3__two" style={{ ['--i' as string]: 3 }}>
          <form className="rcard rcard--join g-card" onSubmit={(e) => { e.preventDefault(); if (joinCode.trim().length >= 4 && !busy) join(); }}>
            <span className="rcard__ic"><Icon n="ticket" /></span>
            <h2 className="g-h2">{t('g.rooms.joinT')}</h2>
            <p className="g-sub">{t('g.rooms.joinSub')}</p>
            <input className="codebox" value={joinCode} onChange={(e) => setJoin(e.target.value.toUpperCase())} placeholder="ABCDE" maxLength={8} aria-label={t('rooms.code')} autoCapitalize="characters" spellCheck={false} />
            <button type="submit" className="g-btn g-btn--rooms" disabled={busy || joinCode.trim().length < 4} onClick={() => sfx('ui.tap')}><Icon n="arrow" size={22} />{t('rooms.joinBtn')}</button>
          </form>
          <section className="rcard g-card g-card--desk">
            <span className="rcard__ic rcard__ic--desk"><Icon n="star" /></span>
            <h2 className="g-h2">{t('g.rooms.createT')}</h2>
            <p className="g-sub">{t('g.rooms.createSub')}</p>
            <input className="g-input" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} placeholder={t('rooms.name')} aria-label={t('rooms.name')} />
            <Seg label={t('rooms.rounds')} value={rounds} onChange={setRounds} options={[5, 10, 20].map((n) => ({ v: n, label: n, sub: t('rooms.rounds') }))} />
            <GBtn kind="gold" disabled={busy} onClick={create} sound="open"><Icon n="friends" size={22} />{t('rooms.create')}</GBtn>
          </section>
        </div>
        {err && <p className="g-err" role="alert"><Icon n="x" size={16} />{err}</p>}
        <p className="g-fine g-mono" style={{ ['--i' as string]: 4 }}>{t('daily.fair')}</p>
      </>}
    </div>
  </div>;
}

function RoomPage({ room, chrome, onBack }: { room: { code: string; name: string; pid: string; sec: string; nick: string }; chrome: Chrome; onBack: () => void }) {
  const t = useT();
  const [r, setR] = useState<Room | null>(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => { v3<{ room: Room }>('room.get', { code: room.code }).then((x) => (x.ok ? setR(x.room) : setErr(x.error === 'net' ? t('rooms.needNet') : t('rooms.errors.' + x.error)))); }, [room.code]);
  const invite = location.origin + location.pathname + '?room=' + room.code;
  const standings = r ? r.players.map((p) => ({ ...p, total: p.results.reduce((a, x) => a + (x ? x.score : 0), 0), n: p.results.filter(Boolean).length })).sort((a, b) => b.total - a.total) : [];
  const me = r?.players.find((p) => p.pid === room.pid);
  const copy = () => { navigator.clipboard?.writeText(invite); sfx('ui.pop'); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const playRound = (k: number) => chrome.go({ n: 'room', room: { code: room.code, pid: room.pid, sec: room.sec, round: k }, key: Date.now() });
  return <div className="g-screen rooms3">
    <TopBar back={{ label: t('g.rooms.tabs.rooms'), onClick: onBack }} onMenu={chrome.openSettings} />
    <div className="stagger g-stack">
      <section className="g-hero g-hero--rooms" style={{ ['--i' as string]: 0 }}>
        <span className="g-mono g-hero__k">{t('rooms.title')}</span>
        <h1 className="g-hero__t">{room.name}</h1>
        <div className="roomcode">
          <span className="roomcode__c"><small className="g-mono">{t('g.rooms.code')}</small><b className="g-num">{room.code}</b></span>
          <button className="g-btn g-btn--sm g-btn--rooms" onClick={copy} title={invite}><Icon n={copied ? 'check' : 'share'} size={18} />{copied ? t('g.rooms.copied') : t('g.rooms.copy')}</button>
        </div>
        {r && <div className="members" aria-label={t('g.rooms.reporters', { n: r.players.length })}>
          {r.players.map((p) => <span key={p.pid} className={'member' + (p.pid === room.pid ? ' is-me' : '')}><Avatar name={p.nick} size={30} me={p.pid === room.pid} /><span>{p.pid === room.pid ? t('common.you') : p.nick}</span></span>)}
        </div>}
      </section>
      {err && <p className="g-err" role="alert">{err}</p>}
      {!r && !err && <p className="g-empty">{t('common.loading')}</p>}
      {r && <div className="rooms3__two">
        <section style={{ ['--i' as string]: 1 }}>
          <div className="g-sec"><h2>{t('g.rooms.roundsT')}</h2><span className="g-mono">{r.rounds}</span></div>
          <div className="rounds">{Array.from({ length: r.rounds }, (_, k) => {
            const opens = r.created + k * 864e5, closes = opens + r.roundHours * 3600e3, res = me?.results[k];
            const state = res ? 'played' : r.now < opens ? 'soon' : r.now > closes ? 'closed' : 'open';
            return <div key={k} className={'round is-' + state}>
              <span className="round__n g-num">{k + 1}</span>
              <span className="round__t"><b>{t('rooms.round', { n: k + 1 })}</b><small className="g-mono">{state === 'soon' ? t('rooms.opens', { t: fmtDate(opens, t.lang) }) : state === 'played' ? t('rooms.played', { p: num(res!.score) }) : state === 'closed' ? t('rooms.closed') : fmtDate(opens, t.lang)}</small></span>
              {state === 'open' ? <button className="g-btn g-btn--sm g-btn--rooms round__go is-pulse" onClick={() => { sfx('open'); playRound(k); }}><Icon n="phone" size={18} />{t('g.rooms.state.open')}</button>
                : state === 'played' ? <button className="g-btn g-btn--sm g-btn--dark round__go" onClick={() => { sfx('ui.tap'); playRound(k); }}><Icon n="news" size={18} />{t('daily.read')}</button>
                  : <span className="round__st g-mono">{state === 'soon' ? <Icon n="clock" size={14} /> : <Icon n="lock" size={14} />}{t('g.rooms.state.' + state)}</span>}
            </div>;
          })}</div>
        </section>
        <section style={{ ['--i' as string]: 2 }}>
          <div className="g-sec"><h2>{t('g.rooms.table')}</h2><span className="g-mono">{t('g.rooms.reporters', { n: standings.length })}</span></div>
          <div className="ltable g-card">
            <div className="ltable__h g-mono"><span>#</span><span>{t('league.reporter')}</span><span>{t('g.rooms.roundsT')}</span><span>{t('league.pts')}</span></div>
            {standings.map((p, k) => <div key={p.pid} className={'lrow' + (p.pid === room.pid ? ' is-me' : '') + (k === 0 ? ' is-top' : '')}>
              <span className="lrow__n g-num">{k === 0 ? <Icon n="crown" size={18} /> : k + 1}</span>
              <span className="lrow__who"><Avatar name={p.nick} size={28} me={p.pid === room.pid} /><b>{p.pid === room.pid ? t('common.you') : p.nick}</b></span>
              <span className="lrow__x">{p.n}</span><b className="lrow__p g-num">{num(p.total)}</b>
            </div>)}
          </div>
        </section>
      </div>}
    </div>
  </div>;
}

function LeagueCard() {
  const t = useT();
  const lg = useLeague();
  const n = lg ? lg.rows.length : 0;
  const downAt = lg && lg.down > 0 && n > lg.up + lg.down ? n - lg.down : -1;
  return <>
    <section className="g-hero g-hero--rooms league3" style={{ ['--i' as string]: 1 }}>
      <span className="g-hero__art" aria-hidden="true"><Icon n="trophy" /></span>
      <span className="g-mono g-hero__k">{t('g.rooms.leagueK')}{lg ? ' · ' + t('g.rooms.week', { w: lg.week.split('-W')[1] }) : ''}</span>
      <h1 className="g-hero__t">{lg ? t('league.divs.' + lg.div) : t('league.title')}</h1>
      {lg && <div className="divs" aria-hidden="true">{(t.list('league.divs') as string[]).map((d, k) => <span key={k} className={k === lg.div ? 'is-on' : k < lg.div ? 'is-past' : ''} title={d}><i />{k === lg.div ? d : ''}</span>)}</div>}
      {lg && <p className="g-hero__s">{t(lg.up && lg.down ? 'g.rooms.leagueSub' : lg.up ? 'g.rooms.leagueUp' : 'g.rooms.leagueDown', { u: lg.up, d: lg.down })}{lg.last ? ' ' + t('league.moved', { r: lg.last.rank, n: lg.last.size }) : ''}</p>}
    </section>
    {lg && lg.rows.length ? <div className="ltable ltable--league g-card" style={{ ['--i' as string]: 2 }}>
      <div className="ltable__h g-mono"><span>#</span><span>{t('league.reporter')}</span><span>{t('g.rooms.daily')}</span><span>{t('g.rooms.wire')}</span><span>{t('league.pts')}</span></div>
      {lg.rows.map((r, k) => <Fragment key={k}>
        {downAt === k && <div className="zline zline--down"><Icon n="arrow" size={14} style={{ transform: 'rotate(90deg)' }} />{t('league.down')}</div>}
        <div className={'lrow' + (r.me ? ' is-me' : '') + (k < lg.up ? ' is-up' : '') + (downAt >= 0 && k >= downAt ? ' is-down' : '')}>
          <span className="lrow__n g-num">{k + 1}</span>
          <span className="lrow__who"><Avatar name={r.nick} size={28} me={r.me} /><b>{r.me ? t('common.you') : r.nick}</b></span>
          <span className="lrow__x">{r.daily}</span><span className="lrow__x">{Math.round(r.wire)}</span><b className="lrow__p g-num">{Math.round(r.pts)}</b>
        </div>
        {lg.up > 0 && k === lg.up - 1 && n > lg.up && <div className="zline zline--up"><Icon n="arrow" size={14} style={{ transform: 'rotate(-90deg)' }} />{t('league.up')}</div>}
      </Fragment>)}
    </div> : <div className="g-empty g-card g-card--desk" style={{ ['--i' as string]: 2 }}><Icon n="trophy" size={28} /><span>{lg ? t('league.empty') : t('wire.needNet')}</span></div>}
    <details className="g-more g-more--desk" style={{ ['--i' as string]: 3 }}><summary><Icon n="help" size={16} />{t('g.rooms.how')}</summary><p>{t('league.note')}</p></details>
  </>;
}
