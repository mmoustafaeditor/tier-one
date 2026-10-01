// Your career: the trophy lift when there's something to lift, season by season, records, badges, clubs asking.
import { COURSES, LICENCES, BADGE_MATCHES } from '../sim/coach';
import { Crest, I, Kpi } from './kit';
import { Panel, PanelHead } from './shell';
import { useGame, clubOf, cn, money } from './game';
import { dateOf, longDate } from '../sim/calendar';
import { legendsOf, onTheWay } from '../sim/legends';
import { CL } from '../lang-club-all';

export function CareerScreen() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const K = x.career;
  const k = c.coach;
  const trophies = k.trophies.filter((t) => t.kind !== 'promotion');
  const lastT = [...k.trophies].sort((a, b) => b.season - a.season)[0];
  const next = LICENCES[LICENCES.indexOf(k.licence) + 1];
  const recs = Object.entries(c.records ?? {}).filter(([, v]) => v);
  const L = CL[g.ui].legends, legends = legendsOf(c, c.clubId), way = onTheWay(w, c); // V2.8 the club's legends
  const liftClub = lastT ? clubOf(w, lastT.clubId) : g.club;
  const conf = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="sc-career">
      <div className="h-head on-ground">
        <span className="eyebrow">{c.managerName} · {K.tier(k.reputation)}</span>
        <h1 className="h-hero">{K.hero(trophies.length)}</h1>
        <div className="totals">
          <Kpi v={k.record[0]} l={K.totals.matches} />
          <Kpi v={k.record[1]} l={K.totals.wins} />
          <Kpi v={trophies.length} l={K.totals.trophies} />
          <Kpi v={Math.round(k.reputation)} l={K.totals.rep} />
        </div>
      </div>
      <div className="grid">
        <section className="g-lift lift" style={{ ['--club-1' as string]: liftClub?.colors[0], ['--club-2' as string]: liftClub?.colors[1] }}>
          <span className="rays" aria-hidden="true" />
          {lastT && <span className="conf" aria-hidden="true">{conf.map((i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.37) % 3.6}s`, background: i % 2 ? liftClub?.colors[0] : liftClub?.colors[1] }} />)}</span>}
          <svg className="cup" viewBox="0 0 120 160" aria-hidden="true">
            <defs><linearGradient id="silver" x1="0" x2="1"><stop offset="0" stopColor="#8FA7A1" /><stop offset=".45" stopColor="#F4FFFB" /><stop offset=".6" stopColor="#C9D8D4" /><stop offset="1" stopColor="#6E8781" /></linearGradient></defs>
            <path d="M30 10h60v28c0 22-13 38-30 42-17-4-30-20-30-42z" fill="url(#silver)" />
            <path d="M30 18H14c0 18 8 28 20 30M90 18h16c0 18-8 28-20 30" fill="none" stroke="url(#silver)" strokeWidth="6" />
            <rect x="52" y="80" width="16" height="30" fill="url(#silver)" /><rect x="34" y="110" width="52" height="12" rx="3" fill="url(#silver)" />
            <rect x="26" y="122" width="68" height="26" rx="3" fill={liftClub?.colors[0] ?? '#0E4F47'} /><rect x="36" y="130" width="48" height="10" rx="2" fill={liftClub?.colors[1] ?? '#7DEBCB'} opacity=".8" />
          </svg>
          <span className="shade" aria-hidden="true" />
          <span className="eyebrow">{lastT ? K.lift(x.seasonLabel(lastT.season), cn(liftClub, lang)) : K.badge}</span>
          <h2 className="h-hero">{lastT ? (lastT.kind === 'league' ? w.leagues.find((l) => l.id === lastT.id)?.name[lang] : c.cups[lastT.id]?.name[lang] ?? K.trophyKinds[lastT.kind]) : k.licence}</h2>
          <p>{lastT ? longDate(dateOf(lastT.season, 37), g.ui) : next ? K.badgeNext(next, BADGE_MATCHES[next]) : K.badgeTop}</p>
        </section>

        <Panel i={1} label={K.seasons}>
          <PanelHead title={K.seasons} />
          <div className="seasons">
            <div className="ssn now"><span className="yr">{x.seasonLabel(c.season)}</span><div className="who"><Crest club={g.club} size={30} /><div><b>{cn(g.club, lang)}</b><span>{K.now}</span></div></div><div className="fin" /></div>
            {[...c.history].reverse().map((h) => {
              const cl = clubOf(w, h.clubId);
              const won = k.trophies.some((t) => t.season === h.season && t.kind === 'league');
              return (
                <div key={h.season} className={`ssn${won ? ' won' : ''}`}>
                  <span className="yr">{x.seasonLabel(h.season)}</span>
                  <div className="who"><Crest club={cl} size={30} /><div><b>{cn(cl, lang)}</b><span>{g.t.objective[h.objective]} · {h.met ? K.objMet : K.objMissed}</span></div></div>
                  <div className="fin">{won && <I n="history" className="trophy" />}<span className="pos">{h.position}<sup>{x.place(h.position).replace(/\d+/, '')}</sup></span></div>
                </div>
              );
            })}
            {!c.history.length && <p className="small muted">{K.noSeasons}</p>}
          </div>
        </Panel>

        <Panel i={2} label={K.records}>
          <PanelHead title={K.records} />
          <div className="recs">
            {recs.map(([key, v]) => (
              <div key={key} className="rec"><span>{K.recs[key]}<small>{x.seasonLabel(v!.season)}{v!.pn ? ` · ${v!.pn[lang]}` : ''}</small></span><b className="ltr">{v!.s ?? (key === 'bestBuy' || key === 'bestSale' ? money(v!.v) : v!.v)}</b></div>
            ))}
            {!recs.length && <p className="small muted">{K.noSeasons}</p>}
          </div>
        </Panel>

        <Panel i={2} label={L.title}>
          <PanelHead title={L.title} right={<span className="eyebrow">{cn(g.club, lang)}</span>} />
          <div className="recs">
            {legends.map((l) => <div key={l.id} className="rec"><span>{l.pn[lang] || l.pn.en}<small>{L.line(l.apps, l.goals, l.trophies)}</small></span><b><I n="star" size="sm" /></b></div>)}
            {!legends.length && <p className="small muted">{L.none}</p>}
            {way.length > 0 && <p className="small"><b>{L.way}:</b> {way.map((y) => `${y.p.name[lang] || y.p.name.en} (${y.t[0]})`).join(', ')}</p>}
          </div>
        </Panel>

        <Panel className="g-leg" i={3} label={K.jobs}>
          <PanelHead title={K.jobs} right={<span className="eyebrow">{K.badge} · {k.licence}</span>} />
          <div className="rows">
            {c.jobs.map((id) => { const cl = clubOf(w, id); return (
              <div key={id} className="row">
                <Crest club={cl} size={36} /><span className="grow"><span className="name">{cn(cl, lang)}</span><span className="sub">{w.leagues.find((l) => l.id === cl?.leagueId)?.name[lang]}</span></span>
                <span className="bid-acts">
                  <button className="btn btn--primary btn--sm" onClick={() => void g.run({ type: 'job.accept', clubId: id }).then((r) => { if (r.ok) g.go({ s: 'today' }); })}>{K.take}</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'job.decline', clubId: id }, { toast: x.saved })}>{K.decline}</button>
                </span>
              </div>
            ); })}
            {!c.jobs.length && <p className="small muted">{K.noJobs}</p>}
          </div>
          <div className="section-h"><span className="eyebrow">{K.courses} · {K.wallet} <span className="ltr">{money(k.wallet)}</span></span></div>
          <div className="rows">
            {COURSES.map((co) => {
              const has = k.courses.includes(co.id);
              return (
                <div key={co.id} className="row">
                  <I n="grad" /><span className="grow"><span className="name">{g.t.courseNames[co.id]}</span></span>
                  {has ? <span className="tag tag--good"><I n="check" size="sm" />{K.done}</span> : <button className="btn btn--ghost btn--sm" disabled={k.wallet < co.cost} onClick={() => void g.run({ type: 'coach.course', id: co.id }, { toast: x.saved })}>{K.courseBuy(money(co.cost))}</button>}
                </div>
              );
            })}
          </div>
          {k.milestones.length > 0 && <><div className="section-h"><span className="eyebrow">{K.milestones}</span></div><div className="chips wrap">{k.milestones.map((m) => <span key={m} className="chip"><I n="star" size="sm" />{g.t.msNames[m] ?? m}</span>)}</div></>}
        </Panel>
      </div>
    </div>
  );
}
