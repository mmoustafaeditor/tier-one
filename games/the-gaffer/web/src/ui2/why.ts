// The Why card's words: causes, suggested changes and the verdict, from the engine's own story (sim/engine/story.ts).
import type { Strings } from '../i18n';
import { fmt, type FormationId, type Tactics } from '../sim/tactics';
import type { Point, Tip, Why } from '../sim/engine/story';
import { describeChange } from './commentary';

const fill = (s: string, v: Record<string, string | number | undefined>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
const x1 = (v: number | undefined) => (v ?? 0).toFixed(1);

export function pointText(p: Point, t: Strings, name: (id: string) => string): string {
  const P = t.eng.point;
  const v = { a: p.a ? name(p.a) : '', d: p.d ? name(p.d) : '', n: p.n, of: p.of, x: x1(p.x), y: x1(p.y), min: p.min, theme: p.theme ? t.eng.themeIn[p.theme] : '' };
  switch (p.k) {
    case 'source': case 'setpiece': return fill(p.n === 1 ? (p.me ? P.sourceMe1 : P.sourceThem1) : (p.me ? P.sourceMe : P.sourceThem), v);
    case 'midfield': return fill(p.me ? P.midfieldMe : P.midfieldThem, { ...v, x: Math.round(p.x ?? 0), y: Math.round(p.y ?? 0) });
    case 'pressed': return fill((p.x ?? 0) >= 0.15 ? P.pressedXg : P.pressed, v);
    case 'pressing': return fill(P.pressing, v);
    case 'duel': return fill(p.me ? (p.note === 'att' ? P.duelMeWin : P.duelMeLose) : (p.note === 'att' ? P.duelThemWin : P.duelThemLose), v);
    case 'finish': return fill(p.me ? (p.good ? P.finishMeGood : P.finishMeBad) : (p.good ? P.finishThemGood : P.finishThemBad), v);
    case 'keeper': return fill(p.me ? P.keeperMe : P.keeperThem, v);
    case 'tired': return fill(p.me ? P.tiredMe : P.tiredThem, { ...v, n: Math.round(p.n ?? 0), y: Math.round(p.y ?? 0) });
    case 'red': return fill(p.me ? P.redMe : P.redThem, v);
    case 'change': return fill(p.good ? P.changeGood : P.changeBad, { ...v, what: describeChange(t, p.note, name).what });
    case 'theyChanged': return fill(P.theyChanged, { ...v, what: describeChange(t, p.note, name).what });
  }
  return '';
}

// "Pressing: High press", "Shape 4-4-2", "Counter at once: On".
export function tipWhat(patch: Partial<Tactics>, t: Strings, name: (id: string) => string): string {
  const [k, v] = Object.entries(patch)[0] ?? ['', ''];
  if (k === 'formation') return t.eng.shape(fmt(v as FormationId));
  return describeChange(t, `${k}:${String(v)}`, name).what;
}

export function tipWhy(tip: Tip, t: Strings, name: (id: string) => string): string {
  const W = t.eng.tipWhy;
  const base = `${tip.theme}${tip.ours ? 'Me' : 'Them'}`;
  const key = tip.a && tip.d && W[`${base}AD`] ? `${base}AD` : tip.a && W[`${base}A`] ? `${base}A` : base;
  return fill(W[key] ?? W[base] ?? '', { a: tip.a ? name(tip.a) : '', d: tip.d ? name(tip.d) : '' });
}

export function verdictText(why: Why, t: Strings): string {
  return fill(t.eng.verdict[why.verdict] ?? '', { xa: x1(why.xg[0]), xb: x1(why.xg[1]), ga: why.goals[0], gb: why.goals[1] });
}

