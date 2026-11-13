import {
  Fragment,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode
} from 'react';

import { cutTooltip, describedTooltip } from '../tooltip/Tooltip.logic.js';
import { InPathBarContext } from './PaneActions.js';
import { clearWordTips, giveWordTips } from './toolWords.js';

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

/** A fact of words alone, or of words after marks: the bar cuts its words. */
const WORDS_FACT = '.path-facts:not(:has(> :not(.pane-state, svg, :empty)))';

/**
 * Rests a trail its row cannot hold whole on its end, a slash first. The
 * layout itself is the stylesheet's (the trail gives way, then the tools,
 * then the trail below its floor); a trail that still runs past its box
 * scrolls, and only a script can say where it rests: on its end, so the
 * last crumb (where the pane is) shows, at the first slash that lets the
 * crumbs after it show whole. `--pane-crumb-fit` is the room after the
 * last crumb that lets the trail scroll that far, and `data-cramped` marks
 * the trail. While a crumb has the focus the trail stays where the focus
 * scrolled it. It also gives a fact of bare words, which the bar cuts, its
 * whole words as a tooltip while they are cut, as `PathFact` has.
 */
function fitTrail(row: HTMLElement): void {
  for (const fact of row.querySelectorAll<HTMLElement>(`:scope > .path-tools > ${WORDS_FACT}`)) {
    const words = fact.textContent ?? '';
    if (fact.dataset.pathFactTip === undefined && fact.hasAttribute('data-tooltip')) continue;
    if (words === '') continue;
    fact.dataset.pathFactTip = '';
    fact.dataset.tooltip = words;
    fact.dataset.tooltipCut = '';
  }

  // A row a host lets wrap holds its tools on a line of their own, where
  // they owe the trail no room (`data-wraps` lifts that cap).
  const wraps = getComputedStyle(row).flexWrap !== 'nowrap';
  if (wraps !== row.hasAttribute('data-wraps')) row.toggleAttribute('data-wraps', wraps);

  const trail = row.querySelector<HTMLElement>(':scope > .pane-crumbs');
  // Right to left keeps the browser's own scroll origin (decision recorded
  // in pane.md): the trail scrolls, and rests where the browser puts it.
  if (trail === null || getComputedStyle(trail).direction === 'rtl') return;

  // Measure the bar as the stylesheet lays it out, unpinned.
  const focused = trail.contains(document.activeElement);
  const first = trail.firstElementChild as HTMLElement | null;
  delete trail.dataset.cramped;
  trail.style.removeProperty('--pane-crumb-fit');
  first?.style.removeProperty('margin-inline-start');
  stepActionWords(row, trail);
  // While a crumb's menu is open the trail clips nothing, so it does not
  // scroll: its crumbs are shifted to where it would rest instead.
  const open = trail.querySelector('[aria-expanded="true"]') !== null;

  const max = trail.scrollWidth - trail.clientWidth;
  if (max < 1) {
    if (!focused) trail.scrollLeft = 0;
    return;
  }

  // Where each slash starts in the trail's scrolled content, less the
  // trail's start padding, which the slash keeps before it at rest, less
  // half the padding after the crumb before it: rounding either way then
  // shows only that padding, never a sliver of the crumb. The trail rests on
  // the first such point that lets every crumb after it show, pinned that
  // much narrower (`--pane-crumb-fit`, its width while
  // `data-cramped="pinned"`), and the room it leaves goes to the tools.
  const style = getComputedStyle(trail);
  const box = trail.getBoundingClientRect();
  const origin = box.left + trail.clientLeft - trail.scrollLeft;
  const inset = parseFloat(style.paddingLeft) / 2 || 0;
  const end = trail.lastElementChild?.getBoundingClientRect().right ?? box.right;
  // Fractional, as the boxes are: `clientWidth` rounds.
  const exact = end - origin + (parseFloat(style.paddingRight) || 0) - box.width;
  const rest =
    [...trail.querySelectorAll(':scope > .crumb-separator')]
      .map((slash) => slash.getBoundingClientRect().left - origin - inset)
      .find((at) => at >= exact - 0.5) ?? exact;
  const pinned = rest - exact >= 1;
  if (pinned) trail.style.setProperty('--pane-crumb-fit', `${box.width - (rest - exact)}px`);
  trail.dataset.cramped = pinned ? 'pinned' : '';
  if (open) first?.style.setProperty('margin-inline-start', `${-Math.ceil(rest)}px`);
  else if (!focused) trail.scrollLeft = trail.scrollWidth - trail.clientWidth;
}

/**
 * The bar's last step before the last crumb falls below its stem: its
 * quiet actions say their verbs with their icons alone (`data-tight` on
 * the row), as a row's actions do where values need the room. Each keeps
 * its accessible name, and one without a tooltip of its own takes its
 * word as one while the word is hidden.
 */
function stepActionWords(row: HTMLElement, trail: HTMLElement): void {
  delete row.dataset.tight;
  clearWordTips(row);
  const acts = row.querySelectorAll<HTMLElement>(':scope > .path-tools > .pane-act');
  const text = trail.lastElementChild?.querySelector<HTMLElement>('.crumb-text');
  if (acts.length === 0 || text == null) return;

  // The stem shows the shorter of the name and eight characters, and an
  // ellipsis after eight. Exact widths: a name a fraction of a pixel short
  // of its box already shows its ellipsis.
  const name = text.textContent ?? '';
  if (name.length === 0) return;
  const words = document.createRange();
  words.selectNodeContents(text);
  // A document without range geometry reads the whole pixels it has.
  const whole =
    typeof words.getBoundingClientRect === 'function'
      ? words.getBoundingClientRect().width
      : text.scrollWidth;
  const stem = name.length > 8 ? (whole / name.length) * 9 : whole;
  if (text.getBoundingClientRect().width >= stem - 0.01) return;

  row.dataset.tight = '';
  giveWordTips(acts);
}

/**
 * Brings a crumb the keyboard focuses wholly into view, its ring clear of
 * the fade at a side that hides more crumbs: the browser's own scroll on
 * focus stops at the trail's edge, under the fade.
 */
function showFocusedCrumb(trail: HTMLElement, crumb: Element): void {
  const style = getComputedStyle(trail);
  // The fade's depth, which the trail's scroll padding repeats as a length.
  const fade = parseFloat(style.scrollPaddingLeft) || 0;
  const ring = parseFloat(getComputedStyle(crumb).outlineWidth) || 0;
  const box = trail.getBoundingClientRect();
  const at = crumb.getBoundingClientRect();
  const max = trail.scrollWidth - trail.clientWidth;
  if (at.left - ring < box.left + fade && trail.scrollLeft > 0) {
    trail.scrollLeft = Math.max(
      0,
      Math.floor(trail.scrollLeft - (box.left + fade - (at.left - ring)))
    );
  } else if (at.right + ring > box.right - fade && trail.scrollLeft < max) {
    trail.scrollLeft = Math.min(
      max,
      Math.ceil(trail.scrollLeft + (at.right + ring - (box.right - fade)))
    );
  }
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
 * buttons. In a bar too narrow for everything, things give way in one
 * order (`pane.md`, "How a narrow bar gives way"): the crumbs before the
 * last, then the last down to a stem, then a fact's words, then the crumbs
 * before the last scroll out at the trail's start, then the quiet actions'
 * words step down to icons, then the last crumb cuts to one character.
 * Nothing is drawn over anything, and no control leaves the row. The bar
 * fits itself after every render and whenever any box in it resizes.
 */
export function PanePathBar({
  trail,
  mark,
  heading = false,
  here,
  children
}: PanePathBarProps): ReactElement {
  const rowRef = useRef<HTMLDivElement>(null);
  const sizes = useRef<ResizeObserver | null>(null);
  const last = trail.at(-1);
  const lastLabel = typeof last === 'string' ? last : (last?.label ?? '');

  // The trail's resting place follows every size in the bar: the row's,
  // the trail's, each crumb's, and each tool's (a word that changes on its
  // own, a font that loads late). So it is
  // fitted after every render, whenever one of those boxes resizes, once
  // the document's fonts are in, and when the focus leaves the trail.
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (row === null) return;
    let live = true;
    const fit = () => {
      if (live) fitTrail(row);
    };
    if (typeof ResizeObserver !== 'undefined') sizes.current = new ResizeObserver(fit);
    const left = (event: FocusEvent) => {
      const to = event.relatedTarget;
      if (!(to instanceof Node) || !(event.currentTarget as Node).contains(to)) fit();
    };
    // The browser scrolls a focused crumb into view after the focus
    // event, so the fade's room is added on the next frame.
    const shown = (event: FocusEvent) => {
      const trail = event.currentTarget as HTMLElement;
      const crumb = event.target;
      if (!(crumb instanceof Element) || crumb === trail) return;
      requestAnimationFrame(() => {
        if (live && document.activeElement === crumb) showFocusedCrumb(trail, crumb);
      });
    };
    const crumbs = row.querySelector<HTMLElement>(':scope > .pane-crumbs');
    // A crumb's menu opening or closing changes how the trail clips.
    const menus = typeof MutationObserver === 'undefined' ? null : new MutationObserver(fit);
    if (crumbs !== null) {
      menus?.observe(crumbs, { subtree: true, attributeFilter: ['aria-expanded'] });
    }
    crumbs?.addEventListener('focusout', left);
    crumbs?.addEventListener('focusin', shown);
    void document.fonts?.ready.then(fit);
    return () => {
      live = false;
      sizes.current?.disconnect();
      sizes.current = null;
      menus?.disconnect();
      crumbs?.removeEventListener('focusout', left);
      crumbs?.removeEventListener('focusin', shown);
    };
  }, []);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (row === null) return;
    const observer = sizes.current;
    if (observer !== null) {
      observer.disconnect();
      // Border boxes: the room the fit adds after the last crumb is
      // padding, which must not count as a resize of the trail.
      const border = { box: 'border-box' } as const;
      observer.observe(row, border);
      const crumbs = row.querySelector(':scope > .pane-crumbs');
      if (crumbs !== null) {
        observer.observe(crumbs, border);
        for (const crumb of crumbs.children) observer.observe(crumb, border);
      }
      // A tool that grows while the trail is pinned changes no box above.
      for (const tool of row.querySelectorAll(':scope > .path-tools > *')) {
        observer.observe(tool, border);
      }
    }
    fitTrail(row);
  });

  return (
    <div
      className="pane-path-row"
      ref={rowRef}
      style={
        {
          // The trail's floor (listing.css): its crumbs, and the last one's
          // stem, eight characters and an ellipsis or its whole name.
          '--pane-crumb-count': trail.length,
          '--pane-crumb-here-room': `${lastLabel.length > 8 ? 9 : lastLabel.length}ch`
        } as CSSProperties
      }
    >
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
        <div className="path-tools">
          <InPathBarContext.Provider value>{children}</InPathBarContext.Provider>
        </div>
      )}
    </div>
  );
}

/** Props for {@link PathFact}. */
export interface PathFactProps {
  /**
   * A failure (`danger`) or a change waiting for the user (`warning`): its
   * mark, a `StateMark` of the same tone, carries the colour, and its words
   * stand a step up from a plain fact's dim ones, in the text colour, never
   * red or amber. Set as a class (`.path-facts.danger`) a host may read.
   */
  readonly tone?: 'danger' | 'warning';
  /** Drawn before the words: the fact's `StateMark` (with `word=""`). */
  readonly mark?: ReactNode;
  /** The fact's words. */
  readonly children: string;
}

/**
 * A page's state at its path bar's end (`.path-facts`): an optional mark
 * and the fact's words, the mark one gap from them. In a bar too narrow for
 * everything, once the trail has given its floor, the words cut with an
 * ellipsis down to one character, and the whole fact opens as a tooltip
 * only while it is cut.
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
