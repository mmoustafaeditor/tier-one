// The Gaffer: Supporter pack purchase check (Vercel function). Tier One has its own in api/verify-purchase.js.
//
//   GET /api/the-gaffer/verify-purchase?session_id=cs_live_...
//   -> { ok: true, pack: "supporter" } when Stripe says that Checkout Session is paid for the Supporter pack.
//
// Setup (see games/the-gaffer/MONETIZATION.md):
//   1. Vercel › Project › Environment Variables: STRIPE_SECRET_KEY (sk_live_… or sk_test_…).
//   2. Stripe › Payment Link for the pack: add metadata  pack=supporter  (or put its price id below), and set the
//      success URL to https://sembagames.app/the-gaffer/?session_id={CHECKOUT_SESSION_ID}
//   3. Put the Payment Link in MONET.supporterUrl (games/the-gaffer/web/src/monet.ts) and rebuild.
const PACK_BY_PRICE = {
  // 'price_1AbCdEf…': 'supporter',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://sembagames.app');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method' });
  const sid = String((req.query && req.query.session_id) || '');
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)) return res.status(400).json({ ok: false, error: 'bad session_id' });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ ok: false, error: 'not configured' });
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sid)}?expand[]=line_items`, { headers: { Authorization: `Bearer ${key}` } });
    const s = await r.json();
    if (!r.ok) return res.status(400).json({ ok: false, error: 'stripe' });
    if (s.payment_status !== 'paid') return res.status(200).json({ ok: false, error: 'not paid' });
    const item = s.line_items && s.line_items.data && s.line_items.data[0];
    const price = item && item.price;
    const pack = PACK_BY_PRICE[price && price.id] || (s.metadata && s.metadata.pack) || (price && price.metadata && price.metadata.pack);
    if (pack !== 'supporter') return res.status(200).json({ ok: false, error: 'unknown pack' });
    return res.status(200).json({ ok: true, pack, session_id: s.id });
  } catch {
    return res.status(500).json({ ok: false, error: 'verify failed' });
  }
}
