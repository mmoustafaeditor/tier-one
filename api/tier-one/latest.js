// Tier One Android update feed, polled by the app's UpdateChecker.
// Bump versionCode (and upload the new downloads/TierOne.apk) with each release;
// installs with a lower versionCode are prompted to update.
const LATEST = {
  version: '2.3',
  versionCode: 14,
  downloadUrl: 'https://www.sembagames.app/downloads/TierOne.apk',
  changelog: 'New epic Semba intro, Career source upgrade tree with tier bars that rise as you upgrade, Go louder on your calls, clearer rival journalists, a compact Trophies page and calmer trophy pop-ups.',
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ ok: false, error: 'method' });
  return res.status(200).json(LATEST);
}
