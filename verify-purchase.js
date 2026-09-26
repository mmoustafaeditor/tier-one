// Tier One — purchase verification (Vercel serverless function, Node 18+)
//
// The game sends the player here after Stripe redirects them back:
//   GET /api/verify-purchase?session_id=cs_live_...
// We ask Stripe whether that Checkout Session is paid and which pack it was,
// and answer { ok:true, pack:"pack2" }. The game only grants credits on ok:true.
//
// Setup (once):
//   1. Vercel › Project › Settings › Environment Variables:
//        STRIPE_SECRET_KEY = sk_live_...   (use sk_test_... while testing)
//        ALLOWED_ORIGIN    = https://your-domain.com   (optional, defaults to *)
//   2. Fill PACK_BY_PRICE below with the Price IDs of your four Payment Links
//      (Stripe › Product catalogue › product › Pricing › "price_..." ID).
//      OR add metadata  pack=pack1|pack2|pack3|removeAds  to each Payment Link
//      (Stripe › Payment Links › link › ... › Metadata) and leave the map empty.
//   3. In index.html set  VERIFY_ENDPOINT:'/api/verify-purchase'
//
// No npm dependencies — uses the built-in fetch.

const PACK_BY_PRICE = {
  // 'price_1AbCdEfGhIjKlMn': 'pack1',
  // 'price_1AbCdEfGhIjKlMo': 'pack2',
  // 'price_1AbCdEfGhIjKlMp': 'pack3',
  // 'price_1AbCdEfGhIjKlMq': 'removeAds',
};
const VALID = new Set(['pack1', 'pack2', 'pack3', 'removeAds']);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method' });

  const sid = String((req.query && req.query.session_id) || '');
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)) return res.status(400).json({ ok: false, error: 'bad session_id' });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ ok: false, error: 'STRIPE_SECRET_KEY not set' });

  try {
    const r = await fetch(
      'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sid) + '?expand[]=line_items',
      { headers: { Authorization: 'Bearer ' + key } }
    );
    const s = await r.json();
    if (!r.ok) return res.status(400).json({ ok: false, error: (s.error && s.error.message) || 'stripe error' });
    if (s.payment_status !== 'paid') return res.status(200).json({ ok: false, error: 'not paid' });

    const item = s.line_items && s.line_items.data && s.line_items.data[0];
    const priceId = item && item.price && item.price.id;
    let pack = PACK_BY_PRICE[priceId] || (s.metadata && s.metadata.pack) || (item && item.price && item.price.metadata && item.price.metadata.pack);
    if (!VALID.has(pack)) return res.status(200).json({ ok: false, error: 'unknown pack for price ' + priceId });

    return res.status(200).json({ ok: true, pack, session_id: s.id, client_reference_id: s.client_reference_id || null });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'verify failed' });
  }
}

// Hardening later (optional): store granted session IDs in Vercel KV / Upstash and
// refuse a second grant for the same session, so a copied redirect URL can't be replayed
// on another device. The game already refuses replays on the same device.
