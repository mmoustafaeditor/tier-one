// A Wire call settles your way: the TV on the desk cuts to breaking news. A generic figure in club colours holds the
// new shirt up to the flashes, OFFICIAL slams onto the band, the ticker rolls, and your name comes up in the credits.
import { AbsoluteFill, spring } from '../remotion-shim';
import { C, F, FilmLook, Layer, Stamp, Typeset, camAt, k01, noise, useStage, EASE, type Key } from '../kit';
import { Figure, SKIN } from '../people';
import { pick } from './bits';
import type { SceneMeta } from '../cues';

export type OfficialProps = { player: string; breaking: string; official: string; ticker: string; credit: string; byline: string; kit?: string; rtl?: boolean };

const T = { on: 4, walk: 10, lift: 28, stamp: 40, credit: 58, end: 104 };
export const OFFICIAL: SceneMeta = {
  dur: T.end, hold: 700, beats: [0, T.lift, T.stamp, T.credit],
  cues: [{ f: 0, k: 'flip' }, { f: T.on, k: 'reveal' }, { f: T.lift, k: 'tap' }, { f: T.lift + 5, k: 'tap' }, { f: T.stamp, k: 'stamp' }, { f: T.stamp + 2, k: 'herewego' }, { f: T.credit, k: 'typewriter' }],
};
const KITS = ['#C8102E', '#1D428A', '#6CABDD', '#FDB913', '#034694', '#7A263A', '#FFFFFF', '#00A650'];

export function Official(p: OfficialProps) {
  const { f, fps, P } = useStage();
  const kit = p.kit || KITS[pick(p.player, KITS.length)];
  const numC = kit === '#FFFFFF' || kit === '#FDB913' || kit === '#6CABDD' ? C.ink : C.paper;
  const no = 2 + pick(p.player + '#', 28);
  const keys: Key[] = [{ f: 0, x: 0, y: 0, z: P ? 0.9 : 0.9 }, { f: T.stamp, x: 0, y: 0, z: P ? 1.0 : 1.0 }, { f: T.end, x: 0, y: 0, z: P ? 1.03 : 1.03 }];
  const cam = camAt(f, keys);
  const on = k01(f, 0, T.on + 2, EASE.out);
  const walk = k01(f, T.walk, T.lift, EASE.out);
  const lift = k01(f, T.lift, T.lift + 8, EASE.out);
  const flash = f > T.lift ? Math.max(0, ...[0, 5, 11, 16, 24, 31].map((d, i) => (1 - Math.abs(f - T.lift - d) / 2.5) * (i % 2 ? 0.7 : 1))) : 0;
  const cr = spring({ frame: f - T.credit, fps, config: { damping: 14, stiffness: 160 } });
  // The TV screen, in stage pixels, and its studio inside.
  const SW = P ? 980 : 1640, SH = P ? 1400 : 860;
  const tick = (f * 9) % 2400;
  return <AbsoluteFill style={{ background: C.desk, overflow: 'hidden', direction: p.rtl ? 'rtl' : 'ltr' }}>
    <Layer cam={cam}>
      <div style={{ position: 'absolute', left: -1400, top: -1400, width: 2800, height: 2800, background: `radial-gradient(circle at 50% 40%, #2C271F, ${C.night})` }} />
      <div style={{ position: 'absolute', left: -SW / 2 - 30, top: -SH / 2 - 30, width: SW + 60, height: SH + 60, background: '#0A0A0A', borderRadius: 30, boxShadow: '0 40px 90px rgba(0,0,0,.7)' }} />
      <div style={{ position: 'absolute', left: -SW / 2, top: -SH / 2, width: SW, height: SH, overflow: 'hidden', borderRadius: 10, background: '#000', transform: `scaleY(${0.02 + 0.98 * on})` }}>
        {/* studio: sponsor wall */}
        <div style={{ position: 'absolute', inset: 0, background: `repeating-linear-gradient(90deg, ${kit}33 0 140px, transparent 140px 280px), repeating-linear-gradient(0deg, #1A1C24 0 110px, #22252F 110px 220px)` }} />
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(60% 60% at 50% 45%, rgba(255,255,255,${0.12 + flash * 0.5}), transparent 70%)` }} />
        {/* the figure: back to camera, shirt up over their head */}
        <div style={{ position: 'absolute', left: '50%', bottom: P ? 250 : 120, transform: `translateX(${(1 - walk) * (p.rtl ? 700 : -700) - 150}px)` }}>
          <Figure h={P ? 820 : 600} shirt="#1B1D26" legs="#1B1D26" back hair="short" skin={SKIN[pick(p.player, 5)]} armL={40 + lift * 110} bendL={-lift * 30} armR={40 + lift * 110} bendR={-lift * 30} />
          <div style={{ position: 'absolute', left: '50%', top: (P ? 820 : 600) * (0.3 - lift * 0.3), width: (P ? 820 : 600) * 0.5, marginLeft: -(P ? 820 : 600) * 0.25, opacity: lift }}>
            <svg viewBox="0 0 200 200" width="100%" aria-hidden="true" style={{ overflow: 'visible', filter: 'drop-shadow(8px 12px 0 rgba(0,0,0,.35))' }}>
              <path d="M64 40L20 64l16 40 20-8v94h88V96l20 8 16-40-44-24c-8 14-20 20-36 20s-28-6-36-20z" fill={kit} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
              <text x={100} y={150} textAnchor="middle" fontFamily='"Archivo", "Arial Narrow", sans-serif' fontWeight={900} fontSize={70} fill={numC} stroke={C.ink} strokeWidth={2}>{no}</text>
            </svg>
          </div>
        </div>
        {/* the band */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: P ? 110 : 70, height: P ? 150 : 120, display: 'flex', alignItems: 'stretch', background: C.paper, borderTop: `6px solid ${C.ink}` }}>
          <span style={{ background: C.red, color: C.paper, display: 'grid', placeItems: 'center', padding: '0 30px', fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: P ? 54 : 48, letterSpacing: '.08em' }}>{p.breaking}</span>
          <span style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 28px', fontFamily: F.display, fontWeight: 800, fontSize: P ? 60 : 56, color: C.ink, overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.player}</span>
        </div>
        {/* the ticker */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: P ? 110 : 70, background: C.ink, color: C.paper, overflow: 'hidden', fontFamily: F.mono, fontSize: P ? 38 : 32, display: 'flex', alignItems: 'center' }}>
          <span style={{ whiteSpace: 'nowrap', transform: `translateX(${p.rtl ? tick - 1200 : 1200 - tick}px)` }}>{Array(4).fill(p.ticker).join('   ·   ')}</span>
        </div>
        {/* the credit: your name on the broadcast */}
        {f >= T.credit && <div style={{ position: 'absolute', insetInlineStart: P ? 40 : 60, top: P ? 60 : 50, transform: `translateX(${(1 - cr) * (p.rtl ? 900 : -900)}px)`, display: 'flex', alignItems: 'stretch', boxShadow: '0 20px 40px rgba(0,0,0,.5)' }}>
          <i style={{ width: 18, background: C.red }} />
          <div style={{ background: C.paper, color: C.ink, padding: '14px 26px' }}>
            <div style={{ fontFamily: F.mono, fontSize: P ? 30 : 26, color: C.ink2, letterSpacing: '.06em' }}>{p.credit}</div>
            <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: P ? 70 : 60, lineHeight: 1.05 }}><Typeset text={p.byline} at={T.credit + 4} cpf={1} /></div>
          </div>
        </div>}
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.14) 0 2px, transparent 2px 5px)', opacity: 0.5 + 0.2 * noise(f / 3, 4) }} />
        {flash > 0 && <div style={{ position: 'absolute', inset: 0, background: `rgba(255,255,255,${flash * 0.45})` }} />}
      </div>
    </Layer>
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ transform: `translateY(${P ? 170 : 120}px)` }}><Stamp text={p.official} color={C.red} at={T.stamp} size={P ? 160 : 150} rot={-8} style={{ background: 'rgba(244,239,228,.9)' }} /></div>
    </AbsoluteFill>
    <FilmLook vignette={0.55} />
  </AbsoluteFill>;
}
