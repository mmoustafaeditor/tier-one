// Written by games/the-gaffer/scripts/publish-apk.mjs when CI publishes an APK. Don't edit by hand.
// Installed apps compare versionCode with their own and offer the download when this one is higher.
const LATEST = {
  "version": "2.2.0",
  "versionCode": 29847298,
  "downloadUrl": "https://www.sembagames.app/downloads/TheGaffer.apk",
  "webUrl": "https://www.sembagames.app/the-gaffer",
  "changelog": "The Gaffer 2.2.0"
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ ok: false, error: 'method' });
  return res.status(200).json(LATEST);
}
