// History and records: finished seasons, club records, the trophy cabinet and the academy graduates' story.
import { useState } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Career, RecordEntry, Records } from '../model/types';
import { money, type World } from '../sim/world';
import { avgRating } from '../sim/ratings';
import { Kit } from '../components/Kit';
import { AppBar } from './parts';

const ORDER: (keyof Records)[] = ['bestFinish', 'mostPoints', 'mostGoals', 'bigWin', 'unbeaten', 'scorer', 'bestBuy', 'bestSale'];

export function History({ world, career, lang, t, onBack }: { world: World; career: Career; lang: Lang; t: Strings; onBack: () => void }) {
  const [tab, setTab] = useState(0);
  const club = (id?: string) => (id ? world.clubs.find((c) => c.id === id) : undefined);
  const value = (k: keyof Records, e: RecordEntry) => {
    switch (k) {
      case 'bigWin': return `${e.s ?? ''} ${t.vs} ${club(e.club)?.name[lang] ?? ''}`;
      case 'bestFinish': return `${t.ordinal(e.v % 100)} · ${world.leagues.find((l) => l.id === e.s)?.name[lang] ?? ''}`;
      case 'scorer': return `${e.pn?.[lang] ?? ''} · ${e.v} ${t.goals.toLowerCase()}`;
      case 'bestBuy': case 'bestSale': return `${e.pn?.[lang] ?? ''} · ${money(e.v)}`;
      case 'unbeaten': return t.gamesN(e.v);
      default: return String(e.v);
    }
  };
  const recs = ORDER.filter((k) => career.records?.[k]);
  const trophies = [...(career.coach?.trophies ?? [])].reverse();
  const grads = (career.grads ?? []).map((id) => world.players.find((p) => p.id === id)).filter(Boolean);
  return (
    <>
      <AppBar back={onBack} backLabel={t.back} title={t.historyT} sub={career.managerName} />
      <div className="seg" style={{ margin: 'var(--s4) 0' }}>
        {t.histTabs.map((l, i) => <button key={l} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{l}</button>)}
      </div>

      {tab === 0 && (career.history.length === 0 ? <div className="card"><p className="muted" style={{ margin: 0 }}>{t.seasonsEmpty}</p></div> : (
        <div className="list">
          {[...career.history].reverse().map((h) => {
            const c = club(h.clubId)!;
            const lg = world.leagues.find((l) => l.id === h.leagueId)!;
            return (
              <div key={h.season} className="cell g-row">
                <Kit colors={c.colors} size="sm" />
                <span className="cmain"><b>{t.season(h.season)} · {t.ordinal(h.position)}</b><span>{c.name[lang]} · {lg.name[lang]} · {t.objective[h.objective]}</span></span>
                <span className={`tag ${h.met ? 'g-up' : 'g-down'}`}>{h.met ? t.met : t.missed}</span>
              </div>
            );
          })}
        </div>
      ))}

      {tab === 1 && (recs.length === 0 ? <div className="card"><p className="muted" style={{ margin: 0 }}>{t.recordsEmpty}</p></div> : (
        <div className="list">
          {recs.map((k) => {
            const e = career.records![k]!;
            return (
              <div key={k} className="cell g-row">
                <span className="cmain"><span>{t.recordNames[k]}</span><b>{value(k, e)}</b></span>
                <small className="muted num">{t.season(e.season)}</small>
              </div>
            );
          })}
        </div>
      ))}

      {tab === 2 && (trophies.length === 0 ? <div className="card"><p className="muted" style={{ margin: 0 }}>{t.trophiesEmpty}</p></div> : (
        <div className="g-cabinet">
          {trophies.map((tr, i) => {
            const c = club(tr.clubId);
            const name = tr.kind === 'league' || tr.kind === 'promotion'
              ? world.leagues.find((l) => l.id === tr.id)?.name[lang] ?? t.trophyKinds[tr.kind]
              : career.cups[tr.id]?.name[lang] ?? t.trophyKinds[tr.kind];
            return (
              <div key={i} className="card g-trophy">
                <span className="g-trophy-ico" aria-hidden="true">{tr.kind === 'promotion' ? '▲' : '🏆'}</span>
                <b>{name}</b>
                <small className="muted">{t.trophyKinds[tr.kind]} · {t.season(tr.season)}{c ? ` · ${c.name[lang]}` : ''}</small>
              </div>
            );
          })}
        </div>
      ))}

      {tab === 3 && (grads.length === 0 ? <div className="card"><p className="muted" style={{ margin: 0 }}>{t.gradsEmpty}</p></div> : (
        <div className="list">
          {grads.map((p) => {
            const st = career.stats[p!.id] ?? [0, 0, 0, 0, 0];
            const c = club(p!.clubId);
            const avg = avgRating(career.ratings?.[p!.id]);
            return (
              <div key={p!.id} className="cell g-row">
                {c ? <Kit colors={c.colors} size="sm" /> : <span className="tag">{p!.position}</span>}
                <span className="cmain"><b>{p!.name[lang]}</b><span>{p!.position} · {c?.name[lang] ?? t.freeAgents} · {t.gradLine(st[0], st[1])}{avg ? ` · ${avg.toFixed(1)}` : ''}</span></span>
                <span className="g-rating num">{p!.rating}</span>
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ height: 24 }} />
    </>
  );
}
