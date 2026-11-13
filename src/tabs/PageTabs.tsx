import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type ReactElement } from 'react';

import { ICON_MD } from '../icon/index.js';
import type { LinkLook } from '../pane/PaneActions.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';

/** One tab of a page's strip. */
export interface PageTab<Id extends string> {
  /** Names the tab to `onSelect`; also its `data-page-tab` attribute. */
  readonly id: Id;
  /** The tab's name. */
  readonly label: string;
  /** The tab's icon. */
  readonly icon: LucideIcon;
}

/**
 * The room, in pixels, the chevron takes at an edge that hides tabs; no
 * tab is drawn there. `tabs.css` sizes the chevron (`--space-12`) and the
 * strip's snap padding to match.
 */
const EDGE = 24;

/** Slack for subpixel tab boxes, so a tab that fits is never taken for cut. */
const SLACK = 0.5;

/**
 * The span of `strip`, in viewport pixels, where a tab is drawn: its box,
 * less the chevron's room at each edge `data-overflow` marks.
 */
function clearSpan(strip: HTMLElement): { readonly start: number; readonly end: number } {
  const bounds = strip.getBoundingClientRect();
  const sides = strip.getAttribute('data-overflow') ?? '';

  return {
    start: bounds.left + (sides.includes('start') ? EDGE : 0),
    end: bounds.right - (sides.includes('end') ? EDGE : 0)
  };
}

/** The tabs of `strip`, in drawing order. */
function tabsOf(strip: HTMLElement): HTMLElement[] {
  return [...strip.querySelectorAll<HTMLElement>('[data-page-tab]')];
}

/**
 * Marks the sides of `strip` that hide tabs past its edge as
 * `data-overflow="start end"` (either, both, or the attribute removed), so
 * `tabs.css` shows a chevron there, and marks `data-clipped` every tab that
 * does not lie whole in the clear span, which `tabs.css` does not draw: the
 * strip shows whole tabs only, ending after the last one that fits. A tab
 * wider than the clear span can never lie whole in it, so it is drawn cut
 * wherever it crosses the span, and stays visible and clickable.
 */
function markOverflow(strip: HTMLElement): void {
  const sides: string[] = [];

  if (strip.scrollLeft > 1) sides.push('start');
  if (strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1) sides.push('end');
  if (sides.length === 0) strip.removeAttribute('data-overflow');
  else strip.setAttribute('data-overflow', sides.join(' '));

  const span = clearSpan(strip);

  for (const tab of tabsOf(strip)) {
    const box = tab.getBoundingClientRect();
    const whole = box.left >= span.start - SLACK && box.right <= span.end + SLACK;
    const oversized =
      box.width > span.end - span.start + SLACK && box.right > span.start && box.left < span.end;

    tab.toggleAttribute('data-clipped', !whole && !oversized);
  }
}

/**
 * The tab of `strip` whose id is `id`, if it draws one. The id is compared
 * rather than put in a selector, so any string is a safe id, and no
 * `instanceof` check ties the lookup to this window's realm (a strip
 * rendered into an iframe's document has that window's elements).
 */
function tabOf(strip: HTMLElement, id: string): HTMLElement | null {
  return tabsOf(strip).find((tab) => tab.dataset.pageTab === id) ?? null;
}

/**
 * Scrolls `strip` by `by`, kept within its scroll, at once: a desktop tab
 * strip moves by a step, it does not glide.
 */
function scrollStrip(strip: HTMLElement, by: number): void {
  const within = Math.max(
    -strip.scrollLeft,
    Math.min(by, strip.scrollWidth - strip.clientWidth - strip.scrollLeft)
  );

  if (within === 0) return;
  strip.scrollBy({ left: within, behavior: 'instant' });
}

/**
 * Scrolls `strip` sideways, and only `strip`, so `tab` lies whole clear of
 * the chevrons' room, or as near as the scroll allows; a tab already clear
 * stays put. The strip snaps to tab starts (`tabs.css`), so the scroll
 * lands on one: a tab behind the start edge comes to rest at the start
 * chevron's inner edge, and one past the end edge brings in the first tab
 * start that clears it, which the snap then keeps.
 */
function revealTab(strip: HTMLElement, tab: HTMLElement): void {
  const bounds = strip.getBoundingClientRect();
  const box = tab.getBoundingClientRect();
  const before = box.left - (bounds.left + EDGE);
  const after = box.right - (bounds.right - EDGE);
  let wanted = 0;

  if (before < 0) wanted = before;
  else if (after > 0) {
    // The first tab start that, at the chevron's inner edge, clears this
    // tab; a tab wider than the clear span shows its own start.
    wanted = before;
    for (const other of tabsOf(strip)) {
      const start = other.getBoundingClientRect().left - (bounds.left + EDGE);

      if (start >= after) {
        wanted = Math.min(start, before);
        break;
      }
    }
  }
  scrollStrip(strip, wanted);
}

/**
 * Pages `strip` toward `side` by whole tabs: toward the end, the first tab
 * not drawn there comes to rest at the start chevron's inner edge; toward
 * the start, the strip rests on the earliest tab start that still shows
 * the last tab not drawn there whole. Either rest is a tab start, which
 * the strip's mandatory snap keeps. A tab wider than the clear span, which
 * no rest shows whole, is passed by its start, so every page moves.
 */
function pageStrip(strip: HTMLElement, side: 'start' | 'end'): void {
  const bounds = strip.getBoundingClientRect();
  const span = clearSpan(strip);
  const tabs = tabsOf(strip).map((tab) => tab.getBoundingClientRect());
  const inner = bounds.left + EDGE;
  let by: number | undefined;

  if (side === 'end') {
    const next = tabs.find((box) => box.right > span.end + SLACK && box.left > inner + SLACK);
    if (next !== undefined) by = next.left - inner;
  } else {
    const last = tabs.filter((box) => box.left < span.start - SLACK).at(-1);
    const room = bounds.width - 2 * EDGE;
    if (last !== undefined) {
      const first = tabs.find((box) => box.left >= last.right - room) ?? last;
      by = Math.min(first.left, last.left) - inner;
    }
  }
  scrollStrip(strip, by ?? (side === 'start' ? -1 : 1) * Math.max(EDGE, bounds.width - 2 * EDGE));
}

/** Props for {@link PageTabs}, over the type of its tab ids. */
export interface PageTabsProps<Id extends string> {
  /** The strip's accessible name, what it holds the tabs of ("Project pages"). */
  readonly label: string;
  /** The tabs, in the order they draw. */
  readonly tabs: readonly PageTab<Id>[];
  /** The tab whose page is shown, or null when the page shown is no tab's. */
  readonly current: Id | null;
  /** Called with the tab a click or an arrow key opens. */
  readonly onSelect: (id: Id) => void;
  /** Draws the second, smaller strip a tab's own pages take under the first. */
  readonly pills?: boolean;
  /** How each tab draws: its icon and name (the default), its name alone, or its icon alone, named on hover. */
  readonly look?: LinkLook;
}

/**
 * The tab strip a page draws under its path bar: one tab per page of the
 * level shown, in the order the caller gives, the current one marked. A
 * level's home page that is no tab of its own passes `current` as null, so
 * no tab is marked. A tablist with roving focus: Left and Right move
 * between tabs and open the one they reach, as a native tab bar does, and
 * keep those keys from any listing cursor around it; Tab enters on the
 * current tab. `pills` draws the second, smaller strip a tab's own pages
 * take under the first.
 *
 * A strip too narrow for its tabs scrolls sideways and draws whole tabs
 * only: a tab that would be cut at an edge is not drawn (`data-clipped`),
 * and each edge that hides tabs (`data-overflow`) shows a small chevron in
 * its own room, which a click pages the strip toward by whole tabs. The
 * chevron is left out of the tab order and the accessibility tree, where
 * the arrow keys already reach every tab; a tab not drawn stays in both.
 * The strip comes to rest on a tab start, and keeps the current tab whole
 * and in view when it first draws and whenever `current` or the tabs
 * change, scrolling only the strip, never the page.
 */
export function PageTabs<Id extends string>({
  label,
  tabs,
  current,
  onSelect,
  pills = false,
  look = 'both'
}: PageTabsProps<Id>): ReactElement {
  const strip = useRef<HTMLDivElement>(null);
  const focusable = current ?? tabs[0]?.id ?? null;
  // The tabs drawn, as a value that changes only when they do, not with
  // each new array a caller passes.
  const ids = JSON.stringify(tabs.map((tab) => tab.id));

  // The edge marks and the tabs drawn whole follow scrolling, resizing (a
  // tab's look or font included), and the tabs drawn.
  useEffect(() => {
    const element = strip.current;
    if (element === null) return;
    const mark = (): void => markOverflow(element);
    const resizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(mark);

    mark();
    element.addEventListener('scroll', mark, { passive: true });
    resizes?.observe(element);
    for (const tab of element.children) resizes?.observe(tab);
    return () => {
      element.removeEventListener('scroll', mark);
      resizes?.disconnect();
    };
  }, [ids]);

  // The current tab stays in view, before the strip paints, when it first
  // draws tabs and whenever the current tab or the tabs change.
  useLayoutEffect(() => {
    const element = strip.current;
    if (element === null) return;
    const tab = current === null ? null : tabOf(element, current);

    if (tab !== null) revealTab(element, tab);
  }, [current, ids]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;

    const at = tabs.findIndex((tab) => tab.id === (event.target as HTMLElement).dataset.pageTab);
    const next = tabs[at + (event.key === 'ArrowLeft' ? -1 : 1)];

    event.preventDefault();
    // The tab keeps its arrows from the pane's cursor.
    event.stopPropagation();
    if (next === undefined) return;
    onSelect(next.id);
    if (strip.current !== null) tabOf(strip.current, next.id)?.focus();
  };

  const chevron = (side: 'start' | 'end'): ReactElement => {
    const Icon = side === 'start' ? ChevronLeft : ChevronRight;

    return (
      // The pointer's shortcut to tabs past an edge; the arrow keys reach
      // them all, so the chevron is neither a tab stop nor announced.
      <button
        aria-hidden
        className={`page-tabs-more ${side}`}
        onClick={() => {
          if (strip.current !== null) pageStrip(strip.current, side);
        }}
        tabIndex={-1}
        type="button"
      >
        <Icon aria-hidden size={ICON_MD} />
      </button>
    );
  };

  return (
    <div className={pills ? 'page-tabs-frame pills' : 'page-tabs-frame'}>
      <div
        aria-label={label}
        className={pills ? 'page-tabs pills' : 'page-tabs'}
        onKeyDown={onKeyDown}
        ref={strip}
        role="tablist"
      >
        {tabs.map(({ id, label: name, icon: Icon }) => (
          <button
            aria-label={look === 'icons' ? name : undefined}
            aria-selected={id === current}
            className="page-tab"
            data-page-tab={id}
            key={id}
            onClick={() => onSelect(id)}
            role="tab"
            tabIndex={id === focusable ? 0 : -1}
            type="button"
            {...(look === 'icons' ? tooltip(name) : {})}
          >
            {look !== 'text' && <Icon aria-hidden size={ICON_MD} />}
            {/* data-label sizes the name for its bold weight, so no tab moves when the current one changes. */}
            {look !== 'icons' && <span data-label={name}>{name}</span>}
          </button>
        ))}
      </div>
      {chevron('start')}
      {chevron('end')}
    </div>
  );
}
