// The Home 3D desk (GOTY.md §9.2), lazy: ui/film.tsx's stage mounts it on capable desktops (lib/filmgate.ts `desk3d`),
// after first paint, and unmounts it on route change (buildDesk's stop() disposes the renderer). The loop's poster shows
// under the canvas until the first frame; if three.js can't be fetched the desk reports failure and the loop plays.
// Dev: window.__t1desk exposes frame counts for the fps trace.
import { useEffect, useRef, useState } from 'react';
import { loadThree } from './loader';
import { buildDesk, type DeskHandle, type Tone } from './scene';

export default function Desk3D({ poster, tone, onFail }: { poster: string; tone: Tone; onFail?: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const handle = useRef<DeskHandle | null>(null);
  const [live, setLive] = useState(false);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    let dead = false;
    const start = () => loadThree().then((T) => {
      if (dead || !canvas.current) return;
      // a slow GPU (the guard in scene.ts) hands back to the loop for the session
      handle.current = buildDesk(T, canvas.current, tone, () => setLive(true), () => { if (!dead) { setBad(true); onFail?.(); } });
      (window as { __t1desk?: unknown }).__t1desk = { frames: () => handle.current?.frames() || 0, stats: () => handle.current?.stats() };
      const ro = new ResizeObserver(() => handle.current?.resize());
      ro.observe(canvas.current);
      cleanup = () => { ro.disconnect(); handle.current?.stop(); handle.current = null; delete (window as { __t1desk?: unknown }).__t1desk; };
    }).catch(() => { if (!dead) { setBad(true); onFail?.(); } });
    let cleanup = () => {};
    // after first paint: the desk is the last thing Home needs
    const idle = (window as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const id = idle ? idle(start, { timeout: 1200 }) : window.setTimeout(start, 300);
    return () => { dead = true; if (idle) (window as { cancelIdleCallback?: (n: number) => void }).cancelIdleCallback?.(id); else clearTimeout(id); cleanup(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { handle.current?.setTone(tone); }, [tone]);
  if (bad) return null;
  return <div className={'desk3d' + (live ? ' is-live' : '')} aria-hidden="true">
    <img src={poster} alt="" decoding="async" draggable={false} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
    <canvas ref={canvas} />
  </div>;
}
