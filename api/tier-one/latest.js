// Tier One Android update feed, polled by the app's UpdateChecker.
// Bump versionCode (and upload the new downloads/TierOne.apk) with each release;
// installs with a lower versionCode are prompted to update.
const LATEST = {
  version: '2.4.1',
  versionCode: 16,
  downloadUrl: 'https://www.sembagames.app/downloads/TierOne.apk',
  changelog: 'A new app icon in the Tier One newsroom look. The game itself is unchanged from 2.4.',
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ ok: false, error: 'method' });
  return res.status(200).json(LATEST);
}
