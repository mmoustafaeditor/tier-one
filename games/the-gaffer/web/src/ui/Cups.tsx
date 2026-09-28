// Cup brackets: your country's cup and every continental cup, round by round, with penalties shown.
import { useState } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Career } from '../model/types';
import type { World } from '../sim/world';
import { cupRun, cupWinner, groupTable } from '../sim/cups';
import { Kit } from '../components/Kit';
import { Empty } from './parts';

export function Cups({ world, career, lang, t }: { world: World; career: Career; lang: Lang; t: Strings }) {
  const country = world.leagues.find((l) => l.id === world.clubs.find((x) => x.id === career.clubId)!.leagueId)!.country;
  const cups = Object.values(career.cups).filter((c) => c.kind === 'continental' || c.id === `${country.toLowerCase()}_cup`)
    .sort((a, b) => (cupRun(b, career.clubId) ? 1 : 0) - (cupRun(a, career.clubId) ? 1 : 0) || (a.kind === 'national' ? -1 : 1));
  const [id, setId] = useState(cups[0]?.id ?? '');
  const cup = career.cups[id];
  if (!cup) return <Empty text={t.noGames} />;
  const club = (cid: string) => world.clubs.find((x) => x.id === cid)!;
  const winner = cupWinner(cup);
  return (
    <>
      <div className="g-chips" style={{ marginBottom: 'var(--s3)' }}>
        {cups.map((c) => <button key={c.id} className={`chip g-toggle${c.id === id ? ' on' : ''}`} onClick={() => setId(c.id)}>{c.name[lang]}</button>)}
      </div>
      {winner && (
        <div className="banner" style={{ marginBottom: 'var(--s3)' }}>
          <span className="bic">🏆</span><div><b>{club(winner).name[lang]}</b></div>
        </div>
      )}
      {cup.groups && cup.ties.length > 0 && <div className="sechead"><span className="over">{t.knockouts}</span></div>}
      {[...cup.ties.keys()].reverse().map((k) => (
        <div key={k} style={{ marginBottom: 'var(--s4)' }}>
          <div className="sechead" style={{ marginTop: 0 }}><span className="over">{t.roundName(k, cup.days.length)} · {t.matchday(cup.days[k] + 1)}</span></div>
          <div className="list">
            {cup.ties[k].map((tie, i) => {
              const mine = tie[0] === career.clubId || tie[1] === career.clubId;
              if (!tie[1]) {
                return (
                  <div key={i} className={`g-res${mine ? ' me' : ''}`}>
                    <span className="h">{club(tie[0]).name[lang]}<Kit colors={club(tie[0]).colors} size="xs" /></span>
                    <span className="sc muted" style={{ fontSize: 12 }}>{t.bye}</span>
                    <span className="a" />
                  </div>
                );
              }
              const played = tie[2] >= 0;
              return (
                <div key={i} className={`g-res${mine ? ' me' : ''}`}>
                  <span className={`h${tie[6] === tie[0] ? ' win' : ''}`}>{club(tie[0]).name[lang]}<Kit colors={club(tie[0]).colors} size="xs" /></span>
                  <span className="num sc">{played ? `${tie[2]}–${tie[3]}` : '–'}{played && tie[4] >= 0 && <small className="g-pens">{t.pens(tie[4], tie[5])}</small>}</span>
                  <span className={`a${tie[6] === tie[1] ? ' win' : ''}`}><Kit colors={club(tie[1]).colors} size="xs" />{club(tie[1]).name[lang]}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {cup.groups && (() => {
        const gr = cup.groups;
        const played = gr.games.filter((d) => d.some((x) => x[2] >= 0)).length;
        const mineG = gr.clubs.findIndex((g) => g.includes(career.clubId));
        const order = [...gr.clubs.keys()].sort((a, b) => (b === mineG ? 1 : 0) - (a === mineG ? 1 : 0));
        return (
          <>
            <div className="sechead"><span className="over">{t.groupStage} · {played}/6</span></div>
            {order.map((g) => (
              <div key={g} style={{ marginBottom: 'var(--s4)' }}>
                <div className="list g-table">
                  <div className="g-trow head">
                    <span className="g-rank">{'ABCDEFGH'[g]}</span><span className="g-tname">{t.groupT(g)}</span>
                    {t.cols.map((c) => <span key={c} className="g-tnum">{c}</span>)}
                  </div>
                  {groupTable(gr, g).map((r, i) => {
                    const c = club(r.clubId);
                    return (
                      <div key={r.clubId} className={`g-trow${i < 2 ? ' up' : ''}${r.clubId === career.clubId ? ' me' : ''}`}>
                        <span className="g-rank num">{i + 1}</span>
                        <span className="g-tname"><Kit colors={c.colors} size="xs" /><b>{c.name[lang]}</b></span>
                        {[r.p, r.w, r.d, r.l, r.gf - r.ga].map((v, k) => <span key={k} className="g-tnum num ltr">{k === 4 && v > 0 ? `+${v}` : v}</span>)}
                        <span className="g-tnum num"><b>{r.pts}</b></span>
                      </div>
                    );
                  })}
                </div>
                {g === mineG && (
                  <div className="list" style={{ marginTop: 'var(--s2)' }}>
                    {gr.games.flatMap((d, di) => d.filter((x) => x[0] === career.clubId || x[1] === career.clubId).map((x) => ({ x, di }))).map(({ x, di }) => (
                      <div key={di} className="g-res me">
                        <span className={`h${x[6] === x[0] ? ' win' : ''}`}>{club(x[0]).name[lang]}<Kit colors={club(x[0]).colors} size="xs" /></span>
                        {x[2] >= 0 ? <span className="num sc">{x[2]}–{x[3]}</span> : <span className="sc muted" style={{ fontSize: 12 }}>{t.matchday(gr.days[di] + 1)}</span>}
                        <span className={`a${x[6] === x[1] ? ' win' : ''}`}><Kit colors={club(x[1]).colors} size="xs" />{club(x[1]).name[lang]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        );
      })()}
    </>
  );
}
