// Lens (CONCEPT4.md §2): your profile, and everything your account owns. Five tabs, one obvious action on each:
//   Profile   who you are on the timeline: handle, rank and the Rep bar, Level, followers (rolling, a 30-day graph), the
//             hot streak, boss records, medals and trophies, records, and the grid of your right Drops.   → Share my line
//   Sponsors  the running deal pinned with its running total and the brand's own lines, offers from the DMs, standing
//             stars per brand, past deals (CONCEPT4 §4; lib/deals.ts).                                    → Take the deal
//   Looks     the ONE shop: wallpapers, phone themes, Drop cards, frames, ringtones, catchphrases; a live preview on
//             your own phone; coins and credits apart; Gold in one card; the starter bundle once, quietly.  → Put it on / Buy
//   Season    the 30-tier track, free and Gold lanes, claim with a reveal (lib/season.ts).                → Claim
//   Files     the 12 Secret files: sealed until earned, then opened with a reveal (lib/lens.ts).           → Open it
// Every number says what it is (RULES4 §4). Nothing here changes a score. Styles: styles/lens.css.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT, num, fmtDate, type T } from '../lib/i18n';
import { useSave, type Save } from '../lib/save';
import { sfx } from '../lib/sfx';
import { toast, onShared, ACH_IDS } from '../lib/meta';
import { levelOfSave, rankHeld, rankIndex, RANKS, REP, nextRank, underReview, hotMult, SECRET_FILE_XP, type RankId } from '../lib/economy';
import { bylineOf } from '../lib/byline';
import { medals } from '../lib/awards';
import { followerSeries, noteToday, dropsOf, bossRecords, unopenedFiles, fileOpened, openFile, type DropRec } from '../lib/lens';
import {
  syncSponsors, active as activeDeals, offersFor, accept, decline, slotsFor, brandsView, dealLines, history as dealHistory, dealDaysLeft, rateCard, dealState, BRANDS,
  type Active, type Offer, type Brand,
} from '../lib/deals';
import { looks4, item, onSale, priceNow, isStandard, KINDS4, GOLD_CREDITS, type Item, type Kind4 } from '../lib/catalog';
import { equipped, owns, buy, equipItem, balance, shortBy, starterOffer, markStarterSeen, buyStarter, goldItemId, type Currency } from '../lib/wallet';
import { trackView, claimReward, ensureSeason, isGold, type Reward } from '../lib/season';
import { syncEarned } from '../lib/earned';
import { catchphraseOf, catchphraseColor, catchDef, setCustomCatchphrase, customUnlocked, customLine, cleanLine, CUSTOM_MAX, TONE_SFX } from '../lib/catchphrase';
import { renderCpCard, postToX, X_TAGS } from '../lib/share';
import { prefersReducedMotion } from '../lib/motion';
import { Icon, GBtn, confetti } from '../ui/game';
import { Pop, Count, Stamp, Sheet } from '../ui/juice';
import { RivalMark } from '../ui/connect';
import {
  Tile, Thumb, CreditIcon, PacksSheet, itemName, CatchLine, DropCard, DropFace, Avatar, PhoneMock, CallMock, BrandMark, type Try,
} from '../ui/customize';
import type { Chrome } from '../App';
import '../styles/lens.css';

export type LensTab = 'profile' | 'sponsors' | 'looks' | 'season' | 'files';
export const LENS_TABS: LensTab[] = ['profile', 'sponsors', 'looks', 'season', 'files'];
const TAB_KEY = 't1.lens.tab';
const readTab = (): LensTab | null => { try { const x = sessionStorage.getItem(TAB_KEY) as LensTab | null; return x && LENS_TABS.includes(x) ? x : null; } catch { return null; } };
const keepTab = (x: LensTab) => { try { sessionStorage.setItem(TAB_KEY, x); } catch { /* per-viewer convenience only */ } };
const fmt = (n: number) => Math.round(n).toLocaleString('en');
const rankName = (t: T, r: string) => t('cn.tier.' + r);

/** Lens, the app. `tab` opens a tab (Me → profile, Pass → season, Customize → looks); otherwise the last one viewed. */
export function LensScreen({ tab: want, ...chrome }: Chrome & { tab?: LensTab }) {
  const t = useT();
  const s = useSave();
  const [tab, setTab0] = useState<LensTab>(() => want || readTab() || 'profile');
  const setTab = (x: LensTab) => { setTab0(x); keepTab(x); };
  const [packs, setPacks] = useState(false);
  useEffect(() => { if (want) setTab(want); }, [want]); // eslint-disable-line react-hooks/exhaustive-deps
  // On open: today's follower point, a week that turned while the app was closed, earned looks.
  useEffect(() => { noteToday(); syncSponsors(); ensureSeason(); syncEarned(); }, []);

  const tv = trackView(s);
  const badges: Partial<Record<LensTab, number>> = {
    sponsors: offersFor(s).length,
    season: tv.ready,
    files: unopenedFiles(s).length,
  };
  return <div className="g-screen ln" data-tab={tab}>
    <header className="ln-head">
      <h1 className="ln-head__t">{t('l4.app')}</h1>
      <Wallet onGet={() => setPacks(true)} />
    </header>
    <nav className="ln-tabs" aria-label={t('l4.app')}>
      {LENS_TABS.map((x) => <button key={x} type="button" className="ln-tabs__b" aria-current={tab === x ? 'page' : undefined} onClick={() => { sfx('ui.tap'); setTab(x); }}>
        {t('l4.tabs.' + x)}{badges[x] ? <b className="ln-tabs__n" aria-label={String(badges[x])}>{badges[x]! > 9 ? '9+' : badges[x]}</b> : null}
      </button>)}
    </nav>
    <div className="ln-body" key={tab}>
      {tab === 'profile' && <Profile s={s} onPlay={() => chrome.go({ n: 'daily' })} />}
      {tab === 'sponsors' && <Sponsors s={s} />}
      {tab === 'looks' && <Looks s={s} onPacks={() => setPacks(true)} />}
      {tab === 'season' && <SeasonTrack s={s} onPacks={() => setPacks(true)} />}
      {tab === 'files' && <Files s={s} />}
    </div>
    {packs && <PacksSheet onClose={() => setPacks(false)} />}
  </div>;
}

// ---------------------------------------------------------------- the wallet: coins and credits, never confused
function Wallet({ onGet }: { onGet: () => void }) {
  const t = useT(); const s = useSave();
  return <div className="ln-wallet" role="group" aria-label={t('l4.wallet.aria')}>
    <span className="ln-wallet__p" title={t('l4.wallet.coinsD')}><span className="g-coin" aria-hidden="true" /><Count n={s.credits} format={fmt} /><small>{t('l4.wallet.coins')}</small></span>
    <button type="button" className="ln-wallet__p ln-wallet__p--c" title={t('l4.wallet.creditsD')} onClick={() => { sfx('sheet.open'); onGet(); }} aria-label={t('l4.lk.packs')}>
      <CreditIcon size={15} /><Count n={s.wallet?.credits || 0} format={fmt} /><small>{t('l4.wallet.credits')}</small><Icon n="arrow" size={12} className="ln-wallet__go" />
    </button>
  </div>;
}

// ================================================================ Profile
function Profile({ s, onPlay }: { s: Save; onPlay: () => void }) {
  const t = useT();
  const b = bylineOf(s);
  const rank = rankHeld(b.rep, b.rank || 0);
  const lv = levelOfSave(s);
  const gold = isGold(s);
  const drops = dropsOf(s);
  const [open, setOpen] = useState<DropRec | null>(null);
  const share = () => {
    const cp = catchphraseOf(s), dc = equipped('dropcard', s).preview;
    const style = dc.k === 'dropcard' ? { paper: dc.bg, ink: dc.ink, accent: dc.accent } : undefined;
    onShared();
    void postToX(cp.text + ' · @' + (s.nick || 'TierOne'), () => renderCpCard({ phrase: cp.text, kicker: rankName(t, rank), line: t('l4.p.dropsN', { n: drops.length }), foot: t('l4.p.followers') + ' ' + fmt(b.followers), by: '@' + (s.nick || 'TierOne'), color: catchphraseColor(s), rtl: t.rtl, style }), X_TAGS);
  };
  return <div className="ln-prof">
    <section className="ln-id" aria-label={t('l4.tabs.profile')}>
      <Avatar s={s} size={84} />
      <div className="ln-id__b">
        <p className="ln-id__h" dir="auto">@{s.nick || t('l4.p.noHandle')}</p>
        <p className="ln-id__r">
          <span className={'ln-rank ln-rank--' + rank}>{rank === 'tierone' && <Icon n="crown" size={14} />}{rankName(t, rank)}<span className="sr-only"> · {t('l4.p.rank')}</span></span>
          <span className="ln-id__lv">{t('l4.p.level', { n: lv.n })}</span>
          {gold && <span className="ln-gold" title={t('l4.p.gold')}><Icon n="star" size={12} />{t('l4.se.gold')}</span>}
        </p>
        <CatchLine s={s} className="ln-id__cp" />
      </div>
    </section>
    <GBtn kind="gold" size="sm" className="ln-share" label={t('l4.p.shareAria')} onClick={share}><Icon n="share" size={18} />{t('l4.p.share')}</GBtn>

    <Followers s={s} />
    <RankBar rep={b.rep} kept={b.rank || 0} />
    <section className="ln-sec ln-lv">
      <div className="ln-row"><b className="ln-big2">{t('l4.p.level', { n: lv.n })}</b><span className="ln-quiet">{t('l4.p.toNext', { a: fmt(lv.into), b: fmt(lv.need), n: lv.n + 1 })}</span></div>
      <span className="ln-meter" role="progressbar" aria-valuemin={0} aria-valuemax={lv.need} aria-valuenow={lv.into} aria-label={t('l4.p.level', { n: lv.n })}><i style={{ width: lv.pct + '%' }} /></span>
    </section>
    <section className="ln-sec ln-hot">
      <span className={'ln-hot__ic' + (b.hot > 0 ? ' is-on' : '')} aria-hidden="true"><Icon n="flame" size={22} /></span>
      <div><b>{t('l4.p.hot')}{b.hot > 0 && <> · {t('l4.p.hotOn', { n: b.hot })}</>}</b>
        <p className="ln-quiet">{b.hot > 0 ? t('l4.p.hotMult', { n: Math.round((hotMult(b.hot + 1) - 1) * 100) }) : t('l4.p.hotNone')}</p></div>
    </section>

    <Drops s={s} drops={drops} onOpen={setOpen} onPlay={onPlay} />
    <Bosses s={s} />
    <Honours s={s} />
    <Records s={s} />
    {open && <DropSheet s={s} d={open} onClose={() => setOpen(null)} />}
    <p className="ln-quiet ln-foot">{t('l4.p.kept')}</p>
  </div>;
}

function Followers({ s }: { s: Save }) {
  const t = useT();
  const series = useMemo(() => followerSeries(s, 30), [s]);
  const now = bylineOf(s).followers, then = series[0]?.n ?? now, d = now - then;
  const W = 300, H = 64, max = Math.max(...series.map((p) => p.n), 1), min = Math.min(...series.map((p) => p.n), 0);
  const y = (n: number) => H - 4 - ((n - min) / Math.max(1, max - min)) * (H - 10);
  const pts = series.map((p, k) => [(k / (series.length - 1)) * W, y(p.n)] as const);
  const line = pts.map(([x, yy], k) => (k ? 'L' : 'M') + x.toFixed(1) + ' ' + yy.toFixed(1)).join(' ');
  return <section className="ln-sec ln-fol" aria-label={t('l4.p.graph')}>
    <p className="ln-fol__n"><Count n={now} format={fmt} className="ln-big" /><span className="ln-fol__l">{t('l4.p.followers')}</span></p>
    <p className={'ln-fol__d' + (d > 0 ? ' is-up' : d < 0 ? ' is-down' : '')}>{d > 0 ? t('l4.p.up', { n: fmt(d) }) : d < 0 ? t('l4.p.down', { n: fmt(-d) }) : t('l4.p.flat')}</p>
    <figure className="ln-graph">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={t('l4.p.graph') + ': ' + fmt(then) + ' → ' + fmt(now)}>
        <path d={line + ` L${W} ${H} L0 ${H} Z`} className="ln-graph__area" />
        <path d={line} className="ln-graph__line" vectorEffect="non-scaling-stroke" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" className="ln-graph__dot" />
      </svg>
      <figcaption><span>{t('l4.p.ago')} · {fmt(then)}</span><span>{t('l4.p.today')}</span></figcaption>
    </figure>
  </section>;
}

/** Rep 0–100 with the five rank bars marked and named; the rank you hold stays even when Rep dips (RULES4 §3). */
function RankBar({ rep, kept }: { rep: number; kept: number }) {
  const t = useT();
  const held = rankHeld(rep, kept), nx = nextRank(rep), review = underReview(rep, kept);
  const bar = RANKS[rankIndex(held)][1];
  return <section className="ln-sec ln-rk">
    <div className="ln-row"><b className="ln-big2">{t('l4.p.rep', { n: rep })}</b><span className="ln-quiet">{review ? t('l4.p.review', { n: bar }) : nx ? t('l4.p.next', { r: rankName(t, nx.id), n: nx.at }) : t('l4.p.top')}</span></div>
    <div className="ln-rk__bar" role="meter" aria-valuemin={REP.min} aria-valuemax={REP.max} aria-valuenow={rep} aria-label={t('l4.p.rep', { n: rep })}>
      <i className="ln-rk__fill" style={{ width: rep + '%' }} />
      {RANKS.map(([id, at]) => <span key={id} className={'ln-rk__tick' + (rankIndex(id) <= rankIndex(held) ? ' is-held' : '') + (id === held ? ' is-now' : '')} style={{ insetInlineStart: at + '%' }}>
        <small>{id === 'tierone' && <Icon n="crown" size={11} />}{rankName(t, id as RankId)}</small>
      </span>)}
    </div>
  </section>;
}

function Drops({ s, drops, onOpen, onPlay }: { s: Save; drops: DropRec[]; onOpen: (d: DropRec) => void; onPlay: () => void }) {
  const t = useT();
  return <section className="ln-sec ln-drops" aria-labelledby="ln-drops-h">
    <div className="ln-row"><h2 id="ln-drops-h" className="ln-h">{t('l4.p.drops')}</h2>{drops.length > 0 && <span className="ln-quiet">{t('l4.p.dropsN', { n: drops.length })}</span>}</div>
    {drops.length ? <ul className="ln-grid">{drops.map((d) => { const it = item(d.card); const p = it && it.preview.k === 'dropcard' ? it.preview : equipped('dropcard', s).preview;
      return <li key={d.key}><Pop className="ln-grid__b" onTap={() => onOpen(d)} sound="ui.pop" label={d.player + ' · ' + t('out4.' + ['signs', 'elsewhere', 'stays'][d.o])}>
        {p.k === 'dropcard' && <DropFace p={p} o={d.o} cp={d.cp} player={d.player} club={d.club} scoop={d.scoop} />}
      </Pop></li>; })}</ul>
      : <div className="ln-empty"><DropCard s={s} o={0} cp={catchphraseOf(s).text} player="—" className="ln-empty__card" /><p>{t('l4.p.dropsNone')}</p><button type="button" className="ln-link" onClick={onPlay}>{t('l4.p.toBlurt')}<Icon n={t.rtl ? 'back' : 'arrow'} size={14} /></button></div>}
  </section>;
}
function DropSheet({ s, d, onClose }: { s: Save; d: DropRec; onClose: () => void }) {
  const t = useT();
  const it = item(d.card); const p = it && it.preview.k === 'dropcard' ? it.preview : undefined;
  useEffect(() => { sfx('drop'); }, []);
  return <Sheet open onClose={onClose} label={d.player}>
    <div className="ln-dsheet">
      <DropCard s={s} p={p} o={d.o} cp={d.cp} player={d.player} club={d.club} scoop={d.scoop} className="ln-dsheet__card"
        foot={<span>{t('l4.drop.mode.' + d.mode)} · {t('l4.drop.day', { n: d.day })} · {fmtDate(d.at, t.lang, { day: 'numeric', month: 'short' })}</span>} />
      {d.scoop && <Stamp text={t('l4.drop.scoop')} tone="scoop" size="sm" sound={false} />}
      <GBtn kind="dark" size="sm" onClick={onClose}>{t('common.done')}</GBtn>
    </div>
  </Sheet>;
}

function Bosses({ s }: { s: Save }) {
  const t = useT();
  const list = bossRecords(s);
  return <section className="ln-sec" aria-labelledby="ln-boss-h">
    <h2 id="ln-boss-h" className="ln-h">{t('l4.p.bosses')}</h2>
    <ul className="ln-list">{list.map((x) => { const h = t('rival.' + x.id);
      return <li key={x.id} className={'ln-boss' + (x.met ? (x.w > x.l ? ' is-won' : x.w < x.l ? ' is-lost' : '') : ' is-unmet')}>
        <RivalMark id={x.id} size={34} />
        <span dir="auto">{!x.met ? t('l4.p.unmet', { h }) : x.w > x.l ? t('l4.p.beat', { h, w: x.w, l: x.l }) : x.w < x.l ? t('l4.p.lost', { h, w: x.w, l: x.l }) : t('l4.p.level4', { h, w: x.w, l: x.l })}</span>
      </li>; })}</ul>
  </section>;
}
function Honours({ s }: { s: Save }) {
  const t = useT();
  const m = medals(s);
  const parts = ([['m1', m.gold], ['m2', m.silver], ['m3', m.bronze]] as const).filter(([, n]) => n > 0).map(([k, n]) => t('l4.p.' + k, { n }));
  const got = ACH_IDS.filter((id) => s.ach[id]).sort((a, b) => s.ach[b] - s.ach[a]);
  return <section className="ln-sec ln-hon">
    <div><h2 className="ln-h">{t('l4.p.medals')}</h2><p className={parts.length ? 'ln-medals' : 'ln-quiet'}>{parts.length ? parts.join(' · ') : t('l4.p.noMedals')}</p></div>
    <div><h2 className="ln-h">{t('l4.p.trophies')}</h2>
      {got.length ? <ul className="ln-troph">{got.map((id) => <li key={id}><Icon n="trophy" size={14} />{t('e4.sf.' + id + '.n')}</li>)}</ul> : <p className="ln-quiet">{t('l4.p.noTrophies')}</p>}</div>
  </section>;
}
function Records({ s }: { s: Save }) {
  const t = useT();
  const days = Object.values(s.daily);
  const rows: [string, string][] = [
    [t('l4.p.best'), t('l4.p.bestN', { n: num(days.reduce((m, d) => Math.max(m, d.total), 0)) })],
    [t('l4.p.t1'), fmt(days.filter((d) => d.tier === 'T1').length)],
    [t('l4.p.streak'), t('l4.p.streakN', { n: s.streak.best })],
    [t('l4.p.scoops'), fmt(days.reduce((n, d) => n + (d.ex || 0), 0))],
    [t('l4.p.windows'), fmt(s.stats.windows || 0)],
  ];
  return <section className="ln-sec" aria-labelledby="ln-rec-h">
    <h2 id="ln-rec-h" className="ln-h">{t('l4.p.records')}</h2>
    <dl className="ln-rec">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
  </section>;
}

// ================================================================ Sponsors (CONCEPT4 §4)
const lineText = (t: T, l: { key: string; v: Record<string, string | number> }) => t(l.key, { ...l.v, b: t(String(l.v.b)) });
const brandName = (t: T, b: Brand) => t('e4.sp.brand.' + b + '.n');

function Sponsors({ s }: { s: Save }) {
  const t = useT();
  const deals = activeDeals(s), offers = offersFor(s), full = deals.length >= slotsFor(s);
  const brands = brandsView(s), past = dealHistory(s);
  const first = !(s.stats.windows || 0);
  const take = (o: Offer) => { if (accept(o.id)) { sfx('deal'); confetti([brandAccent(o.brand), '#F4EFE4'], 60); toast('ach', t('l4.sp.taken', { b: brandName(t, o.brand) })); } else sfx('bad'); };
  const pass = (o: Offer) => { if (decline(o.id)) { sfx('ui.pop'); toast('info', t('l4.sp.declined')); } };
  return <div className="ln-sp">
    {deals.length ? deals.map((a) => <DealCard key={a.id} a={a} />)
      : <p className="ln-empty ln-empty--line">{first ? t('l4.sp.first') : t('l4.sp.none')}</p>}

    {offers.length > 0 && <section className="ln-sec" aria-labelledby="ln-off-h">
      <h2 id="ln-off-h" className="ln-h">{t('l4.sp.offers')}</h2>
      {offers.map((o, k) => <article key={o.id} className="ln-offer" style={{ ['--b' as string]: brandAccent(o.brand) }}>
        <div className="ln-offer__dm">
          <span className="ln-offer__av"><BrandMark brand={o.brand} size={18} /></span>
          <p className="ln-offer__msg" dir="auto"><b>{brandName(t, o.brand)}</b>{t(o.first ? 'e4.sp.offer.first' : 'e4.sp.offer.dm')}</p>
        </div>
        <Terms o={o} />
        <div className="ln-offer__acts">
          <GBtn kind="gold" size="sm" primary={k === 0} disabled={full} onClick={() => take(o)} sound={null}><Icon n="check" size={18} />{t('l4.sp.take')}</GBtn>
          <GBtn kind="ghost" size="sm" onClick={() => pass(o)}>{t('l4.sp.later')}</GBtn>
        </div>
        {full && <p className="ln-quiet">{t('l4.sp.full')}{slotsFor(s) < 2 ? ' ' + t('l4.sp.goldSlot') : ''}</p>}
      </article>)}
    </section>}

    <section className="ln-sec" aria-labelledby="ln-br-h">
      <h2 id="ln-br-h" className="ln-h">{t('l4.sp.brands')}</h2>
      <ul className="ln-brands">{brands.map((x) => <li key={x.def.id} className={x.open ? '' : 'is-shut'}>
        <span className="ln-brands__m"><BrandMark brand={x.def.id} size={20} ink={x.open ? undefined : 'currentColor'} /></span>
        <span className="ln-brands__b">
          <b>{t('e4.sp.tier.' + x.def.tier)} · {t('e4.sp.brand.' + x.def.id + '.what')}</b>
          <small>{x.active ? t('l4.sp.running') : x.offer ? t('l4.sp.waiting') : !x.open && x.next ? (x.next.followers > 0 && rankIndex(x.next.rank) > rankIndex(rankHeld(bylineOf(s).rep, bylineOf(s).rank || 0)) ? t('l4.sp.wants', { r: rankName(t, x.next.rank), f: fmt(x.next.followers) }) : x.next.followers > 0 ? t('l4.sp.wantsF', { f: fmt(x.next.followers) }) : t('l4.sp.wantsR', { r: rankName(t, x.next.rank) })) : x.cooling ? t('l4.sp.back', { d: fmtDate(x.cooling, t.lang, { weekday: 'short' }) }) : t('l4.sp.stars', { n: x.standing.stars })}</small>
        </span>
        <Stars n={x.standing.stars} label={t('l4.sp.stars', { n: x.standing.stars })} />
      </li>)}</ul>
      <p className="ln-quiet">{t('l4.sp.three')}</p>
    </section>

    {past.length > 0 && <section className="ln-sec" aria-labelledby="ln-hist-h">
      <h2 id="ln-hist-h" className="ln-h">{t('l4.sp.history')}</h2>
      <ul className="ln-list ln-hist">{past.slice(0, 8).map((d) => <li key={d.id + d.at}>
        <BrandMark brand={d.brand} size={16} />
        <span>{t('l4.sp.h.' + d.status, { n: fmt(d.paid + d.bonus) })}</span>
        <small>{fmtDate(d.at, t.lang, { day: 'numeric', month: 'short' })}</small>
      </li>)}</ul>
    </section>}
    <p className="ln-quiet ln-foot">{t('e4.sp.never')}</p>
  </div>;
}
const brandAccent = (b: Brand) => BRANDS.find((x) => x.id === b)?.accent || '#F2B632';
function Stars({ n, label }: { n: number; label: string }) {
  return <span className="ln-stars" role="img" aria-label={label}>{[0, 1, 2].map((k) => <svg key={k} viewBox="0 0 24 24" width="15" height="15" className={k < n ? 'is-on' : ''} aria-hidden="true"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" /></svg>)}</span>;
}
/** The rate card, the bonus, the term and the strike rule: every number an offer or a deal carries, labelled. */
function Terms({ o }: { o: Offer | Active }) {
  const t = useT();
  const rc = rateCard(o);
  const days = 'accepted' in o ? dealDaysLeft(o) : null;
  return <div className="ln-terms">
    <p className="ln-terms__k">{t('e4.sp.tier.' + o.tier)} · {o.long ? t('l4.sp.term.long') : o.term === 'week' ? t('l4.sp.term.week', { n: days ?? Math.max(1, Math.ceil((o.until - Date.now()) / 864e5)) }) : t('l4.sp.term.window')}</p>
    <div className="ln-rate" role="table" aria-label={t('l4.sp.rate')}>
      <span className="ln-rate__h" role="rowheader">{t('l4.sp.rate')}</span>
      {(['hint', 'post', 'drop'] as const).map((k, i) => <span key={k} className="ln-rate__c" role="cell"><small>{t('l4.sp.' + k)}</small><b>{o.rate[i]}</b></span>)}
    </div>
    <p className="ln-terms__l">{t('l4.sp.scoop', { n: rc.scoop })}{rc.pct > 0 && <> · {t('l4.sp.boost', { n: rc.pct, s: o.stars })}</>}</p>
    <p className="ln-terms__l">{t('l4.sp.bonus', { n: o.bonus })}</p>
    <p className="ln-terms__l">{o.warnFirst ? t('l4.sp.rule.one', { b: brandName(t, o.brand) }) : t('l4.sp.rule.n', { n: o.strikes, b: brandName(t, o.brand) })}</p>
  </div>;
}
function DealCard({ a }: { a: Active }) {
  const t = useT();
  const st = dealState(a), lines = dealLines(a);
  return <article className="ln-deal" style={{ ['--b' as string]: brandAccent(a.brand) }} aria-label={t('l4.sp.deal') + ': ' + brandName(t, a.brand)}>
    <header className="ln-deal__top"><BrandMark brand={a.brand} size={30} /><span className="ln-deal__k">{t('l4.sp.deal')}</span></header>
    <div className="ln-deal__paid">
      <span className="ln-quiet">{t('l4.sp.paid')}</span>
      <p><Count n={st.paid} format={fmt} className="ln-big" /><span className="ln-deal__u">{t('l4.wallet.coins')}</span></p>
      <p className={'ln-deal__bonus' + (st.clean ? '' : ' is-lost')}>{st.clean ? t('l4.sp.bonus', { n: a.bonus }) : t('l4.sp.bonusLost')}</p>
    </div>
    <div className="ln-deal__strikes">
      <span>{t('l4.sp.strikes')}</span>
      <span className="ln-pips" role="img" aria-label={t('l4.sp.strikesN', { a: a.p.strikes, b: a.strikes })}>{Array.from({ length: a.strikes }, (_, k) => <i key={k} className={k < a.p.strikes ? 'is-hit' : ''} />)}</span>
      <b>{t('l4.sp.strikesN', { a: a.p.strikes, b: a.strikes })}</b>
      {st.warnings > 0 && <small>{t('l4.sp.warnings', { n: st.warnings })}</small>}
    </div>
    <Terms o={a} />
    <div className="ln-deal__said">
      <h3>{t('l4.sp.said', { b: brandName(t, a.brand) })}</h3>
      {lines.length ? <ul>{lines.slice(0, 6).map((l, k) => <li key={k} className={'is-' + l.kind} dir="auto">{lineText(t, l)}</li>)}</ul> : <p className="ln-quiet">{t('l4.sp.saidNone')}</p>}
    </div>
  </article>;
}

// ================================================================ Looks (the one shop)
function Looks({ s, onPacks }: { s: Save; onPacks: () => void }) {
  const t = useT();
  const [kind, setKind] = useState<Kind4>('wallpaper');
  const [sel, setSel] = useState<string>(() => equipped('wallpaper', s).id);
  const now = Date.now();
  const items = useMemo(() => looks4(kind, now), [kind, now]);
  const it = item(sel) || items[0];
  const owned = !!it && owns(it.id, s);
  const on = !!it && equipped(it.kind, s).id === it.id;
  const tryOn: Try = it && !on ? { [it.kind]: it.id } : {};
  const price = it && onSale(it, now) ? priceNow(it, now) : null;
  const pick = (x: Item) => { sfx('ui.tap'); setSel(x.id); if (x.preview.k === 'ringtone') sfx(x.preview.sfx); };
  const pickKind = (k: Kind4) => { sfx('ui.tap'); setKind(k); setSel(equipped(k, s).id); };
  const doBuy = (cur: Currency) => {
    if (!it) return;
    const r = buy(it.id, cur, now);
    if (!r.ok) { sfx('bad'); return; }
    sfx(cur === 'credits' ? 'unlock' : 'coin');
    if (it.rarity === 'epic' || it.rarity === 'legendary') confetti(['#F2B632', '#F4EFE4', '#FF5A36'], 80);
    toast('ach', t('l4.lk.bought', { n: itemName(t, it) }));
  };
  const doEquip = () => {
    if (!it) return;
    if (on) { sfx('ui.pop'); equipItem(null, it.kind); setSel(equipped(it.kind).id); return; }
    if (equipItem(isStandard(it.id) ? null : it.id, it.kind)) { sfx(it.kind === 'catchphrase' ? TONE_SFX[catchDef(it).tone] : 'stamp.done'); toast('info', t('l4.lk.equipped', { n: itemName(t, it) })); }
  };
  const how = it ? (it.source === 'earned' ? t('l4.lk.earned') : it.source === 'gold' ? t('l4.lk.gold') : it.source === 'track' ? t('l4.lk.track') : '') : '';
  return <div className="ln-lk">
    <div className="ln-kinds" role="tablist" aria-label={t('l4.tabs.looks')}>
      {KINDS4.map((k) => <button key={k} type="button" role="tab" aria-selected={kind === k} className="ln-kinds__b" onClick={() => pickKind(k)}>{t('l4.lk.kinds.' + k)}</button>)}
    </div>
    <p className="ln-quiet ln-lk__dek">{t('l4.lk.dek.' + kind)}</p>

    <div className={'ln-stage ln-stage--' + kind} aria-live="polite">
      <LookStage kind={kind} s={s} tryOn={tryOn} />
      {!on && it && <span className="ln-stage__try">{t('l4.lk.trying')}</span>}
    </div>

    <div className="ln-tiles" role="listbox" aria-label={t('l4.lk.kinds.' + kind)}>
      {items.map((x) => { const p = onSale(x, now) ? priceNow(x, now) : null;
        return <Tile key={x.id} it={x} s={s} on={equipped(x.kind, s).id === x.id} owned={owns(x.id, s)} selected={sel === x.id} price={p} was={p && (p.coins !== x.price.coins || p.credits !== x.price.credits) ? x.price : undefined} onPick={() => pick(x)} tabIndex={sel === x.id ? 0 : -1} />; })}
    </div>

    {it && <section className="ln-act" aria-label={itemName(t, it)}>
      <div className="ln-act__n"><b dir="auto">{itemName(t, it)}</b><small>{t('l4.lk.rarity.' + it.rarity)}{owned ? ' · ' + t('l4.lk.yours') : how ? ' · ' + how : ''}</small></div>
      <div className="ln-act__b">
        {owned ? <GBtn kind={on ? 'dark' : 'gold'} size="sm" primary onClick={doEquip} disabled={on && isStandard(it.id)}>{on ? <><Icon n="check" size={16} />{isStandard(it.id) ? t('l4.lk.on') : t('l4.lk.off')}</> : t('l4.lk.put')}</GBtn>
          : price ? <>
            {price.coins != null && <GBtn kind="gold" size="sm" primary sound={null} onClick={() => doBuy('coins')} disabled={shortBy(price, 'coins', s) > 0}><span className="g-coin" aria-hidden="true" />{shortBy(price, 'coins', s) > 0 ? t('l4.lk.shortC', { n: fmt(shortBy(price, 'coins', s)) }) : t('l4.lk.coins', { n: fmt(price.coins) })}</GBtn>}
            {price.credits != null && <GBtn kind={price.coins == null ? 'gold' : 'paper'} size="sm" sound={null} onClick={() => (shortBy(price, 'credits', s) > 0 ? onPacks() : doBuy('credits'))}><CreditIcon size={15} />{shortBy(price, 'credits', s) > 0 ? t('l4.lk.shortK', { n: fmt(shortBy(price, 'credits', s)) }) : t('l4.lk.credits', { n: fmt(price.credits) })}</GBtn>}
          </> : <span className="ln-quiet">{how || t('l4.lk.earned')}</span>}
        {it.preview.k === 'ringtone' && <GBtn kind="ghost" size="sm" onClick={() => sfx((it.preview as { sfx: 'phone.ring' }).sfx)}><Icon n="sound" size={16} />{t('l4.lk.hear')}</GBtn>}
      </div>
    </section>}

    {kind === 'catchphrase' && <WriteLine s={s} />}
    <Starter s={s} />
    <GoldCard s={s} onPacks={onPacks} />
    <div className="ln-money">
      <p><span className="g-coin" aria-hidden="true" /> {t('l4.wallet.coinsD')}</p>
      <p><CreditIcon size={13} /> {t('l4.wallet.creditsD')}</p>
      <p className="ln-quiet">{t('e4.shop.never')} {t('l4.lk.refund')}</p>
    </div>
  </div>;
}
function LookStage({ kind, s, tryOn }: { kind: Kind4; s: Save; tryOn: Try }) {
  const t = useT();
  const last = dropsOf(s)[0];
  switch (kind) {
    case 'wallpaper': case 'theme': return <PhoneMock s={s} tryOn={tryOn} />;
    case 'dropcard': return <DropCard s={s} tryOn={tryOn} o={last ? last.o : 0} player={last ? last.player : t('l4.p.noHandle')} club={last?.club} cp={catchphraseOf(s).text} scoop={last?.scoop} foot={<span>{t('l4.drop.day', { n: last ? last.day : 2 })}</span>} className="ln-stage__dc" />;
    case 'frame': return <span className="ln-stage__me"><Avatar s={s} tryOn={tryOn} size={112} /><b dir="auto">@{s.nick || t('l4.p.noHandle')}</b></span>;
    case 'ringtone': return <CallMock s={s} tryOn={tryOn} />;
    case 'catchphrase': return <CatchStage s={s} tryOn={tryOn} />;
  }
}
function CatchStage({ s, tryOn }: { s: Save; tryOn: Try }) {
  const [k, setK] = useState(0);
  const tone = catchDef(item(tryOn.catchphrase || '') || equipped('catchphrase', s)).tone;
  useEffect(() => { setK((x) => x + 1); }, [tryOn.catchphrase]);
  return <button type="button" className="ln-cpstage" onClick={() => { setK((x) => x + 1); sfx(TONE_SFX[tone]); }}>
    <span key={k} className="ln-cpstage__slam"><CatchLine s={s} tryOn={tryOn} big /></span>
  </button>;
}
function WriteLine({ s }: { s: Save }) {
  const t = useT();
  const cur = customLine(s);
  const [draft, setDraft] = useState(cur?.text || '');
  const [err, setErr] = useState('');
  const open = customUnlocked(s);
  const save = () => {
    const r = setCustomCatchphrase(draft);
    if (!r.ok) { sfx('bad'); setErr(t('l4.lk.err.' + r.error)); return; }
    setErr(''); sfx(TONE_SFX.gold); toast('ach', t('l4.lk.saved', { t: r.text }));
  };
  return <section className="ln-sec ln-write">
    <h2 className="ln-h">{t('l4.lk.write')}</h2>
    <p className="ln-quiet">{open ? t('l4.lk.writeDek') : t('l4.lk.writeLocked')}</p>
    {open && <>
      <input className="ln-input" value={draft} maxLength={CUSTOM_MAX} onChange={(e) => { setDraft(e.target.value.slice(0, CUSTOM_MAX)); setErr(''); }} dir="auto" spellCheck={false} aria-label={t('l4.lk.write')} />
      <div className="ln-row"><small className="ln-quiet">{CUSTOM_MAX - draft.length}</small><GBtn kind="gold" size="sm" onClick={save} disabled={!cleanLine(draft)}>{t('l4.lk.writeSet')}</GBtn></div>
      {err && <p className="ln-err" role="alert">{err}</p>}
    </>}
  </section>;
}
/** The starter bundle: from Level 3, once, as a quiet card the first time Looks lists it and a line after. Never a popup. */
function Starter({ s }: { s: Save }) {
  const t = useT();
  const o = starterOffer(s);
  const first = useRef(!!o && o.show && !o.seen);
  useEffect(() => { if (o?.show && !o.seen) markStarterSeen(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!o || !o.show) return null;
  const p = o.pack;
  return first.current ? <section className="ln-starter">
    <h2 className="ln-h">{t('e4.starter.hed')} <small>{t('e4.starter.once')}</small></h2>
    <p>{t('e4.starter.dek', { c: p.credits, n: p.coins || 0 })}</p>
    <GBtn kind="paper" size="sm" onClick={() => { void buyStarter(); }}>{t('e4.starter.buy', { p: p.price })}</GBtn>
  </section> : <button type="button" className="ln-starter ln-starter--line" onClick={() => { void buyStarter(); }}>{t('e4.starter.line', { p: p.price })}</button>;
}
/** Gold, explained in one card (CONCEPT4 §5). */
function GoldCard({ s, onPacks }: { s: Save; onPacks: () => void }) {
  const t = useT();
  const have = isGold(s), cr = balance('credits', s);
  const get = () => {
    if (cr < GOLD_CREDITS) { onPacks(); return; }
    const r = buy(goldItemId(), 'credits');
    if (r.ok) { sfx('fanfare'); confetti(['#F2B632', '#FFE08A', '#F4EFE4'], 120); } else sfx('bad');
  };
  return <section className={'ln-goldcard' + (have ? ' is-on' : '')} aria-labelledby="ln-gold-h">
    <h2 id="ln-gold-h" className="ln-h"><Icon n="star" size={16} />{t('l4.lk.goldHed')}</h2>
    <p>{t('l4.lk.goldDek')}</p>
    {have ? <p className="ln-goldcard__on"><Icon n="check" size={16} />{t('l4.lk.goldHave')}</p>
      : <GBtn kind="gold" size="sm" sound={null} onClick={get}><CreditIcon size={15} />{t('l4.lk.goldBuy', { n: GOLD_CREDITS })}</GBtn>}
  </section>;
}

// ================================================================ Season track
function SeasonTrack({ s, onPacks }: { s: Save; onPacks: () => void }) {
  const t = useT();
  const tv = trackView(s);
  const { def, lv, rows } = tv;
  const [got, setGot] = useState<{ coins: number; cos: string[] } | null>(null);
  const strip = useRef<HTMLOListElement>(null);
  useEffect(() => { const el = strip.current?.querySelector<HTMLElement>('[data-now]'); el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' }); }, []);
  const land = (coins: number, cos: string[]) => {
    if (!coins && !cos.length) return;
    sfx(cos.length ? 'unlock' : 'coin');
    if (cos.length) confetti([def.accent, '#F2B632', '#F4EFE4'], 80);
    setGot({ coins, cos });
  };
  const claim = (lane: 'free' | 'gold', L: number) => { const r = claimReward(lane, L); if (r) land(r.coins || 0, r.cos ? [r.cos] : []); };
  const claimEvery = () => {
    let coins = 0; const cos: string[] = [];
    for (const r of rows) { if (!r.reached) continue;
      if (r.free && !r.freeClaimed) { const x = claimReward('free', r.lv); coins += x?.coins || 0; if (x?.cos) cos.push(x.cos); }
      if (tv.gold && r.gold && !r.goldClaimed) { const x = claimReward('gold', r.lv); coins += x?.coins || 0; if (x?.cos) cos.push(x.cos); } }
    land(coins, cos);
  };
  const cell = (rw: Reward | null, L: number, reached: boolean, claimed: boolean, lane: 'free' | 'gold') => {
    if (!rw) return <span className="ln-cell" />;
    const it = rw.cos ? item(rw.cos) : null;
    const can = reached && !claimed && (lane === 'free' || tv.gold);
    const body = it ? <span className="ln-cell__art"><Thumb it={it} s={s} /></span> : <span className="ln-cell__coins"><span className="g-coin" aria-hidden="true" />{rw.coins}</span>;
    const what = it ? itemName(t, it) : t('l4.se.coins', { n: rw.coins || 0 });
    return can ? <Pop className={'ln-cell is-ready ln-cell--' + lane} onTap={() => claim(lane, L)} sound={null} label={t('l4.se.claim') + ': ' + what}>{body}<b>{t('l4.se.claim')}</b></Pop>
      : <span className={'ln-cell ln-cell--' + lane + (claimed ? ' is-done' : reached ? '' : ' is-ahead') + (lane === 'gold' && !tv.gold ? ' is-gold-off' : '')} aria-label={what + ' · ' + (claimed ? t('l4.se.claimed') : t('l4.se.at', { n: L }))}>{body}{claimed && <Icon n="check" size={12} />}</span>;
  };
  return <div className="ln-se" style={{ ['--sa' as string]: def.accent }}>
    <section className="ln-se__head">
      <h2 className="ln-se__name">{t(def.nameKey)}</h2>
      <p className="ln-quiet">{t('l4.se.ends', { d: fmtDate(def.end - 864e5, t.lang, { day: 'numeric', month: 'short' }) })}</p>
      <p className="ln-row"><b className="ln-big2">{t('l4.se.tierOf', { n: lv.n, m: rows.length })}</b><span className="ln-quiet">{lv.max ? t('l4.se.max') : t('l4.se.xp', { a: fmt(lv.into), b: fmt(lv.need), n: lv.n + 1 })}</span></p>
      <span className="ln-meter ln-meter--se" role="progressbar" aria-valuemin={0} aria-valuemax={lv.need} aria-valuenow={lv.into} aria-label={t('l4.se.tierOf', { n: lv.n, m: rows.length })}><i style={{ width: (lv.max ? 100 : lv.pct) + '%' }} /></span>
      {tv.ready > 0 && <GBtn kind="gold" size="md" primary sound={null} className="ln-se__all" onClick={claimEvery}><Icon n="gift" size={18} />{t('l4.se.claimAll', { n: tv.ready })}</GBtn>}
    </section>
    <div className="ln-track" aria-label={t('l4.tabs.season')}>
      <div className="ln-track__lanes" aria-hidden="true"><span>{t('l4.se.free')}</span><span>{t('l4.se.gold')}</span></div>
      <ol className="ln-track__strip" ref={strip}>
        {rows.map((r) => <li key={r.lv} className={'ln-col' + (r.reached ? ' is-reached' : '') + (r.lv === lv.n ? ' is-now' : '')} data-now={r.lv === lv.n ? '' : undefined}>
          <span className="ln-col__n">{r.lv}</span>
          {cell(r.free, r.lv, r.reached, r.freeClaimed, 'free')}
          {cell(r.gold, r.lv, r.reached, r.goldClaimed, 'gold')}
        </li>)}
      </ol>
    </div>
    <p className="ln-quiet">{t('l4.se.how')}{!tv.gold ? ' ' + t('l4.se.goldOff') + '.' : ''}</p>
    {!tv.gold && <GoldCard s={s} onPacks={onPacks} />}
    {got && <ClaimSheet got={got} s={s} onClose={() => setGot(null)} />}
  </div>;
}
function ClaimSheet({ got, s, onClose }: { got: { coins: number; cos: string[] }; s: Save; onClose: () => void }) {
  const t = useT();
  const looks = got.cos.map((id) => item(id)).filter((x): x is Item => !!x);
  const first = looks[0];
  return <Sheet open onClose={onClose} label={t('l4.se.claimed')}>
    <div className="ln-claim">
      {first ? <span className="ln-claim__art"><Thumb it={first} s={s} /></span> : <span className="ln-claim__coin" aria-hidden="true"><span className="g-coin" /></span>}
      {first && <b className="ln-claim__n" dir="auto">{itemName(t, first)}{looks.length > 1 ? ' +' + (looks.length - 1) : ''}</b>}
      {got.coins > 0 && <p className="ln-claim__c">+<Count n={got.coins} /> {t('l4.wallet.coins')}</p>}
      <div className="ln-row">
        {first && owns(first.id, s) && <GBtn kind="gold" size="sm" onClick={() => { if (equipItem(first.id, first.kind)) sfx('stamp.done'); onClose(); }}>{t('l4.lk.put')}</GBtn>}
        <GBtn kind="dark" size="sm" onClick={onClose}>{t('common.done')}</GBtn>
      </div>
    </div>
  </Sheet>;
}

// ================================================================ Secret files
function Files({ s }: { s: Save }) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);
  const n = ACH_IDS.filter((id) => s.ach[id]).length;
  return <div className="ln-files">
    <div className="ln-row"><h2 className="ln-h">{t('l4.sf.hed')}</h2><span className="ln-quiet">{t('l4.sf.of', { n, m: ACH_IDS.length })}</span></div>
    <p className="ln-quiet">{t('l4.sf.dek')}</p>
    <ol className="ln-folders">{ACH_IDS.map((id, k) => {
      const got = !!s.ach[id], seen = fileOpened(s, id);
      const no = t('l4.sf.no', { n: String(k + 1).padStart(2, '0') });
      return <li key={id}>
        {got ? <Pop className={'ln-folder' + (seen ? ' is-open' : ' is-new')} sound="flap" onTap={() => { if (!seen) openFile(id); setOpen(id); }} label={seen ? t('e4.sf.' + id + '.n') : t('l4.sf.new') + ' · ' + no}>
          <span className="ln-folder__tab">{no}</span>
          <b className="ln-folder__n" dir="auto">{seen ? t('e4.sf.' + id + '.n') : t('l4.sf.new')}</b>
          <small>{seen ? t('l4.sf.opened', { d: fmtDate(s.lens!.opened![id], t.lang, { day: 'numeric', month: 'short' }) }) : t('l4.sf.open')}</small>
        </Pop> : <span className="ln-folder is-sealed" aria-label={no + ' · ' + t('l4.sf.sealed')}>
          <span className="ln-folder__tab">{no}</span>
          <span className="ln-folder__seal" aria-hidden="true" />
          <small>{t('l4.sf.sealed')}</small>
        </span>}
      </li>; })}</ol>
    {open && <FileSheet id={open} onClose={() => setOpen(null)} />}
  </div>;
}
function FileSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useT();
  const [shown, setShown] = useState(prefersReducedMotion());
  useEffect(() => { sfx('reveal'); const k = setTimeout(() => { setShown(true); sfx('stamp.done'); }, 520); return () => clearTimeout(k); }, []);
  return <Sheet open onClose={onClose} label={t('e4.sf.' + id + '.n')}>
    <div className={'ln-file' + (shown ? ' is-shown' : '')}>
      <span className="ln-file__flap" aria-hidden="true" />
      <div className="ln-file__paper">
        <h2 dir="auto">{t('e4.sf.' + id + '.n')}</h2>
        <p dir="auto">{t('e4.sf.' + id + '.h')}</p>
        <p className="ln-file__xp">{t('e4.sf.xp', { n: SECRET_FILE_XP })}</p>
        {shown && <Stamp text={t('l4.sf.stamp')} tone="gold" size="sm" sound={false} />}
      </div>
      <GBtn kind="dark" size="sm" onClick={onClose}>{t('common.done')}</GBtn>
    </div>
  </Sheet>;
}

