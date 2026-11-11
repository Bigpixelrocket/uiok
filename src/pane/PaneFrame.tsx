import { Fragment, type ReactElement, type ReactNode } from 'react';

import { cutTooltip, describedTooltip } from '../tooltip/Tooltip.logic.js';

/** A crumb that is a control: a press goes to the place it names. */
export interface PaneCrumb {
  readonly label: string;
  /** Goes to the place the crumb names (a page's parent, its board). */
  readonly onOpen: () => void;
  /** What a press does, when the label alone does not say it. */
  readonly tip?: string;
}

/** Props for {@link PanePathBar}. */
export interface PanePathBarProps {
  /**
   * The trail, broadest first; the last crumb names what the pane shows.
   * A crumb is a label, or a control (`PaneCrumb`) that goes where it names.
   */
  readonly trail: readonly (string | PaneCrumb)[];
  /** A mark in the root crumb's slot, before the trail: a product mark or a glyph. */
  readonly mark?: ReactNode;
  /**
   * The last crumb is the page's `h2`; a sidebar's names no page. Only a
   * label crumb becomes the heading, so a heading's last crumb is a string.
   */
  readonly heading?: boolean;
  /** Drawn after the last crumb's label, inside its crumb: the `CurrentDot` of the one shown. */
  readonly here?: ReactNode;
  /** Facts and compact controls at the bar's end. */
  readonly children?: ReactNode;
}

/**
 * The row a pane opens with: a path bar, in the listing look (under
 * `.listing-root`). Its crumbs say where the pane is; one handed as a
 * `PaneCrumb` is a control that goes there. A narrow pane, or a longer
 * language, cuts a crumb with an ellipsis: the crumbs before the last give
 * way first, the last one only once they have. A cut crumb opens its whole
 * text as a tooltip, and a crumb in full view opens none (a control's
 * `tip`, when it has one, says what a press does instead, cut or not).
 * Facts and controls sit at the bar's end (`.path-tools`): a state
 * as `.path-facts`, compact verbs as `QuietAction` and `.path-star` icon
 * buttons.
 */
export function PanePathBar({
  trail,
  mark,
  heading = false,
  here,
  children
}: PanePathBarProps): ReactElement {
  return (
    <div className="pane-path-row">
      <div className="pane-crumbs">
        {mark !== undefined && (
          <span className="crumb root">
            <span className="crumb-label crumb-mark">{mark}</span>
          </span>
        )}
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          const label = typeof crumb === 'string' ? crumb : crumb.label;
          const Label = last && heading ? 'h2' : 'span';

          return (
            <Fragment key={`${index}:${label}`}>
              {index > 0 && (
                <span aria-hidden className="crumb-separator">
                  /
                </span>
              )}
              <span className={last ? 'crumb here' : 'crumb'}>
                {typeof crumb === 'string' ? (
                  <Label className="crumb-label">
                    {/* The words are cut in a block box, where the
                        ellipsis draws; the tooltip opens only while they
                        are cut, since a whole label needs no repeat. */}
                    <span className="crumb-text" {...cutTooltip(label)}>
                      {label}
                    </span>
                  </Label>
                ) : (
                  <button
                    className="crumb-label"
                    onClick={crumb.onOpen}
                    type="button"
                    {...describedTooltip(crumb.tip)}
                  >
                    {/* The words are cut in their own box, so the button's
                        hit area can reach past its drawn edge. A tip says
                        what a press does, so it stands alone; without one
                        the box shows its whole label while it cuts it. */}
                    <span
                      className="crumb-text"
                      {...(crumb.tip === undefined ? cutTooltip(label) : {})}
                    >
                      {label}
                    </span>
                  </button>
                )}
                {last && here}
              </span>
            </Fragment>
          );
        })}
      </div>
      {children !== undefined && children !== null && children !== false && (
        <div className="path-tools">{children}</div>
      )}
    </div>
  );
}

/** Props for {@link PaneStatus}. */
export interface PaneStatusProps {
  /** The summary of what the pane lists or shows ("12 items"). */
  readonly children?: ReactNode;
  /** Compact controls at the line's end (Reveal, Copy). */
  readonly tools?: ReactNode;
}

/**
 * The line a pane closes with: one summary of what the pane lists or
 * shows, and compact icon controls at its end (`tools`, `RowIconAction`s),
 * which the summary gives way to. A summary in words that a narrow pane
 * cuts with an ellipsis carries itself whole as its tooltip.
 */
export function PaneStatus({ children, tools }: PaneStatusProps): ReactElement {
  return (
    <footer className="pane-status">
      <span
        className="pane-summary"
        {...(typeof children === 'string' ? cutTooltip(children) : {})}
      >
        {children}
      </span>
      {tools !== undefined && tools !== null && tools !== false && (
        <span className="pane-status-tools">{tools}</span>
      )}
    </footer>
  );
}
