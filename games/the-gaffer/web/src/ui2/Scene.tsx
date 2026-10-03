// A club's ground as a scene (reference pack v2): the shared backplate for its scale and region, with the host's flags
// and banner composed over the blank boards (the pack's stadium composition). On an away day the ground belongs to the
// host; the visitor's flag hangs on the far side. Presentation only.
import { memo, useMemo, type ReactNode } from 'react';
import type { Club } from '../model/types';
import { bannerSvg, flagSvg, stadiumArt, svgUri, themeOf } from './theme';

export const StadiumScene = memo(function StadiumScene({ host, guest, className = '', children, banner = true }: { host: Club | undefined; guest?: Club; className?: string; children?: ReactNode; banner?: boolean }) {
  const t = themeOf(host), v = guest ? themeOf(guest) : t;
  const art = useMemo(() => ({ hf: svgUri(flagSvg(t)), gf: svgUri(flagSvg(v)), bn: host ? svgUri(bannerSvg(t, host.name.en)) : '' }), [t, v, host]);
  return (
    <div className={`scene ${className}`} style={{ backgroundImage: `url(${stadiumArt(t)})` }}>
      <img className="scene-flag l" src={art.hf} alt="" aria-hidden="true" />
      <img className="scene-flag r" src={art.gf} alt="" aria-hidden="true" />
      {banner && art.bn && <img className="scene-banner" src={art.bn} alt="" aria-hidden="true" />}
      {children}
    </div>
  );
});
