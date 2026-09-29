// Bottom sheets for deals: make an offer, renew a contract, answer offers, export and import the save.
import { useState } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Career, Offer, Player, SaveFile } from '../model/types';
import { ageOf, money, squadOf, type World } from '../sim/world';
import { roundFee } from '../sim/season';
import {
  acceptOffer, askingPrice, buy, clubOf, counterOffer, dealRoll, newContractEnd, rejectOffer, renewDemand, tryRenew, wageDemand, type Role,
} from '../sim/transfers';
import { parseSave, saveText as packSave } from '../sim/save';
import { download as downloadFile } from './share';
import { Kit } from '../components/Kit';
import { Sheet, Stepper } from './parts';
import { balanceOf } from '../sim/balance';

type Done = (world: World, career: Career, message: string) => void;
const ROLES: Role[] = ['star', 'regular', 'rotation', 'prospect'];
const stepOf = (v: number, share: number, min: number) => Math.max(min, roundFee(v * share));

export function BidSheet({ p, world, career, lang, t, onClose, onDone }: {
  p: Player; world: World; career: Career; lang: Lang; t: Strings; onClose: () => void; onDone: Done;
}) {
  const ask = askingPrice(world, p, balanceOf(career).prices);
  const [role, setRole] = useState<Role>(ageOf(p, career.season) <= 21 ? 'prospect' : 'regular');
  const [fee, setFee] = useState(ask);
  const [wage, setWage] = useState(() => wageDemand(world, p, career.clubId, role, balanceOf(career).wages));
  const [years, setYears] = useState(3);
  const [msg, setMsg] = useState('');
  const club = clubOf(world, career.clubId)!;

  // `buy` judges the bid itself: a refused bid changes nothing and comes back with the reason (and a counter).
  const send = () => {
    const r = buy(world, career, p, { fee, wage, years, role });
    if (r.ok) { onDone(r.world, r.career, t.signed(p.name[lang])); return; }
    const why = t.bidReason[r.reason];
    setMsg(typeof why === 'function' ? why(money(r.counter ?? 0)) : why);
    if (r.reason === 'fee' && r.counter) setFee(r.counter);
    if (r.reason === 'wage' && r.counter) setWage(r.counter);
  };

  return (
    <Sheet label={t.makeOffer} onClose={onClose}>
      <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s1)' }}>{t.makeOffer}</h2>
      <p className="muted" style={{ marginTop: 0 }}>{p.name[lang]} · {p.position} · {p.rating}</p>
      <div className="g-form">
        <label><span className="over">{t.fee}</span>
          <Stepper value={fee} onChange={setFee} step={stepOf(ask || p.marketValue, 0.05, 10_000)} format={(v) => (v ? money(v) : t.free)} />
          <small className="muted">{t.askPrice}: <span className="num ltr">{ask ? money(ask) : t.free}</span> · {t.budget}: <span className="num ltr">{money(club.budget)}</span></small>
        </label>
        <label><span className="over">{t.role}</span>
          <div className="seg">
            {ROLES.map((r) => (
              <button key={r} className={role === r ? 'on' : ''} onClick={() => { setRole(r); setWage(wageDemand(world, p, career.clubId, r, balanceOf(career).wages)); }}>{t.roles[r]}</button>
            ))}
          </div>
        </label>
        <label><span className="over">{t.player.wage}</span>
          <Stepper value={wage} onChange={setWage} step={stepOf(wage, 0.05, 500)} min={500} format={(v) => `${money(v)}${t.perMonth}`} />
        </label>
        <label><span className="over">{t.years}</span>
          <Stepper value={years} onChange={setYears} step={1} min={1} max={5} format={t.yearsN} />
        </label>
      </div>
      {msg && <p className="g-bad" role="status">{msg}</p>}
      <div style={{ display: 'grid', gap: 'var(--s3)', marginTop: 'var(--s4)' }}>
        <button className="btn primary" onClick={send}>{t.send}</button>
        <button className="btn ghost" onClick={onClose}>{t.cancel}</button>
      </div>
    </Sheet>
  );
}

export function RenewSheet({ p, world, career, lang, t, onClose, onDone }: {
  p: Player; world: World; career: Career; lang: Lang; t: Strings; onClose: () => void; onDone: Done;
}) {
  const d = renewDemand(p, career.season, balanceOf(career).wages);
  const [wage, setWage] = useState(d.wage);
  const [years, setYears] = useState(Math.min(2, d.maxYears));
  const [msg, setMsg] = useState('');
  const send = () => {
    const r = tryRenew(world, career, p, wage, years);
    if (r.ok) { onDone(r.world, career, t.renewed(p.name[lang])); return; }
    if (r.reason === 'wage') { setMsg(t.renewReason.wage(money(r.counter ?? 0))); setWage(r.counter ?? wage); }
    else if (r.reason === 'years') { setMsg(t.renewReason.years(r.counter ?? 1)); setYears(r.counter ?? 1); }
    else setMsg(t.renewReason[r.reason]);
  };
  return (
    <Sheet label={t.renewTitle} onClose={onClose}>
      <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s1)' }}>{t.renewTitle}</h2>
      <p className="muted" style={{ marginTop: 0 }}>{p.name[lang]} · {t.player.contract} {p.contractUntil}</p>
      <div className="g-form">
        <label><span className="over">{t.player.wage}</span>
          <Stepper value={wage} onChange={setWage} step={stepOf(wage, 0.05, 500)} min={500} format={(v) => `${money(v)}${t.perMonth}`} />
          <small className="muted">{t.player.wage}: <span className="num ltr">{money(p.wage)}</span>{t.perMonth}</small>
        </label>
        <label><span className="over">{t.extraYears}</span>
          <Stepper value={years} onChange={setYears} step={1} min={1} max={5} format={t.yearsN} />
          <small className="muted">{t.newEnd(newContractEnd(p, career.season, years))}</small>
        </label>
      </div>
      {msg && <p className="g-bad" role="status">{msg}</p>}
      <div style={{ display: 'grid', gap: 'var(--s3)', marginTop: 'var(--s4)' }}>
        <button className="btn primary" onClick={send}>{t.renewTitle}</button>
        <button className="btn ghost" onClick={onClose}>{t.cancel}</button>
      </div>
    </Sheet>
  );
}

export function OffersSheet({ world, career, lang, t, onClose, onDone }: {
  world: World; career: Career; lang: Lang; t: Strings; onClose: () => void; onDone: Done;
}) {
  const [msg, setMsg] = useState('');
  const byId = new Map(world.players.map((p) => [p.id, p]));
  const answer = (o: Offer, kind: 'accept' | 'reject' | 'counter') => {
    const p = byId.get(o.playerId)!;
    const buyer = clubOf(world, o.clubId)!;
    if (kind === 'reject') { onDone(world, rejectOffer(career, o), ''); return; }
    if (kind === 'counter') {
      const r = counterOffer(career, o, p, o.fee * 1.2, dealRoll(career, o.id));
      setMsg(r.accepted ? t.counterOk : t.counterNo);
      onDone(world, r.career, '');
      return;
    }
    const r = acceptOffer(world, career, o);
    if (!r.ok) { setMsg(t.sellReason[r.reason]); return; }
    onDone(r.world, r.career, t.sold(p.name[lang], buyer.name[lang]));
  };
  return (
    <Sheet label={t.offers} onClose={onClose}>
      <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s3)' }}>{t.offers}</h2>
      {msg && <p className="g-ok" role="status">{msg}</p>}
      <div style={{ display: 'grid', gap: 'var(--s3)' }}>
        {career.offers.map((o) => {
          const p = byId.get(o.playerId);
          const buyer = clubOf(world, o.clubId);
          if (!p || !buyer) return null;
          return (
            <div key={o.id} className="card g-offer">
              <div className="g-offer-head">
                <Kit colors={buyer.colors} size="sm" />
                <span className="cmain"><b>{p.name[lang]}</b><small className="muted">{buyer.name[lang]} · {p.rating}</small></span>
                <b className="num ltr g-offer-fee">{money(o.fee)}</b>
              </div>
              <small className="muted">{t.player.value}: <span className="num ltr">{money(p.marketValue)}</span> · {t.squadSize}: {squadOf(world, career.clubId).length}</small>
              <div className="g-offer-btns">
                <button className="btn primary sm" onClick={() => answer(o, 'accept')}>{t.accept}</button>
                <button className="btn sm" onClick={() => answer(o, 'counter')}>{t.counter}</button>
                <button className="btn ghost sm" onClick={() => answer(o, 'reject')}>{t.reject}</button>
              </div>
            </div>
          );
        })}
      </div>
      <button className="btn ghost" style={{ width: '100%', marginTop: 'var(--s4)' }} onClick={onClose}>{t.close}</button>
    </Sheet>
  );
}

export function SaveSheet({ mode, world, career, t, onClose, onLoaded }: {
  mode: 'export' | 'import'; world: World | null; career: Career | null; t: Strings; onClose: () => void; onLoaded: (s: SaveFile) => void;
}) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // A world or career that fails its checks is never written out: the sheet says why instead of throwing.
  const saveText = async () => {
    try { return await packSave(world!, career); } catch (e) { setMsg({ ok: false, text: t.saveRefused(e instanceof Error ? e.message : String(e)) }); return null; }
  };
  const download = async () => {
    const s = await saveText();
    if (s) await downloadFile(new Blob([s], { type: 'application/octet-stream' }), `the-gaffer-${career?.season ?? 'save'}.gaffer`);
  };
  const copy = async () => {
    const s = await saveText();
    if (!s) return;
    try { await navigator.clipboard.writeText(s); setMsg({ ok: true, text: t.copied }); } catch { setText(s); }
  };
  const load = async (raw: string) => {
    const r = await parseSave(raw.trim());
    if (!r.ok) { setMsg({ ok: false, text: r.detail ? `${t.importBad[r.reason]} (${r.detail})` : t.importBad[r.reason] }); return; }
    onLoaded(r.save);
  };

  return (
    <Sheet label={mode === 'export' ? t.exportSave : t.importSave} onClose={onClose}>
      <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s1)' }}>{mode === 'export' ? t.exportSave : t.importSave}</h2>
      <p className="muted" style={{ marginTop: 0 }}>{mode === 'export' ? t.exportSub : t.importSub}</p>
      {mode === 'export' ? (
        <div style={{ display: 'grid', gap: 'var(--s3)' }}>
          <button className="btn primary" onClick={download}>{t.download}</button>
          <button className="btn" onClick={copy}>{t.copy}</button>
          {text && <textarea className="g-input g-area" readOnly value={text} onFocus={(e) => e.currentTarget.select()} />}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--s3)' }}>
          <label className="btn">
            {t.chooseFile}
            <input type="file" accept=".gaffer,.json,application/json" hidden
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) load(await f.text()); }} />
          </label>
          <textarea className="g-input g-area" placeholder={t.pasteHere} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn primary" disabled={!text.trim()} onClick={() => load(text)}>{t.load}</button>
        </div>
      )}
      {msg && <p className={msg.ok ? 'g-ok' : 'g-bad'} role="status">{msg.text}</p>}
      <button className="btn ghost" style={{ width: '100%', marginTop: 'var(--s4)' }} onClick={onClose}>{t.close}</button>
    </Sheet>
  );
}
