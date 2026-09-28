// A staff log entry in the reader's language.
import type { Lang, Strings } from '../i18n';
import type { StaffLog } from '../model/types';
import { money, type World } from '../sim/world';

export function logText(t: Strings, lang: Lang, w: World, l: StaffLog): string {
  const f = t.staffLog[`${l.duty}:${l.key}`];
  if (!f) return '';
  const club = l.s ? w.clubs.find((c) => c.id === l.s)?.name[lang] ?? '' : '';
  return f({ pn: l.pn?.[lang] ?? '', n: l.n ?? 0, s: l.s ?? '', club, money });
}
