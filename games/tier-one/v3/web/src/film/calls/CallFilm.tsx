// One frame of a source-call film (GOTY.md §10): the source's place, no people. The phone rings and lights (the
// pick-up beat), the camera pushes in, and in the last second the place tells the tip with the outcome object as the
// brightest thing in frame. Pure: (props) → pixels; CallScene owns the clock.
//   full  ≈ 3.5 s: pick-up 0.6 s, then the call from frame 18 to END.
//   short ≈ 2 s:   pick-up 0.4 s, then the call from SHORT + 12 to END.
import { FrameProvider } from '../remotion-shim';
import { FilmLook } from '../kit';
import { PlaceView, placeOf, placeZ, accentOf, LEAK_C, type PlaceProps } from './places';
import { END, SHORT, type Phase } from './places/spec';

export { accentOf, LEAK_C };
export const PICK_FULL = 18, PICK_SHORT = 12;
/** Frames in a cut (the film's clock runs 0..len). */
export const cutLen = (full: boolean) => (full ? END : END - SHORT);
/** Where a clock frame `t` of a cut lands: the phase, the scene's frame and the camera's frame. */
export function timeline(t: number, full: boolean): { phase: Phase; f: number; camF: number } {
  const start = full ? 0 : SHORT, pick = full ? PICK_FULL : PICK_SHORT;
  const camF = start + t;
  if (t < pick) return { phase: 'pickup', f: full ? t : t + 4, camF };
  return { phase: 'call', f: camF, camF };
}

export type CallFilmProps = Omit<PlaceProps, 'f' | 'phase'> & { t: number; full: boolean; rtl?: boolean; still?: boolean; portrait?: boolean };
export function CallFilm({ t, full, rtl, still, portrait, ...p }: CallFilmProps) {
  const spec = placeOf(p.src);
  const tl = timeline(t, full);
  const z = placeZ({ ...p, f: tl.f, phase: tl.phase });
  return <FrameProvider frame={tl.camF} width={1600} height={900} fps={30} durationInFrames={END + 1}>
    <PlaceView spec={spec} z={z} camF={tl.camF} rtl={rtl} portrait={portrait} />
    <FilmLook vignette={0.72} grain={!still} />
  </FrameProvider>;
}
