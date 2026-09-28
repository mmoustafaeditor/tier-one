import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Shared Semba Games design system (repo root design/), then The Gaffer's accent layer.
import '../../../../design/tokens.css';
import '../../../../design/components.css';
import './styles/fonts.css';
import './styles/gaffer.css';
import { App } from './App';
import { restoreFromShell } from './update';

// In the Android app, bring back the career the app kept, before the game looks for a save.
restoreFromShell();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
