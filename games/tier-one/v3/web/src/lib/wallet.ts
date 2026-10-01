// The wallet (GOTY.md §8.4): two currencies with plain names.
//   Coins   — earned by playing, spent on small things. Stored where they always were: save.credits + save.ledger
//             (the legacy field name; lib/meta.ts credit()/spend() and lib/season.ts keep writing it).
//   Credits — bought, rarely earned (season end, a 30-day streak, a first Tier 1, a referral). Stored in save.wallet.
// Every movement of either currency goes through here and lands in one ledger (save.wallet.ledger) with an
// idempotency key, so a grant can never land twice and the v4 server can replay it.
//
// v4 ADAPTER POINT: the api lane's wallet.get/earn/spend/gift become a `WalletSync` (setWalletSync). Each ledger entry
// is pushed with its id as the idempotency key; `reconcile()` pulls the server balance back. Until then the local
// ledger is the source of truth and nothing here makes a request.
//
// Earnable-credit hooks for other lanes (each is idempotent per key; safe inside an update() mutator when `s` is given):
//   awardFirstTier1(s?)        — lib/meta.ts onDailyDone, when r.tier === 'T1' the first time (30 credits)
//   awardStreak(n, s?)         — lib/meta.ts onDailyDone after the streak moves (40 credits at every 30 days)
//   awardSeasonEnd(sid, lv, s?)— lib/season.ts syncSeason when a season rolls over (25 credits, +25 at level 40)
//   onFirstWindowFinished(s?)  — any Results screen after the player's first finished window (pays the referral)
import { update, getSave, type Save } from './save';
import { MONET } from './monet';
import { syncSeason, seasonAt, installThemeCSS, equipped as seasonEquipped, type CosKind } from './season';
import { item, priceNow, onSale, isStandard, isLegacyKind, standardOf, legacy, GOLD_CREDITS, type Item, type Kind, type Price } from './catalog';
import { t } from './i18n';
import { earnMet } from './earned';
import { catchphraseOf, catchphraseColor, type Catchphrase } from './catchphrase';
import { kindDef, type HeadlineFace, type RingSource } from './kinds';

// ---------------------------------------------------------------- types (module augmentation: no edit to save.ts)
export type Currency = 'coins' | 'credits';
export interface WalletEntry { id: string; at: number; cur: Currency; d: number; why: string; item?: string; to?: string; from?: string; refunded?: boolean }
export interface GiftOut { id: string; item: string; to: string; note?: string; at: number; status: 'queued' | 'sent' | 'failed' }
export interface WalletSave {
  credits: number; ledger: WalletEntry[];
  earned: Record<string, number>;                     // idempotency keys → ms
  ref?: { from?: string; at?: number; paid?: boolean; friends?: number }; // who referred me; how many I've brought
  gifts?: GiftOut[];                                  // outbox for the press box lane / v4 wallet.gift
  refunds?: number;
}
export interface DeskSave {
  equip: Partial<Record<Kind, string>>; paper?: string;
  peak?: string;                                       // highest rep tier reached (lib/earned.ts), so earned looks stay earned
  cp?: { text: string; at: number; ok?: boolean; net?: boolean }; // your own catchphrase (lib/catchphrase.ts); ok=false: refused; net: not checked yet (offline)
  show?: string[];                                     // the byline card's showcase: up to three owned looks
  fresh?: string[];                                    // earned looks granted since "Your desk" last opened (lib/earned.ts)
}
declare module './save' { interface Save { wallet?: WalletSave; desk?: DeskSave } }

export type Tx = { ok: true; id: string; n: number; cur: Currency } | { ok: false; error: 'short' | 'off' | 'dup' | 'bad' | 'owned' | 'late' | 'nogift' | 'window' | 'self' };
export const LEDGER_CAP = 120;
export const REFUND_HOURS = 48;

// Earnable credits (the only ways credits are not bought). Small on purpose: credits should mean something.
export const CREDITS_EARN = { firstT1: 30, streak30: 40, seasonEnd: 25, seasonTop: 25, referral: 30 } as const;
export const GIFT_MIN_LEVEL = 3; // a friend code can gift once the account is past the tutorial levels (anti-fraud)

// Credit packs at honest tiers (docs/BUSINESS.md). No pack over €20, the bonus grows slowly, and the middle pack is
// exactly one Gold season so the price of Gold is the same however you pay.
export interface CreditPack { id: string; credits: number; price: string; eur: number; tag?: 'gold' }
export const CREDIT_PACKS: CreditPack[] = [
  { id: 'c100', credits: 100, price: '€1.49', eur: 1.49 },
  { id: 'c350', credits: GOLD_CREDITS, price: '€4.99', eur: 4.99, tag: 'gold' },
  { id: 'c800', credits: 800, price: '€9.99', eur: 9.99 },
  { id: 'c1800', credits: 1800, price: '€19.99', eur: 19.99 },
];
export const packBonus = (p: CreditPack) => Math.round(((p.credits / p.eur) / (CREDIT_PACKS[0].credits / CREDIT_PACKS[0].eur) - 1) * 100);
export const creditPacksOnSale = () => MONET.enabled && !!purchaseFlow;

// ---------------------------------------------------------------- v4 adapter point
export interface WalletSync {
  /** Post one ledger entry (its `id` is the idempotency key). Throw to retry later. */
  push(entry: WalletEntry, s: Save): Promise<void>;
  /** Server balance and (optionally) the ledger it holds; reconcile() applies it. */
  pull?(): Promise<{ credits: number; ledger?: WalletEntry[] }>;
  /** Server-verified referral completion: the referrer is paid by the server, never by this client. */
  referral?(e: { from: string; me: string }): Promise<void>;
}
let sync: WalletSync | null = null;
export function setWalletSync(x: WalletSync | null) { sync = x; }
let purchaseFlow: ((pack: CreditPack) => Promise<Tx>) | null = null;
/** Google Play Billing / Stripe Checkout hand-off (api lane). Credits land through applyPurchase() after verification. */
export function setPurchaseFlow(f: typeof purchaseFlow) { purchaseFlow = f; }
export async function reconcile(): Promise<boolean> {
  if (!sync?.pull) return false;
  try {
    const r = await sync.pull();
    update((s) => { const w = wallet(s); w.credits = Math.max(0, Math.round(r.credits)); if (r.ledger) w.ledger = r.ledger.slice(0, LEDGER_CAP); });
    return true;
  } catch { return false; }
}
const pushLater = (e: WalletEntry) => { if (sync) setTimeout(() => sync?.push(e, getSave()).catch(() => { /* retried on reconcile */ }), 0); };

// ---------------------------------------------------------------- balances and the ledger
export const wallet = (s: Save): WalletSave => (s.wallet = s.wallet || { credits: 0, ledger: [], earned: {} });
export const desk = (s: Save): DeskSave => (s.desk = s.desk || { equip: {} });
export const balances = (s: Save = getSave()) => ({ coins: s.credits, credits: s.wallet?.credits || 0 });
export const balance = (cur: Currency, s: Save = getSave()) => (cur === 'coins' ? s.credits : s.wallet?.credits || 0);
export const ledger = (s: Save = getSave()): WalletEntry[] => s.wallet?.ledger || [];
let seq = 0;
const txid = (why: string) => 'w' + Date.now().toString(36) + (++seq).toString(36) + (Math.abs(hash(why)) % 1296).toString(36);
const hash = (x: string) => { let h = 0x811c9dc5; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };

/** Moves `d` of `cur` on a draft and records it. Coins also land in the legacy ledger so the Pass wallet shows them. */
function move(s: Save, cur: Currency, d: number, why: string, extra: Partial<WalletEntry> = {}): WalletEntry {
  const w = wallet(s);
  if (cur === 'coins') { s.credits = Math.max(0, s.credits + d); s.ledger = [{ at: Date.now(), d, why }, ...s.ledger].slice(0, 30); if (d > 0) s.stats.earned = (s.stats.earned || 0) + d; }
  else w.credits = Math.max(0, w.credits + d);
  const e: WalletEntry = { id: txid(why), at: Date.now(), cur, d, why, ...extra };
  w.ledger = [e, ...w.ledger].slice(0, LEDGER_CAP);
  return e;
}
const inDraft = (fn: (s: Save) => void, s?: Save) => { if (s) fn(s); else update(fn); };

// ---------------------------------------------------------------- earn (idempotent per key)
/** Grants credits once per `key`. Returns the entry, or null when the key was already used. */
export function earnCredits(key: string, n: number, why: string, s?: Save): WalletEntry | null {
  let out: WalletEntry | null = null;
  inDraft((x) => { const w = wallet(x); if (w.earned[key] || n <= 0) return; w.earned[key] = Date.now(); out = move(x, 'credits', n, why); }, s);
  if (out) pushLater(out);
  return out;
}
export const awardFirstTier1 = (s?: Save) => earnCredits('t1:first', CREDITS_EARN.firstT1, 'earn:t1', s);
export const awardStreak = (n: number, s?: Save) => (n > 0 && n % 30 === 0 ? earnCredits('streak:' + n, CREDITS_EARN.streak30, 'earn:streak', s) : null);
export function awardSeasonEnd(sid: string, lv: number, s?: Save) {
  const a = earnCredits('season:' + sid, CREDITS_EARN.seasonEnd, 'earn:season', s);
  const b = lv >= 40 ? earnCredits('season:' + sid + ':top', CREDITS_EARN.seasonTop, 'earn:seasonTop', s) : null;
  return a || b;
}

// ---------------------------------------------------------------- spend, buy, equip
export function canPay(p: Price, cur: Currency, s: Save = getSave()) { const n = p[cur]; return n != null && balance(cur, s) >= n; }
/** Which currency to offer first: coins when the player can pay in coins, else credits. */
export function bestCurrency(p: Price, s: Save = getSave()): Currency | null {
  if (p.coins != null && s.credits >= p.coins) return 'coins';
  if (p.credits != null && (s.wallet?.credits || 0) >= p.credits) return 'credits';
  return p.coins != null ? 'coins' : p.credits != null ? 'credits' : null;
}
export const owns = (id: string, s: Save = getSave()) => {
  if (isStandard(id) || s.owned.includes(id)) return true;
  const it = item(id); if (!it) return false;
  if (it.kind === 'gold') return !!s.season && s.season.id === it.set && !!s.season.gold;
  return it.source === 'earned' && !!it.earn && earnMet(it.earn, s);
};

/** Buys an item with `cur` at today's price (featured or usual) and equips it. */
export function buy(id: string, cur: Currency, ms = Date.now()): Tx {
  const it = item(id); const s = getSave();
  if (!it || isStandard(id)) return { ok: false, error: 'bad' };
  if (owns(id, s)) return { ok: false, error: 'owned' };
  if (!onSale(it, ms)) return { ok: false, error: it.window ? 'window' : 'off' };
  const price = priceNow(it, ms); const n = price[cur];
  if (n == null) return { ok: false, error: 'bad' };
  if (balance(cur, s) < n) return { ok: false, error: 'short' };
  let e: WalletEntry | null = null;
  update((x) => {
    e = move(x, cur, -n, 'buy:' + id, { item: id });
    grant(x, it);
    equipOn(x, it.kind, id);
  });
  afterEquip(it.kind);
  if (e) pushLater(e);
  return { ok: true, id: e!.id, n, cur };
}
function grant(s: Save, it: Item) {
  if (it.kind === 'gold') { const st = syncSeason(s); if (st.id === it.set) st.gold = true; return; }
  if (!s.owned.includes(it.id)) s.owned.push(it.id);
}
function equipOn(s: Save, kind: Kind, id: string | null) {
  if (kind === 'gold') return;
  if (kind === 'theme') { s.theme = id || 'standard'; return; }
  if (isLegacyKind(kind)) { s.equip = { ...(s.equip || {}), [kind]: id || undefined }; return; }
  const d = desk(s); d.equip = { ...d.equip, [kind]: id || undefined };
}
const afterEquip = (kind: Kind) => { if (kind === 'theme') installThemeCSS(); };
/** Equips an owned item (or the standard look with null). Legacy kinds write the same fields lib/season.ts reads. */
export function equipItem(id: string | null, kind: Kind): boolean {
  if (id && (!owns(id) || item(id)?.kind !== kind || isStandard(id))) { if (id && isStandard(id)) id = null; else return false; }
  update((s) => equipOn(s, kind, id));
  afterEquip(kind);
  return true;
}
/** What is on right now for a kind: the owned item, else the standard look. Never null. */
export function equipped(kind: Kind, s: Save = getSave()): Item {
  if (kind === 'gold') { const sid = seasonAt().id; return s.season?.id === sid && s.season.gold ? item('gold.' + sid) || standardOf('gold') : standardOf('gold'); }
  if (isLegacyKind(kind)) { const c = seasonEquipped(kind as CosKind, s); return (c && item(c.id)) || standardOf(kind); }
  const id = s.desk?.equip?.[kind];
  const it = id ? item(id) : null;
  return it && it.kind === kind && owns(it.id, s) ? it : standardOf(kind);
}
export const isEquipped = (id: string, s: Save = getSave()) => { const it = item(id); return !!it && equipped(it.kind, s).id === id; };

// ---------------------------------------------------------------- refund (48 h, purchases only)
/** Reverses a purchase within 48 h: the item comes off and the currency comes back. Gold can't be refunded once a
 *  Gold-lane reward has been claimed. */
export function refund(txId: string): Tx {
  const s = getSave(); const e = ledger(s).find((x) => x.id === txId);
  if (!e || e.refunded || !e.why.startsWith('buy:') || !e.item) return { ok: false, error: 'bad' };
  if (Date.now() - e.at > REFUND_HOURS * 36e5) return { ok: false, error: 'late' };
  const it = item(e.item); if (!it) return { ok: false, error: 'bad' };
  if (it.kind === 'gold' && s.season && s.season.claimed.some((k) => k.startsWith('g'))) return { ok: false, error: 'late' };
  let r: WalletEntry | null = null;
  update((x) => {
    const w = wallet(x); const src = w.ledger.find((y) => y.id === txId)!; src.refunded = true;
    if (it.kind === 'gold') { if (x.season && x.season.id === it.set) x.season.gold = false; }
    else x.owned = x.owned.filter((id) => id !== it.id);
    if (equipped(it.kind, x).id === it.id) equipOn(x, it.kind, null);
    r = move(x, e.cur, -e.d, 'refund:' + it.id, { item: it.id });
    w.refunds = (w.refunds || 0) + 1;
  });
  afterEquip(it.kind);
  if (r) pushLater(r);
  return { ok: true, id: r!.id, n: -e.d, cur: e.cur };
}
export const refundable = (e: WalletEntry) => !e.refunded && e.why.startsWith('buy:') && Date.now() - e.at <= REFUND_HOURS * 36e5;

// ---------------------------------------------------------------- gifting (credits only)
// The press box lane owns newsroom membership: it registers a directory so the gift sheet can offer names, and a
// courier that delivers the queued gift (server wallet.gift in v4). Without either, a gift goes by friend code and
// waits in the outbox. Gifts are paid at the item's usual credits price, never the featured price.
export interface GiftTarget { code: string; name: string }
let giftDirectory: (() => GiftTarget[]) | null = null;
let giftCourier: ((g: GiftOut, s: Save) => Promise<boolean>) | null = null;
export function setGiftDirectory(f: typeof giftDirectory) { giftDirectory = f; }
export function setGiftCourier(f: typeof giftCourier) { giftCourier = f; }
export const giftTargets = (): GiftTarget[] => { try { return giftDirectory?.() || []; } catch { return []; } };
export const giftable = (it: Item) => it.source === 'store' && it.price.credits != null && it.kind !== 'paper';
export const FRIEND_CODE = /^[A-Z2-9]{6}$/;
export function gift(id: string, to: string, note = ''): Tx {
  const it = item(id); const s = getSave(); to = to.trim().toUpperCase();
  if (!it || !giftable(it)) return { ok: false, error: 'nogift' };
  if (!FRIEND_CODE.test(to)) return { ok: false, error: 'bad' };
  if (to === referralCode(s)) return { ok: false, error: 'self' };
  if (!onSale(it)) return { ok: false, error: 'window' };
  const n = it.price.credits!;
  if (balance('credits', s) < n) return { ok: false, error: 'short' };
  let e: WalletEntry | null = null; let g: GiftOut | null = null;
  update((x) => {
    e = move(x, 'credits', -n, 'gift:' + id, { item: id, to });
    const w = wallet(x); g = { id: e.id, item: id, to, note: note.slice(0, 80), at: Date.now(), status: 'queued' };
    w.gifts = [g, ...(w.gifts || [])].slice(0, 40);
  });
  pushLater(e!);
  if (giftCourier && g) giftCourier(g, getSave()).then((ok) => update((x) => { const y = wallet(x).gifts?.find((z) => z.id === g!.id); if (y) y.status = ok ? 'sent' : 'failed'; })).catch(() => { /* stays queued */ });
  return { ok: true, id: e!.id, n, cur: 'credits' };
}
/** Inbound (press box / v4): the friend's gift lands in your desk. Idempotent per gift id. */
export function receiveGift(giftId: string, id: string, from: string): boolean {
  const it = item(id); if (!it || isStandard(id)) return false;
  let ok = false;
  update((s) => {
    const w = wallet(s); if (w.earned['gift:' + giftId]) return;
    w.earned['gift:' + giftId] = Date.now(); grant(s, it); ok = true;
    const e: WalletEntry = { id: 'g' + giftId, at: Date.now(), cur: 'credits', d: 0, why: 'gifted:' + id, item: id, from };
    w.ledger = [e, ...w.ledger].slice(0, LEDGER_CAP);
  });
  return ok;
}
export const giftOutbox = (s: Save = getSave()) => s.wallet?.gifts || [];

// ---------------------------------------------------------------- referral codes (?ref=CODE)
// Your code is derived from the device id (stable, no server needed). A friend who opens the game with ?ref=CODE is
// linked once; when they finish their first window, they get 30 credits here and the server pays you 30 on
// verification (WalletSync.referral). Locally the friend's side is paid; yours can only come from the server.
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function referralCode(s: Save = getSave()): string {
  let h = hash('t1ref:' + s.dev), out = '';
  for (let i = 0; i < 6; i++) { out += B32[h % 32]; h = ((h >>> 5) ^ hash(s.dev + ':' + i)) >>> 0; }
  return out;
}
export const referralLink = (s: Save = getSave()) => (typeof location === 'undefined' ? '' : location.origin + location.pathname) + '?ref=' + referralCode(s);
/** Call once at boot (App.tsx). Records `?ref=` and cleans the URL. Ignores your own code and a second referral. */
export function captureReferral(search = typeof location === 'undefined' ? '' : location.search): string | null {
  const code = (new URLSearchParams(search).get('ref') || '').toUpperCase();
  if (!FRIEND_CODE.test(code)) return null;
  const s = getSave();
  if (code === referralCode(s) || s.wallet?.ref?.from) return null;
  update((x) => { wallet(x).ref = { ...(wallet(x).ref || {}), from: code, at: Date.now() }; });
  try { const u = new URL(location.href); u.searchParams.delete('ref'); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); } catch { /* */ }
  return code;
}
/** The friend's side of a referral: pays once, when the first window of any mode is finished. */
export function onFirstWindowFinished(s?: Save): WalletEntry | null {
  const cur = s || getSave(); const r = cur.wallet?.ref;
  if (!r?.from || r.paid) return null;
  const e = earnCredits('ref:' + r.from, CREDITS_EARN.referral, 'earn:referral', s);
  inDraft((x) => { wallet(x).ref!.paid = true; }, s);
  if (e && sync?.referral) sync.referral({ from: r.from, me: referralCode(cur) }).catch(() => { /* server retries on its side */ });
  return e;
}
/** Server-confirmed: a friend you referred finished their window (idempotent per friend code). */
export const onReferralConfirmed = (friend: string) => { const e = earnCredits('refby:' + friend, CREDITS_EARN.referral, 'earn:referred'); if (e) update((s) => { const w = wallet(s); w.ref = { ...(w.ref || {}), friends: (w.ref?.friends || 0) + 1 }; }); return e; };

// ---------------------------------------------------------------- credit packs and Gold
export async function buyCreditPack(id: string): Promise<Tx> {
  const p = CREDIT_PACKS.find((x) => x.id === id);
  if (!p || !creditPacksOnSale()) return { ok: false, error: 'off' };
  return purchaseFlow!(p);
}
/** After the server verifies a pack purchase (api lane): idempotent per receipt. */
export function applyPurchase(receipt: string, packId: string): WalletEntry | null {
  const p = CREDIT_PACKS.find((x) => x.id === packId); if (!p) return null;
  return earnCredits('pack:' + receipt, p.credits, 'pack:' + packId);
}
export const goldItemId = (ms = Date.now()) => 'gold.' + seasonAt(ms).id;

// ---------------------------------------------------------------- what other screens read
/** CSS variables for the byline card wherever it appears (Me, press box tables, results). */
export function bylineStyle(s: Save = getSave()): Record<string, string> {
  const p = equipped('byline', s).preview; if (p.k !== 'byline') return {};
  const f = equipped('flair', s).preview;
  return { '--by-bg': p.bg, '--by-ink': p.ink, '--by-acc': p.accent, '--by-rule': p.rule, '--by-face': p.face === 'cond' ? 'var(--f-cond)' : 'var(--f-display)', '--by-tex': p.tex || 'none', '--by-flair': f.k === 'flair' ? JSON.stringify(f.g) : '""', '--by-flair-c': f.k === 'flair' ? f.c : 'inherit', '--by-cp': JSON.stringify(catchphraseOf(s).text), '--by-cp-c': catchphraseColor(s) };
}
export interface ShareStyle { paper: string; ink: string; accent: string; style: 'classic' | 'redtop' | 'broadsheet' | 'night' | 'wire'; frame: { c: string; c2: string; pat: string } | null; masthead: string; catchphrase: Catchphrase; catchColor: string; headline: HeadlineStyle }
/** Colours and frame for lib/share.ts renderCard (additive `style` on Card) and the card previews. */
export function shareStyle(s: Save = getSave()): ShareStyle {
  const p = equipped('sharecard', s).preview; const f = equipped('frame', s);
  const fr = f.source !== 'standard' && f.preview.k === 'frame' ? { c: f.preview.c, c2: f.preview.c2, pat: f.preview.pat } : null;
  const extra = { catchphrase: catchphraseOf(s), catchColor: catchphraseColor(s), headline: headlineStyle(s) };
  return p.k === 'sharecard' ? { paper: p.paper, ink: p.ink, accent: p.accent, style: p.style, frame: fr, masthead: paperName(s), ...extra } : { paper: '#F2EEE5', ink: '#15130F', accent: '#D2381B', style: 'classic', frame: fr, masthead: paperName(s), ...extra };
}
/** The frame around a film's poster (ScenePlayer / moment overlays): a CSS style object. */
export function posterStyle(s: Save = getSave()): Record<string, string> {
  const p = equipped('poster', s).preview; if (p.k !== 'poster') return {};
  switch (p.style) {
    case 'ticket': return { border: '4px dashed ' + p.c2, outline: '6px solid ' + p.c, outlineOffset: '-10px' };
    case 'tape': return { border: '6px solid ' + p.c, boxShadow: '0 0 0 3px ' + p.c2 + ', inset 0 0 0 2px ' + p.c2 };
    case 'neon': return { border: '3px solid ' + p.c, boxShadow: '0 0 14px ' + p.c + ', inset 0 0 10px ' + p.c2 };
    case 'gilt': return { border: '6px double ' + p.c, boxShadow: '0 0 0 2px ' + p.c2 };
    default: return { border: '4px solid ' + p.c, boxShadow: 'inset 0 0 0 2px ' + p.c2 };
  }
}
export function pressPassStyle(s: Save = getSave()): Record<string, string> {
  const p = equipped('presspass', s).preview; if (p.k !== 'presspass') return {};
  return { '--pp-1': p.c1, '--pp-2': p.c2, '--pp-ink': p.ink, '--pp-stripe': p.stripe || 'transparent' };
}
export function mastheadStyle(s: Save = getSave()): Record<string, string> {
  const p = equipped('masthead', s).preview; if (p.k !== 'masthead') return {};
  return { '--mh-bg': p.bg, '--mh-ink': p.ink, '--mh-face': p.face === 'cond' ? 'var(--f-cond)' : p.face === 'mono' ? 'var(--f-mono)' : 'var(--f-display)', '--mh-rule': p.rule, '--mh-orn': JSON.stringify(p.orn || '') };
}
/** Your paper's name (share-card masthead, newsroom table) once 'paper.name' is owned; "Tier One" until then. */
export const paperName = (s: Save = getSave()) => (s.owned.includes('paper.name') && s.desk?.paper ? s.desk.paper : 'Tier One');
export const PAPER_NAME_MAX = 24;
export function setPaperName(name: string): boolean {
  const s = getSave(); if (!s.owned.includes('paper.name')) return false;
  const clean = name.replace(/[<>\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, PAPER_NAME_MAX);
  update((x) => { desk(x).paper = clean || undefined; });
  return true;
}
export const ringtoneOf = (s: Save = getSave()) => { const c = legacy(equipped('ringtone', s)); return c?.sfx || 'phone.ring'; };

// ---------------------------------------------------------------- 3.4 long-tail kinds: what their surfaces read
export interface HeadlineStyle { face: HeadlineFace; family: string; upper: boolean; ink: string | null }
const FACE_FAMILY: Record<HeadlineFace, string> = { wood: 'var(--f-display)', serif: 'var(--f-serif, Georgia, serif)', slab: 'var(--f-cond)', stencil: 'var(--f-cond)', mono: 'var(--f-mono)' };
/** Headline font for the results front page and the byline card: font family, case, optional ink. */
export function headlineStyle(s: Save = getSave()): HeadlineStyle {
  const p = equipped('headline', s).preview; if (p.k !== 'headline') return { face: 'wood', family: FACE_FAMILY.wood, upper: true, ink: null };
  return { face: p.face, family: FACE_FAMILY[p.face], upper: !!p.upper, ink: p.ink || null };
}
/** CSS variables for the headline surfaces (results front page): --hd-face, --hd-case, --hd-ink. */
export const headlineVars = (s: Save = getSave()): Record<string, string> => { const h = headlineStyle(s); return { '--hd-face': h.family, '--hd-case': h.upper ? 'uppercase' : 'none', ...(h.ink ? { '--hd-ink': h.ink } : {}) }; };
/** The desk lamp on Home's film stage: glow and pool colours plus a warmth word (data-lamp on the stage). */
export function lampStyle(s: Save = getSave()): { vars: Record<string, string>; warmth: 'warm' | 'cool' | 'neon'; on: boolean } {
  const it = equipped('lamp', s); const p = it.preview; if (p.k !== 'lamp') return { vars: {}, warmth: 'warm', on: false };
  return { vars: { '--lamp-glow': p.glow, '--lamp-pool': p.pool }, warmth: p.warmth, on: it.source !== 'standard' };
}
/** Who is calling, by sound: the ring pack's cue for this source, else the single ringtone (a pack overrides it). */
export function ringFor(src: string, s: Save = getSave()): string {
  const pk = equipped('ringpack', s);
  if (pk.source !== 'standard' && pk.preview.k === 'ringpack') return pk.preview.rings[src as RingSource] || pk.preview.fallback;
  return ringtoneOf(s);
}
/** Feed row skin: a data attribute value and CSS variables (ui/connect.tsx FeedRow). The standard wire look: ''. */
export function feedSkin(s: Save = getSave()): { skin: string; vars: Record<string, string> } {
  const it = equipped('feedskin', s); const p = it.preview; if (p.k !== 'feedskin' || it.source === 'standard') return { skin: '', vars: {} };
  return { skin: p.style, vars: { '--fs-rule': p.rule, '--fs-bg': p.bg, '--fs-ink': p.ink } };
}

// ---------------------------------------------------------------- the showcase: three looks on the byline card
export const SHOWCASE_MAX = 3;
/** The pinned looks that are still owned and pinnable, in order. */
export const showcaseOf = (s: Save = getSave()): Item[] => (s.desk?.show || []).map((id) => item(id)).filter((it): it is Item => !!it && !isStandard(it.id) && kindDef(it.kind).showcase && owns(it.id, s)).slice(0, SHOWCASE_MAX);
/** Pin or unpin a look. Pinning a fourth drops the oldest. Returns the new list of ids. */
export function toggleShowcase(id: string): string[] {
  const it = item(id); const s = getSave();
  if (!it || isStandard(id) || !kindDef(it.kind).showcase || !owns(id, s)) return s.desk?.show || [];
  let out: string[] = [];
  update((x) => { const d = desk(x); const cur = (d.show || []).filter((y) => y !== id); out = cur.length === (d.show || []).length ? [...cur, id].slice(-SHOWCASE_MAX) : cur; d.show = out; });
  return out;
}

// ---------------------------------------------------------------- price display (i18n)
export const fmtCredits = (n: number) => n.toLocaleString('en');
/** "80 credits" / "400 coins" / "80 credits or 400 coins". */
export function priceText(p: Price, cur?: Currency): string {
  const parts: string[] = [];
  if (p.credits != null && cur !== 'coins') parts.push(t('eco.price.credits', { n: fmtCredits(p.credits) }));
  if (p.coins != null && cur !== 'credits') parts.push(t('eco.price.coins', { n: fmtCredits(p.coins) }));
  return parts.length === 2 ? t('eco.price.or', { a: parts[0], b: parts[1] }) : parts[0] || t('eco.price.free');
}
export const shortBy = (p: Price, cur: Currency, s: Save = getSave()) => Math.max(0, (p[cur] || 0) - balance(cur, s));
export const whyText = (why: string) => { const k = why.split(':')[0]; const v = t('eco.why.' + k); return v === 'eco.why.' + k ? k : v; };
