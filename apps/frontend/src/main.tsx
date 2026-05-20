import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './Infrastructure/i18n.js';
import App from './Presentation/App.js';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
