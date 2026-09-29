// What one of the user's matches changed: result, table position, board, fans, development points, who's out,
// the man of the match, new club records and milestones. Shown as a card after every match.
import type { Career, LocalizedName, Records } from '../model/types';
import type { LiveMatch } from './match';
import { matchRatings } from './ratings';
import { table } from './season';
import { playerOf, type World } from './world';
import { explain, type Why } from './engine/story';

export interface Aftermath {
  res: 'W' | 'D' | 'L'; mine: number; theirs: number; pens?: [number, number]; opp: string; home: boolean;
  pos: [number, number] | null; board: [number, number]; fans: [number, number]; dev: number;
  out: { pn: LocalizedName; n: number; ban: boolean }[];
  motm: { pn: LocalizedName; rating: number; mine: boolean } | null;
  records: (keyof Records)[]; milestones: string[];
  why?: Why;               // engine v2: why it happened (the user's recorded match)
}

export function aftermath(w0: World, c0: Career, w1: World, c1: Career, m: LiveMatch): Aftermath | null {
  const idx = m.sides[0].clubId === c0.clubId ? 0 : m.sides[1].clubId === c0.clubId ? 1 : -1;
  if (idx < 0) return null;
  const k = idx as 0 | 1;
  const o = (1 - k) as 0 | 1;
  const mine = m.goals[k], theirs = m.goals[o];
  const pk = m.pens ? (m.pens[k] > m.pens[o] ? 'W' : 'L') : null;
  const res: Aftermath['res'] = mine > theirs ? 'W' : mine < theirs ? 'L' : pk ?? 'D';
  const lid = w0.clubs.find((x) => x.id === c0.clubId)!.leagueId;
  const place = (w: World, c: Career) => table(w, c, lid).findIndex((x) => x.clubId === c0.clubId) + 1;
  const played = (c: Career) => (c.fixtures[lid] ?? []).some((g) => g.some((f) => f[2] >= 0 && (f[0] === c0.clubId || f[1] === c0.clubId)));
  const pos: [number, number] | null = m.cup ? null : [played(c0) ? place(w0, c0) : 0, place(w1, c1)];
  const get = (id: string) => playerOf(w1, id) ?? playerOf(w0, id)!;
  const out = m.events
    .filter((e) => (e.kind === 'injury' || e.kind === 'red') && e.side === k)
    .map((e) => ({ pn: get(e.playerId).name, n: e.kind === 'injury' ? playerOf(w1, e.playerId)?.injured ?? e.out ?? 1 : playerOf(w1, e.playerId)?.banned ?? 1, ban: e.kind === 'red' }));
  const rt = matchRatings(m, get);
  const mp = rt.motm ? get(rt.motm) : null;
  const motmMine = !!rt.motm && m.sides[k].onPitch.concat(m.sides[k].bench).concat(m.events.filter((e) => e.side === k && e.inId).map((e) => e.inId!)).includes(rt.motm);
  const records = (Object.keys(c1.records ?? {}) as (keyof Records)[]).filter((key) => JSON.stringify(c1.records?.[key]) !== JSON.stringify(c0.records?.[key]));
  const milestones = (c1.coach?.milestones ?? []).filter((id) => !(c0.coach?.milestones ?? []).includes(id));
  return {
    res, mine, theirs, pens: m.pens ? [m.pens[k], m.pens[o]] : undefined, opp: m.sides[o].clubId, home: k === 0,
    pos, board: [c0.board.confidence, c1.board.confidence], fans: [c0.board.fans, c1.board.fans], dev: c1.ops.devPoints - c0.ops.devPoints,
    out, motm: mp ? { pn: mp.name, rating: rt.rating[rt.motm], mine: motmMine } : null, records, milestones,
    why: m.full && m.tl ? explain(m, k, get) : undefined,
  };
}
