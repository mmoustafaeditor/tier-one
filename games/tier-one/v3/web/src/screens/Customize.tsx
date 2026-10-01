// "Your desk" is Lens › Looks now, the ONE shop (CONCEPT4.md §5). The route `customize` stays for old links and opens
// Lens on Looks. The pieces it used (previews, tiles, the packs and gift sheets) live on in ui/customize.tsx.
import type { Chrome } from '../App';
import { LensScreen } from './Lens';

export function CustomizeScreen(chrome: Chrome) { return <LensScreen {...chrome} tab="looks" />; }
