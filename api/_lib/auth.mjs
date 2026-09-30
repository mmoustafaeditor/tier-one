// Identity: a device token becomes a Semba account. No passwords; an optional email magic link joins devices.
//
// Keys (prefix t1v4):
//   dev:<dev>            { acc, th (sha256 of the device token), gdev, platform, ver, created, seen }
//   acc:<acc>            { id, nick, created, seen, renames, emailHash?, emailMasked?, linkedAt?, flags? }
//   acc:<acc>:devs       set of device ids
//   email:<sha256>       account id owning that (salted, hashed) email; the address itself is never stored
//   ml:<sha256(token)>   pending magic link { acc, emailHash, emailMasked, exp }
// The client keeps { dev, token } (lib/account.ts). Every authenticated action sends both; the token is compared by
// hash in constant time. A device whose token is lost can only rejoin through a magic link.
import { ApiError, bad } from './router.mjs';
import { clean, devId, accId, newAccountId, token as mkToken, sha256, safeEq, nickOk, emailOk, maskEmail, today } from './util.mjs';
import { nickAllowed } from './moderation.mjs';

const P = 't1v4:';
const ACC_TTL = 730 * 86400, LINK_TTL = 15 * 60, LINK_PER_HOUR = 3, RENAME_DAYS = 1;
export const NICK_MAX = 16;

export function createAuth({ kv, email, salt, publicUrl }) {
  const emailHash = (e) => sha256('t1v4-email|' + (salt || '') + '|' + String(e).trim().toLowerCase());
  const platform = (b) => { const p = clean(b.client && b.client.platform, 12).toLowerCase(); return ['web', 'android', 'ios', 'pwa', 'desktop'].includes(p) ? p : 'web'; };
  const version = (b) => clean(b.client && b.client.ver, 20);

  async function loadAccount(id) { return kv.getJ(P + 'acc:' + id); }
  async function saveAccount(a) { return kv.setJ(P + 'acc:' + a.id, a, ACC_TTL); }
  const publicProfile = (a) => ({ id: a.id, nick: a.nick || '', created: a.created, linked: !!a.emailHash, email: a.emailMasked || null, renames: a.renames || 0 });

  // The router calls this for actions with `auth`. Returns the account or null (optional auth) / throws (required).
  async function authenticate(body) {
    const dev = devId(body.dev), tok = clean(body.token, 200);
    if (!dev || !tok) return null;
    const d = await kv.getJ(P + 'dev:' + dev);
    if (!d || !safeEq(d.th, sha256(tok))) throw new ApiError('UNAUTHORIZED', 'auth');
    const a = await loadAccount(d.acc);
    if (!a) throw new ApiError('UNAUTHORIZED', 'auth');
    return { ...a, dev, gdev: d.gdev || dev };
  }

  // account.hello: first call from a device creates an account and mints its token (returned once).
  async function hello(body, ctx) {
    const dev = devId(body.dev); if (!dev) throw bad('dev');
    const now = Date.now(), day = today();
    let d = await kv.getJ(P + 'dev:' + dev), tokenOut = null, created = false;
    if (d) {
      const tok = clean(body.token, 200);
      if (!tok || !safeEq(d.th, sha256(tok))) throw new ApiError('FORBIDDEN', 'device claimed', 403, { code2: 'DEVICE_CLAIMED' });
    } else {
      tokenOut = mkToken(32);
      const acc = { id: newAccountId(), nick: '', created: now, seen: day, renames: 0 };
      const nick = clean(body.nick, NICK_MAX);
      if (nick && nickOk(nick) && nickAllowed(nick)) acc.nick = nick;
      d = { acc: acc.id, th: sha256(tokenOut), gdev: devId(body.gameDev) || dev, platform: platform(body), ver: version(body), created: now, seen: day };
      await kv.pipeline([['SET', P + 'dev:' + dev, JSON.stringify(d), 'EX', ACC_TTL], ['SET', P + 'acc:' + acc.id, JSON.stringify(acc), 'EX', ACC_TTL], ['SADD', P + 'acc:' + acc.id + ':devs', dev], ['EXPIRE', P + 'acc:' + acc.id + ':devs', ACC_TTL]]);
      created = true;
    }
    const a = await loadAccount(d.acc);
    if (!a) throw new ApiError('STORE', 'account');
    const hasClient = body.client && typeof body.client === 'object';
    if (d.seen !== day || (hasClient && (d.platform !== platform(body) || d.ver !== version(body)))) { d.seen = day; if (hasClient) { d.platform = platform(body); d.ver = version(body); } await kv.setJ(P + 'dev:' + dev, d, ACC_TTL); }
    if (a.seen !== day) { a.seen = day; await saveAccount(a); }
    ctx.account = { ...a, dev, gdev: d.gdev || dev };
    return { account: publicProfile(a), created, ...(tokenOut ? { token: tokenOut } : {}) };
  }

  async function me(body, ctx) {
    const a = ctx.account;
    const devs = await kv.one('SMEMBERS', P + 'acc:' + a.id + ':devs');
    return { account: publicProfile(a), devices: (devs || []).length };
  }

  async function devices(body, ctx) {
    const a = ctx.account;
    const ids = (await kv.one('SMEMBERS', P + 'acc:' + a.id + ':devs')) || [];
    const docs = await kv.mgetJ(ids.map((id) => P + 'dev:' + id));
    return { devices: ids.map((id, i) => ({ dev: id, platform: docs[i] ? docs[i].platform : 'web', ver: docs[i] ? docs[i].ver : '', created: docs[i] ? docs[i].created : 0, seen: docs[i] ? docs[i].seen : '', current: id === a.dev })).sort((x, y) => (y.seen > x.seen ? 1 : -1)) };
  }

  // account.rename: a byline nick, checked against the moderation list; one change a day.
  async function rename(body, ctx) {
    const a = ctx.account, nick = clean(body.nick, NICK_MAX);
    if (nick.length < 2 || !nickOk(nick)) throw bad('nick');
    if (!nickAllowed(nick)) throw new ApiError('FORBIDDEN', 'nick not allowed', 403, { reason: 'moderation' });
    if (a.nick === nick) return { account: publicProfile(a) };
    if (a.renamedAt && Date.now() - a.renamedAt < RENAME_DAYS * 86400e3 && (a.renames || 0) > 0) throw new ApiError('RATE_LIMITED', 'one rename a day');
    const fresh = await loadAccount(a.id);
    fresh.nick = nick; fresh.renames = (fresh.renames || 0) + 1; fresh.renamedAt = Date.now();
    await saveAccount(fresh);
    return { account: publicProfile(fresh) };
  }

  // account.link.start: mail a one-time link. The reply never says whether the address is known.
  async function linkStart(body, ctx) {
    const a = ctx.account, addr = String(body.email || '').trim();
    if (!emailOk(addr)) throw bad('email');
    const eh = emailHash(addr);
    const n = await kv.incr(P + 'ml:n:' + eh + ':' + Math.floor(Date.now() / 3600e3), 1, 3600);
    if (n > LINK_PER_HOUR) throw new ApiError('RATE_LIMITED', 'too many links');
    const tok = mkToken(32);
    await kv.setJ(P + 'ml:' + sha256(tok), { acc: a.id, eh, masked: maskEmail(addr), exp: Date.now() + LINK_TTL * 1000 }, LINK_TTL);
    const url = (publicUrl || '') + '/tier-one/?link=' + tok;
    const sent = await email.send({ to: addr, subject: 'Your Tier One sign-in link', text: 'Tap to link this email to your Tier One byline (valid 15 minutes):\n\n' + url + '\n\nIf you did not ask for this, ignore it.', tag: 'magic-link' });
    return { sent: sent.ok, sandbox: !!sent.sandbox, ...(sent.sandbox ? { link: tok } : {}), expiresIn: LINK_TTL, email: maskEmail(addr) };
  }

  // account.link.finish { link }: the token from the mail (`?link=` in the URL; `token` stays the device token).
  // If the email already owns an account, this device joins it (the older account wins; the client then pulls that
  // account's cloud save).
  async function linkFinish(body, ctx) {
    const tok = clean(body.link, 200); if (!tok) throw bad('link');
    const key = P + 'ml:' + sha256(tok), ml = await kv.getJ(key);
    if (!ml || ml.exp < Date.now()) throw new ApiError('NOT_FOUND', 'link expired');
    await kv.del(key);
    const me = ctx.account;
    const owner = await kv.get(P + 'email:' + ml.eh);
    let target = me;
    let merged = false;
    if (owner && accId(owner) && owner !== me.id) {
      const other = await loadAccount(owner);
      if (other) { target = { ...other, dev: me.dev }; merged = true; }
    }
    if (merged) {
      // Move this device over: the device record now points at the linked account.
      const d = await kv.getJ(P + 'dev:' + me.dev);
      if (d) { d.acc = target.id; await kv.setJ(P + 'dev:' + me.dev, d, ACC_TTL); }
      await kv.pipeline([['SREM', P + 'acc:' + me.id + ':devs', me.dev], ['SADD', P + 'acc:' + target.id + ':devs', me.dev], ['EXPIRE', P + 'acc:' + target.id + ':devs', ACC_TTL]]);
    }
    const fresh = await loadAccount(target.id);
    if (!fresh.emailHash) { fresh.emailHash = ml.eh; fresh.emailMasked = ml.masked; fresh.linkedAt = Date.now(); await saveAccount(fresh); await kv.set(P + 'email:' + ml.eh, fresh.id, ACC_TTL); }
    return { account: publicProfile(fresh), merged, previous: merged ? me.id : null };
  }

  return { authenticate, hello, me, devices, rename, linkStart, linkFinish, loadAccount, publicProfile };
}
