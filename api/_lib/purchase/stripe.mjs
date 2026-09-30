// Stripe Checkout adapter: create a session for a catalog item, verify a returned session, verify webhook signatures.
// Sandbox when STRIPE_SECRET_KEY is absent: createCheckout answers a sandbox session id and verifySession accepts
// only sandbox ids, so no real grant can come from a missing key.
import { createHmac, timingSafeEqual } from 'node:crypto';

const API = 'https://api.stripe.com/v1';
const form = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => { const key = pre ? pre + '[' + k + ']' : k; if (v == null) return []; if (typeof v === 'object') return Array.isArray(v) ? v.map((x, i) => form({ [i]: x }, key)).flat() : form(v, key).split('&'); return [encodeURIComponent(key) + '=' + encodeURIComponent(String(v))]; }).join('&');

export function stripeAdapter({ secretKey, webhookSecret, fetchFn = fetch, publicUrl = '' } = {}) {
  const sandbox = !secretKey;
  async function call(method, path, params) {
    const r = await fetchFn(API + path, { method, headers: { Authorization: 'Bearer ' + secretKey, 'Content-Type': 'application/x-www-form-urlencoded' }, body: method === 'POST' ? form(params || {}) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('stripe ' + r.status + ' ' + ((j.error && j.error.message) || ''));
    return j;
  }
  return {
    name: 'stripe', sandbox,
    // -> { url, sessionId }
    async createCheckout({ item, accountId, currency = 'eur', successUrl, cancelUrl }) {
      if (sandbox) { const id = 'cs_sandbox_' + Math.random().toString(36).slice(2, 14); return { url: null, sessionId: id, sandbox: true }; }
      const price = item.price[currency] || item.price.eur || item.price.usd;
      const line = item.stripePrice ? { price: item.stripePrice, quantity: 1 } : { quantity: 1, price_data: { currency: item.price[currency] ? currency : (item.price.eur ? 'eur' : 'usd'), unit_amount: price, product_data: { name: item.name } } };
      const s = await call('POST', '/checkout/sessions', { mode: 'payment', client_reference_id: accountId, success_url: successUrl || publicUrl + '/tier-one/?session_id={CHECKOUT_SESSION_ID}', cancel_url: cancelUrl || publicUrl + '/tier-one/', metadata: { sku: item.id, account: accountId }, line_items: [line] });
      return { url: s.url, sessionId: s.id };
    },
    // -> { paid, sku, receiptId, accountId } for a Checkout session id (the flow api/verify-purchase.js used).
    async verifySession(sessionId) {
      const sid = String(sessionId || '');
      if (sandbox) return /^cs_sandbox_[a-z0-9]+$/.test(sid) ? { paid: true, sku: null, receiptId: sid, accountId: null, sandbox: true } : { paid: false, why: 'sandbox' };
      if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)) return { paid: false, why: 'session id' };
      const s = await call('GET', '/checkout/sessions/' + encodeURIComponent(sid) + '?expand[]=line_items');
      if (s.payment_status !== 'paid') return { paid: false, why: 'not paid' };
      const item = s.line_items && s.line_items.data && s.line_items.data[0];
      const priceId = item && item.price && item.price.id;
      const sku = (s.metadata && s.metadata.sku) || (item && item.price && item.price.metadata && item.price.metadata.sku) || null;
      return { paid: true, sku, priceId, receiptId: s.id, accountId: (s.metadata && s.metadata.account) || s.client_reference_id || null };
    },
    // Stripe-Signature: t=<ts>,v1=<hmac>; signed payload is "<ts>.<raw body>". Tolerance 5 minutes.
    verifyWebhook(rawBody, header, { now = Date.now(), tolerance = 300 } = {}) {
      if (!webhookSecret) return { ok: false, why: 'no secret' };
      const parts = Object.fromEntries(String(header || '').split(',').map((p) => p.trim().split('=')).filter((p) => p.length === 2));
      const ts = Number(parts.t); if (!ts || Math.abs(now / 1000 - ts) > tolerance) return { ok: false, why: 'timestamp' };
      const expect = createHmac('sha256', webhookSecret).update(ts + '.' + rawBody).digest('hex');
      const sigs = String(header).split(',').map((p) => p.trim()).filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
      const ok = sigs.some((s) => s.length === expect.length && timingSafeEqual(Buffer.from(s), Buffer.from(expect)));
      if (!ok) return { ok: false, why: 'signature' };
      try { return { ok: true, event: JSON.parse(rawBody) }; } catch { return { ok: false, why: 'json' }; }
    },
  };
}
