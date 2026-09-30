// Story mode motion pieces ("The Comeback", STORY.html; GOTY.md §10): chapter openers, case-file reveals, the press
// pass per rank, the finale and the epilogue. Objects, places, paper, ink, light and type only: never a person.
// Every piece is one hero beat and one loud colour, ≤ 6 s, a pure function of the frame; its last frame is the
// composed still that reduced motion shows. The words come in as props (story/build.tsx); the chapter plate is
// drawn by the game on top (kit Plate).
import { interpolate, spring } from '../remotion-shim';
import { C, F, At, DeskSurface, Paper, Plate, Shot, Stamp, Typeset, clamp, k01, noise, useStage, EASE } from '../kit';
import { Lamp, Night, Glow, Rain, Led, Phone, MessageScreen, Laptop, Composer, Box, Cup, Steam, TV, LiftDoors, PressPass, Lanyard, FrontPage, Presses, Cursor } from '../world';
import type { SceneMeta } from '../cues';

type W = Record<string, any>;
export type StoryProps = { kind: string; w: W; kicker: string; title: string; byline: string; rtl?: boolean };
const meta = (dur: number, beats: number[], cues: SceneMeta['cues']): SceneMeta => ({ dur, hold: 900, beats, cues });
const cues = (...c: [number, string][]) => c.map(([f, k]) => ({ f, k }));

// ---------------------------------------------------------------- chapter openers (one place each)
export const OPEN_META: Record<string, SceneMeta> = {
  blog: meta(150, [0, 40], cues([0, 'thock'], [34, 'open'], [40, 'lampon'], [60, 'typewriter'], [100, 'stamp'])),
  post: meta(150, [0, 56], cues([0, 'whoosh'], [30, 'thock'], [56, 'stamp'], [58, 'dayhit'], [100, 'flip'])),
  nationals: meta(150, [0, 36], cues([0, 'whoosh'], ...[36, 40, 44, 48, 52, 56].map((f): [number, string] => [f, 'flash']), [60, 'reveal'], [100, 'flip'])),
  war: meta(156, [0, 88], cues(...[10, 20, 30, 40, 50, 60, 70].map((f): [number, string] => [f, 'stamp']), [88, 'boom'], [90, 'twist'], [110, 'flip'])),
  chronicle: meta(160, [0, 30, 76], cues([0, 'lift'], [30, 'open'], [76, 'lampon'], [80, 'reveal'], [110, 'flip'])),
};

export function ChapterOpen(p: StoryProps) {
  const { f, fps, P } = useStage();
  const w = p.w;
  const plate = <Plate at={104} kicker={p.kicker} title={p.title} accent={p.kind === 'war' ? C.red : C.gold} rtl={p.rtl} />;
  if (p.kind === 'blog') {
    // The rented flat: the box from that night on the kitchen table, the laptop lid comes up, a blank blog.
    const lid = k01(f, 12, 36, EASE.out), lamp = k01(f, 38, 44);
    return <Shot rtl={p.rtl} from={{ x: 0, y: 60, z: P ? 0.9 : 0.86 }} to={{ x: 0, y: -40, z: P ? 1.05 : 1.0 }} hits={[100]} over={plate} bg="#0D0B09">
      <DeskSurface y={-120} />
      <div style={{ position: 'absolute', left: -3000, top: -3000, width: 6000, height: 2880, background: 'linear-gradient(180deg,#0E0D10,#17151A)' }} />
      {/* the flat's one window: the city's lights through rain */}
      <At x={p.rtl ? -560 : 560} y={-620} w={520} h={560} style={{ background: 'linear-gradient(180deg,#141A28,#0C0F18)', border: '18px solid #231F1A', overflow: 'hidden' }}>
        {Array.from({ length: 14 }, (_, i) => <i key={i} style={{ position: 'absolute', left: 30 + (i * 67) % 440, top: 180 + ((i * 131) % 300), width: 16, height: 22, background: C.lamp, opacity: 0.25 + 0.2 * noise(f / 20 + i) }} />)}
        <div style={{ position: 'absolute', left: 260, top: 280 }}><Rain w={600} h={600} opacity={0.5} /></div>
      </At>
      <Lamp x={p.rtl ? 520 : -520} y={-470} on={0.2 + 0.8 * lamp} flip={p.rtl} />
      <Box x={p.rtl ? 520 : -520} y={260} w={440} rot={-4} label={w.box} />
      <Laptop x={40} y={-60} w={880} lid={lid} glow={lid}>
        <Composer masthead={f >= 50 ? w.masthead : ''} headline="" at={0} rtl={p.rtl}>
          <div style={{ padding: '30px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <span style={{ fontFamily: F.mono, fontSize: 26, color: C.ink3, direction: 'ltr' }}>{w.url}</span>
            <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 78, lineHeight: 1 }}><Typeset text={w.masthead} at={60} cpf={0.7} /><Cursor h={70} phase={0} /></span>
            <span style={{ fontFamily: F.text, fontSize: 30, color: C.ink3 }}>{w.hint}</span>
          </div>
        </Composer>
      </Laptop>
      <Night x={40} y={-60} r={1000} level={1 - 0.35 * lamp} />
      <Glow x={40} y={-60} r={760} color="rgba(247,185,40,.22)" on={lid} />
    </Shot>;
  }
  if (p.kind === 'post') {
    // The Evening Post: a small desk by a rainy window; a nameplate is taped on (the hero slap).
    const slap = spring({ frame: f - 56, fps, config: { damping: 11, stiffness: 240, mass: 0.8 } });
    return <Shot rtl={p.rtl} from={{ x: 0, y: -80, z: P ? 0.86 : 0.84 }} to={{ x: 0, y: 40, z: P ? 1.02 : 0.98 }} hits={[56]} over={plate} bg="#0B0C10">
      <div style={{ position: 'absolute', left: -3000, top: -3000, width: 6000, height: 3000, background: 'linear-gradient(180deg,#10131B,#1A1C22)' }} />
      <At x={0} y={-520} w={1500} h={640} style={{ background: 'linear-gradient(180deg,#1B2438,#0F1420)', border: '20px solid #262320', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 750, top: 320 }}><Rain w={1600} h={900} opacity={0.55} /></div>
        {Array.from({ length: 22 }, (_, i) => <i key={i} style={{ position: 'absolute', left: (i * 97) % 1460, top: 300 + ((i * 53) % 260), width: 20, height: 26, background: C.lamp, opacity: 0.18 + 0.15 * noise(f / 25 + i) }} />)}
      </At>
      <DeskSurface y={-190} />
      <Cup x={p.rtl ? -420 : 420} y={60} r={80} band={C.gold} />
      <Steam x={p.rtl ? -420 : 420} y={-10} />
      <At x={p.rtl ? -420 : 420} y={210} w={260} h={40} style={{ fontFamily: F.mono, fontSize: 28, color: C.paper3, textAlign: 'center', letterSpacing: '.2em', opacity: k01(f, 20, 30) }}>{w.mug}</At>
      {/* the nameplate: a wedge of wood, the paper name, two strips of tape slapped over it */}
      <At x={-80} y={80 - (1 - Math.min(1, slap)) * 400} w={760} h={200} rot={-2} scale={f < 56 ? 1.3 : interpolate(slap, [0, 1], [1.3, 1])} style={{ opacity: f < 50 ? 0 : 1 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#5A4128,#3A2A18)', borderRadius: 8, boxShadow: '0 30px 50px rgba(0,0,0,.6)' }} />
        <div style={{ position: 'absolute', inset: '18px 40px', background: C.paper, display: 'grid', placeItems: 'center', fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: 92, letterSpacing: '.06em', color: C.ink }}>{w.plate}</div>
        {[-1, 1].map((s) => <i key={s} style={{ position: 'absolute', top: -14, [s < 0 ? 'left' : 'right']: 10, width: 120, height: 60, background: 'rgba(240,230,200,.72)', transform: `rotate(${s * 18}deg)` } as any} />)}
      </At>
      <At x={-80} y={210} w={420} h={50} style={{ fontFamily: F.mono, fontSize: 30, letterSpacing: '.2em', color: C.gold, textAlign: 'center', opacity: k01(f, 64, 72) }}>{w.tape}</At>
      <Lamp x={p.rtl ? 600 : -600} y={-360} on={0.95} flip={p.rtl} />
      <Night x={-80} y={40} r={1100} level={0.85} />
    </Shot>;
  }
  if (p.kind === 'nationals') {
    // The nationals' glass office: a wall of six screens comes up in a wave behind the etched glass.
    const screens: string[] = w.screens || [];
    return <Shot rtl={p.rtl} from={{ x: 0, y: 0, z: P ? 0.62 : 0.7 }} to={{ x: 0, y: 30, z: P ? 0.74 : 0.8 }} hits={[60]} amp={8} over={plate} bg="#0A0D12">
      <div style={{ position: 'absolute', left: -3000, top: -3000, width: 6000, height: 6000, background: 'linear-gradient(180deg,#0E131B,#151A22 60%,#1C1F24)' }} />
      {screens.slice(0, 6).map((s, i) => {
        const col = i % 3, row = Math.floor(i / 3), at = 36 + i * 4, on = k01(f, at, at + 6);
        return <At key={i} x={(col - 1) * 560 * (p.rtl ? -1 : 1)} y={(row - 0.5) * 360 - 120} w={500} h={300}>
          <TV w={500} h={300} on={on}>
            <div style={{ flex: 1, background: i === 3 ? C.red : '#11306B', display: 'grid', placeItems: 'center', color: C.paper, fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: 84, letterSpacing: '.06em' }}>{s}</div>
          </TV>
        </At>;
      })}
      {/* the glass wall and its etched word */}
      <div style={{ position: 'absolute', left: -1400, top: -900, width: 2800, height: 1500, background: 'linear-gradient(115deg, rgba(255,255,255,.07), rgba(255,255,255,.02) 40%, rgba(255,255,255,.08) 70%, rgba(255,255,255,.02))', borderTop: '10px solid #3A3F48' }} />
      <At x={0} y={420} w={1400} h={160} style={{ display: 'grid', placeItems: 'center', fontFamily: F.cond, fontStretch: '70%', fontWeight: 900, fontSize: 150, letterSpacing: '.3em', color: 'rgba(255,255,255,.16)' }}>{w.glass}</At>
      <Glow x={0} y={-120} r={1300} color="rgba(247,185,40,.14)" on={k01(f, 56, 70)} />
    </Shot>;
  }
  if (p.kind === 'war') {
    // A wall of rival headlines, slammed up one after another; the last one lands centre (the hero).
    const heads: string[] = w.heads || [];
    return <Shot rtl={p.rtl} from={{ x: 0, y: 0, z: P ? 0.78 : 0.8 }} to={{ x: 0, y: 0, z: P ? 0.94 : 0.9 }} hits={[88]} amp={20} over={plate} bg="#120A08">
      <div style={{ position: 'absolute', left: -3000, top: -3000, width: 6000, height: 6000, background: 'repeating-linear-gradient(90deg,#1E1612 0 120px,#1A130F 120px 240px)' }} />
      {heads.slice(0, 7).map((h, i) => {
        const at = 10 + i * 10; if (f < at) return null;
        const s = spring({ frame: f - at, fps, config: { damping: 12, stiffness: 260 } });
        const x = [-420, 400, -380, 430, -60, -470, 460][i] * (p.rtl ? -1 : 1), y = [-560, -500, -40, -60, -720, 440, 430][i];
        return <At key={i} x={x} y={y} w={560} h={300} rot={((i * 37) % 11) - 5} scale={interpolate(s, [0, 1], [1.5, 1])} style={{ opacity: Math.min(1, s * 2) }}>
          <Paper tone={i % 2 ? C.paper2 : C.paper}><div style={{ padding: '26px 30px', fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: 64, lineHeight: 0.98, textTransform: 'uppercase', color: i % 3 === 0 ? C.redDeep : C.ink }}>{h}</div></Paper>
          <i style={{ position: 'absolute', left: '50%', top: -10, width: 24, height: 24, marginLeft: -12, borderRadius: '50%', background: C.red, boxShadow: '0 4px 8px rgba(0,0,0,.5)' }} />
        </At>;
      })}
      {f >= 88 && <At x={0} y={-230} w={900} h={300}><div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}><Stamp text={heads[7] || ''} color={C.red} at={88} size={120} rot={-6} style={{ background: C.ink }} /></div></At>}
      <Glow x={0} y={-200} r={900} color="rgba(255,90,54,.25)" on={k01(f, 88, 96)} />
    </Shot>;
  }
  // chronicle: the lift doors part onto the old newsroom; the old desk's lamp clicks on.
  const open = k01(f, 30, 66, EASE.inOut), lamp = f >= 76 ? 1 : 0;
  return <Shot rtl={p.rtl} from={{ x: 0, y: 0, z: P ? 0.66 : 0.64 }} to={{ x: 0, y: 40, z: P ? 0.9 : 0.86 }} over={plate} bg="#08070A">
    <div style={{ position: 'absolute', left: -560, top: -760, width: 1120, height: 1520, overflow: 'hidden', background: '#0B0A08' }}>
      <div style={{ position: 'absolute', left: 560, top: 760 }}>
        <div style={{ position: 'absolute', left: -700, top: -760, width: 1400, height: 600, background: 'linear-gradient(180deg,#141210,#1E1A15)' }} />
        <At x={0} y={-480} w={900} h={120} style={{ display: 'grid', placeItems: 'center', fontFamily: F.display, fontWeight: 800, fontSize: 90, color: C.gold, opacity: 0.2 + 0.8 * lamp, textShadow: lamp ? `0 0 30px ${C.gold}` : 'none' }}>{w.plate}</At>
        <DeskSurface x={-700} y={-160} w={1400} h={1000} />
        <At x={0} y={-10} w={620} h={60} style={{ background: '#2C271F', borderRadius: 8, boxShadow: '0 20px 30px rgba(0,0,0,.6)' }} />
        <At x={0} y={120} w={360} h={200} style={{ background: 'linear-gradient(180deg,#3A342A,#231F19)', borderRadius: '30px 30px 8px 8px' }} />
        <Lamp x={-250} y={-260} on={lamp} />
        <Night x={0} y={-40} r={600} level={1 - 0.3 * lamp} />
        <Glow x={0} y={-40} r={600} color="rgba(255,200,115,.35)" on={lamp} />
      </div>
    </div>
    <div style={{ position: 'absolute', left: 0, top: 0 }}><LiftDoors w={1120} h={1520} open={open} /></div>
    <At x={0} y={-860} w={300} h={90} style={{ background: '#111', border: '6px solid #2B2C31', display: 'grid', placeItems: 'center' }}><Led text="5" size={60} /></At>
    <At x={0} y={860} w={1200} h={80} style={{ display: 'grid', placeItems: 'center', fontFamily: F.mono, fontSize: 36, letterSpacing: '.3em', color: C.ink3 }}>{w.floor}</At>
  </Shot>;
}

// ---------------------------------------------------------------- case-file reveals (one object each)
export const REVEAL_META: Record<string, SceneMeta> = {
  rosa: meta(150, [0, 40], cues([0, 'whoosh'], [16, 'thock'], [40, 'pen'], [86, 'stamp'], [88, 'reveal'])),
  kev: meta(150, [0, 76], cues([0, 'flip'], [20, 'notify'], [36, 'notify'], [52, 'notify'], [76, 'stamp'], [78, 'twist'])),
  tony: meta(156, [0, 30, 90], cues([0, 'flash'], [30, 'reveal'], [90, 'stamp'], [92, 'twist'])),
  priya: meta(150, [0, 24, 84], cues([0, 'whoosh'], [22, 'thock'], [34, 'typewriter'], [48, 'typewriter'], [62, 'typewriter'], [84, 'stamp'], [86, 'twist'])),
};
export function Reveal(p: StoryProps) {
  const { f, fps, P } = useStage();
  const w = p.w, m = p.rtl ? -1 : 1;
  const plate = <Plate at={108} kicker={p.kicker} title={p.title} accent={C.red} rtl={p.rtl} />;
  if (p.kind === 'rosa') {
    // A café table: a napkin slides in beside a coffee; the warning inks itself on; the coffee ring is the signature.
    const slide = k01(f, 0, 16, EASE.out);
    return <Shot rtl={p.rtl} from={{ x: 0, y: 0, z: P ? 1.0 : 0.94 }} to={{ x: 0, y: -40, z: P ? 1.12 : 1.04 }} hits={[16]} amp={6} over={plate} bg="#120E0A">
      <div style={{ position: 'absolute', left: -3000, top: -3000, width: 6000, height: 6000, background: 'radial-gradient(circle at 50% 50%, #3C2A1C, #1A120C 60%)' }} />
      <Cup x={m * 360} y={-360} r={110} band={C.red} />
      <Steam x={m * 360} y={-440} />
      <At x={(1 - slide) * m * -1100} y={40} w={760} h={600} rot={-4 + slide * 2}>
        <Paper tone="#F7F3EA"><div style={{ position: 'absolute', inset: 30, border: '3px dashed rgba(0,0,0,.08)' }} /></Paper>
        <div style={{ position: 'absolute', inset: '70px 60px', fontFamily: '"Caveat","Segoe Script","Comic Sans MS",cursive', fontSize: 70, lineHeight: 1.15, color: '#1B2F6B' }}>
          <Typeset text={w.napkin} at={40} cpf={1.2} />
          <div style={{ marginTop: 20, textAlign: 'end', opacity: k01(f, 78, 86) }}>{w.sign}</div>
        </div>
        <i style={{ position: 'absolute', right: 40, bottom: 30, width: 200, height: 200, borderRadius: '50%', border: '14px solid rgba(120,70,30,.35)', opacity: k01(f, 20, 30) }} />
        <div style={{ position: 'absolute', insetInlineStart: 30, bottom: 40 }}><Stamp text={p.title} color={C.red} at={86} size={60} rot={-8} /></div>
      </At>
    </Shot>;
  }
  if (p.kind === 'kev') {
    // A timeline, three timestamps on a line; the first one (Kev's) lights red: one minute early.
    const rows: string[] = w.rows || [];
    return <Shot rtl={p.rtl} from={{ x: 0, y: 0, z: P ? 0.95 : 0.9 }} to={{ x: 0, y: 0, z: P ? 1.04 : 0.98 }} hits={[76]} over={plate} bg="#0C0B0E">
      <At x={0} y={-60} w={940} h={880}>
        <Paper tone={C.paper}>
          <div style={{ padding: '44px 56px', display: 'flex', flexDirection: 'column', gap: 30 }}>
            <span style={{ fontFamily: F.mono, fontSize: 42, color: C.ink2, direction: 'ltr', unicodeBidi: 'isolate' }}>{w.title}</span>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 46, paddingInlineStart: 60 }}>
              <i style={{ position: 'absolute', insetInlineStart: 18, top: 10, bottom: 10, width: 6, background: C.ink, transformOrigin: 'top', transform: `scaleY(${k01(f, 6, 56)})` }} />
              {rows.slice(0, 3).map((r, i) => {
                const at = 20 + i * 16, s = spring({ frame: f - at, fps, config: { damping: 14, stiffness: 200 } });
                const hot = i === 0 && f >= 76;
                return <div key={i} style={{ position: 'relative', fontFamily: F.text, fontWeight: 800, fontSize: 52, lineHeight: 1.1, color: hot ? C.redDeep : C.ink, opacity: f < at ? 0 : Math.min(1, s * 2), transform: `translateX(${(1 - s) * 60 * m}px)` }}>
                  <i style={{ position: 'absolute', insetInlineStart: -54, top: 14, width: 30, height: 30, borderRadius: '50%', background: hot ? C.red : C.ink }} />{r}
                </div>;
              })}
            </div>
          </div>
          <div style={{ position: 'absolute', insetInlineEnd: 40, bottom: 60 }}><Stamp text={w.early} color={C.red} at={76} size={78} rot={-8} /></div>
        </Paper>
      </At>
    </Shot>;
  }
  if (p.kind === 'tony') {
    // A long-lens photo develops in its tray (dark to image); the caption prints; pinned: EVIDENCE.
    const dev = k01(f, 30, 84, EASE.inOut);
    return <Shot rtl={p.rtl} from={{ x: 0, y: 0, z: P ? 0.9 : 0.86 }} to={{ x: 0, y: -20, z: P ? 1.02 : 0.96 }} hits={[90]} over={plate} bg="#170605">
      <div style={{ position: 'absolute', left: -3000, top: -3000, width: 6000, height: 6000, background: 'radial-gradient(circle at 50% 40%, #4A0E08, #120404 60%)' }} />
      <At x={0} y={-80} w={920} h={760} rot={-1.5}>
        <div style={{ position: 'absolute', inset: 0, background: C.paper, boxShadow: '0 30px 60px rgba(0,0,0,.7)' }} />
        <div style={{ position: 'absolute', inset: '30px 30px 150px', overflow: 'hidden', background: '#111' }}>
          {/* the frame: the arrivals hall at dawn, long lens: the board, a gate sign, two cars, heavy grain */}
          <div style={{ position: 'absolute', inset: 0, opacity: dev, filter: `blur(${(1 - dev) * 6}px)`, background: 'linear-gradient(180deg,#8A8F98 0 38%,#5E636C 38% 70%,#3A3D44 70%)' }}>
            <div style={{ position: 'absolute', left: 60, top: 60, padding: '10px 20px', background: '#1B1B1B', color: '#F7D34A', fontFamily: F.cond, fontWeight: 900, fontSize: 54, letterSpacing: '.1em' }}>{w.label}</div>
            {[180, 520].map((x, i) => <i key={i} style={{ position: 'absolute', left: x, top: 380, width: 280, height: 110, borderRadius: '40px 60px 14px 14px', background: i ? '#1C1C22' : '#2A2A30' }} />)}
            <i style={{ position: 'absolute', left: 390, top: 250, width: 90, height: 90, borderRadius: '50%', border: `8px solid ${C.red}`, opacity: k01(f, 84, 90) }} />
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-radial-gradient(circle at 30% 40%, rgba(0,0,0,.15) 0 2px, transparent 2px 4px)' }} />
        </div>
        <div style={{ position: 'absolute', left: 40, right: 40, bottom: 40, fontFamily: F.mono, fontSize: 32, color: C.ink, direction: 'ltr', opacity: k01(f, 70, 80) }}>{w.caption}</div>
        <i style={{ position: 'absolute', left: '50%', top: -14, width: 34, height: 34, marginLeft: -17, borderRadius: '50%', background: C.red }} />
        <div style={{ position: 'absolute', insetInlineEnd: -20, top: -40 }}><Stamp text={w.pin} color={C.red} at={90} size={84} rot={8} style={{ background: C.paper }} /></div>
      </At>
    </Shot>;
  }
  // priya: a USB stick slides across the table; its call log prints line by line; one line goes red.
  const rows: string[] = w.rows || [];
  const slide = k01(f, 0, 22, EASE.out);
  return <Shot rtl={p.rtl} from={{ x: 0, y: 0, z: P ? 0.92 : 0.86 }} to={{ x: 0, y: 0, z: P ? 1.02 : 0.94 }} hits={[22, 84]} amp={8} over={plate} bg="#0D0A08">
    <div style={{ position: 'absolute', left: -3000, top: -3000, width: 6000, height: 6000, background: 'radial-gradient(circle at 50% 50%, #3A2A1C, #140E0A 60%)' }} />
    <At x={m * (-900 + slide * 520)} y={-420} w={300} h={110} rot={-8}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#2F2F36,#18181C)', borderRadius: 16 }} />
      <i style={{ position: 'absolute', insetInlineEnd: -70, top: 26, width: 80, height: 58, background: 'linear-gradient(180deg,#C9CDD6,#8A8E98)' }} />
      <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: F.mono, fontSize: 30, color: C.red, letterSpacing: '.1em' }}>{w.usb}</span>
    </At>
    <At x={60 * m} y={120} w={880} h={560} rot={1.5}>
      <Paper>
        <div style={{ padding: '44px 50px', display: 'flex', flexDirection: 'column', gap: 26, fontFamily: F.mono, fontSize: 40, direction: 'ltr' }}>
          {rows.slice(0, 3).map((r, i) => <div key={i} style={{ color: i === 1 && f >= 84 ? C.redDeep : C.ink, background: i === 1 && f >= 84 ? 'rgba(255,90,54,.16)' : 'transparent', padding: '4px 8px' }}><Typeset text={r} at={34 + i * 14} cpf={1.6} /></div>)}
          <div style={{ marginTop: 10, fontSize: 30, color: C.ink3, opacity: k01(f, 76, 84) }}>{w.sign}</div>
        </div>
        <div style={{ position: 'absolute', insetInlineEnd: 30, bottom: 30 }}><Stamp text={p.title} color={C.red} at={84} size={56} rot={-7} /></div>
      </Paper>
    </At>
  </Shot>;
}

// ---------------------------------------------------------------- the press pass, printed per rank (promotions and moment-tier-*)
export const PASS_META: SceneMeta = meta(144, [0, 54, 84], cues([0, 'presses'], [8, 'whoosh'], [54, 'typewriter'], [84, 'stamp'], [86, 'levelup']));
export const PASS_META_BIG: SceneMeta = meta(168, [0, 54, 84, 112], cues([0, 'presses'], [8, 'whoosh'], [54, 'typewriter'], [84, 'stamp'], [86, 'levelup'], [112, 'fanfare'], [114, 'flash']));
export type PassProps = { byline: string; tier: string; kicker: string; press: string; stamp: string; accent?: string; big?: boolean; rtl?: boolean };
export function PassPrint(p: PassProps) {
  const { f, fps, P } = useStage();
  const acc = p.accent || C.gold;
  // The pass rises out of the printer's slot (masked), then lifts, swings on its lanyard and the rank is stamped.
  const out = k01(f, 8, 46, EASE.out), lift = spring({ frame: f - 46, fps, config: { damping: 12, stiffness: 120 } });
  const swing = f > 46 ? Math.sin((f - 46) / 7) * 6 * Math.exp(-(f - 46) / 30) : 0;
  const gold = p.big ? k01(f, 112, 124) : 0;
  return <Shot rtl={p.rtl} from={{ x: 0, y: 120, z: P ? 0.9 : 0.66 }} to={{ x: 0, y: -60, z: P ? 1.0 : 0.72 }} hits={[84, ...(p.big ? [112] : [])]} bg="#0B0A08">
    <DeskSurface y={320} />
    <Glow x={0} y={-100} r={1100} color={p.big ? 'rgba(247,185,40,.4)' : 'rgba(255,200,115,.22)'} on={0.4 + 0.6 * k01(f, 46, 70) + gold} />
    {/* the printer: a dark block with a lit slot */}
    <At x={0} y={420} w={900} h={260} style={{ background: 'linear-gradient(180deg,#2A2B31,#15161A)', borderRadius: 26, boxShadow: '0 30px 60px rgba(0,0,0,.6)' }}>
      <i style={{ position: 'absolute', left: 120, right: 120, top: 26, height: 18, borderRadius: 9, background: '#050505', boxShadow: `0 0 30px ${acc}` }} />
      <i style={{ position: 'absolute', right: 50, bottom: 40, width: 24, height: 24, borderRadius: '50%', background: f % 12 < 6 && f < 46 ? C.done : '#1F4A33' }} />
    </At>
    <div style={{ position: 'absolute', left: -500, top: -1400, width: 1000, height: 1834, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 500 - 310, top: 1834 - out * 880 - lift * 360, transform: `rotate(${swing}deg)`, transformOrigin: '50% 0' }}>
        {f > 40 && <Lanyard color={acc === C.gold ? C.red : acc} h={900} />}
        <PressPass w={620} byline={p.byline} tier={p.tier} kicker={p.kicker} press={p.press} stamp={p.stamp} stampAt={84} accent={acc} big={p.big} nameAt={54} rtl={p.rtl} />
      </div>
    </div>
    {p.big && f >= 112 && Array.from({ length: 26 }, (_, i) => {
      const t = f - 112, x = ((i * 7919) % 1600) - 800, y = -900 + t * (8 + (i % 5) * 2) - ((i * 131) % 400);
      return <i key={i} style={{ position: 'absolute', left: x + Math.sin(t / 6 + i) * 40, top: y, width: 18, height: 30, background: i % 3 ? C.gold : C.paper, transform: `rotate(${t * 12 + i * 40}deg)` }} />;
    })}
  </Shot>;
}

// ---------------------------------------------------------------- the finale: the clock again; the sources' objects say no; the front page rolls
export const FINALE_META: SceneMeta = meta(186, [0, 30, 96, 130], cues([0, 'clock'], [8, 'clock'], [16, 'clock'], [30, 'stamp'], [48, 'stamp'], [66, 'stamp'], [96, 'presses'], [130, 'boom'], [132, 'fanfare'], [150, 'stamp']));
export function Finale(p: StoryProps) {
  const { f, fps, P } = useStage();
  const w = p.w, objs: string[] = w.objects || [];
  const phase = f < 96 ? 0 : f < 130 ? 1 : 2;
  if (phase === 0) {
    // 23:58 over the three objects: an appointment card (next month), a runway board (empty), a medical file (shut).
    return <Shot rtl={p.rtl} from={{ x: 0, y: -60, z: P ? 0.8 : 0.72 }} to={{ x: 0, y: 0, z: P ? 0.88 : 0.78 }} hits={[30, 48, 66]} amp={10} bg="#0B0A08" span={[0, 96]}>
      <DeskSurface y={-100} />
      <At x={0} y={-640} w={900} h={220} style={{ background: '#0C0B09', border: '10px solid #2A2620', borderRadius: 12, display: 'grid', placeItems: 'center' }}><Led text={f < 60 ? '23:58' : '23:59'} size={150} /></At>
      {objs.slice(0, 3).map((o, i) => {
        const at = 30 + i * 18, x = (P ? 0 : (i - 1) * 580) * (p.rtl ? -1 : 1), y = P ? -220 + i * 420 : 80;
        return <At key={i} x={x} y={y} w={500} h={340} rot={[-4, 2, -2][i]}>
          <Paper tone={[C.paper, '#DDE3EA', '#E9D9B5'][i]}>
            <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span style={{ fontFamily: F.mono, fontSize: 26, color: C.ink3, letterSpacing: '.12em' }}>{['✂', '✈', '✚'][i]}</span>
              <span style={{ fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: 60, lineHeight: 1, textTransform: 'uppercase' }}>{o}</span>
            </div>
          </Paper>
          <div style={{ position: 'absolute', insetInlineEnd: 20, bottom: 20 }}><Stamp text={w.no} color={C.red} at={at} size={110} rot={-12} /></div>
        </At>;
      })}
      <Lamp x={p.rtl ? 700 : -700} y={-300} on={0.9} flip={p.rtl} />
      <Night x={0} y={0} r={1300} level={0.8} />
    </Shot>;
  }
  if (phase === 1) {
    const turn = (f - 96) * 18;
    return <Shot rtl={p.rtl} from={{ x: 0, y: 0, z: P ? 0.6 : 0.55 }} to={{ x: 0, y: 0, z: P ? 0.66 : 0.6 }} bg="#0A0908" span={[96, 130]}>
      <Presses turn={turn} accent={C.red} />
      <Glow x={0} y={0} r={1200} color="rgba(255,90,54,.2)" on={1} />
    </Shot>;
  }
  const s = spring({ frame: f - 130, fps, config: { damping: 13, stiffness: 160 } });
  const fw = P ? 900 : 1000, fh = P ? 1300 : 900;
  return <Shot rtl={p.rtl} from={{ x: 0, y: 0, z: P ? 0.9 : 0.94 }} to={{ x: 0, y: 0, z: P ? 0.96 : 1.0 }} hits={[130]} amp={18} bg="#0B0A08" span={[130, 186]}>
    <DeskSurface y={-2000} />
    <At x={0} y={0} w={fw} h={fh} rot={(1 - s) * -8} scale={interpolate(s, [0, 1], [1.4, 1])}>
      <FrontPage w={fw} h={fh} masthead={w.masthead} edition={w.edition} dateline={w.date} kicker={w.kicker} headline={w.headline} byline={p.byline} hedAt={134} byAt={146} stamp={w.stamp} stampAt={150} accent={C.red} rtl={p.rtl} />
    </At>
  </Shot>;
}

// ---------------------------------------------------------------- the epilogue: the framed front page; a phone lights
export const EPI_META: SceneMeta = meta(174, [0, 90], cues([0, 'lampon'], [30, 'thock'], [84, 'lampoff'], [96, 'notify'], [100, 'buzz']));
export function Epilogue(p: StoryProps) {
  const { f, P } = useStage();
  const w = p.w;
  const dim = k01(f, 84, 92), msg = f >= 96;
  return <Shot rtl={p.rtl} from={{ x: 0, y: -260, z: P ? 0.8 : 0.66 }} to={{ x: P ? 160 : 520, y: P ? 520 : 360, z: P ? 1.25 : 1.1 }} bg="#0B0A08" span={[40, 110]}>
    <div style={{ position: 'absolute', left: -3000, top: -3000, width: 6000, height: 3200, background: 'linear-gradient(180deg,#1C1813,#241F18)' }} />
    <DeskSurface y={200} />
    {/* the frame on the wall: gold moulding, the front page behind glass */}
    <At x={0} y={-340} w={720} h={940} rot={f < 30 ? interpolate(f, [0, 30], [-3, 0], clamp) : 0}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg,#FFE08A,${C.gold} 40%,${C.goldDeep})`, boxShadow: '0 40px 80px rgba(0,0,0,.7)' }} />
      <div style={{ position: 'absolute', inset: 40, overflow: 'hidden' }}>
        <FrontPage w={640} h={860} masthead={w.masthead} edition={w.edition} dateline={w.date} kicker={w.kicker} headline={w.headline} byline={p.byline} hedAt={-1} byAt={-10} accent={C.red} rtl={p.rtl} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(255,255,255,.18), transparent 40%)' }} />
      </div>
      <At x={360} y={1000} w={420} h={60} style={{ background: '#2C271F', color: C.gold, display: 'grid', placeItems: 'center', fontFamily: F.mono, fontSize: 28, letterSpacing: '.2em' }}>{w.frame}</At>
    </At>
    <Glow x={0} y={-340} r={900} color="rgba(247,185,40,.3)" on={1 - dim} />
    <Night x={P ? 160 : 520} y={P ? 520 : 360} r={900} level={0.4 + 0.6 * dim} />
    <Phone x={P ? 160 : 520} y={P ? 520 : 360} w={300} h={620} rot={-6} on={msg ? 1 : 0} buzz={f >= 96 && f < 120 ? 1 : 0} accent={C.red}>
      <MessageScreen from={w.unknown} text={w.text} at={100} w={300} />
      <span style={{ position: 'absolute', left: 0, right: 0, top: 40, textAlign: 'center', fontFamily: F.text, fontWeight: 800, fontSize: 24, color: '#E6E3DA', direction: 'ltr' }}>{w.to}</span>
    </Phone>
    <Glow x={P ? 160 : 520} y={P ? 520 : 360} r={600} color="rgba(255,90,54,.3)" on={msg ? 1 : 0} />
  </Shot>;
}
