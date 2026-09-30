// "The paper's out": before a result reveals. The press rolls tomorrow's edition, the newsstand vendor slaps it on the
// counter at dawn, and the camera pushes into the front page: your headline, your byline. Loud colour: vermilion.
// The short cut (repeat plays) starts at the slap.
import { AbsoluteFill, Sequence, interpolate, spring } from '../remotion-shim';
import { C, F, At, FilmLook, Layer, Paper, Stamp, Typeset, camAt, clamp, k01, shake, useStage, EASE, type Key } from '../kit';
import { Figure, Folded, SKIN } from '../people';
import type { SceneMeta } from '../cues';

export type PaperOutProps = {
  masthead: string; edition: string; dateline: string;
  headline: string; byline: string; kicker: string;
  /** "Out now" stamp. */ stamp: string;
  /** Awning sign. */ news: string;
  cut?: 'full' | 'short';
  rtl?: boolean;
};

const T = { wipe: 22, stall: 26, swing: 30, slap: 38, push: 44, hed: 48, by: 60, stamp: 66, end: 88 };
const SHORT = 34;
export const PAPER_OUT: SceneMeta = {
  dur: T.end, hold: 700, beats: [0, T.stall, T.push, T.stamp],
  cues: [{ f: 0, k: 'open' }, { f: 8, k: 'shred' }, { f: T.wipe, k: 'whoosh' }, { f: T.slap, k: 'stamp' }, { f: T.hed, k: 'typewriter' }, { f: T.stamp, k: 'reveal' }],
};
export const PAPER_OUT_SHORT: SceneMeta = {
  dur: T.end - SHORT, hold: 500, beats: [0, T.push - SHORT, T.stamp - SHORT],
  cues: PAPER_OUT.cues.filter((c) => c.f >= SHORT).map((c) => ({ ...c, f: c.f - SHORT })),
};

export function PaperOut(p: PaperOutProps) {
  if (p.cut !== 'short') return <Body {...p} />;
  return <AbsoluteFill><Sequence from={-SHORT} layout="none"><Body {...p} /></Sequence></AbsoluteFill>;
}

function Body(p: PaperOutProps) {
  const { f } = useStage();
  return <AbsoluteFill style={{ background: C.night, overflow: 'hidden', direction: p.rtl ? 'rtl' : 'ltr' }}>
    {f < T.stall + 4 && <Press />}
    {f >= T.wipe && <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${(1 - k01(f, T.wipe, T.stall + 4, EASE.inOut)) * 100}%)` }}><Stall {...p} /></AbsoluteFill>}
    <FilmLook vignette={0.6} />
  </AbsoluteFill>;
}

/** The press: three rollers and the web of paper racing through them, printed pages blurring past. */
function Press() {
  const { f, P } = useStage();
  const cam: Key = { f, x: 0, y: 0, z: (P ? 1.25 : 1) * (1 + f * 0.006) };
  const run = f * 70;
  return <AbsoluteFill style={{ background: `radial-gradient(80% 70% at 50% 50%, #3A2A20, ${C.night})` }}>
    <Layer cam={cam}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: 'rotate(-14deg)' }}>
        {/* the web */}
        <div style={{ position: 'absolute', left: -2200, top: -150, width: 4400, height: 300, background: C.paper, boxShadow: '0 30px 60px rgba(0,0,0,.6)', overflow: 'hidden' }}>
          {Array.from({ length: 12 }, (_, i) => {
            const x = ((i * 520 + run) % 6240) - 2600;
            return <div key={i} style={{ position: 'absolute', left: x, top: 22, width: 460, height: 256, filter: 'blur(3px)' }}>
              <i style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 40, background: C.red }} />
              <i style={{ position: 'absolute', left: 0, top: 58, width: '86%', height: 34, background: C.ink }} />
              <i style={{ position: 'absolute', left: 0, top: 104, width: '64%', height: 34, background: C.ink }} />
              {[160, 190, 220].map((y) => <i key={y} style={{ position: 'absolute', left: 0, top: y, width: '100%', height: 10, background: C.ink3 }} />)}
            </div>;
          })}
        </div>
        {/* rollers */}
        {[{ x: -620, y: -330, r: 190, c: C.red }, { x: 60, y: 350, r: 230, c: '#3C3A36' }, { x: 700, y: -330, r: 190, c: '#3C3A36' }].map((r, i) => (
          <div key={i} style={{ position: 'absolute', left: r.x - r.r, top: r.y - r.r, width: r.r * 2, height: r.r * 2, borderRadius: '50%', background: `repeating-conic-gradient(from ${f * (i % 2 ? -26 : 26)}deg, ${r.c} 0 14deg, ${r.c === C.red ? C.redDeep : '#24221F'} 14deg 30deg)`, border: `10px solid ${C.ink}`, boxShadow: '0 20px 50px rgba(0,0,0,.7), inset 0 0 0 26px rgba(0,0,0,.18)' }}>
            <i style={{ position: 'absolute', inset: '38%', borderRadius: '50%', background: '#8C857A', border: `8px solid ${C.ink}` }} />
          </div>
        ))}
      </div>
    </Layer>
  </AbsoluteFill>;
}

/** Dawn at the newsstand: the vendor slaps the edition down, then the front page fills the frame. */
function Stall(p: PaperOutProps) {
  const { f, fps, P } = useStage();
  const keys: Key[] = P
    ? [{ f: T.stall, x: 0, y: 40, z: 1.02 }, { f: T.push, x: 0, y: 60, z: 1.0 }, { f: T.end, x: 0, y: 60, z: 1.0 }]
    : [{ f: T.stall, x: 0, y: -40, z: 1.0 }, { f: T.push, x: 0, y: -30, z: 0.98 }, { f: T.end, x: 0, y: -30, z: 0.98 }];
  const c0 = camAt(f, keys), sh = shake(f, [T.slap], 18);
  const cam = { ...c0, x: c0.x + sh.x, y: c0.y + sh.y };
  // The vendor's arm: raised with the paper, then down hard on the counter.
  const sw = interpolate(f, [T.swing, T.slap], [0, 1], { ...clamp, easing: EASE.in });
  const armR = interpolate(sw, [0, 1], [165, 60]), bendR = interpolate(sw, [0, 1], [-20, 50]);
  const held = f < T.slap;
  const page = spring({ frame: f - T.push, fps, config: { damping: 15, stiffness: 120 } });
  const W = P ? 920 : 1180, H = P ? 1300 : 860;
  const sun = k01(f, T.stall, T.end, EASE.out);
  const counterY = P ? 330 : 250;
  return <AbsoluteFill style={{ background: `linear-gradient(180deg, #1B2340 0%, #5B3A55 ${40 - sun * 10}%, #F08A4B ${80 - sun * 12}%, #FFC873)` }}>
    <Layer cam={cam}>
      {/* sun and a city skyline cut from card */}
      <div style={{ position: 'absolute', left: -180, top: P ? -160 - sun * 80 : -120 - sun * 60, width: 360, height: 360, borderRadius: '50%', background: C.lamp, opacity: 0.85 }} />
      <svg viewBox="0 0 2400 500" width={2400} height={500} style={{ position: 'absolute', left: -1200, top: counterY - 520, width: 2400, height: 500 }} aria-hidden="true">
        <path d="M0 500V300h120v-80h90v120h110V180h140v160h80V240h120v-120h60v220h130V260h100v80h120V160h150v180h90V220h130v120h110V280h140v220z" fill="#2A1E2C" />
        {Array.from({ length: 28 }, (_, i) => <rect key={i} x={140 + i * 80} y={260 + (i % 4) * 40} width={18} height={24} fill={C.lamp} opacity={0.5 + (i % 3) * 0.15} />)}
      </svg>
      {/* the kiosk */}
      <div style={{ position: 'absolute', left: -760, top: counterY - 700, width: 1520, height: 110, background: `repeating-linear-gradient(90deg, ${C.red} 0 95px, ${C.paper} 95px 190px)`, border: `6px solid ${C.ink}`, boxShadow: '0 16px 0 rgba(0,0,0,.35)' }} />
      <svg viewBox="0 0 1520 40" width={1520} height={40} style={{ position: 'absolute', left: -760, top: counterY - 596, width: 1520, height: 40 }} aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <path key={i} d={`M${i * 95} 0q47 60 95 0z`} fill={i % 2 ? C.paper : C.red} stroke={C.ink} strokeWidth={5} />)}</svg>
      <div style={{ position: 'absolute', left: -210, top: counterY - 690, width: 420, height: 90, background: C.ink, color: C.paper, display: 'grid', placeItems: 'center', fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: 64, letterSpacing: '.12em', border: `6px solid ${C.paper}` }}>{p.news}</div>
      <div style={{ position: 'absolute', left: -740, top: counterY - 590, width: 22, height: 600, background: C.ink }} />
      <div style={{ position: 'absolute', left: 718, top: counterY - 590, width: 22, height: 600, background: C.ink }} />
      {/* racks of papers on the back wall */}
      {[-560, -380, 380, 560].map((x, i) => <At key={x} x={x} y={counterY - 340} w={150} h={200} rot={(i % 2 ? 3 : -3)}><Paper tone={i % 2 ? C.paper2 : C.paper}><i style={{ display: 'block', height: 26, background: i % 2 ? '#35C3E6' : C.red }} /><i style={{ display: 'block', margin: '12px 10px', height: 16, background: C.ink }} /><i style={{ display: 'block', margin: '0 10px', height: 12, width: '60%', background: C.ink3 }} /></Paper></At>)}
      {/* the vendor */}
      <div style={{ position: 'absolute', left: -150, top: counterY - 520 }}>
        <Figure h={560} shirt="#2E6B57" apron="#E9E2D3" hair="cap" capC={C.ink} skin={SKIN[2]} armL={12} armR={armR} bendR={bendR} holdR={held ? <Folded /> : undefined} />
      </div>
      {/* the counter */}
      <div style={{ position: 'absolute', left: -800, top: counterY, width: 1600, height: 700, background: `repeating-linear-gradient(90deg, #6B3F22 0 120px, #5A341C 120px 124px)`, border: `6px solid ${C.ink}`, boxShadow: '0 -10px 0 rgba(0,0,0,.25) inset' }} />
      <div style={{ position: 'absolute', left: -820, top: counterY - 24, width: 1640, height: 40, background: '#8A5530', border: `6px solid ${C.ink}` }} />
      {/* stacks on the counter; the slapped copy lands on top */}
      {[-520, 520].map((x) => <At key={x} x={x} y={counterY - 60} w={260} h={80}>{[0, 1, 2, 3].map((k) => <div key={k} style={{ position: 'absolute', left: k * 3, top: 60 - k * 16, width: 250, height: 20, background: k % 2 ? C.paper2 : C.paper, border: `3px solid ${C.ink}` }} />)}</At>)}
      {!held && <At x={70} y={counterY - 30} w={300} h={60} rot={-2} scale={1 + Math.max(0, 1 - (f - T.slap) / 4) * 0.2}><div style={{ position: 'absolute', inset: 0, background: C.paper, border: `4px solid ${C.ink}` }}><i style={{ display: 'block', height: 16, background: C.red }} /></div></At>}
      {f >= T.slap && f < T.slap + 10 && [0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI - Math.PI, d = 40 + (f - T.slap) * 26; return <i key={k} style={{ position: 'absolute', left: 70 + Math.cos(a) * d * 2, top: counterY - 40 + Math.sin(a) * d, width: 60, height: 10, background: C.paper, transform: `rotate(${(a * 180) / Math.PI}deg)`, opacity: 1 - (f - T.slap) / 10 }} />; })}
    </Layer>
    {/* the front page, rising to fill the frame */}
    {f >= T.push && <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `rgba(11,10,8,${0.55 * page})` }}>
      <div style={{ position: 'relative', width: W, height: H, transform: `translateY(${(1 - page) * 900}px) rotate(${(1 - page) * 12 - 1.5}deg) scale(${0.6 + 0.4 * page})` }}>
        <Paper lift={0.6}>
          <div style={{ padding: P ? '52px 56px' : '40px 56px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: P ? 26 : 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: `6px double ${C.ink}`, paddingBottom: 12 }}>
              <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: P ? 108 : 96, letterSpacing: '-.02em', lineHeight: 1 }}>{p.masthead}</span>
              <span style={{ fontFamily: F.mono, fontSize: 26, color: C.ink2, textAlign: 'end' }}>{p.edition}<br />{p.dateline}</span>
            </div>
            <div style={{ background: C.red, color: C.paper, fontFamily: F.cond, fontStretch: '75%', fontWeight: 900, fontSize: 40, letterSpacing: '.08em', padding: '8px 18px', alignSelf: 'flex-start', textTransform: 'uppercase' }}>{p.kicker}</div>
            <h1 style={{ margin: 0, fontFamily: F.display, fontWeight: 800, fontSize: P ? 112 : 100, lineHeight: 1.02, letterSpacing: '-.02em', color: C.ink }}><Typeset text={p.headline} at={T.hed} cpf={2.6} /></h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, opacity: k01(f, T.by, T.by + 8), transform: `translateX(${(1 - k01(f, T.by, T.by + 10)) * (p.rtl ? 40 : -40)}px)` }}>
              <i style={{ width: 14, height: 70, background: C.red }} />
              <span style={{ fontFamily: F.text, fontWeight: 800, fontSize: 46 }}>{p.byline}</span>
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 22, minHeight: 0, overflow: 'hidden' }}>
              {[0, 1, 2].map((k) => <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{Array.from({ length: 9 }, (_, j) => <i key={j} style={{ height: 12, width: `${70 + ((j * 13 + k * 7) % 30)}%`, background: C.paper3 }} />)}</div>)}
            </div>
          </div>
          <div style={{ position: 'absolute', insetInlineEnd: 40, bottom: P ? 70 : 40 }}><Stamp text={p.stamp} color={C.redDeep} at={T.stamp} size={P ? 92 : 80} rot={-8} /></div>
        </Paper>
      </div>
    </AbsoluteFill>}
  </AbsoluteFill>;
}
