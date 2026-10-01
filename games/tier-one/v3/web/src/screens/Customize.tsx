// "Your desk" (GOTY.md §8.4): one place to dress the byline, the desk and the newsroom, with a live preview.
// Tap a look to try it on; buy or put it on in place; gift by friend code; this week's featured looks and the season's
// limited set with honest countdowns. Everything is cosmetic: nothing here changes a Daily board or a score.
// Logic: lib/wallet.ts (coins, credits, ledger, equip) and lib/catalog.ts (the one catalog). Pieces: ui/customize.tsx.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT, fmtDate } from '../lib/i18n';
import { useSave } from '../lib/save';
import { toast } from '../lib/meta';
import { sfx } from '../lib/sfx';
import { seasonAt } from '../lib/season';
import { MONET, goldOnSale, buyGold } from '../lib/monet';
import {
  KINDS, itemsOf, item, featuredView, seasonSet, priceNow, onSale, isStandard, kindDef, GOLD_CREDITS, newThisWeek, lastChance, bookSets, applyRemoteCatalog,
  activeWindow, windowsOf, dropped, type Item, type Kind, type RemoteCatalog,
} from '../lib/catalog';
import {
  equipped, owns, buy, equipItem, refund, refundable, bestCurrency, balance, ledger, shortBy, referralCode, referralLink, CREDITS_EARN, giftable,
  setPaperName, paperName, PAPER_NAME_MAX, whyText, giftOutbox, toggleShowcase, SHOWCASE_MAX, priceText, type Currency,
} from '../lib/wallet';
import { syncEarned, earnProgress } from '../lib/earned';
import { setCustomCatchphrase, retryCustomCatchphrase, customUnlocked, customLine, catchDef, cleanLine, lineAllowed, CUSTOM_MAX, CUSTOM_ID, TONE_SFX } from '../lib/catchphrase';
import { getConfig } from '../lib/flags';
import { Icon, TopBar, GBtn, confetti } from '../ui/game';
import { Seg } from '../ui/screenbits';
import { WalletStrip, Stage, Tile, Thumb, PriceTag, CreditIcon, Countdown, GiftSheet, PacksSheet, itemName, type Try } from '../ui/customize';
import type { Save } from '../lib/save';

type Tab = Kind | 'book';
let remoteApplied = false;
/** Once per session: the v4 config's looks, drops, rails, vault and earned-only list (lib/catalog.ts applyRemoteCatalog). */
function applyRemoteOnce() {
  if (remoteApplied) return; remoteApplied = true;
  try { const c = getConfig()?.catalog as unknown as RemoteCatalog | undefined; if (c && (c.looks || c.vault || c.drops || c.rails)) applyRemoteCatalog(c); } catch { /* the built-in catalog stands */ }
}
import type { Chrome } from '../App';

export function CustomizeScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const [tab, setTab] = useState<Tab>('byline');
  const [sel, setSel] = useState<string>(() => equipped('byline').id);
  useEffect(() => { applyRemoteOnce(); retryCustomCatchphrase(); const got = syncEarned().map((id) => item(id)).filter((x): x is Item => !!x); if (got.length) { sfx('unlock'); confetti(['#F7B928', '#FFE08A', '#F4EFE4']); toast('ach', t('eco.toast.earned', { n: itemName(t, got[0]) }), got.length > 1 ? t('eco.toast.earnedMore', { n: got.length - 1 }) : t('eco.book.never')); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [giftFor, setGiftFor] = useState<Item | null>(null);
  const [packs, setPacks] = useState(false);
  const [name, setName] = useState(() => s.desk?.paper || '');
  const now = Date.now();
  const season = seasonAt(now);
  const book = tab === 'book';
  const kind: Kind = book ? 'byline' : tab;
  const items = useMemo(() => itemsOf(kind, now), [kind, now]);
  const feat = useMemo(() => featuredView(now), [now]);
  const set = useMemo(() => seasonSet(season.id), [season.id]);
  const fresh = useMemo(() => newThisWeek(now), [now]);
  const last = useMemo(() => lastChance(now), [now]);
  const selected = item(sel) || items[0];
  const tryOn: Try = selected && !owns(selected.id, s) ? { [selected.kind]: selected.id } : {};
  const pick = (id: string) => { const it = item(id); if (!it) return; sfx('ui.tap'); if (it.kind !== tab) setTab(it.kind); setSel(id); if (it.kind === 'ringtone' && it.preview.k === 'ringtone') sfx(it.preview.sfx); };
  const changeTab = (k: Tab) => { setTab(k); if (k !== 'book') setSel(equipped(k, s).id); };
  const pinned = (s.desk?.show || []).includes(selected?.id || '');
  const doPin = (it: Item) => { sfx('ui.pop'); toggleShowcase(it.id); };

  // Keyboard: arrows move between tiles; Enter/Space picks (native button).
  const grid = useRef<HTMLDivElement>(null);
  const onKey = (e: React.KeyboardEvent) => {
    if (!/^Arrow/.test(e.key)) return;
    const tiles = Array.from(grid.current?.querySelectorAll<HTMLButtonElement>('[data-tile]') || []);
    const i = tiles.indexOf(document.activeElement as HTMLButtonElement); if (i < 0) return;
    const cols = getComputedStyle(grid.current!).gridTemplateColumns.split(' ').length || 3;
    const rtl = t.rtl, fwd = e.key === (rtl ? 'ArrowLeft' : 'ArrowRight'), back = e.key === (rtl ? 'ArrowRight' : 'ArrowLeft');
    const j = fwd ? i + 1 : back ? i - 1 : e.key === 'ArrowDown' ? i + cols : e.key === 'ArrowUp' ? i - cols : i;
    if (tiles[j]) { e.preventDefault(); tiles[j].focus(); }
  };
  useEffect(() => { setName(s.desk?.paper || ''); }, [s.desk?.paper]);

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
    if (r.ok) { sfx('shred'); if (it) toast('info', t('eco.toast.refunded', { n: itemName(t, it) })); if (tab !== 'book') setSel(equipped(tab).id); } else sfx('bad');
  };
  const copyLink = async () => { try { await navigator.clipboard.writeText(referralLink(s)); sfx('ui.pop'); toast('info', t('eco.ref.copied')); } catch { toast('info', referralLink(s)); } };
  const saveName = () => { if (setPaperName(name)) { sfx('stamp.done'); toast('info', t('eco.toast.renamed', { n: paperName() })); } };

  const price = selected && onSale(selected, now) ? priceNow(selected, now) : null;
  const was = selected && price && (price.coins !== selected.price.coins || price.credits !== selected.price.credits) ? selected.price : undefined;
  const isOn = !!selected && equipped(selected.kind, s).id === selected.id;
  const owned = !!selected && owns(selected.id, s);
  const gold = tab === 'gold';
  const catchTab = tab === 'catchphrase';
  const goldId = 'gold.' + season.id;
  const haveGold = owns(goldId, s);

  return <div className="g-screen g-screen--wide cz" style={{ ['--sa' as string]: season.accent }}>
    <TopBar back={{ label: t('eco.act.back'), onClick: () => chrome.go({ n: 'me' }) }} title={t('eco.title')} onMenu={chrome.openSettings} />
    <div className="cz__grid">
      <aside className="cz__side">
        <WalletStrip onGet={() => setPacks(true)} />
        <Stage tab={book ? 'byline' : tab} s={s} tryOn={book ? {} : tryOn} />
        <p className="cz-hint">{t('eco.sub')}</p>
      </aside>

      <div className="cz__main">
        <Seg<Tab> className="cz-tabs" value={tab} onChange={changeTab} label={t('eco.title')} options={[...KINDS.map((k) => ({ v: k as Tab, label: k === 'catchphrase' ? t('cp.ui.tab') : t('eco.tabs.' + k) })), { v: 'book' as Tab, label: t('eco.tabs.book') }]} />

        {book ? <BookView s={s} now={now} onPick={(id) => pick(id)} /> : gold ? <GoldTab have={haveGold} sname={t(season.nameKey)} onBuy={() => doBuy(item(goldId)!, 'credits')} credits={balance('credits', s)} />
          : <>
            <p className="cz-hint">{t('eco.act.tryOn')}</p>
            <div className="cz-tiles" ref={grid} onKeyDown={onKey} role="listbox" aria-label={t('eco.tabs.' + tab)}>
              {items.map((it, k) => { const p = onSale(it, now) ? priceNow(it, now) : null; return <Tile key={it.id} it={it} s={s} on={equipped(it.kind, s).id === it.id} owned={owns(it.id, s)} selected={sel === it.id} price={p} was={p && (p.coins !== it.price.coins || p.credits !== it.price.credits) ? it.price : undefined} onPick={() => pick(it.id)} tabIndex={sel === it.id || (k === 0 && !items.some((x) => x.id === sel)) ? 0 : -1} />; })}
            </div>
          </>}

        {catchTab && <CatchPanel s={s} />}

        {selected && !gold && !book && <section className="cz-act" aria-live="polite">
          <div className="cz-act__head"><h2 className="cz-act__name" dir="auto">{itemName(t, selected)}</h2><span className="cz-act__rar">{t('eco.rarity.' + selected.rarity)}{selected.set && !/^\w+-\d{4}$/.test(selected.set) ? ' · ' + selected.set : ''}</span></div>
          {selected.descKey && <p className="cz-act__desc">{t(selected.descKey)}</p>}
          <div className="cz-act__line">
            {isOn ? <span className="cz-tile__on"><Icon n="check" size={13} />{t('eco.state.on')}</span> : owned ? <span>{t('eco.state.owned')}</span>
              : price ? <><PriceTag price={price} /> {was && <span className="cz-act__was">({t('eco.price.usual', { p: t('eco.price.' + (was.credits != null ? 'credits' : 'coins'), { n: was.credits ?? was.coins ?? 0 }) })})</span>}</>
                : <span>{t('eco.source.' + selected.source)}</span>}
            {!owned && activeWindow(selected, now) && <span className="cz-act__count">{t('eco.rails.leaves')} · <Countdown to={activeWindow(selected, now)!.to} lang={t.lang} /></span>}
          </div>
          {selected.source === 'earned' && selected.earn && !owned && <p className="cz-act__desc"><Icon n="lock" size={13} /> {earnText(t, selected, s)} · {t('eco.book.never')}</p>}
          {selected.kind === 'paper' && owned && <label className="cz-field"><span className="cz-field__l">{t('eco.paper.hed')}</span>
            <input className="cz-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={PAPER_NAME_MAX} placeholder={t('eco.paper.ph')} dir="auto" />
            <small>{s.desk?.paper ? t('eco.paper.current', { n: s.desk.paper }) : t('eco.paper.std')}</small></label>}
          <div className="cz-act__btns">
            {selected.kind === 'paper' && owned ? <GBtn kind="gold" size="sm" onClick={saveName} disabled={(name.trim() || '') === (s.desk?.paper || '')}><Icon n="pen" />{t('eco.paper.save')}</GBtn>
              : owned ? <GBtn kind={isOn ? 'dark' : 'gold'} size="sm" onClick={() => doEquip(selected, isOn)} disabled={isStandard(selected.id) && isOn}><Icon n={isOn ? 'x' : 'check'} />{isOn ? t('eco.act.off') : t('eco.act.equip')}</GBtn>
                : price ? <>
                  {price.coins != null && <GBtn kind="gold" size="sm" onClick={() => doBuy(selected, 'coins')} disabled={shortBy(price, 'coins', s) > 0}><span className="g-coin" aria-hidden="true" />{shortBy(price, 'coins', s) > 0 ? t('eco.act.short', { n: shortBy(price, 'coins', s) }) : t('eco.act.buyWith', { p: t('eco.price.coins', { n: price.coins }) })}</GBtn>}
                  {price.credits != null && <GBtn kind={bestCurrency(price, s) === 'credits' || price.coins == null ? 'gold' : 'paper'} size="sm" onClick={() => doBuy(selected, 'credits')} disabled={shortBy(price, 'credits', s) > 0}><CreditIcon size={15} />{shortBy(price, 'credits', s) > 0 ? t('eco.act.short', { n: shortBy(price, 'credits', s) }) : t('eco.act.buyWith', { p: t('eco.price.credits', { n: price.credits }) })}</GBtn>}
                </> : <span className="cz-act__desc">{t('eco.season.earn')}</span>}
            {selected.kind === 'ringtone' && selected.preview.k === 'ringtone' && <GBtn kind="ghost" size="sm" onClick={() => sfx((selected.preview as { sfx: 'phone.ring' }).sfx)}><Icon n="sound" />{t('eco.act.hear')}</GBtn>}
            {giftable(selected) && onSale(selected, now) && <GBtn kind="ghost" size="sm" onClick={() => setGiftFor(selected)}><Icon n="gift" />{t('eco.act.gift')}</GBtn>}
            {owned && !isStandard(selected.id) && kindDef(selected.kind).showcase && <GBtn kind="ghost" size="sm" onClick={() => doPin(selected)}><Icon n="star" />{pinned ? t('eco.act.unpin') : t('eco.act.pin')}{!pinned && ` (${(s.desk?.show || []).length}/${SHOWCASE_MAX})`}</GBtn>}
          </div>
        </section>}

        {/* ---------- drops: new this week, last chance (season sets and vault returns, real dates only) */}
        <section className="cz-rails" aria-labelledby="new-h">
          <div className="g-sec" style={{ marginTop: 6 }}><h2 id="new-h">{t('eco.rails.new')}</h2></div>
          {fresh.length ? <div className="cz-feat__row">{fresh.map((it) => <RailCard key={it.id} it={it} s={s} now={now} onPick={() => pick(it.id)} />)}</div> : <p className="g-fine">{t('eco.rails.none')}</p>}
          {last.length > 0 && <>
            <div className="g-sec"><h2 id="last-h" className="cz-rails__last">{t('eco.rails.last')}</h2></div>
            <div className="cz-feat__row">{last.map(({ item: it, ends, vault }) => <RailCard key={it.id} it={it} s={s} now={now} onPick={() => pick(it.id)} badge={vault ? t('eco.rails.vault') : undefined} ends={ends} />)}</div>
            <p className="g-fine">{t('eco.rails.lastNote', { d: fmtDate(last[0].ends - 864e5, t.lang, { weekday: 'short', day: 'numeric', month: 'short' }) })}</p>
          </>}
        </section>

        {/* ---------- this week's featured */}
        <section className="cz-feat" aria-labelledby="feat-h">
          <div className="g-sec" style={{ marginTop: 6 }}><h2 id="feat-h">{t('eco.featured.k')}</h2><span className="cz-feat__ends">{t('eco.featured.ends', { d: fmtDate(feat.ends, t.lang, { weekday: 'short' }) })}</span></div>
          <div className="cz-feat__row">
            {feat.items.map(({ item: it, price: p, was: w, pinned }) => { const own = owns(it.id, s); return <button key={it.id} type="button" className={'cz-feat__card' + (own ? ' is-owned' : '')} onClick={() => pick(it.id)} aria-label={itemName(t, it)}>
              <span className="cz-tile__art"><Thumb it={it} s={s} /></span>
              <b dir="auto">{itemName(t, it)}</b>
              {!pinned && !own && <span className="cz-feat__off">{t('eco.featured.off')}</span>}
              {own ? <span className="cz-tile__owned">{t('eco.state.owned')}</span> : <PriceTag price={p} was={pinned ? undefined : w} />}
            </button>; })}
          </div>
          <p className="g-fine">{t('eco.featured.note')}</p>
        </section>

        {/* ---------- the season's limited set */}
        <section className="cz-season" aria-labelledby="set-h">
          <div className="cz-season__h"><h2 id="set-h">{t('eco.season.k', { s: t(season.nameKey) })}</h2><span><Countdown to={season.end} lang={t.lang} /></span></div>
          <div className="cz-season__row">
            {set.map((it) => { const p = onSale(it, now) ? priceNow(it, now) : null; return <Tile key={it.id} it={it} s={s} on={equipped(it.kind, s).id === it.id} owned={owns(it.id, s)} selected={sel === it.id} price={p} onPick={() => pick(it.id)} tabIndex={0} />; })}
          </div>
          <p className="cz-season__note">{t('eco.season.gone')} {t('eco.season.earn')}</p>
        </section>

        {/* ---------- bring a friend */}
        <section className="cz-ref" aria-labelledby="ref-h">
          <h2 id="ref-h">{t('eco.ref.hed')}</h2>
          <p>{t('eco.ref.dek', { n: CREDITS_EARN.referral })}</p>
          <div className="cz-ref__row">
            <span className="cz-ref__code"><small>{t('eco.ref.code')}</small>{referralCode(s)}</span>
            <GBtn kind="paper" size="sm" onClick={copyLink}><Icon n="share" />{t('eco.ref.copy')}</GBtn>
          </div>
          {s.wallet?.ref?.from && !s.wallet.ref.paid && <p className="cz-ref__from">{t('eco.ref.from', { c: s.wallet.ref.from, n: CREDITS_EARN.referral })}</p>}
          {!!s.wallet?.ref?.friends && <p className="cz-ref__from">{t('eco.ref.friends', { n: s.wallet.ref.friends })}</p>}
          {giftOutbox(s).length > 0 && <div className="cz-outbox"><b>{t('eco.gift.outbox')}</b>{giftOutbox(s).slice(0, 3).map((g) => <span key={g.id}>{itemName(t, item(g.item)!)} → {g.to} · {t('eco.gift.status.' + g.status)}</span>)}</div>}
        </section>

        {/* ---------- recent credits and refunds */}
        <section className="cz-ledger" aria-labelledby="led-h">
          <h2 id="led-h">{t('eco.ledger.hed')}</h2>
          {ledger(s).length === 0 ? <p className="cz-ledger__empty">{t('eco.ledger.empty')}</p> : <ul>{ledger(s).slice(0, 6).map((e) => {
            const it = e.item ? item(e.item) : null; const k = e.why.split(':')[0];
            return <li key={e.id}>
              <span>{fmtDate(e.at, t.lang, { day: 'numeric', month: 'short' })}</span>
              <span className="cz-ledger__what" dir="auto">{whyText(e.why)}{it ? ': ' + itemName(t, it) : k === 'earn' ? ': ' + t('eco.earnWhy.' + e.why.split(':')[1]) : ''}{e.to && <small> → {e.to}</small>}{e.refunded && <small> · {t('eco.ledger.refunded')}</small>}</span>
              <b className={'g-num cz-ledger__d ' + (e.d < 0 ? 'neg' : 'pos')}>{e.cur === 'coins' ? <span className="g-coin" aria-hidden="true" /> : <CreditIcon size={12} />}{e.d > 0 ? '+' : e.d < 0 ? '−' : ''}{Math.abs(e.d)}</b>
              {refundable(e) ? <button type="button" className="cz-ledger__refund" onClick={() => doRefund(e.id)}>{t('eco.ledger.refund')}</button> : <span />}
            </li>; })}</ul>}
          <p className="g-fine">{t('eco.ledger.note')}</p>
        </section>

        {/* no dead ends: the store always hands you back to the game */}
        <GBtn kind="dark" size="lg" className="cz-desk" onClick={() => chrome.go({ n: 'front' })}><Icon n="home" />{t('g.res.home')}</GBtn>

        <section className="cz-promise"><h2>{t('eco.promise.hed')}</h2><ul>{(t.list('eco.promise.list') as string[]).map((x, k) => <li key={k}><Icon n="check" size={14} />{x}</li>)}</ul></section>
      </div>
    </div>
    {giftFor && <GiftSheet it={giftFor} onClose={() => setGiftFor(null)} onSent={(to, queued) => toast('ach', t(queued ? 'eco.gift.queued' : 'eco.gift.sent', { c: to }))} />}
    {packs && <PacksSheet onClose={() => setPacks(false)} />}
  </div>;
}

function earnText(t: ReturnType<typeof useT>, it: Item, s: Save): string {
  const e = it.earn!; const [have, need] = earnProgress(e, s);
  const r = e.ref ? (e.via === 'rank' ? t('cn.tier.' + e.ref) : e.via === 'rivalry' ? t('rival.' + e.ref) : e.ref) : '';
  const base = t('eco.book.earn.' + e.via, { n: e.n ?? '', r });
  return e.via === 'streak' || e.via === 'referral' || e.via === 'story' ? base + ' · ' + t('eco.book.have', { a: have, b: need }) : base;
}
function RailCard({ it, s, now, onPick, badge, ends }: { it: Item; s: Save; now: number; onPick: () => void; badge?: string; ends?: number }) {
  const t = useT(); const own = owns(it.id, s); const p = onSale(it, now) ? priceNow(it, now) : null;
  return <button type="button" className={'cz-feat__card' + (own ? ' is-owned' : '')} onClick={onPick} aria-label={itemName(t, it)}>
    <span className="cz-tile__art"><Thumb it={it} s={s} /></span>
    <b dir="auto">{itemName(t, it)}</b>
    {badge && <span className="cz-feat__off">{badge}</span>}
    {ends && !own && <small className="cz-rails__ends"><Countdown to={ends} lang={t.lang} /></small>}
    {own ? <span className="cz-tile__owned">{t('eco.state.owned')}</span> : p && <PriceTag price={p} />}
  </button>;
}

/** "Your catchphrase": the line fires on a Confirmed call that lands. Tiles above pick it; this writes your own. */
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
  return <section className="cz-cpp" aria-labelledby="cp-h">
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

/** The collection book: every set, owned and missing, and how each missing look is won. */
function BookView({ s, now, onPick }: { s: Save; now: number; onPick: (id: string) => void }) {
  const t = useT();
  const sets = useMemo(() => bookSets(now), [now]);
  const how = (it: Item): string => {
    if (it.source === 'earned' && it.earn) return earnText(t, it, s);
    if (it.source === 'track') return t('eco.book.how.track');
    if (it.source === 'event') return t('eco.book.how.event');
    if (it.source === 'gold') return t('eco.book.how.gold');
    if (!dropped(it, now)) return t('eco.book.how.soon', { d: fmtDate(it.drop!, t.lang, { day: 'numeric', month: 'short' }) });
    const w = activeWindow(it, now);
    if (w) return t('eco.book.how.window', { d: fmtDate(w.to - 864e5, t.lang, { day: 'numeric', month: 'short' }), p: priceText(priceNow(it, now)) });
    if (windowsOf(it).length) return t('eco.book.how.gone');
    return t('eco.book.how.buy', { p: priceText(priceNow(it, now)) });
  };
  const setName = (k: string) => { if (/^\w+-\d{4}$/.test(k)) { const [n, y] = k.split('-'); return t('season.names.' + n) + ' ' + y; } const v = t('eco.book.sets.' + k); return v === 'eco.book.sets.' + k ? k : v; };
  return <section className="cz-book" aria-labelledby="book-h">
    <h2 id="book-h">{t('eco.book.hed')}</h2>
    <p className="cz-hint">{t('eco.book.dek')}</p>
    {sets.map(({ set, items, season }) => { const have = items.filter((x) => owns(x.id, s)).length; const w = season ? items[0].window : undefined; return <div key={set} className={'cz-book__set' + (have === items.length ? ' is-done' : '') + (season ? ' is-season' : '')}>
      <div className="cz-book__h"><h3 dir="auto">{setName(set)}</h3><span className="g-num">{have === items.length ? t('eco.book.done') : t('eco.book.have', { a: have, b: items.length })}</span></div>
      {w && <p className="cz-book__when">{now < w.from ? t('eco.book.how.soon', { d: fmtDate(w.from, t.lang, { day: 'numeric', month: 'short' }) }) : now < w.to ? <>{t('eco.rails.leaves')} · <Countdown to={w.to} lang={t.lang} /></> : t('eco.book.how.gone')}</p>}
      <span className="g-bar g-bar--sm"><i style={{ width: Math.round((have / items.length) * 100) + '%' }} /></span>
      <ul className="cz-book__list">{items.map((it) => { const own = owns(it.id, s); return <li key={it.id} className={own ? 'is-own' : 'is-miss'}>
        <button type="button" onClick={() => onPick(it.id)} aria-label={itemName(t, it)}><span className="cz-tile__art"><Thumb it={it} s={s} /></span></button>
        <span className="cz-book__txt"><b dir="auto">{itemName(t, it)}</b><small>{own ? t('eco.state.owned') : how(it)}</small>{it.source === 'earned' && !own && <em className="cz-book__never">{t('eco.book.neverShort')}</em>}</span>
        {own ? <Icon n="check" size={16} /> : it.source === 'earned' ? <Icon n="lock" size={14} /> : null}
      </li>; })}</ul>
    </div>; })}
  </section>;
}

function GoldTab({ have, sname, onBuy, credits }: { have: boolean; sname: string; onBuy: () => void; credits: number }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  return <section className="cz-gold" aria-labelledby="gold-h">
    <h2 id="gold-h">{t('eco.gold.hed', { s: sname })}</h2>
    <p>{t('eco.gold.dek')}</p>
    {have ? <p className="cz-gold__have"><Icon n="check" size={18} />{t('eco.gold.have')}</p> : <div className="cz-gold__row">
      <GBtn kind="gold" size="sm" onClick={onBuy} disabled={credits < GOLD_CREDITS}><CreditIcon size={16} />{credits < GOLD_CREDITS ? t('eco.act.short', { n: GOLD_CREDITS - credits }) : t('eco.gold.buy', { n: GOLD_CREDITS })}</GBtn>
      {goldOnSale() ? <GBtn kind="dark" size="sm" disabled={busy} onClick={() => { setBusy(true); buyGold().finally(() => setBusy(false)); }}>{t('eco.gold.direct', { p: MONET.goldPrice })}</GBtn> : <small>{t('eco.gold.direct', { p: MONET.goldPrice })} · {t('eco.gold.soon')}</small>}
    </div>}
    <p className="g-fine">{t('season.gold.per')}</p>
  </section>;
}
