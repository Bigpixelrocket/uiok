import { describe, expect, it } from 'vitest';

import {
  cutTooltip,
  describedTooltip,
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

  it('slides sideways to stay inside the window', () => {
    expect(placeTooltip({ left: 0, top: 100, width: 20, height: 20 }, tip, viewport, 0).left).toBe(
      6
    );
    expect(
      placeTooltip({ left: 780, top: 100, width: 20, height: 20 }, tip, viewport, 0).left
    ).toBe(694);
  });
});
