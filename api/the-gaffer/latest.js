// Written by games/the-gaffer/scripts/publish-apk.mjs when CI publishes an APK. Don't edit by hand.
// Installed apps compare versionCode with their own and offer the download when this one is higher.
const LATEST = {
  "version": "2.1.0",
  "versionCode": 29845999,
  "downloadUrl": "https://www.sembagames.app/downloads/TheGaffer.apk",
  "webUrl": "https://www.sembagames.app/the-gaffer",
  "changelog": "Merge pull request #5 from mmoustafaeditor/ccr-692b713a-3z28u5"
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ ok: false, error: 'method' });
  return res.status(200).json(LATEST);
}
