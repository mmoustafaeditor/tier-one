const LATEST = {
  version: '0.11.0',
  versionCode: 4,
  downloadUrl: 'https://sembagames.app/downloads/TheGaffer.apk',
  webUrl: 'https://sembagames.app/the-gaffer',
  changelog: 'The Gaffer branding, server-ready web deployment, direct APK updates, and Android update checks.',
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ ok: false, error: 'method' });
  return res.status(200).json(LATEST);
}
