/**
 * The scaled scrollbar of the text and hex views. A page element tops out
 * near 33 million pixels, which a few million rows exceed, so the views draw
 * no full-height list: the thumb's place on its track maps to a byte of the
 * file instead, and dragging it jumps to that byte.
 */

/** The smallest thumb, so a huge file's thumb can still be grabbed. */
export const MIN_THUMB_PX = 24;

/** What the scrollbar maps between: a span of bytes, the part in view, and where the view starts. */
export interface ScrollSpan {
  /** Bytes the scrollbar spans, the file's text without any byte order mark. */
  readonly total: number;
  /** Bytes the screen shows, which sizes the thumb. */
  readonly visible: number;
  /** Track height in pixels. */
  readonly trackPx: number;
}

/** The thumb's height and its distance from the top of the track, in pixels. */
export interface ThumbGeometry {
  readonly heightPx: number;
  readonly topPx: number;
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

const thumbHeight = ({ total, visible, trackPx }: ScrollSpan): number =>
  clamp(
    total > 0 ? (trackPx * visible) / total : trackPx,
    Math.min(MIN_THUMB_PX, trackPx),
    trackPx
  );

/** How far the view can move: the span less what one screen shows. */
const scrollable = ({ total, visible }: ScrollSpan): number => Math.max(0, total - visible);

/** The thumb for a view starting `position` bytes into the span. */
export function thumbGeometry(span: ScrollSpan, position: number): ThumbGeometry {
  const heightPx = thumbHeight(span);
  const room = span.trackPx - heightPx;
  const range = scrollable(span);

  return { heightPx, topPx: range > 0 ? room * clamp(position / range, 0, 1) : 0 };
}

/**
 * The byte, counted into the span, that a thumb dragged to `topPx` points
 * at: the inverse of `thumbGeometry`. The top of the track is the first
 * byte; the bottom is the last screen.
 */
export function positionForThumb(span: ScrollSpan, topPx: number): number {
  const room = span.trackPx - thumbHeight(span);

  return room > 0 ? Math.round(scrollable(span) * clamp(topPx / room, 0, 1)) : 0;
}
