// Drawn ambient loops (GOTY.md §10): one SVG composition per surface stem in manifest.ts, so no loop ever fetches a
// poster or an mp4. Places, objects, paper, ink, light and type only; no people. Everything that moves is a CSS
// animation on transform or opacity (film/calls/places/places.css `.lp-*`), so a loop costs nothing on the main thread
// and holds still when paused (ui/film.tsx adds .is-paused off screen, in a hidden tab, or when another loop plays)
// and under reduced motion.
import type { ComponentType, ReactNode } from 'react';
import { useT } from '../../lib/i18n';
import { PlaceView, placeOf, placeZ, monthsOf, HOUSE } from '../calls/places';
import type { Words } from '../calls/places/spec';
import { City, Blinds, Lamp, Coffee, Phone, Glow, Glows, Cone, Motes, Rain, Newspaper, MText, LiveCtx, MirrorCtx, F_MONO, GOLD, RED, PAPER, rnd } from '../calls/places/world';
import { SRCS, SEASONS, TONES } from './manifest';

const GLOWS = ['#FFC873', '#FFB25A', '#FFE3A3', '#9FD8FF', '#FFD76A', '#FF6A48', '#DDE8FF', '#FFFFFF', '#3CF0C8', '#FF3B1E'];

/** The frame every drawn loop sits in: the world's 1600×900, covering its box, a slow push and a drifting light. */
function Frame({ children, light = '#FFC873', rtl }: { children: ReactNode; light?: string; rtl?: boolean }) {
  return <svg className="dl" viewBox="200 0 1200 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <Glows cols={[...GLOWS, light]} />
    <LiveCtx.Provider value={true}><MirrorCtx.Provider value={rtl ? -1 : 1}>
      <g transform={rtl ? 'matrix(-1 0 0 1 1600 0)' : undefined}>
        <g className="lp lp-push">{children}</g>
        <g className="lp lp-drift"><Glow x={800} y={300} r={520} ry={320} col={light} o={0.16} /></g>
      </g>
    </MirrorCtx.Provider></LiveCtx.Provider>
  </svg>;
}

// ---------- the six places, at rest (the call film's frame 0: the phone dark on its surface)
function placeLoop(src: string): ComponentType {
  return function PlaceLoop() {
    const t = useT();
    const words = {} as Words;
    (['boarding', 'cancelled', 'gate', 'medical', 'noShow'] as const).forEach((k) => { words[k] = t('mo.w.' + k); });
    const z = placeZ({ src, f: 0, phase: 'loop', o: 0, ...HOUSE, words, ...monthsOf(t.lang) });
    return <PlaceView spec={placeOf(src)} z={z} camF={0} rtl={t.rtl} live className="dl" />;
  };
}

// ---------- the desk (Home), morning or night
function desk(tone: 'morning' | 'night'): ComponentType {
  return function DeskLoop() {
    const t = useT();
    const night = tone === 'night';
    return <Frame light={night ? '#FFC873' : '#FFE9C0'} rtl={t.rtl}>
      <rect x={-600} y={-600} width={2800} height={2100} fill={night ? '#15120E' : '#3A3024'} />
      <rect x={300} y={60} width={1000} height={420} fill={night ? '#0E1630' : '#9FC0E0'} />
      <City x={300} y={180} w={1000} h={300} seed={4} lit={night ? 0.4 : 0.05} cols={night ? undefined : ['#6A7FA0', '#7A8CAA', '#5E7394']} />
      <Blinds x={300} y={60} w={1000} h={420} open={night ? 0.35 : 0.7} col={night ? '#15120E' : '#4A3E2E'} n={12} />
      {!night && <g className="lp lp-breathe">{Array.from({ length: 5 }, (_, i) => <path key={i} d={`M${320 + i * 90} ${560 + i * 30} l820 -110 l0 24 l-820 110 z`} fill="#FFE9C0" opacity={0.18} />)}</g>}
      <rect x={290} y={50} width={1020} height={440} fill="none" stroke="#2A241C" strokeWidth={20} />
      <rect x={-600} y={600} width={2800} height={900} fill="#2C271F" /><rect x={-600} y={596} width={2800} height={8} fill="#4A3E2E" />
      {night && <><ellipse cx={440} cy={640} rx={360} ry={70} fill="#FFC873" opacity={0.14} /><Lamp x={330} y={612} on={1} s={0.9} /></>}
      {!night && <Lamp x={330} y={612} on={0} s={0.9} />}
      <Coffee x={1040} y={560} />
      <Newspaper x={760} y={650} c={HOUSE.from} rot={-6} s={1.1} />
      <Phone x={1200} y={640} rot={-72} s={0.62} lit={0} />
      <Motes f={0} x={400} y={140} w={800} h={420} n={14} seed={6} />
    </Frame>;
  };
}

// ---------- the city at dusk (Deadline Day): three phones on the sill light in turn
function DeadlineCity() {
  const t = useT();
  return <Frame light="#FF9A5A" rtl={t.rtl}>
    <defs><linearGradient id="dlDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1B1436" /><stop offset=".6" stopColor="#7A3A5A" /><stop offset="1" stopColor="#E88A4A" /></linearGradient></defs>
    <rect x={-600} y={-600} width={2800} height={2100} fill="url(#dlDusk)" />
    <City x={-200} y={260} w={2000} h={420} n={22} seed={12} lit={0.4} />
    <rect x={-600} y={660} width={2800} height={600} fill="#15120E" /><rect x={-600} y={654} width={2800} height={10} fill="#3A342A" />
    {[620, 800, 980].map((x, i) => <g key={x} className="lp lp-blink" style={{ animationDuration: '3s', animationDelay: `${i}s` }}><Phone x={x} y={640} rot={-80} s={0.7} lit={1} col={['#9FD8FF', GOLD, RED][i]} /></g>)}
  </Frame>;
}

// ---------- the press box (Friends): floodlights beyond the glass, laptops lit on the desk
function Pressbox() {
  const t = useT();
  return <Frame light="#DDE8FF" rtl={t.rtl}>
    <rect x={-600} y={-600} width={2800} height={2100} fill="#0A0D18" />
    <rect x={-600} y={420} width={2800} height={300} fill="#12301C" /><rect x={-600} y={420} width={2800} height={4} fill="#DDE8DD" opacity={0.3} />
    {[360, 1240].map((x) => <g key={x}>
      <Cone x={x} y={140} w0={60} w1={380} h={580} col="#DDE8FF" o={0.08} />
      <rect x={x - 70} y={110} width={140} height={60} rx={6} fill="#15141A" />
      {Array.from({ length: 8 }, (_, j) => <circle key={j} cx={x - 52 + (j % 4) * 35} cy={128 + Math.floor(j / 4) * 26} r={9} fill="#FFF8E0" />)}
      <g className="lp lp-breathe"><Glow x={x} y={140} r={220} ry={140} col="#DDE8FF" o={0.7} /></g>
    </g>)}
    <rect x={-600} y={560} width={2800} height={16} fill="#1E2230" />
    <rect x={-600} y={700} width={2800} height={600} fill="#1A1712" /><rect x={-600} y={696} width={2800} height={8} fill="#3A342A" />
    {[420, 800, 1180].map((x, i) => <g key={x}>
      <path d={`M${x - 110} 700 l20 -120 h180 l20 120 z`} fill="#20242E" />
      <rect x={x - 84} y={594} width={168} height={98} rx={4} fill="#9FD8FF" opacity={0.25} className="lp lp-bulb" style={{ animationDelay: `${i * 0.7}s` }} />
      <Glow x={x} y={640} r={160} ry={80} col="#9FD8FF" o={0.35} />
    </g>)}
  </Frame>;
}

// ---------- the Wire: a newsroom wall of screens, tickers running in club colours
function WireRoom() {
  const t = useT();
  const cols = ['#C9381A', '#1B4FD8', '#2FBF71', GOLD, '#6B3FA0', '#35C3E6'];
  return <Frame light="#9FD8FF" rtl={t.rtl}>
    <rect x={-600} y={-600} width={2800} height={2100} fill="#0B0C12" />
    {cols.map((c, i) => { const x = 330 + (i % 3) * 330, y = 150 + Math.floor(i / 3) * 250; return <g key={i}>
      <rect x={x - 150} y={y - 100} width={300} height={200} rx={8} fill="#05060A" stroke="#2A2B33" strokeWidth={6} />
      <rect x={x - 140} y={y - 90} width={280} height={180} fill={c} opacity={0.18} className="lp lp-bulb" style={{ animationDelay: `${i * 0.4}s` }} />
      <rect x={x - 140} y={y + 50} width={280} height={34} fill={c} opacity={0.8} />
      <svg x={x - 140} y={y + 50} width={280} height={34} overflow="hidden"><g className="lp lp-scroll" style={{ animationDuration: `${7 + i}s` }}>{Array.from({ length: 12 }, (_, j) => <rect key={j} x={j * 110} y={12} width={70 + (j % 3) * 10} height={10} fill={PAPER} opacity={0.85} />)}</g></svg>
      {Array.from({ length: 3 }, (_, j) => <rect key={j} x={x - 120} y={y - 70 + j * 30} width={180 - j * 40} height={12} fill={PAPER} opacity={0.35} />)}
    </g>; })}
    <rect x={-600} y={700} width={2800} height={600} fill="#15120E" />
  </Frame>;
}

// ---------- the Pass: the training ground in each season's light
function season(key: string): ComponentType {
  return function SeasonLoop() {
    const t = useT();
    const S = ({ rumour: { sky: ['#2A2438', '#C98A5A'], grass: '#2F5A2A', light: '#FFD9A0' }, winter: { sky: ['#05070F', '#1A2440'], grass: '#DDE4EE', light: '#DDE8FF' }, spring: { sky: ['#6A8CB0', '#C8D8C0'], grass: '#3F7A34', light: '#FFF3C0' }, summer: { sky: ['#2F7FD0', '#FFE3A3'], grass: '#4E8A2E', light: '#FFE08A' } } as Record<string, { sky: string[]; grass: string; light: string }>)[key] || { sky: ['#2A2438', '#C98A5A'], grass: '#2F5A2A', light: '#FFD9A0' };
    return <Frame light={S.light} rtl={t.rtl}>
      <defs><linearGradient id={'dlS' + key} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={S.sky[0]} /><stop offset="1" stopColor={S.sky[1]} /></linearGradient></defs>
      <rect x={-600} y={-600} width={2800} height={1100} fill={`url(#dlS${key})`} />
      <path d="M-600 500 H2200 V1500 H-600 Z" fill={S.grass} />
      {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${-600 + i * 400} 500 l200 0 l${-100 + i * 10} 1000 l-200 0 z`} fill="#000" opacity={key === 'winter' ? 0.04 : 0.08} />)}
      <path d="M200 520 L1400 520 L1600 900 L0 900 Z" fill="none" stroke={PAPER} strokeOpacity={0.5} strokeWidth={4} />
      <line x1={800} y1={520} x2={800} y2={900} stroke={PAPER} strokeOpacity={0.5} strokeWidth={4} />
      {[250, 1350].map((x) => <g key={x}><rect x={x - 6} y={200} width={12} height={320} fill="#1A1A22" /><rect x={x - 50} y={180} width={100} height={40} rx={4} fill="#1A1A22" />
        {key === 'winter' && <g className="lp lp-breathe"><Glow x={x} y={200} r={200} ry={120} col="#DDE8FF" o={0.8} /><Cone x={x} y={220} w0={40} w1={320} h={600} col="#DDE8FF" o={0.08} /></g>}</g>)}
      {key === 'rumour' && <g className="lp lp-drift" opacity={0.5}><rect x={-600} y={470} width={2800} height={80} fill="#E9E2D3" opacity={0.25} /></g>}
      {key === 'winter' && <Rain f={0} x={0} y={0} w={1600} h={900} n={40} seed={8} col="rgba(255,255,255,.55)" slant={2} />}
      {key === 'spring' && <Rain f={0} x={0} y={0} w={1600} h={900} n={26} seed={5} />}
      {key === 'summer' && <g className="lp lp-scroll" style={{ animationDuration: '16s' }}><path d="M1400 120 l30 -6 l-10 14 z" fill="#15130F" /><line x1={1430} y1={116} x2={2100} y2={60} stroke={PAPER} strokeOpacity={0.6} strokeWidth={3} /></g>}
      {key === 'summer' && <circle cx={1200} cy={140} r={60} fill="#FFF3C0" opacity={0.9} />}
    </Frame>;
  };
}

// ---------- Results: the press hall after the run, rollers turning, tomorrow's edition stacked
function Pressroom() {
  const t = useT();
  const roller = (x: number, y: number, r: number) => <g transform={`translate(${x} ${y})`}><g className="lp lp-spin"><circle r={r} fill="#2E2A24" stroke="#8A8272" strokeWidth={6} />{[0, 60, 120].map((a) => <line key={a} x1={-r + 8} x2={r - 8} y1={0} y2={0} stroke="#8A8272" strokeWidth={6} transform={`rotate(${a})`} />)}</g></g>;
  return <Frame light="#DDE8DD" rtl={t.rtl}>
    <rect x={-600} y={-600} width={2800} height={2100} fill="#14161A" />
    <rect x={500} y={70} width={600} height={14} rx={7} fill="#E8FFF4" className="lp lp-strip" />
    <Glow x={800} y={80} r={500} ry={140} col="#DDE8FF" o={0.4} />
    <rect x={300} y={300} width={1000} height={340} rx={16} fill="#23272E" stroke="#3A3F48" strokeWidth={8} />
    {roller(460, 470, 90)}{roller(700, 470, 90)}{roller(940, 470, 90)}{roller(1160, 470, 70)}
    <rect x={-600} y={700} width={2800} height={600} fill="#0E0F12" />
    <g transform="translate(1320 700)">{Array.from({ length: 12 }, (_, i) => <rect key={i} x={-90} y={-14 - i * 14} width={180} height={12} fill={i % 2 ? PAPER : '#E9E2D3'} />)}</g>
    <Motes f={0} x={400} y={100} w={800} h={500} n={12} seed={4} col="rgba(220,235,255,.4)" />
  </Frame>;
}

// ---------- the Newsroom: the building at night, the masthead plate lit (the game prints the name)
function Masthead() {
  const t = useT();
  return <Frame light="#FFC873" rtl={t.rtl}>
    <rect x={-600} y={-600} width={2800} height={2100} fill="#070914" />
    <City x={-200} y={380} w={2000} h={380} n={20} seed={21} lit={0.3} />
    <rect x={420} y={120} width={760} height={780} fill="#12141E" />
    {Array.from({ length: 30 }, (_, i) => <rect key={i} x={460 + (i % 6) * 120} y={330 + Math.floor(i / 6) * 100} width={70} height={56} fill="#FFD58A" opacity={rnd(i, 3) < 0.45 ? 0.55 : 0.06} className={i % 7 === 0 ? 'lp lp-win' : undefined} style={i % 7 === 0 ? { animationDelay: `${i * 0.3}s` } : undefined} />)}
    <rect x={480} y={170} width={640} height={110} rx={8} fill="#1E1A15" stroke="#3A342A" strokeWidth={6} />
    <g className="lp lp-breathe"><Glow x={800} y={225} r={420} ry={140} col="#FFC873" o={0.55} /></g>
    <rect x={-600} y={860} width={2800} height={400} fill="#05060A" />
    <g className="lp lp-sweep"><rect x={0} y={870} width={160} height={10} rx={5} fill="#FFE3A3" opacity={0.7} /></g>
  </Frame>;
}

// ---------- Deadline Day: the wall clock, the red second hand sweeping
function DDClock() {
  const t = useT();
  return <Frame light="#FF6A48" rtl={t.rtl}>
    <rect x={-600} y={-600} width={2800} height={2100} fill="#120C0A" />
    <circle cx={800} cy={450} r={330} fill="#E9E2D3" stroke="#2A241C" strokeWidth={26} />
    {Array.from({ length: 60 }, (_, i) => <line key={i} x1={800} y1={140} x2={800} y2={i % 5 ? 156 : 186} stroke="#15130F" strokeWidth={i % 5 ? 3 : 8} transform={`rotate(${i * 6} 800 450)`} />)}
    {Array.from({ length: 12 }, (_, i) => { const a = (i + 1) * Math.PI / 6; return <MText key={i} x={800 + Math.sin(a) * 230} y={450 - Math.cos(a) * 230 + 20} size={56} fill="#15130F" font={F_MONO} stretch="100%" weight={700}>{String(i + 1)}</MText>; })}
    <line x1={800} y1={450} x2={800} y2={270} stroke="#15130F" strokeWidth={16} strokeLinecap="round" transform="rotate(300 800 450)" />
    <line x1={800} y1={450} x2={800} y2={190} stroke="#15130F" strokeWidth={10} strokeLinecap="round" transform="rotate(354 800 450)" />
    <g transform="translate(800 450)"><g className="lp lp-spin" style={{ animationDuration: '4s', transformOrigin: '50% 87.88%' }}><line x1={0} y1={40} x2={0} y2={-290} stroke={RED} strokeWidth={5} /><circle r={14} fill={RED} /></g></g>
    <g className="lp lp-blink" style={{ animationDuration: '4s' }}><circle cx={1240} cy={180} r={22} fill={RED} /><Glow x={1240} y={180} r={120} col="#FF3B1E" o={0.8} /></g>
  </Frame>;
}

/** Every loop stem → its drawn composition. */
export const DRAWN: Record<string, ComponentType> = {
  ...Object.fromEntries(TONES.map((tn) => ['loop-home-desk-' + tn, desk(tn)])),
  ...Object.fromEntries(SRCS.map((s) => ['loop-place-' + s, placeLoop(s)])),
  ...Object.fromEntries(SEASONS.map((s) => ['loop-season-' + s, season(s)])),
  'loop-pressbox': Pressbox, 'loop-wire-room': WireRoom, 'loop-deadline-city': DeadlineCity,
  'loop-results-pressroom': Pressroom, 'loop-newsroom-masthead': Masthead, 'loop-dd-clock': DDClock,
};
export const drawnOf = (stem: string): ComponentType | undefined => DRAWN[stem];
