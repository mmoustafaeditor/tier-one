// A contact reaches Lv5: the source, in their own place (the barber's chair, the boot room, the agent's car, the
// arrivals hall, the treatment room), raises a coffee to yours. The cups clink and their card turns gold.
import { AbsoluteFill, spring } from '../remotion-shim';
import { C, F, SRC_C, FilmLook, Glyph, Layer, Paper, Stamp, Typeset, camAt, k01, shake, useStage, EASE, type Key } from '../kit';
import { Figure, Cup, YourArm, SKIN, type FigureProps } from '../people';
import type { SceneMeta } from '../cues';

type Src = 'kitman' | 'barber' | 'agent' | 'spotter' | 'physio';
export type ContactGoldProps = { src: Src; name: string; kicker: string; lv: string; perk: string; stamp: string; rtl?: boolean };

const T = { raise: 6, reach: 8, clink: 30, card: 44, name: 52, stamp: 66, end: 100 };
export const CONTACT_GOLD: SceneMeta = {
  dur: T.end, beats: [0, T.clink, T.card, T.stamp],
  cues: [{ f: 0, k: 'ambience' }, { f: T.clink, k: 'ding' }, { f: T.clink + 1, k: 'sparkle' }, { f: T.card, k: 'flip' }, { f: T.stamp, k: 'stamp' }, { f: T.stamp + 2, k: 'levelup' }],
};
const AMB: Record<string, string> = { kitman: 'kitman', barber: 'clippers', agent: 'whoosh', spotter: 'airport', physio: 'monitor' };
export const contactGoldMeta = (src: string): SceneMeta => ({ ...CONTACT_GOLD, cues: CONTACT_GOLD.cues.map((c) => (c.k === 'ambience' ? { ...c, k: AMB[src] || 'whoosh' } : c)) });

const LOOK: Record<Src, Omit<FigureProps, 'h'>> = {
  kitman: { shirt: '#2FBF71', legs: '#1F3B2C', hair: 'short', skin: SKIN[1], stripe: '#1E8B50' },
  barber: { shirt: '#F4EFE4', legs: '#2B2D3A', hair: 'curls', skin: SKIN[3], apron: '#FF9A1F' },
  agent: { shirt: '#23252E', legs: '#23252E', hair: 'short', hairC: '#C7C0B0', skin: SKIN[0], tie: C.gold, glasses: true },
  spotter: { shirt: '#35C3E6', legs: '#2B2D3A', hair: 'cap', capC: C.ink, skin: SKIN[4], stripe: '#F7F06A' },
  physio: { shirt: '#FF5A7A', legs: '#FF5A7A', hair: 'bun', skin: SKIN[2] },
};

/** The place, as flat cut card behind the figure. */
function Setting({ src, f }: { src: Src; f: number }) {
  const col = SRC_C[src];
  const wall = { kitman: '#20362B', barber: '#3B2A22', agent: '#141826', spotter: '#1B2A3A', physio: '#2E2430' }[src];
  return <>
    <div style={{ position: 'absolute', left: -1400, top: -1300, width: 2800, height: 2600, background: wall }} />
    <div style={{ position: 'absolute', left: -1400, top: 300, width: 2800, height: 1000, background: 'rgba(0,0,0,.35)', borderTop: `8px solid ${C.ink}` }} />
    <svg viewBox="-900 -700 1800 1000" width={1800} height={1000} style={{ position: 'absolute', left: -900, top: -700, width: 1800, height: 1000, overflow: 'visible' }} aria-hidden="true" fill="none" stroke={C.ink} strokeWidth={8} strokeLinejoin="round">
      {src === 'barber' && <>
        <rect x={-760} y={-500} width={420} height={560} rx={200} fill="#8FB3B8" /><rect x={-730} y={-470} width={360} height={500} rx={180} fill="#B9D3D6" stroke="none" opacity={0.5} />
        <rect x={420} y={-560} width={80} height={560} fill={C.paper} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={`M420 ${-540 + i * 80 + ((f * 4) % 80)}l80 -40v26l-80 40z`} fill={i % 2 ? C.red : '#35C3E6'} stroke="none" />)}
        <rect x={400} y={-600} width={120} height={40} rx={10} fill={C.ink2} /><rect x={400} y={0} width={120} height={40} rx={10} fill={C.ink2} />
      </>}
      {src === 'kitman' && <>
        <path d="M-840 -520H840" /><path d="M-840 -520v-40M840 -520v-40" />
        {[-720, -480, -240, 240, 480, 720].map((x, i) => <g key={x} transform={`translate(${x} -500) rotate(${Math.sin(f / 12 + i) * 3})`}><path d="M0 0v20" /><path d="M-60 30l-50 30 20 50 26-10v130h128V100l26 10 20-50-50-30q-10 20-60 20t-60-20z" fill={i % 2 ? col : C.paper} /><text x={0} y={140} textAnchor="middle" fontFamily={F.cond} fontWeight={900} fontSize={60} fill={C.ink} stroke="none">{[7, 9, 10, 11, 4, 23][i]}</text></g>)}
        <rect x={-860} y={80} width={1720} height={60} fill="#6B4A2E" />
      </>}
      {src === 'agent' && <>
        <path d="M-860 -600H860V60H-860z" fill="#1E2540" />
        {Array.from({ length: 40 }, (_, i) => <path key={i} d={`M${-840 + ((i * 97) % 1680)} ${-580 + ((i * 53 + f * 30) % 600)}l-12 36`} stroke="#6E86B8" strokeWidth={4} />)}
        <path d="M-860 -40q200 -60 400 0t400 0 400 0 460 0" stroke="#FFC873" strokeWidth={6} opacity={0.6} />
        <path d="M-900 60H900" strokeWidth={14} />
      </>}
      {src === 'spotter' && <>
        <path d="M-860 -600H860V40H-860z" fill="#5A86B0" /><path d="M-860 -120H860V40H-860z" fill="#3A4A5A" />
        {[-300, 300].map((x) => <path key={x} d={`M${x} -600V40`} strokeWidth={14} />)}
        <g transform={`translate(${-500 + ((f * 9) % 1400)} ${-360 - f * 0.8}) scale(1.4)`}><path d="M-120 0l160-10 40-30 20 4-24 40 110-6 10 12-120 14-50 40-16-2 20-40-150 10z" fill={C.paper} /></g>
        {[-660, -380, 420, 700].map((x, i) => <rect key={x} x={x - 60} y={-60 + (i % 2) * 20} width={120} height={16} fill={C.lamp} stroke="none" opacity={0.8} />)}
      </>}
      {src === 'physio' && <>
        <rect x={440} y={-560} width={360} height={260} rx={12} fill="#0E1A14" />
        <path d={`M460 -430h${60}l20-60 30 120 24-90 16 30h170`} stroke={col} strokeWidth={8} strokeDasharray="600" strokeDashoffset={600 - ((f * 14) % 600)} />
        <path d="M-800 -140h620v40h-620z" fill={C.paper2} /><path d="M-760 -100v160M-220 -100v160" />
        <path d="M-600 -600h60v60h60v60h-60v60h-60v-60h-60v-60h60z" fill={col} />
      </>}
    </svg>
  </>;
}

export function ContactGold(p: ContactGoldProps) {
  const { f, fps, P } = useStage();
  const m = p.rtl ? -1 : 1;
  const col = SRC_C[p.src] || C.gold;
  const keys: Key[] = [{ f: 0, x: 0, y: P ? -40 : -40, z: P ? 0.9 : 1.0 }, { f: T.clink, x: m * 120, y: P ? -120 : -140, z: P ? 1.15 : 1.2 }, { f: T.card, x: m * 120, y: P ? -130 : -150, z: P ? 1.2 : 1.24 }, { f: T.end, x: m * 120, y: -140, z: P ? 1.22 : 1.26 }];
  const c0 = camAt(f, keys), sh = shake(f, [T.clink], 8), cam = { ...c0, x: c0.x + sh.x, y: c0.y + sh.y };
  const raise = k01(f, T.raise, T.clink - 4, EASE.inOut);
  const reach = k01(f, T.reach, T.clink, EASE.out);
  const hit = f >= T.clink ? Math.max(0, 1 - (f - T.clink) / 14) : 0;
  const card = spring({ frame: f - T.card, fps, config: { damping: 13, stiffness: 130 } });
  const dim = 0.62 * k01(f, T.card, T.card + 10);
  const CW = P ? 760 : 640, CH = P ? 1040 : 860;
  const armFrom = P ? 900 : 1100;
  return <AbsoluteFill style={{ background: C.night, overflow: 'hidden', direction: p.rtl ? 'rtl' : 'ltr' }}>
    <Layer cam={cam}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: p.rtl ? 'scaleX(-1)' : undefined }}><Setting src={p.src} f={f} /></div>
      {/* the source, raising a cup */}
      <div style={{ position: 'absolute', left: m * -170 - 170, top: -420, transform: p.rtl ? 'scaleX(-1)' : undefined }}>
        <Figure h={680} {...LOOK[p.src]} armL={10} bendL={20} armR={30 + raise * 40} bendR={-(40 + raise * 60)} holdR={<Cup band={col} />} />
      </div>
      {/* your arm, from the edge of frame */}
      <YourArm x={m * (armFrom - reach * (armFrom - 330))} y={-230 + (1 - reach) * 200} rot={p.rtl ? 0 : 180} len={900} hold={<Cup band={C.red} />} />
      {/* the clink */}
      {hit > 0 && <div style={{ position: 'absolute', left: m * 250 - 200, top: -470, width: 400, height: 400 }}>
        {Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2, d = 60 + (1 - hit) * 180; return <i key={i} style={{ position: 'absolute', left: 200 + Math.cos(a) * d - 6, top: 200 + Math.sin(a) * d - 30, width: 12, height: 60, borderRadius: 6, background: C.gold, transform: `rotate(${(a * 180) / Math.PI + 90}deg)`, opacity: hit }} />; })}
      </div>}
    </Layer>
    <AbsoluteFill style={{ background: `rgba(11,10,8,${dim})` }} />
    {f >= T.card && <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', perspective: 2000 }}>
      <div style={{ position: 'relative', width: CW, height: CH, transform: `rotateY(${(1 - card) * 180 * m}deg) scale(${0.6 + 0.4 * card})`, backfaceVisibility: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 30, padding: 16, background: `linear-gradient(135deg, #FFE08A, ${C.gold} 45%, ${C.goldDeep})`, boxShadow: `0 40px 80px rgba(0,0,0,.6), 0 0 ${110 * k01(f, T.stamp, T.stamp + 8)}px rgba(247,185,40,.6)` }}>
          <Paper>
            <div style={{ height: '52%', background: `radial-gradient(90% 70% at 50% 40%, rgba(255,255,255,.45), transparent 70%), linear-gradient(160deg, #FFE08A, ${C.gold})`, display: 'grid', placeItems: 'center', borderBottom: `6px solid ${C.ink}` }}>
              <span style={{ width: P ? 300 : 240, height: P ? 300 : 240, borderRadius: '50%', background: C.ink, display: 'grid', placeItems: 'center', border: `10px solid ${col}` }}><Glyph n={p.src} size={P ? 170 : 136} color={C.gold} /></span>
            </div>
            <div style={{ padding: P ? '34px 40px' : '24px 34px', display: 'flex', flexDirection: 'column', gap: P ? 16 : 10, alignItems: 'center', textAlign: 'center' }}>
              <span style={{ fontFamily: F.mono, fontSize: 28, letterSpacing: '.1em', color: C.ink2 }}>{p.kicker}</span>
              <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: P ? 86 : 72, lineHeight: 1 }}><Typeset text={p.name} at={T.name} cpf={0.8} /></span>
              <span style={{ fontFamily: F.cond, fontStretch: '75%', fontWeight: 900, fontSize: P ? 64 : 54, color: C.goldDeep, letterSpacing: '.06em' }}>{p.lv}</span>
              <span style={{ fontFamily: F.text, fontSize: P ? 36 : 32, color: C.ink2, lineHeight: 1.3, opacity: k01(f, T.name + 8, T.name + 16) }}>{p.perk}</span>
            </div>
            <div style={{ position: 'absolute', insetInlineEnd: 24, top: P ? 40 : 28 }}><Stamp text={p.stamp} color={C.redDeep} at={T.stamp} size={P ? 70 : 60} rot={10} /></div>
          </Paper>
        </div>
      </div>
    </AbsoluteFill>}
    <FilmLook vignette={0.6} />
  </AbsoluteFill>;
}
