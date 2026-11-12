/**
 * Nothing animates in: a dialog, its frosted wash, a menu, a palette, and the
 * terminal's menu are there on the frame they open, as a desktop sheet or
 * menu is. No rule that matches them at rest sets an animation or a
 * transition. The menu's refusal beat (a signal, on its query field only)
 * and the scroll-driven fades (on pseudo-elements, moved by the scroll, not
 * the clock) are not entrances and are left out by construction.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';

const SHEETS = [
  'src/dialog/dialog.css',
  'src/menu/menu.css',
  'src/palette/palette.css',
  'src/terminal/terminal.css'
];

afterEach(() => {
  document.body.innerHTML = '';
});

describe('overlay entrances', () => {
  it('sets no animation or transition on an overlay or its rows at rest', () => {
    applyStylesheets(...SHEETS.map(readStylesheet));
    document.body.innerHTML = `
      <div class="dialog-backdrop frosted"><div class="dialog" data-tone="danger">
        <div class="dialog-heading"><h2>Delete 3 Items Now?</h2></div>
        <p class="dialog-message">They cannot be restored.</p>
        <div class="dialog-legend"><button class="legend-slot legend-primary">Delete</button></div>
      </div></div>
      <div class="dialog-backdrop"><div class="dialog"></div></div>
      <div class="folder-menu folder-menu-compact"><div class="folder-menu-options">
        <div class="folder-menu-option cursor" aria-checked="true"></div>
        <div class="folder-menu-separator"></div>
        <div class="folder-menu-option" aria-haspopup="menu"></div>
      </div><p class="folder-menu-note">Note</p></div>
      <div class="palette folder-menu"><div class="palette-notes">
        <p class="folder-menu-note palette-failure">Could not load</p></div></div>
      <div class="folder-menu terminal-menu"></div>`;

    const overlays = [
      ...document.querySelectorAll(
        '.dialog-backdrop, .dialog, .dialog-heading, .dialog-legend, .folder-menu, .folder-menu-option, .folder-menu-separator, .folder-menu-note'
      )
    ];
    expect(overlays.length).toBe(14);
    for (const element of overlays) {
      for (const property of ['animation', 'animation-name', 'transition']) {
        expect(declaredValues(element, property), `${element.className} ${property}`).toEqual([]);
      }
    }
  });
});
