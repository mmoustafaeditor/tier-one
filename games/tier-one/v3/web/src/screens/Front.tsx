// 3.8: the old "front page" screen (3.0 mockup) was unreachable (FEATURES_3.7 §12.8) and is gone. Two helpers it
// exported are still used by the Daily hub and the Transfer Market, so they live on here.
import type { useT } from '../lib/i18n';
import { stageOf, type Rumour } from '../lib/wireData';
import { ymdUTC } from '../lib/meta';

/** Today's Daily number: No. 1 was 1 September 2026; one a day since, on the UTC calendar. */
export const dailyNoToday = () => Math.floor((Date.parse(ymdUTC() + 'T00:00:00Z') - Date.parse('2026-09-01T00:00:00Z')) / 864e5) + 1;
export function rumourHed(t: ReturnType<typeof useT>, r: Rumour) {
  const l = r.linked[0];
  return t('wire.heds.' + stageOf(r), { c: l ? l.name : '', p: r.playerName });
}
