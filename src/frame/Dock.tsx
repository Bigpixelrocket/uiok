import {
  Children,
  useLayoutEffect,
  useState,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref
} from 'react';

import type { RegionHandlers } from '../pane/Pane.js';
import { useSharedRef } from './sharedRef.js';
import { drawn } from './WindowFrame.js';

/**
 * The height a dock takes: the height its host keeps, between `min` and
 * the room under the band less what the main pane keeps (`pageMin`), in
 * whole pixels; `min` alone wins when the room is smaller still, none left
 * included. The kept height stands alone only while the frame is not laid
 * out (`room` null: hidden, or not yet drawn).
 */
export function dockHeight(
  kept: number,
  room: number | null,
  bounds: { readonly min: number; readonly pageMin: number }
): number {
  if (room === null) return Math.round(Math.max(bounds.min, kept));

  return Math.round(Math.max(bounds.min, Math.min(kept, room - bounds.pageMin)));
}

/** An element's height with its bottom margin, or 0 for none. */
const outerHeight = (element: Element | null): number =>
  element === null
    ? 0
    : element.getBoundingClientRect().height +
      (Number.parseFloat(getComputedStyle(element).marginBottom) || 0);

/**
 * The room the main pane and the dock share: from the main pane's top to
 * the end of the frame's content, less the tray, the legend, and the gaps
 * under the main pane and the dock. Measured from the frame, so a dock held
 * taller than a shrunken window (and squashing the main pane) is not
 * counted as room; null while the frame is not laid out (hidden or not
 * yet drawn), never mistaken for a frame with no room left.
 */
const sharedRoom = (dock: HTMLElement): number | null => {
  const slot = dock.closest('.window-frame-dock');
  const frame = dock.closest('.window-frame');
  const main = slot?.parentElement?.querySelector<HTMLElement>(':scope > .window-frame-main');

  if (slot === null || frame === null || main === null || main === undefined) return null;
  if (frame.getClientRects().length === 0) return null;

  const box = frame.getBoundingClientRect();
  const end =
    box.top +
    frame.clientTop +
    frame.clientHeight -
    (Number.parseFloat(getComputedStyle(frame).paddingBottom) || 0);
  const tray = slot.parentElement?.querySelector(':scope > .window-frame-tray') ?? null;
  const legend = frame.querySelector(':scope > .window-frame-legend');
  const gaps =
    (Number.parseFloat(getComputedStyle(main).marginBottom) || 0) +
    (Number.parseFloat(getComputedStyle(dock).marginBottom) || 0);

  return end - main.getBoundingClientRect().top - outerHeight(tray) - outerHeight(legend) - gaps;
};

/** Props for {@link Dock}. */
export interface DockProps extends RegionHandlers {
  /** Whether it shows; closed, it takes no room and keeps its state. */
  readonly open: boolean;
  /** Its accessible name ("Console"). */
  readonly label: string;
  /**
   * The height in pixels the host keeps for it. It never grows with what
   * it shows (its body scrolls), and it gives way to keep `pageMin` for
   * the main pane over it in a short window.
   */
  readonly height: number;
  /** The least the main pane over it keeps, in pixels; 160 unless given. */
  readonly pageMin?: number;
  /** The pane holds the keyboard: its frame wears the accent. */
  readonly active?: boolean;
  /** `danger` draws its frame in the danger colour (a production server's console). */
  readonly tone?: 'danger';
  /**
   * Hears each height a drag of its top edge reaches; none draws no edge.
   * The edge's accessible name is `resizeLabel`.
   */
  readonly onResize?: (height: number) => void;
  /** Hears the height a drag ends on, to keep. */
  readonly onResizeEnd?: (height: number) => void;
  /** The edge's accessible name ("Resize the console"). */
  readonly resizeLabel?: string;
  /** Its toolbar, over its body: a title, its facts, its verbs. */
  readonly bar?: ReactNode;
  readonly ref?: Ref<HTMLElement>;
  /** Its body: a `DockLog` over a `DockInput`, a `LogWell`, a terminal. */
  readonly children: ReactNode;
}

/** The least a dock is: its bar and a line of its body. */
const DOCK_MIN = 64;

/**
 * A pane in the dock under the main pane (`WindowFrame`'s `dock`): its
 * bar, then its body, which scrolls, at the height its host keeps. With
 * `onResize` its top edge, in the gap over it, drags its height, the
 * main pane keeping `pageMin`; a window too short for both gives the dock
 * the less room, never the main pane.
 */
export function Dock({
  open,
  label,
  height,
  pageMin = 160,
  active = false,
  tone,
  onResize,
  onResizeEnd,
  resizeLabel,
  bar = null,
  ref,
  children,
  ...handlers
}: DockProps): ReactElement {
  const [self, attach] = useSharedRef(ref);
  const [room, setRoom] = useState<number | null>(null);
  const bounds = { min: DOCK_MIN, pageMin };
  const shown = dockHeight(height, room, bounds);

  useLayoutEffect(() => {
    const element = self.current;
    const frame = element?.closest('.window-frame');

    if (!open || element === null || frame === null || frame === undefined) return undefined;

    const measure = (): void => setRoom(sharedRoom(element));

    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(measure);
    const main = element
      .closest('.window-frame-dock')
      ?.parentElement?.querySelector(':scope > .window-frame-main');

    // The frame for a window resize, the main pane's slot for a tray or a
    // legend that comes, goes, or changes height in a frame of fixed size.
    // The room leaves the dock's own height out, so its change settles.
    observer.observe(frame);
    if (main !== null && main !== undefined) observer.observe(main);
    return () => observer.disconnect();
  }, [open, self]);

  const start = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0 || onResize === undefined || self.current === null) return;
    event.preventDefault();

    const edge = event.currentTarget;
    const startY = event.clientY;
    const startRoom = sharedRoom(self.current);
    let last = shown;

    edge.setPointerCapture?.(event.pointerId);

    const move = (next: globalThis.PointerEvent): void => {
      last = dockHeight(shown - (next.clientY - startY), startRoom, bounds);
      onResize(last);
    };
    const end = (): void => {
      edge.removeEventListener('pointermove', move);
      edge.removeEventListener('pointerup', end);
      edge.removeEventListener('pointercancel', end);
      onResizeEnd?.(last);
    };

    edge.addEventListener('pointermove', move);
    edge.addEventListener('pointerup', end);
    edge.addEventListener('pointercancel', end);
  };

  const classes = ['pane', 'window-dock', active ? 'active' : '', open ? '' : 'closed']
    .filter(Boolean)
    .join(' ');

  return (
    <section
      aria-label={label}
      className={classes}
      data-tone={tone}
      ref={attach}
      style={{ height: shown }}
      {...handlers}
    >
      {onResize === undefined ? null : (
        <div
          aria-label={resizeLabel}
          aria-orientation="horizontal"
          aria-valuemin={DOCK_MIN}
          aria-valuenow={shown}
          className="pane-splitter"
          onPointerDown={start}
          role="separator"
        />
      )}
      {drawn(bar) ? <div className="dock-bar">{bar}</div> : null}
      <div className="dock-body">{children}</div>
    </section>
  );
}

/** Props for {@link DockLog}. */
export interface DockLogProps {
  /** Its accessible name ("Activity"). */
  readonly label: string;
  /** What it says while it has no entry. */
  readonly empty?: ReactNode;
  readonly ref?: Ref<HTMLOListElement>;
  /** Its entries (`DockLogEntry`), the newest last. */
  readonly children?: ReactNode;
}

/**
 * A dock's log: its entries over a hairline each, the newest at the foot;
 * entries far from the foot skip layout until scrolled to.
 */
export function DockLog({ label, empty, ref, children }: DockLogProps): ReactElement {
  return (
    <ol aria-label={label} className="dock-log selectable" ref={ref}>
      {Children.count(children) === 0 && empty !== undefined ? (
        <li className="dock-log-empty">{empty}</li>
      ) : (
        children
      )}
    </ol>
  );
}

/** Props for {@link DockLogEntry}. */
export interface DockLogEntryProps {
  /** What happened. */
  readonly children: ReactNode;
  /** Its verbs, on a line under it (Show, Retry). */
  readonly actions?: ReactNode;
}

/** One entry of a `DockLog`, with its verbs under it. */
export function DockLogEntry({ children, actions }: DockLogEntryProps): ReactElement {
  return (
    <li className="dock-log-entry">
      {children}
      {drawn(actions) ? <div className="dock-log-actions">{actions}</div> : null}
    </li>
  );
}

/** Props for {@link DockInput}. */
export interface DockInputProps {
  /** The control it holds (a field, an editor). */
  readonly children: ReactNode;
}

/**
 * What a dock takes typed in, at its log's foot, ringed while it holds the
 * keyboard; it grows with what it holds up to half the dock, then scrolls.
 */
export function DockInput({ children }: DockInputProps): ReactElement {
  return <div className="dock-input">{children}</div>;
}
