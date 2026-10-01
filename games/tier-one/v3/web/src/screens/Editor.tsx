// { n: 'editor' } (3.x "the editor's desk"). 4.1 has no editor's desk: the route is an alias of Career (screens/Story.tsx),
// so old links land on the Career menu (Continue / New career).
import type { Chrome } from '../App';
import { StoryScreen } from './Story';

export function EditorDeskScreen(chrome: Chrome) {
  return <StoryScreen {...chrome} />;
}
