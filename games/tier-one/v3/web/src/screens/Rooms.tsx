// Rooms (UI41 §Multiplayer = Rooms only): play friends on one shared board a round, Daily rules exactly, scored on the
// server. Four screens, none scrolls: the lobby (join with a code, your rooms, Start a room), New room, one room
// (Table · Rounds · Chat, Play this round, Leave), and a round's results. Challenges and crews are cut: their old links
// land on "This link has expired". Ranks are words ("1st"), never a crown.
import { useEffect, useMemo, useState } from 'react';
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave, update, getSave } from '../lib/save';
import { v3 } from '../lib/api';
import { sfx, buzz } from '../lib/sfx';
import { toast } from '../lib/meta';
import { OUTS4 } from '../lib/engine';
import { Avatar } from '../ui/screenbits';
import { Byline, Handle, withHandle, GridRow, ordinal } from '../ui/social';
import { Screen, Pager, Chips } from '../ui/screen';
import { identity, syncRoom, standings, roundState, roundOpens, roundCloses, currentRound, roomUrl, type Room, type RoomRound, type RoomEvent } from '../lib/social';
import type { Chrome } from '../App';
import '../styles/social.css';

type MyRoom = { code: string; name: string; pid: string; sec: string; nick: string };

export function RoomsScreen({ code, challenge, ...chrome }: Chrome & { code?: string; challenge?: string }) {
  const s = useSave();
  const [open, setOpen] = useState<string | undefined>(s.rooms.find((r) => r.code === code) ? code : undefined);
  const [making, setMaking] = useState(false);
  if (challenge) return <Expired chrome={chrome} />;
  const mine = s.rooms.find((r) => r.code === open);
  if (mine) return <RoomPage key={mine.code} room={mine} chrome={chrome} onBack={() => setOpen(undefined)} />;
  if (making) return <NewRoom onBack={() => setMaking(false)} onMade={(c) => { setMaking(false); setOpen(c); }} />;
  return <Lobby chrome={chrome} joinCode={code && !s.rooms.find((r) => r.code === code) ? code : ''} onOpen={setOpen} onMake={() => setMaking(true)} />;
}

/** Old challenge / newsroom links (UI41: fail politely). */
export function Expired({ chrome }: { chrome: Chrome }) {
  const t = useT();
  return <Screen title={t('w41.rm.expired')} onBack={chrome.home} tone="rooms"
    footer={<button type="button" className="rm-btn rm-btn--main" onClick={() => chrome.go({ n: 'rooms' })}>{t('w41.rm.toRooms')}</button>}>
    <p className="rm-note rm-note--big">{t('w41.rm.expiredB')}</p>
  </Screen>;
}

const remember = (r: { room: Room; pid: string; sec: string }, nick: string) => update((x) => { x.rooms = [{ code: r.room.code, name: r.room.name, pid: r.pid, sec: r.sec, nick }, ...x.rooms.filter((q) => q.code !== r.room.code)]; });
const nickNow = () => (getSave().nick || '').trim();

// ---------------------------------------------------------------- the lobby: join with a code, your rooms, start one
function Lobby({ chrome, joinCode: j0, onOpen, onMake }: { chrome: Chrome; joinCode: string; onOpen: (c: string) => void; onMake: () => void }) {
  const t = useT(); const s = useSave();
  const [code, setCode] = useState(j0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const join = async () => {
    const n = nickNow(); if (!n) { setErr(t('md4.gp.err.nick')); return; }
    const c = code.trim().toUpperCase();
    if (getSave().rooms.some((r) => r.code === c)) { onOpen(c); return; }
    setBusy(true); const r = await v3<{ room: Room; pid: string; sec: string }>('room.join', { ...identity(), nick: n, code: c }); setBusy(false);
    if (!r.ok) { setErr(t.or('md4.gp.err.' + r.error, 'err.generic')); return; }
    remember(r, n); sfx('os.open'); buzz(15); onOpen(r.room.code);
  };
  return <Screen title={t('w41.rm.title')} sub={s.nick ? <>{withHandle(t('w41.rm.as', { n: '{n}' }), s.nick)}</> : undefined} onBack={chrome.home} tone="rooms"
    footer={<button type="button" className="rm-btn rm-btn--main" onClick={() => { sfx('ui.tap'); onMake(); }}>{t('w41.rm.start')}</button>}>
    <form className="rm-join" onSubmit={(e) => { e.preventDefault(); if (code.trim().length >= 4 && !busy) void join(); }}>
      <label className="rm-lbl" htmlFor="rm-code">{t('w41.rm.joinT')}</label>
      <div className="rm-join__row">
        <input id="rm-code" className="rm-input rm-input--code" value={code} onChange={(e) => { setErr(''); setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); }} placeholder="ABCDE" maxLength={8} autoCapitalize="characters" spellCheck={false} />
        <button type="submit" className="rm-btn" disabled={busy || code.trim().length < 4}>{t('w41.rm.join')}</button>
      </div>
      {err && <p className="rm-err" role="alert">{err}</p>}
    </form>
    <p className="rm-lbl">{t('w41.rm.mine')}</p>
    <Pager items={s.rooms} per={4} empty={<p>{t('w41.rm.none')}</p>} render={(r) => <button key={r.code} type="button" className="rm-row rm-row--room" onClick={() => { sfx('os.open'); onOpen(r.code); }}>
      <span className="rm-row__code">{r.code}</span>
      <span className="rm-row__t"><b dir="auto">{r.name}</b><small>{withHandle(t('w41.rm.as', { n: '{n}' }), r.nick)}</small></span>
      <span className="rm-row__go" aria-hidden="true">{t.rtl ? '‹' : '›'}</span>
    </button>} />
  </Screen>;
}

// ---------------------------------------------------------------- new room
function NewRoom({ onBack, onMade }: { onBack: () => void; onMade: (code: string) => void }) {
  const t = useT();
  const [name, setName] = useState('');
  const [cadence, setCadence] = useState<'weekly' | 'daily'>('weekly');
  const [rounds, setRounds] = useState<'5' | '10' | '20'>('10');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const make = async () => {
    const n = nickNow(); if (!n) { setErr(t('md4.gp.err.nick')); return; }
    setBusy(true); const r = await v3<{ room: Room; pid: string; sec: string }>('room.create', { ...identity(), nick: n, name: name.trim() || t('md4.gp.room.defaultName'), rounds: Number(rounds), cadence }); setBusy(false);
    if (!r.ok) { setErr(t.or('md4.gp.err.' + r.error, 'err.generic')); return; }
    remember(r, n); sfx('os.open'); buzz(15); onMade(r.room.code);
  };
  return <Screen title={t('w41.rm.startT')} onBack={onBack} tone="rooms"
    footer={<button type="button" className="rm-btn rm-btn--main" onClick={make} disabled={busy}>{t('w41.rm.make')}</button>}>
    <label className="rm-lbl" htmlFor="rm-name">{t('w41.rm.name')}</label>
    <input id="rm-name" className="rm-input" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} placeholder={t('md4.gp.room.namePh')} />
    <p className="rm-lbl">{t('w41.rm.how')}</p>
    <Chips value={cadence} onChange={setCadence} options={[{ k: 'weekly', label: t('w41.rm.weekly') }, { k: 'daily', label: t('w41.rm.daily') }]} />
    <p className="rm-lbl">{t('w41.rm.rounds')}</p>
    <Chips value={rounds} onChange={setRounds} options={(['5', '10', '20'] as const).map((k) => ({ k, label: k }))} />
    <p className="rm-note">{t('md4.gp.room.makeB')}</p>
    {err && <p className="rm-err" role="alert">{err}</p>}
  </Screen>;
}

// ---------------------------------------------------------------- one room
type RoomTab = 'table' | 'rounds' | 'chat';
function RoomPage({ room, chrome, onBack }: { room: MyRoom; chrome: Chrome; onBack: () => void }) {
  const t = useT();
  const [r, setR] = useState<Room | null>(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<RoomTab>('table');
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const drop = () => update((x) => { x.rooms = x.rooms.filter((q) => q.code !== room.code); });
  const load = async () => {
    const x = await v3<{ room: Room }>('room.get', { code: room.code, pid: room.pid, sec: room.sec, ...identity() });
    if (!x.ok) {
      if (x.error === 'not found') { toast('info', t('w41.rm.closed', { r: room.name })); drop(); onBack(); return; }
      setErr(x.error === 'net' ? t('md4.gp.err.net') : t.or('md4.gp.err.' + x.error, 'err.generic')); return;
    }
    const old = x.room as Partial<Room> & Pick<Room, 'code' | 'name' | 'rounds' | 'created' | 'host' | 'players' | 'roundHours'>;
    const rm: Room = { ...old, cadence: old.cadence || 'daily', stepMs: old.stepMs || 864e5, feed: old.feed || [], now: old.now || Date.now() };
    setR(rm); syncRoom(rm, room.pid);
  };
  useEffect(() => { void load(); }, [room.code]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => (r ? standings(r, room.pid) : []), [r, room.pid]);
  const me = r?.players.find((p) => p.pid === room.pid);
  const cur = r ? currentRound(r) : 0;
  const curState = r ? roundState(r, cur, me) : 'open';
  const copy = () => { navigator.clipboard?.writeText(roomUrl(room.code)); sfx('ui.pop'); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const play = (k: number) => chrome.go({ n: 'room', room: { code: room.code, pid: room.pid, sec: room.sec, round: k }, key: Date.now() });
  const leave = async () => {
    setBusy(true); const x = await v3('room.leave', { code: room.code, pid: room.pid, sec: room.sec }); setBusy(false);
    if (!x.ok) { toast('warn', t.or('md4.gp.err.' + x.error, 'err.generic')); return; }
    sfx('ui.tap'); drop(); onBack();
  };
  const send = async (k: number) => {
    const x = await v3<{ feed: Room['feed'] }>('room.post', { code: room.code, pid: room.pid, sec: room.sec, k });
    setSending(false);
    if (!x.ok) { toast('warn', x.error === 'slow' ? t('md4.gp.room.tauntSlow') : t('err.generic')); return; }
    sfx('post'); buzz(10); setR((c) => (c ? { ...c, feed: x.feed } : c));
  };

  if (view != null) return <RoundResults room={room} round={view} onBack={() => setView(null)} />;
  if (leaving) return <Screen title={t('w41.rm.leaveT', { r: room.name })} onBack={() => setLeaving(false)} tone="rooms"
    footer={<><button type="button" className="rm-btn rm-btn--ghost" onClick={() => setLeaving(false)}>{t('w41.rm.cancel')}</button><button type="button" className="rm-btn rm-btn--danger" onClick={leave} disabled={busy}>{t('w41.rm.leaveY')}</button></>}>
    <p className="rm-note rm-note--big">{t('w41.rm.leaveB')}</p>
  </Screen>;

  const dd = (k: number) => fmtDate(roundOpens(r!, k), t.lang, { day: 'numeric', month: 'short' });
  const main = !r ? <button type="button" className="rm-btn rm-btn--main" disabled>{t('md4.loading')}</button>
    : curState === 'open' ? <button type="button" className="rm-btn rm-btn--main" onClick={() => { sfx('os.open'); play(cur); }}>{t('w41.rm.play')}</button>
      : curState === 'played' ? <button type="button" className="rm-btn rm-btn--main" onClick={() => setView(cur)}>{t('w41.rm.see')}</button>
        : <button type="button" className="rm-btn rm-btn--main" disabled>{curState === 'soon' ? t('w41.rm.opens', { d: dd(cur) }) : t('w41.rm.over')}</button>;
  return <Screen title={<span dir="auto">{room.name}</span>} sub={<>{r ? t('w41.rm.round', { n: cur + 1, m: r.rounds }) + ' · ' : ''}{t('w41.rm.codeIs', { c: room.code })}</>} onBack={onBack} tone="rooms"
    right={<button type="button" className="rm-invite" onClick={copy}>{copied ? t('w41.rm.copied') : t('w41.rm.invite')}</button>}
    footer={<><button type="button" className="rm-btn rm-btn--ghost rm-btn--slim" onClick={() => setLeaving(true)}>{t('w41.rm.leave')}</button>{main}</>}>
    <Chips value={tab} onChange={(k) => { sfx('ui.tap'); setTab(k); setSending(false); }} options={(['table', 'rounds', 'chat'] as const).map((k) => ({ k, label: t('w41.rm.tab.' + k) }))} />
    {err && <p className="rm-err" role="alert">{err}</p>}
    {!r ? (!err && <p className="rm-note">{t('md4.loading')}</p>)
      : tab === 'table' ? <Pager items={rows} per={5} render={(x, k) => <div key={x.p.pid} className={'rm-row rm-row--table' + (x.me ? ' is-me' : '')}>
        <span className="rm-row__rank">{ordinal(t, k + 1)}</span>
        <Byline who={x.p} me={x.me} size={28} tier={false} />
        <small>{t('w41.rm.wins', { n: x.wins })}</small>
        <b>{num(x.total)}</b>
      </div>} />
        : tab === 'rounds' ? <Pager items={Array.from({ length: r.rounds }, (_, k) => k)} per={5} render={(k) => {
          const st = roundState(r, k, me), res = me?.results[k];
          const canSee = !!res && (r.now > roundCloses(r, k) || r.players.every((p) => p.results[k]));
          return <div key={k} className={'rm-row rm-row--round is-' + st + (k === cur ? ' is-cur' : '')}>
            <span className="rm-row__rank">{t('w41.rm.roundT', { n: k + 1 })}</span>
            <span className="rm-row__t"><small>{st === 'played' ? t('md4.gp.room.played', { p: num(res!.score) }) : st === 'soon' ? t('md4.gp.room.opens', { d: dd(k) }) : t('md4.gp.room.state.' + st)}</small>{res?.row && <GridRow row={res.row} size="sm" />}</span>
            {st === 'open' ? <button type="button" className="rm-btn rm-btn--sm" onClick={() => play(k)}>{t('md4.gp.room.playShort')}</button>
              : canSee ? <button type="button" className="rm-btn rm-btn--sm" onClick={() => { sfx('os.open'); setView(k); }}>{t('md4.gp.room.see')}</button>
                : st === 'played' ? <small className="rm-wait">{t('w41.rm.wait')}</small> : <span />}
          </div>;
        }} />
          : sending ? <>
            <p className="rm-lbl">{t('w41.rm.sendT')}</p>
            <Pager items={t.list('md4.gp.roomTaunts') as string[]} per={4} render={(line, k) => <button key={k} type="button" className="rm-line" dir="auto" onClick={() => { void send(k); }}>{line}</button>} />
          </>
            : <><Pager items={[...r.feed].reverse()} per={4} empty={<p>{t('w41.rm.chatNone')}</p>} render={(ev, k) => <FeedLine key={k} ev={ev} me={ev.pid === room.pid} />} />
              <button type="button" className="rm-btn rm-btn--ghost rm-btn--line" onClick={() => setSending(true)}>{t('w41.rm.send')}</button></>}
  </Screen>;
}

function FeedLine({ ev, me }: { ev: RoomEvent; me: boolean }) {
  const t = useT();
  const kind = ev.t as string;
  const text = kind === 'taunt' ? <><b><Handle>{ev.nick}</Handle></b> <q dir="auto">{(t.list('md4.gp.roomTaunts') as string[])[ev.k || 0] || ''}</q></>
    : kind === 'filed' ? withHandle(t('md4.gp.ev.played', { n: '{n}', r: (ev.round || 0) + 1, p: num(ev.score || 0), tier: t('tier4.' + ev.tier) }), ev.nick)
      : kind === 'leave' ? withHandle(t('w41.rm.ev.leave', { n: '{n}' }), ev.nick)
        : withHandle(t.or('md4.gp.ev.' + kind, 'md4.gp.ev.join', { n: '{n}', name: ev.name || '' }), ev.nick);
  return <div className={'rm-feed' + (me ? ' is-me' : '')}>
    <Avatar name={ev.nick} size={28} me={me} />
    <span className="rm-feed__b">{text}</span>
    <time>{fmtDate(ev.at, t.lang, { day: 'numeric', month: 'short' })}</time>
  </div>;
}

// ---------------------------------------------------------------- a round's results
function RoundResults({ room, round, onBack }: { room: MyRoom; round: number; onBack: () => void }) {
  const t = useT();
  const [rr, setRr] = useState<RoomRound | null>(null);
  const [err, setErr] = useState('');
  const [waiting, setWaiting] = useState(0);
  const [tab, setTab] = useState<'table' | 'happened'>('table');
  useEffect(() => {
    v3<RoomRound & { waiting?: number }>('room.round', { code: room.code, pid: room.pid, sec: room.sec, round }).then((x) => {
      if (!x.ok) { if (x.error === 'not yet') setWaiting(Number(x.waiting) || 0); else setErr(t.or('md4.gp.err.' + x.error, 'err.generic')); return; }
      setRr(x);
    });
  }, [room.code, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const players = rr ? [...rr.players].sort((a, b) => b.score - a.score) : [];
  const v4 = rr?.v === 4;
  return <Screen title={t('w41.rm.roundT', { n: round + 1 })} sub={<span dir="auto">{room.name}</span>} onBack={onBack} tone="rooms"
    footer={<button type="button" className="rm-btn rm-btn--main" onClick={onBack}>{t('w41.rm.back')}</button>}>
    {err && <p className="rm-err" role="alert">{err}</p>}
    {!rr ? (!err && <p className="rm-note">{waiting ? t('md4.gp.room.waiting', { n: waiting }) : t('md4.loading')}</p>) : <>
      {v4 && <Chips value={tab} onChange={setTab} options={[{ k: 'table', label: t('w41.rm.tab.table') }, { k: 'happened', label: t('w41.rm.happened') }]} />}
      {tab === 'table' || !v4 ? <Pager items={players} per={5} render={(p, k) => <div key={p.pid} className={'rm-row rm-row--table' + (p.pid === room.pid ? ' is-me' : '')}>
        <span className="rm-row__rank">{ordinal(t, k + 1)}</span>
        <Byline who={p} me={p.pid === room.pid} size={28} tier={false} />
        <GridRow row={p.row} size="sm" />
        <b>{num(p.score)}</b>
      </div>} />
        : <Pager items={rr.cast} per={5} render={(c, i) => { const tr = players[0]?.per[i]?.truth ?? 0; return <div key={i} className="rm-row rm-row--truth"><b dir="auto">{c.player.s || c.player.n}</b><span className={'rm-out is-' + OUTS4[tr]}>{t('out4.' + OUTS4[tr])}</span></div>; }} />}
      <p className="rm-note rm-note--fine">{t('md4.grid.key')}</p>
    </>}
  </Screen>;
}
