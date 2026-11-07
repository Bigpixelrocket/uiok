/**
 * Hash routing: the page is the part of the URL after `#`, so the site works
 * from GitHub Pages' project path and from any static server without a
 * rewrite to index.html.
 */

import { useSyncExternalStore } from 'react';

function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

/** The route shown: the hash without its `#`, `/` for none. */
function currentRoute(): string {
  const route = window.location.hash.replace(/^#/, '');
  return route === '' ? '/' : route;
}

/** The route shown, following every change of the hash. */
export function useRoute(): string {
  return useSyncExternalStore(subscribe, currentRoute);
}

/** Opens a route. */
export function go(route: string): void {
  window.location.hash = route;
}
