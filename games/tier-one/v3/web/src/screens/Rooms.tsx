// Friends rooms (DESIGN §5): Daily rules exactly, one shared board per round (open 48 h), scored on our server.
import { useEffect, useState } from 'react';
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave, update, getSave } from '../lib/save';
import { v3 } from '../lib/api';
import { Bar } from '../ui/chrome';
import { Flag, Btn, Arr } from '../ui/bits';
import type { Chrome } from '../App';

interface RoomPlayer { pid: string; nick: string; results: ({ score: number; tier: string; ex: number; row: string } | null)[] }
interface Room { code: string; name: string; rounds: number; created: number; host: string; players: RoomPlayer[]; now: number; roundHours: number }

export function RoomsScreen({ code, ...chrome }: Chrome & { code?: string }) {
  const t = useT();
  const s = useSave();
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
  return <div className="page rooms">
    <Bar chrome={chrome} back={{ label: t('nav.front') }} cur="front" />
    <div className="cols cols--2">
      <main>
        <section className="head"><div className="kicker">{t('rooms.title')}</div><h1 className="hed hed--1">{t('rooms.hed')}</h1><p className="dek" style={{ marginTop: 10 }}>{t('rooms.dek')}</p></section>
        <Flag title={t('rooms.mine')} />
        {s.rooms.length ? s.rooms.map((r) => <button key={r.code} className="item item--link" onClick={() => setOpen(r.code)}><span className="item__n">{r.code.slice(0, 1)}</span><div><h3 className="item__hed">{r.name}</h3><span className="meta">{r.code} · {r.nick}</span></div><Arr /></button>) : <p className="note">{t('rooms.none')}</p>}
      </main>
      <aside>
        <Flag title={t('common.nick')} />
        <input className="input" value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} aria-label={t('common.nick')} />
        <Flag title={t('rooms.join')} />
        <form className="codeform" onSubmit={(e) => { e.preventDefault(); join(); }}><input className="input" value={joinCode} onChange={(e) => setJoin(e.target.value)} placeholder="ABCDE" maxLength={8} aria-label={t('rooms.code')} /><Btn kind="primary" type="submit" className="btn--inline" disabled={busy || joinCode.trim().length < 4}>{t('rooms.joinBtn')}</Btn></form>
        <Flag title={t('rooms.create')} />
        <input className="input" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} placeholder={t('rooms.name')} aria-label={t('rooms.name')} />
        <div className="seg" style={{ marginTop: 10 }} role="group" aria-label={t('rooms.rounds')}>{[5, 10, 20].map((n) => <button key={n} aria-pressed={rounds === n} onClick={() => setRounds(n)}>{n}<small>{t('rooms.rounds')}</small></button>)}</div>
        <Btn kind="ghost" style={{ marginTop: 10 }} disabled={busy} onClick={create}>{t('rooms.create')} <Arr /></Btn>
        {err && <p className="note accent" style={{ marginTop: 8 }}>{err}</p>}
        <p className="note" style={{ marginTop: 10 }}>{t('daily.fair')}</p>
      </aside>
    </div>
  </div>;
}

function RoomPage({ room, chrome, onBack }: { room: { code: string; name: string; pid: string; sec: string; nick: string }; chrome: Chrome; onBack: () => void }) {
  const t = useT();
  const [r, setR] = useState<Room | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { v3<{ room: Room }>('room.get', { code: room.code }).then((x) => (x.ok ? setR(x.room) : setErr(x.error === 'net' ? t('rooms.needNet') : t('rooms.errors.' + x.error)))); }, [room.code]);
  const invite = location.origin + location.pathname + '?room=' + room.code;
  const standings = r ? r.players.map((p) => ({ ...p, total: p.results.reduce((a, x) => a + (x ? x.score : 0), 0), n: p.results.filter(Boolean).length })).sort((a, b) => b.total - a.total) : [];
  const me = r?.players.find((p) => p.pid === room.pid);
  return <div className="page rooms">
    <Bar chrome={chrome} back={{ label: t('nav.rooms'), onClick: onBack }} cur="front" end={<span className="meta">{room.code}</span>} />
    <section className="head"><div className="kicker">{t('rooms.title')}</div><h1 className="hed hed--1">{room.name}</h1>
      <p className="meta" style={{ marginTop: 8 }}>{t('rooms.invite')}: <button className="linklike" onClick={() => { navigator.clipboard?.writeText(invite); }}>{invite}</button></p></section>
    {err && <p className="note">{err}</p>}
    {r && <div className="cols cols--2">
      <main>
        <Flag title={t('rooms.rounds')} aside={r.rounds} />
        {Array.from({ length: r.rounds }, (_, k) => {
          const opens = r.created + k * 864e5, closes = opens + r.roundHours * 3600e3, res = me?.results[k];
          const state = res ? 'played' : r.now < opens ? 'soon' : r.now > closes ? 'closed' : 'open';
          return <div key={k} className="live-call"><div><div className="live-call__n">{t('rooms.round', { n: k + 1 })}</div><span className="meta">{state === 'soon' ? t('rooms.opens', { t: fmtDate(opens, t.lang) }) : state === 'closed' ? t('rooms.closed') : state === 'played' ? t('rooms.played', { p: num(res!.score) }) : fmtDate(opens, t.lang)}</span></div>
            {state === 'open' ? <button className="up-btn up-btn--hot" onClick={() => chrome.go({ n: 'room', room: { code: room.code, pid: room.pid, sec: room.sec, round: k }, key: Date.now() })}>{t('rooms.play', { n: k + 1 })}</button> : state === 'played' ? <button className="up-btn" onClick={() => chrome.go({ n: 'room', room: { code: room.code, pid: room.pid, sec: room.sec, round: k }, key: Date.now() })}>{t('daily.read')}</button> : null}</div>;
        })}
      </main>
      <aside>
        <Flag title={t('rooms.standings')} />
        <table className="table"><thead><tr><th className="l">#</th><th className="l">{t('league.reporter')}</th><th>{t('rooms.rounds')}</th><th>{t('league.pts')}</th></tr></thead>
          <tbody>{standings.map((p, k) => <tr key={p.pid} className={p.pid === room.pid ? 'is-you' : ''}><td className="l"><span className="cond">{k + 1}</span></td><td className="l">{p.nick}</td><td>{p.n}</td><td><b>{num(p.total)}</b></td></tr>)}</tbody></table>
      </aside>
    </div>}
  </div>;
}
