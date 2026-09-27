// Tier One Android update feed, polled by the app's UpdateChecker.
// Bump versionCode (and upload the new downloads/TierOne.apk) with each release;
// installs with a lower versionCode are prompted to update.
const LATEST = {
  version: '2.1',
  versionCode: 12,
  downloadUrl: 'https://www.sembagames.app/downloads/TierOne.apk',
  changelog: 'The big one: plot twists, sources that open late, a brand-new look, a Trophies cabinet with PS5-style pop-ups, a cleaner player page with the Deadline Day clock, new results with a who-told-the-truth table, and the Back button now works.',
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ ok: false, error: 'method' });
  return res.status(200).json(LATEST);
}
