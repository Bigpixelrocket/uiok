/**
 * A labelled grid of a component's states for a demo: each cell draws one
 * state (rest, hover, disabled, empty, overflowing) with a caption under it
 * naming the state, so every demo shows its states the same way. The cells
 * wrap to the width, two or more to a row on a phone.
 *
 * ```tsx
 * <DemoStates title="Edge states">
 *   <DemoState label="No rows, so disabled">
 *     <SelectAllBar checked={0} total={0} onCheckAll={() => undefined} />
 *   </DemoState>
 *   <DemoState label="Last page">…</DemoState>
 * </DemoStates>
 * ```
 */

import type { CSSProperties, ReactNode } from 'react';

/** Props for {@link DemoStates}. */
export interface DemoStatesProps {
  /** A small uppercase heading over the grid, when the demo has more than one group. */
  readonly title?: string;
  /**
   * The narrowest a cell gets before the grid moves a state to the next row,
   * as a CSS length; 140px by default. Give wide states (a bar, a strip) more.
   */
  readonly minCell?: string;
  /** The states, each a {@link DemoState}. */
  readonly children: ReactNode;
}

/** A grid of labelled states. */
export function DemoStates({ title, minCell, children }: DemoStatesProps) {
  const style =
    minCell === undefined ? undefined : ({ '--demo-state-min': minCell } as CSSProperties);
  return (
    <section aria-label={title} className="demo-states">
      {title === undefined ? null : <h3 className="demo-subhead">{title}</h3>}
      <ul className="demo-states-grid" style={style}>
        {children}
      </ul>
    </section>
  );
}

/** Props for {@link DemoState}. */
export interface DemoStateProps {
  /** What state the cell shows, in a few words ("Disabled", "Last page"). */
  readonly label: string;
  /** The component in that state. */
  readonly children: ReactNode;
}

/** One state in a {@link DemoStates} grid, its caption under it. */
export function DemoState({ label, children }: DemoStateProps) {
  return (
    <li className="demo-state">
      {children}
      <span className="demo-state-label">{label}</span>
    </li>
  );
}
