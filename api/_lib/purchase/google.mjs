// Google Play Billing adapter: verifies a one-time product purchase through the Android Publisher API with a
// service account (GOOGLE_PLAY_SERVICE_ACCOUNT = the JSON key, GOOGLE_PLAY_PACKAGE = com.tierone.game).
// Sandbox without the key: only tokens of the form "sandbox:<sku>" verify, and never in production.
import { createSign } from 'node:crypto';

const b64u = (s) => Buffer.from(s).toString('base64url');
export function googleAdapter({ serviceAccount, packageName, fetchFn = fetch, production = false } = {}) {
  let sa = null;
  if (serviceAccount) { try { sa = typeof serviceAccount === 'string' ? JSON.parse(serviceAccount) : serviceAccount; } catch { sa = null; } }
  const sandbox = !sa || !sa.client_email || !sa.private_key;
  let tokenCache = null;
  async function accessToken() {
    if (tokenCache && tokenCache.exp > Date.now() + 60e3) return tokenCache.token;
    const now = Math.floor(Date.now() / 1000), aud = sa.token_uri || 'https://oauth2.googleapis.com/token';
    const unsigned = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud, iat: now, exp: now + 3600 }));
    const sig = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
    const r = await fetchFn(aud, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + unsigned + '.' + sig });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.access_token) throw new Error('google token');
    tokenCache = { token: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
    return tokenCache.token;
  }
  const base = (pkg) => 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + encodeURIComponent(pkg || packageName);
  return {
    name: 'google', sandbox,
    // -> { paid, sku, receiptId } ; receiptId is Google's orderId (falls back to the purchase token).
    async verifyProduct({ productId, purchaseToken, packageName: pkg }) {
      const sku = String(productId || ''), tok = String(purchaseToken || '');
      if (!/^[a-z0-9_.]{2,60}$/.test(sku) || !tok || tok.length > 400) return { paid: false, why: 'input' };
      if (sandbox) { if (production) return { paid: false, why: 'sandbox off' }; return tok === 'sandbox:' + sku ? { paid: true, sku, receiptId: 'gsbx_' + sku + '_' + tok.length, sandbox: true } : { paid: false, why: 'sandbox token' }; }
      if (pkg && pkg !== packageName) return { paid: false, why: 'package' };
      const at = await accessToken();
      const r = await fetchFn(base(pkg) + '/purchases/products/' + encodeURIComponent(sku) + '/tokens/' + encodeURIComponent(tok), { headers: { Authorization: 'Bearer ' + at } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { paid: false, why: 'google ' + r.status };
      if (Number(j.purchaseState) !== 0) return { paid: false, why: 'state ' + j.purchaseState };
      return { paid: true, sku, receiptId: j.orderId || tok, acknowledged: Number(j.acknowledgementState) === 1, token: tok };
    },
    // Best effort after a grant; Google refunds unacknowledged purchases after three days.
    async acknowledge({ productId, purchaseToken }) {
      if (sandbox) return true;
      try { const at = await accessToken(); const r = await fetchFn(base() + '/purchases/products/' + encodeURIComponent(productId) + '/tokens/' + encodeURIComponent(purchaseToken) + ':acknowledge', { method: 'POST', headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' }, body: '{}' }); return r.ok; } catch { return false; }
    },
  };
}
