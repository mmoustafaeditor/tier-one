// Discipline after the whistle (gf-ref): suspensions from a match's cards, per competition, from the competition's
// own rules (sim/competitions.ts). A league ban is `player.banned` (counted down on league matchdays, season.ts); a
// cup ban is `player.sus[cupId]` (counted down when his club plays in that cup). Yellow cards are counted per
// competition in `player.yc`, reset at the end of the season.
import type { Player } from '../model/types';
import type { MatchRecord } from './record';
import { accumBan, compKind, redBansOf } from './competitions';

export function banOf(p: Player, comp: string): number {
  return compKind(comp) === 'league' ? p.banned : p.sus?.[comp] ?? 0;
}
function addBan(p: Player, comp: string, n: number) {
  if (n <= 0) return;
  if (compKind(comp) === 'league') p.banned = Math.max(0, p.banned) + n;
  else p.sus = { ...(p.sus ?? {}), [comp]: (p.sus?.[comp] ?? 0) + n };
}

// Cup bans served: the players of both clubs who sat this tie out (they were suspended for it) count one down.
export function serveCupBans(comp: string, clubs: string[], byClub: Map<string, Player[]>, played: Set<string>) {
  if (compKind(comp) === 'league') return;
  for (const clubId of clubs) for (const p of byClub.get(clubId) ?? []) {
    const n = p.sus?.[comp] ?? 0;
    if (n > 0 && !played.has(p.id)) {
      const sus = { ...p.sus, [comp]: n - 1 };
      if (!sus[comp]) delete sus[comp];
      p.sus = Object.keys(sus).length ? sus : undefined;
    }
  }
}

// The match's cards → accumulation and bans. `played`: the club's matches in the competition so far (league round).
export function applyCards(rec: MatchRecord, get: (id: string) => Player, comp: string, played: number) {
  const reds = new Map(rec.events.filter((e) => e.kind === 'red').map((e) => [e.playerId, e.how ?? 'sfp']));
  const bans = redBansOf(comp);
  for (const e of rec.events) {
    if (e.kind !== 'yellow') continue;
    // Two cautions in a match are a sending-off; they don't count towards the accumulation.
    if (reds.get(e.playerId) === '2y') continue;
    const p = get(e.playerId);
    if (!p) continue;
    const n = (p.yc?.[comp] ?? 0) + 1;
    p.yc = { ...(p.yc ?? {}), [comp]: n };
    addBan(p, comp, accumBan(comp, n, played));
  }
  for (const [id, how] of reds) {
    const p = get(id);
    if (!p) continue;
    const n = how === '2y' ? bans.second : how === 'dogso' ? bans.dogso : how === 'hand' ? bans.hand : how === 'violent' ? bans.violent : how === 'sfp' ? bans.sfp : bans.other;
    addBan(p, comp, n);
  }
}
