// Deadline Day opens: the clock tower strikes the final hour, a car with blacked-out windows pulls into the training
// ground, the phones on the desk light up, and DEADLINE DAY slams. Loud colour: red. The short cut is the phones and
// the title only.
import { AbsoluteFill, Sequence, spring } from '../remotion-shim';
import { C, F, FilmLook, Layer, Stamp, camAt, k01, noise, shake, useStage, EASE, type Key } from '../kit';
import type { SceneMeta } from '../cues';

export type DeadlineProps = { title: string; kicker: string; pings: string[]; gate: string; cut?: 'full' | 'short'; rtl?: boolean };

const T = { strike: 16, pan: 26, car: 30, park: 54, phones: 60, title: 78, end: 104 };
const SHORT = 58;
export const DEADLINE: SceneMeta = {
  dur: T.end, hold: 700, beats: [0, T.pan, T.phones, T.title],
  cues: [{ f: 0, k: 'clock' }, { f: 6, k: 'clock' }, { f: 12, k: 'clock' }, { f: T.strike, k: 'dayhit' }, { f: T.car, k: 'whoosh' }, { f: T.phones, k: 'buzz' }, { f: T.phones + 6, k: 'buzz' }, { f: T.phones + 12, k: 'buzz' }, { f: T.title, k: 'siren' }],
};
export const DEADLINE_SHORT: SceneMeta = { dur: T.end - SHORT, hold: 500, beats: [0, T.title - SHORT], cues: DEADLINE.cues.filter((c) => c.f >= SHORT).map((c) => ({ ...c, f: c.f - SHORT })) };

export function Deadline(p: DeadlineProps) {
  if (p.cut !== 'short') return <Body {...p} />;
  return <AbsoluteFill><Sequence from={-SHORT} layout="none"><Body {...p} /></Sequence></AbsoluteFill>;
}

function Body(p: DeadlineProps) {
  const { f, fps, P } = useStage();
  const m = p.rtl ? -1 : 1;
  const keys: Key[] = [{ f: 0, x: 0, y: -700, z: P ? 1.1 : 1.15 }, { f: T.strike, x: 0, y: -680, z: P ? 1.14 : 1.2 }, { f: T.pan, x: 0, y: -660, z: P ? 1.14 : 1.2 }, { f: T.park, x: 0, y: P ? 120 : 160, z: P ? 1.0 : 1.02 }, { f: T.end, x: 0, y: P ? 140 : 170, z: P ? 1.02 : 1.04 }];
  const c0 = camAt(f, keys), sh = shake(f, [T.strike, T.title], 16), cam = { ...c0, x: c0.x + sh.x, y: c0.y + sh.y };
  // Clock: 22:50 sweeping to 23:00 on the strike.
  const mins = 50 + 10 * k01(f, 0, T.strike, EASE.inOut);
  const car = k01(f, T.car, T.park, EASE.out);
  const carX = m * (-1500 + car * 1500);
  const ph = (k: number) => spring({ frame: f - T.phones - k * 6, fps, config: { damping: 12, stiffness: 180 } });
  const red = k01(f, T.phones, T.title, EASE.inOut);
  return <AbsoluteFill style={{ background: '#0A0B14', overflow: 'hidden', direction: p.rtl ? 'rtl' : 'ltr' }}>
    <Layer cam={cam}>
      {/* sky */}
      <div style={{ position: 'absolute', left: -1600, top: -1800, width: 3200, height: 2400, background: 'linear-gradient(180deg, #05060E, #131A36 60%, #2A2340)' }} />
      {Array.from({ length: 30 }, (_, i) => <i key={i} style={{ position: 'absolute', left: ((i * 173) % 2800) - 1400, top: -1500 + ((i * 97) % 900), width: 6, height: 6, borderRadius: 3, background: C.paper, opacity: 0.3 + 0.3 * noise(f / 10 + i, 2) }} />)}
      {/* the clock tower */}
      <div style={{ position: 'absolute', left: -230, top: -1400, width: 460, height: 1500, background: '#2A2530', border: `8px solid ${C.ink}` }} />
      <div style={{ position: 'absolute', left: -280, top: -1480, width: 560, height: 100, background: '#1E1A24', border: `8px solid ${C.ink}`, clipPath: 'polygon(10% 0, 90% 0, 100% 100%, 0 100%)' }} />
      <svg viewBox="-200 -200 400 400" width={400} height={400} style={{ position: 'absolute', left: -200, top: -900, width: 400, height: 400 }} aria-hidden="true">
        <circle r={190} fill={C.paper} stroke={C.ink} strokeWidth={14} />
        <circle r={190} fill={C.lamp} opacity={0.25 + (f >= T.strike ? 0.4 * Math.max(0, 1 - (f - T.strike) / 12) : 0)} />
        {Array.from({ length: 12 }, (_, i) => <rect key={i} x={-6} y={-178} width={12} height={i % 3 ? 22 : 40} fill={C.ink} transform={`rotate(${i * 30})`} />)}
        <rect x={-10} y={-110} width={20} height={120} rx={8} fill={C.ink} transform={`rotate(${(22 + mins / 60) * 30})`} />
        <rect x={-6} y={-160} width={12} height={170} rx={6} fill={C.red} transform={`rotate(${mins * 6})`} />
        <circle r={16} fill={C.ink} />
      </svg>
      {/* the training ground: fence, gate, floodlight */}
      <div style={{ position: 'absolute', left: -1600, top: 100, width: 3200, height: 1200, background: '#16221A' }} />
      <div style={{ position: 'absolute', left: -1600, top: 380, width: 3200, height: 900, background: '#2B2B2E', borderTop: `8px solid ${C.ink}` }} />
      <div style={{ position: 'absolute', left: -1600, top: 120, width: 3200, height: 260, background: 'repeating-linear-gradient(90deg, transparent 0 60px, rgba(200,210,200,.35) 60px 66px), repeating-linear-gradient(0deg, transparent 0 60px, rgba(200,210,200,.25) 60px 66px)' }} />
      <div style={{ position: 'absolute', left: m * 520 - 30, top: -300, width: 60, height: 700, background: C.ink }} />
      <div style={{ position: 'absolute', left: m * 520 - 140, top: -360, width: 280, height: 90, background: '#E9E2D3', border: `8px solid ${C.ink}` }} />
      <div style={{ position: 'absolute', left: m * 520 - 700, top: -280, width: 1400, height: 1400, background: 'radial-gradient(closest-side, rgba(255,240,200,.18), transparent)', clipPath: m > 0 ? 'polygon(50% 0, 0 100%, 60% 100%)' : 'polygon(50% 0, 40% 100%, 100% 100%)' }} />
      {/* the gate sign */}
      <div style={{ position: 'absolute', left: m * -560 - 280, top: 170, width: 560, height: 110, whiteSpace: 'nowrap', background: C.ink, color: C.paper, border: `6px solid ${C.paper}`, display: 'grid', placeItems: 'center', fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: 48, letterSpacing: '.08em' }}>{p.gate}</div>
      <div style={{ position: 'absolute', left: m * -350 - (m > 0 ? 0 : 520), top: 330, width: 520, height: 26, background: `repeating-linear-gradient(90deg, ${C.red} 0 50px, ${C.paper} 50px 100px)`, border: `5px solid ${C.ink}`, transformOrigin: m > 0 ? '0 50%' : '100% 50%', transform: `rotate(${-70 * m * k01(f, T.car + 4, T.car + 14)}deg)` }} />
      {/* the car: blacked-out windows, headlights */}
      <div style={{ position: 'absolute', left: carX - 420, top: 300, width: 840, height: 300, transform: m < 0 ? 'scaleX(-1)' : undefined }}>
        <div style={{ position: 'absolute', left: 820, top: 110, width: 900, height: 200, background: 'linear-gradient(90deg, rgba(255,240,190,.45), transparent)', clipPath: 'polygon(0 30%, 100% 0, 100% 100%, 0 70%)' }} />
        <svg viewBox="0 0 840 300" width={840} height={300} style={{ position: 'absolute', left: 0, top: 0, width: 840, height: 300 }} aria-hidden="true">
          <path d="M40 200q0-50 60-60l120-20 90-80h260l110 80 110 20q50 10 50 60v40H40z" fill="#0C0C10" stroke={C.ink} strokeWidth={8} />
          <path d="M330 60h110v70H240zM460 60h120l80 70H460z" fill="#1E2230" />
          <path d="M340 70l40 50M480 70l30 40" stroke="rgba(255,255,255,.18)" strokeWidth={10} />
          <rect x={770} y={160} width={40} height={24} rx={6} fill={C.lamp} />
          {[180, 640].map((x) => <g key={x} transform={`translate(${x} 245) rotate(${f * 30})`}><circle r={52} fill={C.ink} /><circle r={24} fill="#6E6A66" /><rect x={-4} y={-24} width={8} height={48} fill={C.ink} /></g>)}
        </svg>
      </div>
    </Layer>
    {/* the phones on the desk, lighting up */}
    <AbsoluteFill style={{ background: `rgba(120,10,0,${0.35 * red})` }} />
    {f >= T.phones && <AbsoluteFill style={{ flexDirection: P ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: P ? 36 : 44, padding: P ? '260px 0 560px' : '0 0 260px' }}>
      {p.pings.slice(0, 3).map((txt, k) => {
        const s = ph(k), buzz = f - T.phones - k * 6 < 14 && f >= T.phones + k * 6 ? noise(f * 3.1, k) * 10 : 0;
        return <div key={k} style={{ width: P ? 760 : 460, padding: '22px 26px', borderRadius: 26, background: '#15141A', border: `6px solid ${C.ink}`, boxShadow: `0 0 0 4px ${C.red}, 0 30px 60px rgba(0,0,0,.6)`, color: C.paper, transform: `translate(${buzz}px, ${(1 - s) * 400}px) rotate(${(k - 1) * 2 + buzz * 0.2}deg) scale(${0.7 + 0.3 * s})`, opacity: Math.min(1, s * 2), display: 'flex', gap: 18, alignItems: 'center' }}>
          <span style={{ width: 60, height: 60, borderRadius: 16, background: C.red, flex: 'none' }} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <span style={{ fontFamily: F.mono, fontSize: 24, color: '#BDB5A5' }}>{p.kicker} · 23:0{k}</span>
            <b style={{ fontFamily: F.text, fontSize: 36, lineHeight: 1.2 }}>{txt}</b>
          </span>
        </div>;
      })}
    </AbsoluteFill>}
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: P ? 'flex-end' : 'flex-end', paddingBottom: P ? 260 : 130, pointerEvents: 'none' }}>
      <Stamp text={p.title} color={C.red} at={T.title} size={P ? 150 : 150} rot={-4} style={{ background: 'rgba(11,10,8,.72)' }} />
    </AbsoluteFill>
    <FilmLook vignette={0.7} />
  </AbsoluteFill>;
}
