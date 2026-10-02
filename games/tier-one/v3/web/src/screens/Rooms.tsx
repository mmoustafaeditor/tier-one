// Multiplayer (3.8, brief §16–17, docs/spec/H-multiplayer-system.md): a group chat of football obsessives with a table.
// Lobby (New room · Join · Your rooms) and one room (Table · Rounds · Feed), one viewport each, paged, Back top-left.
// Every round is one shared board under Daily rules exactly, scored on the server; after a round settles the Press Box
// recap card lands in the feed and can go to WhatsApp / Discord as text and image. Old challenge / newsroom links land
// here with "This link has expired". Nothing here changes a Daily board or score.
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave, update, getSave } from '../lib/save';
import { v3 } from '../lib/api';
import { sfx, buzz } from '../lib/sfx';
import { OUTS } from '../lib/engine';
import { toast } from '../lib/meta';
import { Icon, GBtn, TopBar } from '../ui/game';
import { Avatar, Seg } from '../ui/screenbits';
import { Glyph, Empty, Sheet } from '../ui/bits';
import { Byline, Handle, withHandle, RecapCard } from '../ui/social';
import {
  identity, syncRoom, standings, roundState, roundOpens, roundCloses, roundSettled, currentRound, roomOver, roomUrl, loadRoom, leaveRoom, forgetRoom,
  rememberRoom, kickFromRoom, rematchRoom, rivalry, recapView, recapText, shareRecap, whatsappUrl, callWords, archiveDays,
  ROOM_SIZE, ROOM_ROUNDS, ROOM_ROUNDS_DEFAULT, type Room, type RoomRound, type Standing, type RoomRef, type RecapView,
} from '../lib/social';
import type { Chrome } from '../App';
import { usePaged, Pager } from '../ui/fit';

const sx = (i: number): CSSProperties => ({ ['--i' as string]: i });
const hoursLeft = (ms: number) => Math.max(0, Math.ceil(ms / 3600e3));

// ---------------------------------------------------------------- the lobby
export function RoomsScreen({ code, expired, ...chrome }: Chrome & { code?: string; expired?: boolean }) {
  const t = useT();
  const s = useSave();
  const known = (c?: string) => !!c && s.rooms.some((r) => r.code === c);
  const [open, setOpen] = useState<string | undefined>(known(code) ? code : undefined);
  const [joinCode, setJoin] = useState(code && !known(code) ? code : '');
  const [sheet, setSheet] = useState<null | 'join' | 'create'>(code && !known(code) ? 'join' : null);
  const [name, setName] = useState('');
  const [rounds, setRounds] = useState<number>(ROOM_ROUNDS_DEFAULT);
  const [cadence, setCadence] = useState<'weekly' | 'daily'>('weekly');
  const [nick, setNick] = useState(s.nick);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<string[]>(expired ? [t('hub.expired')] : []);
  const mine = s.rooms.find((r) => r.code === open);
  const pg = usePaged(s.rooms, 4);
  const saveNick = () => { if (nick.trim()) update((x) => { x.nick = nick.trim().slice(0, 16); }); return nick.trim(); };
  const land = (r: { room: Room; pid: string; sec: string }, n: string) => { rememberRoom(r, n); setSheet(null); setOpen(r.room.code); };
  const create = async () => {
    const n = saveNick(); if (!n) { setErr(t('rooms.errors.nick')); return; }
    setBusy(true); const r = await v3<{ room: Room; pid: string; sec: string }>('room.create', { ...identity(), nick: n, name: name || t('hub.rooms.name'), rounds, cadence }); setBusy(false);
    if (!r.ok) { setErr(t.or('rooms.errors.' + r.error, 'err.generic')); return; }
    land(r, n);
  };
  const join = async (c0?: string) => {
    const n = saveNick(); if (!n) { setErr(t('rooms.errors.nick')); return; }
    const c = (c0 || joinCode).trim().toUpperCase();
    if (getSave().rooms.some((r) => r.code === c)) { setSheet(null); setOpen(c); return; }
    setBusy(true); const r = await v3<{ room: Room; pid: string; sec: string }>('room.join', { ...identity(), nick: n, code: c }); setBusy(false);
    if (!r.ok) { setErr(t.or('rooms.errors.' + r.error, 'err.generic')); return; }
    land(r, n);
  };
  const closeRoom = (note?: string) => { setOpen(undefined); if (note) setNotes((x) => [note, ...x].slice(0, 2)); };
  if (mine) return <RoomPage key={mine.code} room={mine} chrome={chrome} onBack={closeRoom} onJoin={(c) => { setJoin(c); setErr(''); setOpen(undefined); setSheet('join'); }} />;
  const nickRow = <label className="byline"><Avatar name={nick || '?'} size={36} me /><span className="byline__f"><small className="g-mono">{t('g.rooms.byline')}</small><input value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} onBlur={saveNick} aria-label={t('common.nick')} /></span><Icon n="story" size={16} /></label>;
  return <div className="g-screen rooms3 pressbox fit">
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('hub.mode.multi')} onHelp={() => chrome.go({ n: 'howto' })} />
    <div className="fit__body">
      {notes.map((x, k) => <p key={k} className="g-err rm-note" role="status"><Icon n="clock" size={16} />{x}</p>)}
      <section className="g-hero g-hero--rooms rm-hero" style={sx(0)}>
        <span className="g-mono g-hero__k">{t('hub.mode.multi')}</span>
        <h1 className="g-hero__t">{t('rm.lobby.hed')}</h1>
        <p className="g-hero__s">{t('rm.lobby.sub', { lo: ROOM_SIZE.bestLo, hi: ROOM_SIZE.bestHi })}</p>
      </section>
      <div className="rm-acts">
        <GBtn kind="gold" sound="open" onClick={() => { setErr(''); setSheet('create'); }}><Icon n="star" size={20} />{t('hub.rooms.create')}</GBtn>
        <button className="g-btn g-btn--rooms" onClick={() => { sfx('ui.tap'); setErr(''); setSheet('join'); }}><Icon n="ticket" size={20} />{t('rooms.join')}</button>
      </div>
      {s.rooms.length > 0 ? <>
        <div className="g-sec" style={{ margin: 0 }}><h2>{t('rooms.mine')}</h2><span className="g-mono">{s.rooms.length}</span></div>
        <div className="myrooms rm-list">{pg.rows.map((r) => <button key={r.code} className="myroom" onClick={() => { sfx('open'); setOpen(r.code); }}>
          <span className="myroom__code g-num">{r.code}</span>
          <span className="myroom__t"><b>{r.name}</b><small className="g-mono">{t('common.you')}: <Handle>{r.nick}</Handle></small></span>
          <Icon n={t.rtl ? 'back' : 'arrow'} size={20} />
        </button>)}</div>
        <Pager p={pg} />
      </> : <Empty card icon="friends" title={t('rooms.none')} body={t('rm.lobby.none')} />}
      <GBtn kind="dark" size="sm" onClick={() => chrome.go({ n: 'boards', period: 'rooms', from: { n: 'rooms' } })}><Icon n="trophy" size={18} />{t('hub.board')}</GBtn>
    </div>

    <Sheet open={sheet === 'join'} onClose={() => setSheet(null)} label={t('g.rooms.joinT')}>
      <form className="rm-form" onSubmit={(e) => { e.preventDefault(); if (joinCode.trim().length >= 4 && !busy) join(); }}>
        <h2 className="g-h2" style={{ color: 'var(--card-ink)' }}>{t('g.rooms.joinT')}</h2>
        <p className="g-sub" style={{ color: 'var(--card-ink-2)' }}>{t('rm.join.sub')}</p>
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
        <Seg label={t('rm.create.cadence')} value={cadence} onChange={setCadence} options={[{ v: 'weekly' as const, label: t('rm.create.weekly'), sub: t('rm.create.weeklySub') }, { v: 'daily' as const, label: t('rm.create.daily'), sub: t('rm.create.dailySub') }]} />
        <Seg label={t('rooms.rounds')} value={rounds} onChange={setRounds} options={ROOM_ROUNDS.map((n) => ({ v: n, label: n, sub: t(cadence === 'weekly' ? 'rm.create.weeks' : 'rm.create.days', { n }) }))} />
        <p className="g-fine rm-fine" style={{ color: 'var(--card-ink-2)' }}>{t('rm.create.size', { lo: ROOM_SIZE.bestLo, hi: ROOM_SIZE.bestHi, max: ROOM_SIZE.max })}</p>
        <GBtn kind="gold" disabled={busy} loading={busy} onClick={create} sound="open"><Icon n="friends" size={22} />{t('rooms.create')}</GBtn>
        {err && <p className="g-err" role="alert"><Icon n="x" size={16} />{err}</p>}
      </div>
    </Sheet>
  </div>;
}

// ---------------------------------------------------------------- one room: Table · Rounds · Feed
type RTab = 'table' | 'rounds' | 'feed';
function RoomPage({ room, chrome, onBack, onJoin }: { room: RoomRef; chrome: Chrome; onBack: (note?: string) => void; onJoin: (code: string) => void }) {
  const t = useT();
  const [r, setR] = useState<Room | null>(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [spec, setSpec] = useState<number | null>(null);
  const [recap, setRecap] = useState<number | null>(null);
  const [tab, setTab] = useState<RTab>('table');
  const [tauntOpen, setTauntOpen] = useState(false);
  const [tauntTo, setTauntTo] = useState<string | null>(null);
  const [tauntMsg, setTauntMsg] = useState('');
  const [who, setWho] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const x = await loadRoom(room);
    if ('gone' in x) { forgetRoom(room.code); onBack(t('hub.rooms.gone', { n: room.name })); return; }
    if ('seat' in x) { forgetRoom(room.code); onBack(t('rm.room.noSeat', { n: room.name })); return; }
    if ('error' in x) { setErr(x.error === 'net' ? t('rooms.needNet') : t.or('rooms.errors.' + x.error, 'err.generic')); return; }
    setR(x.room); syncRoom(x.room, room.pid);
  };
  useEffect(() => { load(); }, [room.code]); // eslint-disable-line react-hooks/exhaustive-deps
  const invite = roomUrl(room.code);
  const rows = useMemo(() => (r ? standings(r, room.pid) : []), [r, room.pid]);
  const me = r?.players.find((p) => p.pid === room.pid);
  const isHost = !!r && r.host === room.pid;
  const copy = () => { navigator.clipboard?.writeText(invite); sfx('ui.pop'); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const shareInvite = async () => {
    const text = t('rm.room.inviteText', { room: room.name, code: room.code, u: invite });
    const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
    sfx('ui.tap');
    if (nav.share) { try { await nav.share({ text }); return; } catch { /* cancelled */ } }
    window.open(whatsappUrl(text), '_blank', 'noopener,noreferrer');
  };
  const playRound = (k: number) => chrome.go({ n: 'room', room: { code: room.code, pid: room.pid, sec: room.sec, round: k }, key: Date.now() });
  const cur = r ? currentRound(r) : 0;
  const over = !!r && roomOver(r);
  const curState = r ? (over ? 'over' : roundState(r, cur, me)) : 'open';
  const PER = 4;
  const rounds = useMemo(() => Array.from({ length: r ? r.rounds : 0 }, (_, k) => k), [r?.rounds]); // eslint-disable-line react-hooks/exhaustive-deps
  const rp = usePaged(rounds, PER, r ? r.code + ':' + cur : '', Math.floor(cur / PER));
  const tp = usePaged(rows, 5); // 5 rows + header + pager + the bar fit a 664 px viewport under the head and tabs
  const fp = usePaged(r?.feed || [], 4);
  const taunt = async (k: number) => {
    const x = await v3<{ feed: Room['feed'] }>('room.post', { code: room.code, pid: room.pid, sec: room.sec, k, to: tauntTo || undefined });
    if (!x.ok) { setTauntMsg(x.error === 'slow' ? t('rm.room.tauntSlow', { s: Number(x.gap) || 30 }) : t('err.generic')); return; }
    sfx('publish.talks'); buzz(10); setTauntMsg(t('so.room.tauntSent')); setTauntOpen(false);
    setR((cur0) => (cur0 ? { ...cur0, feed: x.feed } : cur0)); setTimeout(() => setTauntMsg(''), 1800);
  };
  const leave = async () => {
    setBusy(true); const ok = await leaveRoom(room); setBusy(false);
    if (!ok) { toast('warn', t('rooms.needNet')); return; }
    sfx('ui.pop'); setLeaving(false); onBack(t('hub.rooms.left', { n: room.name }));
  };
  const kick = async (pid: string) => {
    setBusy(true); const x = await kickFromRoom(room, pid); setBusy(false);
    if (!x.ok) { toast('warn', t.or('rooms.errors.' + x.error, 'err.generic')); return; }
    sfx('ui.pop'); setWho(null); setR(x.room);
  };
  const rematch = async () => {
    setBusy(true); const x = await rematchRoom(room); setBusy(false);
    if (!x.ok) { if (x.error === 'done' && x.code) onJoin(String(x.code)); else toast('warn', t.or('rooms.errors.' + x.error, 'err.generic')); return; }
    sfx('open'); rememberRoom(x, room.nick); onBack(); onJoin(x.room.code);
  };
  const stateLine = () => {
    if (!r) return '';
    if (curState === 'over') return t('rm.room.over', { d: archiveDays(r) });
    const left = hoursLeft(roundCloses(r, cur) - r.now);
    if (curState === 'open') return t(left <= 48 ? 'rm.room.openH' : 'rm.room.openD', { n: cur + 1, h: left, d: Math.ceil(left / 24) });
    if (curState === 'played') return t('rm.room.played', { n: cur + 1, h: left });
    if (curState === 'soon') return t('rm.room.soon', { n: cur + 1, t: fmtDate(roundOpens(r, cur), t.lang) });
    return t('rm.room.closedLine', { n: cur + 1 });
  };
  if (spec != null && r) return <Spectate room={room} round={spec} onBack={() => setSpec(null)} chrome={chrome} />;
  const recapRound = recap != null && r ? recap : null;
  return <div className="g-screen rooms3 pressbox pb-room fit">
    <TopBar back={{ label: t('hub.mode.multi'), onClick: () => onBack() }} title={room.name} />
    <div className="fit__body">
      <section className="g-hero g-hero--rooms rm-head" style={sx(0)}>
        <div className="rm-head__row">
          <span className="rm-head__code"><small className="g-mono">{t('g.rooms.code')}</small><b className="g-num">{room.code}</b></span>
          <button className="g-btn g-btn--sm g-btn--rooms" onClick={copy} title={invite}><Icon n={copied ? 'check' : 'share'} size={18} />{copied ? t('g.rooms.copied') : t('g.rooms.copy')}</button>
          <button className="g-btn g-btn--sm g-btn--dark" onClick={shareInvite} aria-label={t('rm.room.invite')}><Icon n="reply" size={18} />{t('rm.room.invite')}</button>
        </div>
        {r && <p className="so-state g-mono"><Icon n={curState === 'open' ? 'phone' : curState === 'played' ? 'check' : curState === 'soon' ? 'clock' : 'lock'} size={14} />{stateLine()} · {t('rm.room.seats', { n: r.players.length, m: r.max })}</p>}
      </section>
      {err && <p className="g-err" role="alert">{err}</p>}
      {!r && !err && <p className="g-empty">{t('common.loading')}</p>}
      {r && <>
        <div className="g-tabs2 rm-tabs" role="tablist">
          {(['table', 'rounds', 'feed'] as const).map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { sfx('ui.tap'); setTab(k); }}>{t('hub.rooms.tabs.' + k)}</button>)}
        </div>
        {tab === 'table' && <>
          {r.players.length < ROOM_SIZE.min && <p className="rm-hint g-mono"><Icon n="friends" size={14} />{t('rm.room.alone')}</p>}
          <SeasonTable rows={tp.rows} from={tp.page * 5} host={r.host} onPick={(pid) => { sfx('ui.tap'); setWho(pid); }} />
          <Pager p={tp} />
        </>}
        {tab === 'rounds' && <>
          <div className="rounds">{rp.rows.map((k) => {
            const opens = roundOpens(r, k), closes = roundCloses(r, k), res = me?.results[k], state = roundState(r, k, me), settled = roundSettled(r, k);
            const when = r.cadence === 'weekly' ? fmtDate(opens, t.lang, { day: 'numeric', month: 'short' }) + ' – ' + fmtDate(closes - 1, t.lang, { day: 'numeric', month: 'short' }) : fmtDate(opens, t.lang);
            const sub = state === 'played' ? t('rooms.played', { p: num(res!.score) }) + (res!.ex ? ' · ★' + res!.ex : '') : state === 'soon' ? t('rooms.opens', { t: when }) : state === 'closed' ? t('rm.round.missed') + ' · ' + when : t('rm.round.openFor', { h: hoursLeft(closes - r.now) });
            return <div key={k} className={'round is-' + state + (k === cur ? ' is-cur' : '')}>
              <span className="round__n g-num">{k + 1}</span>
              <span className="round__t"><b>{t('rooms.round', { n: k + 1 })}</b><small className="g-mono">{sub}</small></span>
              <span className="round__acts">
                {state === 'open' && <button className="g-btn g-btn--sm g-btn--rooms round__go is-pulse" onClick={() => { sfx('open'); playRound(k); }}><Icon n="phone" size={18} />{t('so.room.play')}</button>}
                {settled && <button className="g-btn g-btn--sm g-btn--gold round__go" onClick={() => { sfx('open'); setRecap(k); }}><Icon n="news" size={18} />{t('rm.round.recap')}</button>}
                {state === 'played' && !settled && <button className="g-btn g-btn--sm g-btn--dark round__go" onClick={() => { sfx('ui.tap'); playRound(k); }}><Icon n="news" size={18} />{t('so.room.read')}</button>}
                {state === 'soon' && <span className="round__st g-mono"><Icon n="clock" size={14} />{t('g.rooms.state.soon')}</span>}
              </span>
            </div>;
          })}</div>
          <Pager p={rp} />
        </>}
        {tab === 'feed' && <>
          <div className="rm-bar">
            <button className="g-btn g-btn--sm g-btn--rooms so-tauntbtn" aria-expanded={tauntOpen} onClick={() => { sfx('ui.tap'); setTauntOpen((v) => !v); }}><Icon n="reply" size={16} />{t('so.room.taunt')}</button>
            {tauntMsg && <span className="g-mono so-tauntmsg" role="status">{tauntMsg}</span>}
          </div>
          <Feed room={r} myPid={room.pid} events={fp.rows} onRecap={(k) => { sfx('open'); setRecap(k); }} onJoin={onJoin} />
          <Pager p={fp} />
        </>}
      </>}
      <div className="rm-bar">
        <GBtn kind="dark" size="sm" onClick={() => chrome.go({ n: 'boards', period: 'rooms', from: { n: 'rooms', code: room.code } })}><Icon n="trophy" size={18} />{t('hub.board')}</GBtn>
        {over && isHost && !r?.next && <GBtn kind="gold" size="sm" disabled={busy} loading={busy} onClick={rematch}><Icon n="bolt" size={18} />{t('rm.room.rematch')}</GBtn>}
        {over && r?.next && <GBtn kind="gold" size="sm" onClick={() => onJoin(r.next!)}><Icon n="arrow" size={18} />{t('rm.room.joinNext')}</GBtn>}
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
    {r && <RivalrySheet room={r} ref0={room} pid={who} isHost={isHost} busy={busy} onClose={() => setWho(null)} onKick={kick} />}
    {r && <RecapSheet room={r} ref0={room} round={recapRound} onClose={() => setRecap(null)} onWatch={(k) => { setRecap(null); setSpec(k); }} />}
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

function SeasonTable({ rows, from = 0, host, onPick }: { rows: Standing[]; from?: number; host: string; onPick: (pid: string) => void }) {
  const t = useT();
  return <div className="ltable ltable--season g-card">
    <div className="ltable__h g-mono"><span>#</span><span>{t('league.reporter')}</span><span>{t('so.room.p')}</span><span>{t('so.room.w')}</span><span>{t('so.room.pts')}</span></div>
    {rows.map((x, j) => { const k = from + j; return <button type="button" key={x.p.pid} className={'lrow rm-row' + (x.me ? ' is-me' : '') + (k === 0 && x.total > 0 ? ' is-top' : '')} onClick={() => onPick(x.p.pid)} aria-label={x.p.nick}>
      <span className="lrow__n g-num">{k === 0 && x.total > 0 ? <Icon n="crown" size={18} /> : k + 1}</span>
      <span className="lrow__who"><Byline who={x.p} me={x.me} size={28} tier={false} />{x.p.pid === host && <small className="so-host">{t('so.room.host')}</small>}<span className="so-form" aria-label={t('so.room.form')}>{x.form.map((f, i) => <i key={i} className={'is-' + f} />)}</span></span>
      <span className="lrow__x">{x.n}</span><span className="lrow__x">{x.wins}</span><b className="lrow__p g-num">{num(x.total)}{x.ex > 0 && <i className="rm-ex" aria-label={t('rm.recap.exclN', { n: x.ex })}>★</i>}</b>
    </button>; })}
  </div>;
}

// Head-to-head with one reporter in this room (tap a table row); the host can show them the door from here.
function RivalrySheet({ room, ref0, pid, isHost, busy, onClose, onKick }: { room: Room; ref0: RoomRef; pid: string | null; isHost: boolean; busy: boolean; onClose: () => void; onKick: (pid: string) => void }) {
  const t = useT();
  const p = pid ? room.players.find((x) => x.pid === pid) : null;
  const me = !!p && p.pid === ref0.pid;
  const rv = p ? rivalry(room, ref0.pid, p.pid) : null;
  const st = p ? standings(room, ref0.pid).find((x) => x.p.pid === p.pid) : null;
  return <Sheet open={!!p} onClose={onClose} label={p ? p.nick : ''}>
    {p && rv && st && <div className="rm-rival g-card">
      <header className="rm-rival__h"><Byline who={p} me={me} size={40} />{p.pid === room.host && <small className="so-host">{t('so.room.host')}</small>}</header>
      <div className="rm-rival__stats">
        <span><b className="g-num">{num(st.total)}</b><small>{t('so.room.pts')}</small></span>
        <span><b className="g-num">{st.wins}</b><small>{t('rm.rival.wins')}</small></span>
        <span><b className="g-num">{st.ex}</b><small>{t('rm.rival.excl')}</small></span>
        <span><b className="g-num">{st.n}/{st.n + st.missed}</b><small>{t('rm.rival.played')}</small></span>
      </div>
      {!me && <>
        <h3 className="g-mono rm-rival__k">{t('rm.rival.vs')}</h3>
        <div className="cn-rec" aria-label={`${t('cn.rivals.you')} ${rv.w}, ${t('cn.rivals.them')} ${rv.l}, ${t('cn.rivals.drawn')} ${rv.d}`}>
          <span className="cn-rec__side"><b className="g-num">{rv.w}</b><small>{t('cn.rivals.you')}</small></span>
          <span className="cn-rec__dash" aria-hidden="true">–</span>
          <span className="cn-rec__side"><b className="g-num">{rv.l}</b><small>{t('cn.rivals.them')}</small></span>
        </div>
        <p className="rm-rival__line" dir="auto">{rv.n === 0 ? t('rm.rival.none') : rv.streak > 0 ? t('rm.rival.runW', { n: rv.streak }) : rv.streak < 0 ? t('rm.rival.runL', { n: -rv.streak }) : t('rm.rival.level')}{rv.d > 0 ? ' · ' + t('rm.rival.draws', { n: rv.d }) : ''}</p>
        <p className="rm-rival__line g-mono">{t('rm.rival.best', { a: rv.best == null ? '—' : num(rv.best), b: rv.theirBest == null ? '—' : num(rv.theirBest) })}</p>
        {isHost && <GBtn kind="ghost" size="sm" disabled={busy} loading={busy} onClick={() => onKick(p.pid)}><Icon n="x" size={16} />{t('rm.rival.kick')}</GBtn>}
      </>}
    </div>}
  </Sheet>;
}

// THE PRESS BOX · ROUND N: the recap card, share buttons (system sheet with image, WhatsApp, copy), and the film.
function RecapSheet({ room, ref0, round, onClose, onWatch }: { room: Room; ref0: RoomRef; round: number | null; onClose: () => void; onWatch: (k: number) => void }) {
  const t = useT();
  const [rr, setRr] = useState<RoomRound | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    setRr(null); setErr(''); setMsg('');
    if (round == null) return;
    let alive = true;
    v3<RoomRound & { waiting?: number }>('room.round', { code: ref0.code, pid: ref0.pid, sec: ref0.sec, round }).then((x) => {
      if (!alive) return;
      if (!x.ok) { setErr(x.error === 'not yet' ? t('so.room.waiting', { n: Number(x.waiting) || 0 }) : t.or('rooms.errors.' + x.error, 'err.generic')); return; }
      setRr(x);
    });
    return () => { alive = false; };
  }, [round, ref0.code]); // eslint-disable-line react-hooks/exhaustive-deps
  const v: RecapView | null = rr ? recapView(room, rr, ref0.pid) : null;
  const share = async () => { if (!v) return; sfx('ui.tap'); const r = await shareRecap(v); if (r === 'copied') { setMsg(t('rm.recap.copied')); setTimeout(() => setMsg(''), 1800); } };
  const copy = async () => { if (!v) return; sfx('ui.pop'); try { await navigator.clipboard?.writeText(recapText(v)); } catch { /* blocked */ } setMsg(t('rm.recap.copied')); setTimeout(() => setMsg(''), 1800); };
  const wa = () => { if (!v) return; sfx('ui.tap'); window.open(whatsappUrl(recapText(v)), '_blank', 'noopener,noreferrer'); };
  return <Sheet open={round != null} onClose={onClose} label={t('rm.recap.head', { n: (round ?? 0) + 1 })}>
    {err && <p className="g-err" role="alert">{err}</p>}
    {!rr && !err && <p className="g-empty">{t('common.loading')}</p>}
    {v && <div className="rm-recapwrap">
      <RecapCard v={v} />
      <div className="rm-recap__acts">
        <GBtn kind="gold" size="sm" onClick={share}><Icon n="share" size={18} />{t('rm.recap.share')}</GBtn>
        <GBtn kind="green" size="sm" onClick={wa}><Icon n="reply" size={18} />{t('rm.recap.whatsapp')}</GBtn>
        <GBtn kind="dark" size="sm" onClick={copy}><Icon n="check" size={18} />{t('rm.recap.copy')}</GBtn>
        <GBtn kind="paper" size="sm" onClick={() => onWatch(round!)}><Icon n="eye" size={18} />{t('so.room.watch')}</GBtn>
      </div>
      {msg && <p className="g-mono rm-recap__msg" role="status">{msg}</p>}
    </div>}
  </Sheet>;
}

function Feed({ room, myPid, events, onRecap, onJoin }: { room: Room; myPid: string; events: Room['feed']; onRecap: (k: number) => void; onJoin: (code: string) => void }) {
  const t = useT();
  const lines = t.list('so.room.taunts') as string[];
  if (!room.feed.length) return <Empty card icon="news" title={t('so.room.empty')} />;
  const who = (n: string) => <Handle>{n}</Handle>;
  const at = (ms: number) => <time className="cn-row__at">{fmtDate(ms, t.lang, { day: 'numeric', month: 'short' })}</time>;
  return <div className="so-feed cn-sheet">{events.map((ev, k) => {
    const me = ev.pid === myPid;
    if (ev.t === 'recap') return <button type="button" key={k} className="so-fev so-fev--recap" onClick={() => onRecap(ev.round || 0)}>
      <span className="so-fev__ic" aria-hidden="true"><Icon n="news" size={16} /></span>
      <span className="so-fev__b">
        <b>{t('rm.recap.head', { n: (ev.round || 0) + 1 })}</b>
        <span className="rm-fev__top">{(ev.top || []).map((p, i) => <Fragment key={p.pid}>{i > 0 && ' · '}<Handle>{p.nick}</Handle> {p.score}</Fragment>)}</span>
        {ev.scoop && <small dir="auto">{t('rm.recap.scoop')}: {withHandle(ev.scoop.excl ? t('rm.recap.scoopExclS', { n: '{n}', p: ev.scoop.p }) : t('rm.recap.scoopPlainS', { n: '{n}', p: ev.scoop.p }), ev.scoop.nick)}</small>}
        {ev.disaster && <small dir="auto">{t('rm.recap.disaster')}: {withHandle(t('rm.recap.disasterS', { n: '{n}', c: callWords(ev.disaster.o, ev.disaster.s) }), ev.disaster.nick)}</small>}
      </span>{at(ev.at)}
    </button>;
    if (ev.t === 'filed') return <Fragment key={k}>
      {(ev.excl || []).slice(0, 1).map((p, j) => <div key={j} className="so-fev so-fev--excl"><span className="so-fev__ic" aria-hidden="true"><Icon n="bolt" size={16} /></span><span className="so-fev__b"><b className="so-exclT">{t('rm.feed.exclT')}</b><span dir="auto">{withHandle(t('rm.feed.excl', { n: '{n}', p }), ev.nick)}</span></span>{at(ev.at)}</div>)}
      <div className={'so-fev so-fev--filed' + (me ? ' is-me' : '')}><Avatar name={ev.nick} size={30} me={me} /><span className="so-fev__b"><span dir="auto">{withHandle(t('so.room.ev.filed', { n: '{n}', r: (ev.round || 0) + 1, p: num(ev.score || 0), tier: t('tier.' + ev.tier) }), ev.nick)}</span><Row row={ev.row || ''} /></span>{at(ev.at)}</div>
    </Fragment>;
    if (ev.t === 'taunt') return <div key={k} className={'so-fev so-fev--taunt' + (me ? ' is-me' : '')}><Avatar name={ev.nick} size={30} me={me} /><span className="so-fev__b"><b>{who(ev.nick)}{ev.toNick && <> → {who(ev.toNick)}</>}</b><q dir="auto">{lines[ev.k || 0] || ''}</q></span>{at(ev.at)}</div>;
    if (ev.t === 'rematch') return <button type="button" key={k} className="so-fev so-fev--rematch" onClick={() => onJoin(ev.code || '')}><span className="so-fev__ic" aria-hidden="true"><Icon n="bolt" size={14} /></span><span className="so-fev__b" dir="auto">{withHandle(t('rm.feed.rematch', { n: '{n}', code: ev.code || '' }), ev.nick)}</span>{at(ev.at)}</button>;
    if (ev.t === 'kick') return <div key={k} className="so-fev so-fev--quiet"><span className="so-fev__ic" aria-hidden="true"><Icon n="x" size={14} /></span><span className="so-fev__b" dir="auto">{withHandle(t('rm.feed.kick', { n: '{n}' }), ev.toNick || '')}</span>{at(ev.at)}</div>;
    return <div key={k} className="so-fev so-fev--quiet"><span className="so-fev__ic" aria-hidden="true"><Icon n={ev.t === 'open' ? 'star' : 'friends'} size={14} /></span><span className="so-fev__b" dir="auto">{withHandle(t('so.room.ev.' + ev.t, { n: '{n}', name: ev.name || '' }), ev.nick)}</span>{at(ev.at)}</div>;
  })}</div>;
}
const Row = ({ row }: { row: string }) => <span className="so-row" aria-hidden="true">{(row || '').split('').map((ch, k) => <i key={k} className={ch === '★' ? 'x' : ch === '■' ? 'r' : ch === '□' ? 'w' : 'n'} />)}</span>;

// ---------------------------------------------------------------- the round on film: one column a day, Back top-left
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
    timer.current = window.setTimeout(() => { setDay((d) => { const n = Math.min(rr.days, d + 1); if (n >= rr.days) setPlaying(false); sfx(n === rr.days ? 'dd.whistle' : 'thock'); return n; }); }, day === 0 ? 400 : 900);
    return () => clearTimeout(timer.current);
  }, [rr, playing, day, reduced]);
  const days = rr ? rr.days : 7;
  const cast = rr?.cast || [];
  return <div className="g-screen rooms3 pressbox pb-spec fit">
    <TopBar back={{ label: room.name, onClick: onBack }} title={t('rooms.round', { n: round + 1 })} onMenu={chrome.openSettings} />
    <div className="fit__body">
      <header className="cn-head rm-spec__h"><h1>{t('so.spec.title')}</h1><p>{t('so.spec.sub')}</p></header>
      {err && <p className="g-err" role="alert">{err}</p>}
      {!rr && !err && (waiting ? <div className="g-empty g-card g-card--desk"><Icon n="clock" size={22} /><span>{t('so.room.waiting', { n: waiting })}. {t('so.room.notYet')}</span></div> : <p className="g-empty">{t('common.loading')}</p>)}
      {rr && <>
        <div className="so-spec__bar">
          <div className="so-spec__days" role="tablist" aria-label={t('so.spec.day', { n: '' })}>{Array.from({ length: days }, (_, k) => <button key={k} role="tab" aria-selected={day === k + 1} className={k + 1 <= day ? 'is-on' : ''} onClick={() => { setPlaying(false); setDay(k + 1); sfx('ui.tap'); }}>{k + 1 === days ? t('so.spec.dd') : k + 1}</button>)}</div>
          {!reduced && <button className="g-btn g-btn--sm g-btn--rooms" onClick={() => { sfx('ui.tap'); if (day >= days) setDay(0); setPlaying((p) => !p); }} aria-pressed={playing}><Icon n={playing ? 'clock' : 'bolt'} size={16} />{playing ? t('so.spec.pause') : t('so.spec.play')}</button>}
        </div>
        <div className="so-strip fit__grow" role="table" aria-label={t('so.spec.title')}>
          <div className="so-strip__row so-strip__row--h" role="row">
            <span className="so-strip__who" role="columnheader">{t('league.reporter')}</span>
            {Array.from({ length: days }, (_, k) => <span key={k} className={'so-strip__cell so-strip__cell--h' + (k + 1 <= day ? ' is-on' : '')} role="columnheader">{k + 1 === days ? t('so.spec.dd') : t('so.spec.day', { n: k + 1 })}</span>)}
            <span className="so-strip__pts" role="columnheader">{t('league.pts')}</span>
          </div>
          {rr.players.map((p) => {
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
            <span className={'so-strip__truth' + (day >= days ? ' is-on' : '')} role="cell" style={{ gridColumn: `2 / span ${days + 1}` }}>{cast.map((c, i) => { const tr0 = rr.players[0]?.per[i]?.truth ?? 0; return <span key={i} className={'so-truth so-truth--' + OUTS[tr0]}><b>{c.player.s}</b><Glyph o={tr0} />{t('out.' + OUTS[tr0])}</span>; })}</span>
          </div>
        </div>
        <p className="g-fine g-mono">{t('so.spec.legend')}{reduced ? ' ' + t('so.spec.reduced') : ''}</p>
      </>}
    </div>
  </div>;
}
