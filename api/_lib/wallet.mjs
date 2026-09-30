// The wallet: a server-authoritative Credits ledger and the entitlements it buys. Credits are the bought currency
// (GOTY §8.4); Coins stay in the local save and only ever arrive here as a grant the client claims.
//
// Keys (prefix t1v4): w:<acc> hash { bal, coinsPending }, wl:<acc> list of ledger lines (newest first, 200 kept),
// ent:<acc> set of entitlements ('gold:<season>', 'cos:<id>', 'name:paper'), earn:<acc>:<reason>:<ref> once-markers,
// rcpt:<provider>:<receipt> once-markers, gift:<acc>:<day> daily gift total.
//
// Nothing here reads or writes a Daily board or leaderboard key (t1v3:s:*, t1v3:lb:*): the test suite asserts it.
// Earn reasons are validated against what the server already knows (v3's once-per-day markers and result docs).
import { ApiError, bad } from './router.mjs';
import { accId, clean, int, today, dayMinus, seasonEnd } from './util.mjs';

const P = 't1v4:';
const W_TTL = 730 * 86400, LEDGER_KEEP = 200;
export const EARN_REASONS = ['season_end', 'streak_30', 'first_t1'];

export function createWallet({ kv, config, purchases, newsroomMembers }) {
  const wk = (acc) => P + 'w:' + acc, lk = (acc) => P + 'wl:' + acc, ek = (acc) => P + 'ent:' + acc;
  const line = (d, why, ref, extra) => JSON.stringify({ at: Date.now(), d, why, ref: ref || null, ...(extra || {}) });

  async function balance(acc) { return int(await kv.one('HGET', wk(acc), 'bal'), 0, 1e9); }
  async function credit(acc, n, why, ref, extra) {
    const [bal] = await kv.pipeline([['HINCRBY', wk(acc), 'bal', n], ['EXPIRE', wk(acc), W_TTL], ['LPUSH', lk(acc), line(n, why, ref, extra)], ['LTRIM', lk(acc), 0, LEDGER_KEEP - 1], ['EXPIRE', lk(acc), W_TTL]]);
    return Number(bal);
  }
  // Debit is check-after-decrement: DECR, and if the balance went negative put it back and refuse (no transaction
  // needed over REST, and a concurrent spend can never leave the balance below zero).
  async function debit(acc, n, why, ref, extra) {
    const [bal] = await kv.pipeline([['HINCRBY', wk(acc), 'bal', -n]]);
    if (Number(bal) < 0) { await kv.one('HINCRBY', wk(acc), 'bal', n); throw new ApiError('CONFLICT', 'not enough credits', 409, { balance: Number(bal) + n, need: n }); }
    await kv.pipeline([['EXPIRE', wk(acc), W_TTL], ['LPUSH', lk(acc), line(-n, why, ref, extra)], ['LTRIM', lk(acc), 0, LEDGER_KEEP - 1], ['EXPIRE', lk(acc), W_TTL]]);
    return Number(bal);
  }
  async function entitlements(acc) { return ((await kv.one('SMEMBERS', ek(acc))) || []).sort(); }
  async function grantItem(acc, item, why, ref) {
    const out = { granted: {} };
    if (item.grants.credits) { out.balance = await credit(acc, item.grants.credits, why, ref, { item: item.id }); out.granted.credits = item.grants.credits; }
    if (item.grants.ent) { await kv.pipeline([['SADD', ek(acc), item.grants.ent], ['EXPIRE', ek(acc), W_TTL]]); out.granted.ent = item.grants.ent; }
    if (item.grants.coins) { await kv.pipeline([['HINCRBY', wk(acc), 'coinsPending', item.grants.coins], ['EXPIRE', wk(acc), W_TTL]]); out.granted.coins = item.grants.coins; }
    return out;
  }
  const view = async (acc) => { const h = await kv.hgetall(wk(acc)); return { balance: int(h.bal, 0, 1e9), coinsPending: int(h.coinsPending, 0, 1e9), entitlements: await entitlements(acc) }; };

  // ---- actions
  async function get(body, ctx) {
    const acc = ctx.account.id;
    const raw = (await kv.one('LRANGE', lk(acc), 0, (body.n == null ? 20 : int(body.n, 1, 50)) - 1)) || [];
    const ledger = raw.map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    return { wallet: await view(acc), ledger };
  }
  async function earn(body, ctx) {
    const a = ctx.account, reason = clean(body.reason, 20), ref = clean(body.ref, 40);
    if (!EARN_REASONS.includes(reason)) throw bad('reason');
    const amount = int(config.current().catalog.earn[reason], 0, 1000);
    if (!amount) throw new ApiError('NOT_FOUND', 'reason off');
    const devs = ((await kv.one('SMEMBERS', P + 'acc:' + a.id + ':devs')) || []).slice(0, 3);
    const gdevs = [...new Set([a.gdev, ...(await kv.mgetJ(devs.map((d) => P + 'dev:' + d))).map((d) => d && d.gdev).filter(Boolean)])];
    let marker;
    if (reason === 'season_end') {
      const end = seasonEnd(ref); if (!end) throw bad('ref');
      if (Date.now() < end) throw new ApiError('FORBIDDEN', 'season not over');
      if (a.created > end) throw new ApiError('FORBIDDEN', 'not your season');
      marker = ref;
    } else if (reason === 'first_t1') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ref)) throw bad('ref');
      const docs = await kv.mgetJ(gdevs.map((g) => 't1v3:lb:d:' + ref + ':e:' + g));
      if (!docs.some((d) => d && d.tier === 'T1')) throw new ApiError('FORBIDDEN', 'no tier 1 that day');
      marker = 'once';
    } else { // streak_30: thirty consecutive Daily results ending today or yesterday, on any device of the account
      const end = ref === dayMinus(today(), 1) ? ref : today();
      const days = Array.from({ length: 30 }, (_, i) => dayMinus(end, i));
      const rows = await kv.one('MGET', ...days.flatMap((d) => gdevs.map((g) => 't1v3:lb:once:' + d + ':' + g)));
      const played = days.every((d, i) => gdevs.some((g, j) => rows[i * gdevs.length + j] != null));
      if (!played) throw new ApiError('FORBIDDEN', 'no 30-day streak');
      if (!(await kv.setNX(P + 'earn:' + a.id + ':streak_30:last', end, 30 * 86400))) throw new ApiError('CONFLICT', 'already earned this streak');
      marker = end;
    }
    if (!(await kv.setNX(P + 'earn:' + a.id + ':' + reason + ':' + marker, '1', W_TTL))) throw new ApiError('CONFLICT', 'already earned');
    const balance = await credit(a.id, amount, 'earn:' + reason, ref);
    return { earned: amount, balance, reason };
  }
  async function spend(body, ctx) {
    const acc = ctx.account.id, item = config.item(clean(body.item, 40));
    if (!item || !item.price.credits) throw new ApiError('NOT_FOUND', 'item');
    const day = today();
    if ((item.from && item.from > day) || (item.until && item.until < day)) throw new ApiError('NOT_FOUND', 'item off sale');
    if (item.grants.ent && (await kv.one('SISMEMBER', ek(acc), item.grants.ent))) throw new ApiError('CONFLICT', 'owned');
    await debit(acc, item.price.credits, 'spend', item.id);
    const g = await grantItem(acc, item, 'spend:grant', item.id);
    return { item: item.id, ...g, wallet: await view(acc) };
  }
  // Gift Credits or a giftable cosmetic to another member of the same newsroom.
  async function gift(body, ctx) {
    const from = ctx.account.id, to = accId(body.to), nr = clean(body.newsroom, 16);
    if (!to || to === from) throw bad('to');
    if (!nr) throw bad('newsroom');
    if (!(await newsroomMembers(nr, [from, to]))) throw new ApiError('FORBIDDEN', 'not in the same newsroom');
    const g = config.current().catalog.gift;
    const item = body.item ? config.item(clean(body.item, 40)) : null;
    if (item && !(item.giftable && item.price.credits)) throw bad('item not giftable');
    const amount = item ? item.price.credits : Number(body.amount);
    if (!Number.isInteger(amount) || amount < 1 || amount > g.max) throw bad('amount', { max: g.max });
    const gk = P + 'gift:' + from + ':' + today();
    const used = await kv.incr(gk, amount, 2 * 86400);
    if (used > g.perDay) { await kv.incr(gk, -amount); throw new ApiError('RATE_LIMITED', 'gift limit today', 429, { perDay: g.perDay }); }
    try { await debit(from, amount, 'gift', to, item ? { item: item.id } : null); } catch (e) { await kv.incr(gk, -amount); throw e; }
    const note = clean(body.note, 60);
    if (item) { await kv.pipeline([['SADD', ek(to), item.grants.ent], ['EXPIRE', ek(to), W_TTL], ['LPUSH', lk(to), line(0, 'gift:item', from, { item: item.id, note })], ['LTRIM', lk(to), 0, LEDGER_KEEP - 1]]); }
    else await credit(to, amount, 'gift:in', from, { note });
    return { to, amount, item: item ? item.id : null, wallet: await view(from) };
  }
  // A verified purchase grants once per receipt, whichever path (verify action or webhook) gets there first.
  async function grantReceipt(acc, provider, receiptId, item, meta) {
    const fresh = await kv.setNX(P + 'rcpt:' + provider + ':' + receiptId, acc, W_TTL);
    if (!fresh) { const owner = await kv.get(P + 'rcpt:' + provider + ':' + receiptId); return { duplicate: true, owner, item: item.id, wallet: await view(acc) }; }
    const g = await grantItem(acc, item, 'purchase:' + provider, receiptId);
    await kv.one('LPUSH', P + 'purchases', JSON.stringify({ at: Date.now(), acc, provider, receiptId, item: item.id, ...(meta || {}) }));
    await kv.one('LTRIM', P + 'purchases', 0, 999);
    return { duplicate: false, ...g, item: item.id, wallet: await view(acc) };
  }
  async function verify(body, ctx) {
    const acc = ctx.account.id, provider = clean(body.provider, 10);
    let res, item;
    if (provider === 'stripe') {
      res = await purchases.stripe.verifySession(body.sessionId);
      if (res.paid && res.accountId && res.accountId !== acc) throw new ApiError('FORBIDDEN', 'another account paid');
      item = res.paid ? (res.sku ? config.item(res.sku) : (res.sandbox ? config.item(clean(body.item, 40)) : null) || (res.priceId ? config.current().catalog.items.find((i) => i.stripePrice === res.priceId) : null)) : null;
      if (res.sandbox && !purchases.sandboxAllowed) throw new ApiError('FORBIDDEN', 'sandbox off');
    } else if (provider === 'google') {
      res = await purchases.google.verifyProduct({ productId: body.productId, purchaseToken: body.purchaseToken, packageName: body.packageName });
      if (res.sandbox && !purchases.sandboxAllowed) throw new ApiError('FORBIDDEN', 'sandbox off');
      item = res.paid ? config.current().catalog.items.find((i) => i.googleSku === res.sku) || config.item(res.sku) : null;
    } else if (provider === 'sandbox') {
      if (!purchases.sandboxAllowed) throw new ApiError('FORBIDDEN', 'sandbox off');
      item = config.item(clean(body.item, 40));
      res = item ? { paid: true, receiptId: 'sbx_' + acc + '_' + item.id + '_' + clean(body.nonce || '0', 20), sandbox: true } : { paid: false, why: 'item' };
    } else throw bad('provider');
    if (!res.paid) throw new ApiError('FORBIDDEN', 'not paid', 403, { why: res.why || null });
    if (!item || item.kind === 'coins' || (item.kind === 'cosmetic' && !item.price.eur && !item.price.usd && provider !== 'sandbox')) throw new ApiError('NOT_FOUND', 'unknown item for receipt');
    const out = await grantReceipt(acc, provider, res.receiptId, item, { sandbox: !!res.sandbox });
    if (provider === 'google' && !res.acknowledged && !out.duplicate) purchases.google.acknowledge({ productId: res.sku, purchaseToken: res.token }).catch(() => {});
    return { provider, sandbox: !!res.sandbox, ...out };
  }
  async function checkoutStart(body, ctx) {
    const acc = ctx.account.id, item = config.item(clean(body.item, 40));
    if (!item || (!item.price.eur && !item.price.usd)) throw new ApiError('NOT_FOUND', 'item');
    const currency = body.currency === 'usd' ? 'usd' : 'eur';
    const s = await purchases.stripe.createCheckout({ item, accountId: acc, currency, successUrl: clean(body.successUrl, 300) || undefined, cancelUrl: clean(body.cancelUrl, 300) || undefined });
    if (s.sandbox && !purchases.sandboxAllowed) throw new ApiError('NOT_IMPLEMENTED', 'payments off');
    return { item: item.id, url: s.url, sessionId: s.sessionId, sandbox: !!s.sandbox };
  }
  // Called by the Stripe webhook on checkout.session.completed.
  async function onStripeSession(session) {
    const acc = accId((session.metadata && session.metadata.account) || session.client_reference_id);
    const item = config.item(session.metadata && session.metadata.sku);
    if (!acc || !item || session.payment_status !== 'paid') return { granted: false, why: !acc ? 'account' : !item ? 'item' : 'unpaid' };
    const out = await grantReceipt(acc, 'stripe', session.id, item, { webhook: true });
    return { granted: !out.duplicate, duplicate: out.duplicate, acc, item: item.id };
  }
  async function claimCoins(body, ctx) {
    const acc = ctx.account.id, n = int(await kv.one('HGET', wk(acc), 'coinsPending'), 0, 1e9);
    if (n) await kv.one('HINCRBY', wk(acc), 'coinsPending', -n);
    return { coins: n };
  }
  async function entList(body, ctx) {
    const acc = ctx.account.id, ents = await entitlements(acc), season = config.view(acc).season;
    return { entitlements: ents, gold: { season, active: ents.includes('gold:' + season) }, cosmetics: ents.filter((e) => e.startsWith('cos:')).map((e) => e.slice(4)) };
  }
  return { get, earn, spend, gift, verify, checkoutStart, onStripeSession, claimCoins, entList, balance, credit, view };
}
