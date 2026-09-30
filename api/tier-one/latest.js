// Tier One Android update feed, polled by the app's UpdateChecker.
// Bump versionCode (and upload the new downloads/TierOne.apk) with each release;
// installs with a lower versionCode are prompted to update.
const LATEST = {
  version: '3.1.0',
  versionCode: 17,
  downloadUrl: 'https://www.sembagames.app/downloads/TierOne.apk',
  changelog: 'Tier One 3.1 comes to the app: the newsroom redesign with Story mode, Today\'s five, the Wire, Friends and full-screen source calls, plus a new app icon. Needs an internet connection.',
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ ok: false, error: 'method' });
  return res.status(200).json(LATEST);
}
