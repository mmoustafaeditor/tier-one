// The story's title card (Story mode, "The Comeback"): the stand-in for any story-<id> film that has no clip yet.
// About 2.5 s: the desk lamp comes up, a kicker ("Chapter 2 · Stringer"), the title set in metal type, a gold rule
// and one caption line. Fits portrait (1080×1920) and landscape (1920×1080) stages; pure function of the frame.
import { AbsoluteFill, interpolate } from '../remotion-shim';
import { C, F, FilmLook, Typeset, clamp, k01, useStage, EASE } from '../kit';
import type { SceneMeta } from '../cues';

export type StoryCardProps = { kicker: string; title: string; line: string; num?: string; tone?: 'gold' | 'red'; rtl?: boolean };

const T = { kick: 4, title: 12, rule: 30, line: 38, end: 78 };
export const STORY_CARD: SceneMeta = { dur: T.end, beats: [0], cues: [{ f: 1, k: 'whoosh' }, { f: T.title, k: 'typewriter' }, { f: T.rule, k: 'thock' }] };

export function StoryCard(p: StoryCardProps) {
  const { f, P } = useStage();
  const acc = p.tone === 'red' ? C.red : C.gold;
  const lamp = k01(f, 0, 18);
  const push = interpolate(f, [0, T.end], [1.04, 1], clamp);
  const w = P ? 900 : 1320;
  const titleSize = P ? (p.title.length > 16 ? 118 : 150) : (p.title.length > 22 ? 118 : 150);
  return <AbsoluteFill style={{ background: C.night, overflow: 'hidden', direction: p.rtl ? 'rtl' : 'ltr' }}>
    {/* The desk under a lamp. */}
    <AbsoluteFill style={{ background: `radial-gradient(${P ? '90% 55%' : '60% 75%'} at 50% 42%, rgba(255,200,115,${0.2 * lamp}), transparent 70%), repeating-linear-gradient(92deg, rgba(255,255,255,.016) 0 3px, transparent 3px 22px, rgba(0,0,0,.14) 22px 24px, transparent 24px 61px), linear-gradient(180deg, ${C.desk2}, ${C.desk} 70%)` }} />
    {p.num && <div style={{ position: 'absolute', insetInlineEnd: P ? 40 : 120, top: P ? 220 : 60, fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: P ? 760 : 820, lineHeight: 0.8, color: 'transparent', WebkitTextStroke: `4px ${acc}`, opacity: 0.16 * k01(f, 0, 24) }}>{p.num}</div>}
    <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${push})` }}>
      <div style={{ width: w, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: P ? 34 : 28, textAlign: 'start' }}>
        <div style={{ fontFamily: F.mono, fontSize: P ? 38 : 34, letterSpacing: '.14em', textTransform: 'uppercase', color: acc, opacity: k01(f, T.kick, T.kick + 8), transform: `translateY(${(1 - k01(f, T.kick, T.kick + 10)) * 16}px)` }}>{p.kicker}</div>
        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: titleSize, lineHeight: 0.98, letterSpacing: '-.03em', color: C.paper }}><Typeset text={p.title} at={T.title} cpf={1.1} rtl={p.rtl} /></div>
        <div style={{ height: 8, width: w * 0.42, background: acc, borderRadius: 4, transformOrigin: p.rtl ? '100% 50%' : '0 50%', transform: `scaleX(${k01(f, T.rule, T.rule + 10, EASE.inOut)})` }} />
        {p.line && <div style={{ fontFamily: F.display, fontStyle: p.rtl ? 'normal' : 'italic', fontSize: P ? 50 : 46, lineHeight: 1.28, color: '#CFC7B6', maxWidth: w, opacity: k01(f, T.line, T.line + 12), transform: `translateY(${(1 - k01(f, T.line, T.line + 14)) * 20}px)` }}>{p.line}</div>}
      </div>
    </AbsoluteFill>
    <FilmLook vignette={0.8} />
  </AbsoluteFill>;
}
