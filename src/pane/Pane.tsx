import type { DOMAttributes, MouseEvent, ReactElement, ReactNode, Ref } from 'react';

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
 * through React) passes it by. It cancels the browser's own menu before it
 * runs, so the parts around it pass the click by in turn, and one click
 * opens one menu, the innermost's.
 */
export const unclaimedContextMenu = <Target extends Element>(
  handler: ((event: MouseEvent<Target>) => void) | undefined
): ((event: MouseEvent<Target>) => void) | undefined =>
  handler === undefined
    ? undefined
    : (event) => {
        if (event.nativeEvent.defaultPrevented) return;
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
 * the listings and notes the pane shows.
 */
export function PaneList({
  home = false,
  pointer = false,
  label,
  ref,
  children,
  ...handlers
}: PaneListProps): ReactElement {
  return (
    <div
      aria-label={label}
      className={pointer ? 'pane-list pointer' : 'pane-list'}
      data-pane-home={home ? '' : undefined}
      ref={ref}
      tabIndex={home ? -1 : undefined}
      {...regionHandlers(handlers)}
    >
      {children}
    </div>
  );
}
