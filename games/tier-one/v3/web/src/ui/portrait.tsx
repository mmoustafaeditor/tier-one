// Character art slots (LAUNCH_BRIEF Addendum A). One <Portrait> for every face in the game: real players (by player
// id), the fictional sources (kitman · barber · agent · spotter · physio · leak), the rivals (tabloid · itk · insider)
// and the newsroom staff (editor · you). The owner's approved anime art drops in by id through public/art/manifest.json
// (no code change: the manifest maps "<kind>/<id>" to an image under public/art/). Until a file lands, a consistent
// illustrated SVG placeholder stands in: the same id always draws the same face (build, hair, skin, expression), tinted
// with the club or source colour. Names, clubs and statuses are never baked into the art: they are live text beside it.
//
//   <Portrait kind="player" id={p.id} club={c.to} size={72} />
//   <Portrait kind="source" id="kitman" size={44} mood="confident" />
//   <Portrait kind="rival"  id="itk" size={34} />
//   <Portrait kind="staff"  id="editor" size={96} mood="stern" />
//
// Moods are short and optional (a glance, a frown): they change the placeholder's mouth/brows only and pick the
// manifest variant "<id>@<mood>" when the owner supplied one. Reduced motion: no animation here at all.
import { useEffect, useState, type CSSProperties } from 'react';
import { hash } from '../lib/kit';
import type { WClub } from '../lib/engine';

export type PortraitKind = 'player' | 'source' | 'rival' | 'staff';
export type Mood = 'neutral' | 'confident' | 'hesitant' | 'mischief' | 'stern' | 'shock' | 'joy';
export interface ArtManifest { v: number; base?: string; player?: Record<string, string>; source?: Record<string, string>; rival?: Record<string, string>; staff?: Record<string, string> }

// ---------- the manifest (fetched once; empty until it loads or when it is missing)
let manifest: ArtManifest | null = null;
let loading: Promise<ArtManifest> | null = null;
const subs = new Set<() => void>();
export function loadArtManifest(): Promise<ArtManifest> {
  if (manifest) return Promise.resolve(manifest);
  if (!loading) {
    const url = (typeof location !== 'undefined' && (location.protocol === 'file:' || location.hostname === 'appassets.androidplatform.net')) ? 'https://www.sembagames.app/tier-one/art/manifest.json' : 'art/manifest.json';
    loading = fetch(url, { cache: 'force-cache' }).then((r) => (r.ok ? r.json() : { v: 0 })).catch(() => ({ v: 0 })).then((m: ArtManifest) => { manifest = m; subs.forEach((f) => f()); return m; });
  }
  return loading;
}
/** The approved image for a face, if the owner has supplied one (with the mood variant first). */
export function artFor(kind: PortraitKind, id: string, mood?: Mood): string | null {
  const m = manifest; if (!m) return null;
  const table = m[kind]; if (!table) return null;
  const hit = (mood && table[id + '@' + mood]) || table[id];
  if (!hit) return null;
  const base = m.base || 'art/';
  return /^(https?:)?\//.test(hit) ? hit : base + hit;
}
function useArt(kind: PortraitKind, id: string, mood?: Mood) {
  const [, bump] = useState(0);
  useEffect(() => { const f = () => bump((n) => n + 1); subs.add(f); loadArtManifest(); return () => { subs.delete(f); }; }, []);
  return artFor(kind, id, mood);
}

// ---------- the placeholder: an original illustrated face, deterministic per id
const SKIN = ['#F1C9A5', '#E0AC84', '#C98C5E', '#A66A42', '#7A4A2B', '#5C3A22'];
const HAIR = ['#1B1612', '#3B2A1E', '#6B4423', '#A86A2E', '#C9A050', '#2E2E36', '#5A5A62', '#8B1E1E'];
const SRC_C: Record<string, string> = { kitman: '#2FBF71', barber: '#FF9A1F', agent: '#35C3E6', spotter: '#9E7BFF', physio: '#FF5A36', leak: '#A77BFF', editor: '#F7B928', you: '#FF5A36', tabloid: '#FF3D7F', itk: '#6B6B80', insider: '#F7B928' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** The SVG placeholder as a string (also used by the share card). `tint` is the backdrop: a club colour, a source colour. */
export function portraitPlaceholderSVG(kind: PortraitKind, id: string, opts: { tint?: string; tint2?: string; mood?: Mood; label?: string } = {}): string {
  const h = hash(kind + ':' + id);
  const skin = SKIN[h % SKIN.length], hair = HAIR[(h >>> 3) % HAIR.length];
  const build = (h >>> 6) % 3, cut = (h >>> 8) % 4, brow = (h >>> 11) % 2, beard = kind !== 'staff' && (h >>> 13) % 3 === 0;
  const tint = opts.tint || SRC_C[id] || '#3A342A', tint2 = opts.tint2 || '#F4EFE4';
  const mood = opts.mood || 'neutral';
  const uid = 'pt' + (h % 100000);
  // head geometry: three builds (narrow, round, square)
  const face = ['M50 22c-15 0-25 12-25 30 0 18 10 32 25 32s25-14 25-32c0-18-10-30-25-30z', 'M50 20c-17 0-28 13-28 31s11 33 28 33 28-15 28-33-11-31-28-31z', 'M50 21c-16 0-26 10-26 26v8c0 16 10 29 26 29s26-13 26-29v-8c0-16-10-26-26-26z'][build];
  const hairs = [
    'M24 48c-2-20 10-32 26-32s28 12 26 32c-4-9-10-15-18-16-6 5-16 6-26 3-3 4-6 8-8 13z',
    'M23 50c-1-24 11-36 27-36s28 12 27 36c-3-6-7-10-12-11-4-7-10-10-15-10s-11 3-15 10c-5 1-9 5-12 11z',
    'M25 44c0-18 12-28 25-28s25 10 25 28c-4-6-9-10-14-11-3 4-8 6-11 6s-8-2-11-6c-5 1-10 5-14 11z',
    'M27 42c2-16 11-24 23-24s21 8 23 24c-6-4-12-6-16-5-2 2-5 3-7 3s-5-1-7-3c-4-1-10 1-16 5z',
  ][cut];
  const mouth = { neutral: 'M41 72q9 4 18 0', confident: 'M40 70q10 9 20 0', hesitant: 'M42 73q8-3 16 0', mischief: 'M40 70q8 8 20-2', stern: 'M41 73h18', shock: 'M46 68a4 5 0 1 0 8 0a4 5 0 1 0-8 0', joy: 'M38 68q12 12 24 0z' }[mood];
  const brows = mood === 'stern' ? 'M36 52l10 3M64 52l-10 3' : mood === 'shock' ? 'M36 48q6-5 12 0M52 48q6-5 12 0' : mood === 'hesitant' ? 'M36 50q6 3 12 1M52 51q6-2 12 1' : brow ? 'M36 51q6-3 12 0M52 51q6-3 12 0' : 'M36 52h12M52 52h12';
  const eyes = mood === 'joy' ? 'M39 60q4-4 8 0M53 60q4-4 8 0' : mood === 'mischief' ? 'M39 60q4 2 8 0M53 60q4 2 8 0' : '';
  const eyeDots = mood === 'joy' || mood === 'mischief' ? '' : `<circle cx="43" cy="60" r="${mood === 'shock' ? 3.2 : 2.4}" fill="#15130F"/><circle cx="57" cy="60" r="${mood === 'shock' ? 3.2 : 2.4}" fill="#15130F"/><circle cx="44" cy="59" r=".8" fill="#fff"/><circle cx="58" cy="59" r=".8" fill="#fff"/>`;
  const collar = kind === 'player' ? `<path d="M22 100c4-14 14-20 28-20s24 6 28 20z" fill="${tint}"/><path d="M44 80l6 8 6-8" fill="none" stroke="${tint2}" stroke-width="2.5"/>` : `<path d="M22 100c4-14 14-20 28-20s24 6 28 20z" fill="#2C271F"/><path d="M50 82l-6 18h12z" fill="${tint}"/>`;
  return `<svg viewBox="0 0 100 100" role="img" aria-label="${esc(opts.label || '')}"><defs><radialGradient id="${uid}" cx="50%" cy="20%" r="80%"><stop offset="0" stop-color="${tint}" stop-opacity=".55"/><stop offset="1" stop-color="${tint}" stop-opacity=".12"/></radialGradient><clipPath id="${uid}c"><rect width="100" height="100" rx="18"/></clipPath></defs>`
    + `<g clip-path="url(#${uid}c)"><rect width="100" height="100" fill="#211D17"/><rect width="100" height="100" fill="url(#${uid})"/>`
    + `<circle cx="50" cy="44" r="36" fill="${tint}" opacity=".12"/>${collar}`
    + `<path d="M43 76h14v10c0 4-3 6-7 6s-7-2-7-6z" fill="${skin}"/>`
    + `<path d="${face}" fill="${skin}"/>`
    + (beard ? `<path d="M30 62c2 14 9 22 20 22s18-8 20-22c-5 8-11 12-20 12s-15-4-20-12z" fill="${hair}" opacity=".85"/>` : '')
    + `<path d="${hairs}" fill="${hair}"/>`
    + `<path d="${brows}" fill="none" stroke="${hair}" stroke-width="2.4" stroke-linecap="round"/>`
    + (eyes ? `<path d="${eyes}" fill="none" stroke="#15130F" stroke-width="2.2" stroke-linecap="round"/>` : eyeDots)
    + `<path d="M50 62v6l-3 2" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.6" stroke-linecap="round"/>`
    + `<path d="${mouth}" fill="${mood === 'joy' || mood === 'shock' ? '#7A2A1E' : 'none'}" stroke="#7A2A1E" stroke-width="2.2" stroke-linecap="round"/>`
    + `<path d="M12 98q38-20 76 0" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1"/></g></svg>`;
}

export interface PortraitProps { kind?: PortraitKind; id: string; size?: number; club?: WClub; mood?: Mood; name?: string; className?: string; style?: CSSProperties; round?: boolean; shape?: 'round' | 'square' | 'circle' }
// Callers that only know an id (HowTo, Settings, the press card, Morning Papers) get the kind inferred from it.
const KIND_OF: Record<string, PortraitKind> = { kitman: 'source', barber: 'source', agent: 'source', spotter: 'source', physio: 'source', leak: 'source', pressoffice: 'source', tabloid: 'rival', itk: 'rival', insider: 'rival', editor: 'staff', you: 'staff', mags: 'staff' };
export function Portrait({ kind: kindIn, id, size = 56, club, mood, name, className = '', style, round: roundIn, shape }: PortraitProps) {
  const kind: PortraitKind = kindIn || KIND_OF[id] || 'player';
  const round = roundIn ?? (shape === 'round' || shape === 'circle');
  const src = useArt(kind, id, mood);
  const label = name || '';
  const st: CSSProperties = { ['--pt' as string]: size + 'px', ...style };
  if (src) return <span className={'g-portrait is-art' + (round ? ' is-round' : '') + ' ' + className} style={st} data-kind={kind} data-id={id}><img src={src} alt={label} width={size} height={size} loading="lazy" decoding="async" /></span>;
  return <span className={'g-portrait' + (round ? ' is-round' : '') + ' ' + className} style={st} data-kind={kind} data-id={id} role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true}
    dangerouslySetInnerHTML={{ __html: portraitPlaceholderSVG(kind, id, { tint: club?.c1, tint2: club?.c2, mood, label }) }} />;
}
/** Which placeholder mood a source's read suggests (a hesitant Off, a confident Done): expression only, never a rule. */
export function moodFor(src: string, o: number): Mood {
  if (src === 'barber') return o === 3 ? 'mischief' : 'confident';
  if (src === 'agent') return o === 0 ? 'confident' : 'stern';
  if (o === 2 || o === 3) return 'hesitant';
  return 'confident';
}
