// Rival scalp (5 net wins) or the rivalry trophy (10): the rival's desk. Your post is going viral on the TV behind
// them; they slam the laptop shut and tear up their own printed post, and the stamp lands. Nobody speaks.
import { AbsoluteFill, interpolate } from '../remotion-shim';
import { C, F, FilmLook, Glyph, Layer, Stamp, Typeset, camAt, clamp, k01, shake, useStage, EASE, type Key } from '../kit';
import { Figure, SKIN } from '../people';
import { Confetti } from './bits';
import type { SceneMeta } from '../cues';

export type ScalpProps = {
  rival: 'tabloid' | 'itk' | 'insider' | string; handle: string; byline: string; post: string; theirs: string;
  viral: string; record: string; stamp: string; trophy?: boolean; rtl?: boolean;
};
const RC: Record<string, { shirt: string; hair: 'short' | 'curls' | 'bun' | 'cap'; skin: string }> = {
  tabloid: { shirt: '#FF3D7F', hair: 'curls', skin: SKIN[0] }, itk: { shirt: '#3A3A48', hair: 'cap', skin: SKIN[1] }, insider: { shirt: '#F7B928', hair: 'bun', skin: SKIN[3] },
};
const T = { count: 4, type: 8, slam: 40, tear: 54, stamp: 70, end: 102 };
export const SCALP: SceneMeta = {
  dur: T.end, hold: 700, beats: [0, T.slam, T.stamp],
  cues: [{ f: 0, k: 'send' }, { f: T.type, k: 'typewriter' }, { f: 24, k: 'count' }, { f: T.slam, k: 'stamp' }, { f: T.tear, k: 'shred' }, { f: T.stamp, k: 'stamp' }, { f: T.stamp + 2, k: 'fanfare' }],
};
const kfmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K' : String(Math.round(n)));

export function Scalp(p: ScalpProps) {
  const { f, P, W } = useStage();
  const m = p.rtl ? -1 : 1;
  const look = RC[p.rival] || RC.itk;
  const keys: Key[] = [{ f: 0, x: 0, y: P ? -120 : -60, z: P ? 0.92 : 0.95 }, { f: T.slam, x: 0, y: P ? -40 : -20, z: P ? 1.0 : 1.02 }, { f: T.stamp, x: 0, y: P ? 40 : 30, z: P ? 1.06 : 1.08 }, { f: T.end, x: 0, y: P ? 50 : 40, z: P ? 1.08 : 1.1 }];
  const c0 = camAt(f, keys), sh = shake(f, [T.slam, T.stamp], 20), cam = { ...c0, x: c0.x + sh.x, y: c0.y + sh.y };
  const viral = interpolate(f, [T.count, T.slam + 30], [0, 1], { ...clamp, easing: EASE.out });
  const typing = f < T.slam - 8;
  const up = k01(f, T.slam - 8, T.slam - 2, EASE.out), down = k01(f, T.slam - 2, T.slam, EASE.in);
  const armLift = typing ? 20 + Math.abs(Math.sin(f / 1.6)) * 12 : 20 + up * 120 - down * 110;
  const lid = f < T.slam ? 1 : Math.max(0.06, 1 - (f - T.slam + 1) / 2);
  const tear = k01(f, T.tear, T.tear + 14, EASE.out);
  const tv = P ? { x: 0, y: -620, w: 860, h: 520 } : { x: m * 400, y: -170, w: 760, h: 440 };
  const rv = P ? { x: 0, y: -40 } : { x: m * -330, y: -60 };
  const deskY = P ? 300 : 230;
  const tw = P ? { x: 0, y: 560 } : { x: m * -330, y: 400 };
  return <AbsoluteFill style={{ background: C.night, overflow: 'hidden', direction: p.rtl ? 'rtl' : 'ltr' }}>
    <Layer cam={cam}>
      <div style={{ position: 'absolute', left: -1500, top: -1400, width: 3000, height: 2800, background: 'repeating-linear-gradient(0deg, #262A33 0 90px, #20242C 90px 94px)' }} />
      {/* the TV: your post going viral */}
      <div style={{ position: 'absolute', left: tv.x - tv.w / 2, top: tv.y - tv.h / 2, width: tv.w, height: tv.h, background: C.ink, border: `16px solid #0A0A0A`, borderRadius: 16, boxShadow: `0 0 ${80 + viral * 120}px rgba(255,90,54,${0.25 + viral * 0.3}), 0 30px 60px rgba(0,0,0,.6)`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, #3A1F1A, ${C.redDeep})` }} />
        <div style={{ position: 'absolute', left: 30, right: 30, top: 30, background: C.paper, color: C.ink, borderRadius: 14, padding: '18px 22px', transform: `scale(${1 + viral * 0.04})`, transformOrigin: '50% 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 56, height: 56, borderRadius: '50%', background: C.ink, color: C.gold, display: 'grid', placeItems: 'center', fontFamily: F.display, fontWeight: 800, fontSize: 32 }}>{Array.from(p.byline)[0] || '?'}</span>
            <b style={{ fontFamily: F.text, fontSize: 30 }}>{p.byline}</b>
            <span style={{ marginInlineStart: 'auto', background: C.red, color: C.paper, fontFamily: F.cond, fontStretch: '75%', fontWeight: 900, fontSize: 28, padding: '4px 12px', letterSpacing: '.08em', opacity: k01(f, 18, 24) }}>{p.viral}</span>
          </div>
          <p style={{ margin: '12px 0 10px', fontFamily: F.text, fontSize: 30, lineHeight: 1.25, minHeight: 76 }}><Typeset text={p.post} at={T.type} cpf={2.2} /></p>
          <div style={{ display: 'flex', gap: 28, fontFamily: F.cond, fontStretch: '80%', fontWeight: 800, fontSize: 30, color: C.ink2 }}>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center', color: C.done }}><Glyph n="repost" size={30} />{kfmt(viral * 38400)}</span>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center', color: C.redDeep }}><Glyph n="heart" size={30} />{kfmt(viral * 176000)}</span>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 56, background: C.paper, color: C.ink, display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', fontFamily: F.cond, fontStretch: '75%', fontWeight: 900, fontSize: 32, letterSpacing: '.04em' }}>
          <span style={{ background: C.red, color: C.paper, padding: '2px 10px' }}>{p.record}</span>
        </div>
      </div>
      {/* the rival, at the laptop */}
      <div style={{ position: 'absolute', left: rv.x - 190, top: rv.y - 330 }}>
        <Figure h={720} shirt={look.shirt} hair={look.hair} capC={C.ink} skin={look.skin} armL={armLift} bendL={-60 + (typing ? Math.sin(f) * 8 : 0)} armR={armLift} bendR={-60 - (typing ? Math.sin(f + 1) * 8 : 0)} lean={f >= T.slam ? interpolate(f, [T.slam, T.slam + 6], [4, 0], clamp) * m : 0} />
      </div>
      {/* the desk and the laptop (we see the back of the lid, their handle on a sticker) */}
      <div style={{ position: 'absolute', left: -1000, top: deskY, width: 2000, height: 900, background: 'repeating-linear-gradient(90deg, #4A4F5C 0 150px, #424754 150px 154px)', border: `8px solid ${C.ink}` }} />
      <div style={{ position: 'absolute', left: rv.x - 230, top: deskY - 290 * lid, width: 460, height: 290 * lid, background: '#B9BEC8', border: `8px solid ${C.ink}`, borderRadius: '14px 14px 4px 4px', boxSizing: 'border-box', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        {lid > 0.5 && <span style={{ background: look.shirt, color: p.rival === 'insider' ? C.ink : C.paper, borderRadius: 999, padding: '10px 22px', fontFamily: F.mono, fontSize: 26, border: `4px solid ${C.ink}` }}><bdi dir="ltr">{p.handle}</bdi></span>}
      </div>
      <div style={{ position: 'absolute', left: rv.x - 260, top: deskY - 14, width: 520, height: 26, background: '#8E939E', border: `6px solid ${C.ink}`, borderRadius: 6 }} />
      {/* their own post, printed, torn in two */}
      {[0, 1].map((k) => {
        const s = k ? 1 : -1;
        return <div key={k} style={{ position: 'absolute', left: tw.x - 240 + (k ? 240 : 0), top: tw.y - 100, width: 240, height: 220, overflow: 'hidden', transform: `translate(${s * tear * 220}px, ${tear * tear * 260}px) rotate(${s * tear * 24}deg)`, transformOrigin: k ? '0 100%' : '100% 100%', clipPath: k ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 6% 80%, 0 60%, 8% 40%, 0 20%)' : 'polygon(0 0, 100% 0, 94% 20%, 100% 40%, 92% 60%, 100% 80%, 100% 100%, 0 100%)' }}>
          <div style={{ position: 'absolute', left: k ? -240 : 0, top: 0, width: 480, height: 220, background: C.paper, color: C.ink, border: `5px solid ${C.ink}`, boxSizing: 'border-box', padding: '16px 20px', fontFamily: F.text }}>
            <b style={{ fontSize: 24, fontFamily: F.mono }}><bdi dir="ltr">{p.handle}</bdi></b>
            <p style={{ margin: '8px 0 0', fontSize: 28, lineHeight: 1.2, fontWeight: 700 }}>{p.theirs}</p>
          </div>
        </div>;
      })}
    </Layer>
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ transform: `translateY(${P ? 120 : 60}px)` }}><Stamp text={p.stamp} color={p.trophy ? C.gold : C.red} at={T.stamp} size={P ? 150 : 140} rot={-10} border={0.08} /></div>
    </AbsoluteFill>
    {p.trophy && <Confetti at={T.stamp} W={W} />}
    <FilmLook vignette={0.62} />
  </AbsoluteFill>;
}
