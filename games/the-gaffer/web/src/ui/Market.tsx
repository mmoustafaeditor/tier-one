// Transfer market: every player outside your club, with filters and sorts (FEATURES.md §8).
import { useMemo, useState } from 'react';
import type { Lang, Strings } from '../i18n';
import { FREE_AGENT, type Career, type Player } from '../model/types';
import { ageOf, money, type World } from '../sim/world';
import { askingPrices, clubOf } from '../sim/transfers';
import { AppBar, GROUP, PlayerRow } from './parts';
import { balanceOf } from '../sim/balance';
import { estimateAll, estimateMid, potentialMid } from '../sim/estimate';
import { loanOf } from '../sim/loans';

const LIMIT = 60;

export function Market({ world, career, lang, t, onBack, onPick, embedded = false }: {
  world: World; career: Career; lang: Lang; t: Strings; onBack?: () => void; onPick: (p: Player) => void; embedded?: boolean;
}) {
  const [group, setGroup] = useState(-1);
  const [league, setLeague] = useState('all');
  const [sort, setSort] = useState(0);
  const [freeOnly, setFreeOnly] = useState(false);
  const [affordable, setAffordable] = useState(false);
  const [q, setQ] = useState('');
  const budget = clubOf(world, career.clubId)!.budget;
  const leagueOf = useMemo(() => new Map(world.clubs.map((c) => [c.id, c.leagueId])), [world]);
  const mult = balanceOf(career).prices;
  const prices = useMemo(() => askingPrices(world, mult), [world, mult]);
  // What the scouts think, for every player at once: sorting by the true rating would leak it (audit Part C).
  const ests = useMemo(() => estimateAll(world, career, world.players), [world, career]);
  const est = (p: Player) => ests.get(p.id)!;
  const sorts: [string, (p: Player) => number][] = [
    [t.sorts[1], (p) => estimateMid(est(p))], [t.player.potential, (p) => potentialMid(est(p))], [t.sorts[2], (p) => p.marketValue],
    [t.sorts[3], (p) => p.wage], [t.sorts[4], (p) => -ageOf(p, career.season)],
  ];

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = world.players
      .filter((p) => p.clubId !== career.clubId && !loanOf(career, p.id))
      .filter((p) => (freeOnly ? p.clubId === FREE_AGENT : true))
      .filter((p) => group < 0 || GROUP[p.position] === group)
      .filter((p) => league === 'all' || leagueOf.get(p.clubId) === league)
      .filter((p) => !needle || p.name.en.toLowerCase().includes(needle) || p.name.ar.includes(needle))
      .filter((p) => !affordable || (prices.get(p.id) ?? 0) <= budget)
      .sort((a, b) => sorts[sort][1](b) - sorts[sort][1](a));
    return out.slice(0, LIMIT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, career.clubId, freeOnly, group, league, q, affordable, sort, budget, prices, ests]);

  const nameOf = (id: string) => (id === FREE_AGENT ? t.freeAgents : clubOf(world, id)?.name[lang] ?? '');

  return (
    <>
      {!embedded && <AppBar back={onBack} backLabel={t.back} title={t.market} sub={`${t.budget} ${money(budget)}`} />}
      {(career.rumours ?? []).length > 0 && (
        <>
          <div className="sechead"><span className="over">{t.rumoursT}</span></div>
          <div className="list">
            {(career.rumours ?? []).map((ru) => {
              const p = world.players.find((x) => x.id === ru.playerId);
              if (!p) return null;
              const e = est(p);
              return (
                <div key={ru.id} className="cell g-row">
                  <span className="cmain"><b>{p.name[lang]} · {e.exact ? p.rating : `${e.lo}–${e.hi}`}</b><span>{nameOf(ru.from)} → {nameOf(ru.to)} · {money(ru.fee)} · {t.chance(ru.chance)}</span></span>
                  <button className="btn sm primary" onClick={() => onPick(p)}>{t.hijack}</button>
                </div>
              );
            })}
          </div>
        </>
      )}
      <input className="g-input" style={{ width: '100%', marginTop: 'var(--s4)' }} placeholder="🔍" aria-label={t.findPlayers} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="seg" style={{ margin: 'var(--s3) 0' }}>
        {[t.all, ...t.groups].map((g, i) => (
          <button key={g} className={group === i - 1 ? 'on' : ''} onClick={() => setGroup(i - 1)}>{g}</button>
        ))}
      </div>
      <div className="g-filters">
        <select className="g-input g-select" value={league} onChange={(e) => setLeague(e.target.value)} aria-label={t.table}>
          <option value="all">{t.allLeagues}</option>
          {world.leagues.map((l) => <option key={l.id} value={l.id}>{l.name[lang]}</option>)}
        </select>
        <select className="g-input g-select" value={sort} onChange={(e) => setSort(Number(e.target.value))} aria-label={t.sorts[0]}>
          {sorts.map(([label], i) => <option key={label} value={i}>{label}</option>)}
        </select>
      </div>
      <div className="g-leagues" style={{ margin: 'var(--s3) 0' }}>
        <button className={`chip g-toggle${freeOnly ? ' on' : ''}`} onClick={() => setFreeOnly(!freeOnly)}>{t.freeAgents}</button>
        <button className={`chip g-toggle${affordable ? ' on' : ''}`} onClick={() => setAffordable(!affordable)}>{t.affordable}</button>
      </div>
      <p className="muted" style={{ margin: '0 0 var(--s3)' }}>{t.showingTop(LIMIT)}</p>
      <div className="list">
        {list.map((p) => {
          const ask = prices.get(p.id) ?? 0;
          const e = est(p);
          return (
            <PlayerRow key={p.id} p={p} lang={lang} t={t} season={career.season} onClick={() => onPick(p)}
              right={e.exact ? undefined : <span className="g-rating num ltr g-est" title={t.estimateT}>{e.lo}–{e.hi}</span>}
              sub={<>{p.position} · {ageOf(p, career.season)} · {nameOf(p.clubId)} · <span className="num ltr">{ask ? money(ask) : t.free}</span></>} />
          );
        })}
      </div>
      {!embedded && career.deals.length > 0 && (
        <>
          <div className="sechead"><span className="over">{t.deals}</span></div>
          <div className="list">
            {career.deals.slice(0, 12).map((d, i) => (
              <div key={i} className="cell g-row">
                <span className={`tag ${d.kind === 'in' || (d.kind === 'free' && d.to === career.clubId) ? 'g-up' : 'g-down'}`}>{t.dealKind[d.kind]}</span>
                <span className="cmain"><b>{d.name[lang]}</b><span>{nameOf(d.from)} → {nameOf(d.to)} · {t.season(d.season)}</span></span>
                <b className="num ltr">{d.fee ? money(d.fee) : t.free}</b>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
