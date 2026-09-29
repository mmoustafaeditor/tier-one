import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The look (games/tier-one/v3/look): tokens, components and the bundled OFL fonts, then the app layer.
import '../../look/tokens.css';
import '../../look/components.css';
import './styles/app.css';
import './styles/game.css';
import './styles/home.css';
import './styles/play.css';
// The Semba Studios intro, shared with The Gaffer (one copy, in its source).
import '../../../../the-gaffer/web/src/boot/boot.css';
import { BOOT_MARKUP, playIntro } from '../../../../the-gaffer/web/src/boot/intro';
import { App } from './App';

const boot = document.getElementById('boot');
if (boot) { boot.innerHTML = BOOT_MARKUP; playIntro(); }

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
