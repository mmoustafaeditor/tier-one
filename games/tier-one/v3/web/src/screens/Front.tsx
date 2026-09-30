// The front page (look/mockups/home.html): the Daily, the lead story off the real wire, your calls, the league.
import { useT, fmtDate, num, resetAt } from '../lib/i18n';
import { useSave } from '../lib/save';
import { useWire, stageOf, gradeOf, bestTier, type Rumour } from '../lib/wireData';
import { useLeague, myRow } from '../lib/leagueData';
import { clubById, WORLD } from '../lib/engine';
import { ymdUTC } from '../lib/meta';
import { Portrait, Heat, Crest, Flag, Btn, Arr, Tally, Stamp } from '../ui/bits';
import { EditionBtn, SettingsBtn, DeskNav } from '../ui/chrome';
import type { Chrome } from '../App';

export const dailyNoToday = () => Math.floor((Date.parse(ymdUTC() + 'T00:00:00Z') - Date.parse('2026-09-01T00:00:00Z')) / 864e5) + 1;
export function rumourHed(t: ReturnType<typeof useT>, r: Rumour) {
  const l = r.linked[0];
  return t('wire.heds.' + stageOf(r), { c: l ? l.name : '', p: r.playerName });
}
const ORD = (n: number, lang: string) => (lang === 'en' ? n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th') : lang === 'es' ? n + 'º' : String(n));

export function Front(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const w = useWire();
  const lg = useLeague();
  const today = ymdUTC(), no = dailyNoToday();
  const played = s.daily[today];
  const live = s.last && new Date(s.last.at).toISOString().slice(0, 10) === today && !s.last.pub.over ? s.last.pub : null;
  const rs = (w.rumours || []).slice(0, 8);
  const lead = rs[0];
  const me = myRow(lg);
  const leagueTxt = lg && me >= 0 && lg.rows[me].pts > 0 ? ORD(me + 1, t.lang) : '—';
  const myCalls = (w.mine?.calls || []).slice(0, 3);
  const playerOf = (id: string) => WORLD.players.find((p) => p.id === id);

  const dailyCard = <section className="daily invert">
    <div className="daily__row"><span className="kicker" style={{ color: 'var(--accent)' }}>{t('front.dailyNo', { n: no })}</span><span className="meta">{t('daily.closes', { t: resetAt() })}</span></div>
    <h2 className="hed">{t('daily.tagline')}</h2>
    <div className="days" aria-label={t('common.dayOf', { n: live ? live.day : played ? 7 : 0, m: 7 })}>{Array.from({ length: 7 }, (_, k) => <i key={k} className={played || (live && k + 1 < live.day) ? 'on' : live && k + 1 === live.day ? 'now' : ''} />)}</div>
    {played ? <div className="daily__played">
      <Stamp kind={played.tier === 'T1' ? 'exclusive' : played.tier === 'SPIKED' ? 'dead' : 'done'} sound={false}>{t('tier.' + played.tier)}</Stamp>
      <span className="cond daily__pts">{num(played.total)}</span>
      <span className="meta">{played.rank ? t('daily.rank', { r: played.rank, n: played.players || 1 }) : ''}{played.par != null ? ' · ' + t('daily.par', { n: played.par }) : ''}</span>
    </div> : <div className="daily__row" style={{ marginTop: 8 }}><span className="meta">{live ? t('common.dayOf', { n: live.day, m: 7 }) : t('daily.startNote')}</span>{live && <span className="meta">{t('daily.contactsLeft', { n: live.left })}</span>}</div>}
    <Btn kind="accent" style={{ marginTop: 16 }} onClick={() => chrome.go({ n: 'daily' })}>{played ? t('daily.read') : live ? t('daily.resume') : t('daily.play')} <Arr /></Btn>
    <p className="note" style={{ marginTop: 10 }}>{played ? t('daily.played', { t: resetAt() }) : t('daily.fair')}</p>
  </section>;

  return <div className="page front">
    <header className="mast">
      <div className="mast__top"><span className="meta">{fmtDate(Date.now(), t.lang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span><span className="row" style={{ gap: 8 }}><EditionBtn edition={chrome.edition} /><SettingsBtn open={chrome.openSettings} /></span></div>
      <hr className="rule--double" />
      <div className="mast__band">
        <div className="mast__ears ear"><div className="ear__n num">{s.streak.n}</div><div className="ear__l">{t('front.streakN')}</div><div style={{ marginTop: 6 }}><Tally n={s.streak.n} label={t('front.tallyAria', { n: s.streak.n })} /></div></div>
        <h1 className="mast__title">Tier One</h1>
        <div className="mast__ears ear ear--end"><div className="ear__n num">{leagueTxt}</div><div className="ear__l">{lg ? t('league.divs.' + lg.div) + ' · ' + t('league.aside', { w: lg.week.split('-W')[1] }) : t('common.unranked')}</div></div>
      </div>
      <div className="mast__sub"><span className="meta">{t('common.no', { n: no })}</span><span className="meta"><b>{t('brand.edition')}</b></span><span className="meta">{w.rumours ? w.rumours.length + ' · ' + t('nav.wire') : ''}</span></div>
    </header>
    <DeskNav go={chrome.go} cur="front" />

    <div className="ticker home-ticker">
      <span className="ticker__label">{t('nav.wire')}</span>
      <div className="ticker__vp"><div className="ticker__track">
        {[0, 1].map((dup) => <span key={dup} className="ticker__set" aria-hidden={dup === 1 ? 'true' : undefined}>{rs.length ? rs.map((r) => <span key={r.id}><b>{r.playerName}</b> {rumourHed(t, r).replace(r.playerName, '').trim()} <span className={r.heat >= 70 ? 'up' : ''}>▲ {r.heat}</span></span>) : <span>{w.online ? t('front.wireEmpty') : t('front.wireOff')}</span>}</span>)}
      </div></div>
    </div>

    <div className="ear-row only-mobile">
      <div><span className="label">{t('front.streak')}</span><div className="row" style={{ marginTop: 4 }}><span className="cond" style={{ fontSize: 30 }}>{s.streak.n}</span><Tally n={s.streak.n} label={t('front.tallyAria', { n: s.streak.n })} /></div>{s.streak.grace > 0 && <span className="meta">{t('front.grace', { n: s.streak.grace })}</span>}</div>
      <div><span className="label">{t('front.league')}</span><div className="row row--base" style={{ marginTop: 4 }}><span className="cond" style={{ fontSize: 30 }}>{leagueTxt}</span><span className="meta">{lg ? t('league.divs.' + lg.div) : t('common.unranked')}</span></div></div>
    </div>

    <div className="cols cols--3 front-cols">
      <main className="col-main">
        <div className="only-mobile" style={{ marginTop: 16 }}>{dailyCard}</div>
        {lead ? <article className="lead">
          <div className="row row--between"><span className="kicker">{t('front.lead')} · {t('nav.wire')}</span><span className="meta">{t('wire.window', { w: lead.window })}</span></div>
          <div className="lead__art">
            <Portrait club={clubById(lead.currentClubId)} no={playerOf(lead.playerId)?.no || ''} variant="wide" who={lead.playerId} />
            <div className="lead__heat"><Heat v={lead.heat} label={t('front.heat')} /></div>
          </div>
          <h2 className="hed hed--hero">{rumourHed(t, lead)}</h2>
          {lead.fact && t.lang === 'en' && <p className="dek">{lead.fact}</p>}
          <div className="byline"><div className="route route--short"><Crest club={clubById(lead.currentClubId)} size={24} /><span className="route__arrow" />{lead.linked.slice(0, 3).map((l, k) => <Crest key={k} club={l.clubId ? clubById(l.clubId) : undefined} size={24} />)}</div>
            <span className="meta dot-sep"><span>{lead.outlets.length} {t('wire.outlets').toLowerCase()}</span><span>{t('wire.grade')} {gradeOf(bestTier(lead))}</span></span></div>
          <Btn kind="primary" style={{ marginTop: 16 }} onClick={() => chrome.go({ n: 'wire', rid: lead.id })}>{t('front.openFile')} <Arr /></Btn>
        </article> : <article className="lead"><div className="kicker">{t('front.lead')}</div><h2 className="hed hed--hero" style={{ marginTop: 14 }}>{t('daily.hed')}</h2><p className="dek">{w.online ? t('front.wireEmpty') : t('front.wireOff')}</p></article>}

        {rs.length > 1 && <><Flag title={t('front.moreWire')} aside={t('front.heat')} />
          <ol>{rs.slice(1, 6).map((r, k) => <li key={r.id} className="item" onClick={() => chrome.go({ n: 'wire', rid: r.id })} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && chrome.go({ n: 'wire', rid: r.id })}>
            <span className="item__n">{k + 2}</span>
            <div><h3 className="item__hed">{rumourHed(t, r)}</h3><div className="item__meta"><span className={'grade grade--' + gradeOf(bestTier(r)).toLowerCase()}>{gradeOf(bestTier(r))}</span><span className="meta">{r.outlets[0]?.name || ''} · {r.window}</span></div></div>
            <Heat v={r.heat} />
          </li>)}</ol></>}
      </main>

      <aside className="col-left">
        <Flag tight title={t('front.yourCalls')} aside={t('front.live', { n: (w.mine?.calls || []).filter((c) => !c.done).length })} />
        {myCalls.length ? myCalls.map((c) => <div key={c.rid} className="call" onClick={() => chrome.go({ n: 'wire', rid: c.rid })}>
          <div><div className="call__h">{c.player}</div><div className="meta" style={{ marginTop: 4 }}>{(c.yes ? t('wire.yesS') : t('wire.noS'))} · {t('str.' + ['talks', 'advanced', 'confirmed'][c.s - 1])} · {Math.round(c.m * 100)}%</div></div>
          <div style={{ textAlign: 'end' }}>{c.done ? <><Stamp kind={c.right ? 'done' : 'dead'} size="sm" sound={false}>{c.right ? t('wire.right') : t('wire.wrong')}</Stamp><div className={'call__pts' + ((c.pts || 0) < 0 ? ' accent' : ' win')}>{num(Math.round(c.pts || 0), true)}</div></> : <span className="meta">{t('wire.paper', { n: num(Math.round(c.paper || 0), true) })}</span>}</div>
        </div>) : <p className="note" style={{ marginTop: 8 }}>{t('front.noCalls')}</p>}
        <div className="only-desk"><LeagueMini chrome={chrome} /></div>
      </aside>

      <aside className="col-right">
        <div className="only-desk">{dailyCard}</div>
        <div className="only-mobile"><LeagueMini chrome={chrome} /></div>
        <Flag title={t('front.alsoFlag')} />
        <button className="item item--link" onClick={() => chrome.go({ n: 'practice' })}><span className="item__n">P</span><div><h3 className="item__hed">{t('nav.practice')}</h3><p className="note">{t('front.practiceD')}</p></div><Arr /></button>
        <button className="item item--link" onClick={() => chrome.go({ n: 'desk' })}><span className="item__n">C</span><div><h3 className="item__hed">{t('nav.desk')}</h3><p className="note">{s.career ? t('career.ranks.' + s.career.rank) + ' · ' + t('career.windows') + ' ' + s.career.windows : t('front.careerD')}</p></div><Arr /></button>
        <button className="item item--link" onClick={() => chrome.go({ n: 'rooms' })}><span className="item__n">R</span><div><h3 className="item__hed">{t('nav.rooms')}</h3><p className="note">{t('front.roomsD')}</p></div><Arr /></button>
        <button className="item item--link" onClick={() => chrome.go({ n: 'howto' })}><span className="item__n">?</span><div><h3 className="item__hed">{t('nav.howto')}</h3><p className="note">{t('howto.dek')}</p></div><Arr /></button>
      </aside>
    </div>
  </div>;
}

export function LeagueMini({ chrome }: { chrome: Chrome }) {
  const t = useT();
  const lg = useLeague();
  const me = myRow(lg);
  const rows = lg ? lg.rows.map((r, k) => ({ ...r, k })).filter((r) => Math.abs(r.k - Math.max(0, me)) <= 1 || (me < 0 && r.k < 3)) : [];
  return <div>
    <Flag title={t('league.title')} aside={lg ? t('league.divs.' + lg.div) : ''} />
    {rows.length ? rows.map((r) => <div key={r.k} className={'standing' + (r.me ? ' is-you' : '')}><span className="cond">{r.k + 1}</span><span>{r.me ? t('common.you') : r.nick}</span><span className="meta"><b>{Math.round(r.pts)}</b></span></div>) : <p className="note">{t('league.empty')}</p>}
    <button className="btn btn--quiet" style={{ marginTop: 6 }} onClick={() => chrome.go({ n: 'desk' })}>{t('nav.desk')} <Arr /></button>
  </div>;
}
