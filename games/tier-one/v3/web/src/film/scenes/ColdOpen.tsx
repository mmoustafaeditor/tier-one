// "First Day at the Paper": the opening of the whole game (and, cut short, of every new Career slot).
// A night newsroom. The desk lamp flicks on, the editor's note is slapped down, your byline is typeset, the five
// sources are dealt onto the desk, the press spins up and rolls out a front page with your name on it, and the
// TIER ONE stamp slams down. One world, filmed by one camera; portrait and landscape frame the same stage.
import { AbsoluteFill, Sequence, interpolate, spring } from '../remotion-shim';
import { C, F, SRC_C, SOURCES, At, DeskSurface, FilmLook, Glyph, Layer, Motes, Paper, Stamp, Typeset, camAt, clamp, k01, noise, shake, slam, useStage, EASE, type Key } from '../kit';
import type { SceneMeta } from '../cues';

export type ColdOpenProps = {
  /** The player's byline (their name). */ byline: string;
  /** "By {name}" already filled. */ byLabel: string;
  /** The masthead: the paper they write for. */ paper: string;
  /** Small line under the masthead. */ edition: string;
  memo: string; note: string; sign: string;
  headline: string; dateline: string;
  /** The five source names, in SOURCES order. */ sources: string[];
  stamp: string;
  cut?: 'full' | 'career';
  rtl?: boolean;
};

const LAMP = { x: -430, y: -560 }, POOL = { x: -40, y: -140 };
const PRESS = { x: 1650, y: -640 };
const T = { lamp: 18, note: 42, noteHit: 52, card: 86, type: 96, deal: 150, whip: 200, spin: 206, roll: 212, stamp: 262, end: 300 };
const CUT = { a: 80, b: 236 };

export const COLD_OPEN: SceneMeta = {
  dur: 300,
  beats: [0, 40, 85, 150, 200, 262],
  cues: [
    { f: 0, k: 'clock' }, { f: 12, k: 'clock' }, { f: 18, k: 'tap' }, { f: 22, k: 'tap' }, { f: 26, k: 'tap' },
    { f: 42, k: 'whoosh' }, { f: 52, k: 'stamp' }, { f: 58, k: 'voice', a: { base: 104, dur: 1.4 } },
    { f: 90, k: 'flip' }, { f: 96, k: 'typewriter' }, { f: 124, k: 'typewriter' },
    { f: 150, k: 'flip' }, { f: 158, k: 'flip' }, { f: 166, k: 'flip' }, { f: 174, k: 'flip' }, { f: 182, k: 'flip' },
    { f: 200, k: 'whoosh' }, { f: 206, k: 'open' }, { f: 218, k: 'shred' }, { f: 240, k: 'shred' },
    { f: 262, k: 'stamp' }, { f: 266, k: 'fanfare' },
  ],
};
/** The Career-slot cut (~5 s): lamp on, the editor's note, then straight to the headline and the stamp. */
export const COLD_OPEN_CAREER: SceneMeta = {
  dur: CUT.a + (T.end - CUT.b),
  beats: [0, 40, CUT.a],
  cues: COLD_OPEN.cues.filter((c) => c.f < CUT.a || c.f >= CUT.b).map((c) => (c.f >= CUT.b ? { ...c, f: c.f - CUT.b + CUT.a } : c)),
};

export function ColdOpen(props: ColdOpenProps) {
  if (props.cut !== 'career') return <Body {...props} />;
  // A hard cut, like film: the first beats, then jump to the press finishing its run.
  return <AbsoluteFill>
    <Sequence name="Lamp and note" durationInFrames={CUT.a}><Body {...props} /></Sequence>
    <Sequence name="Front page" from={CUT.a}><Sequence from={-CUT.b} layout="none"><Body {...props} /></Sequence></Sequence>
  </AbsoluteFill>;
}

function cameraKeys(P: boolean): Key[] {
  return [
    { f: 0, x: -120, y: P ? -760 : -700, z: P ? 1.2 : 1.1 },
    { f: 30, x: -120, y: P ? -700 : -640, z: P ? 1.2 : 1.1 },
    { f: 50, x: -110, y: P ? -300 : -320, z: P ? 1.2 : 1.25 },
    { f: 84, x: -90, y: P ? -250 : -300, z: P ? 1.28 : 1.35 },
    { f: 96, x: 140, y: P ? 40 : 60, z: P ? 1.3 : 1.35 },
    { f: 146, x: 160, y: P ? 70 : 80, z: P ? 1.42 : 1.45 },
    { f: 170, x: 0, y: P ? 200 : 120, z: P ? 0.82 : 0.8 },
    { f: 200, x: 0, y: P ? 220 : 130, z: P ? 0.84 : 0.82 },
    { f: 214, x: PRESS.x, y: P ? 40 : -40, z: P ? 1.0 : 0.78 },
    { f: 262, x: PRESS.x, y: P ? 70 : -20, z: P ? 1.04 : 0.8 },
    // Portrait: the front page (880 wide) has to stay inside the 1080 stage, so the last push-in keeps it centred
    // and gentler; the +60 drift is landscape only (it cropped the headline's left edge on a 390 px phone).
    { f: 272, x: PRESS.x + (P ? 0 : 60), y: P ? 180 : 40, z: P ? 1.1 : 0.9 },
    { f: 300, x: PRESS.x + (P ? 0 : 60), y: P ? 190 : 50, z: P ? 1.12 : 0.92 },
  ];
}

function Body(p: ColdOpenProps) {
  const { f, fps, P } = useStage();
  const keys = cameraKeys(P);
  const cam = camAt(f, keys), prev = camAt(f - 1, keys);
  const speed = Math.hypot(cam.x - prev.x, cam.y - prev.y) * cam.z;
  const sh = shake(f, [T.noteHit, T.stamp], 16);
  const drift = { x: noise(f / 45, 3) * 6, y: noise(f / 55, 5) * 5 };
  const c: Key = { ...cam, x: cam.x + drift.x + sh.x, y: cam.y + drift.y + sh.y };
  // The lamp: dead, three stutters, then on. A breath of flicker stays in the bulb.
  const flick = f < T.lamp ? 0 : f < T.lamp + 3 ? 1 : f < T.lamp + 5 ? 0.15 : f < T.lamp + 8 ? 0.9 : f < T.lamp + 9 ? 0.4 : 1;
  const lamp = flick * (0.94 + 0.06 * noise(f / 3, 7));
  const pressLight = k01(f, T.whip, T.spin + 6);
  const dir = p.rtl ? 'rtl' : 'ltr';

  return <AbsoluteFill style={{ background: C.night, overflow: 'hidden', direction: dir }}>
    {/* The newsroom beyond the desk: city windows and other people's lamps, far away. */}
    <Layer cam={c} depth={0.45} style={{ filter: 'blur(3px)' }}>
      <div style={{ position: 'absolute', left: -2600, top: -2600, width: 6200, height: 2300, background: 'linear-gradient(180deg,#0E0D0B,#15120E)' }} />
      {Array.from({ length: 36 }, (_, i) => {
        const col = i % 12, row = Math.floor(i / 12), on = (i * 37) % 5 !== 0;
        return <i key={i} style={{ position: 'absolute', left: -2000 + col * 330, top: -1900 + row * 260, width: 200, height: 150, background: on ? `rgba(255,${190 + ((i * 13) % 40)},120,${0.05 + ((i * 7) % 10) / 90})` : 'rgba(80,110,160,.05)', boxShadow: on ? '0 0 60px rgba(255,190,110,.12)' : 'none' }} />;
      })}
      {[[-1300, -520, '#5F8BD6'], [700, -560, '#6FA0E8'], [1900, -500, '#FFC873']].map(([x, y, col], i) => <i key={i} style={{ position: 'absolute', left: Number(x), top: Number(y), width: 320, height: 200, borderRadius: 30, background: String(col), opacity: 0.16 + 0.04 * noise(f / 9 + i, i), filter: 'blur(40px)' }} />)}
    </Layer>

    {/* The desk. */}
    <Layer cam={c} depth={1} style={{ filter: speed > 12 ? `blur(${Math.min(14, (speed - 12) / 5)}px)` : undefined }}>
      <DeskSurface />
      <Lamp on={lamp} />
      <FrontPage p={p} f={f} fps={fps} />
      <Press f={f} />
      <Note p={p} f={f} fps={fps} />
      <BylineCard p={p} f={f} fps={fps} />
      {SOURCES.map((s, i) => <SourceCard key={s} i={i} src={s} name={p.sources[i] || ''} f={f} fps={fps} P={P} />)}
      {/* The dark: one pool of lamp light, then the press's work light. */}
      <div style={{ position: 'absolute', left: -3000, top: -3000, width: 9000, height: 7000, pointerEvents: 'none', background: 'rgba(6,5,4,.93)',
        WebkitMaskImage: `radial-gradient(circle 1150px at ${POOL.x + 3000}px ${POOL.y + 3000}px, rgba(0,0,0,${1 - lamp}) 0, rgba(0,0,0,${1 - lamp * 0.85}) 45%, #000 100%), radial-gradient(circle 1300px at ${PRESS.x + 3000}px ${PRESS.y + 3500}px, rgba(0,0,0,${1 - pressLight}) 0, rgba(0,0,0,${1 - pressLight * 0.8}) 50%, #000 100%)`,
        maskImage: `radial-gradient(circle 1150px at ${POOL.x + 3000}px ${POOL.y + 3000}px, rgba(0,0,0,${1 - lamp}) 0, rgba(0,0,0,${1 - lamp * 0.85}) 45%, #000 100%), radial-gradient(circle 1300px at ${PRESS.x + 3000}px ${PRESS.y + 3500}px, rgba(0,0,0,${1 - pressLight}) 0, rgba(0,0,0,${1 - pressLight * 0.8}) 50%, #000 100%)`,
        WebkitMaskComposite: 'source-in', maskComposite: 'intersect' }} />
      <div style={{ position: 'absolute', left: POOL.x - 1100, top: POOL.y - 1100, width: 2200, height: 2200, borderRadius: '50%', background: `radial-gradient(circle, rgba(255,200,115,${0.16 * lamp}), transparent 65%)`, mixBlendMode: 'screen', pointerEvents: 'none' }} />
    </Layer>

    {/* Foreground: dust in the lamp light, closer than the desk. */}
    <Layer cam={c} depth={1.35} style={{ opacity: lamp }}><div style={{ position: 'absolute', left: POOL.x - 200, top: POOL.y - 200 }}><Motes n={16} /></div></Layer>
    <FilmLook vignette={0.8} />
  </AbsoluteFill>;
}

function Lamp({ on }: { on: number }) {
  return <At x={LAMP.x} y={LAMP.y} w={420} h={520} style={{ pointerEvents: 'none' }}>
    <svg viewBox="0 0 420 520" width={420} height={520} style={{ overflow: 'visible' }}>
      <ellipse cx="110" cy="490" rx="100" ry="26" fill="#0B0A08" />
      <path d="M110 480 L150 250 L300 150" stroke="#3A342A" strokeWidth="18" fill="none" strokeLinecap="round" />
      <circle cx="150" cy="250" r="14" fill="#4A443A" />
      <path d="M250 90 L380 150 L330 250 L200 190 Z" fill="#2C271F" stroke="#4A443A" strokeWidth="4" />
      <ellipse cx="300" cy="225" rx="60" ry="22" transform="rotate(25 300 225)" fill={`rgba(255,214,140,${0.15 + on * 0.85})`} style={{ filter: `drop-shadow(0 0 ${10 + on * 40}px rgba(255,200,115,${on}))` }} />
    </svg>
  </At>;
}

function Note({ p, f, fps }: { p: ColdOpenProps; f: number; fps: number }) {
  if (f < T.note) return null;
  const s = slam(f, fps, T.note, { damping: 14, stiffness: 120, mass: 1 });
  const x = interpolate(s, [0, 1], [900, -120]), y = interpolate(s, [0, 1], [-1200, -330]);
  const lift = interpolate(f, [T.note, T.noteHit], [1, 0], clamp);
  return <At x={x} y={y} w={640} h={400} rot={interpolate(s, [0, 1], [28, -5])} scale={1 + lift * 0.25} z={3}>
    <Paper lift={lift} tone="#F1E6C3">
      <div style={{ padding: '34px 44px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: F.mono, fontSize: 20, letterSpacing: '.08em', color: C.redDeep, borderBottom: `3px solid ${C.redDeep}`, paddingBottom: 10 }}>{p.memo}</div>
        <p style={{ fontFamily: F.display, fontStyle: 'italic', fontSize: 40, lineHeight: 1.22, margin: '18px 0 0', color: C.ink, flex: 1 }}>{p.note}</p>
        <div style={{ fontFamily: F.display, fontSize: 30, fontWeight: 700, alignSelf: 'flex-end', color: C.ink2 }}>{p.sign}</div>
      </div>
    </Paper>
  </At>;
}

function BylineCard({ p, f, fps }: { p: ColdOpenProps; f: number; fps: number }) {
  if (f < T.card) return null;
  const s = spring({ frame: f - T.card, fps, config: { damping: 16, stiffness: 140 } });
  return <At x={170} y={interpolate(s, [0, 1], [420, 80])} w={760} h={250} rot={interpolate(s, [0, 1], [8, 2])} z={4}>
    <Paper lift={1 - s}>
      <div style={{ height: 26, background: C.red }} />
      <div style={{ padding: '22px 40px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontFamily: F.mono, fontSize: 22, color: C.ink3, letterSpacing: '.06em' }}>{p.byLabel.replace(p.byline, '').trim() || '—'}</span>
        <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 96, lineHeight: 1, letterSpacing: '-.02em', whiteSpace: 'nowrap' }}><Typeset text={p.byline} at={T.type} cpf={0.55} rtl={p.rtl} /></span>
      </div>
    </Paper>
  </At>;
}

function SourceCard({ i, src, name, f, fps, P }: { i: number; src: string; name: string; f: number; fps: number; P: boolean }) {
  const at = T.deal + i * 8;
  if (f < at) return null;
  const s = spring({ frame: f - at, fps, config: { damping: 15, stiffness: 170, mass: 0.9 } });
  const tx = (i - 2) * (P ? 214 : 250), ty = 590 + Math.abs(i - 2) * 18, rot = (i - 2) * 5 + ((i * 37) % 7) - 3;
  return <At x={interpolate(s, [0, 1], [1300, tx])} y={interpolate(s, [0, 1], [1500, ty])} w={200} h={290} rot={interpolate(s, [0, 1], [70 + i * 20, rot])} scale={interpolate(s, [0, 1], [1.3, 1])} z={5 + i}>
    <Paper lift={Math.max(0, 1 - s)}>
      <div style={{ height: 170, background: SRC_C[src], display: 'grid', placeItems: 'center', color: C.ink }}><Glyph n={src} size={96} w={1.8} /></div>
      <div style={{ padding: '14px 16px', fontFamily: F.display, fontWeight: 700, fontSize: 28, lineHeight: 1.08 }}>{name}</div>
    </Paper>
  </At>;
}

function Press({ f }: { f: number }) {
  // The rollers: still, then spinning up (angle ∝ t² until full speed).
  const t = Math.max(0, f - T.spin), turn = t < 20 ? t * t * 0.9 : 360 + (t - 20) * 36;
  return <At x={PRESS.x} y={PRESS.y} w={1180} h={220} z={8}>
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#3A342A,#1B1813)', borderRadius: 18, boxShadow: '0 30px 60px rgba(0,0,0,.7)' }} />
    {[40, 118].map((y, j) => <div key={j} style={{ position: 'absolute', left: 60, right: 60, top: y, height: 66, borderRadius: 33, background: `repeating-linear-gradient(180deg, rgba(255,255,255,.14) 0 6px, transparent 6px 22px) 0 ${(turn * (j ? -1 : 1)) % 22}px / 100% 22px, linear-gradient(180deg,#8C8475,#2C271F 70%)`, boxShadow: 'inset 0 -10px 0 rgba(0,0,0,.35), inset 0 6px 0 rgba(255,255,255,.12)' }} />)}
    <div style={{ position: 'absolute', left: 20, top: 16, width: 16, height: 16, borderRadius: 8, background: f >= T.spin ? C.red : '#3A342A', boxShadow: f >= T.spin ? `0 0 18px ${C.red}` : 'none' }} />
  </At>;
}

function FrontPage({ p, f, fps }: { p: ColdOpenProps; f: number; fps: number }) {
  if (f < T.roll) return null;
  const out = interpolate(f, [T.roll, T.stamp - 6], [0, 1], { ...clamp, easing: EASE.out });
  const W = 880, H = 1180, top = PRESS.y + 110;
  const rise = spring({ frame: f - (T.stamp + 10), fps, config: { damping: 20, stiffness: 80 } });
  return <div style={{ position: 'absolute', left: PRESS.x - W / 2, top, width: W, height: H, overflow: 'hidden', zIndex: 7 }}>
    <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(out - 1) * H}px) rotate(${(1 - out) * 1.5 + rise * -1.2}deg)` }}>
      <Paper lift={0.3 * (1 - out)}>
        <div style={{ padding: '36px 46px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          <div style={{ borderTop: `8px solid ${C.ink}`, borderBottom: `2px solid ${C.ink}`, padding: '10px 0 6px', textAlign: 'center' }}>
            <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 84, lineHeight: 1, letterSpacing: '-.03em' }}>{p.paper}</div>
            <div style={{ fontFamily: F.mono, fontSize: 18, color: C.ink2, marginTop: 6, letterSpacing: '.06em' }}>{p.edition} · {p.dateline}</div>
          </div>
          <h1 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 104, lineHeight: 0.98, letterSpacing: '-.03em', margin: '34px 0 14px', textWrap: 'balance' }}>{p.headline}</h1>
          <div style={{ fontFamily: F.cond, fontStretch: '72%', fontWeight: 800, fontSize: 30, letterSpacing: '.06em', color: C.redDeep, textTransform: 'uppercase' }}>{p.byLabel}</div>
          <div style={{ marginTop: 22, height: 250, background: `radial-gradient(circle, ${C.ink} 34%, transparent 36%) 0 0 / 9px 9px, ${C.paper3}`, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 30px' }}>
            {SOURCES.map((s) => <span key={s} style={{ background: C.paper, borderRadius: '50%', width: 110, height: 110, display: 'grid', placeItems: 'center' }}><Glyph n={s} size={64} color={C.ink} /></span>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 22, marginTop: 24, flex: 1 }}>
            {[0, 1, 2].map((col) => <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 9 }, (_, r) => <i key={r} style={{ height: 10, background: C.ink3, opacity: 0.35, width: `${70 + ((col * 9 + r) * 23) % 30}%` }} />)}
            </div>)}
          </div>
        </div>
        <div style={{ position: 'absolute', left: '50%', top: '66%', transform: 'translate(-50%,-50%)' }}>
          <Stamp text={p.stamp} color={C.redDeep} at={T.stamp} size={150} rot={-11} />
        </div>
      </Paper>
    </div>
  </div>;
}
