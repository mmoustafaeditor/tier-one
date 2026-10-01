// Leaderboard prizes and badges (SAIF-03). A finished Daily or week is read back from the server's own board (`lb.top`
// with a past `day`); a top-ten placing there pays coins once, claimed by the player. Coins only: nothing here touches a
// score, a rank or a board. Badges are what you already earned (medals from placings, trophies, rival scalps).
import { getSave, update, type Save } from './save';
import { credit, toast, ymdUTC } from './meta';
import { v3 } from './api';
import { t } from './i18n';
import { RIVALS, rivalOf } from './byline';

export type Period = 'daily' | 'weekly' | 'wire';
export type PrizePeriod = 'daily' | 'weekly';
export interface Placing { period: PrizePeriod; label: string; rank: number; players: number; coins: number; at: number; paid?: number }

// Coins for 1st, 2nd, 3rd, then 4th–10th. A board needs a few reporters on it before it pays.
export const PRIZE: Record<PrizePeriod, number[]> = { daily: [60, 40, 25, 10], weekly: [200, 120, 80, 30] };
export const PRIZE_MIN_PLAYERS = 3;
export function prizeFor(period: PrizePeriod, rank: number, players: number): number {
  if (!rank || rank < 1 || players < PRIZE_MIN_PLAYERS) return 0;
  const p = PRIZE[period];
  return rank <= 3 ? p[rank - 1] : rank <= 10 ? p[3] : 0;
}
export const medalOf = (rank: number) => (rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '');

// The same ISO week the server keys its weekly board by (api/tier-one/v3 isoWeek).
export function isoWeek(day: string): string {
  const d = new Date(day + 'T00:00:00Z'); const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const y = d.getUTCFullYear(), w = Math.ceil(((+d - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return y + '-W' + String(w).padStart(2, '0');
}

const placesOf = (s: Save) => s.prizes || {};
export const unpaid = (s: Save) => Object.entries(placesOf(s)).filter(([, p]) => p.coins > 0 && !p.paid).map(([k, p]) => ({ key: k, ...p }));
export function medals(s: Save) {
  const m = { gold: 0, silver: 0, bronze: 0 };
  for (const p of Object.values(placesOf(s))) { const k = medalOf(p.rank); if (k && p.players >= PRIZE_MIN_PLAYERS) m[k as keyof typeof m]++; }
  return m;
}
export const scalps = (s: Save) => RIVALS.reduce((n, id) => n + rivalOf(s, id).w, 0);

type Board = { rows: { nick: string; score: number; tier?: string; me: boolean }[]; me?: { rank: number; score: number }; players: number; week?: string };
let checking: Promise<void> | null = null;
/** Reads back yesterday's Daily and last week's board for the player's placing, once each, and records it. Prizes wait
 *  to be claimed. Runs at most once at a time; offline it simply tries again next time. */
export function checkPrizes(): Promise<void> {
  if (checking) return checking;
  checking = (async () => {
    const s = getSave(), now = Date.now();
    const yday = ymdUTC(now - 864e5), lastWkDay = ymdUTC(now - 7 * 864e5), lastWk = isoWeek(lastWkDay);
    const asks: { key: string; period: PrizePeriod; day: string; label: string }[] = [];
    if (s.daily[yday] && !placesOf(s)['d:' + yday]) asks.push({ key: 'd:' + yday, period: 'daily', day: yday, label: yday });
    if (!placesOf(s)['w:' + lastWk] && Object.keys(s.daily).some((d) => isoWeek(d) === lastWk)) asks.push({ key: 'w:' + lastWk, period: 'weekly', day: lastWkDay, label: lastWk });
    for (const a of asks) {
      const r = await v3<Board>('lb.top', { period: a.period, day: a.day, dev: s.dev });
      if (!r.ok) continue;
      const rank = r.me?.rank || 0, players = r.players || 0, coins = prizeFor(a.period, rank, players);
      update((x) => { x.prizes = { ...(x.prizes || {}), [a.key]: { period: a.period, label: a.label, rank, players, coins, at: Date.now() } }; });
      if (coins) toast('ach', t('aw.toast.' + a.period, { r: rank }), t('aw.toastBody', { n: coins }), 5200);
    }
  })().finally(() => { checking = null; });
  return checking;
}
/** Pays one prize into the wallet (once). */
export function claimPrize(key: string): number {
  let paid = 0;
  update((s) => {
    const p = s.prizes && s.prizes[key];
    if (!p || p.paid || !p.coins) return;
    p.paid = Date.now(); paid = p.coins;
    credit(s, p.coins, 'prize:' + key);
  });
  return paid;
}

// Trophy icons (the Me shelf and the byline badges).
export const ACH_IC: Record<string, string> = { first: 'news', t1: 'crown', t1x3: 'crown', excl: 'bolt', excl3: 'bolt', clean: 'check', uturn: 'uturn', twist: 'uturn', dd: 'clock', silent: 'eye', fake: 'eye', hijack: 'arrow', agent: 'briefcase', echo: 'friends', physio: 'pulse', streak7: 'flame', streak30: 'flame', practice5: 'target', coach: 'target', career1: 'story', rank2: 'story', rank3: 'story', rank5: 'crown', trust5: 'phone', leak: 'fax', wire1: 'wire', wireRight: 'wire', room: 'friends', share: 'share', rich: 'gift' };
