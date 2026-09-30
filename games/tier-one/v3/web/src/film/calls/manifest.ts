// The film clips the game looks for (3.3): rendered video, served next to the game page, never inlined in the bundle.
// This file is the list the video team renders against. The SVG films in this folder are only the fallback.
//
// FORMAT  MP4, H.264, no audio track needed (clips always play muted; the game adds its own sound). Each clip comes in
//         two aspects: `-p` portrait 720×1280 and `-l` landscape 1280×720, shown full-bleed with object-fit: cover
//         (keep the action in the middle ~70% so phones and ultrawide screens both keep it). Each .mp4 has a .jpg
//         poster of its LAST frame with the same stem (shown under reduced motion, and while nothing else loads).
// WHERE   `films/<stem>.mp4` + `films/<stem>.jpg`, relative to the game page (https://www.sembagames.app/tier-one/).
//         The Android app loads the page from a file URL, so there it resolves against the live site.
//
// SOURCE CALLS  call-<src>-<outcome>-<cut>-<p|l>
//   src      kitman · barber · agent · spotter · physio · leak (the press office)
//   outcome  what the source's read points to (the best of E.weights): done · hijack · off · fake. Nobody speaks; the
//            action carries it. Done: the buying club's colours are taken on (scarf, bag tag, medical form ticked,
//            contract signed). Hijack: a third club's colours replace them. Off: the buying club's thing is torn up /
//            taken off, the player's own club stays. Fake: the rumour (a paper with the buying club's crest) is
//            screwed up and binned, a shrug. Clubs are generic (colours only); no real footballers' likenesses.
//   cut      full ≈ 3–4 s (first call to that source in a session: setup + tell), short ≈ 1.5–2 s (repeat: the tell).
// POST GOING OUT  post-<kind>-<p|l>, ≤ 3 s (plays after every publish; must stay snappy)
//   kind     talks · advanced · confirmed (by loudness) · hwg (HERE WE GO: gold, floodlights, confetti) · repost
//            (Delete & repost). The game lays the real post card over the middle of the frame (it types, stamps, the
//            counters tick) and moves it to the top ~30% after it's sent, with fan replies near the bottom: keep the
//            centre calm and let the story play at the edges (desk and laptop glow → fans' phones lighting up).
import { OUTS } from '../../lib/engine';

export const CALL_SRCS = ['kitman', 'barber', 'agent', 'spotter', 'physio', 'leak'] as const;
export const CUTS = ['full', 'short'] as const;
export const POST_KINDS = ['talks', 'advanced', 'confirmed', 'hwg', 'repost'] as const;
export const ASPECTS = ['p', 'l'] as const;
export type Aspect = (typeof ASPECTS)[number];
export type PostKind = (typeof POST_KINDS)[number];

export const callStem = (src: string, o: number, cut: 'full' | 'short', a: Aspect) => `call-${src}-${OUTS[o] || 'fake'}-${cut}-${a}`;
export const postStem = (kind: PostKind, a: Aspect) => `post-${kind}-${a}`;
/** Every clip stem the game can ask for (2 aspects × (6 sources × 4 outcomes × 2 cuts + 5 post kinds) = 106). */
export const CLIPS: string[] = ASPECTS.flatMap((a) => [
  ...CALL_SRCS.flatMap((s) => OUTS.flatMap((_, o) => CUTS.map((c) => callStem(s, o, c, a)))),
  ...POST_KINDS.map((k) => postStem(k, a)),
]);

/** Where clips live: next to the page, or the live site when the page runs from a file URL (Android). */
export function filmsBase(): string {
  if (typeof location === 'undefined') return 'films/';
  if (location.protocol === 'file:' || location.hostname === 'appassets.androidplatform.net') return 'https://www.sembagames.app/tier-one/films/';
  return new URL('films/', location.href).href;
}
export const clipUrl = (stem: string) => filmsBase() + stem + '.mp4';
export const posterUrl = (stem: string) => filmsBase() + stem + '.jpg';
/** Portrait clips when the viewport is taller than wide. */
export const aspectNow = (): Aspect => (typeof innerHeight !== 'undefined' && innerHeight > innerWidth ? 'p' : 'l');
