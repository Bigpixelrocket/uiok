import type { LucideIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type ReactElement } from 'react';

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
 * How far the strip's edge fade reaches, in pixels; `tabs.css` draws the
 * fade this wide, and a tab scrolled into view clears it.
 */
const EDGE_FADE = 24;

/**
 * Marks the sides of `strip` that hide tabs past its edge as
 * `data-overflow="start end"` (either, both, or the attribute removed), so
 * `tabs.css` fades those edges and a reader can tell more tabs are there.
 */
function markOverflow(strip: HTMLElement): void {
  const sides: string[] = [];

  if (strip.scrollLeft > 1) sides.push('start');
  if (strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1) sides.push('end');
  if (sides.length === 0) strip.removeAttribute('data-overflow');
  else strip.setAttribute('data-overflow', sides.join(' '));
}

/**
 * The tab of `strip` whose id is `id`, if it draws one. The id is compared
 * rather than put in a selector, so any string is a safe id, and no
 * `instanceof` check ties the lookup to this window's realm (a strip
 * rendered into an iframe's document has that window's elements).
 */
function tabOf(strip: HTMLElement, id: string): HTMLElement | null {
  for (const tab of strip.querySelectorAll<HTMLElement>('[data-page-tab]')) {
    if (tab.dataset.pageTab === id) return tab;
  }
  return null;
}

/**
 * Scrolls `strip` sideways, and only `strip`, so `tab` sits clear of the
 * edge fade, or as near as the scroll allows; a tab already clear stays
 * put. Smooth unless `instant` or the reader prefers reduced motion.
 */
function revealTab(strip: HTMLElement, tab: HTMLElement, instant: boolean): void {
  const bounds = strip.getBoundingClientRect();
  const box = tab.getBoundingClientRect();
  const before = box.left - (bounds.left + EDGE_FADE);
  const after = box.right - (bounds.right - EDGE_FADE);
  // A tab wider than the clear span shows its start.
  const wanted = before < 0 ? before : after > 0 ? Math.min(after, before) : 0;
  // Within the scroll there is: an end tab needs no move into the padding.
  const by = Math.max(
    -strip.scrollLeft,
    Math.min(wanted, strip.scrollWidth - strip.clientWidth - strip.scrollLeft)
  );

  if (by === 0) return;
  const still =
    instant || (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  strip.scrollBy({ left: by, behavior: still ? 'instant' : 'smooth' });
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
 * A strip too narrow for its tabs scrolls sideways: it fades each edge that
 * hides tabs (`data-overflow`), and keeps the current tab in view when it
 * first draws and whenever `current` or the tabs change, scrolling only
 * the strip, never the page.
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
  const drawn = useRef(false);
  // The tabs drawn, as a value that changes only when they do, not with
  // each new array a caller passes.
  const ids = JSON.stringify(tabs.map((tab) => tab.id));

  // The edge fade follows scrolling, resizing (a tab's look or font
  // included), and the tabs drawn.
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

  // The current tab stays in view: at once, before the first paint, when
  // the strip first draws tabs, then smoothly as it or the tabs change.
  useLayoutEffect(() => {
    const element = strip.current;
    if (element === null) return;
    const instant = !drawn.current;
    const tab = current === null ? null : tabOf(element, current);

    if (element.children.length > 0) drawn.current = true;
    if (tab !== null) revealTab(element, tab, instant);
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

  return (
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
          {look !== 'text' && <Icon aria-hidden size={13} />}
          {look !== 'icons' && <span>{name}</span>}
        </button>
      ))}
    </div>
  );
}
