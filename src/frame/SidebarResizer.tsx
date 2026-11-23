import type { PointerEvent, ReactElement } from 'react';

/** Props for {@link SidebarResizer}. */
export interface SidebarResizerProps {
  /** The sidebar's width now, in pixels. */
  readonly width: number;
  /** The narrowest the drag makes it. */
  readonly min: number;
  /** The widest the drag makes it, whatever the room. */
  readonly max: number;
  /** The least the page beside it keeps; the drag stops there. */
  readonly pageMin: number;
  /** The separator's accessible name ("Resize the sidebar"). */
  readonly label: string;
  /** Hears each width the drag reaches. */
  readonly onResize: (width: number) => void;
  /** Hears the width the drag ends on, to keep. */
  readonly onResizeEnd: (width: number) => void;
}

/**
 * The width a drag of the sidebar's edge gives: the start width moved by
 * the pointer, kept between `min` and the widest the room allows (`max`,
 * and the room less `pageMin`; `max` alone before the room is laid out),
 * in whole pixels.
 */
export function draggedWidth(
  start: number,
  moved: number,
  room: number,
  bounds: { readonly min: number; readonly max: number; readonly pageMin: number }
): number {
  const widest =
    room > 0 ? Math.min(bounds.max, Math.max(bounds.min, room - bounds.pageMin)) : bounds.max;

  return Math.round(Math.min(widest, Math.max(bounds.min, start + moved)));
}

/**
 * The sidebar's edge (`window-frame-resizer`), in the gap beside the page:
 * the pointer drags it, the width following the pointer and kept on
 * release. It measures the room from the window frame it stands in.
 */
export function SidebarResizer({
  width,
  min,
  max,
  pageMin,
  label,
  onResize,
  onResizeEnd
}: SidebarResizerProps): ReactElement {
  const start = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return;
    event.preventDefault();

    const handle = event.currentTarget;
    const frame = handle.closest('.window-frame, .space-root') ?? handle.parentElement;
    const room = frame?.getBoundingClientRect().width ?? 0;
    const startX = event.clientX;
    let last = width;

    handle.setPointerCapture?.(event.pointerId);

    const move = (next: globalThis.PointerEvent): void => {
      last = draggedWidth(width, next.clientX - startX, room, { min, max, pageMin });
      onResize(last);
    };
    const end = (): void => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      onResizeEnd(last);
    };

    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };

  return (
    <div
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemax={max}
      aria-valuemin={min}
      aria-valuenow={width}
      className="window-frame-resizer"
      onPointerDown={start}
      role="separator"
    />
  );
}
