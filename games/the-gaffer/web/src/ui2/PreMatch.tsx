// The tunnel: the one moment before kick-off where the screen breathes. Team sheets, the last word in the dressing
// room, the odds, and three ways in: walk out, just the result, or sim on to the next decision.
import { RefLine } from './Officials';
import { isDerby } from '../sim/rivalry';
import { CL } from '../lang-club-all';
import { RF } from '../lang-ref-all';
import { squadOf } from '../sim/world';
import { useMemo, useState } from 'react';
import { nextUserMatch, table, leagueOf } from '../sim/season';
import { predict, expected, type Talk } from '../sim/match';
import { playerOf } from '../sim/world';
import { attendance, capacityOf } from '../sim/economy';
import { FORMATIONS } from '../sim/tactics';
import { dateOf, shortDate } from '../sim/calendar';
import { Crest, I, Portrait } from './kit';
import { Panel, PanelHead } from './shell';
import { useGame, clubOf, cn, sn, matchLabel } from './game';

export function PreMatch() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const m = useMemo(() => nextUserMatch(w, c), [w, c]);
  // Our three words map onto the engine's team talks: fire them up (1), focus (3), calm them down (2).
  const TALK: Talk[] = [1, 3, 2];
  const [talk, setTalkState] = useState<Talk>(g.c.talk ?? 0);
  if (!m) return null;
  const me = (m.sides[0].clubId === c.clubId ? 0 : 1) as 0 | 1;
  const home = clubOf(w, m.sides[0].clubId)!, away = clubOf(w, m.sides[1].clubId)!;
  const opp = me === 0 ? away : home;
  const get = (id: string) => playerOf(w, id)!;
  const p = predict(m, get);
  const win = me === 0 ? p[0] : p[2];
  const xg = expected(m, get).xg;
  const cap = capacityOf(c.ops);
  const crowd = me === 0 ? attendance(w, c, c.ops.ticket) : Math.round(cap * 0.08);
  const rows = m.cup ? [] : table(w, c, leagueOf(w, c.clubId));
  const myPos = rows.findIndex((r) => r.clubId === c.clubId) + 1;
  const oppRow = rows.find((r) => r.clubId === opp.id);
  const myRow = rows.find((r) => r.clubId === c.clubId);
  const upPos = myRow && oppRow ? rows.filter((r) => r.pts > myRow.pts + 3 || (r.pts === myRow.pts + 3 && r.clubId !== c.clubId)).length + 1 : myPos;
  const date = dateOf(c.season, m.round, !!m.cup);
  const stakes = m.cup ? x.pre.stakesCup(matchLabel(g, m).split(' · ').pop() ?? '') : myRow && oppRow && Math.abs(myRow.pts - oppRow.pts) <= 6 ? x.pre.stakesUp(cn(opp, lang), x.place(Math.max(1, Math.min(myPos, upPos)))) : x.pre.stakesPlain;
  const cap0 = (s: 0 | 1) => { const sd = m.sides[s]; const pid = sd.pieces.captain || sd.onPitch[0]; return get(pid); };
  const sheet = (s: 0 | 1) => {
    const sd = m.sides[s];
    const slots = FORMATIONS[sd.tactics.formation].slots;
    return sd.onPitch.map((id, i) => ({ id, p: get(id), pos: slots[i]?.pos ?? get(id).position }));
  };
  const bars = [3, 2, 1];
  // gf-ref: our players suspended for this competition.
  const banned = squadOf(w, c.clubId).filter((p) => (m.cup ? (p.sus?.[m.cup] ?? 0) > 0 : p.banned > 0));
  return (
    <div className="sc-pre">
      <header className="topbar on-ground">
        <div className="club">
          <button className="icon-btn" aria-label={x.back} onClick={() => g.go({ s: 'today' })}><I n="back" /></button>
          <div className="grow"><b>{matchLabel(g, m)}</b><small>{shortDate(date, g.ui)}</small></div>
        </div>
      </header>
      <div className="grid">
        <section className="tunnel g-t" aria-label={`${cn(home, lang)} v ${cn(away, lang)}`}>
          <svg className="walls" viewBox="0 0 400 440" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="wl" x1="0" x2="1"><stop offset="0" stopColor="#03110F" /><stop offset="1" stopColor="#0B2E28" /></linearGradient>
              <linearGradient id="wr" x1="1" x2="0"><stop offset="0" stopColor="#03110F" /><stop offset="1" stopColor="#0B2E28" /></linearGradient>
              <linearGradient id="fl" y1="1" y2="0"><stop offset="0" stopColor="#010807" /><stop offset="1" stopColor="#123E36" /></linearGradient>
            </defs>
            <polygon points="0,0 140,132 140,254 0,440" fill="url(#wl)" /><polygon points="400,0 260,132 260,254 400,440" fill="url(#wr)" />
            <polygon points="0,0 400,0 260,132 140,132" fill="#020D0C" /><polygon points="0,440 140,254 260,254 400,440" fill="url(#fl)" />
            <g fill="#CFFFF0" opacity=".55"><rect x="190" y="6" width="20" height="6" rx="2" /><rect x="193" y="40" width="14" height="4" rx="1.5" /><rect x="195" y="70" width="10" height="3" rx="1" /><rect x="196.5" y="95" width="7" height="2" rx="1" /><rect x="197.5" y="114" width="5" height="1.5" /></g>
            <g stroke="#1A4A42" strokeWidth="1.5"><line x1="0" y1="440" x2="140" y2="254" /><line x1="400" y1="440" x2="260" y2="254" /></g>
          </svg>
          <span className="beam l" /><span className="beam r" />
          <span className="mouth" />
          <div className="walkers" aria-hidden="true"><Portrait p={cap0(0)} club={home} bare /><Portrait p={cap0(1)} club={away} bare /></div>
          <div className="over">
            {isDerby(home.id, away.id) && <span className="tag tag--warn"><I n="fans" size="sm" />{CL[g.ui].derby}</span>}
            <span className="crowd">{me === 0 ? x.pre.crowd(crowd.toLocaleString(g.ui === 'ar' ? 'ar-EG' : g.ui), cn(home, lang)) : x.pre.crowdAway(crowd.toLocaleString(g.ui === 'ar' ? 'ar-EG' : g.ui))}</span>
            <h1 className="h-hero">{home.shortName && lang === 'en' ? home.shortName : cn(home, lang)} v {away.shortName && lang === 'en' ? away.shortName : cn(away, lang)}.</h1>
            <p className="stakes">{stakes}</p>
            <p className="refpre"><RefLine m={m} /></p>
            {banned.length > 0 && <p className="refpre"><span className="tag tag--bad"><I n="x" size="sm" />{RF[g.ui].outSuspended(banned.map((p) => sn(p, lang)).join(', '))}</span></p>}
          </div>
        </section>

        <Panel i={1} label={x.pre.sheets}>
          <PanelHead title={x.pre.sheets} right={<span className="eyebrow">{x.pre.confirmed}</span>} />
          <div className="sheet-cols">
            {([0, 1] as const).map((s) => (
              <div key={s}>
                <div className="xi-h"><Crest club={s === 0 ? home : away} size={22} /><span>{cn(s === 0 ? home : away, lang)} · <span className="ltr">{m.sides[s].tactics.formation}</span></span></div>
                <div className="xi">
                  {sheet(s).map((r) => <div key={r.id}><span className="n">{r.p.shirtNumber}</span><span className="nm">{sn(r.p, lang)}</span><span className="p">{x.common.pos[r.pos]}</span></div>)}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel i={2} label={x.pre.talk}>
          <PanelHead title={x.pre.talk} />
          <div className="talk">
            {x.pre.talks.map(([a, b], i) => (
              <button key={i} aria-pressed={talk === TALK[i]} onClick={() => { setTalkState(TALK[i]); void g.run({ type: 'talk.set', talk: TALK[i] }, { toast: false }); }}>
                <b>{a}</b><span>{b}</span>
                <span className="r" aria-hidden="true">{[0, 1, 2].map((k) => <i key={k} className={k < bars[i] ? 'on' : ''} />)}</span>
              </button>
            ))}
          </div>
        </Panel>

        <div className="stack">
          <Panel i={3}>
            <div className="facts">
              <div className="kpi"><span className="v">{Math.round(win * 100)}%</span><span className="l">{x.pre.winChance}</span></div>
              <div className="kpi"><span className="v">{xg[me].toFixed(1)}</span><span className="l">{x.pre.ourXg}</span></div>
              <div className="kpi"><span className="v">{xg[1 - me].toFixed(1)}</span><span className="l">{x.pre.theirXg}</span></div>
            </div>
          </Panel>
          <div className="go">
            <button className="btn btn--accent" disabled={g.busy} onClick={() => g.play('live')}><I n="whistle" />{x.pre.walk}</button>
            <button className="btn btn--ghost on-ground" disabled={g.busy} onClick={() => g.play('quick')}><I n="ff" />{x.pre.result}</button>
            <button className="btn btn--ghost on-ground" disabled={g.busy} onClick={() => g.play('sim')}><I n="clock" />{x.pre.sim}</button>
            <p className="meta center dimg">{x.pre.simSub}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
