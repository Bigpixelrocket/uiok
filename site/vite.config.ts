/**
 * Builds the documentation site (site/dist) from the library's source, not
 * its published build, so the site always documents the code on main. The
 * aliases mirror the package's `exports`: `@bigpixelrocket/uiok`,
 * `@bigpixelrocket/uiok/styles.css`, and `@bigpixelrocket/uiok/<area>`.
 *
 * `base: './'` keeps every asset URL relative, so the same build serves from
 * GitHub Pages' project path (/uiok/) and from `vite preview`; pages are
 * hash routes, so no server rewrite is needed.
 *
 * `renderedDocs` renders each markdown doc under docs/ to HTML at build time
 * for `?doc` imports, so no markdown parser ships to the browser.
 */

import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { renderedDocs } from './render-docs.ts';

const site = fileURLToPath(new URL('.', import.meta.url));
const repo = fileURLToPath(new URL('..', import.meta.url));
const source = fileURLToPath(new URL('../src/', import.meta.url));

export default defineConfig({
  root: site,
  base: './',
  plugins: [renderedDocs(repo), react()],
  resolve: {
    alias: [
      { find: /^@bigpixelrocket\/uiok\/styles\.css$/, replacement: `${source}styles.css` },
      { find: /^@bigpixelrocket\/uiok\/([a-z]+)$/, replacement: `${source}$1/index.ts` },
      { find: /^@bigpixelrocket\/uiok$/, replacement: `${source}index.ts` }
    ]
  },
  // The site reads ../src and ../docs.
  server: { fs: { allow: [repo] } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Public artifacts carry no source maps; verify-dist.mjs fails the build if one appears.
    sourcemap: false,
    // One bundle is right for a docs site; the library and React make it larger than Vite's default warning size.
    chunkSizeWarningLimit: 1024
  }
});
