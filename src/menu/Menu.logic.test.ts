import { describe, expect, it } from 'vitest';

import { MENU_MARGIN, menuKeyAction, placeMenu } from './Menu.logic.js';

const VIEWPORT = { width: 1000, height: 800 };
const SIZE = { width: 200, height: 120 };

describe('placeMenu', () => {
  it('hangs from a point, moved in to stay inside the window', () => {
    expect(placeMenu({ point: { x: 100, y: 100 } }, SIZE, VIEWPORT)).toEqual({
      left: 100,
      top: 100
    });
    expect(placeMenu({ point: { x: 950, y: 100 } }, SIZE, VIEWPORT)).toEqual({
      left: 1000 - MENU_MARGIN - 200,
      top: 100
    });
  });

  it('opens upward from a point with no room below', () => {
    expect(placeMenu({ point: { x: 100, y: 760 } }, SIZE, VIEWPORT)).toEqual({
      left: 100,
      top: 640
    });
  });

  it('drops under a box, a margin below its leading edge, or stands over it with no room below', () => {
    const box = { left: 300, top: 40, right: 360, bottom: 60 };

    expect(placeMenu({ box }, SIZE, VIEWPORT)).toEqual({ left: 300, top: 60 + MENU_MARGIN });

    const low = { left: 300, top: 740, right: 360, bottom: 760 };
    expect(placeMenu({ box: low }, SIZE, VIEWPORT)).toEqual({
      left: 300,
      top: 740 - MENU_MARGIN - 120
    });
  });
});

describe('menuKeyAction', () => {
  const key = (name: string, init: Partial<KeyboardEvent> = {}) =>
    menuKeyAction({
      key: name,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      ...init
    });

  it('maps the menu keys, and leaves chords and other keys alone', () => {
    expect(key('ArrowDown')).toEqual({ kind: 'move', delta: 1 });
    expect(key('ArrowUp')).toEqual({ kind: 'move', delta: -1 });
    expect(key('Home')).toEqual({ kind: 'edge', to: 'first' });
    expect(key('End')).toEqual({ kind: 'edge', to: 'last' });
    expect(key('Enter')).toEqual({ kind: 'run' });
    expect(key(' ')).toEqual({ kind: 'run' });
    expect(key('Escape')).toEqual({ kind: 'close' });
    expect(key('Tab')).toEqual({ kind: 'close' });
    expect(key('Tab', { shiftKey: true })).toEqual({ kind: 'close' });
    expect(key('ArrowDown', { metaKey: true })).toBe(null);
    expect(key('a')).toBe(null);
  });
});
