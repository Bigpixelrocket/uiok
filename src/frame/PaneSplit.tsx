import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type RefObject
} from 'react';

/**
 * The lower pane's height each page was last dragged to, for as long as the
 * window lives, keyed by the page's split name. A page that comes back opens
 * at the height the user left it.
 */
const heldHeights = new Map<string, number>();

/** A list's rows: every row of a listing or a grid, its column strip aside. */
const LIST_ROWS = '[role="row"]:not(.pane-columns), .data-grid-row';

/**
 * How far a scroller's lower edge cuts into its last visible row: zero when
 * its rows fit or its edge falls between two rows. Rows may differ in
 * height (a wrapped name), so the cut row is found, not computed.
 */
export const cutRowDepth = (scroller: HTMLElement): number => {
  if (scroller.scrollHeight <= scroller.clientHeight + 1) return 0;

  const box = scroller.getBoundingClientRect();
  const bottom = box.top + scroller.clientTop + scroller.clientHeight;

  for (const row of scroller.querySelectorAll<HTMLElement>(LIST_ROWS)) {
    const edge = row.getBoundingClientRect();

    if (edge.bottom > bottom + 0.5) return edge.top < bottom ? Math.max(0, bottom - edge.top) : 0;
  }

  return 0;
};

/**
 * The least an upper list keeps under a dragged split: its own min-height,
 * and never under two rows, so a split held from a taller window never
 * leaves the list with nothing in a shorter one.
 */
const upperFloor = (top: HTMLElement): number => {
  const style = getComputedStyle(top);
  const row = Number.parseFloat(style.getPropertyValue('--row-height')) || 24;

  return Math.max(Number.parseFloat(style.minHeight) || 0, 2 * row);
};

/**
 * The lower pane's height under a dragged split: the height dragged, less
 * what the upper list must keep of the two regions' room (`floor`), and
 * never under the lower pane's own least (`least`), in whole pixels, none
 * left included; the height dragged stands alone only while the split is
 * not laid out (`room` null: a page held out of sight).
 */
export const heldSplitHeight = (
  held: number,
  room: number | null,
  bounds: { readonly floor: number; readonly least: number }
): number =>
  room === null
    ? Math.round(Math.max(bounds.least, held))
    : Math.round(Math.max(bounds.least, Math.min(held, room - bounds.floor)));

/**
 * The room the upper list and the lower pane share: from the list's top to
 * the end of their container's content box, less whatever follows the
 * lower pane, measured from the container so a lower pane held taller than
 * the room (and overflowing it) is not counted as room; null while the
 * container is not laid out.
 */
const splitRoom = (top: HTMLElement, pane: HTMLElement): number | null => {
  const parent = top.parentElement;

  // Not laid out (a page held out of sight): no room to fit to, which is
  // not the same as a page with no room left.
  if ((parent ?? top).getClientRects().length === 0) return null;

  if (parent === null)
    return top.getBoundingClientRect().height + pane.getBoundingClientRect().height;

  const box = parent.getBoundingClientRect();
  const end = box.top + parent.clientTop + parent.clientHeight;
  let after = 0;

  for (let next = pane.nextElementSibling; next !== null; next = next.nextElementSibling) {
    after += next.getBoundingClientRect().height;
  }

  return end - top.getBoundingClientRect().top - after;
};

/** One splitter between a page's upper list and its lower pane (`usePaneSplit`). */
export interface PaneSplit {
  /** The upper list's scroller, which gives way as the lower pane grows. */
  readonly upper: RefObject<HTMLDivElement | null>;
  /** The lower pane (`SplitDetail`), whose height the splitter sets. */
  readonly lower: RefObject<HTMLElement | null>;
  /** Starts a drag on the splitter's band. */
  readonly drag: (event: ReactPointerEvent<HTMLDivElement>) => void;
  /** Puts the lower pane back at the page's own share. */
  readonly reset: () => void;
}

/**
 * A splitter between a page's upper list and the pane under it: the user drags the divide, the height is
 * kept per page (`name`) while the window lives, and both regions come to
 * rest at a whole row. The upper list (`upper`, a `PaneList`'s ref) ends at
 * a row's lower edge (the slice it would have cut goes to the lower pane);
 * the lower pane's own list, the first match of `lowerScroller` inside it
 * (a `SplitDetail`'s body unless given), ends at a whole row with the rest
 * of the pane left empty under it.
 *
 * The lower pane is a flex item whose basis the splitter sets; until the
 * user drags, both regions take the sizes the page's stylesheet gives them. `layoutKey` changes when the rows change (a load, a
 * tab switch), so the rest is measured again; a window resize is observed.
 */
export function usePaneSplit(
  name: string,
  layoutKey: unknown,
  lowerScroller = '.split-detail-body'
): PaneSplit {
  const upper = useRef<HTMLDivElement | null>(null);
  const lower = useRef<HTMLElement | null>(null);
  const drag = useRef<AbortController | null>(null);
  const [held, setHeld] = useState<{ readonly name: string; readonly height: number | null }>(
    () => ({ name, height: heldHeights.get(name) ?? null })
  );
  // A page that changes its split's name while mounted takes that page's
  // kept height, not the one it was showing.
  const height = held.name === name ? held.height : (heldHeights.get(name) ?? null);
  const setHeight = useCallback(
    (next: number | null): void => setHeld({ name, height: next }),
    [name]
  );

  const settle = useCallback((): void => {
    const top = upper.current;
    const pane = lower.current;

    if (top === null || pane === null) return;

    const inner = pane.querySelector<HTMLElement>(lowerScroller);

    // Until a drag each region takes the share the stylesheet gives it (the
    // shorter one as tall as its rows, up to a cap); a dragged height holds
    // the lower pane there and gives the upper list the rest.
    pane.style.flex = height === null ? '' : `0 0 ${height}px`;
    pane.style.maxHeight = height === null ? '' : 'none';
    top.style.flex = height === null ? '' : '1 1 0';
    top.style.maxHeight = height === null ? '' : 'none';
    if (inner !== null) inner.style.maxHeight = '';

    const floor = upperFloor(top);

    // A height dragged in a taller window gives way in a shorter one, so the
    // upper list keeps its floor; the drag itself is kept for when the room
    // comes back.
    if (height !== null) {
      const room = splitRoom(top, pane);
      const least = Number.parseFloat(getComputedStyle(pane).minHeight) || 0;
      const fitted = heldSplitHeight(height, room, { floor, least });

      if (fitted !== height) pane.style.flex = `0 0 ${fitted}px`;
    }

    const cut = cutRowDepth(top);

    if (cut > 0) {
      const paneHeight = pane.getBoundingClientRect().height;
      const room = top.getBoundingClientRect().height - floor;

      // The cut slice goes to the lower pane, past the cap its stylesheet
      // gives it at rest; an upper list already at its floor keeps its
      // slice rather than overflow the page.
      if (cut <= room) {
        pane.style.flexBasis = `${paneHeight + cut}px`;
        pane.style.maxHeight = `${paneHeight + cut}px`;
      }
    }
    if (inner !== null) {
      const innerCut = cutRowDepth(inner);

      if (innerCut > 0) inner.style.maxHeight = `${inner.clientHeight - innerCut}px`;
    }
  }, [height, lowerScroller]);

  useLayoutEffect(settle, [settle, layoutKey]);

  // Observed again when the layout changes, so a list that mounts after a
  // load (its ref null at first) is watched from then on.
  useEffect(() => {
    const frame = upper.current?.parentElement;

    if (frame === null || frame === undefined || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(() => settle());

    observer.observe(frame);
    return () => observer.disconnect();
  }, [settle, layoutKey]);

  useEffect(() => () => drag.current?.abort(), []);

  const start = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const top = upper.current;
    const pane = lower.current;

    if (top === null || pane === null || event.button !== 0) return;
    event.preventDefault();
    drag.current?.abort();

    const listeners = new AbortController();
    const startY = event.clientY;
    const startHeight = pane.getBoundingClientRect().height;
    const least = Number.parseFloat(getComputedStyle(pane).minHeight) || 0;
    const most = startHeight + top.getBoundingClientRect().height - upperFloor(top);
    let latest = startHeight;
    const end = (): void => {
      listeners.abort();
      heldHeights.set(name, latest);
    };

    drag.current = listeners;
    window.addEventListener(
      'pointermove',
      (moved) => {
        latest = Math.round(
          Math.min(most, Math.max(least, startHeight - (moved.clientY - startY)))
        );
        setHeight(latest);
      },
      { signal: listeners.signal }
    );
    window.addEventListener('pointerup', end, { signal: listeners.signal });
    window.addEventListener('pointercancel', end, { signal: listeners.signal });
  };

  const reset = (): void => {
    heldHeights.delete(name);
    setHeight(null);
  };

  return { upper, lower, drag: start, reset };
}

/** Props for {@link PaneSplitter}. */
export interface PaneSplitterProps {
  /** The split it drags (`usePaneSplit`). */
  readonly split: PaneSplit;
}

/**
 * The splitter's band, between the upper list and the lower pane: the
 * resize cursor over the hairline that divides them. A double click puts
 * the divide back at the page's own share. The pointer drags it; the keys
 * reach both lists without it.
 */
export function PaneSplitter({ split }: PaneSplitterProps): ReactElement {
  return (
    <div
      aria-hidden
      className="pane-splitter"
      onDoubleClick={split.reset}
      onPointerDown={split.drag}
    />
  );
}

/** Props for {@link SplitDetail}. */
export interface SplitDetailProps {
  /** The split it is the lower pane of (`usePaneSplit`). */
  readonly split: PaneSplit;
  /** Kept at its head alone (its body folded away), whatever was dragged. */
  readonly folded?: boolean;
  /** Its accessible name ("Selected row"). */
  readonly label?: string;
  /** Its head, over the body that scrolls (a strip, a title with its verbs). */
  readonly head?: ReactNode;
  /** What it shows, in its scrolling body. */
  readonly children?: ReactNode;
}

/**
 * The pane under a page's list, under its `PaneSplitter`: as tall as what
 * it shows until dragged, up to 38% of the page and never under seven
 * dense rows, its body scrolling under its head.
 */
export function SplitDetail({
  split,
  folded = false,
  label,
  head,
  children
}: SplitDetailProps): ReactElement {
  return (
    <section
      aria-label={label}
      className={folded ? 'split-detail folded' : 'split-detail'}
      ref={split.lower}
    >
      {head}
      {folded ? null : <div className="split-detail-body">{children}</div>}
    </section>
  );
}
