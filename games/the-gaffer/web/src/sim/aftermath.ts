// What one of the user's matches changed: result, table position, board, fans, dressing room, who's out, ratings,
// the man of the match, new club records and milestones, and why it happened. Shown on the full-time screen.
// V2.2: everything here is read from the MatchRecord (sim/record.ts) and the career before and after it.
import type { Career, LocalizedName, Records } from '../model/types';
import type { LiveMatch } from './match';
import { table } from './season';
import { playerOf, squadOf, type World } from './world';
import type { Why } from './engine/story';
import { toRecord, type KeyMoment, type MatchRecord } from './record';
import { cohesionOfClub } from './cohesion';
import { banOf } from './discipline';
import type { Player } from '../model/types';

// gf-ref: the ban from this match's competition (a cup red keeps him out of that cup, not the league).
const banLeft = (p: Player | undefined, comp: string | undefined) => (p ? Math.max(1, comp ? banOf(p, comp) : p.banned) : 1);

export interface Aftermath {
  res: 'W' | 'D' | 'L'; mine: number; theirs: number; pens?: [number, number]; opp: string; home: boolean; me: 0 | 1;
  pos: [number, number] | null; board: [number, number]; fans: [number, number]; room: [number, number]; dev: number;
  out: { pn: LocalizedName; n: number; ban: boolean }[];
  motm: { pn: LocalizedName; rating: number; mine: boolean; id: string } | null;
  ratings: { id: string; pn: LocalizedName; short?: string; num: number; rating: number; mins: number }[]; // the user's side, best first
  records: (keyof Records)[]; milestones: string[];
  xg: [number, number];                       // [ours, theirs]
  xgLine: [number[], number[]];               // cumulative xG per minute 0..90, ours and theirs
  scorers: { side: 0 | 1; pn: LocalizedName; min: number }[];
  moments: KeyMoment[];
  why?: Why;                                  // engine v2: why it happened (the user's recorded match)
  key: string; cup?: string; round: number;
  coh?: [number, number];                     // v2.4: team cohesion before and after (the engine played it at [0])
  ref?: MatchRecord['ref'];                   // gf-ref: the referee and his numbers
  cards: { side: 0 | 1; pn: LocalizedName; min: number; plus?: number; k: 'Y' | 'YR' | 'R' }[]; // gf-ref
  vars: { side: 0 | 1; min: number; plus?: number; note: string; pn: LocalizedName }[];          // gf-ref
  pensGiven: number;                          // gf-ref: penalties given (both sides)
  added?: number[];                           // gf-ref: added time shown
}

const moraleOf = (w: World, clubId: string) => { const s = squadOf(w, clubId); return Math.round(s.reduce((a, p) => a + p.morale, 0) / Math.max(1, s.length)); };

export function aftermath(w0: World, c0: Career, w1: World, c1: Career, m: LiveMatch): Aftermath | null {
  const idx = m.sides[0].clubId === c0.clubId ? 0 : m.sides[1].clubId === c0.clubId ? 1 : -1;
  if (idx < 0) return null;
  const k = idx as 0 | 1;
  const o = (1 - k) as 0 | 1;
  const get = (id: string) => playerOf(w1, id) ?? playerOf(w0, id)!;
  const rec = toRecord(m, get, k);
  const mine = rec.goals[k], theirs = rec.goals[o];
  const pk = rec.pens ? (rec.pens[k] > rec.pens[o] ? 'W' : 'L') : null;
  const res: Aftermath['res'] = mine > theirs ? 'W' : mine < theirs ? 'L' : pk ?? 'D';
  const lid = w0.clubs.find((x) => x.id === c0.clubId)!.leagueId;
  const place = (w: World, c: Career) => table(w, c, lid).findIndex((x) => x.clubId === c0.clubId) + 1;
  const played = (c: Career) => (c.fixtures[lid] ?? []).some((g) => g.some((f) => f[2] >= 0 && (f[0] === c0.clubId || f[1] === c0.clubId)));
  const pos: [number, number] | null = rec.cup ? null : [played(c0) ? place(w0, c0) : 0, place(w1, c1)];
  const out = rec.events
    .filter((e) => (e.kind === 'injury' || e.kind === 'red') && e.side === k)
    .map((e) => ({ pn: get(e.playerId).name, n: e.kind === 'injury' ? playerOf(w1, e.playerId)?.injured ?? e.out ?? 1 : banLeft(playerOf(w1, e.playerId), rec.comp ?? rec.cup), ban: e.kind === 'red' }));
  const mp = rec.motm ? get(rec.motm) : null;
  const records = (Object.keys(c1.records ?? {}) as (keyof Records)[]).filter((key) => JSON.stringify(c1.records?.[key]) !== JSON.stringify(c0.records?.[key]));
  const milestones = (c1.coach?.milestones ?? []).filter((id) => !(c0.coach?.milestones ?? []).includes(id));
  const ratings = Object.entries(rec.ratings).filter(([id]) => rec.sideOf[id] === k)
    .map(([id, v]) => { const p = get(id); return { id, pn: p.name, short: p.short, num: p.shirtNumber, rating: v, mins: rec.minutes[id] ?? 0 }; })
    .sort((a, b) => b.rating - a.rating);
  const line = (side: 0 | 1) => {
    const end = Math.max(90, m.minute);
    const pts = new Array(end + 1).fill(0);
    for (const e of rec.events) {
      const shooter = (e.kind === 'save' ? 1 - e.side : e.side) as 0 | 1;
      if ((e.kind === 'goal' || e.kind === 'miss' || e.kind === 'save' || e.kind === 'block') && shooter === side && e.xg) pts[Math.min(end, e.min)] += e.xg;
    }
    for (let i = 1; i < pts.length; i++) pts[i] += pts[i - 1];
    return pts.map((v) => Math.round(v * 100) / 100);
  };
  return {
    res, mine, theirs, pens: rec.pens ? [rec.pens[k], rec.pens[o]] : undefined, opp: m.sides[o].clubId, home: k === 0, me: k,
    pos, board: [c0.board.confidence, c1.board.confidence], fans: [c0.board.fans, c1.board.fans], room: [moraleOf(w0, c0.clubId), moraleOf(w1, c1.clubId)], dev: 0,
    out, motm: mp ? { pn: mp.name, rating: rec.ratings[rec.motm], mine: rec.sideOf[rec.motm] === k, id: rec.motm } : null, ratings, records, milestones,
    xg: [rec.xg[k], rec.xg[o]], xgLine: [line(k), line(o)],
    scorers: rec.events.filter((e) => e.kind === 'goal').map((e) => ({ side: e.side, pn: get(e.playerId).name, min: e.min })),
    moments: rec.moments, why: rec.why ?? undefined, key: rec.key, cup: rec.cup, round: rec.round,
    coh: [m.sides[k].coh ?? cohesionOfClub(w0.clubs, c0.clubId), cohesionOfClub(w1.clubs, c0.clubId)],
    ref: rec.ref, added: m.added, pensGiven: rec.events.filter((e) => e.kind === 'pen').length,
    cards: rec.events.filter((e) => e.kind === 'red' || (e.kind === 'yellow' && !rec.events.some((x) => x.kind === 'red' && x.how === '2y' && x.playerId === e.playerId && x.min === e.min && (x.plus ?? 0) === (e.plus ?? 0))))
      .map((e) => ({ side: e.side, pn: get(e.playerId).name, min: e.min, ...(e.plus ? { plus: e.plus } : {}), k: e.kind === 'yellow' ? 'Y' as const : e.how === '2y' ? 'YR' as const : 'R' as const })),
    vars: rec.events.filter((e) => e.kind === 'var').map((e) => ({ side: e.side, min: e.min, ...(e.plus ? { plus: e.plus } : {}), note: e.note ?? '', pn: get(e.playerId).name })),
  };
}
