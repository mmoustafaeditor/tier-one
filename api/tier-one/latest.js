// Tier One Android update feed, polled by the app's UpdateChecker.
// Bump versionCode (and upload the new downloads/TierOne.apk) with each release;
// installs with a lower versionCode are prompted to update.
const LATEST = {
  version: '3.4.0',
  versionCode: 19,
  downloadUrl: 'https://www.sembagames.app/downloads/TierOne.apk',
  changelog: 'Tier One 3.4 "One Newsroom" comes to the app: The Comeback career story, one connected career, drawn motion films for every call and post, your own catchphrase, the press box with rooms and friends, and the new design. Needs an internet connection.',
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ ok: false, error: 'method' });
  return res.status(200).json(LATEST);
}
