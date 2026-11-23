import { describe, expect, it } from 'vitest';

import { MIN_THUMB_PX, positionForThumb, thumbGeometry } from './ScaledScroll.logic.js';

describe('the scaled scrollbar', () => {
  const huge = { total: 128 * 1024 ** 3, visible: 4096, trackPx: 600 };

  it('keeps a grabbable thumb on a huge file and puts it at the ends of the track', () => {
    expect(thumbGeometry(huge, 0)).toEqual({ heightPx: MIN_THUMB_PX, topPx: 0 });
    expect(thumbGeometry(huge, huge.total - huge.visible).topPx).toBe(600 - MIN_THUMB_PX);
    expect(thumbGeometry(huge, huge.total * 2).topPx).toBe(600 - MIN_THUMB_PX);
  });

  it('sizes the thumb by the share of the file in view', () => {
    expect(thumbGeometry({ total: 1000, visible: 250, trackPx: 400 }, 0).heightPx).toBe(100);
    expect(thumbGeometry({ total: 100, visible: 100, trackPx: 400 }, 0)).toEqual({
      heightPx: 400,
      topPx: 0
    });
  });

  it('maps a dragged thumb back to the byte it shows, to within one pixel of bytes', () => {
    const bytesPerPixel = (huge.total - huge.visible) / (huge.trackPx - MIN_THUMB_PX);

    for (const position of [0, 1, 123_456_789, 64 * 1024 ** 3, huge.total - huge.visible]) {
      const { topPx } = thumbGeometry(huge, position);
      expect(Math.abs(positionForThumb(huge, topPx) - position)).toBeLessThanOrEqual(1);
    }
    expect(positionForThumb(huge, 288) - positionForThumb(huge, 287)).toBeCloseTo(
      bytesPerPixel,
      -3
    );
  });

  it('clamps a drag past either end of the track', () => {
    expect(positionForThumb(huge, -50)).toBe(0);
    expect(positionForThumb(huge, 10_000)).toBe(huge.total - huge.visible);
    expect(positionForThumb({ total: 10, visible: 10, trackPx: 400 }, 100)).toBe(0);
  });
});
