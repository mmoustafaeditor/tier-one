// Rep tier up: the editor calls you into the office and slides a new press pass across the desk. The pass fills the
// frame with your byline and the new tier, and the stamp lands. Loud colour: gold. Tier One is the big cut: longer,
// camera flashes and confetti.
import { AbsoluteFill, interpolate, spring } from '../remotion-shim';
import { C, F, FilmLook, Layer, Stamp, Typeset, camAt, k01, shake, useStage, EASE, type Key } from '../kit';
import { Figure, SKIN } from '../people';
import { Confetti } from './bits';
import type { SceneMeta } from '../cues';

export type TierUpProps = {
  tier: string; byline: string; door: string; press: string; stamp: string; kicker: string;
  big?: boolean; rtl?: boolean;
};

const T = { door: 0, open: 4, reach: 20, fly: 36, name: 44, tier: 52, stamp: 64, end: 98 };
const BIG = 26;
export const tierUpMeta = (big: boolean): SceneMeta => ({
  dur: T.end + (big ? BIG : 0), beats: [0, T.reach, T.fly, T.stamp],
  cues: [{ f: 0, k: 'tap' }, { f: T.open, k: 'whoosh' }, { f: T.fly, k: 'flip' }, { f: T.name, k: 'typewriter' }, { f: T.stamp, k: 'stamp' }, { f: T.stamp + 2, k: big ? 'fanfare' : 'levelup' }, ...(big ? [{ f: T.stamp + 30, k: 'sparkle' }] : [])],
});

export function TierUp(p: TierUpProps) {
  const { f, fps, P, W } = useStage();
  const m = p.rtl ? -1 : 1;
  const keys: Key[] = [{ f: 0, x: 0, y: P ? -40 : -60, z: P ? 0.95 : 1.0 }, { f: T.reach, x: 0, y: P ? -20 : -40, z: P ? 1.05 : 1.08 }, { f: T.fly, x: 0, y: 0, z: P ? 1.12 : 1.14 }, { f: T.end + BIG, x: 0, y: 0, z: P ? 1.14 : 1.16 }];
  const c0 = camAt(f, keys), sh = shake(f, [T.stamp], p.big ? 22 : 12);
  const cam = { ...c0, x: c0.x + sh.x, y: c0.y + sh.y };
  const door = k01(f, T.open, T.open + 16, EASE.inOut);
  const reach = k01(f, T.reach, T.reach + 14, EASE.out);
  const pass = spring({ frame: f - T.fly, fps, config: { damping: 14, stiffness: 110 } });
  const dim = f >= T.fly ? 0.6 * k01(f, T.fly, T.fly + 12) : 0;
  const gold = p.big ? `linear-gradient(135deg, #FFE08A, ${C.gold} 45%, ${C.goldDeep})` : C.gold;
  const PW = P ? 700 : 620, PH = P ? 1000 : 860;
  const flash = p.big && f > T.stamp ? Math.max(0, ...[0, 9, 17, 26].map((d) => 1 - Math.abs(f - T.stamp - d) / 3)) : 0;
  return <AbsoluteFill style={{ background: '#1E231F', overflow: 'hidden', direction: p.rtl ? 'rtl' : 'ltr' }}>
    <Layer cam={cam}>
      {/* the office wall, a window on the city at night, a filing cabinet and the framed front pages */}
      <div style={{ position: 'absolute', left: -1400, top: -1200, width: 2800, height: 2400, background: 'repeating-linear-gradient(90deg, #3E4A40 0 160px, #394438 160px 164px)' }} />
      <div style={{ position: 'absolute', left: m * 280 - 260, top: -520, width: 520, height: 400, background: 'linear-gradient(180deg, #121833, #2A2F55)', border: `14px solid ${C.ink}` }}>
        <svg viewBox="0 0 520 400" width="100%" height="100%" aria-hidden="true"><path d="M0 400V250h60v-60h50v90h70V170h90v130h50V210h80v-50h60v240z" fill="#0A0C18" />{Array.from({ length: 14 }, (_, i) => <rect key={i} x={70 + i * 30} y={220 + (i % 3) * 30} width={10} height={14} fill={C.lamp} opacity={0.7} />)}</svg>
        <i style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 10, background: C.ink }} />
      </div>
      {[-1, 1].map((k) => <div key={k} style={{ position: 'absolute', left: m * -560 + k * 150 - 70, top: -470, width: 140, height: 180, background: C.paper, border: `8px solid ${C.ink}`, transform: `rotate(${k * 2}deg)` }}><i style={{ display: 'block', height: 22, background: C.red }} /><i style={{ display: 'block', margin: 10, height: 14, background: C.ink }} /></div>)}
      {/* the door you came in by, swinging open (frosted glass, EDITOR) */}
      <div style={{ position: 'absolute', left: m * -560 - 170, top: -230, width: 340, height: 700, perspective: 1600 }}>
        <div style={{ position: 'absolute', inset: 0, background: '#15130F' }} />
        <div style={{ position: 'absolute', inset: 0, transformOrigin: p.rtl ? '100% 50%' : '0 50%', transform: `rotateY(${door * -62 * m}deg)`, background: '#6B4A2E', border: `8px solid ${C.ink}`, boxSizing: 'border-box' }}>
          <div style={{ margin: '40px 34px', height: 260, background: 'rgba(220,235,230,.75)', border: `6px solid ${C.ink}`, display: 'grid', placeItems: 'center', fontFamily: F.cond, fontStretch: '75%', fontWeight: 900, fontSize: 46, color: C.ink, letterSpacing: '.1em' }}>{p.door}</div>
        </div>
      </div>
      {/* the editor, reaching across with the pass */}
      <div style={{ position: 'absolute', left: m * 140 - 160, top: -330 }}>
        <Figure h={620} shirt="#F4EFE4" tie={C.red} glasses hair="bald" hairC="#9A9387" skin={SKIN[3]} armL={p.rtl ? 70 * reach + 8 : 10} bendL={p.rtl ? -10 : 40} armR={p.rtl ? 10 : 70 * reach + 8} bendR={p.rtl ? 40 : -10}
          holdR={!p.rtl && f < T.fly ? <PassMini /> : undefined} holdL={p.rtl && f < T.fly ? <PassMini /> : undefined} />
      </div>
      {/* the desk */}
      <div style={{ position: 'absolute', left: -900, top: 230, width: 1800, height: 800, background: 'repeating-linear-gradient(90deg, #5A341C 0 140px, #4E2C17 140px 144px)', border: `8px solid ${C.ink}` }} />
      <div style={{ position: 'absolute', left: -940, top: 200, width: 1880, height: 50, background: '#7A4A28', border: `8px solid ${C.ink}` }} />
      <div style={{ position: 'absolute', left: m * -420 - 120, top: 110, width: 240, height: 100, background: C.paper2, border: `6px solid ${C.ink}`, transform: 'rotate(-4deg)' }} />
      <div style={{ position: 'absolute', left: m * 560 - 50, top: 90, width: 100, height: 120, background: C.paper, border: `6px solid ${C.ink}`, borderRadius: '0 0 16px 16px' }} />
    </Layer>
    <AbsoluteFill style={{ background: `rgba(11,10,8,${dim})` }} />
    {/* the pass */}
    {f >= T.fly && <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: PW, height: PH, transform: `translateY(${(1 - pass) * 800}px) rotate(${(1 - pass) * -18 * m + 3 * m}deg) scale(${0.5 + 0.5 * pass})` }}>
        <i style={{ position: 'absolute', left: '50%', top: -700, width: 40, marginLeft: -20, height: 720, background: `repeating-linear-gradient(180deg, ${C.red} 0 60px, ${C.redDeep} 60px 120px)` }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 34, background: gold, padding: 16, boxShadow: `0 40px 80px rgba(0,0,0,.6), 0 0 ${120 * k01(f, T.stamp, T.stamp + 8)}px rgba(247,185,40,.55)` }}>
          <div style={{ position: 'relative', height: '100%', borderRadius: 22, background: C.paper, color: C.ink, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: P ? 26 : 18, padding: P ? '46px 40px' : '32px 36px', boxSizing: 'border-box', textAlign: 'center' }}>
            <i style={{ width: 150, height: 30, borderRadius: 15, background: C.paper3, border: `4px solid ${C.ink3}` }} />
            <span style={{ fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: P ? 96 : 84, letterSpacing: '.16em', lineHeight: 1, background: C.ink, color: C.gold, padding: '10px 30px' }}>{p.press}</span>
            <div style={{ width: P ? 260 : 200, height: P ? 260 : 200, borderRadius: '50%', background: C.ink, color: C.gold, display: 'grid', placeItems: 'center', fontFamily: F.display, fontWeight: 800, fontSize: P ? 150 : 116, border: `10px solid ${C.gold}` }}>{Array.from(p.byline)[0] || '?'}</div>
            <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: P ? 76 : 64, lineHeight: 1.05, maxWidth: '100%', overflowWrap: 'anywhere' }}><Typeset text={p.byline} at={T.name} cpf={0.9} /></div>
            <div style={{ fontFamily: F.mono, fontSize: 28, color: C.ink2, letterSpacing: '.08em', opacity: k01(f, T.tier - 6, T.tier) }}>{p.kicker}</div>
            <div style={{ fontFamily: F.cond, fontStretch: '75%', fontWeight: 900, fontSize: P ? 104 : 88, lineHeight: 1, textTransform: 'uppercase', color: C.goldDeep, opacity: k01(f, T.tier, T.tier + 6), transform: `scale(${interpolate(k01(f, T.tier, T.tier + 10), [0, 1], [1.4, 1])})` }}>{p.tier}</div>
            <div style={{ position: 'absolute', insetInlineEnd: 20, bottom: P ? 40 : 24 }}><Stamp text={p.stamp} color={C.redDeep} at={T.stamp} size={P ? 80 : 66} rot={-12} /></div>
          </div>
        </div>
      </div>
    </AbsoluteFill>}
    {flash > 0 && <AbsoluteFill style={{ background: `rgba(255,248,230,${flash * 0.55})` }} />}
    {p.big && <Confetti at={T.stamp} W={W} />}
    <FilmLook vignette={0.6} />
  </AbsoluteFill>;
}

/** The pass while the editor holds it (a 60×60 prop). */
const PassMini = () => <g stroke={C.ink} strokeWidth={4}><rect x={8} y={0} width={44} height={60} rx={6} fill={C.gold} /><rect x={14} y={8} width={32} height={10} fill={C.ink} stroke="none" /><circle cx={30} cy={36} r={9} fill={C.ink} stroke="none" /></g>;
