// A video slot with a fallback: tries the rendered clip (muted, inline, full-bleed); if it can't start playing within
// `wait` ms, errors, or motion is reduced, the caller's SVG film takes over. Under reduced motion the clip's poster
// (its last frame) is shown still, and if that won't load either, the SVG's final frame.
import { useEffect, useRef, useState } from 'react';
import { clipUrl, posterUrl } from './manifest';

export type SlotMode = 'try' | 'video' | 'svg' | 'poster';

export function useFilmSlot(stem: string | null, reduced: boolean, wait = 600) {
  const [mode, setMode] = useState<SlotMode>(!stem ? 'svg' : reduced ? 'poster' : 'try');
  useEffect(() => {
    if (mode !== 'try') return;
    const id = setTimeout(() => setMode((m) => (m === 'try' ? 'svg' : m)), wait);
    return () => clearTimeout(id);
  }, [mode, wait]);
  return { mode, setMode };
}

export function FilmVideo({ stem, mode, setMode, onEnded }: { stem: string; mode: SlotMode; setMode: (m: SlotMode) => void; onEnded?: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current; if (!v) return;
    // iOS needs the attribute as well as the property before play() for muted inline autoplay.
    v.muted = true; v.defaultMuted = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.play().catch(() => setMode('svg'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (mode === 'svg' || mode === 'poster') return null;
  return <video ref={ref} className={'cf-video' + (mode === 'video' ? ' is-on' : '')} src={clipUrl(stem)} muted playsInline autoPlay preload="auto" disablePictureInPicture aria-hidden="true" tabIndex={-1}
    onPlaying={() => setMode('video')} onError={() => setMode('svg')} onEnded={onEnded} />;
}

/** The still for reduced motion: the clip's last frame, or `fallback` (the SVG end frame) if it doesn't load. */
export function FilmPoster({ stem, fallback }: { stem: string | null; fallback: React.ReactNode }) {
  const [bad, setBad] = useState(!stem);
  if (bad || !stem) return <>{fallback}</>;
  return <img className="cf-video is-on" src={posterUrl(stem)} alt="" aria-hidden="true" onError={() => setBad(true)} />;
}
