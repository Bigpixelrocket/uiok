import { useCallback, type RefCallback } from 'react';

import { clearWordTips, giveWordTips } from './toolWords.js';

/** A tool the fit may step to its glyph: a `QuietAction` drawn with its word. */
const WORDED = '.pane-act:not(.wordless)';

/**
 * Whether the bar's items, every one at its full size, run past its box.
 * Items a host lets shrink (a search field, a label that cuts) are held at
 * their full size while the bar measures, so they count toward the room
 * rather than giving it up to the tools' words.
 */
function overflows(bar: HTMLElement): boolean {
  const items = [...bar.children] as HTMLElement[];
  const held = items.map((item) => item.style.flexShrink);
  for (const item of items) item.style.flexShrink = '0';
  const over = bar.scrollWidth > bar.clientWidth;
  items.forEach((item, index) => {
    item.style.flexShrink = held[index] ?? '';
  });
  return over;
}

/**
 * Fits a toolbar's tools to its one line: every tool shows its glyph and
 * word while they fit; when they do not, every tool steps to its glyph
 * alone (`data-tight` on the bar), its word becoming its tooltip, except a
 * tool marked `keepWord`; when even that does not fit, those step too
 * (`data-tight="all"`). Measured with the words shown, so the words come
 * back as soon as the room does.
 */
export function fitToolbar(bar: HTMLElement): void {
  delete bar.dataset.tight;
  clearWordTips(bar);
  const tools = [...bar.querySelectorAll<HTMLElement>(WORDED)];
  if (tools.length === 0 || !overflows(bar)) return;

  const kept = tools.filter((tool) => tool.hasAttribute('data-keep-word'));
  bar.dataset.tight = '';
  giveWordTips(tools.filter((tool) => !kept.includes(tool)));
  if (kept.length === 0 || !overflows(bar)) return;

  bar.dataset.tight = 'all';
  giveWordTips(kept);
}

/**
 * Makes a toolbar of quiet actions fit its one line, as a path bar's tools
 * do: put the ref it returns on the toolbar (`role="toolbar"`, one line,
 * as wide as the room it has rather than as its content). While every
 * tool's glyph and word fit beside the bar's other items, they show; when
 * they do not, the bar's `QuietAction`s step to their glyphs alone, each
 * word moving to the tool's tooltip and staying its accessible name, and
 * they step back when the room returns. A tool never cuts its word and
 * never leaves the bar. The bar's other items (a field, a pager, a check,
 * a button) keep their full size and count toward the room. A tool whose
 * command is consequential can keep its word until last (`keepWord`). The
 * bar refits whenever it or one of its items resizes, its items change,
 * or the document's fonts load.
 */
export function useToolbarFit<T extends HTMLElement = HTMLDivElement>(): RefCallback<T> {
  return useCallback((bar: T | null) => {
    if (bar === null) return;
    bar.dataset.toolFit = '';
    let live = true;
    const fit = () => {
      if (live) fitToolbar(bar);
    };
    const sizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    const watch = () => {
      if (sizes === null) return;
      sizes.disconnect();
      sizes.observe(bar, { box: 'border-box' });
      for (const item of bar.children) sizes.observe(item, { box: 'border-box' });
    };
    // A tool that appears, goes, or changes its word changes the room.
    const items =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(() => {
            watch();
            fit();
          });
    items?.observe(bar, { childList: true, subtree: true, characterData: true });
    watch();
    fit();
    void document.fonts?.ready.then(fit);
    return () => {
      live = false;
      sizes?.disconnect();
      items?.disconnect();
      delete bar.dataset.toolFit;
    };
  }, []);
}
