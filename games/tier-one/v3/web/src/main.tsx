import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The look (games/tier-one/v3/look): tokens, components and the bundled OFL fonts, then the app layer.
import '../../look/tokens.css';
import '../../look/components.css';
import './styles/app.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
