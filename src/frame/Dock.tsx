import { Children, type ReactElement, type ReactNode, type Ref } from 'react';

import type { RegionHandlers } from '../pane/Pane.js';

/** Props for {@link Dock}. */
export interface DockProps extends RegionHandlers {
  /** Whether it shows; closed, it takes no room and keeps its state. */
  readonly open: boolean;
  /** Its accessible name ("Console"). */
  readonly label: string;
  /** The pane holds the keyboard: its frame wears the accent. */
  readonly active?: boolean;
  /** The divide over its top edge that sets its height (a `PaneSplitter`). */
  readonly resizer?: ReactNode;
  /** Its toolbar, over its body: a title, its facts, its verbs. */
  readonly bar?: ReactNode;
  readonly ref?: Ref<HTMLElement>;
  /** Its body: a `DockLog` over a `DockInput`, a `LogWell`, a terminal. */
  readonly children: ReactNode;
}

/**
 * A pane in the dock under the main pane (`WindowFrame`'s `dock`): the
 * divide over its top edge, its bar, then its body, which scrolls.
 */
export function Dock({
  open,
  label,
  active = false,
  resizer = null,
  bar = null,
  ref,
  children,
  ...handlers
}: DockProps): ReactElement {
  const classes = ['pane', 'window-dock', active ? 'active' : '', open ? '' : 'closed']
    .filter(Boolean)
    .join(' ');

  return (
    <section aria-label={label} className={classes} ref={ref} {...handlers}>
      {resizer}
      {bar === null ? null : <div className="dock-bar">{bar}</div>}
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
      {actions === undefined ? null : <div className="dock-log-actions">{actions}</div>}
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
