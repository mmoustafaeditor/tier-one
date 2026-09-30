// Tier One platform API v4 (Vercel function, Node 20+): identity, cloud save, wallet, catalog/remote config and
// telemetry, with every v3 action mounted unchanged underneath. POST /api/tier-one/v4 { action, ... }
//   -> { ok:true, rid, v, ... } | { ok:false, error, code, rid }
//
// Storage: the same Upstash Redis REST store as v3 (api/_lib/kv.mjs). Env (names only, see docs/api/README.md):
//   KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_*), PUBLIC_URL, T1V4_SALT, OPS_TOKEN, RESEND_API_KEY + EMAIL_FROM,
//   STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET, GOOGLE_PLAY_SERVICE_ACCOUNT + GOOGLE_PLAY_PACKAGE, PLATFORM_SANDBOX.
//
// Add an action: register it in `mount()` below with { v, auth, write, limit, fn } (docs/api/README.md › Adding an
// action) and describe it in docs/api/v4.yaml. v3 actions are reachable as `v3.<action>` and, when the bare name
// is free, as `<action>`; they are never re-implemented here.
import { createRouter, ApiError } from '../../_lib/router.mjs';
import { envKv } from '../../_lib/kv.mjs';
import { createAuth } from '../../_lib/auth.mjs';
import { envEmail } from '../../_lib/email.mjs';
import { createSaveStore } from '../../_lib/save.mjs';
import { createConfig } from '../../_lib/config.mjs';
import { createPurchases } from '../../_lib/purchase/index.mjs';
import { createWallet } from '../../_lib/wallet.mjs';
import { createTelemetry } from '../../_lib/telemetry.mjs';
import { cmpVer } from '../../_lib/config.mjs';
import { clean, devId, sha256 } from '../../_lib/util.mjs';
import * as v3 from '../v3/index.js';
import { createCatchphrase } from './catchphrase.mjs';

export const V4 = '4.0.0';
const V3_BODY_MAX = 4000;

// Newsroom membership for gifts: the pressbox lane adds account ids to t1v4:newsroom:<code>:members (SADD), or
// passes its own check through createApi({ newsroomMembers }).
const defaultNewsroomMembers = (kv) => async (code, ids) => {
  const r = await kv.pipeline(ids.map((id) => ['SISMEMBER', 't1v4:newsroom:' + code + ':members', id]));
  return r.every((x) => Number(x) === 1);
};

export function createApi(deps = {}) {
  const env = deps.env || process.env;
  const kv = deps.kv || envKv();
  const email = deps.email || envEmail(env);
  const config = deps.config || createConfig(deps.configDir ? { dir: deps.configDir } : {});
  const purchases = deps.purchases || createPurchases(env, { fetchFn: deps.fetchFn });
  const salt = env.T1V4_SALT || (env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN ? sha256('t1v4|' + (env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN)) : 'dev-salt');
  const auth = createAuth({ kv, email, salt, publicUrl: env.PUBLIC_URL || '' });
  const saves = createSaveStore({ kv });
  const wallet = createWallet({ kv, config, purchases, newsroomMembers: deps.newsroomMembers || defaultNewsroomMembers(kv) });
  const telemetry = createTelemetry({ kv, config, opsToken: env.OPS_TOKEN || '' });
  const router = createRouter({ kv, authenticate: auth.authenticate, onError: deps.onError || ((e, rid) => console.error('[v4 ' + rid + ']', e && e.stack || e)) });
  const R = router.register;

  // ---- health and config
  R('health', { rate: 'none', fn: async () => ({ api: V4, store: kv.online, storeName: kv.name, email: email.name, sandbox: purchases.sandboxAllowed, stripe: !purchases.stripe.sandbox, google: !purchases.google.sandbox, config: !!config.current(), actions: router.list().length, v3: Object.keys(v3.actions).length }) });
  R('config.get', { auth: 'optional', fn: async (b, ctx) => {
    const subject = (ctx.account && ctx.account.id) || ctx.dev || '';
    const view = config.view(subject);
    const ver = clean(b.client && b.client.ver, 20);
    return { ...view, subject: subject ? 'account' : 'anon', update: ver && /^\d+\.\d+\.\d+$/.test(ver) ? (cmpVer(ver, view.minClientVersion) < 0 ? 'required' : cmpVer(ver, view.latest) < 0 ? 'available' : 'none') : 'unknown' };
  } });

  // ---- identity
  R('account.hello', { write: true, limit: 120, fn: (b, ctx) => auth.hello(b, ctx) });
  R('account.me', { auth: true, fn: auth.me });
  R('account.devices', { auth: true, fn: auth.devices });
  R('account.rename', { auth: true, write: true, fn: auth.rename });
  R('account.link.start', { auth: true, write: true, limit: 10, fn: auth.linkStart });
  R('account.link.finish', { auth: true, write: true, limit: 20, fn: auth.linkFinish });

  // ---- cloud save
  R('save.push', { auth: true, write: true, limit: 600, fn: saves.push });
  R('save.pull', { auth: true, fn: saves.pull });

  // ---- wallet, purchases, entitlements
  R('wallet.get', { auth: true, fn: wallet.get });
  R('wallet.earn', { auth: true, write: true, limit: 60, fn: wallet.earn });
  R('wallet.spend', { auth: true, write: true, limit: 120, fn: wallet.spend });
  R('wallet.gift', { auth: true, write: true, limit: 60, fn: wallet.gift });
  R('wallet.purchase.verify', { auth: true, write: true, limit: 60, fn: wallet.verify });
  R('wallet.checkout.start', { auth: true, write: true, limit: 30, fn: wallet.checkoutStart });
  R('wallet.coins.claim', { auth: true, write: true, fn: wallet.claimCoins });
  R('ent.list', { auth: true, fn: wallet.entList });

  // ---- your own catchphrase (GOTY §12): moderated, 24 characters (./catchphrase.mjs)
  const catchphrase = createCatchphrase({ kv });
  R('catchphrase.set', { auth: true, write: true, limit: 20, fn: catchphrase.set });

  // ---- telemetry and ops
  R('telemetry.batch', { auth: 'optional', write: false, limit: 720, fn: telemetry.batch });
  R('ops.stats', { rate: 'none', fn: telemetry.stats });

  // ---- v3 passthrough: `v3.<name>` always, bare `<name>` when v4 has no action of that name.
  for (const [name, fn] of Object.entries(v3.actions)) {
    const def = { source: 'v3', rate: name === 'health' ? 'none' : undefined, fn: async (b) => {
      if (JSON.stringify(b).length > V3_BODY_MAX) throw new ApiError('PAYLOAD_TOO_LARGE', 'body', 413);
      const out = await fn(b);
      if (out && out.error) { const { error, ...rest } = out; throw new ApiError('V3_' + String(error).toUpperCase().replace(/[^A-Z0-9]+/g, '_'), error, 200, rest); }
      return out;
    } };
    R('v3.' + name, def);
    if (!router.resolve(name)) R(name, def);
  }

  return { router, handler: router.handler, dispatch: router.dispatch, list: router.list, kv, auth, saves, wallet, telemetry, config, purchases, email };
}

let api = null;
export const getApi = () => (api = api || createApi());
export default async function handler(req, res) { return getApi().handler(req, res); }
export { devId };
