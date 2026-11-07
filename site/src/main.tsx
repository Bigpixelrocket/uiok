/** The site's entry: the library's stylesheet, then the site's own, then the shell. */

import '@bigpixelrocket/uiok/styles.css';
import './site.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { applySavedTheme } from './theme';

applySavedTheme();

const root = document.getElementById('root');
if (root === null) throw new Error('index.html has no #root.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
