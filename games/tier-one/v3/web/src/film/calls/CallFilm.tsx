// One frame of a source-call film (the SVG fallback for the rendered clips): the set for `src` and outcome `o` at frame
// `f`, through the camera, with the film look on top. Pure: (props) → pixels. CallScene owns the clock.
import { FrameProvider } from '../remotion-shim';
import { FilmLook, SRC_C } from '../kit';
import { MirrorCtx } from './rig';
import { SETS, camAtF, type Z } from './sets';

export const LEAK_C = '#A77BFF';
export const accentOf = (src: string) => SRC_C[src] || LEAK_C;

export type CallFilmProps = { src: string; o: number; f: number; kit: Z['kit']; no: string; skin: string; to: Z['to']; alt: Z['alt']; from: Z['from']; rtl?: boolean; still?: boolean; portrait?: boolean };
export function CallFilm({ src, o, f, kit, no, skin, to, alt, from, rtl, still, portrait }: CallFilmProps) {
  const S = SETS[src] || SETS.leak;
  const cam = camAtF(src, o, f);
  // Phones: the world's safe area is 1200 wide; a tall frame zooms in so the people read at phone size.
  const z = cam.z * (portrait ? 1.6 : 1);
  const M = rtl ? -1 : 1;
  return <FrameProvider frame={f} width={1600} height={900} fps={30} durationInFrames={S.end + 1}>
    <svg className="cf" viewBox="200 0 1200 900" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <MirrorCtx.Provider value={M}>
        <g transform={M < 0 ? 'matrix(-1 0 0 1 1600 0)' : undefined}>
          <g transform={`translate(800 ${portrait ? 430 : 450}) scale(${z}) translate(${-cam.x} ${-cam.y})`}>
            <S.Scene f={f} o={o} kit={kit} no={no} skin={skin} acc={accentOf(src)} to={to} alt={alt} from={from} />
          </g>
        </g>
      </MirrorCtx.Provider>
    </svg>
    <FilmLook vignette={0.7} grain={!still} />
  </FrameProvider>;
}
