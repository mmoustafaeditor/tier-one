// Shared response helpers for /api/data/* (CORS, caching, errors). No secrets are ever read into a response.
import { hash32 } from './ids.js';

// Snapshot changes at most a few times a week: let the CDN hold it for an hour and serve stale for a day while refreshing.
export const CACHE_PUBLIC = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';

export function send(req, res, status, body, { cache = CACHE_PUBLIC } = {}) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', status === 200 ? cache : 'no-store');
  if (status === 204) { res.statusCode = 204; return res.end(); }
  const json = JSON.stringify(body);
  if (status === 200) {
    const etag = '"' + hash32(json).toString(36) + '-' + json.length.toString(36) + '"';
    res.setHeader('ETag', etag);
    if (req.headers && req.headers['if-none-match'] === etag) { res.statusCode = 304; return res.end(); }
  }
  res.statusCode = status;
  return res.end(req.method === 'HEAD' ? undefined : json);
}

/** Method guard + query parsing shared by every endpoint. Returns URLSearchParams, or null when it already answered. */
export function guard(req, res) {
  if (req.method === 'OPTIONS') { send(req, res, 204, null); return null; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { send(req, res, 405, { ok: false, error: 'method' }); return null; }
  const u = new URL(req.url || '/', 'http://x');
  return u.searchParams;
}

export const fail = (req, res, status, error) => send(req, res, status, { ok: false, error });

export const envelope = (snap, extra) => ({ ok: true, asOf: snap.meta.asOf, season: snap.meta.season, names: snap.mode, ...extra });
