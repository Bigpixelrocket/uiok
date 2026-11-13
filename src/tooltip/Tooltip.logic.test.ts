import { describe, expect, it } from 'vitest';

import {
  cutTooltip,
  describedTooltip,
  isMonospaceFamily,
  placeTooltip,
  tooltip,
  tooltipChord
} from './Tooltip.logic.js';

const viewport = { width: 800, height: 600 };
const tip = { width: 100, height: 24 };

describe('tooltip', () => {
  it('names the chord only for a control that has one', () => {
    expect(tooltip('New Tab', '⌘T')).toEqual({
      'data-tooltip': 'New Tab',
      'data-tooltip-shortcut': '⌘T'
    });
    expect(tooltip('Close Tab', null)).toEqual({ 'data-tooltip': 'Close Tab' });
    expect(tooltip('Close Tab')).toEqual({ 'data-tooltip': 'Close Tab' });
  });

  it('writes a chord given as data both as text and as data it can read back', () => {
    const attributes = tooltip('Find', { key: 'f', meta: true });

    expect(attributes['data-tooltip-shortcut']).toBe('⌘F');
    expect(tooltipChord(attributes['data-tooltip-chord'] ?? null)).toEqual({
      key: 'f',
      meta: true
    });
  });

  it('reads nothing back from a missing or malformed chord', () => {
    expect(tooltipChord(null)).toBeNull();
    expect(tooltipChord('⌘F')).toBeNull();
    expect(tooltipChord('{"key":1}')).toBeNull();
    expect(tooltipChord('{"key":"f","meta":"yes"}')).toBeNull();
  });

  it('marks a tooltip of cut text, and gives none without a label', () => {
    expect(cutTooltip('report.txt')).toEqual({
      'data-tooltip': 'report.txt',
      'data-tooltip-cut': ''
    });
    expect(cutTooltip('')).toEqual({});
  });

  it('gives no tooltip without a label', () => {
    expect(tooltip(null)).toEqual({});
    expect(tooltip(undefined, '⌘T')).toEqual({});
    expect(tooltip('')).toEqual({});
  });
});

describe('describedTooltip', () => {
  it('makes the text the accessible description too', () => {
    expect(describedTooltip('/work/src')).toEqual({
      'data-tooltip': '/work/src',
      'aria-description': '/work/src'
    });
    expect(describedTooltip(null)).toEqual({});
  });

  it('marks a value and a side only when asked', () => {
    expect(describedTooltip('/work/src', { value: true, side: 'end' })).toEqual({
      'data-tooltip': '/work/src',
      'data-tooltip-value': '',
      'data-tooltip-side': 'end',
      'aria-description': '/work/src'
    });
    expect(tooltip('Save Page', null, { side: 'end' })).toEqual({
      'data-tooltip': 'Save Page',
      'data-tooltip-side': 'end'
    });
  });
});

describe('isMonospaceFamily', () => {
  it('knows a stack by its generic family', () => {
    expect(isMonospaceFamily('"SF Mono", ui-monospace, Menlo, monospace')).toBe(true);
    expect(isMonospaceFamily("system-ui, -apple-system, 'Segoe UI', sans-serif")).toBe(false);
    expect(isMonospaceFamily('')).toBe(false);
  });
});

describe('placeTooltip', () => {
  it('hangs under the control, centred on it', () => {
    expect(placeTooltip({ left: 390, top: 100, width: 20, height: 20 }, tip, viewport, 0)).toEqual({
      left: 350,
      top: 126
    });
  });

  it('opens above a control at the bottom of the window', () => {
    expect(placeTooltip({ left: 390, top: 570, width: 20, height: 20 }, tip, viewport, 0)).toEqual({
      left: 350,
      top: 540
    });
  });

  it('stays below when the window has room on neither side', () => {
    const short = { width: 800, height: 40 };

    expect(placeTooltip({ left: 390, top: 10, width: 20, height: 20 }, tip, short, 0).top).toBe(36);
  });

  it('follows the pointer along a control wider than the tooltip, inside its ends', () => {
    const strip = { left: 200, top: 100, width: 400, height: 20 };

    expect(placeTooltip(strip, tip, viewport, 420).left).toBe(370);
    expect(placeTooltip(strip, tip, viewport, 205).left).toBe(200);
    expect(placeTooltip(strip, tip, viewport, 598).left).toBe(500);
  });

  it('hangs from the leading edge of a control narrower than the tooltip', () => {
    const label = { left: 200, top: 100, width: 40, height: 16 };

    expect(placeTooltip(label, tip, viewport, 210)).toEqual({ left: 200, top: 122 });
    expect(placeTooltip(label, tip, viewport, 210, null, true).left).toBe(140);
  });

  it('keeps a glyph button centred and a leading-edge tooltip inside the window', () => {
    const glyph = { left: 200, top: 100, width: 24, height: 24 };
    const late = { left: 750, top: 100, width: 40, height: 16 };
    const early = { left: 10, top: 100, width: 40, height: 16 };

    expect(placeTooltip(glyph, tip, viewport, 0).left).toBe(162);
    expect(placeTooltip(late, tip, viewport, 0).left).toBe(694);
    expect(placeTooltip(early, tip, viewport, 0, null, true).left).toBe(6);
  });

  it('opens beside a control when asked, centred on its height', () => {
    const rail = { left: 0, top: 100, width: 28, height: 28 };

    expect(placeTooltip(rail, tip, viewport, 0, 'right')).toEqual({ left: 34, top: 102 });
  });

  it('opens on the other side, or below, when the asked side has no room', () => {
    const edge = { left: 772, top: 100, width: 28, height: 28 };

    expect(placeTooltip(edge, tip, viewport, 0, 'right')).toEqual({ left: 666, top: 102 });
    expect(
      placeTooltip({ left: 0, top: 100, width: 28, height: 28 }, tip, viewport, 0, 'left')
    ).toEqual({
      left: 34,
      top: 102
    });

    const narrow = { width: 150, height: 600 };
    expect(
      placeTooltip({ left: 50, top: 100, width: 28, height: 28 }, tip, narrow, 0, 'right').top
    ).toBe(134);
  });

  it('keeps a side tooltip inside the window top to bottom', () => {
    expect(
      placeTooltip({ left: 0, top: 0, width: 28, height: 8 }, tip, viewport, 0, 'right').top
    ).toBe(6);
  });

  it('slides sideways to stay inside the window', () => {
    expect(placeTooltip({ left: 0, top: 100, width: 20, height: 20 }, tip, viewport, 0).left).toBe(
      6
    );
    expect(
      placeTooltip({ left: 780, top: 100, width: 20, height: 20 }, tip, viewport, 0).left
    ).toBe(694);
  });

  it("hangs a short label's tooltip from its start and centres it under a glyph button", () => {
    const tip = { width: 284, height: 40 };
    const viewport = { width: 1280, height: 800 };
    // A 27 by 28 label ("Host" in a dialog's label column) is as square as a
    // glyph button; told by what it is, it keeps the leading edge.
    const label = { left: 420, top: 100, width: 27, height: 28 };

    expect(placeTooltip(label, tip, viewport, 430, null, false, false).left).toBe(420);
    expect(placeTooltip(label, tip, viewport, 430, null, true, false).left).toBe(420 + 27 - 284);
    expect(placeTooltip({ ...label, width: 28 }, tip, viewport, 430, null, false, true).left).toBe(
      420 + 14 - 142
    );
  });
});
