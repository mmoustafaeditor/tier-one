// The Pass (GOTY.md §3): the real-calendar season on top, then a compact track (where you are and the next three
// rewards), the weekly event, and the store behind its own sheet. Everything here is cosmetic or coins: nothing bought
// or earned reaches a Daily board, its sources or its score. Anything not actually on sale (lib/monet.ts) is not shown.
import { useEffect, useState } from 'react';
import { useT, num, fmtDate, type T } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { spend, toast } from '../lib/meta';
import { levelOf } from '../lib/progress';
import {
  trackView, claimReward, ensureSeason, pendingRecap, dismissRecap, seasonById, storeItems, ownedItems, equipped, equip, buyCosmetic,
  goldPreview, cosmetic, COS_KINDS, MAX_SLV, type CosKind, type Cosmetic, type Reward,
} from '../lib/season';
import { MONET, buyGold, buyPack, goldOnSale, packsOnSale } from '../lib/monet';
import { sfx } from '../lib/sfx';
import { Icon, TopBar, confetti } from '../ui/game';
import { Seg } from '../ui/screenbits';
import { Sheet } from '../ui/bits';
import { CosSwatch, Reveal, WeekEventBanner, cosName, type RevealItem } from '../ui/season';
import type { Chrome } from '../App';

type Filter = 'all' | 'mine' | CosKind;
// Ledger reasons in words ("mission:excl" → "Mission"); unknown reasons show as stored.
const why = (t: T, w: string) => { const k = w.split(':')[0], v = t('season.why.' + k); return v === 'season.why.' + k ? k : v; };

export function PassScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  useEffect(() => { ensureSeason(); }, []);
  const tv = trackView(s);
  const { def, lv, rows } = tv;
  const acct = levelOf(s.pp);
  const recap = pendingRecap(s);
  const [reveal, setReveal] = useState<RevealItem | null>(null);
  const [store, setStore] = useState(() => new URLSearchParams(location.search).get('store') === '1');
  const sname = t(def.nameKey);
  // The Gold lane only appears when it can really be bought, or when you already have it.
  const showGold = tv.gold || goldOnSale();

  const claim = (lane: 'free' | 'gold', L: number) => {
    const r = claimReward(lane, L); if (!r) return;
    setReveal({ coins: r.coins, cos: r.cos ? [r.cos] : undefined });
    if (r.cos && L === MAX_SLV) confetti([def.accent, '#F7B928', '#F4EFE4']);
  };
  const claimAll = () => {
    let coins = 0; const cos: string[] = [];
    for (const row of rows) {
      if (!row.reached) continue;
      if (row.free && !row.freeClaimed) { const r = claimReward('free', row.lv); if (r?.coins) coins += r.coins; if (r?.cos) cos.push(r.cos); }
      if (tv.gold && row.gold && !row.goldClaimed) { const r = claimReward('gold', row.lv); if (r?.coins) coins += r.coins; if (r?.cos) cos.push(r.cos); }
    }
    if (coins || cos.length) setReveal({ coins: coins || undefined, cos: cos.length ? cos : undefined });
  };
  const onEquip = (id: string) => { const c = cosmetic(id); if (c) { sfx('ui.tap'); equip(id, c.kind); } };

  // Where you are, then the next three levels that pay something on a lane you can see.
  const cur = rows[lv.n - 1];
  const next = rows.filter((r) => r.lv > lv.n && (r.free || (showGold && r.gold))).slice(0, 3);

  const cell = (r: Reward | null, reached: boolean, claimed: boolean, open: boolean, gold: boolean) => {
    const lane = gold ? ' is-gold' : '';
    if (!r) return <span className={'nslip__cell is-empty' + lane}><span className="nslip__what">{t('season.nothing')}</span></span>;
    const c = r.cos ? cosmetic(r.cos) : null;
    const body = c ? <CosSwatch c={c} nick={s.nick} size="sm" /> : <span className="slip__coins"><span className="g-coin" aria-hidden="true" />{r.coins}</span>;
    const label = c ? cosName(t, c) : t('season.reveal.coins', { n: r.coins || 0 });
    if (claimed) return <span className={'nslip__cell is-claimed' + lane}>{body}<span className="nslip__what">{label}</span><span className="slip__tick" aria-label={t('season.claimed')}><Icon n="check" size={12} /></span></span>;
    if (reached && open) return <button type="button" className={'nslip__cell is-ready' + lane} onClick={() => claim(r.lane, r.lv)} aria-label={t('season.claim') + ': ' + label}>{body}<span className="slip__claim">{t('season.claim')}</span></button>;
    return <span className={'nslip__cell is-locked' + lane}>{body}<span className="nslip__what">{label}</span></span>;
  };
  const slip = (r: (typeof rows)[number], now: boolean) => <li key={r.lv} className={'nslip' + (now ? ' is-now' : '')} aria-current={now ? 'step' : undefined}>
    <span className="nslip__n"><small>{now ? t('season.here') : t('season.lvShort')}</small><span className="g-num">{r.lv}</span></span>
    {cell(r.free, r.reached, r.freeClaimed, true, false)}
    {showGold && cell(r.gold, r.reached, r.goldClaimed, tv.gold, true)}
  </li>;

  const recapDef = recap ? seasonById(recap.id) : null;

  return <div className="g-screen g-screen--wide pass3 season" style={{ ['--sa' as string]: def.accent }}>
    <TopBar back={{ label: t('g.tabs.me'), onClick: () => chrome.go({ n: 'me' }) }} title={t('g.home.passT')} onMenu={chrome.openSettings} />
    <div className="g-stack">
      {recap && recapDef && <section className="recap" aria-labelledby="recap-h">
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

      <header className="shero shero--compact">
        <div className="shero__mast">
          <p className="g-mono shero__k">{t('season.k')}</p>
          <h1 className="shero__name">{sname}</h1>
          <p className="shero__dates">{fmtDate(def.start, t.lang, { day: 'numeric', month: 'short' })} – {fmtDate(def.end - 864e5, t.lang, { day: 'numeric', month: 'short', year: 'numeric' })} · {def.daysLeft <= 1 ? t('season.lastDay') : t('season.daysLeft', { n: def.daysLeft })}</p>
        </div>
        <div className="shero__lv">
          <span className="shero__num g-num" aria-hidden="true">{lv.n}</span>
          <div className="shero__bar">
            <p><b>{t('season.ofMax', { n: lv.n, m: MAX_SLV })}</b> <span>{lv.max ? t('season.maxed') : t('season.toNext', { n: lv.need - lv.into, l: lv.n + 1 })}</span></p>
            <span className="g-bar" style={{ ['--bar' as string]: 'var(--sa)' }}><i style={{ width: lv.pct + '%' }} /></span>
            <p className="shero__acct">{t('season.acct', { n: acct.n })}</p>
          </div>
        </div>
      </header>

      <section aria-labelledby="track-h" className="snext">
        <div className="g-sec"><h2 id="track-h">{t('season.next')}</h2>
          {tv.ready > 0 && <button type="button" className="g-btn g-btn--gold g-btn--sm" onClick={claimAll}>{t('season.claimAll', { n: tv.ready })}</button>}</div>
        <div className={'snext__grid' + (showGold ? ' has-gold' : '')}>
          <div className="snext__keys" aria-hidden="true"><span /><span>{t('season.free')}</span>{showGold && <span className="is-gold">{t('season.goldL')}</span>}</div>
          <ol className="snext__run" aria-label={t('season.track')}>
            {cur && slip(cur, true)}
            {next.map((r) => slip(r, false))}
          </ol>
        </div>
        <p className="g-fine">{t('season.xpLv', { n: def.ppPerLv })} {showGold ? t('season.trackNote') : t('season.trackNoteFree')}</p>
      </section>

      <WeekEventBanner onPlay={() => chrome.go({ n: 'practice' })} />

      <div className={'pass3__cols' + (showGold ? ' has-gold' : '')}>
        <section className="storec g-card g-card--desk" aria-labelledby="store-h">
          <div className="storec__head">
            <h2 id="store-h" className="storec__h">{t('season.store.k')}</h2>
            <span className="wallet-pill g-num"><span className="g-coin" aria-hidden="true" /><span className="sr">{t('pass.balance')} </span>{num(s.credits)}</span>
          </div>
          <p className="storec__dek">{t('season.store.dek')}</p>
          <div className="storec__peek" aria-hidden="true">{storeItems().filter((c, k, a) => a.findIndex((x) => x.kind === c.kind) === k).map((c) => <CosSwatch key={c.id} c={c} nick={s.nick} size="sm" />)}</div>
          <button type="button" className="g-btn g-btn--gold" onClick={() => { sfx('open'); setStore(true); }}><Icon n="gift" size={20} />{t('season.store.open')}</button>
        </section>
        {showGold && <GoldCard sname={sname} have={tv.gold} />}
      </div>
    </div>
    <Sheet open={store} onClose={() => setStore(false)} label={t('season.store.k')} wide>
      <StoreSheet onClose={() => setStore(false)} />
    </Sheet>
    {reveal && <Reveal item={reveal} onClose={() => setReveal(null)} onEquip={onEquip} />}
  </div>;
}

// The store: fixed coin prices, previews, what you own. Coin packs only when they are really on sale.
function StoreSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const s = useSave();
  const [filter, setFilter] = useState<Filter>('all');
  const items: Cosmetic[] = filter === 'mine' ? ownedItems(s) : storeItems().filter((c) => filter === 'all' || c.kind === filter)
    .concat(filter === 'all' ? [] : ownedItems(s, filter as CosKind).filter((c) => typeof c.price !== 'number'));
  const buy = (c: Cosmetic) => { if (buyCosmetic(c.id)) { sfx('coin'); toast('info', t('season.store.bought', { n: cosName(t, c) })); } };
  const favour = () => {
    const d = new Date().toISOString().slice(0, 10), k = 'fav:' + d;
    if ((s.stats[k] || 0) >= 3 || !s.career) return;
    if (spend(15, 'favour')) { sfx('coin'); update((x) => { x.stats[k] = (x.stats[k] || 0) + 1; if (x.career) { const kinds = ['burner', 'tipoff', 'stakeout'] as const; const kind = kinds[(x.stats[k] - 1) % 3]; x.career.favours[kind]++; toast('info', t('career.' + kind)); } }); }
  };
  const [favName, favD] = t.list('pass.items.favour') as string[];
  const packs = packsOnSale() ? MONET.packs.filter((p) => p.url) : [];
  return <div className="sheet__body storesheet">
    <div className="storesheet__head">
      <h2 className="g-h2">{t('season.store.k')}</h2>
      <span className="wallet-pill g-num"><span className="g-coin" aria-hidden="true" /><span className="sr">{t('pass.balance')} </span>{num(s.credits)}</span>
      <button type="button" className="g-icbtn" onClick={onClose} aria-label={t('common.close')}><Icon n="x" /></button>
    </div>
    <Seg<Filter> className="store__seg" value={filter} onChange={setFilter} label={t('season.store.k')}
      options={[{ v: 'all', label: t('season.store.all') }, ...COS_KINDS.map((k) => ({ v: k as Filter, label: t('season.store.kinds.' + k) })), { v: 'mine', label: t('season.store.mine') }]} />
    <div className="store">
      {items.map((c) => <StoreItem key={c.id} c={c} onBuy={buy} />)}
      {filter === 'all' && s.career && <div className="sitem">
        <span className="cos cos--favour" aria-hidden="true"><Icon n="gift" /></span>
        <b className="sitem__name">{favName}</b><small className="sitem__d">{favD}</small>
        <div className="sitem__acts"><button type="button" className="g-btn g-btn--sm g-btn--gold" disabled={s.credits < 15} onClick={favour}><span className="g-coin" aria-hidden="true" />15</button></div>
      </div>}
      {items.length === 0 && <p className="store__empty">{t('season.store.empty')}</p>}
    </div>
    <p className="g-fine">{t('season.store.note')}</p>
    {packs.length > 0 && <section aria-labelledby="packs-h" className="storesheet__sec">
      <div className="g-sec"><h2 id="packs-h">{t('season.packs.k')}</h2></div>
      <div className="spacks">{packs.map((p) => <button type="button" key={p.id} className="spack" onClick={() => { void buyPack(p.id); }}>
        <b className="g-num"><span className="g-coin" aria-hidden="true" />{num(p.coins)}</b>
        <span className="spack__p">{p.price}{p.bonus && <small> {p.bonus}</small>}</span>
      </button>)}</div>
      <p className="g-fine">{t('season.packs.noteLive')}</p>
    </section>}
    <section className="storesheet__sec" aria-labelledby="earn-h">
      <div className="g-sec"><h2 id="earn-h">{t('season.store.earnH')}</h2></div>
      <p className="g-sub">{t('pass.earned')}</p>
      {s.ledger.length > 0 && <ul className="ledger3">{s.ledger.slice(0, 4).map((l, k) => <li key={k}><span>{fmtDate(l.at, t.lang, { day: 'numeric', month: 'short' })}</span><span>{why(t, l.why)}</span><b className={'g-num ' + (l.d < 0 ? 'neg' : 'pos')}>{num(l.d, true)}</b></li>)}</ul>}
    </section>
  </div>;
}

function StoreItem({ c, onBuy }: { c: Cosmetic; onBuy: (c: Cosmetic) => void }) {
  const t = useT();
  const s = useSave();
  const own = s.owned.includes(c.id), on = equipped(c.kind, s)?.id === c.id;
  const price = typeof c.price === 'number' ? c.price : 0;
  const from = c.price === 'event' ? t('season.store.event') : c.price === 'gold' ? t('season.store.goldOnly') : c.price === 'track' ? t('season.store.track') : t('season.store.kind1.' + c.kind);
  return <div className={'sitem' + (on ? ' is-on' : '')}>
    {c.kind === 'ringtone' && c.sfx ? <button type="button" className="sitem__hear" onClick={() => sfx(c.sfx!)} aria-label={t('season.store.hear') + ': ' + cosName(t, c)}><CosSwatch c={c} /><span className="sitem__hearL"><Icon n="sound" size={14} />{t('season.store.hear')}</span></button> : <CosSwatch c={c} nick={s.nick} />}
    <b className="sitem__name">{cosName(t, c)}</b>
    <small className="sitem__d">{from}</small>
    <div className="sitem__acts">
      {own ? <button type="button" className="g-btn g-btn--sm g-btn--dark" aria-pressed={on} onClick={() => { sfx('ui.tap'); equip(on ? null : c.id, c.kind); }}>{on ? t('season.store.off') : t('season.store.equip')}</button>
        : <button type="button" className="g-btn g-btn--sm g-btn--gold" disabled={s.credits < price} onClick={() => onBuy(c)}>{s.credits < price ? t('season.store.short', { n: price - s.credits }) : <><span className="g-coin" aria-hidden="true" />{t('season.store.buy', { n: price })}</>}</button>}
    </div>
  </div>;
}

// Shown only when Gold can really be bought this season, or you already have it.
function GoldCard({ sname, have }: { sname: string; have: boolean }) {
  const t = useT();
  const s = useSave();
  const prev = goldPreview();
  const [busy, setBusy] = useState(false);
  return <section className="goldc" aria-labelledby="gold-h">
    <h2 id="gold-h" className="goldc__hed">{t('season.gold.hed', { s: sname })}</h2>
    <p className="goldc__dek">{t('season.gold.dek')}</p>
    <ol className="goldc__preview" aria-label={t('season.gold.preview')}>
      {prev.slice(0, 4).map((c, k) => <li key={c.id}><CosSwatch c={c} nick={s.nick} size="sm" /><span className="goldc__lv g-num">{t('season.gold.at', { n: (k + 1) * 5 })}</span><span className="goldc__nm">{cosName(t, c)}</span></li>)}
    </ol>
    <p className="goldc__bonus"><b>{t('season.gold.bonus')}</b> {t('season.gold.bonusD')}</p>
    {have ? <p className="goldc__have"><Icon n="check" size={18} />{t('season.gold.have')}</p> : <>
      <p className="goldc__price"><b className="g-num">{MONET.goldPrice}</b><span>{t('season.gold.per')}</span></p>
      <button type="button" className="g-btn g-btn--gold" disabled={busy} onClick={() => { setBusy(true); buyGold().finally(() => setBusy(false)); }}>{t('season.gold.buy', { p: MONET.goldPrice })}</button>
    </>}
    <div className="goldc__promise"><h3>{t('season.gold.never')}</h3>
      <ul>{(t.list('season.gold.neverL') as string[]).map((x, k) => <li key={k}><Icon n="check" size={14} />{x}</li>)}</ul></div>
  </section>;
}
