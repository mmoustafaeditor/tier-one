// Transfers tab: the window, the market, your shortlist, bids for your players, loans and the deals you've done.
import type { Lang, Strings } from '../i18n';
import { FREE_AGENT, type Career, type Player } from '../model/types';
import { money, type World } from '../sim/world';
import { askingPrice } from '../sim/transfers';
import { balanceOf } from '../sim/balance';
import { estimate } from '../sim/estimate';
import { isDeadlineDay, untilWindow, windowLeft, windowOf } from '../sim/windows';
import { loansIn, loansOut } from '../sim/loans';
import { delegated } from '../sim/staff';
import { Market } from './Market';
import { AppBar, Empty, Icon, PlayerRow } from './parts';
import { ICONS } from './icons';

export function WindowBanner({ career, t, compact = false }: { career: Career; t: Strings; compact?: boolean }) {
  const w = windowOf(career);
  if (!w) return compact ? null : (
    <div className="banner g-window shut"><span className="bic"><Icon svg={ICONS.calendar} /></span><div><b>{t.windowShutT(untilWindow(career))}</b><p>{t.windowClosedBid}</p></div></div>
  );
  const dd = isDeadlineDay(career);
  return (
    <div className={`banner g-window${dd ? ' dd' : ''}`}>
      <span className="bic"><Icon svg={dd ? ICONS.alert : ICONS.calendar} /></span>
      <div><b>{dd ? t.deadlineT : `${t.windowNames[w]} · ${t.windowOpenT(windowLeft(career))}`}</b>{dd && <p>{t.deadlineSub}</p>}</div>
    </div>
  );
}

export function Transfers({ world, career, lang, t, tab, onTab, onPick, onOffers }: {
  world: World; career: Career; lang: Lang; t: Strings; tab: number; onTab: (i: number) => void;
  onPick: (p: Player) => void; onOffers: () => void;
}) {
  const club = world.clubs.find((c) => c.id === career.clubId)!;
  const nameOf = (id: string) => (id === FREE_AGENT ? t.freeAgents : world.clubs.find((c) => c.id === id)?.name[lang] ?? '');
  const byId = new Map(world.players.map((p) => [p.id, p]));
  const shortlist = (career.shortlist ?? []).map((id) => byId.get(id)).filter((p): p is Player => !!p && p.clubId !== career.clubId);
  const counts = [0, shortlist.length, career.offers.length, loansIn(career).length + loansOut(career).length, 0];
  return (
    <>
      <AppBar title={t.transfersT} sub={`${t.budget} ${money(club.budget)}`} />
      <WindowBanner career={career} t={t} />
      <div className="seg g-seg-wrap" style={{ margin: 'var(--s3) 0' }}>
        {t.trTabs.map((l, i) => (
          <button key={l} className={tab === i ? 'on' : ''} onClick={() => onTab(i)}>{l}{counts[i] ? <span className="g-count num">{counts[i]}</span> : null}</button>
        ))}
      </div>

      {tab === 0 && <Market world={world} career={career} lang={lang} t={t} onPick={onPick} embedded />}

      {tab === 1 && (shortlist.length === 0
        ? <Empty text={t.shortlistEmpty} action={{ label: t.findPlayers, onClick: () => onTab(0) }} />
        : (
          <div className="list">
            {shortlist.map((p) => {
              const est = estimate(world, career, p);
              const ask = askingPrice(world, p, balanceOf(career).prices);
              return (
                <PlayerRow key={p.id} p={p} lang={lang} t={t} season={career.season} onClick={() => onPick(p)}
                  sub={<>{p.position} · {nameOf(p.clubId)} · <span className="num ltr">{ask ? money(ask) : t.free}</span></>}
                  right={<span className={`g-rating num ltr${est.exact ? '' : ' g-est'}`}>{est.exact ? p.rating : `${est.lo}–${est.hi}`}</span>} />
              );
            })}
          </div>
        ))}

      {tab === 2 && (career.offers.length === 0 ? <Empty text={t.offersEmpty} /> : (
        <>
          {delegated(career, 'selling') && <p className="muted">{t.duties.selling[1]} · {t.staffNames.director}</p>}
          <div className="list">
            {career.offers.map((o) => {
              const p = byId.get(o.playerId);
              if (!p) return null;
              return (
                <div key={o.id} className="cell g-row">
                  <span className="cmain"><b>{p.name[lang]} · {p.rating}</b><span>{nameOf(o.clubId)} · <span className="num ltr">{money(o.fee)}</span> · {t.player.value} {money(p.marketValue)}</span></span>
                </div>
              );
            })}
          </div>
          <button className="btn primary" style={{ width: '100%', marginTop: 'var(--s3)' }} onClick={onOffers}>{t.answerBids}</button>
        </>
      ))}

      {tab === 3 && (
        <>
          <p className="muted" style={{ marginTop: 0 }}>{t.loanHint}</p>
          {loansIn(career).length + loansOut(career).length === 0 ? <Empty text={t.loansEmpty} action={{ label: t.findPlayers, onClick: () => onTab(0) }} /> : (
            <>
              {([[t.loansInT, loansIn(career)], [t.loansOutT, loansOut(career)]] as const).map(([label, list]) => list.length > 0 && (
                <section key={label}>
                  <div className="sechead"><span className="over">{label}</span></div>
                  <div className="list">
                    {list.map((l) => {
                      const p = byId.get(l.playerId);
                      return (
                        <button key={l.playerId} className="cell" onClick={() => p && onPick(p)}>
                          <span className="cmain"><b>{l.pn[lang]}</b><span>{l.to === career.clubId ? t.loanFrom(nameOf(l.from)) : t.loanAt(nameOf(l.to))}{l.fee ? ` · ${money(l.fee)}` : ''}</span></span>
                          {p && <span className="g-rating num">{p.rating}</span>}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </>
          )}
        </>
      )}

      {tab === 4 && (career.deals.length === 0 ? <Empty text={t.dealsEmpty} /> : (
        <div className="list">
          {career.deals.slice(0, 40).map((d, i) => (
            <div key={i} className="cell g-row">
              <span className={`tag ${d.kind === 'in' || (d.kind === 'free' && d.to === career.clubId) ? 'g-up' : 'g-down'}`}>{t.dealKind[d.kind]}</span>
              <span className="cmain"><b>{d.name[lang]}</b><span>{nameOf(d.from)} → {nameOf(d.to)} · {t.season(d.season)}</span></span>
              <b className="num ltr">{d.fee ? money(d.fee) : t.free}</b>
            </div>
          ))}
        </div>
      ))}
      <div style={{ height: 24 }} />
    </>
  );
}
