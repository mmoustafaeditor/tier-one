// Purchase adapters behind one interface. `sandboxAllowed` is true when PLATFORM_SANDBOX=1, or when no payment
// keys are configured outside production. The sandbox provider grants any catalog item for free: for local play and
// tests only; the wallet refuses it when sandbox is off.
import { stripeAdapter } from './stripe.mjs';
import { googleAdapter } from './google.mjs';

export function createPurchases(env = process.env, { fetchFn = fetch } = {}) {
  const production = env.VERCEL_ENV === 'production';
  const stripe = stripeAdapter({ secretKey: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET, fetchFn, publicUrl: env.PUBLIC_URL || '' });
  const google = googleAdapter({ serviceAccount: env.GOOGLE_PLAY_SERVICE_ACCOUNT, packageName: env.GOOGLE_PLAY_PACKAGE || 'com.tierone.game', fetchFn, production });
  const sandboxAllowed = env.PLATFORM_SANDBOX === '1' || (!production && stripe.sandbox && google.sandbox);
  return { stripe, google, sandboxAllowed, production };
}
