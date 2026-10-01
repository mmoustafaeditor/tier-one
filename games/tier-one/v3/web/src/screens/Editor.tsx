// { n: 'editor' } (3.x "the editor's desk"). 4.0 has no editor's desk (CONCEPT4 §3, §11): the route is an alias of the
// Story app (ui/phone.tsx aliases), so old links, tray items and feed lines land in the Story thread.
import type { Chrome } from '../App';
import { StoryScreen } from './Story';

export function EditorDeskScreen(chrome: Chrome) {
  return <StoryScreen {...chrome} />;
}
