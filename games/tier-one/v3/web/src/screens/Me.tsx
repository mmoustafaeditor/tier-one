// Me is Lens now (CONCEPT4.md §2: "Lens: your profile … Replaces Me, Customize, Pass, collection"). The route `me`
// stays (the app registry and old links point at it) and opens Lens on the tab last viewed (Profile the first time).
import type { Chrome } from '../App';
import { LensScreen } from './Lens';

export function MeScreen(chrome: Chrome) { return <LensScreen {...chrome} />; }
