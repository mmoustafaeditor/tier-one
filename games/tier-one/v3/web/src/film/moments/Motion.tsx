// The game's reward films as motion pieces (GOTY.md §10, §12): objects, places, paper, ink, light and type. No
// people, no hands, no faces. One hero beat and one loud colour each, ≤ 6 s, portrait + landscape, RTL-aware; the last
// frame is the composed still reduced motion shows. The game's words (names, tiers, dates) come in as props.
import { AbsoluteFill, Sequence, interpolate, spring } from '../remotion-shim';
import { C, F, SRC_C, At, DeskSurface, Glyph, Paper, Plate, Shot, Stamp, Typeset, clamp, k01, useStage, EASE } from '../kit';
import { Lamp, Night, Glow, Rain, Led, Flap, Ticker, Roll, Laptop, TV, PostCard, Calendar, Masthead, FrontPage, Presses, Sweep } from '../world';
import type { SceneMeta } from '../cues';

const meta = (dur: number, beats: number[], cues: [number, string][], hold = 800): SceneMeta => ({ dur, hold, beats, cues: cues.map(([f, k]) => ({ f, k })) });
const shortOf = (m: SceneMeta, cut: number): SceneMeta => ({ dur: m.dur - cut, hold: 600, beats: [0, ...m.beats.filter((b) => b > cut).map((b) => b - cut)], cues: m.cues.filter((c) => c.f >= cut).map((c) => ({ ...c, f: c.f - cut })) });
const Confetti = ({ at, n = 28, gold = true }: { at: number; n?: number; gold?: boolean }) => {
  const { f } = useStage();
  if (f < at) return null;
  const t = f - at;
  return <>{Array.from({ length: n }, (_, i) => <i key={i} style={{ position: 'absolute', left: ((i * 7919) % 1800) - 900 + Math.sin(t / 6 + i) * 40, top: -1000 + t * (9 + (i % 5) * 2) - ((i * 131) % 500), width: 18, height: 30, background: i % 3 ? (gold ? C.gold : C.red) : C.paper, transform: `rotate(${t * 12 + i * 40}deg)` }} />)}</>;
};

// ---------------------------------------------------------------- moment-paper: presses roll, the headline prints, the stack lands
export type PressRunProps = { masthead: string; edition: string; dateline: string; headline: string; byline: string; kicker: string; stamp: string; cut?: 'full' | 'short'; rtl?: boolean };
const PR = { print: 40, land: 84, stamp: 104, end: 150 };
export const PRESS_RUN = meta(PR.end, [0, PR.print, PR.land], [[0, 'presses'], [PR.print, 'whoosh'], [PR.print + 6, 'typewriter'], [PR.land, 'thock'], [PR.land + 1, 'boom'], [PR.stamp, 'stamp'], [PR.stamp + 2, 'fanfare']]);
export const PRESS_RUN_SHORT = shortOf(PRESS_RUN, 70);
export function PressRun(p: PressRunProps) {
  if (p.cut !== 'short') return <PressBody {...p} />;
  return <AbsoluteFill><Sequence from={-70} layout="none"><PressBody {...p} /></Sequence></AbsoluteFill>;
}
function PressBody(p: PressRunProps) {
  const { f, fps, P } = useStage();
  if (f < PR.print) return <Shot rtl={p.rtl} from={{ x: 0, y: 0, z: P ? 0.56 : 0.6 }} to={{ x: 0, y: 0, z: P ? 0.66 : 0.7 }} span={[0, PR.print]}>
    <Presses turn={f * 20} accent={C.red} />
    <Glow x={0} y={0} r={1200} color="rgba(255,90,54,.18)" />
  </Shot>;
  const fw = P ? 900 : 860, fh = P ? 1240 : 900;
  const land = spring({ frame: f - PR.land, fps, config: { damping: 12, stiffness: 220 } });
  const drop = f < PR.land ? interpolate(f, [PR.print, PR.land], [-80, -40], clamp) : 0;
  return <Shot rtl={p.rtl} from={{ x: 0, y: 0, z: P ? 0.92 : 0.9 }} to={{ x: 0, y: 0, z: P ? 0.98 : 0.96 }} hits={[PR.land]} amp={20} span={[PR.print, PR.end]}>
    <DeskSurface y={-2000} />
    {/* the stack under the top copy: the edges of forty more copies */}
    {f >= PR.land && Array.from({ length: 6 }, (_, i) => <At key={i} x={i * 3} y={i * 7 + 10} w={fw} h={fh} rot={(i % 2 ? 0.6 : -0.6)} style={{ background: i % 2 ? C.paper2 : C.paper3, boxShadow: '0 4px 8px rgba(0,0,0,.4)' }} />)}
    <At x={0} y={drop} w={fw} h={fh} rot={f < PR.land ? -3 : (1 - land) * -3} scale={f < PR.land ? 1.12 : interpolate(land, [0, 1], [1.12, 1])}>
      <FrontPage w={fw} h={fh} masthead={p.masthead} edition={p.edition} dateline={p.dateline} kicker={p.kicker} headline={p.headline} byline={p.byline} hedAt={PR.print + 6} byAt={PR.print + 30} stamp={p.stamp} stampAt={PR.stamp} accent={C.red} rtl={p.rtl} />
    </At>
    <Lamp x={p.rtl ? 700 : -700} y={-700} on={1} flip={p.rtl} />
    <Night x={0} y={0} r={1300} level={0.5} />
  </Shot>;
}

// ---------------------------------------------------------------- moment-official: the breaking-news ticker with your name
export type BreakingProps = { player: string; breaking: string; official: string; ticker: string; credit: string; byline: string; rtl?: boolean };
const BK = { on: 8, band: 24, stamp: 58, credit: 76, end: 150 };
export const BREAKING = meta(BK.end, [0, BK.stamp], [[0, 'flip'], [BK.on, 'reveal'], [BK.band, 'whoosh'], [BK.stamp, 'stamp'], [BK.stamp + 2, 'boom'], [BK.credit, 'typewriter'], [BK.credit + 20, 'fanfare']]);
export function Breaking(p: BreakingProps) {
  const { f, P } = useStage();
  const tw = P ? 1000 : 1500, th = P ? 1300 : 840, on = k01(f, BK.on, BK.on + 6), band = k01(f, BK.band, BK.band + 10, EASE.out);
  return <Shot rtl={p.rtl} from={{ x: 0, y: 0, z: 0.88 }} to={{ x: 0, y: 0, z: 0.96 }} hits={[BK.stamp]} amp={16} bg="#060608">
    <Glow x={0} y={0} r={1300} color="rgba(255,90,54,.2)" on={on} />
    <At x={0} y={0} w={tw} h={th}>
      <TV w={tw} h={th} on={on}>
        <div style={{ position: 'relative', flex: 1, background: 'radial-gradient(circle at 50% 30%, #2A1010, #0A0506 70%)', overflow: 'hidden', direction: p.rtl ? 'rtl' : 'ltr' }}>
          {/* studio light sweeps */}
          <div style={{ position: 'absolute', left: tw / 2, top: -200 }}><Sweep x={0} y={0} angle={80 + Math.sin(f / 14) * 20} len={1600} color="rgba(255,236,190,.2)" /></div>
          <div style={{ position: 'absolute', insetInline: 0, top: P ? 180 : 90, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, textAlign: 'center', padding: '0 40px' }}>
            <span style={{ background: C.red, color: C.paper, fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: 70, letterSpacing: '.12em', padding: '6px 30px', transform: `scaleX(${band})` }}>{p.breaking}</span>
            <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: P ? 130 : 120, lineHeight: 1, color: C.paper, overflowWrap: 'anywhere' }}><Typeset text={p.player} at={BK.band + 6} cpf={1.2} /></span>
            <Stamp text={p.official} color={C.red} at={BK.stamp} size={P ? 150 : 130} rot={-6} style={{ background: 'rgba(10,5,6,.7)' }} />
            <span style={{ fontFamily: F.text, fontWeight: 800, fontSize: P ? 50 : 44, color: C.gold, opacity: k01(f, BK.credit, BK.credit + 8) }}>{p.credit}: <bdi>{p.byline}</bdi></span>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, transform: `translateY(${(1 - band) * 120}px)` }}><Ticker text={p.ticker} w={tw} h={96} speed={11} label={p.breaking} rtl={p.rtl} /></div>
        </div>
      </TV>
    </At>
  </Shot>;
}

// ---------------------------------------------------------------- moment-contact-<src>: that source's place, lit gold
export type PlaceGoldProps = { src: string; name: string; kicker: string; lv: string; perk: string; stamp: string; rtl?: boolean };
const PG = { gold: 50, card: 70, end: 150 };
export const PLACE_GOLD = meta(PG.end, [0, PG.gold, PG.card], [[0, 'whoosh'], [PG.gold, 'lampon'], [PG.gold + 2, 'sparkle'], [PG.card, 'stamp'], [PG.card + 2, 'levelup']]);
function Place({ src, gold, f }: { src: string; gold: number; f: number }) {
  const lit = (a: string) => (gold > 0 ? `color-mix(in srgb, ${a} ${100 - gold * 70}%, ${C.gold})` : a);
  if (src === 'kitman') // the boot room: shirts on a rail, boots on a shelf
    return <>{Array.from({ length: 7 }, (_, i) => <At key={i} x={(i - 3) * 230} y={-220} w={200} h={300}><svg viewBox="0 0 24 24" width={200} height={300} preserveAspectRatio="none" aria-hidden="true"><path d="M8 3l-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z" fill={lit(i % 2 ? '#2A3A5A' : '#3A2A2A')} stroke="#0A0A0A" strokeWidth=".4" /></svg></At>)}
      <At x={0} y={-400} w={1800} h={16} style={{ background: '#6A6A70' }} />
      {Array.from({ length: 8 }, (_, i) => <At key={i} x={(i - 3.5) * 200} y={220} w={150} h={70} style={{ background: lit('#1A1A1A'), borderRadius: '10px 40px 10px 10px' }} />)}</>;
  if (src === 'barber') // the barber shop: the pole spinning, the mirror, the chair's shadow
    return <><At x={-520} y={-80} w={110} h={620} style={{ borderRadius: 55, overflow: 'hidden', border: '10px solid #CCC' }}><div style={{ position: 'absolute', left: 0, top: -200, width: '100%', height: 1200, background: `repeating-linear-gradient(135deg, ${C.red} 0 40px, ${C.paper} 40px 80px, #2F5BD0 80px 120px, ${C.paper} 120px 160px)`, transform: `translateY(${(f * 4) % 226}px)` }} /></At>
      <At x={180} y={-120} w={760} h={680} style={{ borderRadius: '380px 380px 20px 20px', border: '18px solid #3A2F24', background: `linear-gradient(135deg, ${lit('#2A3038')}, #12151A)` }} /></>;
  if (src === 'agent') // the back of a car in the rain: the window, the city smeared beyond
    return <><At x={0} y={-80} w={1400} h={760} style={{ borderRadius: 80, background: `linear-gradient(180deg, ${lit('#1A2233')}, #0A0C12)`, overflow: 'hidden', border: '30px solid #111' }}>
      {Array.from({ length: 16 }, (_, i) => <i key={i} style={{ position: 'absolute', left: (i * 91) % 1300, top: 300 + ((i * 43) % 300), width: 60, height: 60, borderRadius: '50%', background: i % 3 ? C.lamp : C.red, filter: 'blur(14px)', opacity: 0.5 }} />)}
      <div style={{ position: 'absolute', left: 700, top: 380 }}><Rain w={1600} h={900} opacity={0.7} /></div></At></>;
  if (src === 'spotter') // the arrivals hall at night: runway lights, the board
    return <><At x={0} y={-440} w={1300} h={120} style={{ background: '#0C0B09', border: '8px solid #2A2620', display: 'grid', placeItems: 'center' }}><Flap text="ARRIVED" from="DELAYED" at={10} size={60} len={9} color={gold ? C.gold : C.paper} /></At>
      {Array.from({ length: 12 }, (_, i) => <At key={i} x={(i - 5.5) * 150} y={220 - Math.abs(i - 5.5) * 12} w={30} h={30} style={{ borderRadius: '50%', background: (Math.floor(f / 3) - i) % 12 === 0 ? C.paper : lit('#5A4A20'), boxShadow: `0 0 20px ${C.gold}` }} />)}</>;
  // physio: the treatment room, the monitor's line
  return <At x={0} y={-120} w={1300} h={640} style={{ background: '#050A08', border: '24px solid #1C1F22', borderRadius: 20, overflow: 'hidden' }}>
    <svg viewBox="0 0 400 200" width={1252} height={592} aria-hidden="true"><path d="M0 100 H120 L140 40 L165 170 L185 70 L200 100 H400" fill="none" stroke={gold ? C.gold : C.done} strokeWidth="6" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ((f / 40) % 1)} /></svg>
  </At>;
}
export function PlaceGold(p: PlaceGoldProps) {
  const { f, fps, P } = useStage();
  const gold = k01(f, PG.gold, PG.gold + 12), acc = SRC_C[p.src] || C.gold;
  const card = spring({ frame: f - PG.card, fps, config: { damping: 12, stiffness: 200 } });
  return <Shot rtl={p.rtl} from={{ x: 0, y: -60, z: P ? 0.66 : 0.62 }} to={{ x: 0, y: 40, z: P ? 0.74 : 0.7 }} hits={[PG.card]} bg="#07080A">
    <div style={{ position: 'absolute', left: -3000, top: -3000, width: 6000, height: 6000, background: '#0E0F12' }} />
    <Place src={p.src} gold={gold} f={f} />
    <Night x={0} y={0} r={1200} level={1 - gold * 0.6} />
    <Glow x={0} y={-100} r={1500} color="rgba(247,185,40,.38)" on={gold} />
    {/* the source's card flips over, gold side up */}
    <At x={0} y={P ? 560 : 330} w={760} h={300} rot={-2} scale={f < PG.card ? 0 : interpolate(card, [0, 1], [1.5, 1])} style={{ transform: `rotateY(${(1 - Math.min(1, card)) * 90}deg)` }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 24, background: `linear-gradient(135deg,#FFE08A,${C.gold} 45%,${C.goldDeep})`, boxShadow: '0 30px 60px rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', gap: 30, padding: '0 40px', color: C.ink, direction: p.rtl ? 'rtl' : 'ltr' }}>
        <span style={{ width: 150, height: 150, borderRadius: '50%', background: C.ink, display: 'grid', placeItems: 'center', flex: 'none' }}><Glyph n={p.src} size={90} color={acc} /></span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={{ fontFamily: F.mono, fontSize: 28, letterSpacing: '.1em', textTransform: 'uppercase' }}>{p.kicker} · {p.lv}</span>
          <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 86, lineHeight: 1 }}>{p.name}</span>
        </span>
      </div>
      <div style={{ position: 'absolute', insetInlineEnd: -20, top: -60 }}><Stamp text={p.stamp} color={C.goldDeep} at={PG.card + 10} size={70} rot={-10} style={{ background: C.paper }} /></div>
    </At>
  </Shot>;
}

// ---------------------------------------------------------------- scalp / trophy / friend scalp: a laptop slams shut, your post on the TV wall
export type SlamProps = { handle: string; byline: string; post: string; theirs: string; viral: string; record: string; stamp: string; trophy?: boolean; rtl?: boolean };
const SL = { post: 10, slam: 70, stamp: 88, end: 150 };
export const SLAM = meta(SL.end, [0, SL.slam], [[0, 'reveal'], [SL.post, 'typewriter'], [40, 'pop'], [50, 'pop'], [SL.slam, 'thock'], [SL.slam + 1, 'boom'], [SL.stamp, 'stamp'], [SL.stamp + 2, 'fanfare']]);
export function LaptopSlam(p: SlamProps) {
  const { f, P } = useStage();
  const acc = p.trophy ? C.gold : C.red, m = p.rtl ? -1 : 1;
  const lid = f < SL.slam - 6 ? 1 : interpolate(f, [SL.slam - 6, SL.slam], [1, 0], { ...clamp, easing: EASE.in });
  const viral = k01(f, 20, 70);
  const tvW = P ? 900 : 1000;
  return <Shot rtl={p.rtl} from={{ x: 0, y: P ? -200 : -100, z: P ? 0.66 : 0.6 }} to={{ x: 0, y: 0, z: P ? 0.72 : 0.64 }} hits={[SL.slam]} amp={22} bg="#08070A"
    over={<Plate at={SL.stamp} kicker={p.handle} title={p.stamp} sub={p.record} accent={acc} rtl={p.rtl} />}>
    <div style={{ position: 'absolute', left: -3000, top: -3000, width: 6000, height: 2800, background: 'linear-gradient(180deg,#0E0D12,#16141A)' }} />
    {/* the TV wall: your post, going viral */}
    {[-1, 0, 1].map((k) => <At key={k} x={k * (tvW + 60) * m} y={-640} w={tvW} h={tvW * 0.56} style={{ opacity: k ? 0.55 : 1 }}>
      <TV w={tvW} h={tvW * 0.56} on={k01(f, 4 + Math.abs(k) * 4, 12 + Math.abs(k) * 4)}>
        <div style={{ flex: 1, background: '#0B1426', display: 'grid', placeItems: 'center' }}><div style={{ transform: 'scale(.9)' }}><PostCard w={tvW * 0.8} byline={p.byline} text={p.post} at={SL.post} viral={viral} tag={p.viral} rtl={p.rtl} /></div></div>
      </TV>
    </At>)}
    <DeskSurface y={-120} />
    {/* the rival's laptop, their dead post on screen, slammed shut */}
    <Laptop x={0} y={240} w={880} lid={lid} glow={lid}>
      <div style={{ flex: 1, background: C.paper2, display: 'grid', placeItems: 'center', padding: 30 }}><PostCard w={740} byline={p.handle} text={p.theirs} at={-100} viral={0.02} rtl={p.rtl} /></div>
    </Laptop>
    <Glow x={0} y={-640} r={1200} color={p.trophy ? 'rgba(247,185,40,.3)' : 'rgba(255,90,54,.22)'} on={viral} />
    {p.trophy && <Confetti at={SL.stamp} />}
  </Shot>;
}

// ---------------------------------------------------------------- streaks 7 / 30 / 100: a wall calendar fills
export type CalendarFillProps = { n: number; month: string; kicker: string; title: string; sub: string; stamp: string; rtl?: boolean };
const CF = { fill: 10, done: 84, end: 150 };
export const CALENDAR_FILL = meta(CF.end, [0, CF.done], [[0, 'flip'], [CF.fill, 'pen'], [30, 'pen'], [50, 'pen'], [70, 'pen'], [CF.done, 'stamp'], [CF.done + 2, 'levelup']]);
export function CalendarFill(p: CalendarFillProps) {
  const { f, fps, P } = useStage();
  const big = p.n >= 30, acc = big ? C.gold : C.red;
  const days = p.n === 7 ? 7 : p.n === 30 ? 30 : 31;
  const to = interpolate(f, [CF.fill, CF.done - 6], [0, days], { ...clamp, easing: EASE.inOut });
  const s = spring({ frame: f - CF.done, fps, config: { damping: 10, stiffness: 220 } });
  return <Shot rtl={p.rtl} from={{ x: 0, y: 0, z: P ? 0.92 : 0.78 }} to={{ x: 0, y: 0, z: P ? 1.0 : 0.84 }} hits={[CF.done]} bg="#0B0A08"
    over={<Plate at={CF.done + 10} kicker={p.kicker} title={p.title} sub={p.sub} accent={acc} rtl={p.rtl} top />}>
    <div style={{ position: 'absolute', left: -3000, top: -3000, width: 6000, height: 6000, background: 'repeating-linear-gradient(90deg,#1A1712 0 180px,#17140F 180px 360px)' }} />
    <At x={P ? 0 : -280 * (p.rtl ? -1 : 1)} y={P ? 60 : 40} w={720} h={720}><Calendar w={720} month={p.month} days={days} to={to} accent={acc} rtl={p.rtl} /></At>
    <At x={P ? 0 : 520 * (p.rtl ? -1 : 1)} y={P ? 620 : 40} w={600} h={300} scale={f < CF.done ? 0.001 : interpolate(s, [0, 1], [1.8, 1])}>
      <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}><Roll from={0} to={p.n} at={CF.fill} dur={CF.done - CF.fill} style={{ fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: 300, lineHeight: 1, color: acc, textShadow: `0 0 60px ${acc}88` }} /></div>
    </At>
    <Glow x={0} y={0} r={1200} color={big ? 'rgba(247,185,40,.3)' : 'rgba(255,90,54,.2)'} on={k01(f, CF.done, CF.done + 10)} />
    {p.n >= 100 && <Confetti at={CF.done} />}
  </Shot>;
}

// ---------------------------------------------------------------- style titles: a typewritten dossier card
export type DossierProps = { kicker: string; title: string; line: string; stamp: string; byline: string; rtl?: boolean };
const DS = { out: 8, type: 34, stamp: 92, end: 150 };
export const DOSSIER = meta(DS.end, [0, DS.type, DS.stamp], [[0, 'whoosh'], [DS.out, 'flip'], [DS.type, 'typewriter'], [DS.type + 18, 'typewriter'], [DS.type + 36, 'typewriter'], [DS.stamp, 'stamp'], [DS.stamp + 2, 'fanfare']]);
export function Dossier(p: DossierProps) {
  const { f, P } = useStage();
  const out = k01(f, DS.out, DS.type - 4, EASE.out);
  return <Shot rtl={p.rtl} from={{ x: 0, y: 40, z: P ? 0.9 : 0.8 }} to={{ x: 0, y: -40, z: P ? 1.0 : 0.88 }} hits={[DS.stamp]} bg="#0B0A08">
    <DeskSurface y={-2000} />
    {/* the manila folder, and the card sliding out of it */}
    <At x={0} y={120} w={980} h={700} rot={-2} style={{ background: 'linear-gradient(180deg,#D8B878,#B8955A)', borderRadius: '0 18px 18px 18px', boxShadow: '0 30px 60px rgba(0,0,0,.6)' }}>
      <i style={{ position: 'absolute', insetInlineStart: 0, top: -50, width: 300, height: 56, background: '#D8B878', borderRadius: '16px 16px 0 0' }} />
    </At>
    <At x={0} y={120 - out * 420} w={900} h={620} rot={-2 + out * 3}>
      <Paper tone="#F2EAD6">
        <div style={{ padding: '46px 56px', display: 'flex', flexDirection: 'column', gap: 22, fontFamily: F.mono, color: C.ink }}>
          <span style={{ fontSize: 30, letterSpacing: '.14em', textTransform: 'uppercase', color: C.ink2 }}>{p.kicker}</span>
          <span style={{ fontSize: P ? 92 : 84, fontWeight: 700, lineHeight: 1.02, textTransform: 'uppercase' }}><Typeset text={p.title} at={DS.type} cpf={0.8} /></span>
          <span style={{ fontSize: 34, lineHeight: 1.3, color: C.ink2 }}><Typeset text={p.line} at={DS.type + 26} cpf={2.2} /></span>
          <span style={{ marginTop: 'auto', fontSize: 30, borderTop: `3px solid ${C.ink}`, paddingTop: 12 }}>{p.byline}</span>
        </div>
        <div style={{ position: 'absolute', insetInlineEnd: 40, bottom: 40 }}><Stamp text={p.stamp} color={C.goldDeep} at={DS.stamp} size={80} rot={-10} /></div>
      </Paper>
    </At>
    <Lamp x={p.rtl ? 720 : -720} y={-520} on={1} flip={p.rtl} />
    <Night x={0} y={-100} r={1200} level={0.6} />
    <Glow x={0} y={-100} r={900} color="rgba(247,185,40,.25)" on={k01(f, DS.stamp, DS.stamp + 10)} />
  </Shot>;
}

// ---------------------------------------------------------------- Deadline Day Live: the ON AIR sign lights (open) or goes dark (close)
export type OnAirProps = { open: boolean; kicker: string; title: string; sub: string; stamp: string; onAir: string; rtl?: boolean };
const OA = { hit: 30, end: 132 };
export const ON_AIR = meta(OA.end, [0, OA.hit], [[0, 'clock'], [10, 'clock'], [20, 'clock'], [OA.hit, 'dayhit'], [OA.hit + 2, 'lampon'], [OA.hit + 40, 'stamp']]);
export const OFF_AIR = meta(OA.end, [0, OA.hit], [[0, 'clock'], [10, 'clock'], [20, 'clock'], [OA.hit, 'lampoff'], [OA.hit + 2, 'whistle'], [OA.hit + 40, 'stamp']]);
export function OnAir(p: OnAirProps) {
  const { f, P } = useStage();
  const hit = f >= OA.hit;
  const lit = p.open ? (hit ? 1 : 0.08) : (hit ? 0.08 : 1);
  const lamps = (i: number) => { const d = OA.hit + i * 3; return p.open ? k01(f, d, d + 3) : 1 - k01(f, d, d + 3); };
  return <Shot rtl={p.rtl} from={{ x: 0, y: -200, z: P ? 0.62 : 0.6 }} to={{ x: 0, y: -120, z: P ? 0.7 : 0.66 }} hits={[OA.hit]} bg="#060507"
    over={<Plate at={OA.hit + 26} kicker={p.kicker} title={p.title} sub={p.sub} stamp={p.stamp} stampAt={OA.hit + 40} accent={C.red} rtl={p.rtl} />}>
    <div style={{ position: 'absolute', left: -3000, top: -3000, width: 6000, height: 6000, background: '#0E0C0B' }} />
    <At x={0} y={-640} w={760} h={200} style={{ background: '#1A0605', border: '12px solid #2A2620', borderRadius: 16, display: 'grid', placeItems: 'center', boxShadow: lit > 0.5 ? `0 0 120px ${C.red}` : 'none' }}>
      <span style={{ fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: 130, letterSpacing: '.12em', color: C.red, opacity: lit, textShadow: lit > 0.5 ? `0 0 40px ${C.red}` : 'none' }}>{p.onAir}</span>
    </At>
    <At x={0} y={-330} w={600} h={180} style={{ display: 'grid', placeItems: 'center' }}><Led text={p.open ? (hit ? '00:00' : '23:59') : (hit ? '00:00' : '23:59')} size={140} /></At>
    {/* rows of desks, each with its lamp, lighting (or going dark) in a wave from the door */}
    {Array.from({ length: 10 }, (_, i) => { const x = ((i % 5) - 2) * 440 * (p.rtl ? -1 : 1), y = 40 + Math.floor(i / 5) * 360; const on = lamps(i);
      return <At key={i} x={x} y={y} w={360} h={200}>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80, background: '#2C271F', borderRadius: 8 }} />
        <i style={{ position: 'absolute', left: 150, top: 0, width: 80, height: 50, background: '#3A342A', borderRadius: '40px 40px 0 0' }} />
        <i style={{ position: 'absolute', left: 20, right: 20, top: 40, height: 140, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,200,115,.8), transparent 70%)', opacity: on }} />
      </At>; })}
  </Shot>;
}

// ---------------------------------------------------------------- the catchphrase: the player's own line, set in metal type and slammed on the page
export type CatchphraseProps = { line: string; byline: string; kicker: string; rtl?: boolean };
const CP = { set: 12, slam: 56, end: 126 };
export const CATCHPHRASE = meta(CP.end, [0, CP.slam], [[0, 'whoosh'], [CP.set, 'typewriter'], [CP.set + 20, 'typewriter'], [CP.slam, 'stamp'], [CP.slam + 1, 'boom'], [CP.slam + 3, 'fanfare']], 700);
export function Catchphrase(p: CatchphraseProps) {
  const { f, fps, P } = useStage();
  const s = spring({ frame: f - CP.slam, fps, config: { damping: 10, stiffness: 260, mass: 0.8 } });
  const n = Array.from(p.line).length, size = Math.min(P ? 190 : 200, (P ? 1700 : 2400) / Math.max(4, n));
  return <Shot rtl={p.rtl} from={{ x: 0, y: 0, z: P ? 0.9 : 0.84 }} to={{ x: 0, y: 0, z: P ? 0.98 : 0.9 }} hits={[CP.slam]} amp={26} bg="#0B0A08">
    <DeskSurface y={-2000} />
    <Glow x={0} y={0} r={1300} color="rgba(247,185,40,.4)" on={k01(f, CP.slam, CP.slam + 8)} />
    {/* the gold frame of the call; the line sets in type, then slams as the stamp */}
    <At x={0} y={-40} w={P ? 980 : 1500} h={P ? 900 : 700} rot={-1.5}>
      <div style={{ position: 'absolute', inset: -16, background: `linear-gradient(135deg,#FFE08A,${C.gold} 45%,${C.goldDeep})`, borderRadius: 18, opacity: k01(f, CP.slam, CP.slam + 4), boxShadow: `0 0 ${80 * Math.min(1, s)}px ${C.gold}` }} />
      <Paper lift={0.4}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, padding: 50, boxSizing: 'border-box', textAlign: 'center' }}>
          <span style={{ fontFamily: F.mono, fontSize: 34, letterSpacing: '.14em', textTransform: 'uppercase', color: C.ink2 }}>{p.kicker}</span>
          <span style={{ fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: size, lineHeight: 0.95, textTransform: 'uppercase', color: f >= CP.slam ? C.ink : C.ink3, overflowWrap: 'anywhere' }}><Typeset text={p.line} at={CP.set} cpf={0.9} /></span>
          <span style={{ fontFamily: F.text, fontWeight: 800, fontSize: 46, opacity: k01(f, CP.slam + 12, CP.slam + 20) }}>— {p.byline}</span>
        </div>
      </Paper>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}><Stamp text={p.line} color={C.goldDeep} at={CP.slam} size={Math.min(170, size * 0.8)} rot={-9} style={{ background: 'rgba(244,239,228,.86)', maxWidth: '96%', overflow: 'hidden' }} /></div>
    </At>
    <Confetti at={CP.slam} n={22} />
  </Shot>;
}

// ---------------------------------------------------------------- room win / newsroom week: a board flips to your name; the masthead lights
export type BoardProps = { variant: 'room' | 'week'; kicker: string; title: string; sub: string; stamp: string; accent: string; byline: string; rtl?: boolean };
const BD = { flip: 14, hit: 54, end: 144 };
export const BOARD = meta(BD.end, [0, BD.hit], [[0, 'whoosh'], [BD.flip, 'flap'], [BD.flip + 14, 'flap'], [BD.hit, 'stamp'], [BD.hit + 2, 'fanfare']]);
export function Board(p: BoardProps) {
  const { f, P } = useStage();
  const room = p.variant === 'room', lit = k01(f, BD.hit - 10, BD.hit);
  return <Shot rtl={p.rtl} from={{ x: 0, y: -80, z: P ? 0.62 : 0.6 }} to={{ x: 0, y: -20, z: P ? 0.7 : 0.66 }} hits={[BD.hit]} bg="#07070A"
    over={<Plate at={BD.hit + 14} kicker={p.kicker} title={p.title} sub={p.sub} stamp={p.stamp} accent={p.accent} rtl={p.rtl} />}>
    <div style={{ position: 'absolute', left: -3000, top: -3000, width: 6000, height: 6000, background: room ? 'linear-gradient(180deg,#0A0C14,#12151F)' : '#0E0C0B' }} />
    {room
      ? <At x={0} y={-400} w={1400} h={520} style={{ background: '#0C0B09', border: '14px solid #2A2620', borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <Flap text={'1 ' + p.byline.toUpperCase()} from="1 ------------" at={BD.flip} size={70} len={14} color={f >= BD.hit ? p.accent : C.paper} />
          <span style={{ opacity: 0.4 }}><Flap text="2 ············" size={52} len={14} /></span>
          <span style={{ opacity: 0.3 }}><Flap text="3 ············" size={52} len={14} /></span>
        </At>
      : <>
          <At x={0} y={-560} w={1400} h={308}><Masthead text={p.title} w={1400} lit={lit} accent={p.accent} /></At>
          <At x={0} y={-10} w={900} h={560} rot={1.5}>
            <Paper>
              <div style={{ padding: '40px 50px', display: 'flex', flexDirection: 'column', gap: 22, fontFamily: F.mono, fontSize: 40 }}>
                {[1, 2, 3, 4].map((r) => <div key={r} style={{ position: 'relative', display: 'flex', gap: 30, color: r === 1 ? C.ink : C.ink3 }}>
                  <b>{r}</b><span style={{ flex: 1, height: 18, marginTop: 14, background: r === 1 ? C.ink : C.paper3 }} />
                  {r === 1 && <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ position: 'absolute', inset: '-18px -30px', width: 'calc(100% + 60px)', height: 'calc(100% + 36px)', overflow: 'visible' }} aria-hidden="true"><ellipse cx="50" cy="15" rx="49" ry="14" fill="none" stroke={C.red} strokeWidth="2.5" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - k01(f, BD.flip, BD.hit)} /></svg>}
                </div>)}
              </div>
            </Paper>
          </At>
        </>}
    <Glow x={0} y={-300} r={1300} color={p.accent + '55'} on={lit} />
    <Confetti at={BD.hit} n={20} />
  </Shot>;
}
