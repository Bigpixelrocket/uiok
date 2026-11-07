import { afterEach, describe, expect, it } from 'vitest';

import { holdPageSelectAll } from './PageSelectAll.js';

const selectStart = (target: EventTarget): boolean =>
  target.dispatchEvent(new Event('selectstart', { bubbles: true, cancelable: true }));

describe('holdPageSelectAll', () => {
  let release: (() => void) | null = null;

  afterEach(() => {
    release?.();
    release = null;
    document.body.replaceChildren();
  });

  it('cancels the select-all Chromium aims at the body', () => {
    release = holdPageSelectAll(document);

    expect(selectStart(document.body)).toBe(false);
  });

  it('lets a field, an editable region, and selectable text start a selection', () => {
    const input = document.createElement('input');
    const editable = document.createElement('div');
    const output = document.createElement('pre');

    editable.setAttribute('contenteditable', 'true');
    document.body.append(input, editable, output);
    release = holdPageSelectAll(document);

    expect(selectStart(input)).toBe(true);
    expect(selectStart(editable)).toBe(true);
    expect(selectStart(output)).toBe(true);
  });

  it('stops holding once released', () => {
    holdPageSelectAll(document)();

    expect(selectStart(document.body)).toBe(true);
  });
});
