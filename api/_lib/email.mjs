// Email adapters for magic links. Interface: { send({ to, subject, text, html?, tag? }) -> { ok, id?, sandbox? } }.
// - sandboxEmail: logs to the console (never in production output) and returns sandbox:true, so the caller can hand
//   the link back to the client for local testing. Used when no mail env is configured.
// - resendEmail: Resend-style HTTP API (POST https://api.resend.com/emails, Bearer key). Any provider with the same
//   shape (from/to/subject/text) plugs in by URL. Never sends without RESEND_API_KEY + EMAIL_FROM.
export function sandboxEmail({ log } = {}) {
  const sent = [];
  return {
    name: 'sandbox', sent,
    async send(m) { sent.push({ ...m, at: Date.now() }); if (log) log('[email sandbox] to=' + m.to + ' subject=' + m.subject + '\n' + m.text); return { ok: true, sandbox: true, id: 'sbx_' + sent.length }; },
  };
}
export function resendEmail({ apiKey, from, url = 'https://api.resend.com/emails', fetchFn = fetch }) {
  return {
    name: 'resend',
    async send(m) {
      try {
        const r = await fetchFn(url, { method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [m.to], subject: m.subject, text: m.text, ...(m.html ? { html: m.html } : {}), ...(m.tag ? { tags: [{ name: 'kind', value: m.tag }] } : {}) }) });
        const j = await r.json().catch(() => ({}));
        return { ok: r.ok, id: j.id || null };
      } catch { return { ok: false }; }
    },
  };
}
export function envEmail(env = process.env) {
  if (env.RESEND_API_KEY && env.EMAIL_FROM) return resendEmail({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, url: env.EMAIL_API_URL || undefined });
  return sandboxEmail({ log: env.VERCEL_ENV === 'production' ? null : (s) => console.log(s) });
}
