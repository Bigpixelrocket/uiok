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

describe('placeMenu beside an item', () => {
  // An item 160px wide, 20px tall, its menu standing at 300 from the left.
  const item = { left: 300, top: 200, right: 460, bottom: 220 };

  it("stands at the item's inline-end side, its first item level with it", () => {
    expect(placeMenu({ beside: item }, SIZE, VIEWPORT)).toEqual({
      left: 460,
      top: 200 - MENU_MARGIN
    });
    expect(placeMenu({ beside: item, rtl: true }, SIZE, VIEWPORT)).toEqual({
      left: 100,
      top: 200 - MENU_MARGIN
    });
  });

  it('flips to the other side with no room on its own, and keeps inside the window', () => {
    const atEnd = { left: 700, top: 760, right: 860, bottom: 780 };
    expect(placeMenu({ beside: atEnd }, SIZE, VIEWPORT)).toEqual({
      left: 500,
      top: 800 - MENU_MARGIN - 120
    });
    const atStart = { left: 100, top: 200, right: 260, bottom: 220 };
    expect(placeMenu({ beside: atStart, rtl: true }, SIZE, VIEWPORT)).toEqual({
      left: 260,
      top: 200 - MENU_MARGIN
    });
  });

  it('keeps to the roomier side when neither has room', () => {
    const wide = { left: 150, top: 200, right: 850, bottom: 220 };
    // 150 before it, 150 after it: its own side wins a tie.
    expect(placeMenu({ beside: wide }, SIZE, VIEWPORT).left).toBe(1000 - MENU_MARGIN - 200);
    const leaning = { left: 190, top: 200, right: 850, bottom: 220 };
    expect(placeMenu({ beside: leaning, rtl: true }, SIZE, VIEWPORT).left).toBe(MENU_MARGIN);
  });
});

describe('menuKeyAction', () => {
  const plain = { metaKey: false, ctrlKey: false, altKey: false, shiftKey: false };
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
    expect(key('Escape')).toEqual({ kind: 'close', all: false });
    expect(key('Tab')).toEqual({ kind: 'close', all: true });
    expect(key('Tab', { shiftKey: true })).toEqual({ kind: 'close', all: true });
    expect(key('ArrowDown', { metaKey: true })).toBe(null);
    expect(key('a')).toBe(null);
  });

  it('opens a submenu with the arrow that points where it stands, and goes back with the other', () => {
    expect(key('ArrowRight')).toEqual({ kind: 'open' });
    expect(key('ArrowLeft')).toEqual({ kind: 'back' });
    expect(menuKeyAction({ ...plain, key: 'ArrowLeft' }, true)).toEqual({ kind: 'open' });
    expect(menuKeyAction({ ...plain, key: 'ArrowRight' }, true)).toEqual({ kind: 'back' });
    expect(key('ArrowRight', { shiftKey: true })).toBe(null);
  });
});
