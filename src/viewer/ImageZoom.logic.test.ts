import { describe, expect, it } from 'vitest';

import {
  canPan,
  fitLayout,
  fitScale,
  formatScale,
  MAX_SCALE,
  panBy,
  placeImage,
  stepScale,
  wheelZoomFactor,
  zoomAbout
} from './ImageZoom.logic.js';
import { DEFAULT_VIEWER_LABELS as L } from '../labels/viewer.js';

const window = { width: 800, height: 600 };
const photo = { width: 4000, height: 3000 };
const icon = { width: 32, height: 32 };

describe('fitting', () => {
  it('shrinks a large image to the window, centred on the short axis', () => {
    expect(fitScale(photo, window)).toBe(0.2);
    expect(fitLayout({ width: 4000, height: 1000 }, window)).toEqual({ scale: 0.2, x: 0, y: 200 });
  });

  it('never enlarges a small image past actual size', () => {
    expect(fitScale(icon, window)).toBe(1);
    expect(fitLayout(icon, window)).toEqual({ scale: 1, x: 384, y: 284 });
  });

  it('fills the window with an image that has no actual size to keep', () => {
    // A size-less SVG Chromium lays out at its default 300 px width, 4:1.
    const sizeless = { width: 300, height: 75 };

    expect(fitScale(sizeless, window, Infinity)).toBe(800 / 300);
    expect(fitLayout(sizeless, window, Infinity)).toEqual({ scale: 800 / 300, x: 0, y: 200 });
  });

  it('shows actual size until both sizes are known', () => {
    expect(fitScale({ width: 0, height: 0 }, window)).toBe(1);
    expect(fitScale(photo, { width: 0, height: 0 })).toBe(1);
  });
});

describe('placing', () => {
  it('centres an image smaller than the window and leaves no gap at the edge of a larger one', () => {
    expect(placeImage({ scale: 1, x: 50, y: -7000 }, photo, window)).toEqual({
      scale: 1,
      x: 0,
      y: -2400
    });
    expect(placeImage({ scale: 1, x: 0, y: 0 }, icon, window)).toEqual({
      scale: 1,
      x: 384,
      y: 284
    });
  });

  it('keeps the scale in range, letting a huge image fit below the usual floor', () => {
    expect(placeImage({ scale: 1000, x: 0, y: 0 }, icon, window).scale).toBe(MAX_SCALE);
    expect(placeImage({ scale: 0.0001, x: 0, y: 0 }, icon, window).scale).toBe(1 / 64);

    const huge = { width: 200_000, height: 100 };
    expect(placeImage({ scale: 0.0001, x: 0, y: 0 }, huge, window).scale).toBe(0.004);
  });
});

describe('zooming', () => {
  it('keeps the pixel under the anchor in place', () => {
    const start = { scale: 1, x: -1000, y: -1000 };
    const next = zoomAbout(start, 2, { x: 400, y: 300 }, photo, window);

    // Image pixel (1400, 1300) sat under the anchor and still does.
    expect(next).toEqual({ scale: 2, x: -2400, y: -2300 });
    expect((400 - next.x) / next.scale).toBe(1400);
  });

  it('steps through the ladder from wherever the scale is', () => {
    expect(stepScale(1, 1)).toBe(1.5);
    expect(stepScale(1, -1)).toBe(2 / 3);
    expect(stepScale(0.2, 1)).toBe(0.25);
    expect(stepScale(0.2, -1)).toBe(1 / 6);
    expect(stepScale(MAX_SCALE, 1)).toBe(MAX_SCALE);
    expect(stepScale(1 / 64, -1)).toBe(1 / 64);
    // A huge image fitted below the ladder has no step out, and stays put.
    expect(stepScale(0.004, -1)).toBe(0.004);
  });

  it('zooms a little for a pinch and about 1.4× for a wheel notch, either way', () => {
    expect(wheelZoomFactor(-2)).toBeCloseTo(1.014, 3);
    expect(wheelZoomFactor(-100)).toBeCloseTo(Math.SQRT2, 6);
    expect(wheelZoomFactor(100)).toBeCloseTo(Math.SQRT1_2, 6);
  });
});

describe('panning', () => {
  it('moves an image larger than the window, stopping at its edges', () => {
    const start = { scale: 1, x: -100, y: -100 };

    expect(canPan(start, photo, window)).toBe(true);
    expect(panBy(start, -48, 48, photo, window)).toEqual({ scale: 1, x: -148, y: -52 });
    expect(panBy(start, 500, 500, photo, window)).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('has nothing to move when the image fits', () => {
    const fitted = fitLayout(photo, window);

    expect(canPan(fitted, photo, window)).toBe(false);
    expect(panBy(fitted, 40, 40, photo, window)).toEqual(fitted);
  });
});

describe('formatScale', () => {
  it('reads as a whole percentage, with a decimal under 1%', () => {
    expect(formatScale(0.2, L)).toBe('20%');
    expect(formatScale(1 / 3, L)).toBe('33%');
    expect(formatScale(16, L)).toBe('1600%');
    expect(formatScale(0.004, L)).toBe('0.4%');
  });
});
