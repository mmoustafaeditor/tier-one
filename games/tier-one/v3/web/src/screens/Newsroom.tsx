// Newsrooms / crews are cut in 4.1 (UI41 §Multiplayer = Rooms only). The route ({ n: 'newsroom' }, ?newsroom=CODE) stays
// so old invite links land somewhere polite: "This link has expired", with a way to Rooms. Server handlers are untouched.
import { Expired } from './Rooms';
import type { Chrome } from '../App';

export function NewsroomScreen({ code: _code, ...chrome }: Chrome & { code?: string }) {
  return <Expired chrome={chrome} />;
}
