/*
 * What a two-pane layout's keys read off the rendered panes: the rows the
 * cursor walks, the controls a row or a path bar marks with the verbs the
 * keys run (`data-verb`, `data-page-verb`), and the stops Tab walks. The
 * panes say what they offer by these marks, so the keys run exactly what a
 * click would, disabled where the control is.
 */

import type { ControlVerb } from './PaneActions.js';
import { listingFirstStop, type TabOrder, type WalkPane } from './PaneKeys.logic.js';

/**
 * The elements in `root` matching `selector` that show: none inside a
 * `hidden` element under `root`, such as a page held mounted out of sight
 * behind the front tab (`PageSlot`), whose rows, home, and verbs the keys
 * never reach.
 */
const shownMatches = (root: Element, selector: string): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>(selector)].filter((match) => {
    const hidden = match.closest('[hidden]');

    return hidden === null || !root.contains(hidden) || hidden === root;
  });

/**
 * A pane's home that shows: the first `data-pane-home` element in it (the
 * sidebar's with `"sidebar"`) outside a hidden page, or null for none.
 * Internal to the pane area.
 */
export const shownHome = (pane: Element | null, sidebar = false): HTMLElement | null =>
  pane === null
    ? null
    : (shownMatches(pane, sidebar ? '[data-pane-home="sidebar"]' : '[data-pane-home]')[0] ?? null);

/** The rows a pane's cursor walks, top to bottom: its `data-row-key` elements that show. */
export const paneRows = (pane: Element | null): HTMLElement[] =>
  pane === null ? [] : shownMatches(pane, '[data-row-key]');

/** A pane's row by its key, or null for none. */
export const paneRow = (pane: Element | null, key: string | null): HTMLElement | null =>
  key === null ? null : (paneRows(pane).find((row) => row.dataset.rowKey === key) ?? null);

/** Whether a control takes a click: not disabled, not inert behind `aria-disabled`. */
const enabled = (control: HTMLElement): boolean =>
  !(control as HTMLButtonElement).disabled && control.getAttribute('aria-disabled') !== 'true';

/**
 * The control in `root` the keys run for `verb`, when it takes a click: the
 * first whose `data-verb` (or `data-page-verb`, with `attribute`) lists it.
 */
export function verbControl(
  root: Element | null,
  verb: ControlVerb,
  attribute: 'verb' | 'page-verb' = 'verb'
): HTMLElement | null {
  // The verb is quoted, so only a quote or a backslash in it needs escaping.
  const quoted = verb.replace(/["\\]/g, '\\$&');
  const control =
    root === null ? null : (shownMatches(root, `[data-${attribute}~="${quoted}"]`)[0] ?? null);

  return control !== null && enabled(control) ? control : null;
}

const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]';

/**
 * Whether Tab would stop on an element: focusable, not taken out of the
 * order, not disabled, not a hidden input, not hidden or inert, not inside a closed disclosure
 * (its summary aside), and, of a radio group, only its checked radio, or
 * its first while none is.
 */
function tabbable(element: HTMLElement): boolean {
  // `:disabled` also covers a control inside a disabled fieldset, which
  // refuses the focus though its own `disabled` is false.
  if (element.tabIndex < 0 || element.matches(':disabled')) return false;
  // A hidden input is never drawn, so it never takes the focus, whatever its tabindex.
  if (element instanceof HTMLInputElement && element.type === 'hidden') return false;
  if (element.closest('[hidden], [inert], [aria-hidden="true"]') !== null) return false;

  const details = element.closest('details');

  if (details !== null && !details.open && element.closest('summary')?.parentElement !== details) {
    return false;
  }

  if (element instanceof HTMLInputElement && element.type === 'radio' && element.name !== '') {
    const group = [
      ...(element.form ?? element.ownerDocument).querySelectorAll<HTMLInputElement>(
        `input[type="radio"][name="${CSS.escape(element.name)}"]`
      )
    ];

    return element.checked || (!group.some((radio) => radio.checked) && group[0] === element);
  }

  return true;
}

/** Every element in `root` Tab stops on, in document order. */
export const tabStops = (root: Element): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(tabbable);

/** Whether Tab stops on `element` itself, as `tabStops` judges it. */
export const isTabStop = (element: Element): element is HTMLElement =>
  element instanceof HTMLElement && element.matches(FOCUSABLE) && tabbable(element);

/** Where Tab or Shift-Tab goes next: the sidebar's home, the page's home, or a control. */
export type TabStop = 'sidebar' | 'page' | HTMLElement;

/** The sidebar Tab walks through (`sidebarStops` in `usePaneKeys`): its pane and its home. */
export interface SidebarTabStops {
  readonly pane: Element;
  readonly home: HTMLElement;
}

/** Sorts elements into document order. */
const inDocumentOrder = (a: Element, b: Element): number =>
  a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;

/**
 * Where Tab (or Shift-Tab, `back`) goes from `from` inside a two-pane layout.
 * Without `sidebar`, from the sidebar to the page's home either way; from the
 * page's home or a control of the main pane to the main pane's next control
 * in document order, and from the last one, or back from the first, to the
 * sidebar. With `sidebar`, the sidebar's controls are stops too: the
 * sidebar's and the page's stops, each pane's home among them where the
 * document puts it, make one cycle in document order that wraps at either
 * end. A row's controls are no stops (the cursor row's keys run them) unless
 * its listing keeps them in the Tab order (`Row`'s `tabbable`); a sidebar
 * row's never are. With `alone` (no sidebar shown) the page's stops make
 * the one cycle, wrapping at either end, and the sidebar is never named.
 * With `order` `listing`, each pane's listing comes first instead of where
 * the document puts it (`listingFirstStop`): the page's listing, its other
 * stops, then the sidebar's listing and, with `sidebar`, its stops.
 */
export function nextTabStop(
  main: Element,
  home: HTMLElement,
  from: TabStop,
  back: boolean,
  sidebar: SidebarTabStops | null = null,
  alone = false,
  order: TabOrder = 'document'
): TabStop {
  if (order === 'listing') {
    const page: WalkPane<TabStop> = {
      home: 'page',
      stops: tabStops(main).filter((stop) => stop !== home)
    };
    const side: WalkPane<TabStop> | null = alone
      ? null
      : {
          home: 'sidebar',
          stops:
            sidebar === null
              ? []
              : tabStops(sidebar.pane).filter(
                  (stop) => stop !== sidebar.home && stop.closest('[data-row-key]') === null
                )
        };
    const at: TabStop =
      from === home ? 'page' : sidebar !== null && from === sidebar.home ? 'sidebar' : from;

    return listingFirstStop(page, side, at, back);
  }

  if (from === 'sidebar' && sidebar === null) return 'page';

  const at = from === 'sidebar' ? (sidebar?.home ?? home) : from === 'page' ? home : from;
  // A pane's home is a stop of its own where the document order puts it,
  // before the controls inside it, though it is out of the Tab order itself.
  const sidebarStops =
    sidebar === null
      ? []
      : [
          ...tabStops(sidebar.pane).filter(
            (stop) => stop !== sidebar.home && stop.closest('[data-row-key]') === null
          ),
          sidebar.home
        ];
  const stops = [...tabStops(main).filter((stop) => stop !== home), home, ...sidebarStops].sort(
    inDocumentOrder
  );
  const index = stops.indexOf(at);
  const next =
    index >= 0
      ? stops[back ? index - 1 : index + 1]
      : back
        ? stops
            .filter((stop) => stop.compareDocumentPosition(at) & Node.DOCUMENT_POSITION_FOLLOWING)
            .pop()
        : stops.find((stop) => stop.compareDocumentPosition(at) & Node.DOCUMENT_POSITION_PRECEDING);
  const landed = next ?? (sidebar === null && !alone ? undefined : back ? stops.at(-1) : stops[0]);

  if (landed === undefined || landed === sidebar?.home) return 'sidebar';

  return landed === home ? 'page' : landed;
}

/**
 * The rows one Page Up or Page Down moves in a pane: what its home
 * (`data-pane-home`) shows of 24px rows, less one kept in view.
 */
export const pageRows = (pane: Element | null): number => {
  const list = shownHome(pane);

  return Math.max(1, Math.floor((list?.clientHeight ?? 0) / 24) - 1);
};

/**
 * The rows one Page Up (`back`) or Page Down moves from `rows[at]` in a
 * pane whose rows may differ in height (a row that grows to hold chips
 * that wrap): as many as its home shows past the row it starts on, so that
 * row stays in view, read from the rows' laid-out heights. Rows of one
 * height (24px) give what `pageRows` gives; with no row to start from, or
 * no laid-out height (a pane out of sight), it is `pageRows`.
 */
export const pageRowsFrom = (
  pane: Element | null,
  rows: readonly Element[],
  at: number,
  back: boolean
): number => {
  const start = rows[at];
  const room = shownHome(pane)?.clientHeight ?? 0;
  const kept = start?.getBoundingClientRect().height ?? 0;

  if (start === undefined || room === 0 || kept === 0) return pageRows(pane);

  let used = kept;
  let step = 0;

  for (
    let index = at + (back ? -1 : 1);
    index >= 0 && index < rows.length;
    index += back ? -1 : 1
  ) {
    used += rows[index]?.getBoundingClientRect().height ?? 0;
    if (used > room) break;
    step += 1;
  }
  return Math.max(1, step);
};

/** Brings a row the keys moved to into view, clear of its strip (the row's own scroll margin). */
export const showRow = (row: HTMLElement | null): void => {
  // Optional call: jsdom has no scrollIntoView.
  row?.scrollIntoView?.({ block: 'nearest' });
};
