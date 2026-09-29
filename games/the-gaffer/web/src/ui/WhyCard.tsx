// The assistant's "Why" card (half-time, full time): a verdict, the three or four things that decided it, and the
// changes the engine itself rates best, each with the win chance it buys and a one-tap "make the change".
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
    case 'source': case 'setpiece': return fill(p.me ? P.sourceMe : P.sourceThem, v);
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

export function WhyCard({ why, t, name, title, tipsTitle, onApply }: {
  why: Why; t: Strings; name: (id: string) => string; title: string; tipsTitle: string; onApply?: (tip: Tip) => void;
}) {
  return (
    <section className="card g-why" aria-label={title}>
      <div className="g-why-head">
        <span className="g-why-ava" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18h16M6 18V9l6-4 6 4v9" /><path d="M9 13h6M12 10v6" /></svg>
        </span>
        <div><span className="over">{t.eng.assistant}</span><h3 className="g-why-title">{title}</h3></div>
        <span className="g-why-xg num" dir="ltr">xG {x1(why.xg[0])}–{x1(why.xg[1])}</span>
      </div>
      <p className="g-why-verdict">{verdictText(why, t)}</p>
      {why.points.length > 0 && (
        <ul className="g-why-pts">
          {why.points.map((p, i) => <li key={i} className={p.good ? 'ok' : 'bad'}>{pointText(p, t, name)}</li>)}
        </ul>
      )}
      <div className="g-why-tipsh over">{tipsTitle}</div>
      {why.tips.length === 0 ? <p className="muted g-why-none">{t.eng.noTips}</p> : (
        <div className="g-why-tips">
          {why.tips.map((tip, i) => (
            <div key={i} className="g-tip">
              <div className="g-tip-main">
                <b>{tipWhat(tip.patch, t, name)}</b>
                <span>{tipWhy(tip, t, name)}</span>
                <small className="num">{fill(t.eng.winChance, { w0: Math.round(tip.win[0] * 100), w1: Math.round(tip.win[1] * 100) })}</small>
              </div>
              {onApply && <button className="btn primary sm" onClick={() => onApply(tip)}>{t.eng.apply}</button>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
