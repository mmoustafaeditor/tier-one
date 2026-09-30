// Stripe webhook for v4 purchases: POST /api/tier-one/v4/stripe-webhook (raw body, Stripe-Signature header).
// On checkout.session.completed the wallet grants the session's catalog item to the account in its metadata, once
// per session id (the client-side wallet.purchase.verify for the same session becomes a no-op). Without
// STRIPE_WEBHOOK_SECRET every delivery is refused with 503 so Stripe keeps retrying until the secret is set.
import { getApi } from './index.js';

export const config = { api: { bodyParser: false } };

export function readRaw(req) {
  if (typeof req.body === 'string') return Promise.resolve(req.body);
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body.toString('utf8'));
  return new Promise((resolve, reject) => { let s = ''; req.on('data', (c) => { s += c; if (s.length > 1e6) reject(new Error('too big')); }); req.on('end', () => resolve(s)); req.on('error', reject); });
}

export async function handle(api, req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method', code: 'METHOD' });
  if (!api.kv.online) return res.status(503).json({ ok: false, error: 'offline', code: 'OFFLINE' });
  let raw; try { raw = await readRaw(req); } catch { return res.status(413).json({ ok: false, error: 'body', code: 'PAYLOAD_TOO_LARGE' }); }
  const v = api.purchases.stripe.verifyWebhook(raw, req.headers['stripe-signature']);
  if (!v.ok) return res.status(v.why === 'no secret' ? 503 : 400).json({ ok: false, error: v.why, code: v.why === 'no secret' ? 'WEBHOOK_UNCONFIGURED' : 'BAD_SIGNATURE' });
  const ev = v.event;
  try {
    if (ev && ev.type === 'checkout.session.completed' && ev.data && ev.data.object) {
      const out = await api.wallet.onStripeSession(ev.data.object);
      return res.status(200).json({ ok: true, received: true, ...out });
    }
    return res.status(200).json({ ok: true, received: true, ignored: ev && ev.type });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'store', code: 'STORE' });
  }
}

export default async function handler(req, res) { return handle(getApi(), req, res); }
