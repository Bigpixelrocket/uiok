import { CircleCheck, CircleDashed, CircleX, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { ICON_MD } from '../icon/sizes.js';
import { cutTooltip, tooltip } from '../tooltip/Tooltip.logic.js';

/**
 * Where a fact stands: `ready` found and working, `warning` found but
 * needing a look, `danger` missing or failing, `muted` not checked or not
 * in use.
 */
export type FactTone = 'ready' | 'warning' | 'danger' | 'muted';

/** Each tone's glyph: a shape of its own, so a fact's state reads without its hue. */
const GLYPHS: Readonly<Record<FactTone, LucideIcon>> = {
  ready: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
  muted: CircleDashed
};

/** Props for {@link FactTable}. */
export interface FactTableProps {
  /** The table's accessible name: "Tools". */
  readonly label: string;
  /** Its rows (`FactRow`). */
  readonly children: ReactNode;
}

/**
 * A short table of facts on a settings page or a detail page, one thing a
 * row: the state glyph of each, its name, a detail (where it is, in the
 * code face), and a value at the row's end (a version, "found"), the
 * columns aligned across the rows and ruled by hairlines above, between,
 * and under them. For what a page checks and reports, not for what the user
 * edits (a `FieldRow`'s) or a list the keys move through (a `Listing`).
 * Draws `.fact-table` with `role="table"`.
 */
export function FactTable({ label, children }: FactTableProps): ReactElement {
  return (
    <div aria-label={label} className="fact-table" role="table">
      {children}
    </div>
  );
}

/** Props for {@link FactRow}. */
export interface FactRowProps {
  /** Where the fact stands, which picks its glyph and the glyph's tone. */
  readonly tone: FactTone;
  /** The state in words, the glyph's accessible name and tooltip: "Found", "Missing". */
  readonly toneLabel: string;
  /** What the fact is about: "Homebrew". */
  readonly name: string;
  /** Where it is, or how it is found, in the code face: a path, a command. A string cut short shows whole in its tooltip. */
  readonly detail?: ReactNode;
  /** The value at the row's end, in the code face: a version, "found". */
  readonly value?: ReactNode;
}

/**
 * One row of a `FactTable`: its state glyph in the state's text tone (a
 * check, a warning triangle, a cross, or a dashed ring, each a shape of its
 * own), the name in the interface face, the detail and the value in the
 * code face, the value right-aligned. The words can be swept and copied.
 */
export function FactRow({ tone, toneLabel, name, detail, value }: FactRowProps): ReactElement {
  const Glyph = GLYPHS[tone];

  return (
    <div className="fact-row" data-tone={tone} role="row">
      <span className="fact-state" role="cell">
        <Glyph aria-label={toneLabel} role="img" size={ICON_MD} {...tooltip(toneLabel)} />
      </span>
      <span className="fact-name" role="cell" {...cutTooltip(name)}>
        {name}
      </span>
      <span
        className="fact-detail"
        role="cell"
        {...(typeof detail === 'string' ? cutTooltip(detail) : {})}
      >
        {detail}
      </span>
      <span className="fact-value" role="cell">
        {value}
      </span>
    </div>
  );
}
