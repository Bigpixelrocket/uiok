import { useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';

import { placeTooltip, TOOLTIP_DELAY_MS } from './Tooltip.logic.js';

/** The tooltip on show: the control it belongs to and what it says. */
interface ShownTooltip {
  readonly anchor: Element;
  readonly label: string;
  readonly shortcut: string | null;
  /** Where the pointer rested, for a control wide enough to place the tooltip by it. */
  readonly pointerX: number;
}

const read = (anchor: Element, pointerX: number): ShownTooltip | null => {
  const label = anchor.getAttribute('data-tooltip');

  return label
    ? { anchor, label, shortcut: anchor.getAttribute('data-tooltip-shortcut'), pointerX }
    : null;
};

/**
 * The hover tooltip, drawn by the page instead of left to the system's
 * `title` tooltip, so the page decides when it opens and what it looks like.
 * Mount it once per window (near the root, beside `UiokProvider`); it serves
 * every control that carries `tooltip()` or `describedTooltip()`
 * attributes. The tooltip opens after the pointer rests on the control and
 * closes when the pointer leaves, on a press, on a key, on a scroll, and
 * when the window is resized. After a press or a key it stays away until the
 * pointer has left the control and come back, and it never opens while a
 * mouse button is held.
 *
 * The box hangs from the body, or from the element in full screen while
 * there is one: nothing outside that element is drawn, so a tooltip left on
 * the body would open behind a full-screen video.
 *
 * The pointer alone opens it. A control keeps its own accessible name, and a
 * tooltip that says more than its element is also the element's description
 * (`describedTooltip`), so a screen reader misses nothing.
 */
export function TooltipLayer(): ReactElement | null {
  const [shown, setShown] = useState<ShownTooltip | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The control the pointer is on, kept after a dismissal so the same
    // control does not open its tooltip again under a resting pointer.
    let over: Element | null = null;
    let pointerX = 0;
    let timer: number | undefined;

    const close = (): void => {
      window.clearTimeout(timer);
      setShown(null);
    };
    const leave = (): void => {
      over = null;
      close();
    };
    const track = (event: MouseEvent): void => {
      pointerX = event.clientX;
    };
    const move = (event: MouseEvent): void => {
      // A held button is a drag or a selection passing over, not a pointer come to rest.
      const anchor =
        event.buttons === 0 && event.target instanceof Element
          ? event.target.closest('[data-tooltip]')
          : null;

      if (anchor === over) {
        return;
      }

      over = anchor;
      close();

      if (anchor) {
        timer = window.setTimeout(() => {
          // The control may have gone, or lost its tooltip, while the pointer rested.
          setShown(anchor.isConnected ? read(anchor, pointerX) : null);
        }, TOOLTIP_DELAY_MS);
      }
    };

    document.addEventListener('mouseover', move);
    document.addEventListener('mousemove', track);
    document.addEventListener('mousedown', close, true);
    document.addEventListener('keydown', close, true);
    document.addEventListener('wheel', close, { capture: true, passive: true });
    document.documentElement.addEventListener('mouseleave', leave);
    // Entering or leaving full screen moves where the box must hang, and a
    // resize moves the control it was placed by.
    document.addEventListener('fullscreenchange', leave);
    window.addEventListener('resize', leave);
    window.addEventListener('blur', leave);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mouseover', move);
      document.removeEventListener('mousemove', track);
      document.removeEventListener('mousedown', close, true);
      document.removeEventListener('keydown', close, true);
      document.removeEventListener('wheel', close, true);
      document.documentElement.removeEventListener('mouseleave', leave);
      document.removeEventListener('fullscreenchange', leave);
      window.removeEventListener('resize', leave);
      window.removeEventListener('blur', leave);
    };
  }, []);

  // Placed from the drawn box, before the first paint, so the tooltip never shows out of place.
  useLayoutEffect(() => {
    const tip = tipRef.current;

    if (!shown || !tip) {
      return;
    }

    const { left, top } = placeTooltip(
      shown.anchor.getBoundingClientRect(),
      { width: tip.offsetWidth, height: tip.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
      shown.pointerX
    );

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }, [shown]);

  if (!shown) {
    return null;
  }

  return createPortal(
    <div className="tooltip" ref={tipRef} role="tooltip">
      <span className="tooltip-label">{shown.label}</span>
      {shown.shortcut !== null && <span className="tooltip-shortcut">{shown.shortcut}</span>}
    </div>,
    document.fullscreenElement ?? document.body
  );
}
