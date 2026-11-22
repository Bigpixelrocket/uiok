/**
 * The field sheet's later looks: the NULL placeholder, the editor frame and
 * its states, a list box's chosen rows, and choices in columns. jsdom lays
 * nothing out, so these read what the rules set.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';

const styles = readStylesheet('src/styles.css');

beforeEach(() => applyStylesheets(styles));
afterEach(() => {
  document.body.innerHTML = '';
});

const one = (html: string): Element => {
  document.body.innerHTML = html;
  return document.body.firstElementChild as Element;
};

describe('field looks', () => {
  it('frames an editor as a field, with its invalid, changed, and read-only looks', () => {
    const plain = one('<div class="field-editor"></div>');
    expect(declaredValues(plain, 'border').at(-1)).toBe('var(--line) solid var(--control-border)');
    expect(declaredValues(plain, 'border-radius').at(-1)).toBe('var(--radius-md)');

    const invalid = one('<div class="field-editor" aria-invalid="true"></div>');
    expect(declaredValues(invalid, 'border-color').at(-1)).toBe('var(--danger)');

    const changed = one('<div class="field-editor" data-tone="accent"></div>');
    expect(declaredValues(changed, 'border-color').at(-1)).toBe('var(--accent)');
    expect(declaredValues(changed, '--field-tone-bar').at(-1)).toBe('var(--line-strong)');

    const readOnly = one('<div class="field-editor read-only"></div>');
    expect(declaredValues(readOnly, 'background').at(-1)).toBe('var(--surface-recessed)');
    expect(declaredValues(readOnly, 'outline').at(-1)).toBe('none');
  });

  it('keeps a list box’s chosen rows in the selection, quiet without the keys', () => {
    document.body.innerHTML =
      '<select class="field" multiple><option selected>a</option><option>b</option></select>';
    const chosen = document.querySelector('option') as Element;
    const rest = document.querySelectorAll('option')[1] as Element;

    // Not focused in jsdom: the quiet fill wins over the selection's.
    expect(declaredValues(chosen, 'background').at(-1)).toBe(
      'linear-gradient(var(--fill), var(--fill))'
    );
    expect(declaredValues(chosen, 'background')).toContain(
      'linear-gradient(var(--selected-bg), var(--selected-bg))'
    );
    expect(declaredValues(rest, 'background').at(-1)).toBe('var(--surface)');
  });

  it('lays choices in columns, two unless the host sets more, the legend across them', () => {
    const group = one(
      '<fieldset class="field-group field-columns"><legend>Kinds</legend><label class="field-choice">a</label></fieldset>'
    );
    expect(declaredValues(group, 'grid-template-columns')).toEqual([
      'repeat(var(--field-columns, 2), minmax(0, 1fr))'
    ]);
    expect(declaredValues(group.querySelector('legend') as Element, 'grid-column')).toEqual([
      '1 / -1'
    ]);
  });
});
