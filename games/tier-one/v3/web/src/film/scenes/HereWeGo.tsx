// "HERE WE GO!": the shareable moment. Your post lands on the desk and types itself, the gold frame lights, the
// HERE WE GO stamp slams, the numbers roll, and your byline signs it. Built as a 1080×1920 share clip; the trailer
// uses it as its payoff beat. Everything is a prop, so a real call can be rendered later for share-to-socials.
import { AbsoluteFill, interpolate, spring } from '../remotion-shim';
import { C, F, DeskSurface, Glyph, FilmLook, Layer, Paper, Stamp, Typeset, camAt, clamp, k01, shake, useStage, EASE, type Key } from '../kit';
import type { SceneMeta } from '../cues';

export type HereWeGoProps = {
  byline: string; handle: string; player: string; club: string; clubColor: string; date: string;
  /** The post text, filled. */ post: string;
  /** "HERE WE GO!" */ hwg: string;
  /** "Called it first" */ called: string;
  /** "Tier One" */ tag: string;
  rtl?: boolean;
};

const T = { post: 0, type: 12, stamp: 44, count: 48, sign: 112, tag: 146, end: 180 };
export const HERE_WE_GO: SceneMeta = {
  dur: T.end,
  beats: [0, T.stamp, T.sign],
  cues: [{ f: 4, k: 'send' }, { f: T.type, k: 'typewriter' }, { f: T.stamp, k: 'boom' }, { f: T.stamp + 2, k: 'fanfare' }, { f: T.sign, k: 'pop' }, { f: T.tag, k: 'sparkle' }],
};
const kfmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K' : String(Math.round(n)));
const SHIRT = 'M64 60L30 80l13 32 17-8v76h80v-76l17 8 13-32-34-20c-8 14-21 20-36 20s-28-6-36-20z';

export function HereWeGo(p: HereWeGoProps) {
  const { f, fps, W, P } = useStage();
  const keys: Key[] = [{ f: 0, x: 0, y: P ? 60 : 0, z: P ? 1.05 : 0.95 }, { f: T.stamp, x: 0, y: P ? 20 : 0, z: P ? 1.12 : 1.0 }, { f: T.sign, x: 0, y: P ? 40 : 0, z: P ? 1.0 : 0.92 }, { f: T.end, x: 0, y: P ? 60 : 10, z: P ? 1.03 : 0.95 }];
  const cam0 = camAt(f, keys), sh = shake(f, [T.stamp], 22);
  const cam = { ...cam0, x: cam0.x + sh.x, y: cam0.y + sh.y };
  const rise = spring({ frame: f - T.post, fps, config: { damping: 15, stiffness: 120 } });
  const gold = k01(f, T.stamp, T.stamp + 6);
  const n = interpolate(f, [T.count, T.count + 60], [0, 1], { ...clamp, easing: EASE.out });
  const cw = P ? 900 : 1000;
  const sign = spring({ frame: f - T.sign, fps, config: { damping: 14, stiffness: 160 } });

  return <AbsoluteFill style={{ background: C.night, overflow: 'hidden', direction: p.rtl ? 'rtl' : 'ltr' }}>
    <Layer cam={cam}>
      <DeskSurface x={-3000} y={-3000} w={6000} h={6000} />
      <div style={{ position: 'absolute', left: -1400, top: -1400, width: 2800, height: 2800, borderRadius: '50%', background: `radial-gradient(circle, rgba(247,185,40,${0.1 + gold * 0.22}), transparent 60%)` }} />
      {/* The post. */}
      <div style={{ position: 'absolute', left: -cw / 2, top: P ? -640 : -470, width: cw, transform: `translateY(${(1 - rise) * 900}px) rotate(${(1 - rise) * 6 - 1.5}deg)` }}>
        <div style={{ position: 'relative', padding: 12, borderRadius: 28, background: `linear-gradient(135deg, #FFE08A, ${C.gold} 40%, ${C.goldDeep})`, boxShadow: `0 40px 80px rgba(0,0,0,.6), 0 0 ${gold * 120}px rgba(247,185,40,${gold * 0.6})` }}>
          <div style={{ position: 'relative', background: C.paper, color: C.ink, borderRadius: 18, padding: '34px 40px 30px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <span style={{ width: 92, height: 92, borderRadius: '50%', background: C.ink, color: C.gold, display: 'grid', placeItems: 'center', fontFamily: F.display, fontWeight: 800, fontSize: 52 }}>{Array.from(p.byline)[0] || '?'}</span>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <b style={{ fontFamily: F.text, fontSize: 40, fontWeight: 800 }}>{p.byline}</b>
                <span style={{ fontFamily: F.mono, fontSize: 26, color: C.ink3 }}><bdi dir="ltr">{p.handle}</bdi> · {p.date}</span>
              </span>
            </div>
            <p style={{ fontFamily: F.text, fontSize: 46, lineHeight: 1.3, margin: '26px 0 22px', minHeight: 180 }}><Typeset text={p.post} at={T.type} cpf={1.6} rtl={p.rtl} /></p>
            <div style={{ height: P ? 420 : 300, borderRadius: 14, background: `radial-gradient(circle, rgba(0,0,0,.28) 34%, transparent 36%) 0 0 / 10px 10px, linear-gradient(160deg, ${p.clubColor}, ${C.ink})`, display: 'grid', placeItems: 'center', position: 'relative' }}>
              <svg viewBox="0 0 200 200" width={P ? 320 : 240} height={P ? 320 : 240}><path d={SHIRT} fill={p.clubColor} stroke={C.paper} strokeWidth={4} strokeLinejoin="round" /></svg>
              <span style={{ position: 'absolute', insetInlineStart: 24, bottom: 18, fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: 54, color: C.paper, letterSpacing: '.03em', textTransform: 'uppercase', textShadow: '0 3px 0 rgba(0,0,0,.4)' }}>{p.player} · {p.club}</span>
            </div>
            <div style={{ display: 'flex', gap: 40, marginTop: 22, fontFamily: F.cond, fontStretch: '80%', fontWeight: 800, fontSize: 40, color: C.ink2 }}>
              <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Glyph n="reply" size={40} />{kfmt(n * 9100)}</span><span style={{ display: 'flex', gap: 10, alignItems: 'center', color: C.done }}><Glyph n="repost" size={40} />{kfmt(n * 48200)}</span><span style={{ display: 'flex', gap: 10, alignItems: 'center', color: C.redDeep }}><Glyph n="heart" size={40} />{kfmt(n * 213000)}</span>
            </div>
            <div style={{ position: 'absolute', insetInlineEnd: 20, top: P ? 250 : 190 }}><Stamp text={p.hwg} color={C.goldDeep} at={T.stamp} size={P ? 118 : 104} rot={-9} /></div>
          </div>
        </div>
      </div>
      {/* The byline plate. */}
      {f >= T.sign && <div style={{ position: 'absolute', left: -cw / 2, top: P ? 560 : 420, width: cw, height: 150, transform: `translateX(${(1 - sign) * (p.rtl ? -1 : 1) * 1200}px) rotate(1deg)` }}>
        <Paper lift={0.3}>
          <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 40px', gap: 24 }}>
            <span style={{ width: 16, alignSelf: 'stretch', background: C.red, margin: '24px 0' }} />
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: F.mono, fontSize: 26, color: C.ink3, letterSpacing: '.06em' }}>{p.called}</span>
              <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 64, lineHeight: 1 }}>{p.byline}</span>
            </span>
            <span style={{ marginInlineStart: 'auto', fontFamily: F.display, fontWeight: 800, fontSize: 44, color: C.redDeep, opacity: k01(f, T.tag, T.tag + 8) }}>{p.tag}</span>
          </div>
        </Paper>
      </div>}
    </Layer>
    <Confetti at={T.stamp} W={W} />
    <FilmLook vignette={0.65} />
  </AbsoluteFill>;
}

/** Deterministic confetti: every piece is a closed-form throw, so any frame can be drawn on its own. */
function Confetti({ at, W }: { at: number; W: number }) {
  const { f, fps, H } = useStage();
  const t = (f - at) / fps;
  if (t < 0 || t > 2.4) return null;
  const cols = [C.gold, C.red, C.done, '#35C3E6', C.paper];
  return <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 40 }}>{Array.from({ length: 70 }, (_, i) => {
    const a = ((i * 137.5) % 360) * (Math.PI / 180), v = 900 + ((i * 97) % 700);
    const x = W / 2 + Math.cos(a) * v * t * 0.8, y = H * 0.38 - Math.abs(Math.sin(a)) * v * t * 1.1 + 1400 * t * t;
    return <i key={i} style={{ position: 'absolute', left: x, top: y, width: 16 + (i % 3) * 6, height: 24 + (i % 4) * 5, background: cols[i % cols.length], transform: `rotate(${i * 40 + t * 600 * ((i % 2) ? 1 : -1)}deg) scaleY(${Math.cos(t * 12 + i)})`, opacity: interpolate(t, [1.6, 2.4], [1, 0], clamp) }} />;
  })}</AbsoluteFill>;
}
