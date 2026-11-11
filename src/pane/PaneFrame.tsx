import {
  Fragment,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode
} from 'react';

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
 * Lets a trail give way past its floor when its row cannot hold even the
 * cut trail and the tools at their least: the trail's floor drops to what
 * the row leaves it (`--pane-crumb-fit`), so no control is pushed past the
 * row's end, and `data-cramped` keeps the trail's last crumbs and fades its
 * start, where the broadest crumbs run past its box, instead of cutting one
 * mid glyph. The row's flex layout
 * cannot rank a floor below the tools' on its own: a floor is a hard
 * minimum, so this measures what the tools would lose and gives it back.
 */
function fitTrail(row: HTMLElement): void {
  const trail = row.querySelector<HTMLElement>(':scope > .pane-crumbs');
  const tools = row.querySelector<HTMLElement>(':scope > .path-tools');
  // Right to left mirrors the row, and a row that wraps (a host may set
  // its tools on a line of their own) has room for both: either keeps the
  // stylesheet's floor.
  if (trail === null) return;
  const layout = getComputedStyle(row);
  if (layout.direction === 'rtl' || layout.flexWrap !== 'nowrap') return;

  trail.style.removeProperty('--pane-crumb-fit');
  delete trail.dataset.cramped;

  // Where the trail and each tool end, margins included (a quiet action
  // reaches back over the inset by a negative margin), against the row's
  // end, less the inset the tools keep: past it, a control leaves the row.
  const outerEnd = (element: Element): number =>
    element.getBoundingClientRect().right +
    (parseFloat(getComputedStyle(element).marginRight) || 0);
  const end = row.getBoundingClientRect().right;
  const inset = tools === null ? 0 : parseFloat(getComputedStyle(tools).paddingRight) || 0;
  const over = Math.max(
    outerEnd(trail) - end,
    ...[...(tools?.children ?? [])].map((tool) => outerEnd(tool) + inset - end)
  );
  if (over >= 0.5) {
    trail.style.setProperty('--pane-crumb-fit', `${Math.max(0, trail.offsetWidth - over)}px`);
    trail.dataset.cramped = '';
    return;
  }

  // A trail alone in a row narrower than its floor runs past its own box.
  const last = trail.lastElementChild;
  const box =
    trail.getBoundingClientRect().right - (parseFloat(getComputedStyle(trail).paddingRight) || 0);
  if (last !== null && last.getBoundingClientRect().right > box + 0.5) trail.dataset.cramped = '';
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
 * as `PathFact`, compact verbs as `QuietAction` and `.path-star` icon
 * buttons. In a bar too narrow for everything the trail gives way first,
 * down to every crumb cut; then a fact cuts its words; and a trail deeper
 * than the row holds even so keeps its last crumbs and fades its start, so
 * no control is pushed out of the row.
 */
export function PanePathBar({
  trail,
  mark,
  heading = false,
  here,
  children
}: PanePathBarProps): ReactElement {
  const rowRef = useRef<HTMLDivElement>(null);

  // A row's width, its trail, and its tools all move the fit, so it is
  // measured after every render and whenever the row resizes.
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (row !== null) fitTrail(row);
  });
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (row === null || typeof ResizeObserver === 'undefined') return;
    const resizes = new ResizeObserver(() => fitTrail(row));

    resizes.observe(row);
    return () => resizes.disconnect();
  }, []);

  return (
    <div className="pane-path-row" ref={rowRef}>
      {/* The trail's floor holds every crumb cut (listing.css). */}
      <div className="pane-crumbs" style={{ '--pane-crumb-count': trail.length } as CSSProperties}>
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

/** Props for {@link PathFact}. */
export interface PathFactProps {
  /** A failure reads red, a change waiting for the user amber; a plain fact is dim. */
  readonly tone?: 'danger' | 'warning';
  /** Drawn before the words: the fact's `StateMark` (with `word=""`). */
  readonly mark?: ReactNode;
  /** The fact's words. */
  readonly children: string;
}

/**
 * A page's state at its path bar's end (`.path-facts`): an optional mark
 * and the fact's words. In a bar too narrow for everything, once the trail
 * has given what it can, the words cut with an ellipsis down to three
 * characters, and the whole fact opens as a tooltip only while it is cut.
 */
export function PathFact({ tone, mark, children }: PathFactProps): ReactElement {
  return (
    <span className={tone === undefined ? 'path-facts' : `path-facts ${tone}`}>
      {mark}
      <span className="path-fact-text" {...cutTooltip(children)}>
        {children}
      </span>
    </span>
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
