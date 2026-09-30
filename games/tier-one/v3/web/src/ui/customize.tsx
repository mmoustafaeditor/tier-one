// "Your desk" pieces (GOTY.md §8.4): live previews of every cosmetic kind, the item tiles, the wallet strip, the
// credits glyph, the gift and packs sheets, and <CustomizeLink/> for the Me lane. Logic lives in lib/wallet.ts and
// lib/catalog.ts; the screen in screens/Customize.tsx.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useSave, type Save } from '../lib/save';
import { useT, fmtDate, type T } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import { bylineOf, repTier } from '../lib/byline';
import { levelOf } from '../lib/progress';
import { frameCSS } from '../lib/season';
import { item, legacy, isStandard, kindDef, type Item, type Kind, type Price } from '../lib/catalog';
import {
  equipped, balances, priceText, giftTargets, gift, giftable, referralCode, creditPacksOnSale, buyCreditPack, CREDIT_PACKS, packBonus, paperName,
  showcaseOf, type Currency,
} from '../lib/wallet';
import { catchDef, TONE_SFX, CUSTOM_ID, HOUSE_KEY } from '../lib/catchphrase';
import type { HeadlineFace } from '../lib/kinds';
import { Icon, GBtn, SRC_ICON } from './game';
import { CosSwatch } from './season';
import { navTo } from './connect';
import '../styles/customize.css';

// ---------------------------------------------------------------- names, prices, glyphs
export function itemName(t: T, it: Item): string {
  if (it.kind === 'gold' && it.nameVars) return t(it.nameKey, { s: t(String(it.nameVars.s)), y: it.nameVars.y });
  return t(it.nameKey, it.nameVars);
}
/** The credits glyph: a small press ticket, so it never reads as a coin. */
export function CreditIcon({ size = 16 }: { size?: number }) {
  return <span className="cz-cred" style={{ ['--sz' as string]: size + 'px' }} aria-hidden="true"><b>C</b></span>;
}
export function PriceTag({ price, was, cur, className = '' }: { price: Price; was?: Price; cur?: Currency; className?: string }) {
  const t = useT();
  const show = (p: Price, k: Currency) => p[k] != null && (!cur || cur === k);
  return <span className={'cz-price ' + className}>
    {show(price, 'credits') && <span className="cz-price__c"><CreditIcon size={14} />{price.credits!.toLocaleString('en')}{was && was.credits !== price.credits && <s>{was.credits}</s>}</span>}
    {show(price, 'credits') && show(price, 'coins') && <span className="cz-price__or">{t('eco.price.or', { a: '', b: '' }).trim()}</span>}
    {show(price, 'coins') && <span className="cz-price__k"><span className="g-coin" aria-hidden="true" />{price.coins!.toLocaleString('en')}{was && was.coins !== price.coins && <s>{was.coins}</s>}</span>}
    <span className="sr-only">{priceText(price, cur)}</span>
  </span>;
}
export function WalletStrip({ onGet }: { onGet?: () => void }) {
  const t = useT(); const s = useSave();
  const b = balances(s);
  return <div className="cz-wallet" role="group" aria-label={t('pass.wallet')}>
    <span className="cz-wallet__pill" title={t('eco.wallet.coinsD')}><span className="g-coin" aria-hidden="true" /><b className="g-num">{b.coins.toLocaleString('en')}</b><small>{t('eco.wallet.coins')}</small></span>
    <span className="cz-wallet__pill cz-wallet__pill--c" title={t('eco.wallet.creditsD')}><CreditIcon /><b className="g-num">{b.credits.toLocaleString('en')}</b><small>{t('eco.wallet.credits')}</small></span>
    {onGet && <button type="button" className="cz-wallet__get" onClick={() => { sfx('ui.tap'); onGet(); }} aria-label={t('eco.wallet.get')}><CreditIcon size={15} /><Icon n="arrow" size={14} /><span>{t('eco.wallet.get')}</span></button>}
  </div>;
}
/** An honest countdown: days when far, hours on the last day. */
export function Countdown({ to, lang }: { to: number; lang: string }) {
  const t = useT();
  const ms = to - Date.now(); const d = Math.ceil(ms / 864e5);
  if (ms <= 0) return <>{t('eco.season.lastDay')}</>;
  return <>{d <= 1 ? t('eco.season.lastDay') : t('eco.season.left', { n: d })} · {fmtDate(to - 864e5, lang, { day: 'numeric', month: 'short' })}</>;
}

// ---------------------------------------------------------------- the look on stage: equipped, or the one being tried
export type Try = Partial<Record<Kind, string>>;
export const look = (kind: Kind, s: Save, tryOn?: Try): Item => { const id = tryOn?.[kind]; const it = id ? item(id) : null; return it && it.kind === kind ? it : equipped(kind, s); };
const pv = <K extends Kind>(kind: K, s: Save, tryOn?: Try) => look(kind, s, tryOn).preview as Extract<Item['preview'], { k: K }>;
const initialsOf = (n: string) => (n || 'You').split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();

/** The byline card as it appears on Me and in press-box tables, in the chosen design, flair, ink and press pass. */
export function BylinePreview({ s, tryOn, style }: { s: Save; tryOn?: Try; style?: CSSProperties }) {
  const t = useT();
  const d = pv('byline', s, tryOn), f = pv('flair', s, tryOn), p = pv('presspass', s, tryOn), ink = pv('ink', s, tryOn);
  const b = bylineOf(s); const tier = repTier(b.rep);
  return <div className={'cz-by cz-by--' + d.rule + (d.tex ? ' cz-by--' + d.tex : '')} style={{ ['--by-bg' as string]: d.bg, ['--by-ink' as string]: d.ink, ['--by-acc' as string]: d.accent, ['--by-face' as string]: d.face === 'cond' ? 'var(--f-cond)' : 'var(--f-display)', ['--pp-1' as string]: p.c1, ['--pp-2' as string]: p.c2, ['--pp-ink' as string]: p.ink, ['--pp-stripe' as string]: p.stripe || 'transparent', ...style }}>
    <div className="cz-by__top">
      <span className="cz-pp cz-pp--sm" aria-hidden="true"><b>{initialsOf(s.nick)}</b><i>{levelOf(s.pp).n}</i></span>
      <p className="cz-by__by" dir="auto">{t('eco.preview.by', { n: s.nick || t('g.home.noName') })}{f.g && <b className="cz-by__flair" style={{ color: f.c }}>{f.g}</b>}</p>
      <span className="g-stamp cz-by__stamp" style={{ ['--sc' as string]: ink.c }}>{t('cn.tier.' + tier)}</span>
    </div>
    <dl className="cz-by__stats">
      <div><dt>{t('eco.preview.followers')}</dt><dd className="g-num">{b.followers.toLocaleString('en')}</dd></div>
      <div><dt>{t('eco.preview.rep')}</dt><dd className="g-num">{b.rep}</dd></div>
      <div><dt>{t('eco.preview.hot')}</dt><dd className="g-num"><Icon n="flame" size={18} />{b.hot}</dd></div>
    </dl>
    <CatchLine s={s} tryOn={tryOn} className="cz-by__cp" />
    <Showcase s={s} />
    <p className="cz-by__paper">{paperName(s)}</p>
  </div>;
}
/** The catchphrase as a slammed stamp in the line's colour (byline card, share card, the catchphrase stage). */
export function lineText(t: T, s: Save, it: Item): string {
  const d = catchDef(it);
  if (d.id === CUSTOM_ID) return s.desk?.cp?.text && s.desk.cp.ok !== false ? s.desk.cp.text : t(HOUSE_KEY);
  return t(d.key);
}
export function CatchLine({ s, tryOn, className = '', big }: { s: Save; tryOn?: Try; className?: string; big?: boolean }) {
  const t = useT(); const it = look('catchphrase', s, tryOn); const d = catchDef(it);
  return <span className={'cz-cp cz-cp--' + d.tone + (big ? ' cz-cp--big' : '') + ' ' + className} style={{ ['--cp' as string]: d.c }} dir="auto">{lineText(t, s, it)}</span>;
}
/** Up to three pinned looks on the byline card. */
export function Showcase({ s }: { s: Save }) {
  const show = showcaseOf(s);
  if (!show.length) return null;
  return <span className="cz-show" aria-hidden="true">{show.map((it) => <span key={it.id} className="cz-show__i"><Thumb it={it} s={s} /></span>)}</span>;
}
/** The scoop card (lib/share.ts) drawn small: the style, the post frame and the paper's name. */
export function ShareCardPreview({ s, tryOn, style }: { s: Save; tryOn?: Try; style?: CSSProperties }) {
  const t = useT();
  const c = pv('sharecard', s, tryOn), ink = pv('ink', s, tryOn);
  const fr = look('frame', s, tryOn); const hd = pv('headline', s, tryOn);
  const frame = fr.source === 'standard' ? {} : frameCSS(legacy(fr));
  return <div className={'cz-sc cz-sc--' + c.style} style={{ ['--sc-paper' as string]: c.paper, ['--sc-ink' as string]: c.ink, ['--sc-acc' as string]: c.accent, ...(frame as CSSProperties), ...style }}>
    <div className="cz-sc__mast"><b dir="auto">{paperName(s)}</b><span>No. 214</span></div>
    <CatchLine s={s} tryOn={tryOn} className="cz-sc__cp" />
    <h3 className="cz-sc__hed" style={hedStyle(hd.face, hd.upper, hd.ink)}>{t('eco.preview.hedline')}</h3>
    <p className="cz-sc__sub" dir="auto">{t('eco.preview.sub')}</p>
    <div className="cz-sc__body"><span className="cz-sc__fig" aria-hidden="true"><i /><i /></span><span className="cz-sc__num g-num">+81<small>pts</small></span></div>
    <span className="g-stamp cz-sc__stamp" style={{ ['--sc' as string]: ink.c }}>{t('eco.preview.stamp')}</span>
    <p className="cz-sc__by" dir="auto">{t('eco.preview.by', { n: s.nick || t('g.home.noName') })}</p>
  </div>;
}
export function PressPassPreview({ s, tryOn }: { s: Save; tryOn?: Try }) {
  const t = useT(); const p = pv('presspass', s, tryOn);
  return <div className="cz-ppcard" style={{ ['--pp-1' as string]: p.c1, ['--pp-2' as string]: p.c2, ['--pp-ink' as string]: p.ink, ['--pp-stripe' as string]: p.stripe || 'transparent' }}>
    <span className="cz-pp" aria-hidden="true"><b>{initialsOf(s.nick)}</b><i>{levelOf(s.pp).n}</i></span>
    <span className="cz-ppcard__main"><b dir="auto">{s.nick || t('g.home.noName')}</b><span className="g-mono">{t('eco.preview.pass')} · {t('cn.tier.' + repTier(bylineOf(s).rep))}</span><span className="g-bar g-bar--sm"><i style={{ width: '62%' }} /></span></span>
  </div>;
}
export function MastheadPreview({ s, tryOn }: { s: Save; tryOn?: Try }) {
  const t = useT(); const m = pv('masthead', s, tryOn);
  return <div className={'cz-mh cz-mh--' + m.rule} style={{ ['--mh-bg' as string]: m.bg, ['--mh-ink' as string]: m.ink, ['--mh-face' as string]: m.face === 'cond' ? 'var(--f-cond)' : m.face === 'mono' ? 'var(--f-mono)' : 'var(--f-display)' }}>
    <p className="cz-mh__name" dir="auto">{m.orn && <i aria-hidden="true">{m.orn}</i>}{paperName(s)}{m.orn && <i aria-hidden="true">{m.orn}</i>}</p>
    <p className="cz-mh__line">{t('eco.preview.mast')} · {t('eco.preview.table')}</p>
    <ol className="cz-mh__rows" aria-hidden="true">{[s.nick || 'You', 'Sam', 'Nour'].map((n, k) => <li key={k}><span className="g-num">{k + 1}</span><span dir="auto">{n}</span><b className="g-num">{[142, 131, 118][k]}</b></li>)}</ol>
  </div>;
}
export function PosterPreview({ s, tryOn }: { s: Save; tryOn?: Try }) {
  const t = useT(); const p = pv('poster', s, tryOn);
  const frame: CSSProperties = p.style === 'ticket' ? { border: '4px dashed ' + p.c2, outline: '6px solid ' + p.c, outlineOffset: '-10px' }
    : p.style === 'tape' ? { border: '6px solid ' + p.c, boxShadow: '0 0 0 3px ' + p.c2 + ', inset 0 0 0 2px ' + p.c2 }
      : p.style === 'neon' ? { border: '3px solid ' + p.c, boxShadow: '0 0 14px ' + p.c + ', inset 0 0 10px ' + p.c2 }
        : p.style === 'gilt' ? { border: '6px double ' + p.c, boxShadow: '0 0 0 2px ' + p.c2 } : { border: '4px solid ' + p.c, boxShadow: 'inset 0 0 0 2px ' + p.c2 };
  return <div className="cz-poster" style={frame}>
    <span className="cz-poster__fig" aria-hidden="true"><i /><i /></span>
    <b className="cz-poster__t">{t('eco.preview.poster')}</b>
    <span className="cz-poster__k g-mono">{t('eco.preview.film')}</span>
  </div>;
}
export function RingPreview({ s, tryOn }: { s: Save; tryOn?: Try }) {
  const t = useT(); const r = pv('ringtone', s, tryOn);
  return <div className="cz-ring">
    <span className="g-src g-src--agent cz-ring__ic"><Icon n="briefcase" /></span>
    <span className="cz-ring__who"><b>{t('eco.preview.caller')}</b><span>{t('eco.preview.ring')}</span></span>
    <button type="button" className="cz-ring__hear" onClick={() => sfx(r.sfx)} aria-label={t('eco.act.hear')}><Icon n="sound" size={18} />{t('eco.act.hear')}</button>
  </div>;
}
export function PostPreview({ s, tryOn }: { s: Save; tryOn?: Try }) {
  const t = useT(); const fr = look('frame', s, tryOn); const ink = pv('ink', s, tryOn);
  return <div className="cz-post" style={(fr.source === 'standard' ? {} : frameCSS(legacy(fr))) as CSSProperties}>
    <p className="cz-post__who" dir="auto"><b>{s.nick || t('g.home.noName')}</b> · {t('eco.preview.post')}</p>
    <p className="cz-post__txt">{t('eco.preview.hed')}. {t('eco.preview.sub')}</p>
    <span className="g-stamp cz-post__stamp" style={{ ['--sc' as string]: ink.c }}>{t('eco.preview.filed')}</span>
  </div>;
}
const FACE: Record<HeadlineFace, string> = { wood: 'var(--f-display)', serif: 'Georgia, "Times New Roman", serif', slab: 'var(--f-cond)', stencil: 'var(--f-cond)', mono: 'var(--f-mono)' };
const hedStyle = (face: HeadlineFace, upper?: boolean, ink?: string): CSSProperties => ({ fontFamily: FACE[face], textTransform: upper ? 'uppercase' : 'none', letterSpacing: face === 'stencil' ? '.08em' : face === 'mono' ? '-.02em' : undefined, fontWeight: face === 'serif' ? 700 : 900, ...(ink ? { color: ink } : {}) });
/** The results front page headline in the chosen font. */
export function HeadlinePreview({ s, tryOn }: { s: Save; tryOn?: Try }) {
  const t = useT(); const h = pv('headline', s, tryOn);
  return <div className="cz-hd"><span className="cz-hd__k">{paperName(s)} · {t('eco.preview.stamp')}</span><h3 className="cz-hd__h" style={hedStyle(h.face, h.upper, h.ink)} data-face={h.face}>{t('eco.preview.hedline')}</h3><p className="cz-hd__s">{t('eco.preview.sub')}</p></div>;
}
/** Home's film stage at night under the chosen lamp. */
export function LampPreview({ s, tryOn }: { s: Save; tryOn?: Try }) {
  const t = useT(); const l = pv('lamp', s, tryOn);
  return <div className={'cz-lamp cz-lamp--' + l.warmth} style={{ ['--lamp-glow' as string]: l.glow, ['--lamp-pool' as string]: l.pool }}>
    <span className="cz-lamp__shade" aria-hidden="true" /><span className="cz-lamp__pool" aria-hidden="true" /><span className="cz-lamp__desk" aria-hidden="true"><i /><i /><i /></span>
    <b className="cz-lamp__t">{t('eco.preview.lamp')}</b>
  </div>;
}
/** One ring per source: tap a source to hear who's calling. */
export function RingPackPreview({ s, tryOn }: { s: Save; tryOn?: Try }) {
  const t = useT(); const r = pv('ringpack', s, tryOn); const single = pv('ringtone', s, tryOn);
  const std = look('ringpack', s, tryOn).source === 'standard';
  return <div className="cz-rp">{(['kitman', 'barber', 'agent', 'spotter', 'physio', 'leak'] as const).map((src) => {
    const cue = std ? single.sfx : r.rings[src] || r.fallback;
    return <button key={src} type="button" className={'cz-rp__b g-src g-src--' + src} onClick={() => sfx(cue as 'phone.ring')} aria-label={t('src.' + src) + ' · ' + t('eco.act.hear')}><Icon n={SRC_ICON[src]} size={18} /><small>{t('src.' + src)}</small></button>;
  })}</div>;
}
/** Three feed rows in the chosen skin. */
export function FeedPreview({ s, tryOn }: { s: Save; tryOn?: Try }) {
  const t = useT(); const f = pv('feedskin', s, tryOn);
  return <div className={'cz-feed cz-feed--' + f.style} style={{ ['--fs-rule' as string]: f.rule, ['--fs-bg' as string]: f.bg, ['--fs-ink' as string]: f.ink }}>
    <b className="cz-feed__h">{t('eco.preview.feed')}</b>
    {[t('eco.preview.hed'), t('eco.preview.sub'), t('eco.preview.post')].map((x, k) => <p key={k} className="cz-feed__row" dir="auto"><i />{x}</p>)}
  </div>;
}
/** The newsroom's shared front page. */
export function FrontPagePreview({ s, tryOn }: { s: Save; tryOn?: Try }) {
  const t = useT(); const f = pv('frontpage', s, tryOn);
  return <div className={'cz-fp cz-fp--' + f.rule} style={{ ['--fp-paper' as string]: f.paper, ['--fp-ink' as string]: f.ink, ['--fp-kick' as string]: f.kicker, ['--fp-cols' as string]: String(f.cols) }}>
    <p className="cz-fp__mast" dir="auto">{paperName(s)}</p>
    <h3 className="cz-fp__h" style={hedStyle(f.hed, true)}>{t('eco.preview.hedline')}</h3>
    <div className="cz-fp__cols" aria-hidden="true">{Array.from({ length: f.cols }, (_, k) => <span key={k}><i /><i /><i /></span>)}</div>
    <small className="cz-fp__k">{t('eco.preview.front')}</small>
  </div>;
}
/** The catchphrase stamp slammed on a published call; tap to hear it land. */
export function CatchPreview({ s, tryOn }: { s: Save; tryOn?: Try }) {
  const t = useT(); const it = look('catchphrase', s, tryOn); const d = catchDef(it);
  const [k, setK] = useState(0);
  return <button type="button" className="cz-cpstage" onClick={() => { setK((x) => x + 1); sfx(TONE_SFX[d.tone]); }} aria-label={t('cp.ui.hear')}>
    <span className="cz-cpstage__post" aria-hidden="true"><b>{s.nick || t('g.home.noName')}</b><i /><i /></span>
    <span key={k} className="cz-cpstage__slam"><CatchLine s={s} tryOn={tryOn} big /></span>
    <small className="cz-cpstage__hint"><Icon n="sound" size={13} />{t('cp.ui.hear')} · {t('cp.ui.tone.' + d.tone)}</small>
  </button>;
}
/** Which preview a tab shows. The stage's desk colours follow the desk theme being tried. */
export function Stage({ tab, s, tryOn }: { tab: Kind; s: Save; tryOn?: Try }) {
  const t = useT();
  const th = look('theme', s, tryOn); const d = th.preview.k === 'theme' ? th.preview : null;
  const deskVars = d?.desk ? { ['--desk' as string]: d.desk[0], ['--desk-2' as string]: d.desk[1], ['--desk-3' as string]: d.desk[2] } : {};
  const paperCls = d?.paper ? ' cz-stage--paper-' + th.id : '';
  let body: ReactNode;
  // The kind registry says which preview draws a kind (lib/kinds.ts `preview`); a new kind needs one entry here.
  switch (kindDef(tab).preview) {
    case 'post': body = <PostPreview s={s} tryOn={tryOn} />; break;
    case 'sharecard': body = <ShareCardPreview s={s} tryOn={tryOn} />; break;
    case 'presspass': body = <PressPassPreview s={s} tryOn={tryOn} />; break;
    case 'masthead': body = <MastheadPreview s={s} tryOn={tryOn} />; break;
    case 'poster': body = <PosterPreview s={s} tryOn={tryOn} />; break;
    case 'ring': body = <RingPreview s={s} tryOn={tryOn} />; break;
    case 'headline': body = <HeadlinePreview s={s} tryOn={tryOn} />; break;
    case 'lamp': body = <LampPreview s={s} tryOn={tryOn} />; break;
    case 'ringpack': body = <RingPackPreview s={s} tryOn={tryOn} />; break;
    case 'feed': body = <FeedPreview s={s} tryOn={tryOn} />; break;
    case 'frontpage': body = <FrontPagePreview s={s} tryOn={tryOn} />; break;
    case 'catch': body = <CatchPreview s={s} tryOn={tryOn} />; break;
    default: body = <BylinePreview s={s} tryOn={tryOn} />;
  }
  return <div className={'cz-stage' + paperCls} style={deskVars} aria-label={t('eco.preview.desk')}>
    <div className="cz-stage__in">{body}</div>
  </div>;
}

// ---------------------------------------------------------------- tiles
export function Thumb({ it, s }: { it: Item; s: Save }) {
  const t = useT();
  const lc = legacy(it);
  if (lc && !isStandard(it.id)) return <CosSwatch c={lc} nick={s.nick} size="sm" />;
  const p = it.preview;
  switch (p.k) {
    case 'byline': return <span className="cz-th cz-th--by" style={{ background: p.bg, color: p.ink, ['--acc' as string]: p.accent }} aria-hidden="true"><i /><b /></span>;
    case 'masthead': return <span className="cz-th cz-th--mh" style={{ background: p.bg, color: p.ink, fontFamily: p.face === 'cond' ? 'var(--f-cond)' : p.face === 'mono' ? 'var(--f-mono)' : 'var(--f-display)' }} aria-hidden="true">{p.orn || 'Aa'}</span>;
    case 'presspass': return <span className="cz-th cz-th--pp" style={{ background: `linear-gradient(145deg, ${p.c1}, ${p.c2})`, color: p.ink, ['--stripe' as string]: p.stripe || 'transparent' }} aria-hidden="true"><b>{initialsOf(s.nick)}</b></span>;
    case 'poster': return <span className="cz-th cz-th--po" style={{ ['--c' as string]: p.c, ['--c2' as string]: p.c2 }} data-style={p.style} aria-hidden="true" />;
    case 'sharecard': return <span className="cz-th cz-th--sc" style={{ background: p.paper, color: p.ink, ['--acc' as string]: p.accent }} aria-hidden="true"><i /><b /><b /></span>;
    case 'paper': return <span className="cz-th cz-th--paper" aria-hidden="true"><Icon n="pen" size={20} /></span>;
    case 'gold': return <span className="cz-th cz-th--gold" aria-hidden="true"><Icon n="crown" size={22} /></span>;
    case 'frame': return <span className="cz-th cz-th--std" aria-hidden="true"><i style={{ border: '2px solid ' + p.c }} /></span>;
    case 'ink': return <span className="cz-th cz-th--ink" aria-hidden="true"><b style={{ color: p.c, borderColor: p.c }}>{t('stamp.filed')}</b></span>;
    case 'theme': return <span className="cz-th" style={{ background: p.desk ? `linear-gradient(135deg, ${p.desk[0]}, ${p.desk[2]})` : undefined }} aria-hidden="true"><i className="cz-th__sheet" /></span>;
    case 'ringtone': return <span className="cz-th cz-th--std" aria-hidden="true"><Icon n="phone" size={18} /></span>;
    case 'flair': return <span className="cz-th cz-th--std" aria-hidden="true"><Icon n="me" size={18} /></span>;
    case 'headline': return <span className="cz-th cz-th--hd" style={{ ...hedStyle(p.face, p.upper, p.ink) }} aria-hidden="true">Aa</span>;
    case 'lamp': return <span className="cz-th cz-th--lamp" style={{ ['--lamp-glow' as string]: p.glow, ['--lamp-pool' as string]: p.pool }} aria-hidden="true"><i /></span>;
    case 'ringpack': return <span className="cz-th cz-th--std" aria-hidden="true"><Icon n="phone" size={16} /><b className="cz-th__n">{Object.keys(p.rings).length || 1}</b></span>;
    case 'feedskin': return <span className="cz-th cz-th--fs" style={{ background: p.bg, color: p.ink, ['--rule' as string]: p.rule }} aria-hidden="true"><i /><i /><i /></span>;
    case 'frontpage': return <span className="cz-th cz-th--fp" style={{ background: p.paper, color: p.ink, ['--kick' as string]: p.kicker, ['--cols' as string]: String(p.cols) }} aria-hidden="true"><b />{Array.from({ length: p.cols }, (_, k) => <i key={k} />)}</span>;
    case 'catchphrase': return <span className={'cz-th cz-th--cp cz-cp--' + p.tone} style={{ ['--cp' as string]: p.c }} aria-hidden="true"><b dir="auto">{it.id === CUSTOM_ID && s.desk?.cp?.text ? s.desk.cp.text : t(p.key)}</b></span>;
  }
}
export interface TileProps { it: Item; s: Save; on: boolean; owned: boolean; selected: boolean; price: Price | null; was?: Price; onPick: () => void; tabIndex: number }
export function Tile({ it, s, on, owned, selected, price, was, onPick, tabIndex }: TileProps) {
  const t = useT();
  const name = itemName(t, it);
  const state = on ? t('eco.state.on') : owned ? t('eco.state.owned') : price ? priceText(price) : t('eco.state.earn');
  return <button type="button" className={'cz-tile' + (on ? ' is-on' : '') + (owned ? ' is-owned' : '') + (selected ? ' is-sel' : '') + ' cz-tile--' + it.rarity} aria-pressed={selected} aria-label={name + ' · ' + state} onClick={onPick} tabIndex={tabIndex} data-tile>
    <span className="cz-tile__art"><Thumb it={it} s={s} /></span>
    <span className="cz-tile__name" dir="auto">{name}</span>
    <span className="cz-tile__meta">
      {on ? <span className="cz-tile__on"><Icon n="check" size={11} />{t('eco.state.on')}</span>
        : owned ? <span className="cz-tile__owned">{t('eco.state.owned')}</span>
          : price ? <PriceTag price={price} was={was} /> : <span className="cz-tile__earn">{t('eco.source.' + it.source)}</span>}
    </span>
    {it.rarity !== 'common' && <i className="cz-tile__rar" title={t('eco.rarity.' + it.rarity)} />}
    {it.source === 'earned' && !owned && <i className="cz-tile__lock" aria-hidden="true"><Icon n="lock" size={11} /></i>}
  </button>;
}

// ---------------------------------------------------------------- sheets
export function Sheet({ label, onClose, children, wide }: { label: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; el?.querySelector<HTMLElement>('input, button')?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [onClose]);
  return <div className="cz-scrim" onClick={onClose}>
    <div ref={ref} className={'cz-sheet' + (wide ? ' cz-sheet--wide' : '')} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>{children}</div>
  </div>;
}
export function GiftSheet({ it, onClose, onSent }: { it: Item; onClose: () => void; onSent: (to: string, queued: boolean) => void }) {
  const t = useT(); const s = useSave();
  const [to, setTo] = useState(''); const [note, setNote] = useState(''); const [err, setErr] = useState('');
  const dir = giftTargets();
  const n = it.price.credits || 0;
  const send = () => {
    const r = gift(it.id, to, note);
    if (!r.ok) { setErr(t('eco.gift.' + (r.error === 'bad' ? 'bad' : r.error === 'self' ? 'self' : r.error === 'short' ? 'short' : 'bad'))); sfx('bad'); return; }
    sfx('coin'); onSent(to.toUpperCase(), !dir.length); onClose();
  };
  return <Sheet label={t('eco.gift.hed', { n: itemName(t, it) })} onClose={onClose}>
    <div className="cz-sheet__head"><Thumb it={it} s={s} /><div><h2>{t('eco.gift.hed', { n: itemName(t, it) })}</h2><p>{t('eco.gift.dek')}</p></div></div>
    {dir.length > 0 && <div className="cz-field"><span className="cz-field__l">{t('eco.gift.pick')}</span>
      <div className="cz-chips">{dir.map((x) => <button key={x.code} type="button" className={'g-chip' + (to === x.code ? ' g-chip--gold' : '')} onClick={() => setTo(x.code)}>{x.name}</button>)}</div></div>}
    <label className="cz-field"><span className="cz-field__l">{t('eco.gift.code')}</span>
      <input className="cz-input cz-input--code" value={to} onChange={(e) => { setTo(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6)); setErr(''); }} placeholder="ABC234" autoCapitalize="characters" autoComplete="off" spellCheck={false} inputMode="text" maxLength={6} />
      <small>{t('eco.gift.codeHint')}</small></label>
    <label className="cz-field"><span className="cz-field__l">{t('eco.gift.note')}</span><input className="cz-input" value={note} onChange={(e) => setNote(e.target.value.slice(0, 80))} maxLength={80} /></label>
    {err && <p className="cz-err" role="alert">{err}</p>}
    <div className="cz-sheet__acts">
      <GBtn kind="dark" size="sm" onClick={onClose}>{t('common.cancel')}</GBtn>
      <GBtn kind="gold" size="sm" disabled={!giftable(it) || to.length !== 6 || (s.wallet?.credits || 0) < n} onClick={send}><Icon n="gift" />{t('eco.gift.send', { n })}</GBtn>
    </div>
  </Sheet>;
}
export function PacksSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const on = creditPacksOnSale();
  const [busy, setBusy] = useState('');
  return <Sheet label={t('eco.packs.hed')} onClose={onClose} wide>
    <div className="cz-sheet__head"><CreditIcon size={34} /><div><h2>{t('eco.packs.hed')}</h2><p>{t('eco.packs.dek')}</p></div></div>
    <div className="cz-packs">{CREDIT_PACKS.map((p) => { const b = packBonus(p); return <button key={p.id} type="button" className={'cz-pack' + (p.tag ? ' is-gold' : '')} disabled={!on || !!busy} onClick={() => { setBusy(p.id); buyCreditPack(p.id).finally(() => setBusy('')); }}>
      <b className="g-num"><CreditIcon size={18} />{p.credits.toLocaleString('en')}</b>
      <span className="cz-pack__p">{p.price}</span>
      <small>{p.tag === 'gold' ? t('eco.packs.gold') : b > 0 ? t('eco.packs.bonus', { n: b }) : ' '}</small>
    </button>; })}</div>
    <p className="g-fine">{on ? t('eco.packs.regional') : t('eco.packs.soon')}</p>
    <div className="cz-earnlist"><h3>{t('eco.earn.hed')}</h3><ul>{(t.list('eco.earn.list') as string[]).map((x, k) => <li key={k}><Icon n="check" size={14} />{x}</li>)}</ul></div>
    <div className="cz-sheet__acts"><GBtn kind="dark" size="sm" onClick={onClose}>{t('common.close')}</GBtn></div>
  </Sheet>;
}

// ---------------------------------------------------------------- for the Me lane: <CustomizeLink/>
/** A chunky link to "Your desk". Drop it in Me's link list (or anywhere): it navigates through the shared nav. */
export function CustomizeLink({ kind = 'dark', size = '' }: { kind?: 'dark' | 'gold' | 'paper' | ''; size?: '' | 'sm' | 'lg' }) {
  const t = useT();
  return <GBtn kind={kind} size={size} sound="open" onClick={() => navTo({ n: 'customize' })}><Icon n="pen" size={22} />{t('eco.link')}</GBtn>;
}
export const myCode = referralCode;
