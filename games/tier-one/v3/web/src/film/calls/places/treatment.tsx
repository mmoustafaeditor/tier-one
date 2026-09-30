// The treatment room: the table under an exam lamp, the monitor tracing a heartbeat, a trolley with the clipboard, the
// phone on the trolley. Done: the buying club's medical form drops onto the clipboard and the monitor beats in its colour.
import { Glows, Glow, Cone, Motes, Shield, live, useLive, noise, k, lerp, cl, FLOOR, PAPER, MText, F_MONO } from './world';
import { Phones, CalendarTell, PaperTell, doneDrop, heroGlow, TELL } from './tells';
import type { PlaceSpec, PlaceZ } from './spec';

const BED = { x0: 440, x1: 900, y: 560 }, MON = { x: 1120, y: 250 }, TROLLEY = { x: 1120, y: 600 }, CAL = { x: 430, y: 300 };
const TRACE = 'M0 0 h40 l6 -10 l6 10 h30 l8 -46 l10 84 l8 -38 h34 l6 -8 l6 8 h56';

function Scene(z: PlaceZ) {
  const { f } = z;
  const on = useLive();
  const drop = doneDrop(z, 4);
  const gl = heroGlow(z);
  const done = z.phase === 'call' && z.o === 0;
  const beat = done ? k(f, TELL + 12, TELL + 16) : 0;
  const traceCol = beat > 0 ? z.to.c1 : '#3CF0C8';
  const scroll = on ? 0 : (f * 6) % 220;
  const led = on ? 1 : (f % 24 < 3 ? 1 : 0.25);
  const lampFl = on ? 1 : 0.9 + 0.1 * noise(f / 10, 3);
  const formY = lerp(-360, TROLLEY.y - 84, drop);
  return <>
    <Glows cols={['#BFF5EC', '#E8FFF8', '#3CF0C8', '#9FD8FF', z.to.c1, z.alt.c1, z.from.c1, '#FF6A48', '#FFE3A3', '#FFFFFF']} />
    <defs>
      <linearGradient id="trw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0A1A1D" /><stop offset="0.5" stopColor="#173236" /><stop offset="1" stopColor="#08151A" /></linearGradient>
      <linearGradient id="trf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22303A" /><stop offset="1" stopColor="#080E12" /></linearGradient>
      <clipPath id="trmon"><rect x={MON.x - 100} y={MON.y - 60} width={200} height={120} rx={6} /></clipPath>
    </defs>
    <rect x={-1400} y={-1400} width={4400} height={1400 + FLOOR} fill="url(#trw)" />
    <rect x={-1400} y={FLOOR} width={4400} height={1800} fill="url(#trf)" />
    <rect x={-1400} y={FLOOR - 6} width={4400} height={12} fill="#06090B" />
    {/* tiled dado */}
    <rect x={-1400} y={560} width={4400} height={220} fill="#1E6F78" opacity=".35" /><rect x={-1400} y={556} width={4400} height={6} fill="#BFF5EC" opacity=".25" />
    {/* the exam lamp over the bed */}
    <line x1={670} y1={-900} x2={670} y2={120} stroke="#0A0E10" strokeWidth={5} />
    <path d="M610 150 Q670 90 730 150 Z" fill="#2A3436" /><ellipse cx={670} cy={150} rx={48} ry={9} fill="#E8FFF8" opacity={lampFl} />
    <Cone x={670} y={150} w0={60} w1={330} h={FLOOR - 150} col="#E8FFF8" o={0.08 * lampFl} />
    <Glow x={670} y={154} r={170} ry={70} col="#E8FFF8" o={0.5 * lampFl} className={live(on, 'lp-breathe')} />
    {/* the anatomy chart and the calendar on the wall */}
    <g transform="translate(540 190)"><rect x={-60} y={-70} width={120} height={180} fill="#E9E2D3" /><path d="M0 -50 q20 36 8 82 q-8 36 4 66" stroke="#C9A58A" strokeWidth={22} fill="none" strokeLinecap="round" /><path d="M-4 -14 q10 26 4 52" stroke={z.acc} strokeWidth={8} fill="none" strokeLinecap="round" /><circle cx={-20} cy={-30} r={5} fill={z.acc} /><circle cx={16} cy={20} r={5} fill={z.acc} /></g>
    <CalendarTell z={z} at={CAL} s={0.95} pennant={{ x: 640, y: 210 }} />
    {/* the monitor on its stand */}
    <rect x={MON.x - 6} y={MON.y + 70} width={12} height={FLOOR - MON.y - 70} fill="#5A6A6E" /><path d={`M${MON.x - 70} ${FLOOR} h140 l-20 -16 h-100 z`} fill="#5A6A6E" />
    <rect x={MON.x - 110} y={MON.y - 70} width={220} height={140} rx={8} fill="#0B1416" stroke="#5A6A6E" strokeWidth={6} />
    <g clipPath="url(#trmon)">
      <g opacity=".18">{[0, 1, 2, 3].map((i) => <line key={i} x1={MON.x - 100} y1={MON.y - 40 + i * 26} x2={MON.x + 100} y2={MON.y - 40 + i * 26} stroke="#3CF0C8" strokeWidth={1} />)}</g>
      <g className={live(on, 'lp-trace')} transform={`translate(${MON.x - 100 - scroll} ${MON.y + 8})`}>
        {[0, 1, 2].map((i) => <path key={i} d={TRACE} transform={`translate(${i * 220} 0) scale(1 ${1 + beat * 0.9})`} stroke={traceCol} strokeWidth={3 + beat * 2} fill="none" strokeLinejoin="round" opacity={0.9} />)}
      </g>
      {beat > 0 && <rect x={MON.x - 100} y={MON.y - 60} width={200} height={120} fill={z.to.c1} opacity={0.35 * beat * (0.6 + 0.4 * Math.sin((f - TELL) * 0.8))} />}
    </g>
    <circle cx={MON.x + 92} cy={MON.y - 52} r={5} fill="#3CF0C8" opacity={led} className={live(on, 'lp-led')} />
    <MText x={MON.x - 70} y={MON.y - 48} size={14} fill="#3CF0C8" font={F_MONO} stretch="100%" weight={600} anchor="start">{beat > 0 ? '112' : '58'}</MText>
    <Glow x={MON.x} y={MON.y} r={220} ry={150} col={beat > 0 ? z.to.c1 : '#3CF0C8'} o={0.25 + 0.5 * beat} />
    {/* the treatment table */}
    <rect x={BED.x0} y={BED.y} width={BED.x1 - BED.x0} height={36} rx={12} fill="#1E6F78" /><rect x={BED.x0 + 8} y={BED.y + 32} width={BED.x1 - BED.x0 - 16} height={10} fill="#0F3E44" />
    <rect x={BED.x0 + 10} y={BED.y - 20} width={110} height={22} rx={10} fill="#E9F2F0" />
    <rect x={BED.x0 + 30} y={BED.y + 42} width={16} height={FLOOR - BED.y - 42} fill="#8A948E" /><rect x={BED.x1 - 46} y={BED.y + 42} width={16} height={FLOOR - BED.y - 42} fill="#8A948E" />
    <rect x={BED.x0 + 20} y={BED.y + 100} width={BED.x1 - BED.x0 - 40} height={6} fill="#8A948E" />
    <ellipse cx={(BED.x0 + BED.x1) / 2} cy={FLOOR + 6} rx={260} ry={20} fill="rgba(0,0,0,.4)" />
    {/* the paper towel roll and a strapping tape on the table */}
    <rect x={BED.x1 - 130} y={BED.y - 34} width={70} height={34} rx={6} fill="#E9F2F0" />
    <circle cx={BED.x1 - 190} cy={BED.y - 14} r={14} fill="#F4EFE4" stroke="#B9C2C0" strokeWidth={4} />
    {/* the trolley with the clipboard, the phone, the second phone */}
    <rect x={TROLLEY.x - 80} y={TROLLEY.y} width={160} height={10} rx={3} fill="#B9C2C0" /><rect x={TROLLEY.x - 72} y={TROLLEY.y + 10} width={8} height={FLOOR - TROLLEY.y - 10} fill="#8A948E" /><rect x={TROLLEY.x + 64} y={TROLLEY.y + 10} width={8} height={FLOOR - TROLLEY.y - 10} fill="#8A948E" />
    <rect x={TROLLEY.x - 72} y={TROLLEY.y + 90} width={144} height={8} fill="#B9C2C0" />
    <g transform={`translate(${TROLLEY.x - 30} ${TROLLEY.y - 10})`}>
      <rect x={-40} y={-100} width={80} height={104} rx={4} fill="#6B4A2A" transform="rotate(-6)" />
      <rect x={-34} y={-92} width={68} height={90} fill={PAPER} transform="rotate(-6)" />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={-26} y={-76 + i * 14} width={48 - (i % 2) * 12} height={4} fill="#8A8272" transform="rotate(-6)" />)}
      <rect x={-20} y={-104} width={40} height={14} rx={4} fill="#2C332C" transform="rotate(-6)" />
      {drop > 0 && <g transform={`translate(0 ${formY - TROLLEY.y + 10}) rotate(${-6 + Math.sin(Math.max(0, f - TELL - 4) * 0.5) * 6 * Math.exp(-Math.max(0, f - TELL - 4) / 12)})`}>
        {gl > 0 && <Glow x={0} y={-40} r={200} ry={170} col={z.to.c1} o={gl * 0.7} />}
        <rect x={-34} y={-92} width={68} height={90} fill={PAPER} stroke="rgba(0,0,0,.3)" strokeWidth={1.5} />
        <rect x={-34} y={-92} width={68} height={16} fill={z.to.c1} /><rect x={-34} y={-76} width={68} height={5} fill={z.to.c2} />
        <Shield x={0} y={-40} s={0.62} c={z.to} />
        {[0, 1, 2].map((i) => <rect key={i} x={-26} y={-14 + i * 0} width={0} height={0} fill="none" />)}
        <path d={`M-22 -12 l8 10 l22 -24`} fill="none" stroke="#1C8A50" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={60} strokeDashoffset={60 * (1 - (done ? k(f, TELL + 18, TELL + 28) : 0))} />
      </g>}
    </g>
    <Phones z={z} p1={{ x: TROLLEY.x + 36, y: TROLLEY.y - 12 }} p2={{ x: 1290, y: BED.y + 50 }} rot1={-70} rot2={-100} s={0.7} />
    <PaperTell z={z} paper={{ x: 520, y: BED.y - 18 }} bin={{ x: 360, y: FLOOR }} rot={-84} s={0.7} binS={0.95} />
    <Motes f={f} x={560} y={160} w={220} h={400} n={10} seed={7} col="rgba(232,255,248,.45)" />
    <span style={{ display: 'none' }}>{cl(0)}</span>
  </>;
}

export const physio: PlaceSpec = {
  Scene,
  cam: (o) => [
    { f: 0, x: 840, y: 470, z: 1.0 }, { f: 30, x: 850, y: 468, z: 1.03 }, { f: TELL, x: 870, y: 465, z: 1.06 },
    o === 0 ? { f: 100, x: 1110, y: 430, z: 1.3 } : o === 1 ? { f: 100, x: 1200, y: 600, z: 1.42 } : o === 2 ? { f: 100, x: 500, y: 330, z: 1.55 } : { f: 100, x: 440, y: 620, z: 1.36 },
  ],
  cues: (o) => [{ f: 4, k: 'film.monitor' }, ...(o === 0 ? [{ f: TELL + 8, k: 'film.tag' }, { f: TELL + 14, k: 'film.beat' }, { f: TELL + 22, k: 'film.tick' }] : o === 1 ? [{ f: TELL + 4, k: 'film.phone' }, { f: TELL + 12, k: 'film.phone2' }] : o === 2 ? [{ f: TELL + 6, k: 'film.tear' }, { f: TELL + 24, k: 'film.flip' }] : [{ f: TELL + 8, k: 'film.crumple' }, { f: TELL + 31, k: 'film.bin' }])],
};
