// Tier One Android update feed, polled by the app's UpdateChecker.
// Bump versionCode (and upload the new downloads/TierOne.apk) with each release;
// installs with a lower versionCode are prompted to update.
const LATEST = {
  version: '2.4',
  versionCode: 15,
  downloadUrl: 'https://www.sembagames.app/downloads/TierOne.apk',
  changelog: 'Plot twists now land one to three times a window, exclusives survive a rival who got it wrong, contested-exclusive and twist-count details at the results, daily and weekly leaderboards, share card with your rank, snap calls on Deadline Day and the Career journey.',
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ ok: false, error: 'method' });
  return res.status(200).json(LATEST);
}
