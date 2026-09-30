// The Story mode clips ("The Comeback", games/tier-one/v3/STORY.html) the film lane renders. Same slots as the moment
// clips (film/clips.ts): tier-one/films/story-<id>-p.mp4 (720×1280) and -l.mp4 (1280×720), H.264, muted, each with a
// .jpg poster of its LAST frame. If a clip is missing or slow, the game plays its drawn title card (scenes/StoryCard).
// No dialogue, speech bubbles or subtitles: characters act, the game prints the chapter plate on top from `overlayAt`
// (keep the lower third calm). You (the reporter) are never shown speaking. People are stylised, never real likenesses.
import type { Clip } from '../moments/manifest';

export const STORY_CLIPS: Clip[] = [
  { id: 'story-prologue', seconds: 9, overlayAt: 7, shows: 'The fall. Deadline Day, 23:58, the Chronicle newsroom. Vince Marlow (sunglasses at night) rings; the reporter hits publish on HERE WE GO. 00:03: a TV shows the player signing somewhere else. Breakfast: phones full of memes, a follower counter dropping. Mags Doyle slides an empty box across the desk without a word. The bus home; a phone lights up: Unknown number, “Nothing personal.”' },
  { id: 'story-ch1-open', seconds: 4, overlayAt: 2.2, shows: 'The box on the kitchen table of a rented flat; a laptop opens on a blank free blog; the reporter types a name for it.' },
  { id: 'story-ch1-reveal', seconds: 4, overlayAt: 2.4, shows: 'A café. Rosa Lindqvist (agent, Vince’s rival) slides a coffee across the table; one look says it all. A napkin with writing on it.' },
  { id: 'story-ch2-open', seconds: 4, overlayAt: 2.2, shows: 'The Evening Post: a small desk by the window, a nameplate taped on. Hana Okafor sets a mug down and walks off.' },
  { id: 'story-ch2-reveal', seconds: 4, overlayAt: 2.4, shows: 'Two phones side by side: @ITK_Kev’s post lands a day before the reporter’s. The timestamps: 23:57 against 23:58.' },
  { id: 'story-ch3-open', seconds: 4, overlayAt: 2.2, shows: 'A national sports editor waves the reporter into a big open-plan newsroom; screens full of football.' },
  { id: 'story-ch3-reveal', seconds: 4.4, overlayAt: 2.6, shows: 'Terminal Tony’s screen at the airport: a long-lens photo develops. Vince Marlow shaking hands with Carl Stubbs of the Daily Roar at arrivals. The photo is pinned to an evidence wall.' },
  { id: 'story-ch4-open', seconds: 4, overlayAt: 2.2, shows: 'The Daily Roar office: Carl Stubbs laughs at a TV replaying the reporter’s old HERE WE GO post.' },
  { id: 'story-ch4-reveal', seconds: 4.4, overlayAt: 2.6, shows: 'Priya (the Chronicle intern) pushes a USB stick across a café table. Behind her, her phone shows the @ITK_Kev account.' },
  { id: 'story-ch5-open', seconds: 4, overlayAt: 2.2, shows: 'The lift doors open onto the old Chronicle newsroom: the same desk, the same chair. Mags Doyle nods once.' },
  { id: 'story-finale', seconds: 6, overlayAt: 4, shows: 'Deadline Day again; the clock hits 23:58. Vince rings with the same pitch. The reporter’s sources act instead: Sal books next month’s haircut, Tony shows an empty runway, Dr Inès puts the medical file back unopened. The reporter publishes; the presses roll.' },
  { id: 'story-epilogue', seconds: 6, overlayAt: 3.4, shows: 'The front page, framed, on Mags’s wall. Last shot: Vince’s phone lights up. Unknown number: “Nothing personal.”' },
];
export const storyClipOf = (id: string) => STORY_CLIPS.find((c) => c.id === id);
