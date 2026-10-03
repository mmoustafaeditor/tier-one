// A new 2026/27 career: pick a league, pick a club, hear what the board expects, sign.
import { useMemo, useState } from 'react';
import type { Strings, UiLang } from '../i18n';
import { dataLang } from '../i18n';
import type { XStrings } from '../lang-v2';
import type { Career, Club, League } from '../model/types';
import { COUNTRIES } from '../data/leagues';
import { generateRealWorld } from '../sim/seed';
import { newCareer } from '../sim/season';
import { seedAcademies } from '../sim/youth';
import { FIRST_SEASON, clubsOf, money, objectiveOf, squadOf, strengthOf, type World } from '../sim/world';
import { Crest, I, Portrait } from './kit';
import { Panel } from './shell';
import { JB } from '../lang-job';
import { isDerby } from '../sim/rivalry';

const newSeed = () => (Math.random() * 2 ** 31) >>> 0; // the one allowed Math.random(): a new career's seed

export function NewCareer({ t, x, ui, slot, onBack, onStart }: { t: Strings; x: XStrings; ui: UiLang; slot: number; onBack: () => void; onStart: (w: World, c: Career) => void }) {
  const lang = dataLang(ui);
  const [seed] = useState(newSeed);
  const world = useMemo(() => generateRealWorld(seed), [seed]);
  const [league, setLeague] = useState<League | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('38');
  const [nation, setNation] = useState('');
  // "About the job": facts from the world (rank in the league by strength and budget, age, derbies, expiring deals).
  const jobFacts = (wd: World, club: Club): string[] => {
    const J = JB[ui];
    const lg = wd.clubs.filter((o) => o.leagueId === club.leagueId);
    const rank = (f: (o: Club) => number) => 1 + lg.filter((o) => f(o) > f(club)).length;
    const ageAvg = (id: string) => { const s = squadOf(wd, id); return s.reduce((a, p) => a + FIRST_SEASON - p.birthYear, 0) / Math.max(1, s.length); };
    const lgAge = lg.reduce((a, o) => a + ageAvg(o.id), 0) / Math.max(1, lg.length);
    const xi = [...squadOf(wd, club.id)].sort((a, b) => b.rating - a.rating).slice(0, 11);
    const derbies = wd.clubs.filter((o) => o.id !== club.id && isDerby(club.id, o.id)).map((o) => o.name[lang]);
    return [
      J.strength(rank((o) => strengthOf(wd, o.id)), lg.length),
      J.budget(rank((o) => o.budget), lg.length),
      J.age(ageAvg(club.id).toFixed(1), lgAge.toFixed(1)),
      ...(derbies.length ? [J.derby(derbies.join(', '))] : []),
      J.deals(xi.filter((p) => p.contractUntil <= FIRST_SEASON).length),
    ];
  };
  const P = x.pick;
  const ageOk = /^\d+$/.test(age) && +age >= 20 && +age <= 80;
  const covered = new Set(world.clubs.filter((c) => c.real).map((c) => c.leagueId));
  // A league with only some real clubs (Egypt, Saudi Arabia: the big six) says so, instead of "Real squads" for all (GF-011).
  const realIn = (lid: string) => world.clubs.filter((c) => c.real && c.leagueId === lid).length;
  const squadsLabel = (lid: string, n: number) => {
    const k = realIn(lid);
    return !k ? `${P.generated} · ${P.clubs(n)}` : k >= n ? `${P.covered} · ${P.clubs(n)}` : `${P.covered} · ${P.clubs(k)} · ${P.generated} · ${P.clubs(n - k)}`;
  };
  const leagues = [...world.leagues].sort((a, b) => Number(covered.has(b.id)) - Number(covered.has(a.id)) || a.tier - b.tier || COUNTRIES.findIndex((c) => c.code === a.country) - COUNTRIES.findIndex((c) => c.code === b.country));
  const search = q.trim().toLowerCase();
  const found = search.length >= 2 ? world.clubs.filter((c) => c.name.en.toLowerCase().includes(search) || c.name.ar.includes(q.trim())).slice(0, 12) : [];

  const sign = () => {
    if (!club || !ageOk) return;
    const lg = world.leagues.find((l) => l.id === club.leagueId)!;
    const c = newCareer(world, seed, club.id, name.trim() || P.nameDefault, { age: +age, nationality: nation || lg.country }, FIRST_SEASON);
    onStart(seedAcademies(world, c), c); // v2.6: every club starts with a lived-in academy
  };
  const clubCard = (c: Club) => {
    const best = [...squadOf(world, c.id)].sort((a, b) => b.rating - a.rating).slice(0, 2);
    return (
      <button key={c.id} className="clubcard" onClick={() => setClub(c)} aria-pressed={club?.id === c.id}>
        <Crest club={c} size={48} />
        <span className="grow"><b>{c.name[lang]}</b><span className="sub">{best.map((p) => p.short ?? p.name[lang]).join(' · ')}</span></span>
        <span className="clubnum"><b className="num">{strengthOf(world, c.id)}</b><small>{P.strength}</small></span>
      </button>
    );
  };

  return (
    <div className="shell solo">
      <main className="main"><div className="page sc-new">
        <header className="topbar on-ground">
          <div className="club">
            <button className="icon-btn" aria-label={x.back} onClick={() => (club ? setClub(null) : league ? setLeague(null) : onBack())}><I n="back" /></button>
            <div className="grow"><b>{x.title.newCareer}</b><small>{P.slotNote(slot)}</small></div>
          </div>
        </header>

        {!club && !league && (
          <>
            <section className="on-ground new-head"><h1 className="h-hero">{P.league}</h1><p className="lead">{P.leagueSub}</p></section>
            <input className="field" type="search" placeholder={P.search} aria-label={P.search} value={q} onChange={(e) => setQ(e.target.value)} />
            {found.length > 0 && <div className="clubgrid">{found.map(clubCard)}</div>}
            <div className="leaguegrid">
              {leagues.map((l, i) => {
                const country = COUNTRIES.find((c) => c.code === l.country);
                const top = clubsOf(world, l.id).slice(0, 5);
                return (
                  <button key={l.id} className="panel leaguecard" style={{ ['--i' as string]: i % 8 }} onClick={() => setLeague(l)}>
                    <span className="eyebrow">{country?.flag} {country?.name[lang]} · {P.tiers[l.tier - 1] ?? l.tier}</span>
                    <b className="h3">{l.name[lang]}</b>
                    <span className="crests">{top.map((c) => <Crest key={c.id} club={c} size={26} />)}</span>
                    <span className={`tag${covered.has(l.id) ? ' tag--good' : ''}`}>{squadsLabel(l.id, l.clubs)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {!club && league && (
          <>
            <section className="on-ground new-head"><span className="eyebrow">{league.name[lang]}</span><h1 className="h-hero">{P.club}</h1><p className="lead">{P.clubSub}</p></section>
            <div className="clubgrid">{clubsOf(world, league.id).map(clubCard)}</div>
          </>
        )}

        {club && (() => {
          const lg = world.leagues.find((l) => l.id === club.leagueId)!;
          const stars = [...squadOf(world, club.id)].sort((a, b) => b.rating - a.rating).slice(0, 3);
          return (
            <div className="confirm-grid">
              <section className="panel club-splash" style={{ ['--club-1' as string]: club.colors[0], ['--club-2' as string]: club.colors[1] }}>
                <Crest club={club} size={96} />
                <div><span className="eyebrow">{lg.name[lang]} · {x.seasonLabel(FIRST_SEASON)}</span><h1 className="h1">{club.name[lang]}</h1></div>
                <div className="splash-kits">{stars.map((p) => <div key={p.id} className="splash-kit"><Portrait p={p} club={club} /><b>{p.short ?? p.name[lang]}</b><span className="num">{p.rating}</span></div>)}</div>
              </section>
              <Panel i={1}>
                <span className="eyebrow">{P.expects}</span>
                <h2 className="h1 expects">{t.objective[objectiveOf(world, club)]}</h2>
                <div className="kpis3">
                  <div className="kpi"><span className="v">{strengthOf(world, club.id)}</span><span className="l">{P.strength}</span></div>
                  <div className="kpi"><span className="v">{money(club.budget)}</span><span className="l">{P.budget}</span></div>
                  <div className="kpi"><span className="v">{squadOf(world, club.id).length}</span><span className="l">{x.squad.title}</span></div>
                </div>
              </Panel>
              <Panel i={2} className="job">
                <span className="eyebrow">{JB[ui].title}</span>
                <ul className="job-list">{jobFacts(world, club).map((s) => <li key={s}>{s}</li>)}</ul>
              </Panel>
              <Panel i={3}>
                <span className="eyebrow">{P.you}</span>
                <label className="fieldl"><span>{P.name}</span><input className="field" dir="auto" maxLength={24} placeholder={P.nameDefault} value={name} onChange={(e) => setName(e.target.value)} /></label>
                <div className="two">
                  <label className="fieldl"><span>{P.age}</span><input className="field" type="number" inputMode="numeric" min={20} max={80} value={age} onChange={(e) => setAge(e.target.value)} /></label>
                  <label className="fieldl"><span>{P.nation}</span>
                    <select className="field" value={nation || lg.country} onChange={(e) => setNation(e.target.value)}>
                      {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name[lang]}</option>)}
                    </select>
                  </label>
                </div>
                {!ageOk && <p className="bad small" role="alert">{P.ageRule}</p>}
                <button className="btn btn--accent btn--block big" disabled={!ageOk} onClick={sign}>{P.sign}<I n="arrowr" size="sm" /></button>
                <p className="meta dim center">{P.signSub(club.name[lang])}</p>
              </Panel>
            </div>
          );
        })()}
      </div></main>
    </div>
  );
}
