import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The look (games/tier-one/v3/look): tokens, components and the bundled OFL fonts, then the app layer.
import '../../look/tokens.css';
import '../../look/components.css';
import './styles/app.css';
import './styles/game.css';
import './styles/home.css';
import './styles/play.css';
import './styles/story.css';
import './styles/screens.css';
// The Semba Studios intro, shared with The Gaffer (one copy, in its source).
import '../../../../the-gaffer/web/src/boot/boot.css';
import { BOOT_MARKUP, playIntro } from '../../../../the-gaffer/web/src/boot/intro';
import { App } from './App';

// The sting plays once per browser session, and never on an invite or deep link (?room= / ?tab=) once this browser has
// seen it: a friend's room link opens the room, not an 8-second logo. Gated here, so The Gaffer's intro is unchanged.
const boot = document.getElementById('boot');
if (boot) {
  const has = (st: () => Storage, k: string) => { try { return st().getItem(k) === '1'; } catch { return false; } };
  const set = (st: () => Storage, k: string) => { try { st().setItem(k, '1'); } catch { /* private mode: plays as before */ } };
  const q = new URLSearchParams(location.search);
  const deep = q.has('room') || q.has('tab');
  if (has(() => sessionStorage, 't1.boot') || (deep && has(() => localStorage, 't1.boot.ever'))) {
    boot.remove(); (window as unknown as { __bootDone?: boolean }).__bootDone = true;
  } else {
    set(() => sessionStorage, 't1.boot'); set(() => localStorage, 't1.boot.ever');
    boot.innerHTML = BOOT_MARKUP; playIntro();
  }
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
