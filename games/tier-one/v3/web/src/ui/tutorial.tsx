// The first window's teaching layer (CONCEPT4.md §12). Owned by the onboarding lane; this is the minimal stub the play
// lane mounts so Blurt compiles before that lane lands. Blurt renders <TutorialLayer driver story/> when the driver's
// mode is 'tutorial'. Targets on screen carry data-tut: "story-<i>", "dm-<src>", "post", "how-<o>", "loud-<s>",
// "publish", "end-day".
import type { Driver4 } from '../lib/driver';

export function TutorialLayer(_: { driver: Driver4; story: number | null }) { return null; }
