// Medical and Academy & pathway (V2.6). Medical: who is out and when he's back (a range, as sure as the doctor is good),
// the rush-back call with its stated relapse risk, and the loaded legs before the next match. Academy & pathway: Intake
// Day (preview, then the day itself), the academy as a real squad (promote, loan out, release), the loanees' minutes,
// and the graduates in the first team. Every button is a command (sim/commands.ts → sim/youth.ts).
import { CO } from '../lang-cohort';
import { LS } from '../lang-loanspot';
import { MATCH_SHARP } from '../sim/tactics';
import { SH } from '../lang-sharp';
import { useMemo, useState } from 'react';
import type { Player } from '../model/types';
import { squadOf } from '../sim/world';
import { staffOf } from '../sim/delegation';
import { treatmentCost } from '../sim/training';
import { windowOf } from '../sim/windows';
import { promotionTerms } from '../sim/youth';
import { PROSPECT_APPS, PROSPECT_WINDOW } from '../sim/room';
import {
  academyLoanSpots, academyOf, canRush, capOf, gradsOf, intakeDay, loaneesOf, matchRisk, potBand, previewDay, readyBar, returnWindow, riskBand, riskMult,
  rushGain, rushRisk, standout, startRating, tierOf,
} from '../sim/youth';
import { Crest, I, Meter, Portrait } from './kit';
import { Panel, PanelHead, Sheet } from './shell';
import { useGame, clubOf, cn, money, nm, sn } from './game';
import { ageOf } from './util';
import { BAND_ICON, BAND_TONE } from './Training';
import { SquadTabs } from './SquadTabs';
import { Y } from '../lang-youth-all';
import '../styles/youth.css';

// ---------- Medical ----------

export function MedicalScreen() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const Yx = Y[g.ui];
  const M = Yx.md;
  const squad = squadOf(w, c.clubId);
  const hurt = squad.filter((p) => p.injured > 0).sort((a, b) => b.rating - a.rating);
  const edge = squad.filter((p) => p.injured === 0 && riskBand(p) > 0).sort((a, b) => matchRisk(b) - matchRisk(a));
  const short = squad.filter((p) => p.injured === 0 && p.fitness < MATCH_SHARP).sort((a, b) => a.fitness - b.fitness);
  const doc = staffOf(c, 'doctor');
  const rested = new Set(c.rested ?? []);
  const risk = rushRisk(c);
  const club = clubOf(w, c.clubId)!;
  return (
    <div className="sc-medical sc-youth">
      <SquadTabs at="medical" />
      <div className="h-head on-ground">
        <h1 className="h-hero">{M.title}</h1>
        <p className="lead">{M.head(hurt.length, edge.filter((p) => riskBand(p) === 2).length)}</p>
      </div>
      <div className="grid2">
        <Panel i={0} label={M.out}>
          <PanelHead title={M.out} right={<span className="eyebrow">{x.train.injuredN(hurt.length)}</span>} />
          <div className="rows">
            {hurt.map((p) => {
              const [lo, hi] = returnWindow(c, p);
              const orig = Math.max(p.inj0 ?? p.injured, p.injured);
              const healed = Math.round(100 * (1 - p.injured / Math.max(1, orig)));
              const rush = canRush(p);
              return (
                <div key={p.id} className="row wrap med-row">
                  <Portrait p={p} club={g.club} size={40} />
                  <button className="grow linklike" onClick={() => g.player(p.id)}>
                    <span className="name">{nm(p, lang)}</span>
                    <span className="sub">{M.back(lo, hi)} · {M.orig(orig)}</span>
                    <Meter v={healed} />
                  </button>
                  <span className="btns">
                    <button className="btn btn--ghost btn--sm" disabled={club.budget < treatmentCost(w, c, 'rehab')} onClick={() => void g.run({ type: 'medical.treat', playerId: p.id, treatment: 'rehab' })}>{x.train.rehab} · {money(treatmentCost(w, c, 'rehab'))}</button>
                    <button className="btn btn--ghost btn--sm" disabled={club.budget < treatmentCost(w, c, 'specialist') || p.injured < 2} onClick={() => void g.run({ type: 'medical.treat', playerId: p.id, treatment: 'specialist' })}>{x.train.specialist} · {money(treatmentCost(w, c, 'specialist'))}</button>
                    <button className={`btn btn--sm${rush ? ' btn--accent' : ' btn--ghost'}`} disabled={!rush} onClick={() => void g.run({ type: 'medical.treat', playerId: p.id, treatment: 'rush' })}><I n="clock" size="sm" />{M.rush}</button>
                  </span>
                  <span className="small rushline">{rush ? <span className="tag tag--warn"><I n="alert" size="sm" />{M.rushFx(rushGain(p), risk)}</span> : <span className="muted">{M.rushNotYet(Math.max(1, Math.floor(orig / 2 + 0.5)))}</span>}</span>
                </div>
              );
            })}
            {!hurt.length && <p className="muted small yempty"><I n="heart" size="sm" />{M.none}</p>}
          </div>
          <p className="small muted fognote">{doc ? M.fog(doc.name[lang]) : M.fogNone}</p>
        </Panel>

        <Panel i={1} label={M.edge}>
          <PanelHead title={M.edge} right={<span className="eyebrow">{M.edgeSub}</span>} />
          <div className="rows">
            {edge.map((p) => {
              const b = p.rr && p.rr[1] > 0 ? 2 : riskBand(p);
              const off = rested.has(p.id);
              return (
                <div key={p.id} className="row">
                  <Portrait p={p} club={g.club} size={36} />
                  <button className="grow linklike" onClick={() => g.player(p.id)}>
                    <span className="name">{nm(p, lang)}</span>
                    <span className="sub">{Yx.tw.riskX(riskMult(p.load).toFixed(1))} · {M.thisMatch(matchRisk(p))}{p.rr && p.rr[1] > 0 ? ` · ${Yx.tw.fragile(p.rr[1])}` : ''}</span>
                  </button>
                  <span className={`tag tag--${BAND_TONE[b]}`}><I n={BAND_ICON[b]} size="sm" />{Yx.bands[b]}</span>
                  <button className={`btn btn--sm${off ? '' : ' btn--ghost'}`} aria-pressed={off} onClick={() => void g.run({ type: 'rest.set', playerId: p.id, rest: !off }, { toast: false })}>{off ? M.unrest : M.rest}</button>
                </div>
              );
            })}
            {!edge.length && <p className="muted small yempty"><I n="check" size="sm" />{M.noEdge}</p>}
          </div>
        </Panel>

        {/* Rework §G: medically available is not the same as match-ready (sim/tactics.ts MATCH_SHARP; fitness +12 a matchday). */}
        <Panel i={2} label={SH[g.ui].title} className="sharp">
          <PanelHead title={SH[g.ui].title} right={<span className="eyebrow">{SH[g.ui].sub}</span>} />
          <div className="rows">
            {short.map((p) => {
              const off = rested.has(p.id);
              return (
                <div key={p.id} className="row">
                  <Portrait p={p} club={g.club} size={36} />
                  <button className="grow linklike" onClick={() => g.player(p.id)}>
                    <span className="name">{nm(p, lang)}</span>
                    <span className="sub">{SH[g.ui].line(Math.round(p.fitness), Math.max(1, Math.ceil((MATCH_SHARP - p.fitness) / 12)))}</span>
                  </button>
                  <button className={`btn btn--sm${off ? '' : ' btn--ghost'}`} aria-pressed={off} onClick={() => void g.run({ type: 'rest.set', playerId: p.id, rest: !off }, { toast: false })}>{off ? M.unrest : M.rest}</button>
                </div>
              );
            })}
            {!short.length && <p className="muted small yempty"><I n="check" size="sm" />{SH[g.ui].none}</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ---------- Academy & pathway ----------

export function AcademyScreen({ focus }: { focus?: string }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const Yx = Y[g.ui];
  const A = Yx.ac;
  const ac = useMemo(() => academyOf(w, c.clubId).sort((a, b) => potBand(c, b)[1] - potBand(c, a)[1] || b.rating - a.rating), [w, c]);
  const loanees = loaneesOf(w, c);
  const grads = gradsOf(w, c).sort((a, b) => (c.stats[b.id]?.[0] ?? 0) - (c.stats[a.id]?.[0] ?? 0) || b.rating - a.rating);
  const cap = capOf(w, c, c.clubId);
  const bar = readyBar(w, c);
  const [loanFor, setLoanFor] = useState<Player | null>(null);
  const [letGo, setLetGo] = useState<Player | null>(null);
  const [promote, setPromote] = useState<Player | null>(null);
  const it = c.intake && c.intake.season === c.season && c.intake.club === c.clubId ? c.intake : null;
  const day = intakeDay(c);
  const fresh = it?.arrived && c.round - it.day <= 6;
  const kids = fresh ? it!.kids.map((k) => ac.find((a) => a.id === k.id)).filter((k): k is Player => !!k) : [];
  const [reveal, setReveal] = useState(!fresh || !!focus);
  const star = kids.length ? standout(kids) : null;
  const age = (p: Player) => ageOf(p, c.season);
  return (
    <div className="sc-academy sc-youth">
      <SquadTabs at="academy" />
      <div className="h-head on-ground">
        <h1 className="h-hero">{A.title}</h1>
        <p className="lead">{A.head(ac.length, loanees.length, grads.length)}</p>
      </div>

      {/* Intake Day: the countdown, the preview, then the day itself */}
      <Panel i={0} className={`intake${fresh ? ' is-day' : ''}`} label={fresh ? A.arrived(kids.length) : A.countdown(Math.max(0, day - c.round))}>
        {fresh ? (
          <>
            <div className="intake-h">
              <span className="eyebrow">{A.classOf(x.seasonLabel(c.season))}</span>
              <h2 className="h1">{A.arrived(kids.length)}</h2>
            </div>
            {!reveal ? (
              <button className="btn btn--accent intake-go" onClick={() => setReveal(true)}><I n="sparkle" size="sm" />{A.reveal}</button>
            ) : (
              <div className="class">
                {kids.map((k, i) => {
                  const [plo, phi] = potBand(c, k);
                  return (
                    <button key={k.id} className={`kid${k.id === star?.id ? ' star' : ''}`} style={{ ['--i' as string]: i }} onClick={() => g.player(k.id)}>
                      <Portrait p={k} club={g.club} size={56} />
                      <b>{sn(k, lang)}</b>
                      <span className="small">{x.common.pos[k.position]} · {age(k)}</span>
                      <span className="pband num"><span>{k.rating}</span><small>{plo}–{phi}</small></span>
                      {k.id === star?.id && <span className="tag tag--good"><I n="star" size="sm" />{A.standout}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="intake-wait">
            <span className="intake-ic"><I n="grad" /></span>
            <div className="grow">
              {it && !it.arrived && c.round >= previewDay(c) ? (
                <><b>{A.preview(Yx.tiers[tierOf(standout(it.kids).potential)], x.common.posLong[standout(it.kids).position])}</b><span className="small muted">{A.previewSub(Math.max(1, day - c.round))}</span></>
              ) : c.round < day ? (
                <><b>{A.countdown(day - c.round)}</b><span className="small muted">{A.countdownSub}</span></>
              ) : (
                <><b>{A.nextYear}</b></>
              )}
            </div>
          </div>
        )}
        <div className="capline">
          <span className="small">{A.cap(ac.length, cap)}</span>
          <Meter v={Math.min(100, (ac.length / Math.max(1, cap)) * 100)} tone={ac.length > cap ? 'bad' : ac.length === cap ? 'warn' : undefined} />
          {ac.length > cap && <span className="tag tag--bad"><I n="alert" size="sm" />{A.over}</span>}
        </div>
      </Panel>

      {/* The pathway at a glance */}
      <div className="pathway on-ground" aria-hidden="true">
        {[ac.length, loanees.length, grads.length].map((n, i) => (
          <div key={i} className="step"><b className="num">{n}</b><span>{A.path[i]}</span>{i < 2 && <I n="chev" size="sm" flip={g.rtl} />}</div>
        ))}
      </div>

      <div className="grid2">
        <Panel i={1} label={A.squad}>
          <PanelHead title={A.squad} right={<span className="eyebrow">{A.cap(ac.length, cap)}</span>} />
          {/* Rework §H: the academy by age group, each with its size, level and who is ready. */}
          {([['u18', ac.filter((k) => age(k) < 18)], ['u21', ac.filter((k) => age(k) >= 18)]] as const).filter(([, ks]) => ks.length).map(([coh, ks]) => (
            <div key={coh} className="cohort">
              <div className="between coh-h"><h3 className="h3">{CO[g.ui][coh]}</h3><span className="small muted">{CO[g.ui].head(ks.length, (ks.reduce((s, k) => s + k.rating, 0) / ks.length).toFixed(0), ks.filter((k) => age(k) >= 17 && k.rating >= bar - 1).length)}</span></div>
              <div className="rows">
            {ks.map((k) => {
              const [plo, phi] = potBand(c, k);
              const grown = k.rating - startRating(k, c.season);
              const ready = age(k) >= 17 && k.rating >= bar - 1;
              const late = age(k) >= 20 && !ready;
              return (
                <div key={k.id} className={`row wrap ac-row${focus === k.id ? ' hot' : ''}`}>
                  <Portrait p={k} club={g.club} size={40} />
                  <button className="grow linklike" onClick={() => g.player(k.id)}>
                    <span className="name">{nm(k, lang)} {ready && <span className="tag tag--good">{A.ready}</span>} {late && <span className="tag tag--warn">{A.late}</span>}</span>
                    <span className="sub">{x.common.pos[k.position]} · {age(k)}{grown ? ` · ${A.grown(grown)}` : ''}</span>
                  </button>
                  <span className="pband num"><span>{k.rating}</span><small>{plo}–{phi}</small></span>
                  <span className="btns">
                    <button className="btn btn--sm" disabled={age(k) < 16} onClick={() => setPromote(k)}>{A.promote}</button>
                    <button className="btn btn--ghost btn--sm" onClick={() => setLoanFor(k)}>{A.loan}</button>
                    <button className="btn btn--ghost btn--sm" onClick={() => setLetGo(k)}>{A.release}</button>
                  </span>
                </div>
              );
            })}
              </div>
            </div>
          ))}
          <div className="rows">
            {!ac.length && <p className="muted small">{A.empty}</p>}
          </div>
        </Panel>

        <div className="stack-col">
          <Panel i={2} label={A.loans}>
            <PanelHead title={A.loans} />
            <div className="rows">
              {loanees.map(({ l, p }) => {
                const from = startRating(p, c.season);
                const to = clubOf(w, l.to);
                return (
                  <div key={p.id} className="row wrap">
                    <Portrait p={p} club={g.club} size={40} />
                    <button className="grow linklike" onClick={() => g.player(p.id)}>
                      <span className="name">{nm(p, lang)}</span>
                      <span className="sub">{cn(to, lang)} · {A.mins(p.ms ?? 0)}{(p.run ?? 0) >= 2 ? ` · ${A.run(p.run!)}` : ''}</span>
                      <Meter v={Math.min(100, ((p.m5 ?? 0) / 450) * 100)} />
                    </button>
                    <Crest club={to} size={28} />
                    <span className={`num growth${p.rating > from ? ' up' : ''}`}>{A.since(from, p.rating)}</span>
                    <span className="btns">
                      <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'pathway.word', playerId: p.id })}>{A.word}</button>
                      <button className="btn btn--ghost btn--sm" disabled={!windowOf(c)} onClick={() => void g.run({ type: 'pathway.recall', playerId: p.id })}>{A.recall}</button>
                    </span>
                  </div>
                );
              })}
              {!loanees.length && <p className="muted small">{A.loansNone}</p>}
            </div>
          </Panel>

          <Panel i={3} label={A.grads}>
            <PanelHead title={A.grads} />
            <div className="rows">
              {grads.map((p) => {
                const st = c.stats[p.id];
                const first = p.rh?.length ? Math.floor(p.rh[0] % 100) : p.rating;
                return (
                  <button key={p.id} className="row linkrow" onClick={() => g.player(p.id)}>
                    <Portrait p={p} club={g.club} size={36} />
                    <span className="grow"><span className="name">{nm(p, lang)}</span><span className="sub">{x.common.pos[p.position]} · {age(p)} · {A.apps(st?.[0] ?? 0)} · {A.mins(p.ms ?? 0)}</span></span>
                    <span className={`num growth${p.rating > first ? ' up' : ''}`}>{A.since(first, p.rating)}</span>
                  </button>
                );
              })}
              {!grads.length && <p className="muted small">{A.gradsNone}</p>}
            </div>
          </Panel>
        </div>
      </div>

      {loanFor && <LoanSheet kid={loanFor} onClose={() => setLoanFor(null)} />}
      {promote && <PromoteSheet kid={promote} onClose={() => setPromote(null)} />}
      {letGo && (
        <Sheet label={A.release} onClose={() => setLetGo(null)}>
          <h2 className="h2">{A.release}</h2>
          <p>{A.releaseQ(nm(letGo, lang))}</p>
          <div className="sheet-actions">
            <button className="btn btn--ghost" onClick={() => setLetGo(null)}>{x.notNowShort}</button>
            <button className="btn btn--primary" onClick={async () => { const r = await g.run({ type: 'academy.release', id: letGo.id }, { toast: false }); if (r.ok) setLetGo(null); }}>{A.release}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// F05 (rework): promotion says what it commits the club to before the yes: squad place, contract, and the prospect
// promise the dressing room will hold him to (sim/room.ts PROSPECT_APPS in PROSPECT_WINDOW matchdays, or a loan).
export function PromoteSheet({ kid, onClose }: { kid: Player; onClose: () => void }) {
  const g = useGame();
  const { w, c, lang } = g;
  const A = Y[g.ui].ac;
  const t = promotionTerms(w, c, kid);
  return (
    <Sheet label={A.pmTitle(nm(kid, lang))} onClose={onClose}>
      <h2 className="h2">{A.pmTitle(nm(kid, lang))}</h2>
      <ul className="pm-list">
        <li>{A.pmSquad(t.squad, t.max)}</li>
        <li>{A.pmDeal(money(t.wage), t.until)}</li>
        <li><b>{A.pmPromise(PROSPECT_APPS, PROSPECT_WINDOW)}</b></li>
      </ul>
      <p className="small muted">{A.pmAlt}</p>
      <div className="sheet-actions">
        <button className="btn btn--ghost" onClick={onClose}>{g.x.notNowShort}</button>
        <button className="btn btn--primary" disabled={t.squad > t.max} onClick={async () => { const r = await g.run({ type: 'academy.promote', id: kid.id }); if (r.ok) onClose(); }}>{A.pmYes}</button>
      </div>
    </Sheet>
  );
}

export function LoanSheet({ kid, onClose }: { kid: Player; onClose: () => void }) {
  const g = useGame();
  const { w, c, lang } = g;
  const A = Y[g.ui].ac;
  const open = !!windowOf(c);
  const young = ageOf(kid, c.season) < 17;
  const spots = open && !young ? academyLoanSpots(w, c, kid, 4) : [];
  return (
    <Sheet label={A.loanTitle(nm(kid, lang))} onClose={onClose}>
      <h2 className="h2">{A.loanTitle(sn(kid, lang))}</h2>
      <p className="small muted">{A.loanSub}</p>
      {!open ? <p className="small"><span className="tag tag--warn"><I n="lock" size="sm" />{A.windowShut}</span></p>
        : young ? <p className="small"><span className="tag tag--warn"><I n="alert" size="sm" />{A.tooYoung}</span></p>
          : (
            <div className="rows">
              {spots.map((s, i) => {
                const cl = clubOf(w, s.clubId);
                // Rework §H: what the loan gives him — playing time (his role there, from who is better in his position)
                // and the level against his own.
                const L = LS[g.ui];
                const lg = w.leagues.find((l) => l.id === cl?.leagueId);
                const d = s.strength - kid.rating;
                const lvl = d >= 3 ? L.up(s.strength, kid.rating) : d <= -6 ? L.down(s.strength, kid.rating) : L.level(s.strength, kid.rating);
                return (
                  <button key={s.clubId} className="row linkrow loan-spot" onClick={async () => { const r = await g.run({ type: 'academy.loan', id: kid.id, to: s.clubId }); if (r.ok) onClose(); }}>
                    <Crest club={cl} size={32} />
                    <span className="grow">
                      <span className="name">{cn(cl, lang)}{i === 0 && s.role === 0 ? <span className="tag tag--good ls-best">{L.best}</span> : null}</span>
                      <span className="sub">{lg ? `${lg.name[lang]} · ` : ''}{L.role[s.role]}</span>
                      <span className="sub">{lvl}</span>
                    </span>
                    <span className={`tag${s.role === 0 ? ' tag--good' : s.role === 2 ? ' tag--warn' : ''}`}>{A.roles[s.role]}</span>
                    <I n="chev" size="sm" flip={g.rtl} />
                  </button>
                );
              })}
              {!spots.length && <p className="muted small">{A.noSpots}</p>}
            </div>
          )}
    </Sheet>
  );
}
