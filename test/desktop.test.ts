/**
 * The desktop guards of the base sheet: an application's chrome cannot be
 * selected while its content can, and nothing animates in.
 *
 * Selection: the body is unselectable and content opts back in (fields,
 * code, `.selectable`, and each component's content class in its own rule),
 * so a drag never smears a highlight across labels, tabs, and buttons. A
 * listing or grid selects rows, not text, so its rows stay unselectable.
 *
 * Motion: a state change takes at most --duration-base (under 150ms) and no
 * surface enters or leaves with an animation. An animation is a loop that
 * reports work (a spinner, stripes, a blink), a signal (a refusal's shake, a
 * bell), or a scroll-driven fade; nothing else.
 */

import { describe, expect, it } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from './stylesheets.js';

/** The `user-select` values the rules matching the first element of `markup` declare. */
function selectValues(markup: string, selector: string): string[] {
  document.body.innerHTML = markup;
  const element = document.querySelector(selector);
  expect(element, selector).not.toBeNull();
  return declaredValues(element as Element, 'user-select');
}

describe('selection', () => {
  it('makes the body unselectable at zero weight', () => {
    applyStylesheets(readStylesheet('src/styles.css'));

    expect(declaredValues(document.body, 'user-select')).toContain('none');
  });

  it('lets fields, code, and content opt back in', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const content: readonly (readonly [string, string])[] = [
      ['<input type="text">', 'input'],
      ['<textarea></textarea>', 'textarea'],
      ['<div contenteditable="true"></div>', 'div'],
      ['<code>ls</code>', 'code'],
      ['<span class="selectable">2.4.1</span>', '.selectable'],
      ['<div class="listing-root"><p class="pane-message">Nothing here.</p></div>', 'p'],
      ['<div class="dialog"><p class="dialog-message">Gone.</p></div>', '.dialog-message'],
      ['<p class="about-version">Version 3.4.0</p>', '.about-version']
    ];
    for (const [markup, selector] of content) {
      expect(selectValues(markup, selector), selector).toContain('text');
    }
    document.body.innerHTML = '';
  });

  it('leaves chrome unselectable', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const chrome: readonly (readonly [string, string])[] = [
      ['<button class="button">Save</button>', 'button'],
      ['<input type="checkbox" class="check">', 'input'],
      ['<h4 class="overline">Updates</h4>', 'h4'],
      ['<label class="field-label">Host</label>', 'label'],
      // A listing selects rows, not text, as a file manager does.
      [
        '<div class="listing-root"><div class="row"><span class="row-name">a.txt</span></div></div>',
        '.row-name'
      ],
      [
        '<div class="data-grid"><div class="data-grid-row"><div class="data-grid-cell">1</div></div></div>',
        '.data-grid-cell'
      ]
    ];
    for (const [markup, selector] of chrome) {
      expect(selectValues(markup, selector), selector).not.toContain('text');
    }
    document.body.innerHTML = '';
  });
});

describe('motion', () => {
  const tokens = readStylesheet('src/tokens.css');
  /** A duration token's value in milliseconds, outside the reduced-motion rule. */
  const duration = (name: string): number => {
    const value = new RegExp(`${name}:\\s*([\\d.]+)(m?s);`).exec(tokens);
    expect(value, name).not.toBeNull();
    const [, amount, unit] = value as RegExpExecArray;
    return Number(amount) * (unit === 's' ? 1000 : 1);
  };

  it('keeps every state change under 150ms', () => {
    expect(duration('--duration-fast')).toBeLessThan(150);
    expect(duration('--duration-base')).toBeLessThan(150);
  });

  it('times every transition with a state-change token', () => {
    const sheet = readStylesheet('src/styles.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const transitions = [...sheet.matchAll(/(?<![\w-])transition\s*:([^;]*);/g)].map(([, value]) =>
      (value as string).trim()
    );
    expect(transitions.length).toBeGreaterThan(0);
    for (const value of transitions) {
      if (value === 'none' || value === 'var(--transition-control)') continue;
      expect(value).not.toMatch(/--duration-(?:slow|signal|spin|loop|notice)/);
      expect(value).toMatch(/--duration-(?:fast|base)/);
    }
  });

  it('animates only loops, signals, and scroll-driven fades', () => {
    const sheet = readStylesheet('src/styles.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const animations = [...sheet.matchAll(/(?<![\w-])animation\s*:([^;]*);/g)].map(([, value]) =>
      (value as string).replace(/\s+/g, ' ').trim()
    );
    for (const value of animations) {
      if (value === 'none') continue;
      for (const part of value.split(',')) {
        expect(part, value).toMatch(
          /\binfinite\b|--duration-(?:slow|signal)\b|^\s*[\w-]+ linear both\s*$/
        );
      }
    }
  });
});
