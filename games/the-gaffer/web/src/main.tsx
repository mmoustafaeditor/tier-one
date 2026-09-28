import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Shared Semba Games design system (repo root design/), then The Gaffer's accent layer.
import '../../../../design/tokens.css';
import '../../../../design/components.css';
import './styles/fonts.css';
import './styles/gaffer.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
