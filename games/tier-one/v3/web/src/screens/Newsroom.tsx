// The newsroom (GOTY.md §7.3): up to 20 reporters under one masthead. Everyone's league week (Daily tier points +
// Wire points, scored on the server) adds up to the newsroom's weekly total, and newsrooms rank against each other.
// The masthead carries cosmetic slots from the Pass (frame, ink, flair), set by the editor (the founder).
import { useEffect, useState, type CSSProperties } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { v3 } from '../lib/api';
import { sfx, buzz } from '../lib/sfx';
import { cosmetic, ownedItems, frameCSS, type CosKind } from '../lib/season';
import { Icon, GBtn, TopBar } from '../ui/game';
import { Avatar } from '../ui/screenbits';
import { Byline, Flair, Handle } from '../ui/social';
import { identity, syncNewsroom, newsroomUrl, type Newsroom, type NewsroomTop } from '../lib/social';
import { Empty, Picks } from '../ui/bits';
import type { Chrome } from '../App';

const sx = (i: number): CSSProperties => ({ ['--i' as string]: i });
type Data = { newsroom: Newsroom | null; top: NewsroomTop[] };

export function NewsroomScreen({ code, ...chrome }: Chrome & { code?: string }) {
  const t = useT(); const s = useSave();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [motto, setMotto] = useState('');
  const [joinCode, setJoin] = useState(code || '');
  const [nick, setNick] = useState(s.nick);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const saveNick = () => { if (nick.trim()) update((x) => { x.nick = nick.trim().slice(0, 16); }); return nick.trim(); };
  const apply = (r: { ok: boolean; error?: string } & Partial<Data>) => {
    if (!r.ok) { setErr(t.or('so.nr.errors.' + r.error, 'err.generic')); return false; }
    setErr(''); setD({ newsroom: r.newsroom || null, top: r.top || [] }); syncNewsroom(r.newsroom || null); return true;
  };
  const load = async () => apply(await v3<Data>('newsroom.get', { ...identity(), code: undefined }));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const create = async () => {
    const n = saveNick(); if (!n) { setErr(t('so.nr.errors.nick')); return; }
    setBusy(true); const ok = apply(await v3<Data>('newsroom.create', { ...identity(), nick: n, name, motto })); setBusy(false);
    if (ok) { sfx('fanfare'); buzz([20, 40, 20]); }
  };
  const join = async () => {
    const n = saveNick(); if (!n) { setErr(t('so.nr.errors.nick')); return; }
    setBusy(true); const ok = apply(await v3<Data>('newsroom.join', { ...identity(), nick: n, code: joinCode.trim().toUpperCase() })); setBusy(false);
    if (ok) { sfx('open'); buzz(15); }
  };
  const leave = async () => {
    setBusy(true); const r = await v3('newsroom.leave', { dev: s.dev, code: d?.newsroom?.code }); setBusy(false); setLeaving(false);
    if (r.ok) { sfx('shred'); syncNewsroom(null); load(); } else setErr(t.or('so.nr.errors.' + r.error, 'err.generic'));
  };
  const nr = d?.newsroom || null;
  const wantsJoin = !!code && (!nr || nr.code !== code);
  const copy = () => { if (!nr) return; navigator.clipboard?.writeText(newsroomUrl(nr.code)); sfx('ui.pop'); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  return <div className="g-screen rooms3 pressbox so-nr">
    <TopBar back={{ label: t('so.tabs.rooms'), onClick: () => chrome.go({ n: 'rooms' }) }} onMenu={chrome.openSettings} />
    <div className="stagger g-stack">
      {nr ? <>
        <Masthead nr={nr} style={sx(0)} />
        <div className="so-nr__acts" style={sx(1)}>
          <button className="g-btn g-btn--sm g-btn--rooms" onClick={copy}><Icon n={copied ? 'check' : 'share'} size={18} />{copied ? t('so.nr.copied') : t('so.nr.invite')}</button>
          <span className="g-mono so-nr__n">{t('so.nr.members', { n: nr.members.length, m: nr.max })}</span>
          {!leaving ? <button className="cn-link" onClick={() => { sfx('ui.tap'); setLeaving(true); }}>{t('so.nr.leave')}</button>
            : <span className="so-nr__sure"><span>{t('so.nr.leaveSure', { name: nr.name })}</span><button className="g-btn g-btn--sm g-btn--dark" disabled={busy} onClick={leave}>{t('so.nr.leaveYes')}</button><button className="cn-link" onClick={() => setLeaving(false)}>{t('common.cancel')}</button></span>}
        </div>
        {err && <p className="g-err" role="alert">{err}</p>}
        <div className="pb-room__cols pb-room__cols--2">
          <section style={sx(2)}>
            <div className="g-sec"><h2>{t('so.nr.table')}</h2><span className="g-mono">{t('so.nr.weekLine', { p: num(nr.total), r: nr.rank })}</span></div>
            <div className="ltable ltable--league ltable--nr g-card">
              <div className="ltable__h g-mono"><span>#</span><span>{t('league.reporter')}</span><span>{t('so.nr.daily')}</span><span>{t('so.nr.wire')}</span><span>{t('so.nr.pts')}</span></div>
              {nr.members.map((m, k) => <div key={m.pub} className={'lrow' + (m.me ? ' is-me' : '') + (k === 0 && m.pts > 0 ? ' is-top' : '')}>
                <span className="lrow__n g-num">{k === 0 && m.pts > 0 ? <Icon n="crown" size={18} /> : k + 1}</span>
                <span className="lrow__who"><Byline who={m} me={m.me} size={28} />{m.host && <small className="so-host g-mono">{t('so.nr.host')}</small>}</span>
                <span className="lrow__x">{m.daily}</span><span className="lrow__x">{Math.round(m.wire)}</span><b className="lrow__p g-num">{num(m.pts)}</b>
              </div>)}
              <div className="lrow lrow--sum"><span /><span className="lrow__who"><b>{t('so.nr.combined')}</b></span><span /><span /><b className="lrow__p g-num">{num(nr.total)}</b></div>
            </div>
            {nr.lastRank && nr.lastTotal > 0 && <p className="g-fine g-mono">{t('so.nr.lastLine', { name: nr.name, r: nr.lastRank, p: num(nr.lastTotal) })}</p>}
            <p className="g-fine g-mono">{t('so.nr.fair')}</p>
          </section>
          <section style={sx(3)}>
            {nr.isHost && <MastheadEditor nr={nr} onSaved={apply} />}
            <TopList top={d!.top} mine={nr.code} />
          </section>
        </div>
      </> : <>
        <section className="g-hero g-hero--rooms" style={sx(0)}>
          <span className="g-hero__art" aria-hidden="true"><Icon n="news" /></span>
          <span className="g-mono g-hero__k">{t('so.nr.k')}</span>
          <h1 className="g-hero__t">{t('so.nr.hed')}</h1>
          <p className="g-hero__s">{t('so.nr.sub')}</p>
          <label className="byline"><Avatar name={nick || '?'} size={40} me /><span className="byline__f"><small className="g-mono">{t('g.rooms.byline')}</small><input value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} onBlur={saveNick} aria-label={t('common.nick')} /></span><Icon n="story" size={16} /></label>
        </section>
        {!d && !err && <p className="g-empty">{t('common.loading')}</p>}
        <div className="rooms3__two" style={sx(1)}>
          <form className={'rcard rcard--join g-card' + (wantsJoin ? ' is-hot' : '')} onSubmit={(e) => { e.preventDefault(); if (joinCode.trim().length >= 4 && !busy) join(); }}>
            <span className="rcard__ic"><Icon n="ticket" /></span>
            <h2 className="g-h2">{t('so.nr.join')}</h2>
            <p className="g-sub">{t('so.nr.joinSub')}</p>
            <input className="codebox" value={joinCode} onChange={(e) => setJoin(e.target.value.toUpperCase())} placeholder="ABCDEF" maxLength={8} aria-label={t('so.nr.code')} autoCapitalize="characters" spellCheck={false} />
            <button type="submit" className="g-btn g-btn--rooms" disabled={busy || joinCode.trim().length < 4} onClick={() => sfx('ui.tap')}><Icon n="arrow" size={22} />{t('rooms.joinBtn')}</button>
          </form>
          <section className="rcard g-card g-card--desk">
            <span className="rcard__ic rcard__ic--desk"><Icon n="star" /></span>
            <h2 className="g-h2">{t('so.nr.create')}</h2>
            <p className="g-sub">{t('so.nr.createSub')}</p>
            <input className="g-input" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} placeholder={t('so.nr.name')} aria-label={t('so.nr.name')} />
            <input className="g-input" value={motto} maxLength={60} onChange={(e) => setMotto(e.target.value)} placeholder={t('so.nr.mottoPh')} aria-label={t('so.nr.motto')} />
            <GBtn kind="gold" disabled={busy || !name.trim()} onClick={create} sound="open"><Icon n="news" size={22} />{t('so.nr.create')}</GBtn>
          </section>
        </div>
        {err && <p className="g-err" role="alert"><Icon n="x" size={16} />{err}</p>}
        {d && <div style={sx(2)}><TopList top={d.top} /></div>}
        <p className="g-fine g-mono" style={sx(3)}>{t('so.nr.fair')}</p>
      </>}
    </div>
  </div>;
}

/** The masthead: the newsroom's name set in the display face, with the equipped frame, ink and flair. */
function Masthead({ nr, style }: { nr: Newsroom; style?: CSSProperties }) {
  const t = useT();
  const frame = cosmetic(nr.masthead.frame), ink = cosmetic(nr.masthead.ink);
  return <section className="so-mast g-card" style={{ ...frameCSS(frame && frame.kind === 'frame' ? frame : null), ...style }} aria-label={t('so.nr.masthead')}>
    <span className="so-mast__rule" aria-hidden="true" />
    <span className="g-mono so-mast__k">{t('so.nr.k')} · {t('so.box.week', { w: nr.week.split('-W')[1] })}</span>
    <h1 className="so-mast__t" style={ink && ink.kind === 'ink' ? { color: ink.c } : undefined}><Handle>{nr.name}</Handle><Flair id={nr.masthead.flair} size={26} /></h1>
    {nr.motto && <p className="so-mast__m" dir="auto">{nr.motto}</p>}
    <span className="so-mast__rule so-mast__rule--b" aria-hidden="true" />
    <div className="so-mast__rank">
      <span><small className="g-mono">{t('so.nr.rank')}</small><b className="g-num">{t('so.nr.rankN', { n: nr.rank })}</b></span>
      <span><small className="g-mono">{t('so.nr.table')}</small><b className="g-num">{num(nr.total)}</b></span>
      <span><small className="g-mono">{t('so.nr.last')}</small><b className="g-num">{nr.lastRank ? t('so.nr.rankN', { n: nr.lastRank }) + ' · ' + num(nr.lastTotal) : '—'}</b></span>
    </div>
  </section>;
}
function MastheadEditor({ nr, onSaved }: { nr: Newsroom; onSaved: (r: { ok: boolean; error?: string } & Partial<Data>) => boolean }) {
  const t = useT(); const s = useSave();
  const [m, setM] = useState({ ...nr.masthead });
  const [motto, setMotto] = useState(nr.motto);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const kinds: CosKind[] = ['frame', 'ink', 'flair'];
  const save = async () => { setBusy(true); const ok = onSaved(await v3<Data>('newsroom.masthead', { dev: s.dev, code: nr.code, masthead: m, motto })); setBusy(false); if (ok) { sfx('stamp.done'); setMsg(t('so.nr.saved')); setTimeout(() => setMsg(''), 1800); } };
  return <section className="g-card so-mastedit">
    <div className="g-sec" style={{ margin: '0 0 6px' }}><h2 style={{ color: 'inherit' }}>{t('so.nr.masthead')}</h2><span className="g-mono">{t('so.nr.host')}</span></div>
    <p className="g-sub">{t('so.nr.mastheadSub')}</p>
    <div className="so-mastedit__grid">
      {kinds.map((k) => <Picks key={k} label={t('so.nr.' + k)} value={m[k as keyof typeof m] || ''} onChange={(v) => setM({ ...m, [k]: v })}
        options={[{ v: '', label: t('so.nr.standard') }, ...ownedItems(s, k).map((c) => ({ v: c.id, label: t(c.nameKey, c.nameVars) + (c.g ? ' ' + c.g : '') }))]} />)}
      <label className="so-mastedit__motto"><small className="g-mono">{t('so.nr.motto')}</small><input className="g-input" value={motto} maxLength={60} onChange={(e) => setMotto(e.target.value)} placeholder={t('so.nr.mottoPh')} /></label>
    </div>
    <div className="so-mastedit__acts"><GBtn kind="gold" loading={busy} onClick={save}><Icon n="check" size={18} />{t('so.nr.save')}</GBtn>{msg && <span className="g-mono" role="status">{msg}</span>}</div>
  </section>;
}
function TopList({ top, mine }: { top: NewsroomTop[]; mine?: string }) {
  const t = useT();
  return <>
    <div className="g-sec"><h2>{t('so.nr.top')}</h2><span className="g-mono">{top.length}</span></div>
    {top.length ? <div className="ltable g-card ltable--top">
      {top.map((x, k) => <div key={x.code} className={'lrow' + (x.code === mine ? ' is-me' : '') + (k === 0 ? ' is-top' : '')}>
        <span className="lrow__n g-num">{k === 0 ? <Icon n="crown" size={18} /> : k + 1}</span>
        <span className="lrow__who"><b><Handle>{x.name}</Handle></b></span>
        <span className="lrow__x">{x.n}</span><b className="lrow__p g-num">{num(x.pts)}</b>
      </div>)}
    </div> : <Empty card icon="trophy" title={t('so.nr.topNone')} />}
  </>;
}
