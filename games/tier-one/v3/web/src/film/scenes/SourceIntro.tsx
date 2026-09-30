// "Meet your contact": one template, five sources. The phone buzzes on the desk, the caller card flips over, the
// place they call from is sketched in ink behind it, then the name, a trait and their first line.
// Characters stay objects (HYBRID.md §2: no drawn people): each source is a silhouette of their thing, not a face.
import { AbsoluteFill, interpolate, spring } from '../remotion-shim';
import { C, F, SRC_C, At, DeskSurface, FilmLook, Glyph, Layer, Paper, Typeset, camAt, clamp, k01, noise, useStage, EASE, type Key } from '../kit';
import type { SceneMeta } from '../cues';

export type SourceIntroProps = {
  src: 'kitman' | 'barber' | 'agent' | 'spotter' | 'physio';
  name: string; trait: string; line: string;
  /** "Incoming call" */ calling: string;
  /** "Unknown number" */ unknown: string;
  rtl?: boolean;
};

const T = { buzz1: 4, buzz2: 22, flip: 36, face: 46, sketch: 56, name: 92, trait: 116, line: 128, end: 180 };
const AMBIENCE: Record<string, string> = { kitman: 'kitman', barber: 'clippers', agent: 'whoosh', spotter: 'airport', physio: 'monitor' };
const PITCH: Record<string, number> = { kitman: 118, barber: 142, agent: 128, spotter: 205, physio: 190 };
export function sourceIntroMeta(src: string): SceneMeta {
  return {
    dur: T.end,
    beats: [0, T.flip, T.sketch, T.name],
    cues: [
      { f: 2, k: 'ringonce' }, { f: T.buzz1, k: 'buzz' }, { f: T.buzz2, k: 'ringonce' }, { f: T.buzz2 + 2, k: 'buzz' },
      { f: T.flip, k: 'flip' }, { f: T.face, k: 'pop' }, { f: T.sketch, k: AMBIENCE[src] || 'whoosh' },
      { f: T.name, k: 'typewriter' }, { f: T.line, k: 'voice', a: { base: PITCH[src] || 150, dur: 1.6 } },
    ],
  };
}

// The silhouette on each caller card (an object, never a person).
const SIL: Record<string, string> = {
  kitman: 'M100 26c0-9 12-9 12-17 0-7-8-9-13-6M100 34L50 58h100zM64 60L30 80l13 32 17-8v76h80v-76l17 8 13-32-34-20c-8 14-21 20-36 20s-28-6-36-20z',
  barber: 'M78 20h44v12H78zM72 170h56v12H72zM80 32h40v138H80z',
  agent: 'M24 70h152v96a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8zM72 70V48a6 6 0 0 1 6-6h44a6 6 0 0 1 6 6v22h-12V54H84v16z',
  spotter: 'M175 125l-67-33V42a12.5 12.5 0 0 0-25 0v50l-67 33v17l67-17v33l-17 12.5V183l29-8 29 8v-12.5L108 158v-33l67 17z',
  physio: 'M80 30h40v50h50v40h-50v50H80v-50H30V80h50z',
};
// The place each source calls from, as a pen sketch (drawn stroke by stroke).
const SKETCH: Record<string, string[]> = {
  kitman: ['M20 470H780', 'M80 110H720M80 110V70M720 110V70', ...[170, 330, 490, 650].map((x) => `M${x} 110v22m-45 18l-30 18 12 30 16-8v90h94v-90l16 8 12-30-30-18c-8 14-24 20-47 20s-35-6-43-20z`), 'M120 400H680M150 400V470M650 400V470', 'M300 470c0-30 10-40 30-40h20v40zM380 470c0-30 10-40 30-40h20v40z'],
  barber: ['M20 470H780', 'M470 60h260v250H470zM500 90l60 60M520 90l80 80', 'M180 270V150c0-30 20-40 60-40h60c40 0 60 10 60 40v120', 'M150 270h240v40H150zM150 250h40v40M350 250h40v40', 'M270 310v90M190 420c0-15 30-20 80-20s80 5 80 20zM200 360h140', 'M620 330h40v140h-40zM620 350l40 30M620 390l40 30M620 430l40 30'],
  agent: ['M60 60Q400 0 740 60L700 300Q400 270 100 300Z', 'M180 80l-20 60M300 60l-15 50M520 70l-25 70M640 90l-15 45M420 120l-20 55', 'M20 330Q400 290 780 330V420H20Z', 'M150 420a110 110 0 1 0 220 0a110 110 0 1 0-220 0M150 420H370M260 420V530', 'M560 340h90v150h-90zM575 360h60v100h-60z'],
  spotter: ['M40 40H760V300H40ZM280 40V300M520 40V300', 'M120 200L420 160 470 120 490 125 470 170 620 150 640 160 480 185 430 230 410 228 430 190 130 215Z', 'M560 330H760V450H560ZM580 360H740M580 390H700M580 420H720', 'M40 400H520M80 400V480M480 400V480', 'M300 420h70v60h-70zM320 420v-15h30v15', 'M20 490H780'],
  physio: ['M20 480H780', 'M100 330H560V360H100ZM130 360V470M530 360V470M100 330c0-20 10-30 40-30h60v30', 'M600 80H760V220H600ZM612 160h30l12-40 16 70 12-50 10 20h56', 'M680 220V470M640 470H720', 'M300 80h40v40h40v40h-40v40h-40v-40h-40v-40h40z', 'M380 40V120M340 150L380 120 420 150Z'],
};

function layout(P: boolean, rtl?: boolean) {
  const m = rtl ? -1 : 1;
  return P
    ? { card: { x: 0, y: 120, w: 440, h: 600 }, sketch: { x: 0, y: -560, w: 860, h: 600 }, text: { x: 0, y: 470, w: 900, align: 'center' as const } }
    : { card: { x: m * -60, y: -10, w: 400, h: 560 }, sketch: { x: m * -600, y: -20, w: 700, h: 490 }, text: { x: m * 540, y: -230, w: 640, align: 'start' as const } };
}

export function SourceIntro(p: SourceIntroProps) {
  const { f, fps, P } = useStage();
  const L = layout(P, p.rtl);
  const col = SRC_C[p.src] || C.red;
  const keys: Key[] = P
    ? [{ f: 0, x: 0, y: 130, z: 1.75 }, { f: T.flip, x: 0, y: 120, z: 1.6 }, { f: 70, x: 0, y: -10, z: 1.0 }, { f: T.end, x: 0, y: 10, z: 1.06 }]
    : [{ f: 0, x: L.card.x, y: -10, z: 1.7 }, { f: T.flip, x: L.card.x, y: -10, z: 1.55 }, { f: 70, x: 0, y: 0, z: 1.0 }, { f: T.end, x: 0, y: 0, z: 1.05 }];
  const cam = camAt(f, keys);
  const buzzing = (f >= T.buzz1 && f < T.buzz1 + 12) || (f >= T.buzz2 && f < T.buzz2 + 12);
  const jit = buzzing ? { x: noise(f * 3.3, 1) * 5, r: noise(f * 2.9, 2) * 1.6 } : { x: 0, r: 0 };
  // The flip: the phone turns away (0→90°), the card turns in (−90°→0), with a little overshoot.
  const flipA = interpolate(f, [T.flip, T.flip + 7], [0, 90], { ...clamp, easing: EASE.in });
  const flipB = f < T.flip + 7 ? -90 : interpolate(spring({ frame: f - T.flip - 7, fps, config: { damping: 12, stiffness: 180 } }), [0, 1], [-90, 0]);
  const glow = f < T.flip ? (buzzing ? 0.8 + 0.2 * noise(f, 4) : 0.5) : 0.35 + 0.65 * k01(f, T.face, T.face + 10);

  return <AbsoluteFill style={{ background: C.night, overflow: 'hidden', direction: p.rtl ? 'rtl' : 'ltr' }}>
    <Layer cam={cam} depth={0.6}>
      <div style={{ position: 'absolute', left: -2400, top: -2400, width: 4800, height: 4800, background: `radial-gradient(circle 1200px at 50% 50%, ${col}22, transparent 70%)` }} />
    </Layer>
    <Layer cam={cam}>
      <DeskSurface x={-3000} y={-3000} w={6000} h={6000} />
      <div style={{ position: 'absolute', left: L.card.x - 900, top: L.card.y - 900, width: 1800, height: 1800, borderRadius: '50%', background: `radial-gradient(circle, ${col}${f < T.flip ? '55' : '44'}, transparent 62%)`, opacity: glow }} />
      {/* The setting, sketched in ink on a loose sheet. */}
      <At x={L.sketch.x} y={L.sketch.y} w={L.sketch.w} h={L.sketch.h} rot={P ? -2 : -3} style={{ opacity: k01(f, T.sketch - 6, T.sketch + 4) }}>
        <Paper>
          <div style={{ position: 'absolute', left: '18%', top: '12%', width: '64%', height: '70%', borderRadius: '42% 58% 50% 50%', background: col, opacity: 0.22 * k01(f, T.sketch, T.sketch + 30), filter: 'blur(18px)' }} />
          <svg viewBox="0 0 800 560" style={{ position: 'absolute', inset: '4%', width: '92%', height: '92%', transform: p.rtl ? 'scaleX(-1)' : undefined }} fill="none" stroke={C.ink} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
            {(SKETCH[p.src] || []).map((d, i) => <path key={i} d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - k01(f, T.sketch + i * 5, T.sketch + i * 5 + 24, EASE.inOut)} />)}
          </svg>
        </Paper>
      </At>
      {/* The phone, then the caller card on its back. */}
      <At x={L.card.x + jit.x} y={L.card.y} w={L.card.w} h={L.card.h} rot={jit.r} style={{ perspective: 1400 }}>
        {f < T.flip + 7 && <div style={{ position: 'absolute', inset: 0, transform: `rotateY(${flipA}deg)`, borderRadius: 48, background: '#0E0D0B', boxShadow: `0 30px 60px rgba(0,0,0,.7), 0 0 ${60 * glow}px ${col}66`, border: '10px solid #2C271F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, color: C.paper }}>
          {[0, 1, 2].map((r) => <i key={r} style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', border: `4px solid ${col}`, opacity: Math.max(0, 1 - ((f + r * 6) % 18) / 18), transform: `scale(${1 + ((f + r * 6) % 18) / 12})` }} />)}
          <span style={{ width: 180, height: 180, borderRadius: '50%', background: col, display: 'grid', placeItems: 'center', color: C.ink }}><Glyph n="phone" size={86} /></span>
          <span style={{ fontFamily: F.mono, fontSize: 30, letterSpacing: '.06em', color: col }}>{p.calling}</span>
          <span style={{ fontFamily: F.display, fontSize: 44, fontWeight: 700 }}>{p.unknown}</span>
        </div>}
        {f >= T.flip + 7 && <div style={{ position: 'absolute', inset: 0, transform: `rotateY(${flipB}deg)` }}>
          <Paper lift={0.4}>
            <div style={{ height: '72%', background: `radial-gradient(90% 70% at 50% 40%, rgba(255,255,255,.25), transparent 70%), ${col}`, display: 'grid', placeItems: 'center' }}>
              <svg viewBox="0 0 200 200" width="64%" height="64%" aria-hidden="true"><path d={SIL[p.src]} fill={C.ink} stroke={C.ink} strokeWidth={p.src === 'kitman' ? 4 : 0} strokeLinejoin="round" />
                {p.src === 'barber' && [0, 1, 2, 3].map((i) => <path key={i} d={`M80 ${50 + i * 32}l40 -18v14l-40 18z`} fill={C.paper} />)}</svg>
            </div>
            <div style={{ padding: '18px 26px', display: 'flex', alignItems: 'center', gap: 14, color: C.ink }}>
              <Glyph n={p.src} size={52} color={C.ink} />
              <span style={{ fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: 40, letterSpacing: '.05em', textTransform: 'uppercase' }}>{p.name}</span>
            </div>
          </Paper>
        </div>}
      </At>
      {/* Name, trait, first line. */}
      <div style={{ position: 'absolute', left: L.text.x - L.text.w / 2, top: L.text.y, width: L.text.w, textAlign: L.text.align, color: C.paper, display: 'flex', flexDirection: 'column', gap: 18, alignItems: L.text.align === 'center' ? 'center' : 'flex-start' }}>
        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 96, lineHeight: 1, letterSpacing: '-.02em' }}><Typeset text={p.name} at={T.name} cpf={0.7} rtl={p.rtl} /></div>
        <div style={{ fontFamily: F.text, fontSize: 38, lineHeight: 1.3, color: '#BDB5A5', opacity: k01(f, T.trait, T.trait + 10), transform: `translateY(${(1 - k01(f, T.trait, T.trait + 12)) * 24}px)` }}>{p.trait}</div>
        {f >= T.line && <div style={{ position: 'relative', background: C.paper, color: C.ink, borderRadius: 22, padding: '22px 30px', fontFamily: F.display, fontStyle: 'italic', fontSize: 44, lineHeight: 1.25, boxShadow: `0 8px 0 ${col}`, transform: `scale(${spring({ frame: f - T.line, fps, config: { damping: 13, stiffness: 200 } })})`, transformOrigin: L.text.align === 'center' ? '50% 0' : p.rtl ? '100% 0' : '0 0', maxWidth: L.text.w }}>
          <Typeset text={p.line} at={T.line + 4} cpf={1.3} rtl={p.rtl} />
        </div>}
      </div>
    </Layer>
    <FilmLook vignette={0.7} />
  </AbsoluteFill>;
}
