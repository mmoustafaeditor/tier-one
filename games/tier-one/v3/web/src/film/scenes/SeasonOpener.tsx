// "The Rumour Mill": a season opens. One torch beam on a wall of pinned clippings; a red string races from pin to pin
// as the rumour spreads, circling each story it touches. The lights come up and the season's title slams on in its
// own colour. The copy and the accent come in as props, so every season (and language) uses the same film.
import { AbsoluteFill, interpolate, spring } from '../remotion-shim';
import { C, F, At, FilmLook, Layer, Paper, camAt, clamp, k01, noise, shake, useStage, EASE, type Key } from '../kit';
import type { SceneMeta } from '../cues';

export type SeasonOpenerProps = {
  /** "The Rumour Mill" */ title: string;
  /** "New season" */ kicker: string;
  /** "2 Sep – 31 Dec 2026" */ dates: string;
  /** Six rumour headlines for the clippings. */ clippings: string[];
  /** The season's accent colour. */ accent: string;
  rtl?: boolean;
};

const T = { first: 12, per: 13, reveal: 104, title: 118, end: 180 };
const N = 6;
const pinAt = (i: number) => T.first + i * T.per;
export const SEASON_OPENER: SceneMeta = {
  dur: T.end,
  beats: [0, T.reveal, T.title],
  cues: [{ f: 0, k: 'whoosh' }, ...Array.from({ length: N }, (_, i) => ({ f: pinAt(i), k: i % 2 ? 'tap' : 'flip' })), { f: T.reveal, k: 'open' }, { f: T.title, k: 'stamp' }, { f: T.title + 2, k: 'dayhit' }],
};

function clips(P: boolean) {
  return Array.from({ length: N }, (_, i) => P
    ? { x: (i % 2 ? 230 : -230) + ((i * 53) % 40) - 20, y: -760 + i * 300, r: ((i * 7) % 9) - 4 }
    : { x: -800 + i * 320, y: (i % 2 ? 190 : -190) + ((i * 53) % 40) - 20, r: ((i * 7) % 9) - 4 });
}

export function SeasonOpener(p: SeasonOpenerProps) {
  const { f, fps, P } = useStage();
  const cs = clips(P);
  const pins = cs.map((c) => ({ x: c.x, y: c.y - 130 }));
  // Where the string's head is now.
  const prog = interpolate(f, [pinAt(0), pinAt(N - 1)], [0, N - 1], clamp);
  const a = Math.floor(prog), b = Math.min(N - 1, a + 1), u = EASE.inOut(prog - a);
  const head = { x: pins[a].x + (pins[b].x - pins[a].x) * u, y: pins[a].y + (pins[b].y - pins[a].y) * u };
  const keys: Key[] = [
    { f: 0, x: pins[0].x, y: pins[0].y + 80, z: 1.7 },
    { f: pinAt(0), x: pins[0].x, y: pins[0].y + 100, z: 1.5 },
    ...pins.slice(1).map((q, i) => ({ f: pinAt(i + 1), x: q.x * 0.8, y: q.y + 100, z: 1.4 })),
    { f: T.reveal + 8, x: 0, y: 0, z: P ? 0.8 : 0.78 },
    { f: T.end, x: 0, y: 0, z: P ? 0.84 : 0.82 },
  ];
  const cam0 = camAt(f, keys), sh = shake(f, [T.title], 18);
  const cam = { ...cam0, x: cam0.x + sh.x + noise(f / 40, 2) * 8, y: cam0.y + sh.y + noise(f / 50, 3) * 6 };
  const lights = k01(f, T.reveal, T.reveal + 10);
  // The string: through every pin, sagging between them.
  const d = pins.map((q, i) => (i ? `Q${(pins[i - 1].x + q.x) / 2 + 1500} ${Math.max(pins[i - 1].y, q.y) + 70 + 1500} ${q.x + 1500} ${q.y + 1500}` : `M${q.x + 1500} ${q.y + 1500}`)).join(' ');
  const drawn = interpolate(f, [pinAt(0), pinAt(N - 1)], [0, 1], clamp);
  const ts = spring({ frame: f - T.title, fps, config: { damping: 11, stiffness: 220, mass: 0.9 } });

  return <AbsoluteFill style={{ background: '#0D0B09', overflow: 'hidden', direction: p.rtl ? 'rtl' : 'ltr' }}>
    <Layer cam={cam}>
      {/* The wall: dark cork. */}
      <div style={{ position: 'absolute', left: -2500, top: -2500, width: 5000, height: 5000, background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,.035) 0 2px, transparent 3px) 0 0/23px 23px, radial-gradient(circle at 70% 60%, rgba(0,0,0,.25) 0 3px, transparent 4px) 0 0/31px 31px, #2A2118' }} />
      {cs.map((c, i) => {
        const hit = f >= pinAt(i);
        const flut = hit ? Math.exp(-(f - pinAt(i)) / 6) * Math.sin((f - pinAt(i)) * 1.6) * 5 : 0;
        return <At key={i} x={c.x} y={c.y} w={430} h={290} rot={c.r + flut} style={{ transformOrigin: '50% 0' }}>
          <Paper tone={i % 3 === 1 ? '#EDE3CC' : C.paper}>
            <div style={{ padding: '38px 30px 24px' }}>
              <div style={{ fontFamily: F.mono, fontSize: 18, color: C.ink3, letterSpacing: '.06em' }}>{['07:12', '09:40', '11:05', '13:58', '16:20', '23:47'][i]}</div>
              <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 40, lineHeight: 1.08, marginTop: 8, textWrap: 'balance' }}>{p.clippings[i] || ''}</div>
              {[0, 1].map((r) => <i key={r} style={{ display: 'block', height: 8, marginTop: 14, width: r ? '60%' : '85%', background: C.ink3, opacity: 0.3 }} />)}
            </div>
            {hit && <svg viewBox="0 0 430 290" style={{ position: 'absolute', inset: 0 }} fill="none"><ellipse cx="215" cy="130" rx="200" ry="100" stroke={C.red} strokeWidth="7" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - k01(f, pinAt(i), pinAt(i) + 8)} transform="rotate(-4 215 130)" /></svg>}
          </Paper>
        </At>;
      })}
      <svg viewBox="0 0 3000 3000" style={{ position: 'absolute', left: -1500, top: -1500, width: 3000, height: 3000, overflow: 'visible' }} fill="none">
        <path d={d} stroke="#7A1508" strokeWidth={9} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - drawn} transform="translate(0 5)" opacity={0.5} />
        <path d={d} stroke={C.red} strokeWidth={6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - drawn} />
      </svg>
      {pins.map((q, i) => <i key={i} style={{ position: 'absolute', left: q.x - 16, top: q.y - 16, width: 32, height: 32, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #FF9B85, #C9381A 60%, #7A1508)', boxShadow: '3px 6px 6px rgba(0,0,0,.5)' }} />)}
      {/* The dark room and the torch beam following the rumour; then the lights come up. */}
      <div style={{ position: 'absolute', left: head.x - 3000, top: head.y - 3000, width: 6000, height: 6000, pointerEvents: 'none', background: `radial-gradient(circle 420px at 50% 50%, rgba(255,230,190,${0.1 * (1 - lights)}), rgba(5,4,3,${0.55 * (1 - lights)}) 60%, rgba(5,4,3,${0.94 - lights * 0.62}) 100%)` }} />
    </Layer>
    {/* The title: a strip of the season's colour, slammed on. Screen-space, so it sits square to the viewer. */}
    {f >= T.title && <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ transform: `rotate(-3deg) scale(${interpolate(ts, [0, 1], [2.2, 1])})`, opacity: interpolate(ts, [0, 0.4], [0, 1], clamp), background: p.accent, color: C.ink, padding: P ? '34px 50px 40px' : '30px 70px 36px', maxWidth: P ? 940 : 1400, boxShadow: '0 30px 80px rgba(0,0,0,.6)', textAlign: 'center' }}>
        <div style={{ fontFamily: F.mono, fontSize: P ? 30 : 28, letterSpacing: '.08em' }}>{p.kicker}</div>
        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: P ? 128 : 150, lineHeight: 0.95, letterSpacing: '-.03em', margin: '10px 0 14px', textWrap: 'balance' }}>{p.title}</div>
        <div style={{ fontFamily: F.cond, fontStretch: '72%', fontWeight: 800, fontSize: P ? 40 : 38, letterSpacing: '.06em', opacity: k01(f, T.title + 8, T.title + 16) }}>{p.dates}</div>
      </div>
    </AbsoluteFill>}
    <FilmLook vignette={0.75} />
  </AbsoluteFill>;
}
