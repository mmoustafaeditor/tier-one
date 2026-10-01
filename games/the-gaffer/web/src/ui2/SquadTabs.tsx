// The Squad's five areas as one labelled row at the top of each of them (UI/UX pass, UX-01): they used to be doors
// under the player list, about three screens down on a phone.
import { NV } from '../lang-nav-all';
import { Seg } from './shell';
import { useGame } from './game';

export type SquadArea = 'squad' | 'room' | 'train' | 'medical' | 'academy';
export function SquadTabs({ at }: { at: SquadArea }) {
  const g = useGame();
  const N = NV[g.ui];
  const opts: { v: SquadArea; label: string }[] = [
    { v: 'squad', label: N.players }, { v: 'room', label: N.room }, { v: 'train', label: N.training }, { v: 'medical', label: N.medical }, { v: 'academy', label: N.academy },
  ];
  return <nav className="area-tabs" aria-label={N.squadAreas}><Seg label={N.squadAreas} value={at} onGround options={opts} onChange={(v) => g.go({ s: v })} /></nav>;
}
