// Wraps a game scene for rendering: waits for the bundled fonts and lays the scene's synth cues (baked to WAVs
// in public/sfx by `npm run sfx`) on the timeline at their frames.
import { useEffect, useState, type ReactNode } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import type { Cue } from '../../web/src/film/cues';
import '../../look/fonts.css';

const FACES = ['800 40px Newsreader', 'italic 400 40px Newsreader', '700 40px Newsreader', '900 40px Archivo', '400 20px "IBM Plex Mono"', '800 20px "Schibsted Grotesk"', '400 20px "Schibsted Grotesk"', '700 40px "Noto Naskh Arabic"', '400 20px "IBM Plex Sans Arabic"'];
export const cueFile = (q: Cue) => 'sfx/' + q.k + (q.k === 'voice' ? '-' + (q.a as { base: number }).base : '') + '.wav';

export function Fonts({ children }: { children: ReactNode }) {
  const [h] = useState(() => delayRender('Loading the Tier One fonts'));
  useEffect(() => { Promise.all(FACES.map((f) => document.fonts.load(f, 'Tier One تير'))).catch(() => undefined).then(() => continueRender(h)); }, [h]);
  return <>{children}</>;
}

export function SfxTrack({ cues }: { cues: Cue[] }) {
  const { fps } = useVideoConfig();
  return <>{cues.map((q, i) => <Audio key={i} name={'Sfx ' + q.k} src={staticFile(cueFile(q))} from={q.f} premountFor={fps} volume={0.8} />)}</>;
}

export function Film({ cues, children }: { cues: Cue[]; children: ReactNode }) {
  return <AbsoluteFill><Fonts>{children}</Fonts><SfxTrack cues={cues} /></AbsoluteFill>;
}
