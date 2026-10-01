// V2.4 — the Dressing room: how together the squad is and why, who leads it, the three tiers, your word, and who is
// waiting on you. Plus the one-to-one talk sheet, the armband sheet and the dressing-room block on a player's profile.
// Screens only read and dispatch commands (room.talk, room.captain…); every consequence is decided in sim/room.ts.
import { useMemo, useState } from 'react';
import type { Pledge, Player, SquadRole, Tier } from '../model/types';
import { squadOf, playerOf } from '../sim/world';
import {
  archetypeOf, canTalk, cohesionOf, hierarchy, lastClosed, pledgeCheck, pledgeOf, pledgeState, roleOf, roomMood, roomOf, talkCall, talkPreview, trustOf,
  PROSPECT_APPS, ROLE_SHARE, type PledgeReq, type Tone,
} from '../sim/room';
import { AI_COH, cohLevel } from '../sim/cohesion';
import { windowOf } from '../sim/windows';
import { D } from '../lang-dressing-all';
import { I, Meter, Portrait } from './kit';
import { Panel, PanelHead, Sheet } from './shell';
import { SquadTabs } from './SquadTabs';
import { useGame, sn, nm } from './game';
import { causeText, levelText, pledgeKeyOf, pledgeWhat } from './roomText';

const MOOD_ICON = ['alert', 'alert', 'chat', 'heart', 'heart'];
const moodIx = (m: number) => (m >= 75 ? 4 : m >= 62 ? 3 : m >= 50 ? 2 : m >= 38 ? 1 : 0);
const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length));

export function Arrow({ d }: { d?: number }) {
  if (!d) return null;
  return <span className={`arw ${d > 0 ? 'up' : 'down'}`} aria-label={d > 0 ? `+${d}` : `${d}`}><I n={d > 0 ? 'up' : 'down'} size="sm" />{Math.abs(d)}</span>;
}

export function RoomScreen() {
  const g = useGame();
  const { w, c, lang, ui } = g;
  const d = D[ui];
  const H = useMemo(() => hierarchy(w, c), [w, c]);
  const squad = useMemo(() => squadOf(w, c.clubId), [w, c.clubId]);
  const room = roomOf(c);
  const coh = cohesionOf(w, c.clubId);
  const lv = cohLevel(coh) - cohLevel(AI_COH);
  const mood = roomMood(w, c);
  const head = d.mood[mood];
  const open = room.pledges.filter((p) => p.status === 'open');
  const closed = room.pledges.filter((p) => p.status !== 'open').slice(0, 3);
  const leaders = squad.filter((p) => H.get(p.id)?.tier === 'leader').sort((a, b) => H.get(b.id)!.score - H.get(a.id)!.score);
  const cap = squad.find((p) => p.captain);
  const byTier = (t: Tier) => squad.filter((p) => H.get(p.id)?.tier === t).sort((a, b) => H.get(b.id)!.score - H.get(a.id)!.score);
  const waiting = [
    ...squad.filter((p) => p.req !== undefined).map((p) => ({ p, kind: 'req' as const })),
    ...room.asks.map((a) => ({ p: playerOf(w, a.playerId)!, kind: 'ask' as const, why: a.why })).filter((x) => x.p && x.p.req === undefined),
  ];
  return (
    <div className="sc-room">
      <SquadTabs at="room" />
      <section className="h-head on-ground">
        <span className="eyebrow">{d.eyebrow(g.club.name[lang])}</span>
        <h1 className="h-hero">{head[0]}<em>{head[1]}</em>{head[2]}</h1>
        <p className="room-sub">{d.moodSub[mood]}</p>
        <div className="facts">
          <span><b>{Math.round(coh)}</b>{d.facts.coh}</span>
          <span><b>{avg(squad.map((p) => p.morale))}</b>{d.facts.morale}</span>
          <span><b>{avg(squad.map(trustOf))}</b>{d.facts.trust}</span>
          <span><b>{open.length}</b>{d.facts.open(open.length)}</span>
        </div>
      </section>

      <div className="grid">
        <Panel className="g-coh" i={1} label={d.coh.title}>
          <PanelHead title={d.coh.title} right={<span className={`tag ${lv >= 0.2 ? 'tag--good' : lv <= -0.2 ? 'tag--bad' : ''}`}><I n="room" size="sm" />{levelText(lv)}</span>} />
          <div className="coh-big"><span className="v num">{Math.round(coh)}</span><span className="small muted">{d.coh.worth(levelText(lv))}</span></div>
          <div className="coh-bar" aria-hidden="true"><Meter v={coh} tone={coh < 40 ? 'bad' : coh < 50 ? 'warn' : undefined} mark={AI_COH} /></div>
          <div className="coh-scale" aria-hidden="true">{d.coh.scale.map((s) => <span key={s}>{s}</span>)}</div>
          <h3 className="h3 coh-h">{d.coh.causes}</h3>
          {room.causes.length ? (
            <div className="causes">
              {room.causes.filter((x) => x.k !== 'drift').slice(0, 3).map((x, i) => (
                <div key={i} className="cause-row"><span className="grow">{causeText(d, x, lang)}</span><b className={x.d >= 0 ? 'up' : 'down'}>{x.d > 0 ? '+' : '−'}{Math.abs(x.d).toFixed(1)}</b></div>
              ))}
            </div>
          ) : <p className="small muted">{d.coh.none}</p>}
          <p className="small muted coh-how">{d.coh.how}</p>
        </Panel>

        <Panel className="g-lead" i={2} label={d.tiers.leader}>
          <PanelHead title={d.tiers.leader} right={<button className="link" onClick={() => g.sheet({ k: 'armband' })}><I n="star" size="sm" />{d.armband}</button>} />
          <p className="small muted">{d.leadersSub}</p>
          <div className="leaders">
            {leaders.map((p) => {
              const m = moodIx(p.morale);
              return (
                <button key={p.id} className="leader" onClick={() => g.player(p.id)}>
                  <Portrait p={p} club={g.club} size={52} />
                  <span className="grow">
                    <b className="name">{sn(p, lang)}{p.captain && <span className="cap" aria-label={d.captain}>C</span>}</b>
                    <span className="sub">{d.arch[archetypeOf(p)]}</span>
                  </span>
                  <span className={`mood${m <= 1 ? ' bad' : m === 2 ? ' meh' : ''}`} title={g.x.player.moods[m]}><I n={MOOD_ICON[m]} /></span>
                </button>
              );
            })}
          </div>
          {!cap && <p className="small warnline"><I n="alert" size="sm" />{d.noCaptain}</p>}
        </Panel>

        <Panel className="g-tiers" i={3} label={d.title}>
          {(['core', 'fringe'] as Tier[]).map((t) => (
            <div key={t} className="tier">
              <div className="between"><h3 className="h3">{d.tiers[t]}</h3><span className="small muted">{d.tierSub[t]}</span></div>
              <div className="chips-p">
                {byTier(t).map((p) => {
                  const m = moodIx(p.morale);
                  return (
                    <button key={p.id} className="pchip" onClick={() => g.player(p.id)}>
                      <span className={`dot${m <= 1 ? ' bad' : m === 2 ? ' meh' : ''}`} aria-hidden="true" />
                      <span className="nm">{sn(p, lang)}</span>
                      {p.req !== undefined && <I n="alert" size="sm" />}
                      {pledgeOf(c, p.id) && <I n="handshake" size="sm" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Panel>

        <Panel className="g-word" i={4} label={d.word}>
          <PanelHead title={d.word} right={<span className="eyebrow">{open.length} · {d.facts.open(open.length)}</span>} />
          {!open.length && !closed.length && <p className="small muted">{d.noWord}</p>}
          {open.map((pl) => <PledgeRow key={pl.id} pl={pl} />)}
          {closed.map((pl) => <PledgeRow key={pl.id} pl={pl} />)}
        </Panel>

        <Panel className="g-wait" i={5} label={d.waiting}>
          <PanelHead title={d.waiting} />
          {!waiting.length ? <p className="small muted">{d.talk.none}</p> : (
            <div className="rows">
              {waiting.map((x) => (
                <div key={x.p.id} className="row wait-row">
                  <Portrait p={x.p} club={g.club} size={40} />
                  <span className="grow"><span className="name">{nm(x.p, lang)}</span><span className="sub">{x.kind === 'req' ? (x.p.reqNo ? d.player.refused : d.unsettled) : d.talk.why[x.why!]}</span></span>
                  <button className="btn btn--primary btn--sm" onClick={() => g.sheet({ k: 'talk', id: x.p.id })}><I n="chat" size="sm" />{d.talkBtn}</button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// One promise: who, what, where it stands, a starts strip for role promises.
function PledgeRow({ pl }: { pl: Pledge }) {
  const g = useGame();
  const d = D[g.ui];
  const p = playerOf(g.w, pl.playerId);
  const s = pledgeState(pl);
  const key = pledgeKeyOf(pl);
  const st = pl.status === 'kept' ? 'kept' : pl.status === 'broken' ? 'broken' : s.lost ? 'lost' : s.slipping ? 'slip' : 'open';
  const tone = st === 'kept' || st === 'open' ? 'tag--good' : st === 'slip' ? 'tag--warn' : 'tag--bad';
  const line = pl.status === 'kept' ? d.progress.kept : pl.status === 'broken' ? d.progress.broken
    : pl.type === 'role' ? (pl.role === 'prospect' ? d.progress.prospect(pl.apps, s.left) : d.progress.role(pl.st, pl.el, Math.round(ROLE_SHARE[pl.role!] * 100), s.left))
    : pl.type === 'contract' ? d.progress.contract(Math.max(0, pl.due - (g.c.coach.days ?? 0))) : pl.type === 'sign' ? d.progress.sign() : d.progress.keep();
  const cells = pl.type === 'role' && pl.status === 'open' ? (pl.role === 'prospect'
    ? Array.from({ length: PROSPECT_APPS }, (_, i) => (i < pl.apps ? 'y' : ''))
    : Array.from({ length: pl.due }, (_, i) => (i < pl.st ? 'y' : i < pl.el ? 'n' : ''))) : [];
  return (
    <button className="promise" onClick={() => p && g.player(p.id)}>
      <span className="between"><b>{sn({ name: pl.pn, short: p?.short }, g.lang)} · {pledgeWhat(d, key)}</b><span className={`tag ${tone}`}><I n={st === 'kept' || st === 'open' ? 'check' : 'alert'} size="sm" />{d.status[st]}</span></span>
      {cells.length > 0 && <span className="prog" style={{ ['--n' as string]: cells.length }} aria-hidden="true">{cells.map((x, i) => <i key={i} className={x} />)}</span>}
      <span className="pl-line">{line}</span>
    </button>
  );
}

// ---------- the one-to-one ----------
export function TalkSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const g = useGame();
  const { w, c, lang, ui } = g;
  const d = D[ui];
  const p = playerOf(w, id);
  const [stage, setStage] = useState<'pick' | 'promise' | 'done'>('pick');
  const [out, setOut] = useState<{ reply: string; dm: number; dt: number; withdrew: boolean } | null>(null);
  const [no, setNo] = useState<string | null>(null);
  const [type, setType] = useState<PledgeReq['type']>('role');
  const [role, setRole] = useState<SquadRole>('starter');
  const [group, setGroup] = useState(1);
  if (!p) return null;
  const ok = canTalk(w, c, p);
  const call = ok.ok ? talkCall(w, c, p, ok.why) : null;
  const staff = c.ops.staff.psychologist ?? c.ops.staff.assistant;
  const say = async (tone: Tone, pledge?: PledgeReq) => {
    const r = await g.run({ type: 'room.talk', playerId: p.id, tone, pledge }, { toast: false });
    if (!r.ok) { setNo(d.no[r.reason] ?? g.x.bid.no[r.reason] ?? r.reason); return; }
    const [reply, dt, wd] = (r.note?.s ?? '').split('|');
    setOut({ reply, dm: r.note?.n ?? 0, dt: Number(dt) || 0, withdrew: wd === '1' });
    setStage('done');
  };
  const q: PledgeReq = type === 'role' ? { type, role } : type === 'sign' ? { type, group } : { type };
  const bad = stage === 'promise' ? pledgeCheck(w, c, p, q) : null;
  const pv = (tone: Tone) => talkPreview(w, c, p, tone);
  const fx = (tone: Tone) => { const v = pv(tone); return [v.dm ? d.talk.delta(d.morale, v.dm) : '', v.dt ? d.talk.delta(d.trust, v.dt) : ''].filter(Boolean).join(' · '); };
  const openRole = () => { setStage('promise'); setType(call?.pledge?.type ?? 'role'); if (call?.pledge?.role) setRole(call.pledge.role); else setRole(roleOf(w, c, p)); };
  return (
    <Sheet label={d.talk.title(nm(p, lang))} onClose={onClose}>
      <div className="sheet-head">
        <Portrait p={p} club={g.club} size={56} />
        <div className="grow"><h2 className="h2">{d.talk.title(sn(p, lang))}</h2>
          <span className="small muted">{d.arch[archetypeOf(p)]} · {d.role[roleOf(w, c, p)]} · {d.trust} {trustOf(p)} · {d.morale} {p.morale}</span></div>
      </div>
      <div className="talk-sheet">
        {stage !== 'done' && (
          <p className="why-now"><I n={ok.ok ? 'chat' : 'clock'} size="sm" />{ok.ok ? d.talk.why[ok.why] : ok.reason === 'wait' ? d.talk.wait : d.talk.none}</p>
        )}
        {stage === 'pick' && ok.ok && (
          <>
            {call && staff && <p className="small muted staff-read"><b>{d.talk.staff}:</b> {d.archSub[archetypeOf(p)]}</p>}
            <div className="tones">
              {(['reassure', 'challenge', 'promise'] as Tone[]).map((tone) => (
                <button key={tone} className={`tone-btn${call?.tone === tone ? ' pick' : ''}`} onClick={() => (tone === 'promise' ? openRole() : void say(tone))}>
                  <span className="grow"><b>{d.talk.tones[tone][0]}</b><span>{d.talk.tones[tone][1]}</span>{tone !== 'promise' && <em>{fx(tone)}</em>}</span>
                  {call?.tone === tone ? <span className="pickmark"><I n="check" size="sm" />{g.x.dec.staffPick}</span> : <I n="chev" size="sm" />}
                </button>
              ))}
            </div>
          </>
        )}
        {stage === 'promise' && (
          <>
            <h3 className="h3">{d.talk.choose}</h3>
            <div className="chips chips--scroll" role="group" aria-label={d.talk.choose}>
              {(['role', 'contract', 'keep', 'sign'] as PledgeReq['type'][]).map((t) => (
                <button key={t} className="chip" aria-pressed={type === t} disabled={(t === 'keep' || t === 'sign') && !windowOf(c)} onClick={() => setType(t)}>{d.talk.types[t]}</button>
              ))}
            </div>
            {type === 'role' && (
              <div className="role-pick">
                {(['star', 'starter', 'rotation', 'prospect'] as SquadRole[]).map((r) => (
                  <button key={r} className="tone-btn" aria-pressed={role === r} onClick={() => setRole(r)}><span className="grow"><b>{d.role[r]}</b><span>{d.roleSub[r]}</span></span>{role === r && <I n="check" size="sm" />}</button>
                ))}
              </div>
            )}
            {type === 'sign' && (
              <div className="chips" role="group" aria-label={d.talk.signPos}>
                {d.groups.map((gr, i) => <button key={gr} className="chip" aria-pressed={group === i} onClick={() => setGroup(i)}>{gr}</button>)}
              </div>
            )}
            <p className="bind"><I n="doc" size="sm" />{d.talk.bind[type === 'role' ? `role.${role}` : type]}</p>
            {bad && <div className="refusal" role="alert"><I n="alert" size="sm" /><span className="grow">{d.no[`dr.${bad}`]}</span></div>}
            <p className="small muted">{fx('promise')}</p>
            <div className="sheet-actions">
              <button className="btn btn--ghost" onClick={() => setStage('pick')}>{d.talk.back}</button>
              <button className="btn btn--accent" disabled={!!bad} onClick={() => void say('promise', q)}><I n="handshake" size="sm" />{d.talk.giveBtn}</button>
            </div>
          </>
        )}
        {stage === 'done' && out && (
          <div className="reply">
            <q>{d.talk.reply[out.reply] ?? ''}</q>
            <div className="fx">
              {out.dm !== 0 && <span className={`tag ${out.dm > 0 ? 'tag--good' : 'tag--bad'}`}><I n="heart" size="sm" />{d.talk.delta(d.morale, out.dm)}</span>}
              {out.dt !== 0 && <span className={`tag ${out.dt > 0 ? 'tag--good' : 'tag--bad'}`}><I n="handshake" size="sm" />{d.talk.delta(d.trust, out.dt)}</span>}
            </div>
            {out.withdrew && <p className="small"><I n="check" size="sm" /> {d.talk.withdrew}</p>}
          </div>
        )}
        {no && <div className="refusal" role="alert"><I n="alert" size="sm" /><span className="grow">{no}</span></div>}
        {(stage === 'done' || !ok.ok) && <div className="sheet-actions"><button className="btn btn--primary" onClick={onClose}>{d.talk.done}</button></div>}
      </div>
    </Sheet>
  );
}

// ---------- the armband ----------
export function ArmbandSheet({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const { w, c, lang, ui } = g;
  const d = D[ui];
  const H = hierarchy(w, c);
  const list = squadOf(w, c.clubId).filter((p) => H.get(p.id)!.tier !== 'fringe').sort((a, b) => H.get(b.id)!.score - H.get(a.id)!.score);
  const give = async (p: Player) => { const r = await g.run({ type: 'room.captain', playerId: p.id }, { toast: false }); if (r.ok) { g.toast(`${d.captain}: ${nm(p, lang)}`); onClose(); } };
  return (
    <Sheet label={d.pickCaptain} onClose={onClose}>
      <h2 className="h2">{d.pickCaptain}</h2>
      <p className="small muted">{d.pickCaptainSub}</p>
      <div className="rows arm-list">
        {list.map((p) => (
          <button key={p.id} className="row linkrow" disabled={!!p.captain} onClick={() => void give(p)}>
            <Portrait p={p} club={g.club} size={40} />
            <span className="grow"><span className="name">{nm(p, lang)}{p.captain && <span className="cap">C</span>}</span><span className="sub">{d.tiers[H.get(p.id)!.tier]} · {d.arch[archetypeOf(p)]}</span></span>
            {!p.captain && <I n="chev" size="sm" />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

// ---------- on a player's profile ----------
export function PlayerRoom({ p }: { p: Player }) {
  const g = useGame();
  const { w, c, ui } = g;
  const d = D[ui];
  const H = hierarchy(w, c);
  const tier = H.get(p.id)?.tier;
  const pl = pledgeOf(c, p.id);
  const last = lastClosed(c, p.id);
  const ask = roomOf(c).asks.find((a) => a.playerId === p.id);
  const cause = (x?: [number, string]) => (x ? d.player.last(d.cause2[x[1]] ?? x[1]) : '');
  return (
    <div className="p-room">
      <div className="traits">
        {tier && <span className={`tag${tier === 'leader' ? ' tag--club' : ''}`}><I n="room" size="sm" />{d.tiers[tier]}</span>}
        <span className="tag" title={d.archSub[archetypeOf(p)]}><I n="chat" size="sm" />{d.arch[archetypeOf(p)]}</span>
        <span className="tag"><I n="shirt" size="sm" />{d.role[roleOf(w, c, p)]}</span>
        {p.req !== undefined && <span className="tag tag--bad"><I n="alert" size="sm" />{p.reqNo ? d.player.refused : d.player.wantsOut}</span>}
        {ask && <span className="tag tag--warn"><I n="chat" size="sm" />{d.player.wantsWord}</span>}
      </div>
      <div className="tm">
        <div><span className="l">{d.trust}</span><b className="num">{trustOf(p)}</b><Arrow d={p.dt?.[0]} /><span className="c">{cause(p.dt)}</span><Meter v={trustOf(p)} tone={trustOf(p) < 25 ? 'bad' : trustOf(p) < 40 ? 'warn' : undefined} /></div>
        <div><span className="l">{d.morale}</span><b className="num">{p.morale}</b><Arrow d={p.dm?.[0]} /><span className="c">{cause(p.dm)}</span><Meter v={p.morale} tone={p.morale < 38 ? 'bad' : p.morale < 50 ? 'warn' : undefined} /></div>
      </div>
      {pl && <PledgeChip pl={pl} />}
      {!pl && last && <div className={`word ${last.status}`}><I n={last.status === 'kept' ? 'check' : 'alert'} size="sm" /><span>{(last.status === 'kept' ? d.player.kept : d.player.broken)(pledgeWhat(d, pledgeKeyOf(last)))}</span></div>}
    </div>
  );
}
function PledgeChip({ pl }: { pl: Pledge }) {
  const g = useGame();
  const d = D[g.ui];
  const s = pledgeState(pl);
  return (
    <div className={`word open${s.slipping ? ' slip' : ''}`}>
      <I n="handshake" size="sm" />
      <span>{d.player.word(pledgeWhat(d, pledgeKeyOf(pl)))}{pl.type === 'role' && pl.role !== 'prospect' ? ` · ${pl.st}/${pl.el}` : pl.type === 'role' ? ` · ${pl.apps}/${PROSPECT_APPS}` : ''}</span>
    </div>
  );
}
