// Player sheet: what you can do with him first (offer, renew, list, loan), then his condition, and the attributes
// and season numbers behind "Details" (GF-17: five actions no longer sit three screens down on a phone).
import type { Lang, Strings } from '../i18n';
import { FREE_AGENT, type Career, type Player } from '../model/types';
import { FLAG } from '../data/names';
import { ageOf, money, type World } from '../sim/world';
import { askingPrice } from '../sim/transfers';
import { Kit } from '../components/Kit';
import { useState } from 'react';
import { Line, Sheet, Stat } from './parts';
import { balanceOf } from '../sim/balance';
import { estimate, shortlisted, toggleShortlist } from '../sim/estimate';
import { avgRating } from '../sim/ratings';
import { windowOf } from '../sim/windows';
import { loanClubs, loanFee, loanIn, loanOf, loanOut } from '../sim/loans';

export function PlayerSheet({ p, world, career, lang, t, onClose, onOffer, onRenew, onList, onRename, onApply }: {
  p: Player; world: World; career: Career; lang: Lang; t: Strings;
  onClose: () => void; onOffer: () => void; onRenew: () => void; onList: (listed: boolean) => void; onRename: () => void;
  onApply: (w: World, c: Career, msg?: string) => void;
}) {
  const [loanPick, setLoanPick] = useState(false);
  const [why, setWhy] = useState('');
  const [details, setDetails] = useState(false);
  const loan = loanOf(career, p.id);
  const mine = p.clubId === career.clubId;
  const est = estimate(world, career, p);
  const rt = career.ratings?.[p.id];
  const clubName = (id: string) => world.clubs.find((c) => c.id === id)?.name[lang] ?? '';
  const windowShut = !windowOf(career) && p.clubId !== FREE_AGENT;
  // Loans validate themselves: a refused move changes nothing and says why.
  const tryLoanIn = () => {
    const r = loanIn(world, career, p);
    if (!r.ok) { setWhy(t.loanReason[r.reason]); return; }
    onApply(r.world, r.career, t.loanedIn(p.name[lang]));
  };
  const tryLoanOut = (to: string) => {
    const r = loanOut(world, career, p, to);
    if (!r.ok) { setWhy(t.loanReason[r.reason]); return; }
    onApply(r.world, r.career, t.loanedOut(p.name[lang], clubName(to)));
  };
  const clubs = loanPick ? loanClubs(world, career, p) : [];
  const club = world.clubs.find((c) => c.id === p.clubId);
  const st = career.stats[p.id] ?? [0, 0, 0, 0, 0];
  const attrIdx = p.position === 'GK' ? [6, 2, 5, 0] : [0, 1, 2, 3, 4, 5];
  return (
    <Sheet label={p.name[lang]} onClose={onClose}>
      <div className="g-sheet-head">
        <span className="g-shirt num">{p.shirtNumber || '–'}</span>
        <div style={{ minWidth: 0 }}>
          <h2 className="d3 ltr-auto">{p.name[lang]}</h2>
          {p.nick && <div className="g-nick">«{p.nick[lang]}»</div>}
          <span className="muted">{t.pos[p.position]} · {FLAG[p.nationality] ?? ''} {p.nationality}</span>
        </div>
      </div>
      {club && !mine && (
        <div className="g-leagues" style={{ margin: 'var(--s3) 0 0' }}>
          <span className="chip"><Kit colors={club.colors} size="xs" /> {club.name[lang]}</span>
        </div>
      )}
      {p.clubId === FREE_AGENT && <div className="g-leagues" style={{ margin: 'var(--s3) 0 0' }}><span className="chip">{t.freeAgents}</span></div>}
      {loan && <div className="g-leagues" style={{ margin: 'var(--s3) 0 0' }}><span className="chip">{loan.to === career.clubId ? t.loanFrom(clubName(loan.from)) : t.loanAt(clubName(loan.to))}</span></div>}
      {(p.injured > 0 || p.banned > 0) && (
        <p className="g-bad" style={{ margin: 'var(--s3) 0 0' }}>{p.injured > 0 ? t.statusInj(p.injured) : t.statusBan(p.banned)}</p>
      )}

      {/* Actions first: the reason the sheet was opened. */}
      {why && <p className="g-bad" role="alert" style={{ margin: 'var(--s3) 0 0' }}>{why}</p>}
      {windowShut && !mine && !loan && <p className="muted" style={{ margin: 'var(--s3) 0 0' }}>{t.windowClosedBid}</p>}
      <div className="g-actions">
        {!mine && !loan && <button className="btn primary" disabled={windowShut} onClick={onOffer}>{t.makeOffer}</button>}
        {((mine && !loan) || loan?.from === career.clubId) && <button className="btn primary" onClick={onRenew}>{t.renewTitle}</button>}
        {!mine && !loan && p.clubId !== FREE_AGENT && <button className="btn" disabled={windowShut} onClick={tryLoanIn}>{t.loanInBtn(money(loanFee(p)))}</button>}
        {!mine && !loan && (
          <button className="btn" onClick={() => onApply(world, toggleShortlist(career, p.id))}>{shortlisted(career, p.id) ? `★ ${t.shortlistRemove}` : `☆ ${t.shortlistAdd}`}</button>
        )}
        {mine && !loan && <button className="btn" onClick={() => onList(!p.listed)}>{p.listed ? t.unlist : t.listForSale}</button>}
        {mine && !loan && windowOf(career) && !loanPick && <button className="btn" onClick={() => { setWhy(''); setLoanPick(true); }}>{t.loanOutBtn}</button>}
      </div>
      {loanPick && (
        <>
          <div className="sechead"><span className="over">{t.loanTo}</span></div>
          {clubs.length ? (
            <div className="list" style={{ marginBottom: 'var(--s3)' }}>
              {clubs.map((id) => <button key={id} className="cell" onClick={() => tryLoanOut(id)}><span className="cmain"><b>{clubName(id)}</b></span></button>)}
            </div>
          ) : <p className="muted">{t.noLoanClubs}</p>}
        </>
      )}

      <div className="g-stats g-stats-4">
        <Stat label={t.player.rating} value={est.exact ? String(p.rating) : `${est.lo}–${est.hi}`} />
        <Stat label={t.player.potential} value={est.exact ? String(p.potential) : `${est.plo}–${est.phi}`} />
        <Stat label={t.player.age} value={String(ageOf(p, career.season))} />
        <Stat label={t.player.shirt} value={p.shirtNumber ? `#${p.shirtNumber}` : '–'} />
      </div>
      <div className="g-bars">
        {[[t.fitness, p.fitness], [t.morale, p.morale]].map(([k, v]) => (
          <div key={k as string} className="g-barrow"><span>{k}</span><div className="bar"><i style={{ width: `${v}%` }} /></div><b className="num">{v}</b></div>
        ))}
      </div>
      {!est.exact && <p className="muted" style={{ margin: 'var(--s2) 0 0' }}>{t.estimateT}: {t.estHint}</p>}
      <div className="list" style={{ margin: 'var(--s4) 0' }}>
        <Line k={t.player.value} v={money(p.marketValue)} />
        {!mine && p.clubId !== FREE_AGENT && <Line k={t.askPrice} v={money(askingPrice(world, p, balanceOf(career).prices))} />}
        <Line k={t.player.wage} v={money(p.wage)} unit={t.perMonth} />
        {p.clubId !== FREE_AGENT && <Line k={t.player.contract} v={String(p.contractUntil)} />}
        {!!p.savings && <Line k={t.playerSavings} v={money(p.savings)} />}
      </div>

      <button className="btn ghost" aria-expanded={details} onClick={() => setDetails(!details)}>{details ? t.hideDetailsT : t.detailsT} {details ? '▴' : '▾'}</button>
      {details && (
        <>
          {est.exact && (
            <div className="g-bars">
              {attrIdx.map((i) => (
                <div key={i} className="g-barrow"><span>{t.attrs[i]}</span><div className="bar attr"><i style={{ width: `${p.attrs[i]}%` }} /></div><b className="num">{p.attrs[i]}</b></div>
              ))}
            </div>
          )}
          <div className="sechead"><span className="over">{t.seasonStats}</span></div>
          <div className="g-stats g-stats-5">
            {t.statCols.map((k, i) => <Stat key={k} label={k} value={String(st[i])} />)}
          </div>
          {rt && rt[1] > 0 && (
            <div className="g-leagues" style={{ marginTop: 'var(--s3)' }}>
              <span className="chip">{t.avgRatingT} <b className="num">{avgRating(rt).toFixed(2)}</b></span>
              {rt[2] > 0 && <span className="chip">⭐ {t.motmN(rt[2])}</span>}
            </div>
          )}
        </>
      )}
      <div className="g-actions" style={{ marginTop: 'var(--s4)' }}>
        <button className="btn ghost" onClick={onRename}>✎ {t.editName}</button>
        <button className="btn ghost" onClick={onClose}>{t.close}</button>
      </div>
    </Sheet>
  );
}
