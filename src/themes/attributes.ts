/**
 * The themes a page wears, as attributes on its root element
 * (`data-light-theme`, `data-dark-theme`), and the one watch every reader of
 * the colour tokens in script shares. The stylesheet's block for a theme
 * takes over while its id is set, so CSS follows a change on its own; code
 * that reads a token's value in script (a canvas, a chart) reads it again
 * when `subscribeThemeChange` calls.
 *
 * Set the attributes before the first paint where you can (a server-rendered
 * root, an inline script, or a preload), so the page never flashes the
 * default theme; `wearThemes` sets them from script at any time after.
 */

import { THEME_ATTRIBUTES, type AppearanceThemes } from './ids.js';

/** Has `root` wear `themes`, leaving an attribute that already names its theme untouched. */
export function wearThemes(root: HTMLElement, themes: AppearanceThemes): void {
  if (root.getAttribute(THEME_ATTRIBUTES.light) !== themes.light) {
    root.setAttribute(THEME_ATTRIBUTES.light, themes.light);
  }
  if (root.getAttribute(THEME_ATTRIBUTES.dark) !== themes.dark) {
    root.setAttribute(THEME_ATTRIBUTES.dark, themes.dark);
  }
}

/**
 * Calls `listener` whenever the colour tokens may have changed: the
 * appearance flips (`prefers-color-scheme`), or `root` comes to wear another
 * theme. Returns the unsubscribe.
 */
export function subscribeThemeChange(
  listener: () => void,
  root: HTMLElement = document.documentElement,
  view: Window = window
): () => void {
  const scheme = view.matchMedia?.('(prefers-color-scheme: dark)');
  const notify = (): void => listener();
  scheme?.addEventListener('change', notify);
  const observer = new MutationObserver(notify);
  observer.observe(root, {
    attributes: true,
    attributeFilter: [THEME_ATTRIBUTES.light, THEME_ATTRIBUTES.dark]
  });
  return () => {
    scheme?.removeEventListener('change', notify);
    observer.disconnect();
  };
}
