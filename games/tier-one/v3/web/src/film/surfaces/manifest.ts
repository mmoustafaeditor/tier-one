// The surface films (GOTY.md §9): ambient loops behind the live UI and the interactive beats the player triggers.
// This is the list the 3D studio lane renders against; the game reads it too (ui/film.tsx, lib/filmgate.ts).
//
// FORMAT  As the moment clips (film/clips.ts): `films/<stem>-p.mp4` (portrait 720×1280) and `films/<stem>-l.mp4`
//         (landscape 1280×720), H.264, no audio; each with a `.jpg` poster on the same stem. Loops: ≤ 400 KB each,
//         4–6 s, SEAMLESS (last frame cuts to first with no pop: bake the loop, don't fade it), 24 fps is fine.
//         Beats: ≤ 120 KB, exact lengths below, the first frame is the resting state so the cut in is invisible.
// POSTER  A loop's poster is its REST FRAME (frame 0, which is also its last frame), not a random frame: the game shows
//         the poster first and the video takes over on top of it, so the two must match. A beat's poster is its last frame.
// LOOK    Same set, lighting and grade as the moment and call films (calls/manifest.ts), so the cuts are invisible.
//         Keep the middle ~70% of the frame calm and dark enough for white text: loops sit BEHIND cards and copy
//         (the game also dims them). No faces, no real likenesses, no words in the picture.
// MATCH CUTS  Each loop's `endsOn` names the frame it rests on. That frame is the first frame of the film that follows
//         it (loop-place-<src> → call-<src>-*; loop-home-desk → post-*; loop-results-pressroom → moment-paper), and the
//         game can hand a film the loop's current frame with lastFrameOf(stem) (ui/film.tsx) to cover any drift.

export type Aspect = 'p' | 'l';
export type Loop = { id: string; kind: 'loop'; seconds: number; shows: string; endsOn: string; where: string };
export type Beat = { id: string; kind: 'beat'; seconds: number; shows: string; where: string; hold?: boolean; coverAt?: number };
export type SurfaceFilm = Loop | Beat;

export const SRCS = ['kitman', 'barber', 'agent', 'spotter', 'physio', 'leak'] as const;
export const OUTCOMES = ['done', 'hijack', 'off', 'fake'] as const;
export const SEASONS = ['rumour', 'winter', 'spring', 'summer'] as const;
export const TONES = ['morning', 'night'] as const;

const PLACE: Record<(typeof SRCS)[number], string> = {
  kitman: 'The boot room: shirts on the rail, a kit bag half packed, a strip light buzzing. A phone on the bench face up.',
  barber: 'The barber shop after hours: the pole turning, one chair under a lamp, a phone on the counter by the clippers.',
  agent: 'The back of a car in the rain at night: wipers, city lights sliding across the window, a phone lit on the seat.',
  spotter: 'The arrivals hall at dusk from the mezzanine: the board flipping, a jet taxiing outside, a phone on the rail.',
  physio: 'The treatment room: a bed, a heart monitor tracing quietly, a kit bag, a phone on the trolley.',
  leak: 'The press office: dark, one desk lamp, a fax machine idling, a phone on the desk next to a club-crested folder.',
};

export const LOOPS: Loop[] = [
  ...TONES.map((t): Loop => ({
    id: 'loop-home-desk-' + t, kind: 'loop', seconds: 6, where: 'Home, behind the whole page (HomeFilm; the 3D desk replaces it on capable desktops)',
    shows: t === 'morning'
      ? 'Your desk from above at a 50° tilt: morning light through a blind, papers stir in a draught, steam off the coffee, the phone screen dark.'
      : 'The same desk at night: the lamp makes a warm pool on the papers, the city out of focus in the window, the phone screen glows and dims once.',
    endsOn: 'The rest frame: lamp (or window light) steady, papers flat, the phone dark. post-*-p/l start on this desk.',
  })),
  ...SRCS.map((s): Loop => ({
    id: 'loop-place-' + s, kind: 'loop', seconds: 5, where: 'The window screen, behind the saga file while that source is on the line (WindowFilm)',
    shows: PLACE[s] + ' Idle: nothing happens except breathing motion (light, steam, the pole, the wipers).',
    endsOn: 'The phone on the surface, unlit, the same framing as frame 0 of call-' + s + '-*-full; beat-pickup-' + s + ' starts here.',
  })),
  { id: 'loop-pressbox', kind: 'loop', seconds: 6, where: 'Friends / the press box (PressboxFilm)', shows: 'A stadium press box at night before kick-off: rows of empty seats and laptops, floodlights beyond the glass, a ticker on a monitor.', endsOn: 'Floodlights full, laptops lit, the ticker mid-scroll.' },
  { id: 'loop-wire-room', kind: 'loop', seconds: 6, where: 'The Wire, behind the hero (WireFilm)', shows: 'A newsroom wall of TVs: six screens with abstract tickers and club colours, one cuts to BREAKING, a silhouette walks past.', endsOn: 'All six screens on their idle ticker, nobody in frame.' },
  { id: 'loop-deadline-city', kind: 'loop', seconds: 6, where: 'Deadline Day, behind the board (WindowFilm when it is day 7)', shows: 'The city at dusk from a high window: traffic trails, windows lighting up one by one, three phones on the sill light up in turn.', endsOn: 'All three phones lit, the city fully dark. moment-deadline-short starts on this sill.' },
  ...SEASONS.map((s): Loop => ({
    id: 'loop-season-' + s, kind: 'loop', seconds: 6, where: 'The Pass, behind the track (SeasonFilm)',
    shows: ({ rumour: 'The Rumour Mill: an autumn training ground at dawn, mist over the pitch, a groundsman’s mower far off, leaves on the running track.', winter: 'The Winter Window: the same ground under snow at night, floodlights on, a car with its lights on at the gate.', spring: 'Spring Whispers: the ground in flat spring light, rain drying on the seats, a kit van reversing in.', summer: 'The Summer Window: the ground in hard summer sun, sprinklers arcing, a private jet drawing a line overhead.' } as Record<string, string>)[s],
    endsOn: 'The wide shot at rest (mower / car / van / jet just out of frame).',
  })),
  { id: 'loop-results-pressroom', kind: 'loop', seconds: 5, where: 'Results, behind the front page (ResultsFilm)', shows: 'The press hall idling after the run: rollers turning slowly, a stack of tomorrow’s edition on the pallet, one strip light flickering.', endsOn: 'Rollers at speed, the pallet full. moment-paper starts in this hall.' },
  { id: 'loop-newsroom-masthead', kind: 'loop', seconds: 6, where: 'The Newsroom (clan) screen, behind the masthead (MastheadFilm)', shows: 'A newspaper building at night, the masthead sign lit on the façade (blank plate: the game prints the name), traffic below, a window light blinking.', endsOn: 'Sign fully lit, the blank plate centred in the upper third.' },
  { id: 'loop-dd-clock', kind: 'loop', seconds: 4, where: 'Deadline Day, behind the countdown (DDHead)', shows: 'A newsroom wall clock in close-up, the red second hand sweeping, the numerals dark; a red light on the wall pulses once per loop.', endsOn: 'The second hand at 12 (the loop is one sweep of 4 s: 15 s of clock time compressed, or a 4 s real sweep at 12→3).' },
];

export const BEATS: Beat[] = [
  ...SRCS.map((s): Beat => ({
    id: 'beat-pickup-' + s, kind: 'beat', seconds: 0.6, where: 'Tapping a source card on the file (Window.tsx ask); the call film follows',
    shows: 'From loop-place-' + s + '’s rest frame: the phone lights up and a hand lifts it off the surface towards camera; ends with the screen filling the frame (dark glass).',
  })),
  { id: 'beat-press-warm', kind: 'beat', seconds: 2, hold: true, where: 'Hold to publish (Saga.tsx HoldPublish): loops while the thumb is down, cut on release', shows: 'The press from the pressroom loop close up: rollers start turning and pick up speed, the ink light comes on, plates shimmer; loops seamlessly at full speed.' },
  { id: 'beat-shred', kind: 'beat', seconds: 1, where: 'Delete & repost (ui/PostScene.tsx, the prelude)', shows: 'A printed post card fed into a desk shredder from above; strips fall; ends on the empty slot.' },
  ...OUTCOMES.map((o): Beat => ({
    id: 'beat-stamp-' + o, kind: 'beat', seconds: 0.5, where: 'A filed call (Saga.tsx player card and the board card), under the CSS stamp slam',
    shows: 'A rubber stamp comes down on paper at an angle and lifts, in the outcome’s ink (' + ({ done: 'green', hijack: 'amber', off: 'blue-grey', fake: 'red' } as Record<string, string>)[o] + '); the impression is a plain block (the game draws the word on top). Ends on the stamped paper.',
  })),
  { id: 'beat-page-fwd', kind: 'beat', seconds: 0.3, coverAt: 0.15, where: 'Page changes forward along the tabs (App.tsx go); the route swaps while the sheet covers the frame', shows: 'A sheet of newsprint sweeps across the frame from right to left; at 0.15 s it fully covers the frame (this is where the page swaps); it clears to the left by the end.' },
  { id: 'beat-page-back', kind: 'beat', seconds: 0.3, coverAt: 0.15, where: 'Page changes back (mirrored for RTL by the game)', shows: 'The same sheet from left to right, fully covering the frame at 0.15 s.' },
];

export const SURFACES: SurfaceFilm[] = [...LOOPS, ...BEATS];
const BY_ID = new Map<string, SurfaceFilm>(SURFACES.map((f) => [f.id, f]));
export const surfaceOf = (id: string) => BY_ID.get(id);
export const isLoop = (id: string) => BY_ID.get(id)?.kind === 'loop';

/** Every file the studio renders: 2 aspects × (LOOPS + BEATS), each with its .jpg poster. */
export const FILES: string[] = SURFACES.flatMap((f) => (['p', 'l'] as const).flatMap((a) => [`${f.id}-${a}.mp4`, `${f.id}-${a}.jpg`]));

// ---------- the stems the game asks for
export const homeLoop = (tone: (typeof TONES)[number]) => 'loop-home-desk-' + tone;
export const placeLoop = (src: string) => ((SRCS as readonly string[]).includes(src) ? 'loop-place-' + src : 'loop-place-leak');
export const seasonLoop = (key: string) => ((SEASONS as readonly string[]).includes(key) ? 'loop-season-' + key : 'loop-season-rumour');
export const pickupBeat = (src: string) => ((SRCS as readonly string[]).includes(src) ? 'beat-pickup-' + src : 'beat-pickup-leak');
export const stampBeat = (outcome: string) => ((OUTCOMES as readonly string[]).includes(outcome) ? 'beat-stamp-' + outcome : 'beat-stamp-fake');
/** Morning or night by the local clock: the lamp comes on at 19:00 and goes off at 07:00. */
export const toneNow = (d = new Date()): (typeof TONES)[number] => (d.getHours() >= 19 || d.getHours() < 7 ? 'night' : 'morning');
