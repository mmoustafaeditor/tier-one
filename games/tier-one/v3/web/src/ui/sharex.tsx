// Share to X (Results): the "Post it" button beside Share, and the Drop card that appears in the same row when a right
// Drop fired your catchphrase (CONCEPT4 §3, RULES4 §1: "a right Drop stamps your catchphrase"). The card is drawn in the
// Drop card style you have on (Lens › Looks) and the PNG uses its colours. Both go through lib/share.ts postToX: the
// Web Share API with the image where the device takes files, else an X intent with a line, the game URL and the tags.
import type { CastSaga, Result, Result4 } from '../lib/engine';
import { useT } from '../lib/i18n';
import { useSave, type Save } from '../lib/save';
import { hash } from '../lib/kit';
import { onShared } from '../lib/meta';
import { catchphraseOf, catchphraseColor } from '../lib/catchphrase';
import { equipped } from '../lib/wallet';
import { renderCard, renderCpCard, postToX, hereWeGoOf, X_TAGS, type Card, type CardStyle } from '../lib/share';
import { GBtn } from './game';
import { DropCard } from './customize';
import '../styles/sharex.css';

const XGlyph = () => <svg className="sx-x" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" /></svg>;

export interface ShareToXProps {
  r: Result | Result4; cast: CastSaga[]; seed: string;
  /** {hed} {tier} {pts} {what} {row} for the bn3.x.tpl templates. */
  v: Record<string, string>;
  /** The scoop card Results already builds (useShare().card); rendered to PNG only when the device can share it. */
  card?: () => Card;
}

/** The story a right Drop landed on and the ending it called: v4 (any ending, All in, right; a Scoop first) or v3
 *  (a Confirmed Done). Null when no line fired. */
export function rightDropOf(r: Result | Result4): { i: number; o: number; scoop: boolean } | null {
  if ((r as Result4).v === 4) {
    const p = (r as Result4).per.filter((x) => x.call && x.call.s === 2 && x.right).sort((a, b) => Number(b.scoop) - Number(a.scoop) || b.pts - a.pts)[0];
    return p && p.call ? { i: p.i, o: p.call.o, scoop: p.scoop } : null;
  }
  const i = hereWeGoOf(r as Result);
  return i >= 0 ? { i, o: 0, scoop: !!(r as Result).per[i]?.excl } : null;
}
/** The share card's colours: the Drop card style you have on (Lens › Looks). */
export function dropCardStyle(s: Save): CardStyle | undefined {
  const dc = equipped('dropcard', s).preview;
  return dc.k === 'dropcard' ? { paper: dc.bg, ink: dc.ink, accent: dc.accent } : undefined;
}

export function ShareToX({ r, cast, seed, v, card }: ShareToXProps) {
  const t = useT();
  const s = useSave();
  const pick = (key: string, salt: string) => { const l = t.list(key) as string[] | undefined; return Array.isArray(l) && l.length ? l[hash(seed + '|' + salt) % l.length] : ''; };
  const fill = (x: string, vv: Record<string, string>) => x.replace(/\{(\w+)\}/g, (m, k) => (vv[k] != null ? vv[k] : m));
  const post = (text: string, image?: () => Promise<Blob | null>) => { onShared(); void postToX(text, image, X_TAGS); };

  // The Drop card: only when a right Drop fired the line.
  const hit = rightDropOf(r);
  const cs = hit ? cast[hit.i] : null;
  const club = cs && hit ? (hit.o === 0 ? cs.to : hit.o === 1 ? cs.alt || cs.to : cs.from) : null;
  const cp = cs ? catchphraseOf(s) : null;
  const cv = cs && cp && club ? { phrase: cp.text, p: cs.player.s, to: club.s } : null;

  return <>
    <GBtn size="sm" sound="open" className="sx-btn" label={t('bn3.x.postAria')} onClick={() => post(fill(pick('bn3.x.tpl', 'x'), v), card ? () => renderCard(card()) : undefined)}><XGlyph />{t('bn3.x.post')}</GBtn>
    {cv && hit && cs && club && <aside className="sx-cp" aria-label={t('cp.ui.card')}>
      <DropCard s={s} o={hit.o} cp={cv.phrase} player={cs.player.n} club={{ s: club.s, n: club.n, c1: club.c1, c2: club.c2 }} scoop={hit.scoop} className="sx-cp__card" />
      <GBtn size="sm" kind="dark" sound="open" className="sx-cp__btn" label={t('bn3.x.cpAria')} onClick={() => post(fill(pick('bn3.x.cp', 'cp'), cv), () => renderCpCard({ phrase: cv.phrase, kicker: t('cp.react.card.kicker'), line: t('cp.react.card.line', cv), foot: t('cp.react.card.foot'), by: t('share.by', { n: s.nick || 'Tier One' }), color: catchphraseColor(s), rtl: t.rtl, style: dropCardStyle(s) }))}><XGlyph />{t('bn3.x.cpPost')}</GBtn>
    </aside>}
  </>;
}
