// The one Store (LAUNCH_BRIEF §23–24; docs/spec/K-store.md): Featured · Cosmetics · Season · Owned. It sells identity
// only: byline cards, desks, mastheads, share cards, stamps, catchphrases, rings, flair, feed styles, the Season Pass
// lane and your paper's name. Progressive browsing: a group first (Byline · Desk · Newsroom), then a kind, then six
// tiles a page with a live try-on stage; one action bar; everything else behind a sheet. Nothing here changes a Daily
// board, its sources or a score (brief §22, §48). The season track (what was "Pass & store") lives on the Season tab.
// Logic: lib/wallet.ts (coins, credits, ledger, equip, favours), lib/catalog.ts (the one catalog), lib/season.ts (track).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT, fmtDate, num } from '../lib/i18n';
import { useSave } from '../lib/save';
import { toast } from '../lib/meta';
import { sfx } from '../lib/sfx';
import { seasonAt, trackView, claimReward, claimAllRewards, ensureSeason, pendingRecap, dismissRecap, seasonById, cosmetic, equip as equipLegacy, MAX_SLV, goldPreview, type Reward } from '../lib/season';
import { paymentsOn } from '../lib/monet';
import {
  KINDS, GROUPS, kindsOf, itemsOf, item, featuredView, seasonSet, priceNow, onSale, isStandard, kindDef, GOLD_CREDITS, newThisWeek, lastChance, bookSets, applyRemoteCatalog, ownedCatalog,
  activeWindow, windowsOf, dropped, type Item, type Kind, type Group, type RemoteCatalog,
} from '../lib/catalog';
import {
  equipped, owns, buy, equipItem, refund, refundable, bestCurrency, balance, ledger, shortBy, referralCode, referralLink, CREDITS_EARN, giftable, goldItemId,
  setPaperName, paperName, PAPER_NAME_MAX, whyText, giftOutbox, toggleShowcase, SHOWCASE_MAX, priceText, type Currency,
} from '../lib/wallet';
import { syncEarned, earnProgress } from '../lib/earned';
import { setCustomCatchphrase, retryCustomCatchphrase, customUnlocked, customLine, catchDef, cleanLine, lineAllowed, CUSTOM_MAX, CUSTOM_ID, TONE_SFX } from '../lib/catchphrase';
import { getConfig } from '../lib/flags';
import { Icon, TopBar, GBtn, confetti } from '../ui/game';
import { Seg } from '../ui/screenbits';
import { usePaged, Pager } from '../ui/fit';
import { WalletStrip, Stage, Tile, Thumb, PriceTag, CreditIcon, Countdown, GiftSheet, PacksSheet, Sheet, itemName, type Try } from '../ui/customize';
import { CosSwatch, Reveal, cosName, type RevealItem } from '../ui/season';
import type { Save } from '../lib/save';
import type { Chrome } from '../App';

export type StoreSection = 'featured' | 'cosmetics' | 'season' | 'owned';
const SECTIONS: StoreSection[] = ['featured', 'cosmetics', 'season', 'owned'];
const PER_PAGE = 6;
let remoteApplied = false;
/** Once per session: the v4 config's looks, drops, rails, vault and earned-only list (lib/catalog.ts applyRemoteCatalog). */
function applyRemoteOnce() {
  if (remoteApplied) return; remoteApplied = true;
  try { const c = getConfig()?.catalog as unknown as RemoteCatalog | undefined; if (c && (c.looks || c.vault || c.drops || c.rails)) applyRemoteCatalog(c); } catch { /* the built-in catalog stands */ }
}
const isSeasonSet = (set?: string) => !!set && /^\w+-\d{4}$/.test(set);

export function CustomizeScreen({ sec: sec0, cur: cur0, ...chrome }: Chrome & { sec?: StoreSection; cur?: Currency }) {
  const t = useT();
  const s = useSave();
  const [sec, setSec] = useState<StoreSection>(sec0 || 'featured');
  const [curF, setCurF] = useState<Currency | undefined>(cur0);
  const [group, setGroup] = useState<Group>('byline');
  const [kind, setKind] = useState<Kind>('byline');
  const [sel, setSel] = useState<string>(() => equipped('byline').id);
  const [ownKind, setOwnKind] = useState<Kind | 'all'>('all');
  const [giftFor, setGiftFor] = useState<Item | null>(null);
  const [sheet, setSheet] = useState<null | 'packs' | 'more' | 'book' | 'receipts' | 'catch'>(null);
  const [reveal, setReveal] = useState<RevealItem | null>(null);
  useEffect(() => {
    applyRemoteOnce(); retryCustomCatchphrase(); ensureSeason();
    const got = syncEarned().map((id) => item(id)).filter((x): x is Item => !!x);
    if (got.length) { sfx('unlock'); confetti(['#F7B928', '#FFE08A', '#F4EFE4']); toast('ach', t('eco.toast.earned', { n: itemName(t, got[0]) }), got.length > 1 ? t('eco.toast.earnedMore', { n: got.length - 1 }) : t('eco.book.never')); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (cur0) { setSec('cosmetics'); setCurF(cur0); } }, [cur0]);
  const now = Date.now();
  const season = seasonAt(now);
  const selected = item(sel);
  const tryOn: Try = selected && !owns(selected.id, s) ? { [selected.kind]: selected.id } : {};

  const pick = (id: string, open = false) => {
    const it = item(id); if (!it) return;
    sfx('ui.tap');
    if (it.kind !== kind) { setKind(it.kind); setGroup(kindDef(it.kind).group); }
    setSel(id);
    if (it.kind === 'ringtone' && it.preview.k === 'ringtone') sfx(it.preview.sfx);
    if (open) setSheet('more');
  };
  const pickKind = (k: Kind) => { setKind(k); setSel(equipped(k, s).id); };
  const pickGroup = (g: Group) => { setGroup(g); const k = kindsOf(g)[0]; if (k) pickKind(k); };

  const doBuy = (it: Item, cur: Currency) => {
    const r = buy(it.id, cur, now);
    if (!r.ok) { sfx('bad'); toast('warn', r.error === 'short' ? t('eco.toast.short', { c: t('eco.wallet.' + cur).toLowerCase() }) : t('err.rule')); return; }
    sfx(cur === 'credits' ? 'unlock' : 'coin');
    if (it.rarity === 'epic' || it.rarity === 'legendary' || it.kind === 'gold') confetti(['#F7B928', '#FFE08A', '#FF5A36', '#F4EFE4']);
    toast('ach', t('eco.toast.bought', { n: itemName(t, it) }), t('eco.why.buy') + ' · ' + t('eco.price.' + cur, { n: r.n }));
  };
  const doEquip = (it: Item, on: boolean) => {
    sfx('ui.tap');
    if (on) { equipItem(null, it.kind); toast('info', t('eco.toast.off', { k: t('eco.tabs.' + it.kind).toLowerCase() })); setSel(equipped(it.kind).id); }
    else if (equipItem(it.id, it.kind)) toast('info', t('eco.toast.on', { n: itemName(t, it) }));
  };
  const doRefund = (id: string) => {
    const e = ledger(s).find((x) => x.id === id); const it = e?.item ? item(e.item) : null;
    const r = refund(id);
    if (r.ok) { sfx('shred'); if (it) toast('info', t('eco.toast.refunded', { n: itemName(t, it) })); setSel(equipped(kind).id); } else sfx('bad');
  };
  const onClaimReveal = (r: { coins?: number; cos?: string[] }) => { if (r.coins || r.cos?.length) setReveal({ coins: r.coins || undefined, cos: r.cos?.length ? r.cos : undefined }); };
  const equipFromReveal = (id: string) => { const c = cosmetic(id); if (c) { sfx('ui.tap'); equipLegacy(id, c.kind); } };

  return <div className="g-screen g-screen--wide cz fit" style={{ ['--sa' as string]: season.accent }}>
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('hub.row.shop')} onMenu={chrome.openSettings} />
    <div className="fit__body cz__body">
      <WalletStrip onGet={() => setSheet('packs')} />
      <div className="g-tabs2 cz-secs cz-secs--4" role="tablist" aria-label={t('hub.row.shop')}>
        {SECTIONS.map((k) => <button key={k} role="tab" aria-selected={sec === k} onClick={() => { sfx('ui.tap'); setSec(k); }}>{t('eco38.sec.' + k)}</button>)}
      </div>

      {sec === 'featured' && <FeaturedTab s={s} now={now} onPick={(id) => pick(id, true)} />}

      {sec === 'cosmetics' && <>
        {curF && <div className="cz-curf"><span>{curF === 'coins' ? <span className="g-coin" aria-hidden="true" /> : <CreditIcon size={15} />}{t('hub.shop.filter.' + curF)}</span>
          <button type="button" onClick={() => { sfx('ui.tap'); setCurF(undefined); }}><Icon n="x" size={14} />{t('hub.shop.clear')}</button></div>}
        <div className="cz-groups" role="tablist" aria-label={t('eco38.groups.k')}>
          {GROUPS.filter((g) => g !== 'gold').map((g) => <button key={g} role="tab" aria-selected={group === g} onClick={() => { sfx('ui.tap'); pickGroup(g); }}>{t('eco38.groups.' + g)}</button>)}
        </div>
        <Seg<Kind> className="cz-tabs cz-kinds" value={kind} onChange={(k) => { sfx('ui.tap'); pickKind(k); }} label={t('eco38.groups.' + group)}
          options={kindsOf(group).filter((k) => k !== 'gold').map((k) => ({ v: k, label: k === 'catchphrase' ? t('cp.ui.tab') : t('eco.tabs.' + k) }))} />
        <Stage tab={kind} s={s} tryOn={tryOn} />
        <KindTiles s={s} kind={kind} now={now} curF={curF} sel={sel} onPick={(id) => pick(id)} />
        {selected && <ActionBar s={s} it={selected} now={now} onBuy={doBuy} onEquip={doEquip} onMore={() => setSheet('more')} onWrite={kind === 'catchphrase' ? () => setSheet('catch') : undefined} />}
      </>}

      {sec === 'season' && <SeasonTab s={s} now={now} onClaim={onClaimReveal} onPick={(id) => pick(id, true)} onBuyPass={() => doBuy(item(goldItemId(now))!, 'credits')} onPacks={() => setSheet('packs')} />}

      {sec === 'owned' && <>
        <OwnedTab s={s} kind={ownKind} setKind={setOwnKind} sel={sel} onPick={(id) => pick(id)} />
        {selected && owns(selected.id, s) && !isStandard(selected.id) && <ActionBar s={s} it={selected} now={now} onBuy={doBuy} onEquip={doEquip} onMore={() => setSheet('more')} />}
        <div className="cz-owned__links">
          <GBtn kind="paper" size="sm" onClick={() => setSheet('book')}><Icon n="news" />{t('eco.tabs.book')}</GBtn>
          <GBtn kind="paper" size="sm" onClick={() => setSheet('receipts')}><Icon n="ticket" />{t('eco38.receipts.k')}</GBtn>
        </div>
      </>}
    </div>

    {sheet === 'more' && selected && <ItemSheet s={s} it={selected} now={now} onClose={() => setSheet(null)} onBuy={doBuy} onEquip={doEquip} onGift={() => { setSheet(null); setGiftFor(selected); }} />}
    {sheet === 'book' && <Sheet label={t('eco.book.hed')} onClose={() => setSheet(null)} wide><BookView s={s} now={now} onPick={(id) => { setSheet(null); pick(id, true); }} /><div className="cz-sheet__acts"><GBtn kind="dark" size="sm" onClick={() => setSheet(null)}>{t('common.close')}</GBtn></div></Sheet>}
    {sheet === 'receipts' && <ReceiptsSheet s={s} onClose={() => setSheet(null)} onRefund={doRefund} />}
    {sheet === 'catch' && <Sheet label={t('cp.ui.hed')} onClose={() => setSheet(null)}><CatchPanel s={s} /><div className="cz-sheet__acts"><GBtn kind="dark" size="sm" onClick={() => setSheet(null)}>{t('common.close')}</GBtn></div></Sheet>}
    {sheet === 'packs' && <PacksSheet onClose={() => setSheet(null)} />}
    {giftFor && <GiftSheet it={giftFor} onClose={() => setGiftFor(null)} onSent={(to, queued) => toast('ach', t(queued ? 'eco.gift.queued' : 'eco.gift.sent', { c: to }))} />}
    {reveal && <Reveal item={reveal} onClose={() => setReveal(null)} onEquip={equipFromReveal} />}
  </div>;
}

// ---------------------------------------------------------------- Featured: this week's three, new this week, last chance
function FeaturedTab({ s, now, onPick }: { s: Save; now: number; onPick: (id: string) => void }) {
  const t = useT();
  const feat = useMemo(() => featuredView(now), [now]);
  const fresh = useMemo(() => newThisWeek(now).filter((x) => !feat.items.some((f) => f.item.id === x.id)).slice(0, 3), [now, feat]);
  const last = useMemo(() => lastChance(now).slice(0, 3), [now]);
  return <>
    <section className="cz-feat" aria-labelledby="feat-h">
      <div className="g-sec"><h2 id="feat-h">{t('eco.featured.k')}</h2><span className="cz-feat__ends">{t('eco.featured.ends', { d: fmtDate(feat.ends, t.lang, { weekday: 'short' }) })}</span></div>
      <div className="cz-feat__row">
        {feat.items.map(({ item: it, price: p, was: w, pinned }) => <RailCard key={it.id} it={it} s={s} now={now} onPick={() => onPick(it.id)} badge={!pinned && !owns(it.id, s) ? t('eco.featured.off') : undefined} price={p} was={pinned ? undefined : w} />)}
      </div>
      <p className="g-fine">{t('eco.featured.note')}</p>
    </section>
    {fresh.length > 0 && <section className="cz-rails" aria-labelledby="new-h">
      <div className="g-sec"><h2 id="new-h">{t('eco.rails.new')}</h2></div>
      <div className="cz-feat__row">{fresh.map((it) => <RailCard key={it.id} it={it} s={s} now={now} onPick={() => onPick(it.id)} />)}</div>
    </section>}
    {last.length > 0 && <section className="cz-rails" aria-labelledby="last-h">
      <div className="g-sec"><h2 id="last-h" className="cz-rails__last">{t('eco.rails.last')}</h2></div>
      <div className="cz-feat__row">{last.map(({ item: it, ends, vault }) => <RailCard key={it.id} it={it} s={s} now={now} onPick={() => onPick(it.id)} badge={vault ? t('eco.rails.vault') : undefined} ends={ends} />)}</div>
    </section>}
    <p className="cz-fair"><Icon n="lock" size={14} />{t('eco38.fair')}</p>
  </>;
}
function RailCard({ it, s, now, onPick, badge, ends, price, was }: { it: Item; s: Save; now: number; onPick: () => void; badge?: string; ends?: number; price?: { coins?: number; credits?: number }; was?: { coins?: number; credits?: number } }) {
  const t = useT(); const own = owns(it.id, s); const p = price || (onSale(it, now) ? priceNow(it, now) : null);
  return <button type="button" className={'cz-feat__card' + (own ? ' is-owned' : '')} onClick={onPick} aria-label={itemName(t, it)}>
    <span className="cz-tile__art"><Thumb it={it} s={s} /></span>
    <b dir="auto">{itemName(t, it)}</b>
    {badge && <span className="cz-feat__off">{badge}</span>}
    {ends && !own && <small className="cz-rails__ends"><Countdown to={ends} lang={t.lang} /></small>}
    {own ? <span className="cz-tile__owned">{t('eco.state.owned')}</span> : p && <PriceTag price={p} was={was} />}
  </button>;
}

// ---------------------------------------------------------------- Cosmetics: one kind, six tiles a page, keyboard arrows
function KindTiles({ s, kind, now, curF, sel, onPick }: { s: Save; kind: Kind; now: number; curF?: Currency; sel: string; onPick: (id: string) => void }) {
  const t = useT();
  const items = useMemo(() => itemsOf(kind, now).filter((it) => !curF || isStandard(it.id) || it.price[curF] != null || owns(it.id, s)), [kind, now, curF]); // eslint-disable-line react-hooks/exhaustive-deps
  const ip = usePaged(items, PER_PAGE, kind + (curF || ''));
  const grid = useRef<HTMLDivElement>(null);
  const onKey = (e: React.KeyboardEvent) => {
    if (!/^Arrow/.test(e.key)) return;
    const tiles = Array.from(grid.current?.querySelectorAll<HTMLButtonElement>('[data-tile]') || []);
    const i = tiles.indexOf(document.activeElement as HTMLButtonElement); if (i < 0) return;
    const cols = 3, rtl = t.rtl, fwd = e.key === (rtl ? 'ArrowLeft' : 'ArrowRight'), back = e.key === (rtl ? 'ArrowRight' : 'ArrowLeft');
    const j = fwd ? i + 1 : back ? i - 1 : e.key === 'ArrowDown' ? i + cols : e.key === 'ArrowUp' ? i - cols : i;
    if (tiles[j]) { e.preventDefault(); tiles[j].focus(); }
  };
  return <>
    <div className="cz-tiles" ref={grid} onKeyDown={onKey} role="listbox" aria-label={t('eco.tabs.' + kind)}>
      {ip.rows.map((it, k) => { const p = onSale(it, now) ? priceNow(it, now) : null; return <Tile key={it.id} it={it} s={s} on={equipped(it.kind, s).id === it.id} owned={owns(it.id, s)} selected={sel === it.id} price={p} was={p && (p.coins !== it.price.coins || p.credits !== it.price.credits) ? it.price : undefined} onPick={() => onPick(it.id)} tabIndex={sel === it.id || (k === 0 && !items.some((x) => x.id === sel)) ? 0 : -1} />; })}
    </div>
    <Pager p={ip} />
  </>;
}

/** One row under the tiles: the name, the state or price, one main button, and "More" (gift, pin, refund, how to earn). */
function ActionBar({ s, it, now, onBuy, onEquip, onMore, onWrite }: { s: Save; it: Item; now: number; onBuy: (it: Item, c: Currency) => void; onEquip: (it: Item, on: boolean) => void; onMore: () => void; onWrite?: () => void }) {
  const t = useT();
  const price = onSale(it, now) ? priceNow(it, now) : null;
  const isOn = equipped(it.kind, s).id === it.id;
  const owned = owns(it.id, s);
  const best = price ? bestCurrency(price, s) : null;
  const w = activeWindow(it, now);
  return <section className="cz-bar" aria-live="polite">
    <div className="cz-bar__txt">
      <b dir="auto">{itemName(t, it)}</b>
      <small>{isOn ? t('eco.state.on') : owned ? t('eco.state.owned') : price ? <PriceTag price={price} /> : it.source === 'earned' && it.earn ? earnText(t, it, s) : t('eco.source.' + it.source)}
        {!owned && w && <> · <Countdown to={w.to} lang={t.lang} /></>}</small>
    </div>
    {onWrite && <GBtn kind="ghost" size="sm" onClick={onWrite} label={t('cp.ui.write')}><Icon n="pen" /></GBtn>}
    {owned ? <GBtn kind={isOn ? 'dark' : 'gold'} size="sm" onClick={() => onEquip(it, isOn)} disabled={isStandard(it.id) && isOn}><Icon n={isOn ? 'x' : 'check'} />{isOn ? t('eco.act.off') : t('eco.act.equip')}</GBtn>
      : price && best ? <GBtn kind="gold" size="sm" onClick={() => onBuy(it, best)} disabled={shortBy(price, best, s) > 0}>{best === 'coins' ? <span className="g-coin" aria-hidden="true" /> : <CreditIcon size={15} />}{shortBy(price, best, s) > 0 ? t('eco.act.short', { n: shortBy(price, best, s) }) : t('eco.act.buy')}</GBtn>
        : null}
    <GBtn kind="ghost" size="sm" onClick={onMore} label={t('common.more')}><Icon n="more" /></GBtn>
  </section>;
}

/** The item sheet: a big preview, every detail and every secondary action (both currencies, gift, pin, name your paper). */
function ItemSheet({ s, it, now, onClose, onBuy, onEquip, onGift }: { s: Save; it: Item; now: number; onClose: () => void; onBuy: (it: Item, c: Currency) => void; onEquip: (it: Item, on: boolean) => void; onGift: () => void }) {
  const t = useT();
  const [name, setName] = useState(() => s.desk?.paper || '');
  const price = onSale(it, now) ? priceNow(it, now) : null;
  const was = price && (price.coins !== it.price.coins || price.credits !== it.price.credits) ? it.price : undefined;
  const isOn = equipped(it.kind, s).id === it.id, owned = owns(it.id, s);
  const pinned = (s.desk?.show || []).includes(it.id);
  const w = activeWindow(it, now);
  const saveName = () => { if (setPaperName(name)) { sfx('stamp.done'); toast('info', t('eco.toast.renamed', { n: paperName() })); } };
  return <Sheet label={itemName(t, it)} onClose={onClose}>
    <div className="cz-sheet__head"><Thumb it={it} s={s} /><div><h2 dir="auto">{itemName(t, it)}</h2><p>{t('eco.rarity.' + it.rarity)} · {t(it.kind === 'catchphrase' ? 'cp.ui.tab' : 'eco.tabs.' + it.kind)}{it.set && !isSeasonSet(it.set) ? ' · ' + t('eco.book.sets.' + it.set) : ''}</p></div></div>
    {it.descKey && <p className="cz-act__desc">{t(it.descKey)}</p>}
    <div className="cz-act__line">
      {isOn ? <span className="cz-tile__on"><Icon n="check" size={13} />{t('eco.state.on')}</span> : owned ? <span>{t('eco.state.owned')}</span>
        : price ? <><PriceTag price={price} /> {was && <span className="cz-act__was">({t('eco.price.usual', { p: priceText(was) })})</span>}</>
          : <span>{t('eco.source.' + it.source)}</span>}
      {!owned && w && <span className="cz-act__count">{t('eco.rails.leaves')} · <Countdown to={w.to} lang={t.lang} /></span>}
    </div>
    {it.source === 'earned' && it.earn && !owned && <p className="cz-act__desc"><Icon n="lock" size={13} /> {earnText(t, it, s)} · {t('eco.book.never')}</p>}
    {it.kind === 'paper' && owned && <label className="cz-field"><span className="cz-field__l">{t('eco.paper.hed')}</span>
      <input className="cz-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={PAPER_NAME_MAX} placeholder={t('eco.paper.ph')} dir="auto" />
      <small>{s.desk?.paper ? t('eco.paper.current', { n: s.desk.paper }) : t('eco.paper.std')}</small></label>}
    <div className="cz-act__btns">
      {it.kind === 'paper' && owned ? <GBtn kind="gold" size="sm" onClick={saveName} disabled={(name.trim() || '') === (s.desk?.paper || '')}><Icon n="pen" />{t('eco.paper.save')}</GBtn>
        : owned ? <GBtn kind={isOn ? 'dark' : 'gold'} size="sm" onClick={() => { onEquip(it, isOn); onClose(); }} disabled={isStandard(it.id) && isOn}><Icon n={isOn ? 'x' : 'check'} />{isOn ? t('eco.act.off') : t('eco.act.equip')}</GBtn>
          : price ? <>
            {price.coins != null && <GBtn kind="gold" size="sm" onClick={() => { onBuy(it, 'coins'); onClose(); }} disabled={shortBy(price, 'coins', s) > 0}><span className="g-coin" aria-hidden="true" />{shortBy(price, 'coins', s) > 0 ? t('eco.act.short', { n: shortBy(price, 'coins', s) }) : t('eco.act.buyWith', { p: t('eco.price.coins', { n: price.coins }) })}</GBtn>}
            {price.credits != null && <GBtn kind={bestCurrency(price, s) === 'credits' || price.coins == null ? 'gold' : 'paper'} size="sm" onClick={() => { onBuy(it, 'credits'); onClose(); }} disabled={shortBy(price, 'credits', s) > 0}><CreditIcon size={15} />{shortBy(price, 'credits', s) > 0 ? t('eco.act.short', { n: shortBy(price, 'credits', s) }) : t('eco.act.buyWith', { p: t('eco.price.credits', { n: price.credits }) })}</GBtn>}
          </> : it.source === 'track' || it.source === 'gold' ? <span className="cz-act__desc">{t('eco.book.how.' + it.source)}</span> : null}
      {it.kind === 'ringtone' && it.preview.k === 'ringtone' && <GBtn kind="ghost" size="sm" onClick={() => sfx((it.preview as { sfx: 'phone.ring' }).sfx)}><Icon n="sound" />{t('eco.act.hear')}</GBtn>}
      {giftable(it) && onSale(it, now) && <GBtn kind="ghost" size="sm" onClick={onGift}><Icon n="gift" />{t('eco.act.gift')}</GBtn>}
      {owned && !isStandard(it.id) && kindDef(it.kind).showcase && <GBtn kind="ghost" size="sm" onClick={() => { sfx('ui.pop'); toggleShowcase(it.id); }}><Icon n="star" />{pinned ? t('eco.act.unpin') : t('eco.act.pin')}{!pinned && ` (${(s.desk?.show || []).length}/${SHOWCASE_MAX})`}</GBtn>}
    </div>
    <div className="cz-sheet__acts"><GBtn kind="dark" size="sm" onClick={onClose}>{t('common.close')}</GBtn></div>
  </Sheet>;
}

function earnText(t: ReturnType<typeof useT>, it: Item, s: Save): string {
  const e = it.earn!; const [have, need] = earnProgress(e, s);
  const r = e.ref ? (e.via === 'rank' ? t('cn.tier.' + e.ref) : e.via === 'rivalry' ? t('rival.' + e.ref) : e.ref) : '';
  const base = t('eco.book.earn.' + e.via, { n: e.n ?? '', r });
  return e.via === 'streak' || e.via === 'story' ? base + ' · ' + t('eco.book.have', { a: have, b: need }) : base;
}

// ---------------------------------------------------------------- Season: the track (free lane), the Season Pass lane, the limited set
function SeasonTab({ s, now, onClaim, onPick, onBuyPass, onPacks }: { s: Save; now: number; onClaim: (r: { coins?: number; cos?: string[] }) => void; onPick: (id: string) => void; onBuyPass: () => void; onPacks: () => void }) {
  const t = useT();
  const tv = trackView(s, now);
  const { def, lv, rows } = tv;
  const recap = pendingRecap(s);
  const recapDef = recap ? seasonById(recap.id) : null;
  const set = useMemo(() => seasonSet(def.id).filter((x) => x.kind !== 'gold'), [def.id]);
  const passId = goldItemId(now);
  const havePass = owns(passId, s);
  const credits = balance('credits', s);
  const cur = rows[lv.n - 1];
  const next = rows.filter((r) => r.lv > lv.n && (r.free || (havePass && r.gold))).slice(0, 3);
  const claim = (lane: 'free' | 'gold', L: number) => { const r = claimReward(lane, L); if (!r) return; onClaim({ coins: r.coins, cos: r.cos ? [r.cos] : undefined }); if (r.cos && L === MAX_SLV) confetti([def.accent, '#F7B928', '#F4EFE4']); };
  const cell = (r: Reward | null, reached: boolean, claimed: boolean, open: boolean, gold: boolean) => {
    const lane = gold ? ' is-gold' : '';
    if (!r) return <span className={'nslip__cell is-empty' + lane}><span className="nslip__what">{t('season.nothing')}</span></span>;
    const c = r.cos ? cosmetic(r.cos) : null;
    const label = c ? cosName(t, c) : t('season.reveal.coins', { n: r.coins || 0 });
    const body = c ? <CosSwatch c={c} nick={s.nick} size="sm" /> : <span className="slip__coins slip__coins--lg" role="img" aria-label={label}><span className="g-coin" aria-hidden="true" />{r.coins}</span>;
    const what = c ? <span className="nslip__what">{label}</span> : null;
    if (claimed) return <span className={'nslip__cell is-claimed' + lane}>{body}{what}<span className="slip__tick" aria-label={t('season.claimed')}><Icon n="check" size={12} /></span></span>;
    if (reached && open) return <button type="button" className={'nslip__cell is-ready' + lane} onClick={() => claim(r.lane, r.lv)} aria-label={t('season.claim') + ': ' + label}>{body}<span className="slip__claim">{t('season.claim')}</span></button>;
    return <span className={'nslip__cell is-locked' + lane}>{body}{what}</span>;
  };
  const slip = (r: (typeof rows)[number], isNow: boolean) => <li key={r.lv} className={'nslip' + (isNow ? ' is-now' : '')} aria-current={isNow ? 'step' : undefined}>
    <span className="nslip__n"><small>{isNow ? t('season.here') : t('season.lvShort')}</small><span className="g-num">{r.lv}</span></span>
    {cell(r.free, r.reached, r.freeClaimed, true, false)}
    {havePass && cell(r.gold, r.reached, r.goldClaimed, true, true)}
  </li>;
  const preview = goldPreview(def.id).slice(0, 4);
  return <div className="season cz-season-tab">
    {recap && recapDef && <section className="recap recap--compact" aria-labelledby="recap-h">
      <span className="g-stamp recap__stamp">{t('season.recap.k')}</span>
      <h2 id="recap-h" className="recap__hed">{t('season.recap.hed', { s: t(recapDef.nameKey) + ' ' + recapDef.year })}</h2>
      <dl className="recap__facts">
        <div><dt>{t('season.recap.lv')}</dt><dd className="g-num">{recap.lv}</dd></div>
        <div><dt>{t('season.recap.best')}</dt><dd className="g-num">{recap.best ? t('tier.' + recap.best) : t('season.recap.none')}</dd></div>
        <div><dt>{t('season.recap.top')}</dt><dd className="g-num">{recap.top ? t('season.recap.pts', { n: recap.top.pts }) : t('season.recap.none')}</dd></div>
      </dl>
      {recap.banked > 0 && <p className="recap__note">{t('season.recap.banked', { n: recap.banked })}</p>}
      <button type="button" className="g-btn g-btn--dark g-btn--sm" onClick={() => { sfx('stamp.done'); dismissRecap(); }}>{t('season.recap.ok')}</button>
    </section>}
    <header className="shero shero--compact shero--store">
      <div className="shero__mast">
        <p className="g-mono shero__k">{t('season.k')}</p>
        <h2 className="shero__name">{t(def.nameKey)}</h2>
        <p className="shero__dates">{def.daysLeft <= 1 ? t('season.lastDay') : t('season.daysLeft', { n: def.daysLeft })} · {t('eco38.season.resets')}</p>
      </div>
      <div className="shero__lv">
        <span className="shero__num g-num" aria-hidden="true">{lv.n}</span>
        <div className="shero__bar">
          <p><b>{t('season.ofMax', { n: lv.n, m: MAX_SLV })}</b> <span>{lv.max ? t('season.maxed') : t('season.toNext', { n: lv.need - lv.into, l: lv.n + 1 })}</span></p>
          <span className="g-bar" style={{ ['--bar' as string]: 'var(--sa)' }}><i style={{ width: lv.pct + '%' }} /></span>
          <p className="shero__acct">{t('eco38.season.xpFrom')}</p>
        </div>
      </div>
    </header>
    <section aria-labelledby="track-h" className="snext">
      <div className="g-sec"><h2 id="track-h">{t('season.next')}</h2>
        {tv.ready > 0 && <button type="button" className="g-btn g-btn--gold g-btn--sm" onClick={() => { const r = claimAllRewards(); onClaim(r); }}>{t('season.claimAll', { n: tv.ready })}</button>}</div>
      <div className={'snext__grid' + (havePass ? ' has-gold' : '')}>
        <div className="snext__keys" aria-hidden="true"><span /><span>{t('season.free')}</span>{havePass && <span className="is-gold">{t('eco38.pass.k')}</span>}</div>
        <ol className="snext__run" aria-label={t('season.track')}>
          {cur && slip(cur, true)}
          {next.map((r) => slip(r, false))}
        </ol>
      </div>
    </section>
    <section className="cz-pass g-card" aria-labelledby="pass-h">
      <div className="cz-pass__row">
        <div className="cz-pass__txt"><h2 id="pass-h">{t('eco38.pass.hed', { s: t(def.nameKey) })}</h2><p>{t('eco38.pass.dek')}</p></div>
        <span className="cz-pass__peek" aria-hidden="true">{preview.map((c) => <CosSwatch key={c.id} c={c} nick={s.nick} size="sm" />)}</span>
      </div>
      {havePass ? <p className="cz-gold__have"><Icon n="check" size={18} />{t('eco38.pass.have')}</p> : <div className="cz-pass__acts">
        <GBtn kind="gold" size="sm" onClick={onBuyPass} disabled={credits < GOLD_CREDITS}><CreditIcon size={16} />{credits < GOLD_CREDITS ? t('eco.act.short', { n: GOLD_CREDITS - credits }) : t('eco38.pass.buy', { n: GOLD_CREDITS })}</GBtn>
        {!paymentsOn() && credits < GOLD_CREDITS && <GBtn kind="ghost" size="sm" onClick={onPacks}><Icon n="help" />{t('eco38.wallet.how')}</GBtn>}
      </div>}
    </section>
    <section className="cz-season" aria-labelledby="set-h">
      <div className="cz-season__h"><h2 id="set-h">{t('eco.season.k', { s: t(def.nameKey) })}</h2><span><Countdown to={def.end} lang={t.lang} /></span></div>
      <div className="cz-season__row">
        {set.map((it) => { const p = onSale(it, now) ? priceNow(it, now) : null; return <Tile key={it.id} it={it} s={s} on={equipped(it.kind, s).id === it.id} owned={owns(it.id, s)} selected={false} price={p} onPick={() => onPick(it.id)} tabIndex={0} />; })}
      </div>
      <p className="cz-season__note">{t('eco.season.gone')}</p>
    </section>
  </div>;
}

// ---------------------------------------------------------------- Owned: what you have, by kind, equip in place
function OwnedTab({ s, kind, setKind, sel, onPick }: { s: Save; kind: Kind | 'all'; setKind: (k: Kind | 'all') => void; sel: string; onPick: (id: string) => void }) {
  const t = useT();
  const all = useMemo(() => ownedCatalog(s.owned), [s.owned]);
  const kinds = KINDS.filter((k) => k !== 'gold' && all.some((x) => x.kind === k));
  const list = kind === 'all' ? all : all.filter((x) => x.kind === kind);
  const ip = usePaged(list, PER_PAGE, kind);
  if (!all.length) return <section className="cz-empty g-card"><Icon n="gift" size={26} /><b>{t('eco38.owned.none')}</b><p>{t('eco38.owned.noneD')}</p></section>;
  return <>
    <Seg<Kind | 'all'> className="cz-tabs cz-kinds" value={kind} onChange={(k) => { sfx('ui.tap'); setKind(k); }} label={t('eco38.sec.owned')}
      options={[{ v: 'all' as const, label: t('eco38.owned.all', { n: all.length }) }, ...kinds.map((k) => ({ v: k, label: k === 'catchphrase' ? t('cp.ui.tab') : t('eco.tabs.' + k) }))]} />
    <div className="cz-tiles" role="listbox" aria-label={t('eco38.sec.owned')}>
      {ip.rows.map((it, k) => <Tile key={it.id} it={it} s={s} on={equipped(it.kind, s).id === it.id} owned selected={sel === it.id} price={null} onPick={() => onPick(it.id)} tabIndex={sel === it.id || k === 0 ? 0 : -1} />)}
    </div>
    <Pager p={ip} />
  </>;
}

/** Receipts: recent movements of both currencies with 48-hour refunds, gifts sent, bring a friend, and our promise. */
function ReceiptsSheet({ s, onClose, onRefund }: { s: Save; onClose: () => void; onRefund: (id: string) => void }) {
  const t = useT();
  const copyLink = async () => { try { await navigator.clipboard.writeText(referralLink(s)); sfx('ui.pop'); toast('info', t('eco.ref.copied')); } catch { toast('info', referralLink(s)); } };
  const rows = ledger(s).slice(0, 6);
  return <Sheet label={t('eco38.receipts.k')} onClose={onClose} wide>
    <div className="cz-sheet__head"><Icon n="ticket" size={30} /><div><h2>{t('eco38.receipts.k')}</h2><p>{t('eco.ledger.note')}</p></div></div>
    <section className="cz-ledger cz-ledger--sheet" aria-labelledby="led-h">
      <h3 id="led-h">{t('eco.ledger.hed')}</h3>
      {rows.length === 0 ? <p className="cz-ledger__empty">{t('eco.ledger.empty')}</p> : <ul>{rows.map((e) => {
        const it = e.item ? item(e.item) : null; const k = e.why.split(':')[0];
        return <li key={e.id}>
          <span>{fmtDate(e.at, t.lang, { day: 'numeric', month: 'short' })}</span>
          <span className="cz-ledger__what" dir="auto">{whyText(e.why)}{it ? ': ' + itemName(t, it) : k === 'earn' ? ': ' + t('eco.earnWhy.' + e.why.split(':')[1]) : ''}{e.to && <small> → {e.to}</small>}{e.refunded && <small> · {t('eco.ledger.refunded')}</small>}</span>
          <b className={'g-num cz-ledger__d ' + (e.d < 0 ? 'neg' : 'pos')}>{e.cur === 'coins' ? <span className="g-coin" aria-hidden="true" /> : <CreditIcon size={12} />}{e.d > 0 ? '+' : e.d < 0 ? '−' : ''}{Math.abs(e.d)}</b>
          {refundable(e) ? <button type="button" className="cz-ledger__refund" onClick={() => onRefund(e.id)}>{t('eco.ledger.refund')}</button> : <span />}
        </li>; })}</ul>}
      <p className="g-fine">{t('eco38.receipts.coins', { n: num(s.credits) })}</p>
    </section>
    <section className="cz-ref" aria-labelledby="ref-h">
      <h3 id="ref-h">{t('eco.ref.hed')}</h3>
      <p>{t('eco38.ref.dek', { n: CREDITS_EARN.referral })}</p>
      <div className="cz-ref__row">
        <span className="cz-ref__code"><small>{t('eco.ref.code')}</small>{referralCode(s)}</span>
        <GBtn kind="paper" size="sm" onClick={copyLink}><Icon n="share" />{t('eco.ref.copy')}</GBtn>
      </div>
      {s.wallet?.ref?.from && !s.wallet.ref.paid && <p className="cz-ref__from">{t('eco.ref.from', { c: s.wallet.ref.from, n: CREDITS_EARN.referral })}</p>}
      {giftOutbox(s).length > 0 && <div className="cz-outbox"><b>{t('eco.gift.outbox')}</b>{giftOutbox(s).slice(0, 3).map((g) => <span key={g.id}>{itemName(t, item(g.item)!)} → {g.to} · {t('eco.gift.status.' + g.status)}</span>)}</div>}
    </section>
    <section className="cz-promise"><h3>{t('eco.promise.hed')}</h3><ul>{(t.list('eco.promise.list') as string[]).map((x, k) => <li key={k}><Icon n="check" size={14} />{x}</li>)}</ul></section>
    <div className="cz-sheet__acts"><GBtn kind="dark" size="sm" onClick={onClose}>{t('common.close')}</GBtn></div>
  </Sheet>;
}

/** "Your catchphrase": the line fires on a Confirmed call that lands. Tiles pick one; this writes your own (Chief rank). */
function CatchPanel({ s }: { s: Save }) {
  const t = useT();
  const cur = customLine(s);
  const [draft, setDraft] = useState(cur?.text || '');
  const [err, setErr] = useState('');
  const open = customUnlocked(s);
  const on = equipped('catchphrase', s); const d = catchDef(on);
  const save = () => {
    const r = setCustomCatchphrase(draft);
    if (!r.ok) { sfx('bad'); setErr(t('cp.ui.err.' + r.error)); return; }
    setErr(''); sfx(TONE_SFX.gold); toast('ach', t('cp.ui.saved', { t: r.text }));
  };
  return <section className="cz-cpp cz-cpp--sheet" aria-labelledby="cp-h">
    <h2 id="cp-h">{t('cp.ui.hed')}</h2>
    <p className="cz-cpp__dek">{t('cp.ui.dek')}</p>
    <p className="cz-cpp__now"><span>{t('cp.ui.now')}</span><b className={'cz-cp cz-cp--' + d.tone} style={{ ['--cp' as string]: d.c }} dir="auto">{on.id === CUSTOM_ID && cur?.text && cur.ok !== false ? cur.text : t(d.key)}</b><small>{t('cp.ui.' + d.from)}</small></p>
    {cur?.ok === false && <p className="cz-err" role="alert">{t('cp.ui.refused')}</p>}
    {cur?.net && cur.ok == null && on.id === CUSTOM_ID && <p className="cz-cpp__net"><Icon n="clock" size={14} /> {t('cp.ui.offline')}</p>}
    <div className={'cz-cpp__write' + (open ? '' : ' is-locked')}>
      <label className="cz-field"><span className="cz-field__l">{open ? t('cp.ui.write') : <><Icon n="lock" size={13} /> {t('cp.ui.write')}</>}</span>
        <input className="cz-input cz-input--cp" value={draft} disabled={!open} onChange={(e) => { setDraft(e.target.value.slice(0, CUSTOM_MAX)); setErr(''); }} maxLength={CUSTOM_MAX} placeholder={t('cp.ui.ph')} dir="auto" spellCheck={false} />
        <small>{open ? t('cp.ui.writeHint') + ' · ' + t('cp.ui.left', { n: CUSTOM_MAX - draft.length }) : t('cp.ui.locked')}</small></label>
      {open && <div className={'cz-cpp__live' + (draft && !lineAllowed(cleanLine(draft)) ? ' is-bad' : '')} aria-live="polite">
        <small>{t('cp.ui.live')}</small>
        <span key={cleanLine(draft)} className="cz-cp cz-cp--gold cz-cp--big cz-cpp__stamp" dir="auto">{cleanLine(draft) || t('cp.ui.ph')}</span>
      </div>}
      {err && <p className="cz-err" role="alert">{err}</p>}
      {open && <GBtn kind="gold" size="sm" onClick={save} disabled={!cleanLine(draft) || (cleanLine(draft) === cur?.text && on.id === CUSTOM_ID)}><Icon n="pen" />{t('cp.ui.set')}</GBtn>}
      {cur && cur.ok == null && !cur.net && on.id === CUSTOM_ID && <small className="g-fine">{t('cp.ui.pending')}</small>}
    </div>
  </section>;
}

/** The collection book: every set, owned and missing, and how each missing look is won. Paged by set. */
function BookView({ s, now, onPick }: { s: Save; now: number; onPick: (id: string) => void }) {
  const t = useT();
  const sets = useMemo(() => bookSets(now), [now]);
  const pg = usePaged(sets, 2);
  const how = (it: Item): string => {
    if (it.source === 'earned' && it.earn) return earnText(t, it, s);
    if (it.source === 'track') return t('eco.book.how.track');
    if (it.source === 'gold') return t('eco.book.how.gold');
    if (!dropped(it, now)) return t('eco.book.how.soon', { d: fmtDate(it.drop!, t.lang, { day: 'numeric', month: 'short' }) });
    const w = activeWindow(it, now);
    if (w) return t('eco.book.how.window', { d: fmtDate(w.to - 864e5, t.lang, { day: 'numeric', month: 'short' }), p: priceText(priceNow(it, now)) });
    if (windowsOf(it).length) return t('eco.book.how.gone');
    return t('eco.book.how.buy', { p: priceText(priceNow(it, now)) });
  };
  const setName = (k: string) => { if (isSeasonSet(k)) { const [n, y] = k.split('-'); return t('season.names.' + n) + ' ' + y; } const v = t('eco.book.sets.' + k); return v === 'eco.book.sets.' + k ? k : v; };
  return <section className="cz-book" aria-labelledby="book-h">
    <h2 id="book-h">{t('eco.book.hed')}</h2>
    <p className="cz-hint">{t('eco.book.dek')}</p>
    {pg.rows.map(({ set, items, season }) => { const have = items.filter((x) => owns(x.id, s)).length; const w = season ? items[0].window : undefined; return <div key={set} className={'cz-book__set' + (have === items.length ? ' is-done' : '') + (season ? ' is-season' : '')}>
      <div className="cz-book__h"><h3 dir="auto">{setName(set)}</h3><span className="g-num">{have === items.length ? t('eco.book.done') : t('eco.book.have', { a: have, b: items.length })}</span></div>
      {w && <p className="cz-book__when">{now < w.from ? t('eco.book.how.soon', { d: fmtDate(w.from, t.lang, { day: 'numeric', month: 'short' }) }) : now < w.to ? <>{t('eco.rails.leaves')} · <Countdown to={w.to} lang={t.lang} /></> : t('eco.book.how.gone')}</p>}
      <span className="g-bar g-bar--sm"><i style={{ width: Math.round((have / items.length) * 100) + '%' }} /></span>
      <ul className="cz-book__list">{items.map((it) => { const own = owns(it.id, s); return <li key={it.id} className={own ? 'is-own' : 'is-miss'}>
        <button type="button" onClick={() => onPick(it.id)} aria-label={itemName(t, it)}><span className="cz-tile__art"><Thumb it={it} s={s} /></span></button>
        <span className="cz-book__txt"><b dir="auto">{itemName(t, it)}</b><small>{own ? t('eco.state.owned') : how(it)}</small>{it.source === 'earned' && !own && <em className="cz-book__never">{t('eco.book.neverShort')}</em>}</span>
        {own ? <Icon n="check" size={16} /> : it.source === 'earned' ? <Icon n="lock" size={14} /> : null}
      </li>; })}</ul>
    </div>; })}
    <Pager p={pg} />
  </section>;
}

