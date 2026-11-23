import type { DOMAttributes, ReactElement, ReactNode, Ref } from 'react';

/**
 * The event handlers a host hangs on a pane or a region of the window for
 * its keys, its focus, and its drop zone; nothing that styles it.
 */
export type RegionHandlers = Pick<
  DOMAttributes<HTMLElement>,
  | 'onBlur'
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
  readonly ref?: Ref<HTMLElement>;
  /** Its tabs (`PaneTabs`), path bar, list, and status line, top to bottom. */
  readonly children?: ReactNode;
}

/**
 * A pane in the listing look (under the listing root a `WindowFrame`
 * wears): a framed column of its tab strip or path bar, its list, and its
 * status line. `active` marks the pane that holds the keyboard; the others
 * show their cursor row quietly.
 */
export function PaneBox({
  active = false,
  label,
  tone,
  as: Element = 'section',
  ref,
  children,
  ...handlers
}: PaneBoxProps): ReactElement {
  return (
    <Element
      aria-label={label}
      className={active ? 'pane active' : 'pane'}
      data-tone={tone}
      ref={ref}
      {...handlers}
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
      {...handlers}
    >
      {children}
    </div>
  );
}
