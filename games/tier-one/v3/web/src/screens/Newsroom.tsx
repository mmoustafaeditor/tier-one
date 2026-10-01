// Crews (CONCEPT4 §2 Groups: "newsrooms as crews"): up to 20 players under one name. Everyone's week (Daily points +
// Market points, scored on the server by newsroom.*) adds up to the crew's total, and crews rank against each other.
// The panel lives in the Groups app's Crews tab (Rooms.tsx); this route ({ n: 'newsroom' }) shows it on its own for
// invite links (?newsroom=CODE).
import { useEffect, useState } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave } from '../lib/save';
import { v3 } from '../lib/api';
import { sfx, buzz } from '../lib/sfx';
import { TopBar, Icon } from '../ui/game';
import { Pop } from '../ui/juice';
import { Byline, Flair, Handle, ordinal } from '../ui/social';
import { identity, syncNewsroom, newsroomUrl, type Newsroom, type NewsroomTop } from '../lib/social';
import type { Chrome } from '../App';
import '../styles/social.css';

type Data = { newsroom: Newsroom | null; top: NewsroomTop[] };

export function NewsroomScreen({ code, ...chrome }: Chrome & { code?: string }) {
  const t = useT();
  return <div className="g-screen gp">
    <TopBar back={{ label: t('os.app.groups'), onClick: () => chrome.go({ n: 'rooms' }) }} title={t('md4.gp.tab.crews')} />
    <CrewPanel chrome={chrome} code={code} />
  </div>;
}

export function CrewPanel({ code }: { chrome?: Chrome; code?: string }) {
  const t = useT(); const s = useSave();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [motto, setMotto] = useState('');
  const [joinCode, setJoin] = useState(code || '');
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const apply = (r: { ok: boolean; error?: string } & Partial<Data>) => {
    if (!r.ok) { setErr(t.or('md4.gp.crew.err.' + r.error, 'err.generic')); return false; }
    setErr(''); setD({ newsroom: r.newsroom || null, top: r.top || [] }); syncNewsroom(r.newsroom || null); return true;
  };
  useEffect(() => { void (async () => apply(await v3<Data>('newsroom.get', { ...identity() })))(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const nick = () => (s.nick || '').trim();
  const create = async () => {
    if (!nick()) { setErr(t('md4.gp.err.nick')); return; }
    setBusy(true); const ok = apply(await v3<Data>('newsroom.create', { ...identity(), name, motto })); setBusy(false);
    if (ok) { sfx('fanfare'); buzz([20, 40, 20]); }
  };
  const join = async () => {
    if (!nick()) { setErr(t('md4.gp.err.nick')); return; }
    setBusy(true); const ok = apply(await v3<Data>('newsroom.join', { ...identity(), code: joinCode.trim().toUpperCase() })); setBusy(false);
    if (ok) { sfx('os.open'); buzz(15); }
  };
  const leave = async () => {
    setBusy(true); const r = await v3('newsroom.leave', { dev: s.dev, code: d?.newsroom?.code }); setBusy(false); setLeaving(false);
    if (r.ok) { sfx('os.close'); syncNewsroom(null); apply(await v3<Data>('newsroom.get', { ...identity() })); } else setErr(t.or('md4.gp.crew.err.' + r.error, 'err.generic'));
  };
  const nr = d?.newsroom || null;
  const copy = () => { if (!nr) return; navigator.clipboard?.writeText(newsroomUrl(nr.code)); sfx('ui.pop'); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  if (!d && !err) return <p className="gp-quiet">{t('md4.loading')}</p>;
  if (nr) return <>
    <section className="gp-crew">
      <p className="gp-crew__k">{t('md4.gp.crew.week', { w: nr.week.split('-W')[1] || '' })}</p>
      <h1 className="gp-crew__t"><Handle>{nr.name}</Handle><Flair id={nr.masthead.flair} size={24} /></h1>
      {nr.motto && <p className="gp-crew__m" dir="auto">{nr.motto}</p>}
      <div className="gp-crew__nums">
        <span><b>{ordinal(t, nr.rank)}</b><small>{t('md4.gp.crew.rank')}</small></span>
        <span><b>{num(nr.total)}</b><small>{t('md4.gp.crew.pts')}</small></span>
        <span><b>{nr.lastRank ? ordinal(t, nr.lastRank) : '–'}</b><small>{t('md4.gp.crew.last')}</small></span>
      </div>
      <div className="gp-acts">
        <Pop className="gp-btn" onTap={copy} sound={null}><Icon n={copied ? 'check' : 'share'} size={18} />{copied ? t('md4.gp.room.copied') : t('md4.gp.room.invite')}</Pop>
        <span className="gp-quiet">{t('md4.gp.crew.members', { n: nr.members.length, m: nr.max })}</span>
      </div>
    </section>
    <section className="gp-sec">
      <h2>{t('md4.gp.crew.table')}</h2>
      <ol className="gp-table">{nr.members.map((m, k) => <li key={m.pub} className={m.me ? 'is-me' : ''}>
        <span className="gp-table__r">{ordinal(t, k + 1)}</span>
        <Byline who={m} me={m.me} size={28} />
        <span className="gp-table__x">{t('md4.gp.crew.split', { d: m.daily, w: Math.round(m.wire) })}{m.host ? ' · ' + t('md4.gp.crew.founder') : ''}</span>
        <b className="gp-table__p">{num(m.pts)}</b>
      </li>)}</ol>
      <p className="gp-fine">{t('md4.gp.crew.how')}</p>
    </section>
    <TopList top={d!.top} mine={nr.code} />
    {err && <p className="gp-err" role="alert">{err}</p>}
    <div className="gp-sec">{!leaving ? <button type="button" className="gp-link" onClick={() => { sfx('ui.tap'); setLeaving(true); }}>{t('md4.gp.crew.leave')}</button>
      : <p className="gp-acts"><span>{t('md4.gp.crew.leaveQ', { name: nr.name })}</span><Pop className="gp-btn gp-btn--ghost" onTap={leave} disabled={busy}>{t('md4.gp.crew.leaveYes')}</Pop><button type="button" className="gp-link" onClick={() => setLeaving(false)}>{t('md4.gp.crew.stay')}</button></p>}</div>
  </>;
  return <>
    <section className="gp-card">
      <h2>{t('md4.gp.crew.hed')}</h2>
      <p>{t('md4.gp.crew.sub')}</p>
    </section>
    <form className="gp-card gp-join" onSubmit={(e) => { e.preventDefault(); if (joinCode.trim().length >= 4 && !busy) void join(); }}>
      <h2>{t('md4.gp.crew.joinT')}</h2>
      <div className="gp-join__row">
        <input className="gp-code" value={joinCode} onChange={(e) => setJoin(e.target.value.toUpperCase())} placeholder="ABCDEF" maxLength={8} aria-label={t('md4.gp.crew.code')} autoCapitalize="characters" spellCheck={false} />
        <button type="submit" className="gp-btn" disabled={busy || joinCode.trim().length < 4}>{t('md4.gp.room.join')}</button>
      </div>
    </form>
    <section className="gp-card">
      <h2>{t('md4.gp.crew.makeT')}</h2>
      <input className="gp-input" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} placeholder={t('md4.gp.crew.namePh')} aria-label={t('md4.gp.crew.name')} />
      <input className="gp-input" value={motto} maxLength={60} onChange={(e) => setMotto(e.target.value)} placeholder={t('md4.gp.crew.mottoPh')} aria-label={t('md4.gp.crew.motto')} />
      <Pop className="gp-btn gp-btn--wide" onTap={create} disabled={busy || !name.trim()} sound="os.open">{t('md4.gp.crew.make')}</Pop>
    </section>
    {err && <p className="gp-err" role="alert">{err}</p>}
    {d && <TopList top={d.top} />}
  </>;
}

function TopList({ top, mine }: { top: NewsroomTop[]; mine?: string }) {
  const t = useT();
  return <section className="gp-sec">
    <h2>{t('md4.gp.crew.top')}</h2>
    {top.length ? <ol className="gp-table">{top.map((x, k) => <li key={x.code} className={x.code === mine ? 'is-me' : ''}>
      <span className="gp-table__r">{ordinal(t, k + 1)}</span>
      <b className="gp-table__name"><Handle>{x.name}</Handle></b>
      <span className="gp-table__x">{t('md4.gp.crew.players', { n: x.n })}</span>
      <b className="gp-table__p">{num(x.pts)}</b>
    </li>)}</ol> : <p className="gp-quiet">{t('md4.gp.crew.topNone')}</p>}
  </section>;
}
