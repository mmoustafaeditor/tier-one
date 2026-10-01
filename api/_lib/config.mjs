// Remote config: catalog, featured rotation, events (weekly + Deadline Day Live), flags, A/B buckets and the client
// version floor, read from api/tier-one/v4/config/*.json (editable without code) and validated on load.
//   config.get { client? } -> { catalog, featured, events, flags, ab, minClientVersion, latest, season, now }
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertValid } from './schema.mjs';
import { fnv1a, seasonOf, today, isDay } from './util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DIR = path.resolve(HERE, '../tier-one/v4/config');
const DAY_RE = '^\\d{4}-\\d{2}-\\d{2}$', ID_RE = '^[a-z0-9][a-z0-9._-]{1,40}$';

export const SCHEMAS = {
  catalog: {
    type: 'object', required: ['items', 'earn', 'gift'], additionalProperties: false,
    properties: {
      items: { type: 'array', uniqueBy: 'id', items: { type: 'object', required: ['id', 'kind', 'name', 'price', 'grants'], additionalProperties: false, properties: {
        id: { type: 'string', pattern: ID_RE }, kind: { type: 'string', enum: ['credits', 'gold', 'cosmetic', 'coins', 'name'] }, name: { type: 'string', maxLength: 60 }, desc: { type: 'string', maxLength: 200 },
        price: { type: 'object', additionalProperties: false, properties: { credits: { type: 'integer', minimum: 0 }, eur: { type: 'integer', minimum: 0 }, usd: { type: 'integer', minimum: 0 } } },
        grants: { type: 'object', additionalProperties: false, properties: { credits: { type: 'integer', minimum: 0 }, coins: { type: 'integer', minimum: 0 }, ent: { type: 'string', pattern: '^[a-z][a-z0-9:._-]{1,60}$' } } },
        season: { type: 'string', pattern: '^\\d{4}-(summer|autumn|winter|spring)$' }, featured: { type: 'boolean' }, from: { type: 'string', pattern: DAY_RE }, until: { type: 'string', pattern: DAY_RE },
        stripePrice: { type: 'string', maxLength: 60 }, googleSku: { type: 'string', maxLength: 60 }, giftable: { type: 'boolean' },
      } } },
      earn: { type: 'object', additionalProperties: { type: 'integer', minimum: 0, maximum: 1000 } },
      gift: { type: 'object', required: ['max', 'perDay'], additionalProperties: false, properties: { max: { type: 'integer', minimum: 1 }, perDay: { type: 'integer', minimum: 1 } } },
      // 3.4 long tail (GOTY §8.4/§12, client lib/catalog.ts applyRemoteCatalog): looks in the client Item shape (closed
      // key list: an item has no field that could carry a gameplay effect), drop dates, rail lengths, vault returns and
      // the earned-only ids that may never carry a price. All optional.
      looks: { type: 'array', uniqueBy: 'id', items: { type: 'object', required: ['id', 'kind', 'nameKey', 'price', 'source', 'rarity', 'preview'], additionalProperties: false, properties: {
        id: { type: 'string', pattern: '^[a-z0-9][a-z0-9.-]{1,40}$' }, kind: { type: 'string', pattern: '^[a-z]{3,14}$' }, nameKey: { type: 'string', maxLength: 80 }, nameVars: { type: 'object' }, descKey: { type: 'string', maxLength: 80 },
        price: { type: 'object', additionalProperties: false, properties: { coins: { type: 'integer', minimum: 1 }, credits: { type: 'integer', minimum: 1 } } },
        source: { type: 'string', enum: ['store', 'earned', 'event'] }, rarity: { type: 'string', enum: ['common', 'rare', 'epic', 'legendary'] }, set: { type: 'string', maxLength: 30 },
        window: { type: 'object', required: ['from', 'to'], additionalProperties: false, properties: { from: { type: 'integer' }, to: { type: 'integer' } } },
        drop: { type: 'integer' }, featured: { type: 'boolean' },
        earn: { type: 'object', required: ['via'], additionalProperties: false, properties: { via: { type: 'string', enum: ['story', 'rank', 'streak', 'rivalry', 'referral', 'event', 'ddlive', 'anniversary', 'pass', 'gold'] }, n: { type: 'integer', minimum: 1 }, ref: { type: 'string', pattern: '^[a-z0-9-]{1,24}$' } } },
        preview: { type: 'object', required: ['k'] },
      } } },
      drops: { type: 'array', uniqueBy: 'id', items: { type: 'object', required: ['id', 'at'], additionalProperties: false, properties: { id: { type: 'string', pattern: '^[a-z0-9][a-z0-9.-]{1,40}$' }, at: { type: 'string', pattern: DAY_RE } } } },
      rails: { type: 'object', additionalProperties: false, properties: { newDays: { type: 'integer', minimum: 1, maximum: 30 }, lastDays: { type: 'integer', minimum: 1, maximum: 30 }, max: { type: 'integer', minimum: 1, maximum: 30 } } },
      vault: { type: 'array', uniqueBy: 'id', items: { type: 'object', required: ['id', 'from', 'to'], additionalProperties: false, properties: { id: { type: 'string', pattern: '^(rumour|winter|spring|summer)-\\d{4}\\.[a-z]{2}$' }, from: { type: 'string', pattern: DAY_RE }, to: { type: 'string', pattern: DAY_RE } } } },
      earnedOnly: { type: 'array', items: { type: 'string', pattern: '^[a-z0-9][a-z0-9.-]{1,40}$' } },
    },
  },
  events: {
    type: 'object', required: ['weekly', 'ddlive'], additionalProperties: false,
    properties: {
      weekly: { type: 'array', uniqueBy: 'id', items: { type: 'object', required: ['id', 'week', 'title'], additionalProperties: false, properties: { id: { type: 'string', pattern: ID_RE }, week: { type: 'string', pattern: '^\\d{4}-W\\d{2}$' }, title: { type: 'string', maxLength: 80 }, rules: { type: 'object' }, reward: { type: 'string', maxLength: 40 } } } },
      ddlive: { type: 'array', uniqueBy: 'id', items: { type: 'object', required: ['id', 'day', 'title'], additionalProperties: false, properties: { id: { type: 'string', pattern: ID_RE }, day: { type: 'string', pattern: DAY_RE }, title: { type: 'string', maxLength: 80 }, closesLocal: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }, window: { type: 'string', maxLength: 40 } } } },
    },
  },
  flags: {
    type: 'object', required: ['flags', 'ab', 'client', 'telemetry'], additionalProperties: false,
    properties: {
      flags: { type: 'object', additionalProperties: { oneOf: ['boolean', 'number', 'string'] } },
      ab: { type: 'object', required: ['experiments'], additionalProperties: false, properties: { experiments: { type: 'array', uniqueBy: 'id', items: { type: 'object', required: ['id', 'buckets', 'active'], additionalProperties: false, properties: { id: { type: 'string', pattern: ID_RE }, buckets: { type: 'array', minItems: 2, maxItems: 8, items: { type: 'string', pattern: ID_RE } }, weights: { type: 'array', items: { type: 'number', minimum: 0 } }, active: { type: 'boolean' }, salt: { type: 'string', maxLength: 40 } } } } } },
      client: { type: 'object', required: ['minClientVersion', 'latest'], additionalProperties: false, properties: { minClientVersion: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' }, latest: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' }, message: { type: 'string', maxLength: 200 } } },
      telemetry: { type: 'object', required: ['sample'], additionalProperties: false, properties: { sample: { type: 'number', minimum: 0, maximum: 1 }, maxBatch: { type: 'integer', minimum: 1, maximum: 200 } } },
    },
  },
};
// `oneOf` by primitive type: the flags map allows booleans, numbers and strings.
const withOneOf = (schema, value, p, errors) => { if (schema.oneOf && !schema.oneOf.includes(typeof value)) errors.push(p + ': expected ' + schema.oneOf.join('|')); };
function checkFlagValues(f) { const errs = []; for (const [k, v] of Object.entries(f.flags || {})) withOneOf(SCHEMAS.flags.properties.flags.additionalProperties, v, '$.flags.' + k, errs); if (errs.length) throw new Error('config flags invalid: ' + errs.join('; ')); }

// The long-tail rules the schema can't say: earned-only looks never carry a price (and the earnedOnly ids never appear
// as store looks), store looks always do, a vault return lasts seven days at most, and a preview is colours and words:
// no number other than a front page's column count, so nothing that could reach an engine rides in on a look.
const PREVIEW_NUMS = new Set(['cols']);
// Words that name a gameplay effect. A look (or its preview) carrying one is refused outright, whatever its value:
// nothing sold or earned here may touch a Daily board, a score, a streak or the clock (GOTY §8.4).
const EFFECT_RE = /^(effect|effects|boost|bonus|mult|multiplier|score|points|pts|xp|pp|odds|hint|hints|reveal|board|streak|shield|freeze|retry|retries|time|timer|clock|lives|power|perk|buff|advantage)$/i;
/** Every reason the catalog's long-tail block is invalid (empty = fine). loadConfig() throws on any. */
export function validateCatalog(cat) {
  const errs = [];
  const effectKeys = (o, where) => { for (const k of Object.keys(o || {})) if (EFFECT_RE.test(k)) errs.push(where + '.' + k + ': gameplay effects are not allowed'); };
  for (const it of cat.items || []) effectKeys(it.grants, it.id + ': grants');
  for (const it of cat.looks || []) { effectKeys(it, it.id); effectKeys(it.preview, it.id + ': preview'); }
  const never = new Set(cat.earnedOnly || []);
  for (const it of cat.looks || []) {
    const priced = it.price && (it.price.coins != null || it.price.credits != null);
    if (it.source === 'earned' && (priced || !it.earn)) errs.push(it.id + ': earned looks carry an earn rule and no price');
    if (it.source === 'store' && !priced) errs.push(it.id + ': store look without a price');
    if (never.has(it.id) && it.source !== 'earned') errs.push(it.id + ': listed as earned-only');
    for (const [k, v] of Object.entries(it.preview || {})) if ((typeof v === 'number' && !PREVIEW_NUMS.has(k)) || typeof v === 'boolean' && k !== 'upper' && k !== 'paper') errs.push(it.id + ': preview.' + k + ' is not a look');
  }
  for (const v of cat.vault || []) { const d = (Date.parse(v.to) - Date.parse(v.from)) / 864e5; if (!(d > 0 && d <= 7)) errs.push('vault ' + v.id + ': one week at most'); }
  for (const d of cat.drops || []) if (never.has(d.id)) errs.push('drop ' + d.id + ': earned-only looks are not dropped in the store');
  return errs;
}
export function checkLooks(cat) {
  const errs = validateCatalog(cat);
  if (errs.length) throw new Error('config catalog invalid: ' + errs.slice(0, 5).join('; '));
}

export function loadConfig(dir = DEFAULT_DIR) {
  const read = (name) => { const file = path.join(dir, name + '.json'); return assertValid(SCHEMAS[name], JSON.parse(fs.readFileSync(file, 'utf8')), name); };
  const cfg = { catalog: read('catalog'), events: read('events'), flags: read('flags'), dir, loadedAt: Date.now() };
  checkFlagValues(cfg.flags);
  for (const e of cfg.flags.ab.experiments) if (e.weights && e.weights.length !== e.buckets.length) throw new Error('config flags invalid: experiment ' + e.id + ' weights/buckets mismatch');
  for (const it of cfg.catalog.items) if (it.kind !== 'credits' && !it.price.credits && !it.price.eur && !it.price.usd) throw new Error('config catalog invalid: item ' + it.id + ' has no price');
  checkLooks(cfg.catalog);
  return cfg;
}

// Deterministic bucket: FNV-1a of "<experiment>|<salt>|<subject>" over the weights. Same function as lib/flags.ts.
export function bucketFor(exp, subject) {
  const w = exp.weights && exp.weights.length ? exp.weights : exp.buckets.map(() => 1);
  const total = w.reduce((a, b) => a + b, 0) || 1;
  const x = (fnv1a(exp.id + '|' + (exp.salt || '') + '|' + subject) % 10000) / 10000 * total;
  let acc = 0;
  for (let i = 0; i < w.length; i++) { acc += w[i]; if (x < acc) return exp.buckets[i]; }
  return exp.buckets[w.length - 1];
}
export const cmpVer = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
export function isoWeek(day) { const d = new Date(day + 'T00:00:00Z'); const dow = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dow); const y = d.getUTCFullYear(), w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7); return y + '-W' + String(w).padStart(2, '0'); }

export function createConfig({ dir = DEFAULT_DIR, ttlMs = 60_000 } = {}) {
  let cache = null;
  const current = () => { if (!cache || Date.now() - cache.loadedAt > ttlMs) cache = loadConfig(dir); return cache; };
  function view(subject, day = today()) {
    const c = current();
    const active = (it) => (!it.from || it.from <= day) && (!it.until || it.until >= day);
    const items = c.catalog.items.filter(active).map(({ stripePrice, googleSku, ...pub }) => pub);
    const week = isoWeek(day);
    const nextWeek = isoWeek(new Date(Date.parse(day + 'T00:00:00Z') + 7 * 864e5).toISOString().slice(0, 10));
    const ab = {};
    for (const e of c.flags.ab.experiments) if (e.active) ab[e.id] = bucketFor(e, subject || 'anon');
    return {
      catalog: { items, earn: c.catalog.earn, gift: c.catalog.gift, looks: c.catalog.looks || [], drops: c.catalog.drops || [], rails: c.catalog.rails || {}, vault: c.catalog.vault || [], earnedOnly: c.catalog.earnedOnly || [] },
      featured: items.filter((i) => i.featured).map((i) => i.id),
      events: {
        weekly: c.events.weekly.filter((e) => e.week === week || e.week === nextWeek).map((e) => ({ ...e, live: e.week === week })),
        ddlive: c.events.ddlive.filter((e) => isDay(e.day) && e.day >= day).slice(0, 4).map((e) => ({ ...e, live: e.day === day })),
      },
      flags: c.flags.flags, ab, minClientVersion: c.flags.client.minClientVersion, latest: c.flags.client.latest, message: c.flags.client.message || '',
      telemetry: c.flags.telemetry, season: seasonOf(Date.now()), week, now: Date.now(),
    };
  }
  return { current, view, item: (id) => current().catalog.items.find((i) => i.id === id) || null, reload: () => { cache = null; return current(); } };
}
