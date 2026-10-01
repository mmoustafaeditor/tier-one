// Share to X (banter lane): the "Post it" button beside Share on Results, and the catchphrase card that appears in
// the same row when a Confirmed Done call landed. Both go through lib/share.ts postToX: the Web Share API with the
// image where the device takes files, else an X intent with a banter line, the game URL and #TierOne #TransferTwitter.
import type { CastSaga, Result } from '../lib/engine';
import { useT } from '../lib/i18n';
import { useSave } from '../lib/save';
import { hash } from '../lib/kit';
import { onShared } from '../lib/meta';
import { catchphraseOf, catchphraseColor } from '../lib/catchphrase';
import { renderCard, renderCpCard, postToX, hereWeGoOf, X_TAGS, type Card } from '../lib/share';
import { GBtn } from './game';
import '../styles/sharex.css';

const XGlyph = () => <svg className="sx-x" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" /></svg>;

export interface ShareToXProps {
  r: Result; cast: CastSaga[]; seed: string;
  /** {hed} {tier} {pts} {what} {row} for the bn3.x.tpl templates. */
  v: Record<string, string>;
  /** The scoop card Results already builds (useShare().card); rendered to PNG only when the device can share it. */
  card?: () => Card;
}

export function ShareToX({ r, cast, seed, v, card }: ShareToXProps) {
  const t = useT();
  const s = useSave();
  const pick = (key: string, salt: string) => { const l = t.list(key) as string[] | undefined; return Array.isArray(l) && l.length ? l[hash(seed + '|' + salt) % l.length] : ''; };
  const fill = (x: string, vv: Record<string, string>) => x.replace(/\{(\w+)\}/g, (m, k) => (vv[k] != null ? vv[k] : m));
  const post = (text: string, image?: () => Promise<Blob | null>) => { onShared(); void postToX(text, image, X_TAGS); };

  // The catchphrase card: only when a Confirmed Done call landed (the line fired).
  const ci = hereWeGoOf(r);
  const cs = ci >= 0 ? cast[ci] : null;
  const cp = cs ? catchphraseOf(s) : null;
  const cv = cs && cp ? { phrase: cp.text, p: cs.player.s, to: cs.to.s } : null;

  return <>
    <GBtn size="sm" sound="open" className="sx-btn" label={t('bn3.x.postAria')} onClick={() => post(fill(pick('bn3.x.tpl', 'x'), v), card ? () => renderCard(card()) : undefined)}><XGlyph />{t('bn3.x.post')}</GBtn>
    {cv && cp && <aside className="sx-cp" style={{ ['--cp' as string]: catchphraseColor(s) }} aria-label={t('cp.ui.card')}>
      <span className="sx-cp__k g-mono">{t('cp.react.card.kicker')}</span>
      <b className="sx-cp__line"><bdi>{cv.phrase}</bdi></b>
      <span className="sx-cp__sub">{t('cp.react.card.line', cv)}</span>
      <span className="sx-cp__foot g-mono">{t('cp.react.card.foot')}</span>
      <GBtn size="sm" kind="dark" sound="open" className="sx-cp__btn" label={t('bn3.x.cpAria')} onClick={() => post(fill(pick('bn3.x.cp', 'cp'), cv), () => renderCpCard({ phrase: cv.phrase, kicker: t('cp.react.card.kicker'), line: t('cp.react.card.line', cv), foot: t('cp.react.card.foot'), by: t('share.by', { n: s.nick || 'Tier One' }), color: catchphraseColor(s), rtl: t.rtl }))}><XGlyph />{t('bn3.x.cpPost')}</GBtn>
    </aside>}
  </>;
}
