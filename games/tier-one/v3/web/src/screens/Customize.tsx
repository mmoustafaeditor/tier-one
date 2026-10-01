// Shop (UI41.md "The phone" › Shop): lock faces, themes, phone skins, catchphrases, coins and Gold. One paged screen
// per category: six items a page (tap one to select it), the selected item's one action in the footer (Buy / Put it
// on / On). Coins and credits are never confused: coins are earned by playing, credits are bought. Prices and rules
// are lib/catalog.ts and lib/wallet.ts; nothing here changes a score. The route `customize` is an alias of `shop`.
import { useMemo, useState } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave, type Save } from '../lib/save';
import { sfx } from '../lib/sfx';
import { toast } from '../lib/meta';
import { itemsOf, onSale, priceNow, isStandard, GOLD_CREDITS, type Item } from '../lib/catalog';
import { equipped, owns, buy, equipItem, shortBy, goldItemId, buyCoinPack, buyCreditPack, creditPacksOnSale, COIN_PACKS, CREDIT_PACKS, type Currency } from '../lib/wallet';
import { isGold } from '../lib/season';
import { Screen, Pager } from '../ui/screen';
import { itemName, lineText, CreditIcon } from '../ui/customize';
import { LookThumb } from '../ui/phone';
import type { Chrome, ShopCat } from '../App';

const CATS: ShopCat[] = ['lockface', 'theme', 'device', 'catchphrase', 'coins', 'gold'];
const chunk = <T,>(xs: T[], n: number): T[][] => { const out: T[][] = []; for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n)); return out; };

type LookCat = Exclude<ShopCat, 'coins' | 'gold'>;
const lookItems = (kind: LookCat, s: Save) => itemsOf(kind).filter((x) => x.source !== 'track' || owns(x.id, s));

export function CustomizeScreen({ cat: want, ...chrome }: Chrome & { cat?: ShopCat }) {
  const t = useT();
  const s = useSave();
  const [cat, setCat] = useState<ShopCat>(want || 'lockface');
  const [sel, setSel] = useState<Partial<Record<LookCat, string>>>({});
  const look = cat !== 'coins' && cat !== 'gold' ? cat : null;
  const items = useMemo(() => (look ? lookItems(look, s) : []), [look]); // eslint-disable-line react-hooks/exhaustive-deps
  const it = look ? items.find((x) => x.id === (sel[look] || equipped(look, s).id)) || items[0] : undefined;
  const footer = cat === 'gold' ? <GoldButton s={s} onCredits={() => setCat('coins')} /> : it ? <Action it={it} s={s} onCredits={() => setCat('coins')} /> : undefined;
  return <Screen title={t('s41.app.shop')} onBack={chrome.back} footer={footer}
    right={<span className="sh-wallet" aria-label={t('s41.sh.wallet', { c: num(s.credits), k: num(s.wallet?.credits || 0) })}><span className="g-coin" aria-hidden="true" /><b className="g-num">{num(s.credits)}</b><CreditIcon size={14} /><b className="g-num">{num(s.wallet?.credits || 0)}</b></span>}>
    <div className="pc-tabs pc-tabs--3" role="tablist" aria-label={t('s41.app.shop')}>
      {CATS.map((k) => <button key={k} type="button" role="tab" aria-selected={cat === k} className={cat === k ? 'on' : ''} onClick={() => { sfx('ui.tap'); setCat(k); }}>{t('s41.sh.cat.' + k)}</button>)}
    </div>
    {cat === 'coins' ? <Coins s={s} /> : cat === 'gold' ? <Gold s={s} /> : <>
      <p className="sh-dek">{t('s41.sh.dek.' + cat)}</p>
      <Pager key={cat} items={chunk(items, 3)} per={2} render={(row, k) => <div key={k} className="sh-row">{row.map((x) => <LookTile key={x.id} it={x} s={s} kind={cat} selected={x.id === it?.id} onPick={() => { sfx('ui.tap'); setSel((m) => ({ ...m, [cat]: x.id })); }} />)}</div>} />
    </>}
  </Screen>;
}

function LookTile({ it, s, kind, selected, onPick }: { it: Item; s: Save; kind: string; selected: boolean; onPick: () => void }) {
  const t = useT();
  const on = equipped(it.kind, s).id === it.id, have = owns(it.id, s);
  const p = onSale(it) ? priceNow(it) : null;
  return <button type="button" className={'sh-tile' + (selected ? ' is-sel' : '') + (on ? ' is-on' : '')} aria-pressed={selected} onClick={onPick}>
    <span className="sh-tile__art">{kind === 'catchphrase' ? <span className="sh-cp" dir="auto">“{lineText(t, s, it)}”</span> : <LookThumb it={it} />}</span>
    <span className="sh-tile__n" dir="auto">{itemName(t, it)}</span>
    <small className="sh-tile__p">{on ? t('s41.sh.on') : have ? t('s41.sh.owned') : p?.coins != null ? <><span className="g-coin" aria-hidden="true" />{num(p.coins)}</> : p?.credits != null ? <><CreditIcon size={12} />{num(p.credits)}</> : t('s41.sh.earn')}</small>
  </button>;
}
/** The selected look's one action: the footer's main button. */
function Action({ it, s, onCredits }: { it: Item; s: Save; onCredits: () => void }) {
  const t = useT();
  const on = equipped(it.kind, s).id === it.id, have = owns(it.id, s);
  const p = onSale(it) ? priceNow(it) : null;
  const doBuy = (cur: Currency) => {
    const r = buy(it.id, cur);
    if (!r.ok) { sfx('bad'); return; }
    sfx(cur === 'credits' ? 'unlock' : 'coin'); toast('ach', t('l4.lk.bought', { n: itemName(t, it) }));
  };
  const put = () => { if (equipItem(isStandard(it.id) ? null : it.id, it.kind)) { sfx('stamp.done'); toast('info', t('l4.lk.equipped', { n: itemName(t, it) })); } };
  let btn;
  if (on) btn = <button type="button" className="s41-btn s41-btn--main s41-btn--quiet" disabled>{t('s41.sh.wearing')}</button>;
  else if (have) btn = <button type="button" className="s41-btn s41-btn--main" onClick={put}>{t('l4.lk.put')}</button>;
  else if (p?.coins != null) { const short = shortBy(p, 'coins', s); btn = <button type="button" className="s41-btn s41-btn--main" disabled={short > 0} onClick={() => doBuy('coins')}>{short > 0 ? t('l4.lk.shortC', { n: num(short) }) : t('l4.lk.coins', { n: num(p.coins) })}</button>; }
  else if (p?.credits != null) { const short = shortBy(p, 'credits', s); btn = <button type="button" className="s41-btn s41-btn--main" onClick={() => (short > 0 ? onCredits() : doBuy('credits'))}>{short > 0 ? t('l4.lk.shortK', { n: num(short) }) : t('l4.lk.credits', { n: num(p.credits) })}</button>; }
  else btn = <button type="button" className="s41-btn s41-btn--main s41-btn--quiet" disabled>{t('s41.sh.earnIt')}</button>;
  return btn;
}

// ---------------------------------------------------------------- Coins: coin packs (credits → coins) and credit packs
type Pack = { id: string; kind: 'coins' | 'credits'; label: string; price: string };
function Coins({ s }: { s: Save }) {
  const t = useT();
  const onSaleNow = creditPacksOnSale();
  const packs: Pack[] = [
    ...COIN_PACKS.map((p) => ({ id: p.id, kind: 'coins' as const, label: t('s41.sh.coinsN', { n: num(p.coins) }), price: t('s41.sh.creditsN', { n: num(p.credits) }) })),
    ...CREDIT_PACKS.map((p) => ({ id: p.id, kind: 'credits' as const, label: t('s41.sh.creditsN', { n: num(p.credits) }), price: p.price })),
  ];
  const get = (p: Pack) => {
    if (p.kind === 'coins') { const r = buyCoinPack(p.id); if (r.ok) { sfx('coin'); toast('ach', t('s41.sh.got', { n: p.label })); } else { sfx('bad'); toast('info', t('s41.sh.needCredits')); } return; }
    void buyCreditPack(p.id);
  };
  return <>
    <p className="sh-dek">{t('s41.sh.dek.coins')}</p>
    <Pager items={packs} per={5} render={(p) => <div key={p.id} className="sh-pack">
      <span className="sh-pack__n">{p.kind === 'coins' ? <span className="g-coin" aria-hidden="true" /> : <CreditIcon size={16} />}<b>{p.label}</b></span>
      <button type="button" className="s41-btn s41-btn--sm" disabled={p.kind === 'credits' ? !onSaleNow : (s.wallet?.credits || 0) < (COIN_PACKS.find((x) => x.id === p.id)?.credits || 0)} onClick={() => get(p)}>{p.price}</button>
    </div>} />
    {!onSaleNow && <p className="pc-line">{t('eco.packs.soon')}</p>}
  </>;
}

// ---------------------------------------------------------------- Gold
function Gold({ s }: { s: Save }) {
  const t = useT();
  return <section className="sh-gold">
    <b className="sh-gold__h">{t('s41.sh.cat.gold')}</b>
    <ul>{(t.list('s41.sh.goldList') as string[] || []).map((x, k) => <li key={k}>{x}</li>)}</ul>
    <p className="pc-line">{isGold(s) ? t('l4.lk.goldHave') : t('s41.sh.goldNever')}</p>
  </section>;
}
function GoldButton({ s, onCredits }: { s: Save; onCredits: () => void }) {
  const t = useT();
  if (isGold(s)) return <button type="button" className="s41-btn s41-btn--main s41-btn--quiet" disabled>{t('l4.lk.goldHave')}</button>;
  const get = () => {
    if ((s.wallet?.credits || 0) < GOLD_CREDITS) { onCredits(); return; }
    const r = buy(goldItemId(), 'credits');
    if (r.ok) sfx('fanfare'); else sfx('bad');
  };
  return <button type="button" className="s41-btn s41-btn--main" onClick={get}><CreditIcon size={15} />{t('l4.lk.goldBuy', { n: GOLD_CREDITS })}</button>;
}
