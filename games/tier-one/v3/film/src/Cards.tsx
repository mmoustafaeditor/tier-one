// Trailer-only cards: the cold line that opens it and the end card. Studio-editable (inline keyframes, named layers).
import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from 'remotion';
import { Fonts } from './Film';

type LineProps = { readonly line: string };
export const OpeningLine = ({ line }: LineProps) => {
  const frame = useCurrentFrame();
  return <Fonts><AbsoluteFill style={{ backgroundColor: '#0B0A08', alignItems: 'center', justifyContent: 'center', padding: 100 }}>
    <Interactive.Div name="Opening line" style={{ color: '#F4EFE4', fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 92, lineHeight: 1.12, textAlign: 'center',
      opacity: interpolate(frame, [4, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) }),
      translate: interpolate(frame, [4, 60], [0, -30], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) + 'px 0px' }}>{line}</Interactive.Div>
  </AbsoluteFill></Fonts>;
};

type EndProps = { readonly title: string; readonly cta: string; readonly url: string };
export const EndCard = ({ title, cta, url }: EndProps) => {
  const frame = useCurrentFrame();
  return <Fonts><AbsoluteFill style={{ backgroundColor: '#17140F', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
    <Interactive.Div name="Title" style={{ color: '#F4EFE4', fontFamily: 'Newsreader, serif', fontWeight: 800, fontSize: 190, letterSpacing: '-0.04em', lineHeight: 1,
      scale: interpolate(frame, [0, 14], [1.6, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.22, 1.6, 0.36, 1) }),
      opacity: interpolate(frame, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{title}</Interactive.Div>
    <Interactive.Div name="Rule" style={{ width: 520, height: 10, backgroundColor: '#FF5A36',
      scale: interpolate(frame, [10, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) }) + ' 1' }} />
    <Interactive.Div name="Call to action" style={{ color: '#BDB5A5', fontFamily: '"Schibsted Grotesk", sans-serif', fontWeight: 700, fontSize: 56, textAlign: 'center',
      opacity: interpolate(frame, [18, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{cta}</Interactive.Div>
    <Interactive.Div name="URL" style={{ color: '#F7B928', fontFamily: '"IBM Plex Mono", monospace', fontSize: 50,
      opacity: interpolate(frame, [24, 36], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{url}</Interactive.Div>
  </AbsoluteFill></Fonts>;
};
