// "On the Market" chip (UI41 §Transfer Wire): drop it next to any player who is a live real-life rumour; tapping it opens
// that rumour in the Transfer Market. Renders nothing when the player isn't on the Market.
//   <WireChip player={p} onOpen={(rid) => go({ n: 'wire', rid })} />
import { useT } from '../lib/i18n';
import { useWireFor, type WireKey } from '../lib/wireData';
import '../styles/football.css';

export function WireChip({ player, onOpen, small }: { player: WireKey | null | undefined; onOpen: (rid: string) => void; small?: boolean }) {
  const t = useT();
  const r = useWireFor(player);
  if (!r) return null;
  return <button type="button" className={'wchip' + (small ? ' wchip--sm' : '')} aria-label={t('w41.chipAria', { p: r.playerName })}
    onClick={(e) => { e.stopPropagation(); onOpen(r.id); }}>
    <span className="wchip__dot" aria-hidden="true" />{t('w41.chip')}
  </button>;
}
