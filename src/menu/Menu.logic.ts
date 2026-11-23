/** A point in window coordinates: where a secondary click landed. */
export interface MenuPoint {
  readonly x: number;
  readonly y: number;
}

/** A box in window coordinates: what a menu drops from (a crumb, a button). */
export interface MenuBox {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** A size in pixels. */
export interface MenuSize {
  readonly width: number;
  readonly height: number;
}

/** The room a menu keeps from the window's edges, and the gap it leaves under what it drops from, in pixels. */
export const MENU_MARGIN = 4;

/** Clamps `start` so `extent` fits between the margins of `room`; the margin wins where it cannot. */
const clamp = (start: number, extent: number, room: number): number =>
  Math.max(MENU_MARGIN, Math.min(start, room - MENU_MARGIN - extent));

/**
 * Where a menu stands, its top-left corner in window coordinates. Opened at
 * a point, it hangs down and right from it, moved in to stay inside the
 * window, and opens upward from the point when there is no room below.
 * Dropped from a box, it starts under the box's leading edge, a margin
 * below, and stands over the box instead when there is room above and none
 * below; either way it stays inside the window.
 */
export function placeMenu(
  from: { readonly point: MenuPoint } | { readonly box: MenuBox },
  size: MenuSize,
  viewport: MenuSize
): { readonly left: number; readonly top: number } {
  const room = (top: number): boolean => top + size.height <= viewport.height - MENU_MARGIN;

  if ('point' in from) {
    const { x, y } = from.point;
    const top = room(y) || y - size.height < MENU_MARGIN ? y : y - size.height;

    return {
      left: clamp(x, size.width, viewport.width),
      top: clamp(top, size.height, viewport.height)
    };
  }

  const { box } = from;
  const below = box.bottom + MENU_MARGIN;
  const above = box.top - MENU_MARGIN - size.height;
  const top = room(below) || above < MENU_MARGIN ? below : above;

  return {
    left: clamp(box.left, size.width, viewport.width),
    top: clamp(top, size.height, viewport.height)
  };
}

/** What a key pressed in an open menu does. */
export type MenuKeyAction =
  | { readonly kind: 'move'; readonly delta: number }
  | { readonly kind: 'edge'; readonly to: 'first' | 'last' }
  | { readonly kind: 'run' }
  | { readonly kind: 'close' };

/**
 * The menu's keys, as a desktop menu's: ↑ and ↓ move the cursor over the
 * items that can run, Home and End to the first and the last, Return and
 * Space run the cursor's item, Escape and Tab close it. A chord with a
 * modifier is not the menu's (null), and neither is any other key.
 */
export function menuKeyAction(
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>
): MenuKeyAction | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  if (event.key === 'Tab') return { kind: 'close' };
  if (event.shiftKey) return null;
  switch (event.key) {
    case 'ArrowUp':
      return { kind: 'move', delta: -1 };
    case 'ArrowDown':
      return { kind: 'move', delta: 1 };
    case 'Home':
      return { kind: 'edge', to: 'first' };
    case 'End':
      return { kind: 'edge', to: 'last' };
    case 'Enter':
    case ' ':
      return { kind: 'run' };
    case 'Escape':
      return { kind: 'close' };
    default:
      return null;
  }
}
