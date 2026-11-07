import { describe, expect, it } from 'vitest';

import { DEFAULT_TERMINAL_LABELS } from '../labels/terminal.js';
import {
  DEFAULT_TERMINAL_MENU_CHORDS,
  TERMINAL_MENU_MARGIN,
  placeTerminalMenu,
  terminalMenuItems,
  terminalMenuKeyAction
} from './TerminalMenu.logic.js';

const enabled = (state: Parameters<typeof terminalMenuItems>[0]) =>
  terminalMenuItems(state, DEFAULT_TERMINAL_LABELS, DEFAULT_TERMINAL_MENU_CHORDS).map((item) => [
    item.label,
    item.enabled
  ]);

describe('terminalMenuItems', () => {
  it('offers Copy only with a selection and Paste only where input goes somewhere', () => {
    expect(enabled({ readOnly: false, hasSelection: true })).toEqual([
      ['Copy', true],
      ['Paste', true]
    ]);
    expect(enabled({ readOnly: false, hasSelection: false })).toEqual([
      ['Copy', false],
      ['Paste', true]
    ]);
    expect(enabled({ readOnly: true, hasSelection: true })).toEqual([
      ['Copy', true],
      ['Paste', false]
    ]);
  });

  it('shows the Edit menu chords and has no Cut', () => {
    const items = terminalMenuItems(
      { readOnly: false, hasSelection: true },
      DEFAULT_TERMINAL_LABELS,
      DEFAULT_TERMINAL_MENU_CHORDS
    );
    expect(items.map((item) => item.chord)).toEqual([
      { key: 'c', meta: true },
      { key: 'v', meta: true }
    ]);
    expect(items.map((item) => item.verb)).not.toContain('cut');
  });
});

describe('terminalMenuKeyAction', () => {
  const key = (name: string, modifiers: Partial<Record<'metaKey' | 'shiftKey', boolean>> = {}) =>
    terminalMenuKeyAction({
      key: name,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      ...modifiers
    });

  it('moves on the arrows, runs on Return and Space, and closes on Escape', () => {
    expect(key('ArrowDown')).toEqual({ kind: 'move', delta: 1 });
    expect(key('ArrowUp')).toEqual({ kind: 'move', delta: -1 });
    expect(key('Enter')).toEqual({ kind: 'run' });
    expect(key(' ')).toEqual({ kind: 'run' });
    expect(key('Escape')).toEqual({ kind: 'close' });
  });

  it('leaves chords and other keys alone', () => {
    expect(key('Enter', { metaKey: true })).toBeNull();
    expect(key('ArrowDown', { shiftKey: true })).toBeNull();
    expect(key('a')).toBeNull();
  });
});

describe('placeTerminalMenu', () => {
  const size = { width: 180, height: 60 };
  const terminal = { left: 100, top: 50, right: 700, bottom: 450 };
  const viewport = { width: 1000, height: 800 };

  it('opens at the point clicked while it fits', () => {
    expect(placeTerminalMenu({ x: 200, y: 100 }, size, terminal, viewport)).toEqual({
      left: 200,
      top: 100
    });
  });

  it('pulls back inside the terminal near its edges', () => {
    expect(placeTerminalMenu({ x: 690, y: 440 }, size, terminal, viewport)).toEqual({
      left: 700 - TERMINAL_MENU_MARGIN - 180,
      top: 450 - TERMINAL_MENU_MARGIN - 60
    });
  });

  it('stays inside the window along an edge the terminal is too small for', () => {
    const short = { left: 100, top: 760, right: 700, bottom: 800 };
    expect(placeTerminalMenu({ x: 200, y: 780 }, size, short, viewport)).toEqual({
      left: 200,
      top: 800 - TERMINAL_MENU_MARGIN - 60
    });
  });
});
