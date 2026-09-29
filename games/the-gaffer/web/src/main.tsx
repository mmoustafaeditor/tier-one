import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Shared Semba Games design system (repo root design/), then The Gaffer's accent layer.
import '../../../../design/tokens.css';
import '../../../../design/components.css';
import './styles/fonts.css';
import './styles/gaffer.css';
import './boot/boot.css';
import { BOOT_MARKUP, playIntro } from './boot/intro';
import { App } from './App';
import { restoreFromShell } from './update';

// The Semba Studios intro, the same one Tier One plays. It only covers the page: the save loads underneath meanwhile.
const boot = document.getElementById('boot');
if (boot) { boot.innerHTML = BOOT_MARKUP; playIntro(); }

// In the Android app, bring back the career the app kept, before the game looks for a save.
restoreFromShell();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
