import { test } from 'node:test';
import assert from 'node:assert/strict';
import { call, api, newAccount, uid, kv } from './_harness.mjs';
import { nickAllowed } from '../../../_lib/moderation.mjs';

test('hello creates an account once, returns the token once, then needs it', async () => {
  const dev = uid();
  const a = await call({ action: 'account.hello', dev, nick: 'Scoop', client: { ver: '3.4.0', platform: 'android' } });
  assert.equal(a.ok, true); assert.equal(a.created, true); assert.ok(a.token); assert.match(a.account.id, /^a_[A-Z2-9]{12}$/); assert.equal(a.account.nick, 'Scoop');
  const b = await call({ action: 'account.hello', dev, token: a.token });
  assert.equal(b.created, false); assert.equal(b.token, undefined); assert.equal(b.account.id, a.account.id);
  const c = await call({ action: 'account.hello', dev });
  assert.equal(c.ok, false); assert.equal(c.status, 403); assert.equal(c.code2, 'DEVICE_CLAIMED');
  assert.equal((await call({ action: 'account.hello', dev: 'bad id!' })).code, 'BAD_REQUEST');
  const d = await call({ action: 'account.devices', dev, token: a.token });
  assert.equal(d.devices.length, 1); assert.equal(d.devices[0].platform, 'android'); assert.equal(d.devices[0].current, true);
});
test('rename: moderation list and one rename a day', async () => {
  const acc = await newAccount();
  assert.equal((await call({ action: 'account.rename', ...acc.auth, nick: 'Sh1t head' })).code, 'FORBIDDEN');
  assert.equal((await call({ action: 'account.rename', ...acc.auth, nick: 'http://x' })).code, 'BAD_REQUEST');
  const ok = await call({ action: 'account.rename', ...acc.auth, nick: 'Scunthorpe Fan' }); assert.equal(ok.ok, true); assert.equal(ok.account.nick, 'Scunthorpe Fan');
  const again = await call({ action: 'account.rename', ...acc.auth, nick: 'Other' }); assert.equal(again.code, 'RATE_LIMITED');
  assert.equal(nickAllowed('f.u.c.k'), false); assert.equal(nickAllowed('Cockburn'), true); assert.equal(nickAllowed('Journo-AB12'), true); assert.equal(nickAllowed('adm1n'), false);
});
test('magic link: sandbox mail hands back the token; finishing links the email; a second device merges', async () => {
  const a = await newAccount();
  const bad = await call({ action: 'account.link.start', ...a.auth, email: 'nope' }); assert.equal(bad.code, 'BAD_REQUEST');
  const s = await call({ action: 'account.link.start', ...a.auth, email: 'Reporter@Example.com' });
  assert.equal(s.ok, true); assert.equal(s.sandbox, true); assert.ok(s.link); assert.equal(s.email, 'R***@Example.com');
  assert.ok(api.email.sent.at(-1).text.includes('/tier-one/?link=' + s.link));
  const f = await call({ action: 'account.link.finish', ...a.auth, link: s.link });
  assert.equal(f.ok, true); assert.equal(f.merged, false); assert.equal(f.account.linked, true);
  assert.equal((await call({ action: 'account.link.finish', ...a.auth, link: s.link })).code, 'NOT_FOUND');
  // the same email from a fresh device joins the first account
  const b = await newAccount();
  const s2 = await call({ action: 'account.link.start', ...b.auth, email: 'reporter@example.com' });
  const f2 = await call({ action: 'account.link.finish', ...b.auth, link: s2.link });
  assert.equal(f2.merged, true); assert.equal(f2.account.id, a.id); assert.equal(f2.previous, b.id);
  const me = await call({ action: 'account.me', ...b.auth }); assert.equal(me.account.id, a.id); assert.equal(me.devices, 2);
  const devs = await call({ action: 'account.devices', ...a.auth }); assert.equal(devs.devices.length, 2);
  // no raw email anywhere in the store
  assert.ok(!kv.name || !JSON.stringify([...(await import('./_harness.mjs')).mem.raw.entries()]).toLowerCase().includes('reporter@example.com'));
  // link rate limit: three an hour per address
  for (let i = 0; i < 2; i++) await call({ action: 'account.link.start', ...a.auth, email: 'x@y.zz' });
  await call({ action: 'account.link.start', ...a.auth, email: 'x@y.zz' });
  assert.equal((await call({ action: 'account.link.start', ...a.auth, email: 'x@y.zz' })).code, 'RATE_LIMITED');
});
