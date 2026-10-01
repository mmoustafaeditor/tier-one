// ON THE WIRE (GOTY §1.6): a player in a Daily, Career or Practice window who is also live on the real-market Wire
// gets this chip. Tap → onOpen(rid); the parent navigates (e.g. go({ n: 'wire', rid })) with no chrome of its own here.
//   <WireChip player={saga.player} onOpen={(rid) => chrome.go({ n: 'wire', rid })} />
// Matching is by player id, then by normalised name (lib/wireData.ts › wireFor). Renders nothing when not on the Wire.
import type { MouseEvent, KeyboardEvent } from 'react';
import { useT } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import { useWireFor, wireFor as wireForRaw, type WireKey, type Rumour } from '../lib/wireData';
import '../styles/football.css';

/** The live Wire rumour about this player (from the Wire cache), or null. Non-hook: call useWireFor inside components
 *  if you need it to update when the rumours arrive. */
export function wireFor(player: WireKey | null | undefined): Rumour | null { return wireForRaw(player); }

export function WireChip({ player, onOpen, size = 'md', className = '' }: { player: WireKey | null | undefined; onOpen: (rid: string) => void; size?: 'sm' | 'md'; className?: string }) {
  const t = useT();
  const r = useWireFor(player);
  if (!r) return null;
  const go = (e: MouseEvent | KeyboardEvent) => { e.stopPropagation(); e.preventDefault(); sfx('ui.tap'); onOpen(r.id); };
  return <span role="link" tabIndex={0} className={'wchip wchip--' + size + (className ? ' ' + className : '')} aria-label={t('fb.chipAria', { p: r.playerName })}
    onClick={go} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') go(e); }}>
    <i className="wchip__dot" aria-hidden="true" />{t('fb.chip')}
  </span>;
}
