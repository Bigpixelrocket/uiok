import { describe, expect, it } from 'vitest';

import {
  NO_MAIN_VERBS,
  movedIndex,
  paneKeyAction,
  sameVerbs,
  type PaneKeyStroke
} from './PaneKeys.logic.js';

/** A key event's parts, nothing held unless said. */
const stroke = (key: string, held: Partial<PaneKeyStroke> = {}): PaneKeyStroke => ({
  key,
  code: '',
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...held
});

describe('paneKeyAction', () => {
  it('reads the cursor keys, Tab, and the row chords', () => {
    expect(paneKeyAction(stroke('ArrowDown'))).toEqual({ kind: 'move', to: 'down' });
    expect(paneKeyAction(stroke('ArrowUp', { metaKey: true }))).toEqual({
      kind: 'move',
      to: 'start'
    });
    expect(paneKeyAction(stroke('PageDown'))).toEqual({ kind: 'move', to: 'page-down' });
    expect(paneKeyAction(stroke('Tab', { shiftKey: true }))).toEqual({
      kind: 'switch-pane',
      back: true
    });
    expect(paneKeyAction(stroke('Enter'))).toEqual({ kind: 'enter' });
    expect(paneKeyAction(stroke('Backspace', { metaKey: true }))).toEqual({ kind: 'remove' });
    expect(paneKeyAction(stroke('Enter', { metaKey: true }))).toEqual({ kind: 'toggle' });
    expect(paneKeyAction(stroke('Enter', { metaKey: true, altKey: true }))).toEqual({
      kind: 'restart'
    });
  });

  it('hands a Command letter to the app, an Option one by where its key sits', () => {
    expect(paneKeyAction(stroke('E', { metaKey: true }))).toEqual({
      kind: 'chord',
      letter: 'e',
      alt: false
    });
    expect(paneKeyAction(stroke('Dead', { metaKey: true, altKey: true, code: 'KeyN' }))).toEqual({
      kind: 'chord',
      letter: 'n',
      alt: true
    });
  });

  it('leaves Control, Shift but on Tab, Option alone, and named keys it does not read', () => {
    expect(paneKeyAction(stroke('Tab', { ctrlKey: true }))).toBeNull();
    expect(paneKeyAction(stroke('Enter', { metaKey: true, shiftKey: true }))).toBeNull();
    expect(paneKeyAction(stroke('ArrowLeft'))).toBeNull();
    expect(paneKeyAction(stroke('n', { altKey: true, code: 'KeyN' }))).toBeNull();
    expect(paneKeyAction(stroke('Escape', { metaKey: true }))).toBeNull();
    expect(paneKeyAction(stroke('Tab', { metaKey: true }))).toBeNull();
  });
});

describe('paneKeyAction where Control plays Command', () => {
  const ctrl = { command: 'ctrl' } as const;

  it('reads the row chords on Control and leaves Command alone', () => {
    expect(paneKeyAction(stroke('Backspace', { ctrlKey: true }), ctrl)).toEqual({
      kind: 'remove'
    });
    expect(paneKeyAction(stroke('Enter', { ctrlKey: true, altKey: true }), ctrl)).toEqual({
      kind: 'restart'
    });
    expect(paneKeyAction(stroke('e', { ctrlKey: true }), ctrl)).toEqual({
      kind: 'chord',
      letter: 'e',
      alt: false
    });
    expect(paneKeyAction(stroke('Backspace', { metaKey: true }), ctrl)).toBeNull();
    expect(paneKeyAction(stroke('ArrowDown'), ctrl)).toEqual({ kind: 'move', to: 'down' });
  });
});

describe('movedIndex', () => {
  it('stops at either end and puts a first move on the first row', () => {
    expect(movedIndex(3, 0, 'up')).toBe(0);
    expect(movedIndex(3, 2, 'down')).toBe(2);
    expect(movedIndex(3, 1, 'down')).toBe(2);
    expect(movedIndex(3, -1, 'down')).toBe(0);
    expect(movedIndex(3, -1, 'up')).toBe(0);
    expect(movedIndex(3, -1, 'end')).toBe(2);
    expect(movedIndex(3, 1, 'start')).toBe(0);
    expect(movedIndex(0, -1, 'down')).toBeNull();
  });

  it('pages by the rows given, clamped', () => {
    expect(movedIndex(30, 5, 'page-down', 10)).toBe(15);
    expect(movedIndex(30, 25, 'page-down', 10)).toBe(29);
    expect(movedIndex(30, 5, 'page-up', 10)).toBe(0);
    expect(movedIndex(30, 5, 'page-down', 0)).toBe(6);
  });
});

describe('sameVerbs', () => {
  it('says two readings match field by field', () => {
    expect(sameVerbs(NO_MAIN_VERBS, { ...NO_MAIN_VERBS })).toBe(true);
    expect(sameVerbs(NO_MAIN_VERBS, { ...NO_MAIN_VERBS, toggle: 'Stop' })).toBe(false);
  });
});
