// Tier One Android update feed, polled by the app's UpdateChecker.
// Bump versionCode (and upload the new downloads/TierOne.apk) with each release;
// installs with a lower versionCode are prompted to update.
const LATEST = {
  version: '1.2',
  versionCode: 3,
  downloadUrl: 'https://www.sembagames.app/downloads/TierOne.apk',
  changelog: 'Tap a finished Daily Challenge to see the full results again, browse every past challenge in the new archive, 10 contacts a day with premium and budget sources, and a harder Tier 1.',
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ ok: false, error: 'method' });
  return res.status(200).json(LATEST);
}
