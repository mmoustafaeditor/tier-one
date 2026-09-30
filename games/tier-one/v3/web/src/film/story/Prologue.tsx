// "The fall" (story-prologue): the game's opening, ~11 s. The Chronicle newsroom, Deadline Day, 23:58 on the wall.
// A phone lights up: Vince Marlow. The headline types itself on the laptop and the house stamp slams. 00:03: the
// wall board flips to the other club. The replies pile in; the follower counter bleeds −38,200. An empty box slides
// onto the desk under the lamp. The lamp clicks off. In the dark a phone glows: UNKNOWN NUMBER, "Nothing personal."
// Then the blog's first cursor blinks: Chapter 1 (the match cut into the Chapter 1 hub). No people, ever.
import { AbsoluteFill, interpolate } from '../remotion-shim';
import { C, F, DeskSurface, FilmLook, Layer, Motes, Paper, Stamp, camAt, clamp, k01, noise, shake, useStage, EASE, type Key } from '../kit';
import { Lamp, Night, Black, Led, Flap, Phone, CallScreen, MessageScreen, Laptop, Composer, Box, Reply, Roll, Cursor, Glow } from '../world';
import type { SceneMeta } from '../cues';

export type PrologueProps = {
  byline: string; clock: string; caller: string; calling: string; masthead: string; draft: string;
  board: string[]; headline: string; stamp: string; replies: string[]; followers: string;
  box: string; unknown: string; text: string; blog: string; chapter: string; chapterName: string; rtl?: boolean;
};

const T = { clock: 0, desk: 26, ring: 40, type: 74, stamp: 118, flip: 142, board: 150, replies: 170, count: 178, box: 212, boxHit: 228, off: 244, text: 258, blog: 296, end: 330 };
export const PROLOGUE: SceneMeta = {
  dur: T.end, hold: 700, beats: [0, T.ring, T.type, T.flip, T.replies, T.box, T.off, T.blog],
  cues: [
    { f: 0, k: 'clock' }, { f: 8, k: 'clock' }, { f: 16, k: 'clock' }, { f: 24, k: 'clock' },
    { f: T.ring, k: 'ringonce' }, { f: T.ring + 1, k: 'buzz' }, { f: T.ring + 16, k: 'buzz' },
    { f: T.type, k: 'typewriter' }, { f: T.type + 22, k: 'typewriter' }, { f: T.stamp, k: 'stamp' }, { f: T.stamp + 2, k: 'boom' },
    { f: T.flip, k: 'clock' }, { f: T.board, k: 'flap' }, { f: T.board + 8, k: 'twist' },
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ f: T.replies + i * 5, k: 'pop' })), { f: T.count, k: 'count' }, { f: T.count + 20, k: 'sad' },
    { f: T.box, k: 'whoosh' }, { f: T.boxHit, k: 'thock' }, { f: T.off, k: 'lampoff' },
    { f: T.text, k: 'notify' }, { f: T.blog, k: 'flip' }, { f: T.blog + 6, k: 'key' }, { f: T.blog + 18, k: 'key' },
  ],
};

// World layout (units at z = 1). The wall board hangs above the desk; the lamp pool lights the laptop and the phone.
const BOARD = { x: 0, y: -1180 }, LAP = { x: 40, y: -120 }, PH = { x: 560, y: 260 }, BOX = { x: -340, y: 330 };

function keys(P: boolean): Key[] {
  return [
    { f: 0, x: BOARD.x, y: BOARD.y + 40, z: P ? 1.35 : 1.5 },
    { f: T.desk - 4, x: BOARD.x, y: BOARD.y + 60, z: P ? 1.3 : 1.45 },
    { f: T.ring - 2, x: 380, y: 170, z: P ? 1.35 : 1.5 },
    { f: T.ring + 26, x: 400, y: 190, z: P ? 1.4 : 1.55 },
    { f: T.type - 6, x: LAP.x, y: LAP.y - 40, z: P ? 1.1 : 1.35 },
    { f: T.stamp + 18, x: LAP.x, y: LAP.y - 30, z: P ? 1.16 : 1.4 },
    { f: T.flip - 1, x: LAP.x, y: LAP.y - 30, z: P ? 1.16 : 1.4 },
    { f: T.flip, x: BOARD.x, y: BOARD.y + 60, z: P ? 1.3 : 1.45 }, // a hard cut up to the wall
    { f: T.replies - 1, x: BOARD.x, y: BOARD.y + 70, z: P ? 1.32 : 1.48 },
    { f: T.replies, x: 240, y: 60, z: P ? 0.98 : 1.1 }, // a hard cut back to the desk
    { f: T.box, x: 200, y: 80, z: P ? 1.0 : 1.12 },
    { f: T.boxHit + 10, x: -120, y: 120, z: P ? 1.02 : 1.14 },
    { f: T.off, x: -120, y: 120, z: P ? 1.02 : 1.14 },
    { f: T.text, x: PH.x, y: PH.y, z: P ? 1.5 : 1.7 },
    { f: T.blog, x: PH.x, y: PH.y, z: P ? 1.56 : 1.76 },
  ];
}

export function Prologue(p: PrologueProps) {
  const { f, P } = useStage();
  const cam0 = camAt(f, keys(P)), sh = shake(f, [T.stamp, T.boxHit], 14);
  const cam = { ...cam0, x: cam0.x + sh.x + noise(f / 40, 3) * 4, y: cam0.y + sh.y + noise(f / 50, 5) * 4 };
  const lampOn = f < T.off ? 0.94 + 0.06 * noise(f / 3, 7) : f < T.off + 2 ? 0.4 : 0;
  const dark = k01(f, T.off, T.off + 3);
  const time = f < 100 ? '23:58' : f < T.flip ? '23:59' : '00:03';
  const flipFlash = f >= T.flip && f < T.flip + 6 ? 1 - (f - T.flip) / 6 : 0;
  const phoneOn = f >= T.ring && f < T.ring + 60 ? 1 : f >= T.text ? 1 : 0;
  const buzz = f >= T.ring && f < T.ring + 30 ? 1 : 0;
  const boxX = interpolate(f, [T.box, T.boxHit], [1400, BOX.x], { ...clamp, easing: EASE.out });
  const blog = k01(f, T.blog, T.blog + 8, EASE.inOut);
  const lost = f >= T.count;
  const W = P ? 1080 : 1920, H = P ? 1920 : 1080;
  return <AbsoluteFill style={{ background: C.night, overflow: 'hidden', direction: p.rtl ? 'rtl' : 'ltr' }}>
    {/* The newsroom beyond the desk: far windows and other lamps, out of focus. */}
    <Layer cam={cam} depth={0.45} style={{ filter: 'blur(3px)', opacity: 1 - dark }}>
      <div style={{ position: 'absolute', left: -2600, top: -3200, width: 6200, height: 2600, background: 'linear-gradient(180deg,#0E0D0B,#15120E)' }} />
      {Array.from({ length: 24 }, (_, i) => <i key={i} style={{ position: 'absolute', left: -2000 + (i % 12) * 330, top: -2500 + Math.floor(i / 12) * 260, width: 200, height: 150, background: (i * 37) % 5 ? `rgba(255,${190 + ((i * 13) % 40)},120,${0.05 + ((i * 7) % 10) / 90})` : 'rgba(80,110,160,.05)' }} />)}
    </Layer>
    <Layer cam={cam}>
      <DeskSurface y={-700} />
      {/* the wall above the desk: the LED clock and the split-flap board */}
      <div style={{ position: 'absolute', left: -3000, top: -3000, width: 6000, height: 2300, background: 'linear-gradient(180deg, #100F0C, #1A1712 70%, #211D17)' }} />
      <div style={{ position: 'absolute', left: BOARD.x - 700, top: BOARD.y - 250, width: 1400, height: 440, background: '#0C0B09', border: '10px solid #2A2620', borderRadius: 12, boxShadow: '0 30px 60px rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 40 }}>
          <span style={{ fontFamily: F.cond, fontStretch: '75%', fontWeight: 900, fontSize: 44, letterSpacing: '.18em', color: '#8C8475' }}>{p.clock}</span>
          <Led text={time} size={170} />
        </div>
        <div style={{ transform: 'scale(.92)' }}><Flap text={p.board[f >= T.board ? 1 : 0] || ''} from={p.board[0] || ''} at={T.board} size={44} len={28} color={f >= T.board ? C.red : C.paper} /></div>
        {flipFlash > 0 && <div style={{ position: 'absolute', inset: 0, background: C.red, opacity: flipFlash * 0.35 }} />}
      </div>
      <Lamp on={lampOn} />
      {/* the laptop: the post composer, the headline typing, the house stamp, then the follower counter */}
      <Laptop x={LAP.x} y={LAP.y} w={P ? 900 : 940} glow={1 - dark}>
        <Composer masthead={p.masthead} headline={f >= T.type ? p.headline : ''} at={T.type} cpf={1.1} accent={C.red} rtl={p.rtl}>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 16, padding: '0 36px 26px', fontFamily: F.mono, fontSize: 24, color: C.ink3 }}>
            <span style={{ padding: '6px 14px', border: `2px solid ${C.ink3}`, borderRadius: 6 }}>{p.draft}</span><span>23:58</span>
            {lost && <span style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'baseline', gap: 14, color: C.redDeep }}>
              <span style={{ fontSize: 22, letterSpacing: '.08em', textTransform: 'uppercase' }}>{p.followers}</span>
              <Roll from={0} to={-38200} at={T.count} dur={36} style={{ fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: 92, lineHeight: 1 }} />
            </span>}
          </div>
        </Composer>
        <div style={{ position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%,-50%)' }}><Stamp text={p.stamp} color={C.redDeep} at={T.stamp} size={P ? 120 : 126} rot={-9} style={{ background: 'rgba(244,239,228,.9)' }} /></div>
        {lost && <div style={{ position: 'absolute', inset: 0, background: `rgba(201,56,26,${0.18 * k01(f, T.count, T.count + 20)})`, pointerEvents: 'none' }} />}
      </Laptop>
      {/* the replies, piling onto the desk around the laptop */}
      {p.replies.slice(0, 6).map((r, i) => {
        const at = T.replies + i * 5; if (f < at) return null;
        const x = LAP.x + (i % 2 ? 1 : -1) * (560 + (i % 3) * 40), y = LAP.y - 300 + i * 120;
        return <div key={i} style={{ position: 'absolute', left: x - 200, top: y, transform: `rotate(${(i % 2 ? -1 : 1) * (3 + i)}deg)`, zIndex: 20 + i }}><Reply handle={['@fan_' + (11 + i * 7), '@BackPageBants', '@ITK_Kev', '@tifo_' + (3 + i), '@PressBoxPete', '@ratio_bot'][i]} text={r} at={at} w={400} /></div>;
      })}
      {/* the empty box, sliding in under the lamp */}
      {f >= T.box && <Box x={boxX} y={BOX.y} w={560} rot={interpolate(f, [T.box, T.boxHit], [-6, -2], clamp)} label={p.box} z={30} />}
      <Night level={1} />
      <Black level={dark} />
      {/* the phone: Vince's call, then, in the dark, the unknown number */}
      <Phone x={PH.x} y={PH.y} w={P ? 300 : 320} h={P ? 620 : 660} rot={8} on={phoneOn} buzz={buzz} accent={f >= T.text ? C.red : C.done} z={40}>
        {f < T.text ? <CallScreen name={p.caller} sub={p.calling} at={T.ring} w={P ? 300 : 320} /> : <MessageScreen from={p.unknown} text={p.text} at={T.text + 4} w={P ? 300 : 320} />}
      </Phone>
      <Glow x={PH.x} y={PH.y} r={700} color={f >= T.text ? 'rgba(255,90,54,.28)' : 'rgba(47,191,113,.2)'} on={phoneOn * (f >= T.text ? 1 : 0.6)} />
    </Layer>
    <Layer cam={cam} depth={1.3} style={{ opacity: 1 - dark }}><Motes n={14} /></Layer>
    {/* the match cut: the blog's first page, cursor blinking under "Chapter 1" */}
    {f >= T.blog && <AbsoluteFill style={{ opacity: blog }}>
      <AbsoluteFill style={{ background: C.night }} />
      <div style={{ position: 'absolute', left: W / 2 - (P ? 440 : 560), top: H / 2 - (P ? 300 : 240), width: P ? 880 : 1120, height: P ? 600 : 480 }}>
        <Paper lift={0.3}>
          <div style={{ padding: P ? '50px 60px' : '44px 64px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%', boxSizing: 'border-box' }}>
            <span style={{ fontFamily: F.mono, fontSize: P ? 30 : 32, letterSpacing: '.14em', textTransform: 'uppercase', color: C.goldDeep }}>{p.chapter}</span>
            <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: P ? 118 : 128, lineHeight: 0.98, letterSpacing: '-.03em' }}>{p.chapterName}</span>
            <span style={{ marginTop: 'auto', fontFamily: F.text, fontSize: P ? 40 : 42, color: C.ink3, display: 'flex', alignItems: 'center' }}>{p.blog}<Cursor h={P ? 44 : 46} color={C.ink} phase={T.blog} /></span>
          </div>
          <i style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 22, background: C.gold }} />
        </Paper>
      </div>
    </AbsoluteFill>}
    <FilmLook vignette={0.78} />
  </AbsoluteFill>;
}
