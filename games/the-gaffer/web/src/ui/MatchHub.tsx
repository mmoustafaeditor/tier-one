// Match tab: the next match (preview, radar, advice, XI, kick-off), and the competitions: table, results, cups, stats.
import { useState } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Career, Club, League, Player } from '../model/types';
import { playerOf, strengthOf, type World } from '../sim/world';
import { leaders, nextUserMatch, seasonOver, table, zones, type LiveMatch } from '../sim/season';
import { predict } from '../sim/match';
import { DEFAULT_TACTICS, FORMATIONS, fmt, xiFor } from '../sim/tactics';
import { avgRating } from '../sim/ratings';
import { makeReport } from '../sim/scouting';
import { delegated } from '../sim/staff';
import { Kit } from '../components/Kit';
import { AppBar, Empty, Icon } from './parts';
import { Radar } from './Radar';
import { ScoutPanel } from './Scouting';
import { Cups } from './Cups';
import { RewardedButton } from './Support';
import backIcon from '../../../../../design/assets/icons/ui/back.svg?raw';

export function MatchHub({ world, career, lang, t, myClub, myLeague, busy, tab, onTab, matchLabel, onPlay, onQuick, onResume, onTactics, onFinishSeason, onPlayer, onRankings, onChange, onToast }: {
  world: World; career: Career; lang: Lang; t: Strings; myClub: Club; myLeague: League; busy: boolean; tab: number; onTab: (i: number) => void;
  matchLabel: (m: LiveMatch) => string; onPlay: () => void; onQuick: () => void; onResume: () => void; onTactics: () => void; onFinishSeason: () => void;
  onPlayer: (p: Player) => void; onRankings: () => void; onChange: (w: World, c: Career, msg?: string) => void; onToast: (s: string) => void;
}) {
  const [resultsRound, setResultsRound] = useState<number | null>(null);
  const [lead, setLead] = useState(0);
  const club = (id: string) => world.clubs.find((x) => x.id === id)!;
  return (
    <>
      <AppBar title={t.match} sub={myLeague.name[lang]} />
      <div className="seg g-seg-wrap" style={{ margin: 'var(--s4) 0 var(--s3)' }}>
        {t.matchTabs.map((g, i) => <button key={g} className={tab === i ? 'on' : ''} onClick={() => onTab(i)}>{g}</button>)}
      </div>

      {tab === 0 && (career.live ? (
        <button className="btn primary" style={{ width: '100%', marginTop: 'var(--s3)' }} onClick={onResume}>{t.resumeMatch}</button>
      ) : (() => {
        if (career.sacked) return <Empty text={t.sackedBody} />;
        const m = nextUserMatch(world, career);
        if (!m) return seasonOver(career) ? <Empty text={t.seasonOver} /> : (
          <>
            <Empty text={t.leagueOver} />
            <button className="btn primary" style={{ width: '100%', marginTop: 'var(--s3)' }} disabled={busy} onClick={onFinishSeason}>{t.finishSeason}</button>
          </>
        );
        const [h, a] = [club(m.sides[0].clubId), club(m.sides[1].clubId)];
        const p = predict(m, (id) => playerOf(world, id)!);
        const pr = m.sides[0].clubId === myClub.id ? p : [p[2], p[1], p[0]];
        const { xi, replaced } = xiFor(world, career);
        const tac = career.tactics ?? DEFAULT_TACTICS;
        const slots = FORMATIONS[tac.formation].slots;
        const reported = !!career.scouted?.[m.key];
        return (
          <div className="g-matchcols">
            <div>
              <section className="card g-hero">
                <div className="over">{matchLabel(m)} · {h.id === myClub.id ? t.home : t.away}</div>
                <div className="g-vs lg">
                  <span><Kit colors={h.colors} size="lg" /><b>{h.name[lang]}</b><small className="num">{strengthOf(world, h.id)}</small></span>
                  <i>{t.vs}</i>
                  <span><Kit colors={a.colors} size="lg" /><b>{a.name[lang]}</b><small className="num">{strengthOf(world, a.id)}</small></span>
                </div>
                <div className="g-predbar" dir="ltr" style={{ marginTop: 'var(--s4)' }}>
                  <i className="w" style={{ width: `${pr[0] * 100}%` }} /><i className="d" style={{ width: `${pr[1] * 100}%` }} /><i className="l" style={{ width: `${pr[2] * 100}%` }} />
                </div>
                <div className="g-predlbl">
                  <span>{t.win} <b className="num">{Math.round(pr[0] * 100)}%</b></span>
                  <span>{t.draw} <b className="num">{Math.round(pr[1] * 100)}%</b></span>
                  <span>{t.loss} <b className="num">{Math.round(pr[2] * 100)}%</b></span>
                </div>
              </section>
              <div style={{ display: 'grid', gap: 'var(--s3)', margin: 'var(--s4) 0' }}>
                <button className={`btn primary${busy ? ' loading' : ''}`} disabled={busy} onClick={onPlay}>{t.watch}</button>
                <div className="g-twobtn">
                  <button className="btn" onClick={onTactics}>{t.tactics}</button>
                  <button className="btn" disabled={busy} onClick={onQuick}>{t.quickResult}</button>
                </div>
              </div>
              <div className="sechead"><span className="over">{t.radarT}</span></div>
              <Radar world={world} m={m} t={t} lang={lang} />
            </div>
            <div>
              <ScoutPanel world={world} career={career} m={m} lossChance={pr[2]} lang={lang} t={t} onChange={onChange} />
              {!reported && (
                <div style={{ display: 'grid', gap: 4, marginTop: 'var(--s2)' }}>
                  <RewardedButton t={t} name="scout-report" onFail={onToast} onReward={() => {
                    // A watched ad pays for the report: give the club the fee back after buying it.
                    const r = makeReport(world, career, m);
                    if (!r) return;
                    const fee = world.clubs.find((x) => x.id === career.clubId)!.budget - r.world.clubs.find((x) => x.id === career.clubId)!.budget;
                    const clubs = r.world.clubs.map((x) => (x.id === career.clubId ? { ...x, budget: x.budget + fee } : x));
                    const ledger = { ...r.career.ops.ledger, scouting: (r.career.ops.ledger.scouting ?? 0) + fee };
                    onChange({ ...r.world, clubs }, { ...r.career, ops: { ...r.career.ops, ledger } }, t.scoutT);
                  }} />
                </div>
              )}
              <div className="sechead"><span className="over">{t.yourXI} · {fmt(tac.formation)} · {t.mentalities[tac.mentality + 2]}{delegated(career, 'lineup') ? ` · ${t.staffNames.assistant}` : ''}</span></div>
              {replaced.length > 0 && <p className="g-bad" style={{ marginTop: 0 }}>{t.replacedN(replaced.map((x) => x.name[lang]).join('، '))}</p>}
              <div className="list g-xi">
                {xi.map((pl, i) => (
                  <button key={pl.id} className="cell" onClick={() => onPlayer(pl)}>
                    <span className="tag">{slots[i]?.pos}</span>
                    <span className="cmain"><b>{pl.name[lang]}</b><i className="g-fit" style={{ ['--f' as string]: `${pl.fitness}%` }} /></span>
                    <span className="g-rating num">{pl.rating}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })())}

      {tab === 1 && (() => {
        const rows = table(world, career, myLeague.id);
        const z = zones(world, myLeague.id);
        return (
          <>
            <div className="list g-table">
              <div className="g-trow head">
                <span className="g-rank">#</span><span className="g-tname" />
                {t.cols.map((c) => <span key={c} className="g-tnum">{c}</span>)}
              </div>
              {rows.map((r, i) => {
                const c = club(r.clubId);
                const zone = i < z.up ? 'up' : i < z.top ? 'top' : i >= rows.length - z.down ? 'down' : '';
                return (
                  <div key={r.clubId} className={`g-trow ${zone}${r.clubId === career.clubId ? ' me' : ''}`}>
                    <span className="g-rank num">{i + 1}</span>
                    <span className="g-tname"><Kit colors={c.colors} size="xs" /><b>{c.name[lang]}</b></span>
                    {[r.p, r.w, r.d, r.l, r.gf - r.ga].map((v, k) => <span key={k} className="g-tnum num ltr">{k === 4 && v > 0 ? `+${v}` : v}</span>)}
                    <span className="g-tnum num"><b>{r.pts}</b></span>
                  </div>
                );
              })}
            </div>
            <button className="btn ghost" style={{ width: '100%', marginTop: 'var(--s3)' }} onClick={onRankings}>{t.worldRankings} ›</button>
          </>
        );
      })()}

      {tab === 2 && (() => {
        const rounds = career.fixtures[myLeague.id];
        let lastPlayed = -1; // no findLastIndex: older Android WebViews lack it
        rounds.forEach((g, i) => { if (g.some((f) => f[2] >= 0)) lastPlayed = i; });
        if (lastPlayed < 0) return <Empty text={t.noGames} />;
        const ri = Math.min(resultsRound ?? lastPlayed, lastPlayed);
        return (
          <>
            <div className="g-roundnav">
              <button className="iconbtn" disabled={ri === 0} aria-label={t.back} onClick={() => setResultsRound(ri - 1)}><Icon svg={backIcon} /></button>
              <b>{t.matchday(ri + 1)}</b>
              <button className="iconbtn g-flip" disabled={ri >= lastPlayed} aria-label={t.done} onClick={() => setResultsRound(ri + 1)}><Icon svg={backIcon} /></button>
            </div>
            <div className="list">
              {rounds[ri].map((f) => (
                <div key={f[0]} className={`g-res${f[0] === career.clubId || f[1] === career.clubId ? ' me' : ''}`}>
                  <span className="h">{club(f[0]).name[lang]}<Kit colors={club(f[0]).colors} size="xs" /></span>
                  <span className="num sc">{f[2]}–{f[3]}</span>
                  <span className="a"><Kit colors={club(f[1]).colors} size="xs" />{club(f[1]).name[lang]}</span>
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {tab === 3 && <Cups world={world} career={career} lang={lang} t={t} />}

      {tab === 4 && (
        <>
          <div className="seg" style={{ marginBottom: 'var(--s3)' }}>
            {t.leaderTabs.map((g, i) => <button key={g} className={lead === i ? 'on' : ''} onClick={() => setLead(i)}>{g}</button>)}
          </div>
          {(() => {
            let list: { player: Player; value: string }[];
            if (lead < 2) list = leaders(world, career, myLeague.id, lead === 0 ? 1 : 2, 15).map((x) => ({ player: x.player, value: String(x.value) }));
            else {
              const inLeague = new Set(world.clubs.filter((x) => x.leagueId === myLeague.id).map((x) => x.id));
              const rounds = Math.max(1, (career.fixtures[myLeague.id] ?? []).filter((g) => g.some((f) => f[2] >= 0)).length);
              list = Object.entries(career.ratings ?? {})
                .map(([id, r]) => ({ player: playerOf(world, id)!, r }))
                .filter((x) => x.player && inLeague.has(x.player.clubId) && x.r[1] >= Math.max(1, Math.floor(rounds / 3)))
                .sort((a, b) => avgRating(b.r) - avgRating(a.r))
                .slice(0, 15)
                .map((x) => ({ player: x.player, value: avgRating(x.r).toFixed(2) }));
            }
            if (!list.length) return <Empty text={t.noGames} />;
            return (
              <div className="list">
                {list.map(({ player: p, value }, i) => {
                  const c = club(p.clubId);
                  return (
                    <button key={p.id} className={`cell${p.clubId === career.clubId ? ' g-mine' : ''}`} onClick={() => onPlayer(p)}>
                      <span className="g-rank num">{i + 1}</span>
                      <Kit colors={c.colors} size="sm" />
                      <span className="cmain"><b>{p.name[lang]}</b><span>{c.name[lang]} · {p.position}</span></span>
                      <span className="g-rating num">{value}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}
      <div style={{ height: 24 }} />
    </>
  );
}
