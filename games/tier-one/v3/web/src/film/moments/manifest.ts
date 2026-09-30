// The moment clips the 3D film lane renders. Each stem is served next to the page (film/clips.ts):
//   tier-one/films/<stem>-p.mp4   portrait 720×1280, H.264 (plays muted, so no audio track is needed)
//   tier-one/films/<stem>-l.mp4   landscape 1280×720
//   tier-one/films/<stem>-p.jpg / -l.jpg   poster: the clip's LAST frame (shown still under reduced motion)
// The player picks the aspect by the screen's shape and covers the screen with it (object-fit: cover). If a clip is
// missing or hasn't started within 600 ms, the game falls back to its frame-drawn version of the same moment.
//
// The clip can't know the player, so the game draws the words on top (film/moments/Overlay.tsx: a newsprint plate
// in the lower third from `overlayAt` seconds; keep that area calm). No dialogue, speech bubbles or subtitles: meaning
// comes from what people do. People are stylised; never a real footballer's likeness (club colours and a number).
// `seconds` is the clip length the game expects (it drives the overlay clock and a stall safety net).
export type Clip = { id: string; seconds: number; overlayAt: number; shows: string };

const TIERS = ['stringer', 'correspondent', 'chief', 'tierone'] as const;
const SOURCES = ['kitman', 'barber', 'agent', 'spotter', 'physio'] as const;

export const CLIPS: Clip[] = [
  { id: 'moment-paper', seconds: 3.2, overlayAt: 1.6, shows: 'Night press rolling tomorrow’s edition; at dawn a newsstand vendor slaps the paper down on the counter; push in on the blank front page (the game prints your headline and byline on it).' },
  { id: 'moment-paper-short', seconds: 1.6, overlayAt: 0.5, shows: 'Repeat plays: the vendor’s slap and the push in only.' },
  ...TIERS.map((t): Clip => ({
    id: 'moment-tier-' + t, seconds: t === 'tierone' ? 4 : 3.2, overlayAt: t === 'tierone' ? 2.2 : 1.8,
    shows: 'The editor waves you into the glass office and slides a new press pass across the desk; the pass fills the frame (the game prints your byline and the tier). ' + (t === 'tierone' ? 'Tier One: the whole newsroom stands, camera flashes, gold confetti.' : t === 'chief' ? 'Chief: a corner office door with a blank name plate.' : t === 'correspondent' ? 'Correspondent: the pass on a red lanyard, a desk of your own.' : 'Stringer: a cramped office, a temporary paper pass.'),
  })),
  ...SOURCES.map((s): Clip => ({
    id: 'moment-contact-' + s, seconds: 3, overlayAt: 1.6,
    shows: 'Your contact in their own place (' + ({ kitman: 'the boot room, shirts on the rail', barber: 'the barber shop, pole spinning, a player getting up from the chair', agent: 'the back of a car in the rain', spotter: 'the arrivals hall, a private jet landing outside', physio: 'the treatment room, a heart monitor' } as Record<string, string>)[s] + ') raises a coffee; your cup comes in from the edge of frame; the cups clink; their card turns gold.',
  })),
  { id: 'moment-scalp', seconds: 3.2, overlayAt: 2, shows: 'A rival reporter at their desk; behind them the TV shows your post going viral; they slam the laptop shut and tear up their own printed post.' },
  { id: 'moment-trophy', seconds: 3.6, overlayAt: 2.2, shows: 'As moment-scalp, bigger: the rival drops the torn pieces in the bin; gold confetti.' },
  { id: 'moment-deadline', seconds: 3.4, overlayAt: 2.4, shows: 'The clock tower strikes 23:00; a car with blacked-out windows pulls into the training ground; three phones on a desk light up and buzz.' },
  { id: 'moment-deadline-short', seconds: 1.5, overlayAt: 0.4, shows: 'Repeat plays: the phones lighting up only.' },
  { id: 'moment-official', seconds: 3.4, overlayAt: 1.8, shows: 'A TV on the desk cuts to breaking news: a generic player, back to camera, holds up a club shirt to the camera flashes; a red band across the bottom (the game writes OFFICIAL, the player and your name).' },
];
export const clipOf = (id: string) => CLIPS.find((c) => c.id === id);
