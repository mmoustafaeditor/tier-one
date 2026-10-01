// The player's catchphrase for the films (GOTY.md §12: the catchphrase system replaces "HERE WE GO"). The long-tail
// lane owns lib/catchphrase.ts (catchphraseOf(save)); until it lands this resolves the same way: the line the player
// runs (`save.catchphrase.text`), else the house line from i18n (`cp.house.default`), else a built-in house line.
// INTEGRATOR: when lib/catchphrase.ts exists, make this `export { catchphraseOf as filmCatchphrase }` from it.
import { tr } from '../lib/i18n';
import type { Save } from '../lib/save';

const HOUSE: Record<string, string> = { en: 'DONE DEAL', ar: 'صفقة تمت', es: 'HECHO' };
export function filmCatchphrase(s: Save): string {
  const own = (s as Save & { catchphrase?: { text?: string } }).catchphrase?.text;
  if (own && own.trim()) return own.trim().slice(0, 24);
  const k = 'cp.house.default', v = tr(s.lang, k);
  return v && v !== k ? v : HOUSE[s.lang] || HOUSE.en;
}
