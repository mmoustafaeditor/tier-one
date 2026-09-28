// Post-match report as a square image: competition, teams, score (and penalties), scorers, and the key stats.
import type { Lang, Strings } from '../i18n';
import type { LiveMatch } from '../sim/match';
import { playerOf, type World } from '../sim/world';
import { COLORS, painter, shareImage, slug } from './share';

export async function drawReport(w: World, m: LiveMatch, label: string, lang: Lang, t: Strings, rtl: boolean) {
  const [h, a] = m.sides.map((s) => w.clubs.find((c) => c.id === s.clubId)!);
  const goals = m.events.filter((e) => e.kind === 'goal');
  const scorerRows = Math.max(1, ...[0, 1].map((i) => goals.filter((e) => e.side === i).length));
  const H = 1080 + Math.max(0, scorerRows - 3) * 50;
  const p = await painter(H, rtl);
  const name = (id: string) => playerOf(w, id)?.name[lang] ?? '';
  // Home is always on the reading-start side.
  const L = rtl ? 1 : 0;
  const side = (i: number) => (i === L ? 270 : 810);
  p.text('The Gaffer', 540, 100, { size: 40, weight: 800, color: COLORS.ACCENT, align: 'center' });
  p.text(label, 540, 160, { size: 36, weight: 600, font: 'body', color: COLORS.MUTED, align: 'center', max: 960 });
  [h, a].forEach((c, i) => {
    p.kit(side(i) - 70, 210, 140, c.colors);
    p.text(c.name[lang], side(i), 410, { size: 46, weight: 800, align: 'center', max: 440 });
  });
  p.text(`${m.goals[L]} – ${m.goals[1 - L]}`, 540, 330, { size: 140, weight: 800, align: 'center' });
  p.text(t.fullTime, 540, 390, { size: 32, weight: 700, color: COLORS.ACCENT, align: 'center' });
  if (m.pens) p.text(t.pens(m.pens[L], m.pens[1 - L]), 540, 440, { size: 32, weight: 600, font: 'body', color: COLORS.MUTED, align: 'center' });
  // Scorers under each team.
  [0, 1].forEach((i) => goals.filter((e) => e.side === i).forEach((e, k) => {
    p.text(`⚽ ${name(e.playerId)} ${e.min}′`, side(i), 500 + k * 50, { size: 32, weight: 500, font: 'body', align: 'center', max: 460 });
  }));
  // Stats: possession, shots, on target, corners.
  const top = H - 470;
  p.panel(80, top, 920, 380);
  [0, 1, 2, 3].forEach((k, r) => {
    const y = top + 80 + r * 85;
    const [x0, x1] = [m.stats[L][k], m.stats[1 - L][k]];
    p.text(k === 0 ? `${x0}%` : String(x0), 140, y, { size: 44, weight: 800, align: 'center' });
    p.text(k === 0 ? `${x1}%` : String(x1), 940, y, { size: 44, weight: 800, align: 'center' });
    p.text(t.statNames[k], 540, y, { size: 32, weight: 600, font: 'body', color: COLORS.MUTED, align: 'center' });
    const total = Math.max(1, x0 + x1);
    p.x.fillStyle = COLORS.LINE; p.x.fillRect(220, y + 18, 640, 8);
    p.x.fillStyle = COLORS.ACCENT; p.x.fillRect(220, y + 18, 640 * (x0 / total), 8);
  });
  p.text('Semba Games', 540, H - 40, { size: 28, weight: 700, color: COLORS.MUTED, align: 'center' });
  return p.c;
}

export async function shareReport(w: World, m: LiveMatch, label: string, lang: Lang, t: Strings, season: number) {
  const rtl = document.documentElement.dir === 'rtl';
  const c = await drawReport(w, m, label, lang, t, rtl);
  const [h, a] = m.sides.map((s) => w.clubs.find((x) => x.id === s.clubId)!.shortName);
  const file = `the-gaffer-${slug(h)}-${m.goals[0]}-${m.goals[1]}-${slug(a)}-${season}.png`;
  return { file, result: await shareImage(c, file, label, true) };
}
