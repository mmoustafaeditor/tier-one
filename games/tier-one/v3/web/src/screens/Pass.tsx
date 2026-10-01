// The Pass is Lens › Season now (CONCEPT4.md §11: "the Pass as its own screen" is cut). The route `pass` stays for old
// links and the tray, and opens Lens on the Season track.
import type { Chrome } from '../App';
import { LensScreen } from './Lens';

export function PassScreen(chrome: Chrome) { return <LensScreen {...chrome} tab="season" />; }
