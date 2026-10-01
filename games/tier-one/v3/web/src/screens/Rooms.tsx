// Groups (CONCEPT4 §2, RULES4 §2): rooms with friends (one shared board a round, Daily rules exactly, scored on the
// server), challenges (a finished window as a 24 h link; the friend plays the exact rules you played) and crews (see
// Newsroom.tsx). Unlocks at Level 4. Every rank is a word ("1st"), never a crown. Nothing here changes a Daily.
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave, update, getSave } from '../lib/save';
import { v3 } from '../lib/api';
import { sfx, buzz } from '../lib/sfx';
import { liveWindow } from '../lib/driver';
import { OUTS4, type RuleSpec4 } from '../lib/engine';
import { Icon, TopBar } from '../ui/game';
import { Avatar, Seg } from '../ui/screenbits';
import { Pop, Stamp } from '../ui/juice';
import { Byline, ChallengeButton, FriendRivalCard, Handle, withHandle, GridRow, ordinal } from '../ui/social';
import {
  identity, syncRoom, standings, roundState, roundOpens, roundCloses, currentRound, friendRivals, pending, dropPending, acceptChallenge, submitChallenge, refreshMine, settleChallenge, hoursLeft, roomUrl,
  type Room, type RoomRound, type Challenge, type Standing,
} from '../lib/social';
import { CrewPanel } from './Newsroom';
import type { Chrome } from '../App';
import '../styles/social.css';

type Tab = 'rooms' | 'challenges' | 'crews';
type MyRoom = { code: string; name: string; pid: string; sec: string; nick: string };

export function RoomsScreen({ code, challenge, ...chrome }: Chrome & { code?: string; challenge?: string }) {
  const t = useT(); const s = useSave();
  const [tab, setTab] = useState<Tab>(challenge ? 'challenges' : 'rooms');
  const [open, setOpen] = useState<string | undefined>(s.rooms.find((r) => r.code === code) ? code : undefined);
  const mine = s.rooms.find((r) => r.code === open);
  if (mine) return <RoomPage key={mine.code} room={mine} chrome={chrome} onBack={() => setOpen(undefined)} />;
  return <div className="g-screen gp">
    <TopBar back={{ label: t('md4.home'), onClick: chrome.home }} title={t('os.app.groups')} />
    <div className="gp-tabs" role="tablist" aria-label={t('os.app.groups')}>
      {(['rooms', 'challenges', 'crews'] as const).map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { sfx('ui.tap'); setTab(k); }}>{t('md4.gp.tab.' + k)}</button>)}
    </div>
    {tab === 'rooms' && <RoomsTab joinCode={code && !s.rooms.find((r) => r.code === code) ? code : ''} onOpen={setOpen} />}
    {tab === 'challenges' && <ChallengesTab code={challenge} chrome={chrome} />}
    {tab === 'crews' && <CrewPanel chrome={chrome} />}
  </div>;
}

// ---------------------------------------------------------------- rooms: yours, join one, start one
function RoomsTab({ joinCode: j0, onOpen }: { joinCode: string; onOpen: (code: string) => void }) {
  const t = useT(); const s = useSave();
  const [joinCode, setJoin] = useState(j0);
  const [name, setName] = useState('');
  const [rounds, setRounds] = useState(10);
  const [cadence, setCadence] = useState<'weekly' | 'daily'>('weekly');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [making, setMaking] = useState(!s.rooms.length && !j0);
  const remember = (r: { room: Room; pid: string; sec: string }, n: string) => { update((x) => { x.rooms = [{ code: r.room.code, name: r.room.name, pid: r.pid, sec: r.sec, nick: n }, ...x.rooms.filter((q) => q.code !== r.room.code)]; }); sfx('os.open'); buzz(15); onOpen(r.room.code); };
  const nick = () => (getSave().nick || '').trim();
  const create = async () => {
    const n = nick(); if (!n) { setErr(t('md4.gp.err.nick')); return; }
    setBusy(true); const r = await v3<{ room: Room; pid: string; sec: string }>('room.create', { ...identity(), nick: n, name: name.trim() || t('md4.gp.room.defaultName'), rounds, cadence }); setBusy(false);
    if (!r.ok) { setErr(t.or('md4.gp.err.' + r.error, 'err.generic')); return; }
    remember(r, n);
  };
  const join = async () => {
    const n = nick(); if (!n) { setErr(t('md4.gp.err.nick')); return; }
    const c = joinCode.trim().toUpperCase();
    if (getSave().rooms.some((r) => r.code === c)) { onOpen(c); return; }
    setBusy(true); const r = await v3<{ room: Room; pid: string; sec: string }>('room.join', { ...identity(), nick: n, code: c }); setBusy(false);
    if (!r.ok) { setErr(t.or('md4.gp.err.' + r.error, 'err.generic')); return; }
    remember(r, n);
  };
  return <>
    {s.rooms.length > 0 && <section className="gp-sec">
      <h2>{t('md4.gp.room.mine')}</h2>
      <div className="gp-rooms">{s.rooms.map((r) => <Pop key={r.code} className="gp-room" onTap={() => onOpen(r.code)} sound="os.open">
        <span className="gp-room__code">{r.code}</span>
        <span className="gp-room__t"><b dir="auto">{r.name}</b><small>{t('md4.gp.room.as')} <Handle>{r.nick}</Handle></small></span>
        <Icon n={t.rtl ? 'back' : 'arrow'} size={20} />
      </Pop>)}</div>
    </section>}
    <form className="gp-card gp-join" onSubmit={(e) => { e.preventDefault(); if (joinCode.trim().length >= 4 && !busy) void join(); }}>
      <h2>{t('md4.gp.room.joinT')}</h2>
      <p>{t('md4.gp.room.joinB')}</p>
      <div className="gp-join__row">
        <input className="gp-code" value={joinCode} onChange={(e) => setJoin(e.target.value.toUpperCase())} placeholder="ABCDE" maxLength={8} aria-label={t('md4.gp.room.code')} autoCapitalize="characters" spellCheck={false} />
        <button type="submit" className="gp-btn" disabled={busy || joinCode.trim().length < 4}>{t('md4.gp.room.join')}</button>
      </div>
    </form>
    {!making ? <Pop className="gp-make" onTap={() => setMaking(true)}><Icon n="friends" size={20} />{t('md4.gp.room.makeT')}</Pop>
      : <section className="gp-card">
        <h2>{t('md4.gp.room.makeT')}</h2>
        <p>{t('md4.gp.room.makeB')}</p>
        <input className="gp-input" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} placeholder={t('md4.gp.room.namePh')} aria-label={t('md4.gp.room.name')} />
        <Seg label={t('md4.gp.room.cadence')} value={cadence} onChange={setCadence} options={[{ v: 'weekly' as const, label: t('md4.gp.room.weekly'), sub: t('md4.gp.room.weeklyB') }, { v: 'daily' as const, label: t('md4.gp.room.daily'), sub: t('md4.gp.room.dailyB') }]} />
        <Seg label={t('md4.gp.room.rounds')} value={rounds} onChange={setRounds} options={[5, 10, 20].map((n) => ({ v: n, label: n, sub: t('md4.gp.room.rounds') }))} />
        <Pop className="gp-btn gp-btn--wide" onTap={create} disabled={busy} sound="os.open">{t('md4.gp.room.make')}</Pop>
      </section>}
    {err && <p className="gp-err" role="alert">{err}</p>}
    <p className="gp-fine">{t('md4.gp.fair')}</p>
  </>;
}

// ---------------------------------------------------------------- challenges: a link, the one you're playing, yours
function ChallengesTab({ code, chrome }: { code?: string; chrome: Chrome }) {
  const t = useT(); const s = useSave();
  const [list, setList] = useState<Challenge[]>([]);
  useEffect(() => { let on = true; refreshMine().then((r) => { if (on && r.ok) setList(r.list); }); return () => { on = false; }; }, [s.social?.made?.length]);
  const pend = pending(s);
  const friends = friendRivals(s), named = friends.filter((f) => f.named);
  const play = () => chrome.go({ n: 'play', mode: 'challenge', key: Date.now() });
  return <>
    {code && <ChallengeCard code={code} chrome={chrome} />}
    {pend && pend.code !== code && <section className="gp-card gp-pend">
      <h2>{withHandle(t('md4.gp.ch.playing', { n: '{n}' }), pend.by.nick)}</h2>
      <p>{t('md4.gp.ch.target', { s: num(pend.target.score) })} · {t('md4.gp.ch.left', { h: hoursLeft(pend.exp) })}</p>
      <div className="gp-acts">
        {liveWindow('challenge', s) && <Pop className="gp-btn" onTap={play} sound="os.open">{t('md4.gp.ch.resume')}</Pop>}
        <button type="button" className="gp-link" onClick={() => { sfx('ui.tap'); dropPending(); }}>{t('md4.gp.ch.drop')}</button>
      </div>
    </section>}
    <section className="gp-card">
      <h2>{t('md4.gp.ch.makeT')}</h2>
      <p>{t('md4.gp.ch.makeB')}</p>
      <ChallengeButton size="" />
    </section>
    {list.length > 0 && <section className="gp-sec">
      <h2>{t('md4.gp.ch.mine')}</h2>
      <div className="gp-chlist">{list.map((ch) => <button key={ch.code} type="button" className={'gp-chrow' + (ch.open ? ' is-open' : '')} onClick={() => chrome.go({ n: 'rooms', challenge: ch.code })}>
        <span className="gp-chrow__s">{num(ch.target.score)}</span>
        <span className="gp-chrow__b"><b>{ch.label || t('md4.gp.ch.mode.' + ch.kind)}</b><small>{ch.open ? t('md4.gp.ch.left', { h: hoursLeft(ch.exp) }) : t('md4.gp.ch.closed')} · {t('md4.gp.ch.answers', { n: ch.res.length })}</small></span>
        <Icon n={t.rtl ? 'back' : 'arrow'} size={18} />
      </button>)}</div>
    </section>}
    <section className="gp-sec">
      <h2>{t('md4.gp.fr.title')}</h2>
      {friends.length ? <div className="so-fgrid">{(named.length ? named : friends).slice(0, 3).map((f, k) => <FriendRivalCard key={f.id} rec={f} i={k} />)}</div>
        : <p className="gp-quiet">{t('md4.gp.fr.none')}</p>}
    </section>
  </>;
}

function ChallengeCard({ code, chrome }: { code: string; chrome: Chrome }) {
  const t = useT(); const s = useSave();
  const [ch, setCh] = useState<Challenge | null>(null);
  const [seed, setSeed] = useState('');
  const [rules, setRules] = useState<RuleSpec4 | undefined>();
  const [played, setPlayed] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const r = await v3<{ challenge: Challenge; seed?: string; rules?: RuleSpec4; played?: { score: number } }>('challenge.get', { code, dev: s.dev });
    if (!r.ok) { setErr(t.or('md4.gp.ch.err.' + r.error, 'err.generic')); return; }
    setCh(r.challenge); setSeed(r.seed || ''); setRules(r.rules); setPlayed(!!r.played); settleChallenge(r.challenge);
  };
  useEffect(() => { void load(); }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  if (err) return <p className="gp-err" role="alert">{err}</p>;
  if (!ch) return <p className="gp-quiet">{t('md4.loading')}</p>;
  const me = ch.res.find((r) => r.pub === s.social?.pub) || null;
  const isPending = pending(s)?.code === ch.code;
  const take = async () => {
    if (!seed || busy) return;
    setBusy(true); const r = await acceptChallenge(ch, seed, rules); setBusy(false);
    if (r !== 'ok') { setErr(t('md4.gp.ch.why.' + r)); return; }
    sfx('os.open'); buzz(15); chrome.go({ n: 'play', mode: 'challenge', key: Date.now() });
  };
  const answerDaily = async () => { setBusy(true); const r = await submitChallenge(ch.code); setBusy(false); if (r.ok) { sfx('stamp.done'); void load(); } else setErr(t.or('md4.gp.ch.err.' + r.error, 'err.generic')); };
  const dailyToday = ch.kind === 'daily' && !seed;
  return <section className={'gp-card gp-ch' + (ch.open ? '' : ' is-closed')} aria-labelledby="gp-ch-h">
    <div className="gp-ch__by"><Byline who={ch.by} size={32} /><span className="gp-ch__left">{ch.open ? t('md4.gp.ch.left', { h: hoursLeft(ch.exp) }) : t('md4.gp.ch.closed')}</span></div>
    <h2 id="gp-ch-h">{withHandle(t('md4.gp.ch.card', { n: '{n}' }), ch.by.nick)}</h2>
    <div className="gp-ch__target">
      <b>{num(ch.target.score)}</b>
      <span><small>{t('tier4.' + ch.target.tier)}</small><small>{ch.label || t('md4.gp.ch.mode.' + ch.kind)}</small></span>
      <GridRow row={ch.target.row} />
    </div>
    {ch.mine ? <p className="gp-quiet">{t('md4.gp.ch.yours')}</p>
      : me ? <Stamp text={t('md4.gp.ch.res.' + me.r, { s: num(me.score) })} tone={me.r === 'w' ? 'gold' : me.r === 'l' ? 'dry' : 'cool'} size="sm" />
        : !ch.open ? <p className="gp-quiet">{t('md4.gp.ch.expired')}</p>
          : dailyToday ? <div className="gp-acts"><p>{t('md4.gp.ch.dailyB')}</p>{played ? <Pop className="gp-btn" onTap={answerDaily} disabled={busy}>{t('md4.gp.ch.dailyAnswer')}</Pop> : <Pop className="gp-btn" onTap={() => chrome.go({ n: 'daily' })} sound="os.open">{t('md4.gp.ch.dailyPlay')}</Pop>}</div>
            : <div className="gp-acts">
              {isPending && liveWindow('challenge', s) ? <Pop className="gp-btn gp-btn--wide" onTap={() => chrome.go({ n: 'play', mode: 'challenge', key: Date.now() })} sound="os.open">{t('md4.gp.ch.resume')}</Pop>
                : <Pop className="gp-btn gp-btn--wide" onTap={take} disabled={busy} sound={null}>{t('md4.gp.ch.take')}</Pop>}
              <small className="gp-quiet">{t('md4.gp.ch.sameRules')}</small>
            </div>}
    <div className="gp-ch__res">
      <h3>{t('md4.gp.ch.results', { n: ch.res.length })}</h3>
      {ch.res.length ? ch.res.map((r) => <div key={r.pub} className={'gp-ans is-' + r.r}><Byline who={r} size={26} me={r.pub === s.social?.pub} /><GridRow row={r.row} size="sm" /><b>{num(r.score)}</b></div>) : <p className="gp-quiet">{t('md4.gp.ch.noResults')}</p>}
    </div>
  </section>;
}

// ---------------------------------------------------------------- one room
function RoomPage({ room, chrome, onBack }: { room: MyRoom; chrome: Chrome; onBack: () => void }) {
  const t = useT();
  const [r, setR] = useState<Room | null>(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<number | null>(null);
  const [tauntOpen, setTauntOpen] = useState(false);
  const [tauntTo, setTauntTo] = useState<string | null>(null);
  const [tauntMsg, setTauntMsg] = useState('');
  const load = async () => {
    const x = await v3<{ room: Room }>('room.get', { code: room.code, pid: room.pid, sec: room.sec, ...identity() });
    if (!x.ok) { setErr(x.error === 'net' ? t('md4.gp.err.net') : t.or('md4.gp.err.' + x.error, 'err.generic')); return; }
    const old = x.room as Partial<Room> & Pick<Room, 'code' | 'name' | 'rounds' | 'created' | 'host' | 'players' | 'roundHours'>;
    const rm: Room = { ...old, cadence: old.cadence || 'daily', stepMs: old.stepMs || 864e5, feed: old.feed || [], now: old.now || Date.now() };
    setR(rm); syncRoom(rm, room.pid);
  };
  useEffect(() => { void load(); }, [room.code]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => (r ? standings(r, room.pid) : []), [r, room.pid]);
  const me = r?.players.find((p) => p.pid === room.pid);
  const copy = () => { navigator.clipboard?.writeText(roomUrl(room.code)); sfx('ui.pop'); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const playRound = (k: number) => chrome.go({ n: 'room', room: { code: room.code, pid: room.pid, sec: room.sec, round: k }, key: Date.now() });
  const cur = r ? currentRound(r) : 0;
  const curState = r ? roundState(r, cur, me) : 'open';
  const taunt = async (k: number) => {
    const x = await v3<{ feed: Room['feed'] }>('room.post', { code: room.code, pid: room.pid, sec: room.sec, k, to: tauntTo || undefined });
    if (!x.ok) { setTauntMsg(x.error === 'slow' ? t('md4.gp.room.tauntSlow') : t('err.generic')); return; }
    sfx('post'); buzz(10); setTauntMsg(t('md4.gp.room.tauntSent')); setTauntOpen(false);
    setR((c) => (c ? { ...c, feed: x.feed } : c)); setTimeout(() => setTauntMsg(''), 1800);
  };
  if (view != null && r) return <RoundResults room={room} round={view} onBack={() => setView(null)} />;
  return <div className="g-screen gp gp-roompage">
    <TopBar back={{ label: t('os.app.groups'), onClick: onBack }} title={room.name} />
    <section className="gp-head">
      <div className="gp-head__code"><small>{t('md4.gp.room.code')}</small><b>{room.code}</b></div>
      <Pop className="gp-btn gp-btn--ghost" onTap={copy} sound={null}><Icon n={copied ? 'check' : 'share'} size={18} />{copied ? t('md4.gp.room.copied') : t('md4.gp.room.invite')}</Pop>
      {r && <div className="gp-head__who">{r.players.map((p) => <Byline key={p.pid} who={p} me={p.pid === room.pid} size={28} tier={false} />)}</div>}
    </section>
    {err && <p className="gp-err" role="alert">{err}</p>}
    {!r && !err && <p className="gp-quiet">{t('md4.loading')}</p>}
    {r && <>
      <section className="gp-now">
        <p className="gp-now__k">{t('md4.gp.room.round', { n: cur + 1, m: r.rounds })}</p>
        <b className="gp-now__t">{t('md4.gp.room.state.' + curState)}</b>
        {curState === 'open' && <Pop className="gp-btn gp-btn--wide" onTap={() => playRound(cur)} sound="os.open">{t('md4.gp.room.play')}</Pop>}
        {curState === 'played' && <Pop className="gp-btn gp-btn--wide gp-btn--ghost" onTap={() => setView(cur)} sound="os.open">{t('md4.gp.room.results')}</Pop>}
        {curState === 'soon' && <p className="gp-quiet">{t('md4.gp.room.opens', { d: fmtDate(roundOpens(r, cur), t.lang) })}</p>}
      </section>
      <section className="gp-sec"><h2>{t('md4.gp.room.table')}</h2><Table rows={rows} /></section>
      <section className="gp-sec">
        <h2>{t('md4.gp.room.rounds2')}</h2>
        <ol className="gp-rounds">{Array.from({ length: r.rounds }, (_, k) => {
          const st = roundState(r, k, me), res = me?.results[k];
          const canSee = !!res && (r.now > roundCloses(r, k) || r.players.every((p) => p.results[k]));
          return <li key={k} className={'is-' + st + (k === cur ? ' is-cur' : '')}>
            <span className="gp-rounds__n">{k + 1}</span>
            <span className="gp-rounds__t">{st === 'played' ? t('md4.gp.room.played', { p: num(res!.score) }) : st === 'soon' ? t('md4.gp.room.opens', { d: fmtDate(roundOpens(r, k), t.lang, { day: 'numeric', month: 'short' }) }) : t('md4.gp.room.state.' + st)}</span>
            {res?.row && <GridRow row={res.row} size="sm" />}
            {st === 'open' && k !== cur && <button type="button" className="gp-link" onClick={() => playRound(k)}>{t('md4.gp.room.playShort')}</button>}
            {canSee && <button type="button" className="gp-link" onClick={() => { sfx('os.open'); setView(k); }}>{t('md4.gp.room.see')}</button>}
          </li>;
        })}</ol>
      </section>
      <section className="gp-sec">
        <div className="gp-sec__h"><h2>{t('md4.gp.room.feed')}</h2><button type="button" className="gp-link" aria-expanded={tauntOpen} onClick={() => { sfx('ui.tap'); setTauntOpen((v) => !v); }}>{t('md4.gp.room.taunt')}</button></div>
        {tauntOpen && <div className="gp-taunter" role="group" aria-label={t('md4.gp.room.taunt')}>
          <div className="gp-taunter__to">
            <button type="button" aria-pressed={tauntTo == null} onClick={() => setTauntTo(null)}>{t('md4.gp.room.everyone')}</button>
            {r.players.filter((p) => p.pid !== room.pid).map((p) => <button key={p.pid} type="button" aria-pressed={tauntTo === p.pid} onClick={() => setTauntTo(p.pid)}><Avatar name={p.nick} size={20} /><Handle>{p.nick}</Handle></button>)}
          </div>
          <div className="gp-taunter__lines">{(t.list('md4.gp.roomTaunts') as string[]).map((line, k) => <button key={k} type="button" onClick={() => { void taunt(k); }}>{line}</button>)}</div>
        </div>}
        {tauntMsg && <p className="gp-quiet" role="status">{tauntMsg}</p>}
        <Feed room={r} myPid={room.pid} />
      </section>
    </>}
  </div>;
}

function Table({ rows }: { rows: Standing[] }) {
  const t = useT();
  return <ol className="gp-table">
    {rows.map((x, k) => <li key={x.p.pid} className={x.me ? 'is-me' : ''}>
      <span className="gp-table__r">{ordinal(t, k + 1)}</span>
      <Byline who={x.p} me={x.me} size={28} tier={false} />
      <span className="gp-table__x">{t('md4.gp.room.wins', { n: x.wins, p: x.n })}</span>
      <b className="gp-table__p">{num(x.total)}</b>
    </li>)}
  </ol>;
}

function Feed({ room, myPid }: { room: Room; myPid: string }) {
  const t = useT();
  const lines = t.list('md4.gp.roomTaunts') as string[];
  if (!room.feed.length) return <p className="gp-quiet">{t('md4.gp.room.feedNone')}</p>;
  const when = (at: number) => <time className="gp-feed__at">{fmtDate(at, t.lang, { day: 'numeric', month: 'short' })}</time>;
  return <div className="gp-feed">{room.feed.map((ev, k) => {
    const me = ev.pid === myPid;
    if (ev.t === 'filed') return <Fragment key={k}>
      {(ev.drops || ev.hwg || []).map((p, j) => <div key={j} className="gp-ev gp-ev--drop"><span className="gp-ev__tag">{t('back4.allin')}</span><span dir="auto">{withHandle(t('md4.gp.ev.drop', { n: '{n}', p }), ev.nick)}</span>{when(ev.at)}</div>)}
      <div className={'gp-ev' + (me ? ' is-me' : '')}><Avatar name={ev.nick} size={28} me={me} /><span className="gp-ev__b"><span dir="auto">{withHandle(t('md4.gp.ev.played', { n: '{n}', r: (ev.round || 0) + 1, p: num(ev.score || 0), tier: t('tier4.' + ev.tier) }), ev.nick)}</span>{ev.row && <GridRow row={ev.row} size="sm" />}</span>{when(ev.at)}</div>
    </Fragment>;
    if (ev.t === 'taunt') return <div key={k} className={'gp-ev gp-ev--taunt' + (me ? ' is-me' : '')}><Avatar name={ev.nick} size={28} me={me} /><span className="gp-ev__b"><b><Handle>{ev.nick}</Handle>{ev.toNick && <> · <Handle>{ev.toNick}</Handle></>}</b><q dir="auto">{lines[ev.k || 0] || ''}</q></span>{when(ev.at)}</div>;
    return <div key={k} className="gp-ev gp-ev--quiet"><span dir="auto">{withHandle(t('md4.gp.ev.' + ev.t, { n: '{n}', name: ev.name || '' }), ev.nick)}</span>{when(ev.at)}</div>;
  })}</div>;
}

// ---------------------------------------------------------------- a round's results: everyone's grid, then what happened
function RoundResults({ room, round, onBack }: { room: MyRoom; round: number; onBack: () => void }) {
  const t = useT();
  const [rr, setRr] = useState<RoomRound | null>(null);
  const [err, setErr] = useState('');
  const [waiting, setWaiting] = useState(0);
  useEffect(() => {
    v3<RoomRound & { waiting?: number }>('room.round', { code: room.code, pid: room.pid, sec: room.sec, round }).then((x) => {
      if (!x.ok) { if (x.error === 'not yet') setWaiting(Number(x.waiting) || 0); else setErr(t.or('md4.gp.err.' + x.error, 'err.generic')); return; }
      setRr(x);
    });
  }, [room.code, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const players = rr ? [...rr.players].sort((a, b) => b.score - a.score) : [];
  const v4 = rr?.v === 4;
  return <div className="g-screen gp">
    <TopBar back={{ label: room.name, onClick: onBack }} title={t('md4.gp.room.roundT', { n: round + 1 })} />
    {err && <p className="gp-err" role="alert">{err}</p>}
    {!rr && !err && <p className="gp-quiet">{waiting ? t('md4.gp.room.waiting', { n: waiting }) : t('md4.loading')}</p>}
    {rr && <>
      <ol className="gp-table gp-table--grid">{players.map((p, k) => <li key={p.pid} className={p.pid === room.pid ? 'is-me' : ''}>
        <span className="gp-table__r">{ordinal(t, k + 1)}</span>
        <Byline who={p} me={p.pid === room.pid} size={28} tier={false} />
        <GridRow row={p.row} />
        <b className="gp-table__p">{num(p.score)}</b>
      </li>)}</ol>
      <p className="gp-fine">{t('md4.grid.key')}</p>
      {v4 && <section className="gp-sec">
        <h2>{t('md4.gp.room.happened')}</h2>
        <ol className="gp-truth">{rr.cast.map((c, i) => { const tr = players[0]?.per[i]?.truth ?? 0; return <li key={i}><b>{c.player.s || c.player.n}</b><span className={'gp-truth__o is-' + OUTS4[tr]}>{t('out4.' + OUTS4[tr])}</span></li>; })}</ol>
      </section>}
    </>}
    <Pop className="gp-btn gp-btn--ghost gp-btn--wide" onTap={onBack}>{t('md4.gp.room.back')}</Pop>
  </div>;
}
