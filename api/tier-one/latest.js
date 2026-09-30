// Tier One Android update feed, polled by the app's UpdateChecker.
// Bump versionCode (and upload the new downloads/TierOne.apk) with each release;
// installs with a lower versionCode are prompted to update.
const LATEST = {
  version: '3.4.0',
  versionCode: 18,
  downloadUrl: 'https://www.sembagames.app/downloads/TierOne.apk',
  changelog: 'Tier One 3.4 "One Newsroom": the Career story The Comeback, one journalist across every mode, the editor\'s desk with assignments and Deadline Day Live, the press box with weekly leagues, newsrooms and friend rivals, the Contacts Book and seasons with the Pass, films on calls and moments, and a faster, smoother game. Needs an internet connection.',
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ ok: false, error: 'method' });
  return res.status(200).json(LATEST);
}
