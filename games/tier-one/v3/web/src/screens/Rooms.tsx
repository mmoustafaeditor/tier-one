// Multiplayer = Rooms (3.6, owner decisions). A room is a newsroom of friends with a season table, rounds on the real
// calendar and a room feed (calls, taunts, done-deal cards); Spectate replays a finished round as a film strip.
// Challenges and newsrooms are gone from the UI: their old links land here with a polite "This link has expired".
// A room you leave (room.leave) or one the server has closed (21 days without play) drops off your list.
// Daily rules exactly on every board; scored on the server. Nothing here changes a Daily board or score. One screen.
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave, update, getSave } from '../lib/save';
import { v3 } from '../lib/api';
import { sfx, buzz } from '../lib/sfx';
import { currentSeason, isoWeek } from '../lib/season';
import { OUTS } from '../lib/engine';
import { toast } from '../lib/meta';
import { Icon, GBtn, TopBar } from '../ui/game';
import { Avatar, Seg } from '../ui/screenbits';
import { Glyph, Empty, Sheet } from '../ui/bits';
import { Byline, Handle, withHandle } from '../ui/social';
import {
  identity, syncRoom, standings, roundState, roundOpens, roundCloses, currentRound, roomUrl, loadRoom, leaveRoom, forgetRoom,
  type Room, type RoomRound, type Standing, type RoomRef,
} from '../lib/social';
import type { Chrome } from '../App';
import { usePaged, Pager } from '../ui/fit';

const sx = (i: number): CSSProperties => ({ ['--i' as string]: i });

export function RoomsScreen({ code, expired, ...chrome }: Chrome & { code?: string; expired?: boolean }) {
  const t = useT();
  const s = useSave();
  const [open, setOpen] = useState<string | undefined>(s.rooms.find((r) => r.code === code) ? code : undefined);
  const [joinCode, setJoin] = useState(code && !s.rooms.find((r) => r.code === code) ? code : '');
  const [sheet, setSheet] = useState<null | 'join' | 'create'>(code && !s.rooms.find((r) => r.code === code) ? 'join' : null);
  const [name, setName] = useState('');
  const [rounds, setRounds] = useState(10);
  const [cadence, setCadence] = useState<'weekly' | 'daily'>('weekly');
  const [nick, setNick] = useState(s.nick);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<string[]>(expired ? [t('hub.expired')] : []);
  const mine = s.rooms.find((r) => r.code === open);
  const pg = usePaged(s.rooms, 4);
  const saveNick = () => { if (nick.trim()) update((x) => { x.nick = nick.trim().slice(0, 16); }); return nick.trim(); };
  const remember = (r: { room: Room; pid: string; sec: string }, n: string) => { update((x) => { x.rooms = [{ code: r.room.code, name: r.room.name, pid: r.pid, sec: r.sec, nick: n }, ...x.rooms.filter((q) => q.code !== r.room.code)]; }); setSheet(null); setOpen(r.room.code); };
  const create = async () => {
    const n = saveNick(); if (!n) { setErr(t('rooms.errors.nick')); return; }
    setBusy(true); const r = await v3<{ room: Room; pid: string; sec: string }>('room.create', { ...identity(), nick: n, name: name || t('hub.rooms.name'), rounds, cadence }); setBusy(false);
    if (!r.ok) { setErr(t.or('rooms.errors.' + r.error, 'err.generic')); return; }
    remember(r, n);
  };
  const join = async () => {
    const n = saveNick(); if (!n) { setErr(t('rooms.errors.nick')); return; }
    const c = joinCode.trim().toUpperCase();
    if (getSave().rooms.some((r) => r.code === c)) { setSheet(null); setOpen(c); return; }
    setBusy(true); const r = await v3<{ room: Room; pid: string; sec: string }>('room.join', { ...identity(), nick: n, code: c }); setBusy(false);
    if (!r.ok) { setErr(t.or('rooms.errors.' + r.error, 'err.generic')); return; }
    remember(r, n);
  };
  const closeRoom = (note?: string) => { setOpen(undefined); if (note) setNotes((x) => [note, ...x].slice(0, 2)); };
  if (mine) return <RoomPage key={mine.code} room={mine} chrome={chrome} onBack={closeRoom} />;
  const nickRow = <label className="byline"><Avatar name={nick || '?'} size={36} me /><span className="byline__f"><small className="g-mono">{t('g.rooms.byline')}</small><input value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} onBlur={saveNick} aria-label={t('common.nick')} /></span><Icon n="story" size={16} /></label>;
  return <div className="g-screen rooms3 pressbox fit">
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('hub.rooms.title')} onHelp={() => chrome.go({ n: 'howto' })} />
    <div className="fit__body">
      {notes.map((x, k) => <p key={k} className="g-err rm-note" role="status"><Icon n="clock" size={16} />{x}</p>)}
      <section className="g-hero g-hero--rooms" style={{ ...sx(0), padding: '12px 14px' }}>
        <span className="g-mono g-hero__k">{t('hub.mode.multi')}</span>
        <h1 className="g-hero__t" style={{ fontSize: 24 }}>{t('so.box.hed')}</h1>
        <p className="g-hero__s">{t('so.box.sub')}</p>
      </section>
      <div className="rm-acts">
        <GBtn kind="gold" sound="open" onClick={() => { setErr(''); setSheet('create'); }}><Icon n="star" size={20} />{t('hub.rooms.create')}</GBtn>
        <button className="g-btn g-btn--rooms" onClick={() => { sfx('ui.tap'); setErr(''); setSheet('join'); }}><Icon n="ticket" size={20} />{t('rooms.join')}</button>
      </div>
      {s.rooms.length > 0 ? <>
        <div className="g-sec" style={{ margin: 0 }}><h2>{t('so.box.mine')}</h2><span className="g-mono">{s.rooms.length}</span></div>
        <div className="myrooms rm-list">{pg.rows.map((r) => <button key={r.code} className="myroom" onClick={() => { sfx('open'); setOpen(r.code); }}>
          <span className="myroom__code g-num">{r.code}</span>
          <span className="myroom__t"><b>{r.name}</b><small className="g-mono">{t('common.you')}: <Handle>{r.nick}</Handle></small></span>
          <Icon n={t.rtl ? 'back' : 'arrow'} size={20} />
        </button>)}</div>
        <Pager p={pg} />
      </> : <Empty card icon="friends" title={t('rooms.none')} />}
      <GBtn kind="dark" size="sm" onClick={() => chrome.go({ n: 'boards', period: 'rooms', from: { n: 'rooms' } })}><Icon n="trophy" size={18} />{t('hub.board')}</GBtn>
    </div>

    <Sheet open={sheet === 'join'} onClose={() => setSheet(null)} label={t('g.rooms.joinT')}>
      <form className="rm-form" onSubmit={(e) => { e.preventDefault(); if (joinCode.trim().length >= 4 && !busy) join(); }}>
        <h2 className="g-h2" style={{ color: 'var(--card-ink)' }}>{t('g.rooms.joinT')}</h2>
        <p className="g-sub" style={{ color: 'var(--card-ink-2)' }}>{t('g.rooms.joinSub')}</p>
        {nickRow}
        <input className="codebox" value={joinCode} onChange={(e) => setJoin(e.target.value.toUpperCase())} placeholder="ABCDE" maxLength={8} aria-label={t('rooms.code')} autoCapitalize="characters" spellCheck={false} />
        <button type="submit" className="g-btn g-btn--rooms" disabled={busy || joinCode.trim().length < 4} onClick={() => sfx('ui.tap')}><Icon n="arrow" size={22} />{t('rooms.joinBtn')}</button>
        {err && <p className="g-err" role="alert"><Icon n="x" size={16} />{err}</p>}
      </form>
    </Sheet>
    <Sheet open={sheet === 'create'} onClose={() => setSheet(null)} label={t('g.rooms.createT')}>
      <div className="rm-form">
        <h2 className="g-h2" style={{ color: 'var(--card-ink)' }}>{t('g.rooms.createT')}</h2>
        {nickRow}
        <input className="g-input" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} placeholder={t('rooms.name')} aria-label={t('rooms.name')} />
        <Seg label={t('so.box.cadence')} value={cadence} onChange={setCadence} options={[{ v: 'weekly' as const, label: t('so.box.weekly'), sub: t('so.box.weeklySub') }, { v: 'daily' as const, label: t('so.box.daily'), sub: t('so.box.dailySub') }]} />
        <Seg label={t('rooms.rounds')} value={rounds} onChange={setRounds} options={[5, 10, 20].map((n) => ({ v: n, label: n, sub: t('rooms.rounds') }))} />
        <GBtn kind="gold" disabled={busy} onClick={create} sound="open"><Icon n="friends" size={22} />{t('rooms.create')}</GBtn>
        {err && <p className="g-err" role="alert"><Icon n="x" size={16} />{err}</p>}
      </div>
    </Sheet>
  </div>;
}

// ---------------------------------------------------------------- one room: Rounds · Table · Feed, and Leave room
type RTab = 'rounds' | 'table' | 'feed';
function RoomPage({ room, chrome, onBack }: { room: RoomRef; chrome: Chrome; onBack: (note?: string) => void }) {
  const t = useT();
  const [r, setR] = useState<Room | null>(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [spec, setSpec] = useState<number | null>(null);
  const [tab, setTab] = useState<RTab>('rounds');
  const [tauntOpen, setTauntOpen] = useState(false);
  const [tauntTo, setTauntTo] = useState<string | null>(null);
  const [tauntMsg, setTauntMsg] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const x = await loadRoom(room);
    if ('gone' in x) { forgetRoom(room.code); onBack(t('hub.rooms.gone', { n: room.name })); return; }
    if ('error' in x) { setErr(x.error === 'net' ? t('rooms.needNet') : t.or('rooms.errors.' + x.error, 'err.generic')); return; }
    setR(x.room); syncRoom(x.room, room.pid);
  };
  useEffect(() => { load(); }, [room.code]); // eslint-disable-line react-hooks/exhaustive-deps
  const invite = roomUrl(room.code);
  const rows = useMemo(() => (r ? standings(r, room.pid) : []), [r, room.pid]);
  const me = r?.players.find((p) => p.pid === room.pid);
  const copy = () => { navigator.clipboard?.writeText(invite); sfx('ui.pop'); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const playRound = (k: number) => chrome.go({ n: 'room', room: { code: room.code, pid: room.pid, sec: room.sec, round: k }, key: Date.now() });
  const season = currentSeason();
  const cur = r ? currentRound(r) : 0;
  const curState = r ? (cur >= r.rounds - 1 && r.now > roundCloses(r, r.rounds - 1) ? 'closed' : roundState(r, cur, me)) : 'open';
  const PER = 4;
  const rounds = useMemo(() => Array.from({ length: r ? r.rounds : 0 }, (_, k) => k), [r?.rounds]); // eslint-disable-line react-hooks/exhaustive-deps
  const rp = usePaged(rounds, PER, r ? r.code + ':' + cur : '', Math.floor(cur / PER));
  const tp = usePaged(rows, 6);
  const fp = usePaged(r?.feed || [], 4);
  const taunt = async (k: number) => {
    const x = await v3<{ feed: Room['feed'] }>('room.post', { code: room.code, pid: room.pid, sec: room.sec, k, to: tauntTo || undefined });
    if (!x.ok) { setTauntMsg(x.error === 'slow' ? t('so.room.tauntSlow') : t('err.generic')); return; }
    sfx('publish.talks'); buzz(10); setTauntMsg(t('so.room.tauntSent')); setTauntOpen(false);
    setR((cur0) => (cur0 ? { ...cur0, feed: x.feed } : cur0)); setTimeout(() => setTauntMsg(''), 1800);
  };
  const leave = async () => {
    setBusy(true); const ok = await leaveRoom(room); setBusy(false);
    if (!ok) { toast('warn', t('rooms.needNet')); return; }
    sfx('ui.pop'); setLeaving(false); onBack(t('hub.rooms.left', { n: room.name }));
  };
  if (spec != null && r) return <Spectate room={room} round={spec} onBack={() => setSpec(null)} chrome={chrome} />;
  return <div className="g-screen rooms3 pressbox pb-room fit">
    <TopBar back={{ label: t('hub.rooms.title'), onClick: () => onBack() }} title={room.name} />
    <div className="fit__body">
      <section className="g-hero g-hero--rooms" style={sx(0)}>
        <span className="g-mono g-hero__k">{season.name} · {t('so.box.week', { w: isoWeek().key.split('-W')[1] })}</span>
        <div className="roomcode">
          <span className="roomcode__c"><small className="g-mono">{t('g.rooms.code')}</small><b className="g-num">{room.code}</b></span>
          <button className="g-btn g-btn--sm g-btn--rooms" onClick={copy} title={invite}><Icon n={copied ? 'check' : 'share'} size={18} />{copied ? t('g.rooms.copied') : t('g.rooms.copy')}</button>
        </div>
        {r && <p className="so-state g-mono"><Icon n={curState === 'open' ? 'phone' : curState === 'played' ? 'check' : curState === 'soon' ? 'clock' : 'lock'} size={14} />{t('so.room.stateLine.' + curState, { n: cur + 1 })} · {t('g.rooms.reporters', { n: r.players.length })}</p>}
      </section>
      {err && <p className="g-err" role="alert">{err}</p>}
      {!r && !err && <p className="g-empty">{t('common.loading')}</p>}
      {r && <>
        <div className="g-tabs2 rm-tabs" role="tablist">
          {(['rounds', 'table', 'feed'] as const).map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { sfx('ui.tap'); setTab(k); }}>{t('hub.rooms.tabs.' + k)}</button>)}
        </div>
        {tab === 'rounds' && <>
          <div className="rounds">{rp.rows.map((k) => {
            const opens = roundOpens(r, k), closes = roundCloses(r, k), res = me?.results[k], state = roundState(r, k, me);
            const when = r.cadence === 'weekly' ? fmtDate(opens, t.lang, { day: 'numeric', month: 'short' }) + ' – ' + fmtDate(closes - 1, t.lang, { day: 'numeric', month: 'short' }) : fmtDate(opens, t.lang);
            const canWatch = !!res && (r.now > closes || r.players.every((p) => p.results[k]));
            return <div key={k} className={'round is-' + state + (k === cur ? ' is-cur' : '')}>
              <span className="round__n g-num">{k + 1}</span>
              <span className="round__t"><b>{t('rooms.round', { n: k + 1 })}</b><small className="g-mono">{state === 'played' ? t('rooms.played', { p: num(res!.score) }) + ' · ' + when : state === 'soon' ? t('rooms.opens', { t: when }) : state === 'closed' ? t('rooms.closed') + ' · ' + when : (r.cadence === 'weekly' ? t('so.room.open') : t('g.rooms.state.open')) + ' · ' + when}</small></span>
              {state === 'open' ? <button className="g-btn g-btn--sm g-btn--rooms round__go is-pulse" onClick={() => { sfx('open'); playRound(k); }}><Icon n="phone" size={18} />{t('so.room.play')}</button>
                : state === 'played' ? <span className="round__acts">{canWatch && <button className="g-btn g-btn--sm g-btn--gold round__go" onClick={() => { sfx('open'); setSpec(k); }}><Icon n="eye" size={18} />{t('so.room.watch')}</button>}<button className="g-btn g-btn--sm g-btn--dark round__go" onClick={() => { sfx('ui.tap'); playRound(k); }}><Icon n="news" size={18} />{t('so.room.read')}</button></span>
                  : <span className="round__st g-mono">{state === 'soon' ? <Icon n="clock" size={14} /> : <Icon n="lock" size={14} />}{t('g.rooms.state.' + state)}</span>}
            </div>;
          })}</div>
          <Pager p={rp} />
        </>}
        {tab === 'table' && <><SeasonTable rows={tp.rows} from={tp.page * 6} /><Pager p={tp} /></>}
        {tab === 'feed' && <>
          <div className="rm-bar">
            <button className="g-btn g-btn--sm g-btn--rooms so-tauntbtn" aria-expanded={tauntOpen} onClick={() => { sfx('ui.tap'); setTauntOpen((v) => !v); }}><Icon n="reply" size={16} />{t('so.room.taunt')}</button>
            {tauntMsg && <span className="g-mono so-tauntmsg" role="status">{tauntMsg}</span>}
          </div>
          <Feed room={r} myPid={room.pid} events={fp.rows} />
          <Pager p={fp} />
        </>}
      </>}
      <div className="rm-bar">
        <GBtn kind="dark" size="sm" onClick={() => chrome.go({ n: 'boards', period: 'rooms', from: { n: 'rooms', code: room.code } })}><Icon n="trophy" size={18} />{t('hub.board')}</GBtn>
        <GBtn kind="ghost" size="sm" onClick={() => setLeaving(true)}><Icon n="x" size={18} />{t('hub.rooms.leave')}</GBtn>
      </div>
    </div>

    {r && <Sheet open={tauntOpen} onClose={() => setTauntOpen(false)} label={t('so.room.taunt')}>
      <div className="so-taunter g-card" role="group" aria-label={t('so.room.taunt')}>
        <div className="so-taunter__to">
          <button type="button" aria-pressed={tauntTo == null} onClick={() => setTauntTo(null)}>{t('so.room.tauntRoom')}</button>
          {r.players.filter((p) => p.pid !== room.pid).map((p) => <button key={p.pid} type="button" aria-pressed={tauntTo === p.pid} onClick={() => setTauntTo(p.pid)}><Avatar name={p.nick} size={20} /><Handle>{p.nick}</Handle></button>)}
        </div>
        <div className="so-taunter__lines">{(t.list('so.room.taunts') as string[]).map((line, k) => <button key={k} type="button" onClick={() => taunt(k)}>“{line}”</button>)}</div>
      </div>
    </Sheet>}
    <Sheet open={leaving} onClose={() => setLeaving(false)} label={t('hub.rooms.leave')}>
      <div className="rm-sure">
        <h2 className="g-h2" style={{ color: 'var(--card-ink)' }}>{t('hub.rooms.leaveSure', { n: room.name })}</h2>
        <div className="rm-sure__b">
          <GBtn disabled={busy} loading={busy} onClick={leave}><Icon n="x" size={18} />{t('hub.rooms.leaveYes')}</GBtn>
          <GBtn kind="paper" onClick={() => setLeaving(false)}>{t('hub.rooms.stay')}</GBtn>
        </div>
      </div>
    </Sheet>
  </div>;
}

function SeasonTable({ rows, from = 0 }: { rows: Standing[]; from?: number }) {
  const t = useT();
  return <div className="ltable ltable--season g-card">
    <div className="ltable__h g-mono"><span>#</span><span>{t('league.reporter')}</span><span>{t('so.room.p')}</span><span>{t('so.room.w')}</span><span>{t('so.room.pts')}</span></div>
    {rows.map((x, j) => { const k = from + j; return <div key={x.p.pid} className={'lrow' + (x.me ? ' is-me' : '') + (k === 0 && x.total > 0 ? ' is-top' : '')}>
      <span className="lrow__n g-num">{k === 0 && x.total > 0 ? <Icon n="crown" size={18} /> : k + 1}</span>
      <span className="lrow__who"><Byline who={x.p} me={x.me} size={28} tier={false} /><span className="so-form" aria-label={t('so.room.form')}>{x.form.map((f, i) => <i key={i} className={'is-' + f} />)}</span></span>
      <span className="lrow__x">{x.n}</span><span className="lrow__x">{x.wins}</span><b className="lrow__p g-num">{num(x.total)}</b>
    </div>; })}
  </div>;
}

function Feed({ room, myPid, events }: { room: Room; myPid: string; events: Room['feed'] }) {
  const t = useT();
  const lines = t.list('so.room.taunts') as string[];
  if (!room.feed.length) return <Empty card icon="news" title={t('so.room.empty')} />;
  const who = (n: string) => <Handle>{n}</Handle>;
  return <div className="so-feed cn-sheet">{events.map((ev, k) => {
    const me = ev.pid === myPid;
    if (ev.t === 'filed') return <Fragment key={k}>
      {(ev.hwg || []).slice(0, 1).map((p, j) => <div key={j} className="so-fev so-fev--hwg"><span className="so-fev__ic" aria-hidden="true"><Icon n="bolt" size={16} /></span><span className="so-fev__b"><b className="so-hwg">{t('so.room.ev.hwgT')}</b><span dir="auto">{withHandle(t('so.room.ev.hwg', { n: '{n}', p }), ev.nick)}</span></span><time className="cn-row__at">{fmtDate(ev.at, t.lang, { day: 'numeric', month: 'short' })}</time></div>)}
      <div className={'so-fev so-fev--filed' + (me ? ' is-me' : '')}><Avatar name={ev.nick} size={30} me={me} /><span className="so-fev__b"><span dir="auto">{withHandle(t('so.room.ev.filed', { n: '{n}', r: (ev.round || 0) + 1, p: num(ev.score || 0), tier: t('tier.' + ev.tier) }), ev.nick)}</span><Row row={ev.row || ''} /></span><time className="cn-row__at">{fmtDate(ev.at, t.lang, { day: 'numeric', month: 'short' })}</time></div>
    </Fragment>;
    if (ev.t === 'taunt') return <div key={k} className={'so-fev so-fev--taunt' + (me ? ' is-me' : '')}><Avatar name={ev.nick} size={30} me={me} /><span className="so-fev__b"><b>{who(ev.nick)}{ev.toNick && <> → {who(ev.toNick)}</>}</b><q dir="auto">{lines[ev.k || 0] || ''}</q></span><time className="cn-row__at">{fmtDate(ev.at, t.lang, { day: 'numeric', month: 'short' })}</time></div>;
    return <div key={k} className="so-fev so-fev--quiet"><span className="so-fev__ic" aria-hidden="true"><Icon n={ev.t === 'open' ? 'star' : 'friends'} size={14} /></span><span className="so-fev__b" dir="auto">{withHandle(t('so.room.ev.' + ev.t, { n: '{n}', name: ev.name || '' }), ev.nick)}</span><time className="cn-row__at">{fmtDate(ev.at, t.lang, { day: 'numeric', month: 'short' })}</time></div>;
  })}</div>;
}
const Row = ({ row }: { row: string }) => <span className="so-row" aria-hidden="true">{(row || '').split('').map((ch, k) => <i key={k} className={ch === '★' ? 'x' : ch === '■' ? 'r' : ch === '□' ? 'w' : 'n'} />)}</span>;

// ---------------------------------------------------------------- Spectate: the round as a film strip, one column a day
function Spectate({ room, round, onBack, chrome }: { room: { code: string; pid: string; sec: string; name: string }; round: number; onBack: () => void; chrome: Chrome }) {
  const t = useT(); const s = useSave();
  const [rr, setRr] = useState<RoomRound | null>(null);
  const [err, setErr] = useState('');
  const [waiting, setWaiting] = useState(0);
  const reduced = s.reduced;
  const [day, setDay] = useState(reduced ? 7 : 0);
  const [playing, setPlaying] = useState(!reduced);
  const timer = useRef(0);
  useEffect(() => {
    v3<RoomRound & { waiting?: number }>('room.round', { code: room.code, pid: room.pid, sec: room.sec, round }).then((x) => {
      if (!x.ok) { if (x.error === 'not yet') setWaiting(Number(x.waiting) || 0); else setErr(t.or('rooms.errors.' + x.error, 'err.generic')); return; }
      setRr(x);
    });
  }, [room.code, round]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!rr || !playing || reduced) return;
    timer.current = window.setTimeout(() => { setDay((d) => { const n = Math.min(rr.days, d + 1); if (n >= rr.days) setPlaying(false); sfx(n === rr.days ? 'dd.whistle' : 'thock'); return n; }); }, day === 0 ? 500 : 1100);
    return () => clearTimeout(timer.current);
  }, [rr, playing, day, reduced]);
  const days = rr ? rr.days : 7;
  const cast = rr?.cast || [];
  const back = { label: room.name, onClick: onBack };
  return <div className="g-screen rooms3 pressbox pb-spec">
    <TopBar back={back} onMenu={chrome.openSettings} />
    <div className="g-stack">
      <header className="cn-head"><span className="g-mono g-hero__k" style={{ color: 'var(--m-rooms)' }}>{t('rooms.round', { n: round + 1 })} · {room.name}</span><h1>{t('so.spec.title')}</h1><p>{t('so.spec.sub')}</p></header>
      {err && <p className="g-err" role="alert">{err}</p>}
      {!rr && !err && (waiting ? <div className="g-empty g-card g-card--desk"><Icon n="clock" size={22} /><span>{t('so.room.waiting', { n: waiting })}. {t('so.room.notYet')}</span></div> : <p className="g-empty">{t('common.loading')}</p>)}
      {rr && <>
        <div className="so-spec__bar">
          <div className="so-spec__days" role="tablist" aria-label={t('so.spec.day', { n: '' })}>{Array.from({ length: days }, (_, k) => <button key={k} role="tab" aria-selected={day === k + 1} className={k + 1 <= day ? 'is-on' : ''} onClick={() => { setPlaying(false); setDay(k + 1); sfx('ui.tap'); }}>{k + 1 === days ? t('so.spec.dd') : k + 1}</button>)}</div>
          {!reduced && <button className="g-btn g-btn--sm g-btn--rooms" onClick={() => { sfx('ui.tap'); if (day >= days) setDay(0); setPlaying((p) => !p); }} aria-pressed={playing}><Icon n={playing ? 'clock' : 'bolt'} size={16} />{playing ? t('so.spec.pause') : t('so.spec.play')}</button>}
        </div>
        <div className="so-strip" role="table" aria-label={t('so.spec.title')}>
          <div className="so-strip__row so-strip__row--h" role="row">
            <span className="so-strip__who" role="columnheader">{t('league.reporter')}</span>
            {Array.from({ length: days }, (_, k) => <span key={k} className={'so-strip__cell so-strip__cell--h' + (k + 1 <= day ? ' is-on' : '')} role="columnheader">{k + 1 === days ? t('so.spec.dd') : t('so.spec.day', { n: k + 1 })}</span>)}
            <span className="so-strip__pts" role="columnheader">{t('league.pts')}</span>
          </div>
          {[...rr.players].sort((a, b) => b.score - a.score).map((p) => {
            const me = p.pid === room.pid;
            return <div key={p.pid} className={'so-strip__row' + (me ? ' is-me' : '')} role="row">
              <span className="so-strip__who" role="rowheader"><Byline who={p} me={me} size={26} tier={false} /></span>
              {Array.from({ length: days }, (_, k) => {
                const d = k + 1, calls = p.per.filter((x) => x.call && x.call.day === d);
                return <span key={k} className={'so-strip__cell' + (d <= day ? ' is-on' : '')} role="cell" aria-hidden={d > day}>
                  {calls.map((x) => { const c = cast[x.i]; return <span key={x.i} className={'so-call' + (x.right ? ' is-right' : ' is-wrong') + (x.excl ? ' is-excl' : '') + (x.call!.ut ? ' is-ut' : '')} title={(c ? c.player.s : '') + ' · ' + t('out.' + OUTS[x.call!.o]) + ' · ' + (x.right ? t('so.spec.right') : t('so.spec.wrong'))}>
                    <span className="so-call__who">{c ? c.player.s : '#' + (x.i + 1)}</span><Glyph o={x.call!.o} /><span className="so-call__s" aria-hidden="true">{'•'.repeat(x.call!.s + 1)}</span>{x.excl && <Icon n="bolt" size={12} />}
                  </span>; })}
                </span>;
              })}
              <b className={'so-strip__pts g-num' + (day >= days ? ' is-on' : '')} role="cell">{day >= days ? num(p.score) : '—'}</b>
            </div>;
          })}
          <div className="so-strip__row so-strip__row--truth" role="row">
            <span className="so-strip__who" role="rowheader">{t('so.spec.truth')}</span>
            <span className={'so-strip__truth' + (day >= days ? ' is-on' : '')} role="cell" style={{ gridColumn: `2 / span ${days + 1}` }}>{cast.map((c, i) => { const tr = rr.players[0]?.per[i]?.truth ?? 0; return <span key={i} className={'so-truth so-truth--' + OUTS[tr]}><b>{c.player.s}</b><Glyph o={tr} />{t('out.' + OUTS[tr])}</span>; })}</span>
          </div>
        </div>
        <p className="g-fine g-mono">{t('so.spec.legend')}{reduced ? ' ' + t('so.spec.reduced') : ''}</p>
      </>}
      <GBtn kind="dark" size="sm" onClick={onBack}><Icon n="back" size={18} />{t('so.spec.close')}</GBtn>
    </div>
  </div>;
}
