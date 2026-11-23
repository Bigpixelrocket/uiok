import {
  useRef,
  type DOMAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref
} from 'react';

import { isTextEditingTarget } from '../keyboard/Keyboard.logic.js';
import { useBellBeat } from '../menu/useBellBeat.js';

/**
 * The event handlers a host hangs on a pane or a region of the window for
 * its keys, its focus, its drop zone, and its menu; nothing that styles it.
 * `onContextMenu` is the region's own menu (open it at `event.clientX` and
 * `event.clientY`): it runs for a secondary click nothing inside the region
 * took (`unclaimedContextMenu`), so the innermost part with a menu wins (a
 * row's, then its pane's, then the region's around it) and one click never
 * opens two.
 */
export type RegionHandlers = Pick<
  DOMAttributes<HTMLElement>,
  | 'onBlur'
  | 'onContextMenu'
  | 'onDragEnter'
  | 'onDragLeave'
  | 'onDragOver'
  | 'onDrop'
  | 'onFocus'
  | 'onKeyDown'
  | 'onKeyDownCapture'
  | 'onMouseDown'
  | 'onPointerDown'
>;

/**
 * A secondary-click handler that runs only for a click nothing inside its
 * element took: a click whose default is already cancelled (a row's menu, a
 * terminal's, a `Menu` opened from inside, whose events reach its owner
 * through React) passes it by, and so does one in a text field (a text
 * input, a textarea, editable content, read-only ones too), which keeps the
 * browser's own Cut, Copy, and Paste. It cancels the browser's own menu
 * before it runs, so the parts around it pass the click by in turn, and one
 * click opens one menu, the innermost's.
 */
export const unclaimedContextMenu = <Target extends Element>(
  handler: ((event: MouseEvent<Target>) => void) | undefined
): ((event: MouseEvent<Target>) => void) | undefined =>
  handler === undefined
    ? undefined
    : (event) => {
        if (event.nativeEvent.defaultPrevented || isTextEditingTarget(event.target)) return;
        event.preventDefault();
        handler(event);
      };

/**
 * A region's handlers as its element wears them: as given, but for
 * `onContextMenu`, which runs only for a click nothing inside took
 * (`unclaimedContextMenu`). Every part that takes `RegionHandlers` spreads
 * these.
 */
export function regionHandlers<Handlers extends RegionHandlers>(handlers: Handlers): Handlers {
  const { onContextMenu } = handlers;

  return onContextMenu === undefined
    ? handlers
    : { ...handlers, onContextMenu: unclaimedContextMenu(onContextMenu) };
}

/** Props for {@link PaneBox}. */
export interface PaneBoxProps extends RegionHandlers {
  /** The pane holds the keyboard: its frame wears the accent. */
  readonly active?: boolean;
  /** The pane's accessible name, when its path bar does not name it. */
  readonly label?: string;
  /**
   * `danger` draws its frame, and its front tab's outline, in the danger
   * colour at rest, active, and in an inactive window (a production server).
   */
  readonly tone?: 'danger';
  /** The element it draws: a `section` by default, an `aside` for a sidebar. */
  readonly as?: 'section' | 'aside';
  /**
   * The visual bell: a count the host raises each time a key could not act
   * (a move past the last row, a verb the cursor row does not offer). Each
   * rise shoves the cursor row sideways for one beat; under reduced motion
   * the row flashes the selection fill instead. The count's value means
   * nothing; only its change rings.
   */
  readonly bell?: number;
  readonly ref?: Ref<HTMLElement>;
  /** Its tabs (`PaneTabs`), path bar, list, and status line, top to bottom. */
  readonly children?: ReactNode;
}

/**
 * A pane in the listing look (under the listing root a `WindowFrame`
 * wears): a framed column of its tab strip or path bar, its list, and its
 * status line. `active` marks the pane that holds the keyboard; the others
 * show their cursor row quietly. `bell` rings on its cursor row
 * (`useBellBeat`; `.bell-0`, `.bell-1`). Its `onContextMenu` takes a
 * secondary click no row or part inside it took.
 */
export function PaneBox({
  active = false,
  label,
  tone,
  as: Element = 'section',
  bell = 0,
  ref,
  children,
  ...handlers
}: PaneBoxProps): ReactElement {
  const beat = useBellBeat(bell);

  return (
    <Element
      aria-label={label}
      className={['pane', active ? 'active' : '', beat === null ? '' : `bell-${beat}`]
        .filter(Boolean)
        .join(' ')}
      data-tone={tone}
      ref={ref}
      {...regionHandlers(handlers)}
    >
      {children}
    </Element>
  );
}

/** Props for {@link PaneList}. */
export interface PaneListProps extends RegionHandlers {
  /**
   * The pane's home list, which the keys return to and Page Up and Page
   * Down measure (`data-pane-home`): focusable by script, out of the Tab order.
   */
  readonly home?: boolean;
  /** Its rows act on a click, so the row under the pointer lights. */
  readonly pointer?: boolean;
  readonly label?: string;
  readonly ref?: Ref<HTMLDivElement>;
  /** Its listings, rows, and notes. */
  readonly children?: ReactNode;
}

/**
 * The scrolling body of a pane, between its path bar and its status line:
 * the listings and notes the pane shows. As the pane's home, which holds
 * the focus while the keys move its cursor, it hands the keyboard's menu
 * key (the Menu key, Shift-F10) to the cursor row's `onContextMenu`, so a
 * row's menu is reached from the keys too.
 */
export function PaneList({
  home = false,
  pointer = false,
  label,
  ref,
  children,
  ...handlers
}: PaneListProps): ReactElement {
  const region = regionHandlers(handlers);
  // Whether the keyboard's menu key (the Menu key, Shift-F10) was the last
  // thing pressed: only it makes a menu the keyboard's, until the menu it
  // asks for, another key, or a press of the pointer. The event alone cannot
  // tell: Chromium sends the Menu key's as a mouse's pointer event.
  const menuKey = useRef(false);

  return (
    <div
      aria-label={label}
      className={pointer ? 'pane-list pointer' : 'pane-list'}
      data-pane-home={home ? '' : undefined}
      ref={ref}
      tabIndex={home ? -1 : undefined}
      {...region}
      onContextMenu={(event) => {
        const fromKeys = menuKey.current;
        menuKey.current = false;
        if (home && fromKeys && event.target === event.currentTarget) menuOnCursorRow(event);
        region.onContextMenu?.(event);
      }}
      onKeyDownCapture={(event) => {
        menuKey.current =
          event.key === 'ContextMenu' ||
          (event.key === 'F10' &&
            event.shiftKey &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.metaKey);
        region.onKeyDownCapture?.(event);
      }}
      onPointerDownCapture={() => {
        menuKey.current = false;
      }}
    >
      {children}
    </div>
  );
}

/**
 * The keyboard's menu key aimed at a pane's home, which holds the focus
 * while its cursor row does not: the cursor row with a menu of its own
 * (`Row`'s `onContextMenu`, `data-row-menu`) takes it, as a secondary click
 * on it, placed under the row's leading edge rather than wherever the
 * keyboard's event says, and the home's own claims none.
 */
function menuOnCursorRow(event: MouseEvent<HTMLElement>): void {
  const row = event.currentTarget.querySelector<HTMLElement>(
    '[data-row-key][aria-current="true"][data-row-menu]'
  );

  if (row === null || event.nativeEvent.defaultPrevented) return;

  const box = row.getBoundingClientRect();
  const rtl = getComputedStyle(row).direction === 'rtl';
  const click = new globalThis.MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: rtl ? box.right : box.left,
    clientY: box.bottom
  });

  row.dispatchEvent(click);
  if (click.defaultPrevented) event.preventDefault();
}
