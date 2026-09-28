// Club screen: money (ledger, monthly picture, bonuses, donations, wage cap), tickets, sponsors, facilities and staff.
import { useState } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Career } from '../model/types';
import { money, squadOf, type World } from '../sim/world';
import { roundFee } from '../sim/season';
import {
  FACILITIES, SLOTS, STAFF_ROLES, attendance, capacityOf, donate, endSponsor, extendSponsor, haggleSponsor, hireStaff, monthly, moveWageCap,
  payBonus, refPrice, signSponsor, staffWages, upgradeCost, upgradeFacility, upkeep,
} from '../sim/economy';
import { AppBar, Stepper } from './parts';

type Done = (w: World, c: Career, msg?: string) => void;

export function ClubScreen({ world, career, lang, t, onBack, onChange, tab0 = 0 }: {
  world: World; career: Career; lang: Lang; t: Strings; onBack: () => void; onChange: Done; tab0?: number;
}) {
  const [tab, setTab] = useState(tab0);
  const club = world.clubs.find((x) => x.id === career.clubId)!;
  const ops = career.ops;
  const ref = refPrice(world, club);
  const [price, setPrice] = useState(ops.ticket);
  const [each, setEach] = useState(roundFee(club.wageCap / 40) || 1000);
  const [fromWallet, setFromWallet] = useState(false);
  const [gift, setGift] = useState(roundFee(Math.max(1000, career.coach.wallet / 4)) || 1000);
  const [capStep, setCapStep] = useState(roundFee(club.wageCap * 0.05) || 1000);
  const [msg, setMsg] = useState('');
  const mo = monthly(world, career);
  const squad = squadOf(world, career.clubId);
  const priceStep = ref < 5 ? 0.1 : ref < 20 ? 1 : 2;
  const fmtPrice = (v: number) => (v < 10 ? `€${v.toFixed(1)}` : money(Math.round(v)));

  const ledgerRows = (l: Record<string, number>) => Object.entries(l).filter(([, v]) => v).sort((a, b) => b[1] - a[1]);
  const Ledger = ({ l }: { l: Record<string, number> }) => {
    const rows = ledgerRows(l);
    const net = rows.reduce((s, [, v]) => s + v, 0);
    return (
      <div className="list">
        {rows.map(([k, v]) => (
          <div key={k} className="cell g-row"><span className="cmain"><span>{t.ledgerKeys[k] ?? k}</span></span><b className={`num ltr ${v >= 0 ? 'g-ok' : 'g-bad'}`}>{v >= 0 ? '+' : '−'}{money(Math.abs(v))}</b></div>
        ))}
        <div className="cell g-row"><span className="cmain"><b>{t.net}</b></span><b className={`num ltr ${net >= 0 ? 'g-ok' : 'g-bad'}`}>{net >= 0 ? '+' : '−'}{money(Math.abs(net))}</b></div>
      </div>
    );
  };

  return (
    <>
      <AppBar back={onBack} backLabel={t.back} title={t.clubScreen} sub={`${t.budget} ${money(club.budget)}`} />
      <div className="seg g-seg-wrap" style={{ margin: 'var(--s4) 0' }}>
        {t.finTabs.map((l, i) => <button key={l} className={tab === i ? 'on' : ''} onClick={() => { setTab(i); setMsg(''); }}>{l}</button>)}
      </div>
      {msg && <p className="g-ok" role="status">{msg}</p>}
      {club.budget < 0 && <div className="banner warn" style={{ marginBottom: 'var(--s3)' }}><span className="bic">⚠️</span><div><b>{t.inTheRed}</b></div></div>}

      {tab === 0 && (
        <>
          <div className="sechead" style={{ marginTop: 0 }}><span className="over">{t.perMonthT}</span></div>
          <Ledger l={{ tickets: mo.tickets, tv: mo.tv, sponsors: mo.sponsors, wages: mo.wages, staff: mo.staff, upkeep: mo.upkeep }} />
          <div className="sechead"><span className="over">{t.thisSeason}</span></div>
          {ledgerRows(ops.ledger).length ? <Ledger l={ops.ledger} /> : <p className="muted">{t.noGames}</p>}
          {ops.lastLedger && <><div className="sechead"><span className="over">{t.lastSeason}</span></div><Ledger l={ops.lastLedger} /></>}

          <div className="sechead"><span className="over">{t.bonusT}</span></div>
          <div className="card g-form">
            <label><span className="over">{t.teamBonus} · {t.perPlayer}</span>
              <Stepper value={each} onChange={setEach} step={Math.max(100, roundFee(each / 5))} min={100} format={money} />
            </label>
            <div className="seg"><button className={!fromWallet ? 'on' : ''} onClick={() => setFromWallet(false)}>{t.fromClub}</button><button className={fromWallet ? 'on' : ''} onClick={() => setFromWallet(true)}>{t.fromWallet} ({money(career.coach.wallet)})</button></div>
            <button className="btn primary" onClick={() => {
              const r = payBonus(world, career, squad.map((p) => p.id), each, fromWallet);
              if (r.ok) onChange(r.world, r.career, t.bonusPaid); else setMsg(t.notEnough);
            }}>{t.pay} · {money(each * squad.length)}</button>
          </div>

          <div className="sechead"><span className="over">{t.donateT}</span></div>
          <div className="card g-form">
            <small className="muted">{t.donateHint}</small>
            <Stepper value={gift} onChange={setGift} step={Math.max(100, roundFee(gift / 5))} min={100} format={money} />
            <button className="btn" disabled={gift > career.coach.wallet} onClick={() => { const r = donate(world, career, gift); if (r.ok) onChange(r.world, r.career, t.donated); }}>{t.donate}</button>
          </div>

          <div className="sechead"><span className="over">{t.wageCapT} · {money(club.wageCap)}{t.perMonth}</span></div>
          <div className="card g-form">
            <small className="muted">{t.wageCapHint}</small>
            <Stepper value={capStep} onChange={setCapStep} step={Math.max(100, roundFee(club.wageCap * 0.01))} min={100} format={(v) => `${money(v)}${t.perMonth}`} />
            <div className="g-filters">
              <button className="btn" onClick={() => { const r = moveWageCap(world, career, capStep); if (r.ok) onChange(r.world, r.career, `${t.wageCapT}: ${money(club.wageCap + capStep)}`); else setMsg(t.notEnough); }}>{t.raise} · −{money(capStep * 12)}</button>
              <button className="btn" onClick={() => { const r = moveWageCap(world, career, -capStep); if (r.ok) onChange(r.world, r.career, `${t.wageCapT}: ${money(club.wageCap - capStep)}`); }}>{t.lower} · +{money(capStep * 12)}</button>
            </div>
          </div>
        </>
      )}

      {tab === 1 && (
        <div className="card g-form">
          <div className="g-stats">
            <div className="g-stat"><span className="num">{capacityOf(ops).toLocaleString()}</span><small>{t.capacity}</small></div>
            <div className="g-stat"><span className="num">{attendance(world, career, price).toLocaleString()}</span><small>{t.expected}</small></div>
            <div className="g-stat"><span className="num ltr">{money(Math.round(attendance(world, career, price) * price))}</span><small>{t.revenue}</small></div>
          </div>
          <label><span className="over">{t.ticketPrice}</span>
            <Stepper value={price} onChange={(v) => setPrice(Math.round(v * 10) / 10)} step={priceStep} min={priceStep} format={fmtPrice} />
            <small className="muted">{t.usual}: {fmtPrice(Math.round(ref * 10) / 10)}</small>
          </label>
          {/* Crowd and revenue across prices, so the best price is easy to see. */}
          <div className="g-curve">
            {[0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.7, 2].map((k) => {
              const p = Math.round(ref * k * 10) / 10;
              const rev = attendance(world, career, p) * p;
              const best = Math.max(...[0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.7, 2].map((x) => attendance(world, career, ref * x) * ref * x));
              return <button key={k} className={`g-curve-bar${Math.abs(p - price) < priceStep / 2 ? ' on' : ''}`} onClick={() => setPrice(p)}><i style={{ height: `${(rev / best) * 100}%` }} /><small>{fmtPrice(p)}</small></button>;
            })}
          </div>
          {ops.lastGate && <small className="muted">{t.lastGate(ops.lastGate.attendance, money(ops.lastGate.revenue))}</small>}
          <button className="btn primary" disabled={price === ops.ticket} onClick={() => onChange(world, { ...career, ops: { ...ops, ticket: price } }, `${t.ticketPrice}: ${fmtPrice(price)}`)}>{t.setPrice}</button>
        </div>
      )}

      {tab === 2 && SLOTS.map((slot) => {
        const d = ops.sponsors.find((x) => x.slot === slot);
        const offers = ops.sponsorOffers.filter((x) => x.slot === slot);
        return (
          <div key={slot} style={{ marginBottom: 'var(--s4)' }}>
            <div className="sechead" style={{ marginTop: 0 }}><span className="over">{t.slotNames[slot]}</span></div>
            {d ? (
              <div className="card g-offer">
                <div className="g-offer-head"><span className="cmain"><b>{d.brand[lang]}</b><small className="muted">{t.monthsLeft(d.months)}</small></span><b className="num ltr g-offer-fee">{money(d.monthly)}{t.perMonth}</b></div>
                <small className="muted">{t.bonusLeague} {money(d.bonusLeague)} · {t.bonusCup} {money(d.bonusCup)}</small>
                <div className="g-filters">
                  <button className="btn sm" onClick={() => onChange(world, extendSponsor(career, d), t.extend)}>{t.extend}</button>
                  <button className="btn sm ghost" onClick={() => { const r = endSponsor(world, career, d); onChange(r.world, r.career, t.endDeal); }}>{t.endDeal}</button>
                </div>
                <small className="muted">{t.endDealCost(money(d.monthly * 2))}</small>
              </div>
            ) : offers.length ? offers.map((o) => (
              <div key={o.id} className="card g-offer" style={{ marginBottom: 'var(--s2)' }}>
                <div className="g-offer-head"><span className="cmain"><b>{o.brand[lang]}</b><small className="muted">{t.months(o.months)}</small></span><b className="num ltr g-offer-fee">{money(o.monthly)}{t.perMonth}</b></div>
                <small className="muted">{t.bonusLeague} {money(o.bonusLeague)} · {t.bonusCup} {money(o.bonusCup)}</small>
                <div className="g-filters">
                  <button className="btn primary sm" onClick={() => onChange(world, signSponsor(career, o), `${t.sign}: ${o.brand[lang]}`)}>{t.sign}</button>
                  <button className="btn sm" onClick={() => { const r = haggleSponsor(career, o, Math.random()); onChange(world, r.career, r.ok ? t.haggleOk : t.haggleNo); }}>{t.askMore}</button>
                </div>
              </div>
            )) : <p className="muted">—</p>}
          </div>
        );
      })}

      {tab === 3 && (
        <>
          <p className="muted" style={{ marginTop: 0 }}>{t.upkeepT}: {money(upkeep(ops, club))}{t.perMonth}</p>
          <div className="list">
            {FACILITIES.map((f) => {
              const lvl = ops.facilities[f];
              const cost = upgradeCost(club, lvl);
              return (
                <div key={f} className="cell g-row">
                  <span className="g-shirt num">{lvl}</span>
                  <span className="cmain"><b>{t.facilityNames[f]}</b><span>{t.facilityEffects[f]}</span></span>
                  {lvl >= 5 ? <span className="tag g-up">{t.maxLevel}</span> : (
                    <button className="btn sm" disabled={club.budget < cost} onClick={() => { const r = upgradeFacility(world, career, f); if (r.ok) onChange(r.world, r.career, `${t.facilityNames[f]} ${lvl + 1}`); }}>{t.upgrade(money(cost))}</button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 4 && (
        <>
          <p className="muted" style={{ marginTop: 0 }}>{t.staffTotal(money(staffWages(ops)))}</p>
          {STAFF_ROLES.map((role) => {
            const s = ops.staff[role];
            return (
              <div key={role} style={{ marginBottom: 'var(--s4)' }}>
                <div className="sechead" style={{ marginTop: 0 }}><span className="over">{t.staffNames[role]} · {t.staffEffects[role]}</span></div>
                <div className="list">
                  {s && <div className="cell g-row g-mine"><span className="g-shirt num">{s.quality}</span><span className="cmain"><b>{s.name[lang]}</b><span>{money(s.wage)}{t.perMonth}</span></span></div>}
                  {ops.staffPool.filter((x) => x.role === role).map((x) => (
                    <div key={x.id} className="cell g-row">
                      <span className="g-shirt num">{x.quality}</span>
                      <span className="cmain"><b>{x.name[lang]}</b><span>{money(x.wage)}{t.perMonth}</span></span>
                      <button className="btn sm" onClick={() => onChange(world, hireStaff(career, x), `${t.hire}: ${x.name[lang]}`)}>{t.hire}</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
