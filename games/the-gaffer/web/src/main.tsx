import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The Gaffer v2 look (games/the-gaffer/v2/look): tokens, components, the mocked screens, then the app layer.
import './styles/look/fonts.css';
import './styles/look/tokens.css';
import './styles/look/components.css';
import './styles/screens.css';
import './styles/app.css';
import './styles/tactics.css';
import './styles/dressing.css';
import './styles/cinematic.css';
import './styles/boot-fonts.css';
import './boot/boot.css';
import { BOOT_MARKUP, playIntro } from './boot/intro';
import { App } from './App';
import { restoreFromShell } from './update';
import { setupPwa } from './pwa';

// The Semba Studios intro, the same one Tier One plays. It only covers the page: the save loads underneath meanwhile.
const boot = document.getElementById('boot');
if (boot) { boot.innerHTML = BOOT_MARKUP; playIntro(); }

// In the Android app, bring back the career the app kept, before the game looks for a save.
restoreFromShell();

// Installable on the website (desktop and phone browsers), with updates straight from the site.
setupPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
