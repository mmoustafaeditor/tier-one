// Formation radar: the two line-ups compared on six attributes (the outfield players on the pitch, averaged).
import type { Lang, Strings } from '../i18n';
import type { LiveMatch } from '../sim/match';
import { playerOf, type World } from '../sim/world';
import { awayKit } from './Pitch2D';

// Very light shirts (white away kits) get a dark outline so they still read on the light card.
const light = (hex: string) => { const n = parseInt(hex.replace('#', '').slice(0, 6), 16); return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 190; };

const AXES = [0, 1, 2, 3, 4, 5]; // pace, shooting, passing, dribbling, defending, physical

export function profileOf(w: World, m: LiveMatch, side: 0 | 1): number[] {
  const xi = m.sides[side].onPitch.map((id) => (id ? playerOf(w, id) : undefined)).filter((p) => p && p.position !== 'GK');
  return AXES.map((a) => (xi.length ? xi.reduce((s, p) => s + p!.attrs[a], 0) / xi.length : 0));
}

export function Radar({ world, m, t, lang = 'en' }: { world: World; m: LiveMatch; t: Strings; lang?: Lang }) {
  const vals = [profileOf(world, m, 0), profileOf(world, m, 1)];
  const [hc, ac] = m.sides.map((s) => world.clubs.find((x) => x.id === s.clubId)!.colors);
  const colors = [hc[0], awayKit(hc[0], ac)]; // same shirts as on the pitch
  const R = 40, cx = 60, cy = 52;
  const pt = (a: number, v: number) => {
    const ang = -Math.PI / 2 + (a / AXES.length) * Math.PI * 2;
    const r = (Math.max(30, Math.min(99, v)) - 30) / 69 * R; // 30 → centre, 99 → edge
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const ring = (v: number) => AXES.map((a) => pt(a, v).map((n) => n.toFixed(1)).join(',')).join(' ');
  return (
    <figure className="g-radar" aria-label={t.radarT}>
      <svg viewBox="0 0 120 106" role="img">
        {[50, 70, 90].map((v, i) => <polygon key={v} points={ring(v)} fill={i === 2 ? 'rgba(31,163,122,.06)' : 'none'} stroke="var(--line2)" strokeWidth=".45" />)}
        {AXES.map((a) => { const [x, y] = pt(a, 99); return <line key={a} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line2)" strokeWidth=".45" />; })}
        {vals.map((v, i) => (
          <polygon key={i} points={AXES.map((a) => pt(a, v[a]).map((n) => n.toFixed(1)).join(',')).join(' ')}
            fill={colors[i]} fillOpacity=".3" stroke={light(colors[i]) ? '#35524D' : colors[i]} strokeWidth="1.1" strokeLinejoin="round" />
        ))}
        {AXES.map((a) => {
          const [x, y] = pt(a, 112);
          return <text key={a} x={x} y={y + 1.5} textAnchor="middle" className="g-radar-l">{t.attrs[a]}</text>;
        })}
      </svg>
      <figcaption className="g-radar-key">
        {m.sides.map((s, i) => (
          <span key={i}><i style={{ background: colors[i], boxShadow: light(colors[i]) ? 'inset 0 0 0 1.5px #35524D' : undefined }} />{world.clubs.find((x) => x.id === s.clubId)!.name[lang]}</span>
        ))}
      </figcaption>
    </figure>
  );
}
