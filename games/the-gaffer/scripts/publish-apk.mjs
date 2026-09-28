// Publishes a freshly built APK: copies it to /downloads/TheGaffer.apk and rewrites /api/the-gaffer/latest.js,
// the feed installed apps read. Run from the repo root (CI does this after a green build):
//   node games/the-gaffer/scripts/publish-apk.mjs <apk> <versionCode> <version> "<what's new>"
import { copyFileSync, writeFileSync } from 'node:fs';

const [apk, code, version, notes = ''] = process.argv.slice(2);
const versionCode = Number(code);
if (!apk || !Number.isInteger(versionCode) || versionCode < 1 || !version) {
  console.error('usage: publish-apk.mjs <apk> <versionCode> <version> [notes]');
  process.exit(1);
}
copyFileSync(apk, 'downloads/TheGaffer.apk');
const latest = {
  version,
  versionCode,
  downloadUrl: 'https://www.sembagames.app/downloads/TheGaffer.apk',
  webUrl: 'https://www.sembagames.app/the-gaffer',
  changelog: notes.replace(/\s+/g, ' ').trim().slice(0, 300) || `The Gaffer ${version}`,
};
writeFileSync('api/the-gaffer/latest.js', `// Written by games/the-gaffer/scripts/publish-apk.mjs when CI publishes an APK. Don't edit by hand.
// Installed apps compare versionCode with their own and offer the download when this one is higher.
const LATEST = ${JSON.stringify(latest, null, 2)};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ ok: false, error: 'method' });
  return res.status(200).json(LATEST);
}
`);
console.log(`published TheGaffer.apk ${version} (versionCode ${versionCode})`);
