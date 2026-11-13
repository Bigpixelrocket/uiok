import { describe, expect, it } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';

describe('menu look', () => {
  it('draws no focus ring on a menu or on the list a script focuses to take the keys', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `
      <div class="folder-menu" tabindex="-1">
        <div class="folder-menu-options" role="listbox" tabindex="-1"></div>
      </div>`;

    const menu = document.querySelector<HTMLElement>('.folder-menu');
    const list = document.querySelector<HTMLElement>('.folder-menu-options');

    // The cursor row is the menu's focus mark: the last rule to set an
    // outline on either focused surface removes it.
    list?.focus();
    expect(declaredValues(list as Element, 'outline').at(-1)).toBe('none');
    menu?.focus();
    expect(declaredValues(menu as Element, 'outline').at(-1)).toBe('none');
    document.body.innerHTML = '';
  });

  it("says a palette's refusal in the count's dim tone and lets its notes be copied", () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `
      <span class="palette-refused">nothing matches "fiq"</span>
      <div class="palette-notes">
        <p class="folder-menu-note">Recent folders appear here.</p>
        <p class="palette-failure">ENOENT: no such file</p>
      </div>`;

    const refused = document.querySelector('.palette-refused') as Element;

    expect(declaredValues(refused, 'color').at(-1)).toBe('var(--text-dim)');
    for (const note of document.querySelectorAll('.palette-notes > p')) {
      expect(declaredValues(note, 'user-select').at(-1)).toBe('text');
    }
    document.body.innerHTML = '';
  });

  it('wraps a note that explains a state to two lines before it cuts it', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `<p class="folder-menu-note">Folders you cannot read are listed but cannot be opened.</p>`;

    const note = document.querySelector('.folder-menu-note') as Element;

    expect(declaredValues(note, 'white-space')).not.toContain('nowrap');
    expect(declaredValues(note, '-webkit-line-clamp').at(-1)).toBe('2');
    document.body.innerHTML = '';
  });
});
