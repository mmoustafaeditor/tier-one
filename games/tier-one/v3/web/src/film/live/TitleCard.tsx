// The live lane's title-card film: a sheet slaps down on the desk under the lamp, the kicker prints, the title sets
// in metal sorts, the sub inks in and a stamp slams. One drawing serves Deadline Day Live (open/close), a playstyle
// title and the streak milestones; the accent, the glyph and the words change. ~2.6 s, frame-driven, no dialogue.
import { AbsoluteFill, spring, interpolate } from '../remotion-shim';
import { C, F, FilmLook, Layer, DeskSurface, Paper, Stamp, Typeset, Motes, camAt, k01, noise, shake, useStage, clamp, EASE, type Key } from '../kit';
import { Confetti } from '../scenes/bits';
import type { SceneMeta } from '../cues';

export type TitleCardProps = { kicker: string; title: string; sub?: string; stamp?: string; accent?: string; glyph?: 'clock' | 'whistle' | 'flame' | 'pen'; big?: string; confetti?: boolean; rtl?: boolean };

const T = { slap: 6, kicker: 16, title: 22, sub: 40, stamp: 50, end: 78 };
export const TITLE_CARD: SceneMeta = {
  dur: T.end, hold: 800, beats: [0, T.title, T.stamp],
  cues: [{ f: 0, k: 'flip' }, { f: T.slap, k: 'thock' }, { f: T.kicker, k: 'typewriter' }, { f: T.stamp, k: 'stamp' }],
};
export const TITLE_CARD_LOUD: SceneMeta = { ...TITLE_CARD, cues: [...TITLE_CARD.cues, { f: T.stamp + 3, k: 'siren' }] };
export const TITLE_CARD_GOLD: SceneMeta = { ...TITLE_CARD, cues: [...TITLE_CARD.cues, { f: T.stamp + 2, k: 'fanfare' }] };

function GlyphArt({ g, color, size }: { g: TitleCardProps['glyph']; color: string; size: number }) {
  const { f } = useStage();
  const p = { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (g === 'clock') { const a = (f * 6) % 360; return <svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6v6" /><path d={`M12 12l${(4 * Math.sin((a * Math.PI) / 180)).toFixed(2)} ${(-4 * Math.cos((a * Math.PI) / 180)).toFixed(2)}`} /></svg>; }
  if (g === 'whistle') return <svg {...p}><path d="M3 12a5 5 0 1 0 10 0v-1H8V8h8l5 2-1 4H13" /><path d="M6 4l1 3M10 3v3" /></svg>;
  if (g === 'flame') { const w = 1 + 0.06 * noise(f / 3, 2); return <svg {...p} style={{ transform: `scaleX(${w})` }}><path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-6 6-5 10-1-1-2-2-2-4-2 2-2 4-2 6 0 4 3 7 7 7z" fill={color} fillOpacity={0.25} /></svg>; }
  return <svg {...p}><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></svg>;
}

export function TitleCard(p: TitleCardProps) {
  const { f, fps, P, W } = useStage();
  const acc = p.accent || C.red;
  const keys: Key[] = [{ f: 0, x: 0, y: 40, z: P ? 0.98 : 1.0 }, { f: T.stamp, x: 0, y: 0, z: P ? 1.04 : 1.05 }, { f: T.end, x: 0, y: -10, z: P ? 1.06 : 1.07 }];
  const c0 = camAt(f, keys), sh = shake(f, [T.slap, T.stamp], 10), cam = { ...c0, x: c0.x + sh.x, y: c0.y + sh.y };
  const slap = spring({ frame: f - 1, fps, config: { damping: 13, stiffness: 190, mass: 0.9 } });
  const lift = interpolate(slap, [0, 1], [1, 0], clamp);
  const w = P ? 900 : 1240, h = P ? 1040 : 640;
  const lamp = 0.85 + 0.15 * noise(f / 6, 1);
  const subIn = k01(f, T.sub, T.sub + 10, EASE.out);
  return <AbsoluteFill style={{ background: C.night, overflow: 'hidden', direction: p.rtl ? 'rtl' : 'ltr' }}>
    <Layer cam={cam} depth={0.9}><DeskSurface /></Layer>
    <Layer cam={cam} depth={0.95}>
      <div style={{ position: 'absolute', left: -1400, top: -1500, width: 2800, height: 2600, background: `radial-gradient(50% 40% at 50% 38%, rgba(255,200,115,${0.22 * lamp}), transparent 70%)` }} />
    </Layer>
    <Layer cam={cam}>
      <div style={{ position: 'absolute', left: -w / 2, top: -h / 2, width: w, height: h, transform: `translateY(${-lift * 900}px) rotate(${-1.5 + lift * 8}deg) scale(${1 + lift * 0.25})`, opacity: Math.min(1, slap * 3) }}>
        <Paper lift={lift}>
          <i style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 28, background: acc }} />
          <i style={{ position: 'absolute', insetInlineStart: 28, insetInlineEnd: 0, top: 0, height: 10, background: C.ink }} />
        </Paper>
        <div style={{ position: 'relative', height: '100%', padding: P ? '70px 70px 70px 100px' : '60px 80px 60px 110px', paddingInlineStart: P ? 100 : 110, color: C.ink, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: P ? 22 : 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, fontFamily: F.mono, fontSize: P ? 34 : 30, letterSpacing: '.1em', color: C.ink2, textTransform: 'uppercase', opacity: k01(f, T.kicker, T.kicker + 6) }}>
            {p.glyph && <GlyphArt g={p.glyph} color={acc} size={P ? 64 : 56} />}
            <Typeset text={p.kicker} at={T.kicker} cpf={1.4} />
          </div>
          {p.big && <div style={{ fontFamily: F.cond, fontStretch: '62%', fontWeight: 900, fontSize: P ? 300 : 240, lineHeight: 0.85, color: acc, letterSpacing: '-.02em', transform: `scale(${interpolate(spring({ frame: f - T.title, fps, config: { damping: 12, stiffness: 200 } }), [0, 1], [0.4, 1])})`, transformOrigin: p.rtl ? '100% 60%' : '0 60%' }}>{f >= T.title ? p.big : ''}</div>}
          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: p.big ? (P ? 84 : 76) : P ? 132 : 118, lineHeight: 0.98, letterSpacing: '-.02em', textWrap: 'balance' } as React.CSSProperties}><Typeset text={p.title} at={T.title} cpf={1.3} /></div>
          {p.sub && <div style={{ fontFamily: F.text, fontWeight: 600, fontSize: P ? 44 : 40, lineHeight: 1.25, color: C.ink2, maxWidth: P ? 700 : 900, opacity: subIn, transform: `translateY(${(1 - subIn) * 20}px)` }}>{p.sub}</div>}
        </div>
        {p.stamp && <div style={{ position: 'absolute', insetInlineEnd: P ? 40 : 60, bottom: P ? 60 : 50 }}><Stamp text={p.stamp} color={acc === C.gold ? C.goldDeep : acc === C.red ? C.redDeep : acc} at={T.stamp} size={P ? 110 : 96} rot={-9} style={{ background: 'rgba(244,239,228,.92)' }} /></div>}
      </div>
    </Layer>
    <Layer cam={cam} depth={1.3}><Motes n={14} seed={3} /></Layer>
    {p.confetti && <Confetti at={T.stamp + 2} W={W} />}
    <FilmLook vignette={0.7} />
  </AbsoluteFill>;
}
