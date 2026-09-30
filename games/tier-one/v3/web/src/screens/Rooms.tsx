// The press box (GOTY.md §7.3): a room is a newsroom of friends with a season table, weekly rounds on the real
// calendar, and a room feed (calls, taunts, HERE WE GO cards). Also here: "beat my board" challenge links, friend
// rivals, the newsroom card, and Spectate (a finished round replayed as a film strip of everyone's calls per day).
// Daily rules exactly on every board; scored on the server. Nothing here changes a Daily board or score.
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave, update, getSave } from '../lib/save';
import { v3 } from '../lib/api';
import { useLeague } from '../lib/leagueData';
import { sfx, buzz } from '../lib/sfx';
import { currentSeason, isoWeek } from '../lib/season';
import { OUTS } from '../lib/engine';
import { Icon, GBtn, TopBar } from '../ui/game';
import { Avatar, Seg } from '../ui/screenbits';
import { Glyph } from '../ui/bits';
import { Byline, ChallengeButton, FriendRivalCard, Handle, withHandle } from '../ui/social';
import {
  identity, syncRoom, standings, roundState, roundOpens, roundCloses, currentRound, friendRivals, pending, dropPending, acceptChallenge, submitChallenge, refreshMine, settleChallenge, hoursLeft, roomUrl,
  type Room, type RoomRound, type Challenge, type Standing,
} from '../lib/social';
import type { Chrome } from '../App';

type Tab = 'rooms' | 'league';
const sx = (i: number): CSSProperties => ({ ['--i' as string]: i });

export function RoomsScreen({ code, challenge, ...chrome }: Chrome & { code?: string; challenge?: string }) {
  const t = useT();
  const s = useSave();
  const [tab, setTab] = useState<Tab>('rooms');
  const [open, setOpen] = useState<string | undefined>(s.rooms.find((r) => r.code === code) ? code : undefined);
  const [joinCode, setJoin] = useState(code && !s.rooms.find((r) => r.code === code) ? code : '');
  const [name, setName] = useState('');
  const [rounds, setRounds] = useState(10);
  const [cadence, setCadence] = useState<'weekly' | 'daily'>('weekly');
  const [nick, setNick] = useState(s.nick);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const mine = s.rooms.find((r) => r.code === open);
  const saveNick = () => { if (nick.trim()) update((x) => { x.nick = nick.trim().slice(0, 16); }); return nick.trim(); };
  const remember = (r: { room: Room; pid: string; sec: string }, n: string) => { update((x) => { x.rooms = [{ code: r.room.code, name: r.room.name, pid: r.pid, sec: r.sec, nick: n }, ...x.rooms.filter((q) => q.code !== r.room.code)]; }); setOpen(r.room.code); };
  const create = async () => {
    const n = saveNick(); if (!n) { setErr(t('rooms.errors.nick')); return; }
    setBusy(true); const r = await v3<{ room: Room; pid: string; sec: string }>('room.create', { ...identity(), nick: n, name: name || t('so.box.k'), rounds, cadence }); setBusy(false);
    if (!r.ok) { setErr(t('rooms.errors.' + r.error) || t('err.generic')); return; }
    remember(r, n);
  };
  const join = async () => {
    const n = saveNick(); if (!n) { setErr(t('rooms.errors.nick')); return; }
    const c = joinCode.trim().toUpperCase();
    if (getSave().rooms.some((r) => r.code === c)) { setOpen(c); return; }
    setBusy(true); const r = await v3<{ room: Room; pid: string; sec: string }>('room.join', { ...identity(), nick: n, code: c }); setBusy(false);
    if (!r.ok) { setErr(t('rooms.errors.' + r.error) || t('err.generic')); return; }
    remember(r, n);
  };
  if (mine) return <RoomPage key={mine.code} room={mine} chrome={chrome} onBack={() => setOpen(undefined)} />;
  const friends = friendRivals(s);
  const named = friends.filter((f) => f.named);
  const pend = pending(s);
  return <div className="g-screen rooms3 pressbox">
    <TopBar onHelp={() => chrome.go({ n: 'howto' })} onMenu={chrome.openSettings} />
    <div className="stagger g-stack">
      <div className="g-tabs2" role="tablist" style={sx(0)}>
        {(['rooms', 'league'] as const).map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { sfx('ui.tap'); setTab(k); }}><Icon n={k === 'rooms' ? 'friends' : 'trophy'} size={18} />{t('so.tabs.' + k)}</button>)}
      </div>
      {tab === 'league' ? <LeagueCard /> : <>
        <section className="g-hero g-hero--rooms" style={sx(1)}>
          <span className="g-hero__art" aria-hidden="true"><Icon n="friends" /></span>
          <span className="g-mono g-hero__k">{t('so.box.k')}</span>
          <h1 className="g-hero__t">{t('so.box.hed')}</h1>
          <p className="g-hero__s">{t('so.box.sub')}</p>
          <label className="byline"><Avatar name={nick || '?'} size={40} me /><span className="byline__f"><small className="g-mono">{t('g.rooms.byline')}</small><input value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} onBlur={saveNick} aria-label={t('common.nick')} /></span><Icon n="story" size={16} /></label>
        </section>

        {challenge && <ChallengeCard code={challenge} chrome={chrome} style={sx(2)} />}
        {pend && pend.code !== challenge && <section className="so-pend g-card" style={sx(2)}>
          <span className="so-pend__ic" aria-hidden="true"><Icon n="target" /></span>
          <div className="so-pend__t"><b>{withHandle(t('so.ch.pending', { n: '{n}' }), pend.by.nick)}</b><small>{t('so.ch.pendingSub')} · {t('so.ch.target', { s: num(pend.target.score) })} · {t('so.ch.expires', { h: hoursLeft(pend.exp) })}</small></div>
          <div className="so-pend__acts">
            <GBtn size="sm" kind="gold" sound="open" onClick={() => { if (!getSave().practice.live) acceptChallenge({ ...pend, res: [], open: true, mine: false, label: '', kind: pend.kind } as Challenge, pend.seed); chrome.go({ n: 'play', mode: 'practice', key: Date.now() }); }}><Icon n="uturn" size={18} />{t('so.ch.resume')}</GBtn>
            <button className="cn-link" onClick={() => { sfx('ui.tap'); dropPending(); }}>{t('so.ch.drop')}</button>
          </div>
        </section>}

        {s.rooms.length > 0 && <>
          <div className="g-sec" style={sx(3)}><h2>{t('so.box.mine')}</h2><span className="g-mono">{s.rooms.length}</span></div>
          <div className="myrooms" style={sx(3)}>{s.rooms.map((r) => <button key={r.code} className="myroom" onClick={() => { sfx('open'); setOpen(r.code); }}>
            <span className="myroom__code g-num">{r.code}</span>
            <span className="myroom__t"><b>{r.name}</b><small className="g-mono">{t('common.you')}: <Handle>{r.nick}</Handle></small></span>
            <Icon n={t.rtl ? 'back' : 'arrow'} size={20} />
          </button>)}</div>
        </>}

        <div className="rooms3__two" style={sx(4)}>
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
            <Seg label={t('so.box.cadence')} value={cadence} onChange={setCadence} options={[{ v: 'weekly' as const, label: t('so.box.weekly'), sub: t('so.box.weeklySub') }, { v: 'daily' as const, label: t('so.box.daily'), sub: t('so.box.dailySub') }]} />
            <Seg label={t('rooms.rounds')} value={rounds} onChange={setRounds} options={[5, 10, 20].map((n) => ({ v: n, label: n, sub: t('rooms.rounds') }))} />
            <GBtn kind="gold" disabled={busy} onClick={create} sound="open"><Icon n="friends" size={22} />{t('rooms.create')}</GBtn>
          </section>
        </div>
        {err && <p className="g-err" role="alert"><Icon n="x" size={16} />{err}</p>}

        <MintCard chrome={chrome} style={sx(5)} />

        <div className="g-sec" style={sx(6)}><h2>{t('so.box.friends')}</h2><button className="cn-link" onClick={() => chrome.go({ n: 'rivals' })}>{t('so.box.friendsAll')}</button></div>
        {friends.length ? <div className="so-fgrid" style={sx(6)}>{(named.length ? named : friends).slice(0, 3).map((f, k) => <FriendRivalCard key={f.id} rec={f} i={k} />)}</div>
          : <div className="g-empty g-card g-card--desk" style={sx(6)}><Icon n="reply" size={24} /><span>{t('so.fr.none')}</span></div>}

        <button className="so-nrcard g-card g-card--desk" style={sx(7)} onClick={() => { sfx('open'); chrome.go({ n: 'newsroom', code: s.social?.newsroom?.code }); }}>
          <span className="so-nrcard__ic" aria-hidden="true"><Icon n="news" /></span>
          <span className="so-nrcard__t"><small className="g-mono">{s.social?.newsroom ? t('so.box.newsroomT') : t('so.box.newsroomNone')}</small><b>{s.social?.newsroom ? s.social.newsroom.name : t('so.nr.hed')}</b><span className="g-sub">{t('so.box.newsroomSub')}</span></span>
          <Icon n={t.rtl ? 'back' : 'arrow'} size={22} />
        </button>
        <p className="g-fine g-mono" style={sx(8)}>{t('daily.fair')}</p>
      </>}
    </div>
  </div>;
}

// ---------------------------------------------------------------- Beat my board: mint from the last window, see the answers
function MintCard({ chrome, style }: { chrome: Chrome; style?: CSSProperties }) {
  const t = useT(); const s = useSave();
  const [list, setList] = useState<Challenge[]>([]);
  useEffect(() => { let alive = true; refreshMine().then((r) => { if (alive && r.ok) setList(r.list); }); return () => { alive = false; }; }, [s.social?.made?.length]);
  const last = s.social?.lastLocal, today = s.daily[new Date().toISOString().slice(0, 10)];
  const from = today && (!last || last.at < Date.now() - 3600e3 * 12) ? t('front.dailyNo', { n: today.no }) : last ? (last.label || t('cn.mode.' + last.mode) + ' · ' + last.seed) : '';
  return <section className="so-mint g-card" style={style}>
    <div className="so-mint__h"><span className="so-mint__ic" aria-hidden="true"><Icon n="target" /></span><div><h2 className="g-h2">{t('so.ch.title')}</h2><p className="g-sub">{t('so.ch.hed')}</p></div></div>
    {from || today ? <div className="so-mint__row"><small className="g-mono">{t('so.ch.mintFrom', { w: from })}</small><ChallengeButton size="" /></div>
      : <p className="so-mint__none">{t('so.ch.none')} <button className="cn-link" onClick={() => chrome.go({ n: 'practice' })}>{t('cn.mode.practice')}</button></p>}
    {list.length > 0 && <div className="so-chlist">
      <div className="g-sec" style={{ margin: '8px 0 4px' }}><h3>{t('so.ch.mine')}</h3><span className="g-mono">{list.length}</span></div>
      {list.map((ch) => <ChallengeRow key={ch.code} ch={ch} chrome={chrome} />)}
    </div>}
  </section>;
}
function ChallengeRow({ ch, chrome }: { ch: Challenge; chrome: Chrome }) {
  const t = useT();
  const label = ch.kind === 'daily' ? t('front.dailyNo', { n: ch.no || '' }) : t('so.ch.mode.' + ch.kind) + (ch.seed ? ' · ' + ch.seed : '');
  return <div className={'so-chrow' + (ch.open ? ' is-open' : '')}>
    <span className="so-chrow__k"><b className="g-num">{num(ch.target.score)}</b><small className="g-mono">{label} · {ch.open ? t('so.ch.expires', { h: hoursLeft(ch.exp) }) : t('so.ch.closed')}</small></span>
    <span className="so-chrow__res">{ch.res.length ? ch.res.slice(0, 4).map((r) => <span key={r.pub} className={'so-ans is-' + r.r} title={t('so.ch.' + (r.r === 'w' ? 'l' : r.r === 'l' ? 'w' : 'd'))}><Avatar name={r.nick} size={22} /><Handle>{r.nick}</Handle> <b className="g-num">{num(r.score)}</b></span>) : <small className="g-mono">{t('so.ch.noResults')}</small>}</span>
    <button className="g-icbtn" aria-label={t('so.ch.code') + ' ' + ch.code} onClick={() => chrome.go({ n: 'rooms', challenge: ch.code })}><Icon n={t.rtl ? 'back' : 'arrow'} size={18} /></button>
  </div>;
}

// ---------------------------------------------------------------- a challenge link, opened
function ChallengeCard({ code, chrome, style }: { code: string; chrome: Chrome; style?: CSSProperties }) {
  const t = useT(); const s = useSave();
  const [ch, setCh] = useState<Challenge | null>(null);
  const [seed, setSeed] = useState('');
  const [played, setPlayed] = useState<{ score: number } | null>(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const r = await v3<{ challenge: Challenge; seed?: string; played?: { score: number } }>('challenge.get', { code, dev: s.dev });
    if (!r.ok) { setErr(t('so.ch.errors.' + r.error) || t('err.generic')); return; }
    setCh(r.challenge); setSeed(r.seed || ''); setPlayed(r.played || null); settleChallenge(r.challenge);
  };
  useEffect(() => { load(); }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  if (err) return <p className="g-err" role="alert" style={style}><Icon n="x" size={16} />{err}</p>;
  if (!ch) return <p className="g-empty" style={style}>{t('common.loading')}</p>;
  const me = ch.res.find((r) => r.pub === s.social?.pub) || null;
  const pend = pending(s);
  const isPending = pend?.code === ch.code;
  const take = () => {
    if (!seed) return;
    const r = acceptChallenge(ch, seed);
    if (r === 'busy') { setNote(t('so.ch.busy')); return; }
    if (r !== 'ok') { setNote(t('so.ch.' + (r === 'own' ? 'own' : 'expired'))); return; }
    sfx('open'); buzz(15); chrome.go({ n: 'play', mode: 'practice', key: Date.now() });
  };
  const answerDaily = async () => { setBusy(true); const r = await submitChallenge(ch.code); setBusy(false); if (r.ok) { sfx('stamp.done'); load(); } else setNote(t('so.ch.errors.' + r.error) || t('err.generic')); };
  const dailyToday = ch.kind === 'daily' && !seed;
  return <section className={'so-ch g-card' + (ch.open ? '' : ' is-closed')} style={style} aria-labelledby="so-ch-h">
    <span className="so-ch__tape" aria-hidden="true" />
    <div className="so-ch__head">
      <div><small className="g-mono">{t('so.ch.by')}</small><Byline who={ch.by} size={32} /></div>
      <span className={'g-stamp is-slam' + (ch.open ? '' : ' g-stamp--off')} style={{ ['--rot' as string]: '6deg' }}>{ch.open ? t('so.ch.expires', { h: hoursLeft(ch.exp) }) : t('so.ch.closed')}</span>
    </div>
    <h2 id="so-ch-h" className="so-ch__t">{withHandle(t('so.ch.card', { n: '{n}' }), ch.by.nick)}</h2>
    <div className="so-ch__target">
      <b className="g-num">{num(ch.target.score)}</b>
      <span><small className="g-mono">{t('so.ch.target', { s: '' }).replace(/^\s*·?\s*/, '')}</small><small className="g-mono">{t('tier.' + ch.target.tier)} · {ch.kind === 'daily' ? t('front.dailyNo', { n: ch.no || '' }) : t('so.ch.mode.' + ch.kind)}</small></span>
      <Row row={ch.target.row} />
    </div>
    {ch.kind === 'career' && <p className="g-fine">{t('so.ch.career')}</p>}
    {ch.mine ? <p className="so-ch__note">{t('so.ch.own')}</p>
      : me ? <p className={'so-ch__note is-' + me.r}><Icon n={me.r === 'w' ? 'crown' : me.r === 'l' ? 'x' : 'check'} size={16} />{t('so.ch.you')}: {t('so.ch.yours', { s: num(me.score), r: t('so.ch.' + me.r) })}</p>
        : !ch.open ? <p className="so-ch__note">{t('so.ch.expired')}</p>
          : dailyToday ? <div className="so-ch__acts"><p className="g-sub">{t('so.ch.dailyNote')}</p>{played ? <GBtn kind="gold" disabled={busy} onClick={answerDaily}><Icon n="check" size={20} />{t('so.ch.dailyAnswer')}</GBtn> : <GBtn kind="" sound="open" onClick={() => chrome.go({ n: 'daily' })}><Icon n="phone" size={20} />{t('so.ch.dailyPlay')}</GBtn>}</div>
            : <div className="so-ch__acts">
              {isPending ? <GBtn kind="gold" sound="open" onClick={() => chrome.go({ n: 'play', mode: 'practice', key: Date.now() })}><Icon n="uturn" size={20} />{t('so.ch.resume')}</GBtn>
                : <GBtn kind="gold" sound="open" onClick={take} shine><Icon n="target" size={20} />{t('so.ch.accept')}</GBtn>}
              {isPending && <button className="cn-link" onClick={() => { sfx('ui.tap'); dropPending(); }}>{t('so.ch.drop')}</button>}
            </div>}
    {note && <p className="g-err" role="alert">{note} {note === t('so.ch.busy') && <button className="cn-link" onClick={() => chrome.go({ n: 'play', mode: 'practice', key: Date.now() })}>{t('practice.resume')}</button>}</p>}
    <div className="so-ch__res">
      <div className="g-sec" style={{ margin: '10px 0 4px' }}><h3>{t('so.ch.results')}</h3><span className="g-mono">{ch.res.length}</span></div>
      {ch.res.length ? ch.res.map((r) => <div key={r.pub} className={'so-ans so-ans--row is-' + r.r}><Byline who={r} size={26} me={r.pub === s.social?.pub} /><Row row={r.row} /><b className="g-num">{num(r.score)}</b><small>{t('so.ch.' + r.r)}</small></div>) : <p className="g-sub">{t('so.ch.noResults')}</p>}
    </div>
  </section>;
}
const Row = ({ row }: { row: string }) => <span className="so-row" aria-hidden="true">{(row || '').split('').map((ch, k) => <i key={k} className={ch === '★' ? 'x' : ch === '■' ? 'r' : ch === '□' ? 'w' : 'n'} />)}</span>;

// ---------------------------------------------------------------- one press box
function RoomPage({ room, chrome, onBack }: { room: { code: string; name: string; pid: string; sec: string; nick: string }; chrome: Chrome; onBack: () => void }) {
  const t = useT();
  const [r, setR] = useState<Room | null>(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [spec, setSpec] = useState<number | null>(null);
  const [tauntOpen, setTauntOpen] = useState(false);
  const [tauntTo, setTauntTo] = useState<string | null>(null);
  const [tauntMsg, setTauntMsg] = useState('');
  const load = async () => {
    const x = await v3<{ room: Room }>('room.get', { code: room.code, pid: room.pid, sec: room.sec, ...identity() });
    if (!x.ok) { setErr(x.error === 'net' ? t('rooms.needNet') : t('rooms.errors.' + x.error) || t('err.generic')); return; }
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
  const taunt = async (k: number) => {
    const x = await v3<{ feed: Room['feed'] }>('room.post', { code: room.code, pid: room.pid, sec: room.sec, k, to: tauntTo || undefined });
    if (!x.ok) { setTauntMsg(x.error === 'slow' ? t('so.room.tauntSlow') : t('err.generic')); return; }
    sfx('publish.talks'); buzz(10); setTauntMsg(t('so.room.tauntSent')); setTauntOpen(false);
    setR((cur0) => (cur0 ? { ...cur0, feed: x.feed } : cur0)); setTimeout(() => setTauntMsg(''), 1800);
  };
  if (spec != null && r) return <Spectate room={room} round={spec} onBack={() => setSpec(null)} chrome={chrome} />;
  return <div className="g-screen rooms3 pressbox pb-room">
    <TopBar back={{ label: t('so.tabs.rooms'), onClick: onBack }} onMenu={chrome.openSettings} />
    <div className="stagger g-stack">
      <section className="g-hero g-hero--rooms" style={sx(0)}>
        <span className="g-mono g-hero__k">{t('so.box.k')} · {season.name} · {t('so.box.week', { w: isoWeek().key.split('-W')[1] })}</span>
        <h1 className="g-hero__t">{room.name}</h1>
        <div className="roomcode">
          <span className="roomcode__c"><small className="g-mono">{t('g.rooms.code')}</small><b className="g-num">{room.code}</b></span>
          <button className="g-btn g-btn--sm g-btn--rooms" onClick={copy} title={invite}><Icon n={copied ? 'check' : 'share'} size={18} />{copied ? t('g.rooms.copied') : t('g.rooms.copy')}</button>
        </div>
        {r && <div className="members" aria-label={t('g.rooms.reporters', { n: r.players.length })}>
          {r.players.map((p) => <Byline key={p.pid} who={p} me={p.pid === room.pid} size={30} tier={false} style={{ ['--host' as string]: p.pid === r.host ? 1 : 0 }} />)}
        </div>}
        {r && <p className="so-state g-mono"><Icon n={curState === 'open' ? 'phone' : curState === 'played' ? 'check' : curState === 'soon' ? 'clock' : 'lock'} size={14} />{t('so.room.stateLine.' + curState, { n: cur + 1 })}</p>}
      </section>
      {err && <p className="g-err" role="alert">{err}</p>}
      {!r && !err && <p className="g-empty">{t('common.loading')}</p>}
      {r && <div className="pb-room__cols">
        <section style={sx(1)}>
          <div className="g-sec"><h2>{t('so.room.rounds')}</h2><span className="g-mono">{r.cadence === 'weekly' ? t('so.box.weekly') : t('so.box.daily')} · {r.rounds}</span></div>
          <div className="rounds">{Array.from({ length: r.rounds }, (_, k) => {
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
        </section>
        <section style={sx(2)}>
          <div className="g-sec"><h2>{t('so.room.table')}</h2><span className="g-mono">{t('g.rooms.reporters', { n: rows.length })}</span></div>
          <SeasonTable rows={rows} />
        </section>
        <section style={sx(3)}>
          <div className="g-sec"><h2>{t('so.room.feed')}</h2><button className="g-btn g-btn--sm g-btn--rooms so-tauntbtn" aria-expanded={tauntOpen} onClick={() => { sfx('ui.tap'); setTauntOpen((v) => !v); }}><Icon n="reply" size={16} />{t('so.room.taunt')}</button></div>
          {tauntOpen && <div className="so-taunter g-card" role="group" aria-label={t('so.room.taunt')}>
            <div className="so-taunter__to">
              <button type="button" aria-pressed={tauntTo == null} onClick={() => setTauntTo(null)}>{t('so.room.tauntRoom')}</button>
              {r.players.filter((p) => p.pid !== room.pid).map((p) => <button key={p.pid} type="button" aria-pressed={tauntTo === p.pid} onClick={() => setTauntTo(p.pid)}><Avatar name={p.nick} size={20} /><Handle>{p.nick}</Handle></button>)}
            </div>
            <div className="so-taunter__lines">{(t.list('so.room.taunts') as string[]).map((line, k) => <button key={k} type="button" onClick={() => taunt(k)}>“{line}”</button>)}</div>
          </div>}
          {tauntMsg && <p className="g-mono so-tauntmsg" role="status">{tauntMsg}</p>}
          <Feed room={r} myPid={room.pid} />
        </section>
      </div>}
    </div>
  </div>;
}

function SeasonTable({ rows }: { rows: Standing[] }) {
  const t = useT();
  return <div className="ltable ltable--season g-card">
    <div className="ltable__h g-mono"><span>#</span><span>{t('league.reporter')}</span><span>{t('so.room.p')}</span><span>{t('so.room.w')}</span><span>{t('so.room.pts')}</span></div>
    {rows.map((x, k) => <div key={x.p.pid} className={'lrow' + (x.me ? ' is-me' : '') + (k === 0 && x.total > 0 ? ' is-top' : '')}>
      <span className="lrow__n g-num">{k === 0 && x.total > 0 ? <Icon n="crown" size={18} /> : k + 1}</span>
      <span className="lrow__who"><Byline who={x.p} me={x.me} size={28} tier={false} /><span className="so-form" aria-label={t('so.room.form')}>{x.form.map((f, j) => <i key={j} className={'is-' + f} />)}</span></span>
      <span className="lrow__x">{x.n}</span><span className="lrow__x">{x.wins}</span><b className="lrow__p g-num">{num(x.total)}</b>
    </div>)}
  </div>;
}

function Feed({ room, myPid }: { room: Room; myPid: string }) {
  const t = useT();
  const lines = t.list('so.room.taunts') as string[];
  if (!room.feed.length) return <div className="g-empty g-card g-card--desk"><Icon n="news" size={22} /><span>{t('so.room.empty')}</span></div>;
  const who = (n: string) => <Handle>{n}</Handle>;
  return <div className="so-feed cn-sheet">{room.feed.map((ev, k) => {
    const me = ev.pid === myPid;
    if (ev.t === 'filed') return <Fragment key={k}>
      {(ev.hwg || []).map((p, j) => <div key={j} className="so-fev so-fev--hwg"><span className="so-fev__ic" aria-hidden="true"><Icon n="bolt" size={16} /></span><span className="so-fev__b"><b className="so-hwg">{t('so.room.ev.hwgT')}</b><span dir="auto">{withHandle(t('so.room.ev.hwg', { n: '{n}', p }), ev.nick)}</span></span><time className="cn-row__at">{fmtDate(ev.at, t.lang, { day: 'numeric', month: 'short' })}</time></div>)}
      <div className={'so-fev so-fev--filed' + (me ? ' is-me' : '')}><Avatar name={ev.nick} size={30} me={me} /><span className="so-fev__b"><span dir="auto">{withHandle(t('so.room.ev.filed', { n: '{n}', r: (ev.round || 0) + 1, p: num(ev.score || 0), tier: t('tier.' + ev.tier) }), ev.nick)}</span><Row row={ev.row || ''} /></span><time className="cn-row__at">{fmtDate(ev.at, t.lang, { day: 'numeric', month: 'short' })}</time></div>
    </Fragment>;
    if (ev.t === 'taunt') return <div key={k} className={'so-fev so-fev--taunt' + (me ? ' is-me' : '')}><Avatar name={ev.nick} size={30} me={me} /><span className="so-fev__b"><b>{who(ev.nick)}{ev.toNick && <> → {who(ev.toNick)}</>}</b><q dir="auto">{lines[ev.k || 0] || ''}</q></span><time className="cn-row__at">{fmtDate(ev.at, t.lang, { day: 'numeric', month: 'short' })}</time></div>;
    return <div key={k} className="so-fev so-fev--quiet"><span className="so-fev__ic" aria-hidden="true"><Icon n={ev.t === 'open' ? 'star' : 'friends'} size={14} /></span><span className="so-fev__b" dir="auto">{withHandle(t('so.room.ev.' + ev.t, { n: '{n}', name: ev.name || '' }), ev.nick)}</span><time className="cn-row__at">{fmtDate(ev.at, t.lang, { day: 'numeric', month: 'short' })}</time></div>;
  })}</div>;
}

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
      if (!x.ok) { if (x.error === 'not yet') setWaiting(Number(x.waiting) || 0); else setErr(t('rooms.errors.' + x.error) || t('err.generic')); return; }
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

// ---------------------------------------------------------------- the weekly league (unchanged from 3.1)
function LeagueCard() {
  const t = useT();
  const lg = useLeague();
  const n = lg ? lg.rows.length : 0;
  const downAt = lg && lg.down > 0 && n > lg.up + lg.down ? n - lg.down : -1;
  return <>
    <section className="g-hero g-hero--rooms league3" style={sx(1)}>
      <span className="g-hero__art" aria-hidden="true"><Icon n="trophy" /></span>
      <span className="g-mono g-hero__k">{t('g.rooms.leagueK')}{lg ? ' · ' + t('g.rooms.week', { w: lg.week.split('-W')[1] }) : ''}</span>
      <h1 className="g-hero__t">{lg ? t('league.divs.' + lg.div) : t('league.title')}</h1>
      {lg && <div className="divs" aria-hidden="true">{(t.list('league.divs') as string[]).map((d, k) => <span key={k} className={k === lg.div ? 'is-on' : k < lg.div ? 'is-past' : ''} title={d}><i />{k === lg.div ? d : ''}</span>)}</div>}
      {lg && <p className="g-hero__s">{t(lg.up && lg.down ? 'g.rooms.leagueSub' : lg.up ? 'g.rooms.leagueUp' : 'g.rooms.leagueDown', { u: lg.up, d: lg.down })}{lg.last ? ' ' + t('league.moved', { r: lg.last.rank, n: lg.last.size }) : ''}</p>}
    </section>
    {lg && lg.rows.length ? <div className="ltable ltable--league g-card" style={sx(2)}>
      <div className="ltable__h g-mono"><span>#</span><span>{t('league.reporter')}</span><span>{t('g.rooms.daily')}</span><span>{t('g.rooms.wire')}</span><span>{t('league.pts')}</span></div>
      {lg.rows.map((r, k) => <Fragment key={k}>
        {downAt === k && <div className="zline zline--down"><Icon n="arrow" size={14} style={{ transform: 'rotate(90deg)' }} />{t('league.down')}</div>}
        <div className={'lrow' + (r.me ? ' is-me' : '') + (k < lg.up ? ' is-up' : '') + (downAt >= 0 && k >= downAt ? ' is-down' : '')}>
          <span className="lrow__n g-num">{k + 1}</span>
          <span className="lrow__who"><Avatar name={r.nick} size={28} me={r.me} /><b>{r.me ? t('common.you') : <Handle>{r.nick}</Handle>}</b></span>
          <span className="lrow__x">{r.daily}</span><span className="lrow__x">{Math.round(r.wire)}</span><b className="lrow__p g-num">{Math.round(r.pts)}</b>
        </div>
        {lg.up > 0 && k === lg.up - 1 && n > lg.up && <div className="zline zline--up"><Icon n="arrow" size={14} style={{ transform: 'rotate(-90deg)' }} />{t('league.up')}</div>}
      </Fragment>)}
    </div> : <div className="g-empty g-card g-card--desk" style={sx(2)}><Icon n="trophy" size={28} /><span>{lg ? t('league.empty') : t('wire.needNet')}</span></div>}
    <details className="g-more g-more--desk" style={sx(3)}><summary><Icon n="help" size={16} />{t('g.rooms.how')}</summary><p>{t('league.note')}</p></details>
  </>;
}
