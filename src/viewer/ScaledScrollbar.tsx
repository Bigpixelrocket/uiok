import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement
} from 'react';

import { positionForThumb, thumbGeometry, type ScrollSpan } from './ScaledScroll.logic.js';
import { useElementHeight } from './useElementHeight.js';

/** Track height before the track is measured (or where it never is). */
const FALLBACK_TRACK_PX = 600;

/** How long the thumb stays after the last scroll, as the terminal's does. */
const SCROLLBAR_LINGER_MS = 1000;

/**
 * Whether the view moved within the last moment. The bar rests hidden, as
 * the platform's overlay bar does, and shows while `position` changes and
 * for {@link SCROLLBAR_LINGER_MS} after; the first position never shows it.
 */
function useScrolling(position: number): boolean {
  const [scrolling, setScrolling] = useState(false);
  const shown = useRef(position);

  useEffect(() => {
    if (shown.current === position) return undefined;
    shown.current = position;
    setScrolling(true);
    const timer = window.setTimeout(() => setScrolling(false), SCROLLBAR_LINGER_MS);
    return () => window.clearTimeout(timer);
  }, [position]);

  return scrolling;
}

/**
 * The text and hex views' scrollbar. Its thumb sits where `position` falls
 * in a span of `total` units of which `visible` show (bytes, in both views);
 * dragging the thumb reports the position it points at, and a click on the
 * track above or below the thumb asks for a page that way. A span that
 * shows whole draws the track alone: the gutter stays, the thumb goes.
 * The thumb shows only while the view scrolls or the pointer is on the
 * bar (`data-scrolling`, which ScaledScrollbar.css reads).
 */
function ScaledScrollbar({
  total,
  visible,
  position,
  onDrag,
  onPage
}: {
  readonly total: number;
  readonly visible: number;
  readonly position: number;
  /** The position, counted into the span, the dragged thumb points at. */
  readonly onDrag: (position: number) => void;
  readonly onPage: (direction: -1 | 1) => void;
}): ReactElement {
  const [trackRef, trackHeight] = useElementHeight();
  const span: ScrollSpan = { total, visible, trackPx: trackHeight ?? FALLBACK_TRACK_PX };
  const thumb = thumbGeometry(span, position);
  const scrolling = useScrolling(position);

  const onThumbDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    const grabbedAt = event.clientY - thumb.topPx;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const onMove = (move: PointerEvent): void => {
      onDrag(positionForThumb(span, move.clientY - grabbedAt));
    };
    // Losing the capture ends the drag too: it follows pointerup, and comes
    // alone when the system cancels the pointer.
    const onUp = (): void => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('lostpointercapture', onUp);
    };

    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('lostpointercapture', onUp);
  };

  const onTrackDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    onPage(event.clientY - bounds.top < thumb.topPx ? -1 : 1);
  };

  return (
    <div
      aria-hidden="true"
      className="scaled-scrollbar"
      data-scrolling={scrolling ? '' : undefined}
      onPointerDown={onTrackDown}
      ref={trackRef}
    >
      <div
        className="scaled-scrollbar-thumb"
        hidden={visible >= total}
        onPointerDown={onThumbDown}
        style={{ height: thumb.heightPx, transform: `translateY(${thumb.topPx}px)` }}
      />
    </div>
  );
}

export default ScaledScrollbar;
