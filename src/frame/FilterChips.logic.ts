/*
 * The quick row of filters is one line that scrolls sideways under the
 * base sheet's inline edge fade, with no scrollbar drawn. A trackpad
 * scrolls it sideways on its own; a plain mouse wheel sends only a
 * vertical delta, which these rules turn onto the line.
 */

/** A wheel event's deltas, as the DOM reports them. */
export interface WheelDeltas {
  readonly deltaX: number;
  readonly deltaY: number;
  /** `WheelEvent.deltaMode`: 0 pixels, 1 lines, 2 pages. */
  readonly deltaMode: number;
}

/** Where a sideways scroller stands: its `scrollLeft`, `scrollWidth`, and `clientWidth`. */
export interface SidewaysBox {
  readonly scrollLeft: number;
  readonly scrollWidth: number;
  readonly clientWidth: number;
}

/** How far one wheel line moves the line, in pixels: a listing row's height (`--row-height`). */
const LINE_PIXELS = 24;

/**
 * How far a wheel moves a sideways line, as a change to its `scrollLeft`,
 * or null to leave the event alone: when it is mostly sideways already (a
 * trackpad, or Shift with a wheel, which the browser turns sideways
 * itself), when the line has nothing hidden, and when the line already
 * stands at the end the wheel points to, so the page under it scrolls as
 * it would without the line. Down moves toward the line's end, which is
 * its left in a right-to-left line (`rtl`), where `scrollLeft` runs from 0
 * down to less than 0.
 */
export function sidewaysWheel(wheel: WheelDeltas, box: SidewaysBox, rtl = false): number | null {
  if (wheel.deltaY === 0 || Math.abs(wheel.deltaX) >= Math.abs(wheel.deltaY)) return null;

  const room = box.scrollWidth - box.clientWidth;

  if (room <= 0) return null;

  const unit = wheel.deltaMode === 1 ? LINE_PIXELS : wheel.deltaMode === 2 ? box.clientWidth : 1;
  const delta = wheel.deltaY * unit;
  const along = rtl ? -box.scrollLeft : box.scrollLeft;
  // Within half a pixel of an end counts as there: scroll positions are fractional at 2x.
  const atStart = along <= 0.5;
  const atEnd = along >= room - 0.5;

  if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return null;

  return rtl ? -delta : delta;
}
