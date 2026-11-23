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
 * Where a menu opens from: a point (a secondary click's), a box it drops
 * from (a crumb, a button), or the box of the item whose submenu it is,
 * which it stands beside (on the item's inline-end side, the right unless
 * `rtl`).
 */
export type MenuFrom =
  | { readonly point: MenuPoint }
  | { readonly box: MenuBox }
  | { readonly beside: MenuBox; readonly rtl?: boolean };

/**
 * Where a menu stands, its top-left corner in window coordinates. Opened at
 * a point, it hangs down and right from it, moved in to stay inside the
 * window, and opens upward from the point when there is no room below.
 * Dropped from a box, it starts under the box's leading edge, a margin
 * below, and stands over the box instead when there is room above and none
 * below. A submenu stands beside its item, on the item's inline-end side,
 * its first item level with it (a margin above the item's top, the menu's
 * own padding), and on the other side when the window has no room on that
 * one; when neither side has room it keeps to the side with more. Every
 * way it stays inside the window. A menu its stylesheet caps at the
 * window's height less both margins (`.menu-popup`) measures at that cap,
 * so it starts at the top margin.
 */
export function placeMenu(
  from: MenuFrom,
  size: MenuSize,
  viewport: MenuSize
): { readonly left: number; readonly top: number } {
  const room = (top: number): boolean => top + size.height <= viewport.height - MENU_MARGIN;

  if ('beside' in from) {
    const { beside: item, rtl = false } = from;
    const after = item.right;
    const before = item.left - size.width;
    const fitsAfter = after + size.width <= viewport.width - MENU_MARGIN;
    const fitsBefore = before >= MENU_MARGIN;
    const roomAfter = viewport.width - item.right;
    const roomBefore = item.left;
    // Its own side while it fits there; the other while that fits; else the roomier one.
    const startsAfter = rtl
      ? !fitsBefore && (fitsAfter || roomAfter > roomBefore)
      : fitsAfter || (!fitsBefore && roomAfter >= roomBefore);

    return {
      left: clamp(startsAfter ? after : before, size.width, viewport.width),
      top: clamp(item.top - MENU_MARGIN, size.height, viewport.height)
    };
  }

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

/**
 * What a key pressed in an open menu does. `open` and `back` are the arrows
 * along the line: into the cursor's submenu, and out of a submenu to its
 * item. `close` closes one level (Escape: a submenu, else the menu), or
 * with `all` the whole menu (Tab).
 */
export type MenuKeyAction =
  | { readonly kind: 'move'; readonly delta: number }
  | { readonly kind: 'edge'; readonly to: 'first' | 'last' }
  | { readonly kind: 'run' }
  | { readonly kind: 'open' }
  | { readonly kind: 'back' }
  | { readonly kind: 'close'; readonly all: boolean };

/**
 * The menu's keys, as a desktop menu's: ↑ and ↓ move the cursor over the
 * items that can run, Home and End to the first and the last, Return and
 * Space run the cursor's item (or open its submenu), → opens the cursor's
 * submenu and ← goes back out of one (the other way round when `rtl`, so
 * the arrow points where the submenu stands), Escape closes one level and
 * Tab the whole menu. A chord with a modifier is not the menu's (null),
 * and neither is any other key.
 */
export function menuKeyAction(
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>,
  rtl = false
): MenuKeyAction | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  if (event.key === 'Tab') return { kind: 'close', all: true };
  if (event.shiftKey) return null;
  switch (event.key) {
    case 'ArrowUp':
      return { kind: 'move', delta: -1 };
    case 'ArrowDown':
      return { kind: 'move', delta: 1 };
    case 'ArrowRight':
      return { kind: rtl ? 'back' : 'open' };
    case 'ArrowLeft':
      return { kind: rtl ? 'open' : 'back' };
    case 'Home':
      return { kind: 'edge', to: 'first' };
    case 'End':
      return { kind: 'edge', to: 'last' };
    case 'Enter':
    case ' ':
      return { kind: 'run' };
    case 'Escape':
      return { kind: 'close', all: false };
    default:
      return null;
  }
}
