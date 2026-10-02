// Character art slots (brief Addendum A). No image generation here: every face is a slot keyed by a stable id, drawn
// as a consistent illustrated placeholder until the owner's approved anime art lands in public/art/manifest.json.
//
//   <Portrait id="src:kitman" size={48} />            a source (kitman · barber · agent · spotter · physio · leak)
//   <Portrait id="rival:itk" size={40} shape="round" />  a rival account (tabloid · itk · insider)
//   <Portrait id="editor:mags" />                      an editor (mags · hana · desk)
//   <Portrait id="me" name={nick} />                   the player (initials; never a face until they pick one)
//   <Portrait id={'player:' + playerId} name={p.n} club={club} />   a real player: the art is separate from the live
//                                                      club/status text, which the caller renders beside it
//   <Portrait id=… mood="hesitant|confident|mischief|plain" />  a hint only; never carries a rule
//
// manifest.json: { "v": 1, "art": { "<id>": { "src": "art/kitman.png", "alt": "…", "moods": { "confident": "art/kitman-c.png" } } } }
// Names, clubs and statuses are always live text next to the slot, never inside the image (Addendum A, B).
import { useEffect, useState, type CSSProperties } from 'react';
import type { WClub } from '../lib/engine';
import { initialsOf } from './screenbits';

export type Mood = 'plain' | 'hesitant' | 'confident' | 'mischief';
interface Art { src: string; alt?: string; moods?: Partial<Record<Mood, string>> }
interface Manifest { v: number; art: Record<string, Art> }

let manifest: Manifest | null = null, loading: Promise<void> | null = null;
const subs = new Set<() => void>();
function load() {
  if (manifest || loading) return loading || Promise.resolve();
  loading = fetch('art/manifest.json', { cache: 'force-cache' }).then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null)).then((m) => { manifest = m && m.art ? m : { v: 1, art: {} }; subs.forEach((f) => f()); }).catch(() => { manifest = { v: 1, art: {} }; });
  return loading;
}
/** The art file for an id (and mood), or null while the manifest hasn't arrived or has no art for it. */
export function portraitSrc(id: string, mood: Mood = 'plain'): string | null {
  const a = manifest?.art[id];
  if (!a) return null;
  return (mood !== 'plain' && a.moods && a.moods[mood]) || a.src;
}
export function usePortraits(): Manifest | null {
  const [, tick] = useState(0);
  useEffect(() => { void load(); const f = () => tick((x) => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return manifest;
}

// ---------- the placeholder: a consistent illustrated bust per id (hair, skin, collar from the id; a tell per cast role)
const hash = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
const SKIN = ['#F1C9A5', '#E0A982', '#C98B5F', '#A66A42', '#7E4B2B', '#5A341C'];
const HAIR = ['#1B1612', '#3B2A1E', '#6B4A2B', '#A3772F', '#2B2B2B', '#8C8C8C', '#C7B9A6'];
const COLLAR: Record<string, string> = { src: '#15130F', rival: '#D2381B', editor: '#2E2A26', me: '#D2381B', player: '#15130F' };
const TELL: Record<string, string> = {
  'src:kitman': 'M20 46h24v4H20z', // a kit bag strap
  'src:barber': 'M18 10l6 8M30 10l-6 8', // scissors glint
  'src:agent': 'M14 34l6-6 6 6M38 34l6-6 6 6', // sunglasses arms
  'src:spotter': 'M8 12l10 4M46 8l-6 6', // binocular lines
  'src:physio': 'M26 10h12v3H26z', // a cap band
  'src:leak': 'M20 50h24', // a lanyard
  'editor:mags': 'M18 22h28', 'editor:hana': 'M20 22h24',
};
export function placeholderSVG(id: string, name = '', mood: Mood = 'plain', club?: WClub): string {
  const h = hash(id);
  const role = id.split(':')[0];
  const skin = SKIN[h % SKIN.length], hair = HAIR[(h >> 4) % HAIR.length], collar = club?.c1 || COLLAR[role] || '#15130F';
  const bg = club?.c2 && club.c2 !== club.c1 ? club.c2 : '#E8E2D5';
  const brow = mood === 'hesitant' ? 'M22 25l6 2M42 25l-6 2' : mood === 'confident' ? 'M22 27l6-2M42 27l-6-2' : mood === 'mischief' ? 'M22 26l6-1M42 28l-6-2' : 'M22 26h6M36 26h6';
  const mouth = mood === 'hesitant' ? 'M27 42q5-2 10 0' : mood === 'confident' ? 'M26 40q6 5 12 0' : mood === 'mischief' ? 'M27 41q6 4 11-1' : 'M27 41h10';
  const hairShape = (h >> 8) % 3 === 0 ? 'M18 24c0-10 6-15 14-15s14 5 14 15c-2-5-6-7-14-7s-12 2-14 7z' : (h >> 8) % 3 === 1 ? 'M17 26c0-12 7-18 15-18s15 6 15 18c-3-6-8-9-15-9s-12 3-15 9z' : 'M19 22c1-8 6-12 13-12s12 4 13 12c-3-4-7-6-13-6s-10 2-13 6z';
  const initials = role === 'me' || role === 'player' ? initialsOf(name || '?') : '';
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
<rect width="64" height="64" rx="12" fill="${bg}"/>
<path d="M8 64c0-13 10-20 24-20s24 7 24 20z" fill="${collar}"/>
<path d="M22 44h20v6c0 3-5 5-10 5s-10-2-10-5z" fill="${skin}"/>
<ellipse cx="32" cy="30" rx="13" ry="15" fill="${skin}"/>
<path d="${hairShape}" fill="${hair}"/>
<path d="${brow}" stroke="${hair}" stroke-width="2" stroke-linecap="round" fill="none"/>
<circle cx="26.5" cy="31.5" r="1.6" fill="#15130F"/><circle cx="37.5" cy="31.5" r="1.6" fill="#15130F"/>
<path d="${mouth}" stroke="#7A4A3A" stroke-width="1.8" stroke-linecap="round" fill="none"/>
${TELL[id] ? `<path d="${TELL[id]}" stroke="#15130F" stroke-width="2" stroke-linecap="round" fill="none" opacity=".55"/>` : ''}
${initials ? `<text x="32" y="59" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="11" fill="#F2EEE5">${initials.replace(/[<&]/g, '')}</text>` : ''}
</svg>`;
}

export function Portrait({ id, name = '', club, size = 48, shape = 'card', mood = 'plain', className = '', style, alt }: { id: string; name?: string; club?: WClub; size?: number; shape?: 'card' | 'round'; mood?: Mood; className?: string; style?: CSSProperties; alt?: string }) {
  usePortraits();
  const src = portraitSrc(id, mood);
  const cls = ['pt', 'pt--' + shape, 'pt--' + id.split(':')[0], className].filter(Boolean).join(' ');
  const st = { ['--pt' as string]: size + 'px', ...style };
  if (src) return <span className={cls + ' is-art'} style={st}><img src={src} alt={alt || ''} loading="lazy" decoding="async" /></span>;
  return <span className={cls} style={st} aria-hidden={alt ? undefined : 'true'} role={alt ? 'img' : undefined} aria-label={alt} dangerouslySetInnerHTML={{ __html: placeholderSVG(id, name, mood, club) }} />;
}
