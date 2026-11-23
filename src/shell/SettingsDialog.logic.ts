/** Where a subsection starts, in pixels from the top of the scrolled content. */
export interface SubsectionAnchor {
  readonly id: string;
  readonly top: number;
}

/** A Settings page column's scroll state. */
export interface SettingsScrollView {
  readonly scrollTop: number;
  readonly clientHeight: number;
  readonly scrollHeight: number;
}

/**
 * How far below the column's top edge a subsection's start may sit and
 * still count as the one in view: the column's top padding and some slack,
 * so the subsection a sidebar click scrolled to is the one marked.
 */
export const SUBSECTION_SPY_SLACK_PX = 24;

/** The column's top padding, which a subsection keeps above it once scrolled to. */
export const SUBSECTION_SCROLL_INSET_PX = 14;

/**
 * The subsection the sidebar marks as in view: the last one whose start has
 * reached the column's top edge, or the last of all once the column is
 * scrolled to its end (a short last subsection never reaches the top). A
 * page that cannot scroll, or one not yet scrolled past its title, marks
 * its first. Null when the page has no subsections.
 */
export function spiedSubsection(
  anchors: readonly SubsectionAnchor[],
  view: SettingsScrollView
): string | null {
  const first = anchors[0];

  if (!first) {
    return null;
  }

  if (view.scrollHeight <= view.clientHeight + 1) {
    return first.id;
  }

  if (view.scrollTop + view.clientHeight >= view.scrollHeight - 1) {
    return anchors.at(-1)?.id ?? first.id;
  }

  const passed = anchors.filter((anchor) => anchor.top <= view.scrollTop + SUBSECTION_SPY_SLACK_PX);

  return passed.at(-1)?.id ?? first.id;
}

/**
 * Where to scroll the column to show a subsection: the top for the first,
 * so the page title stays in view, and otherwise the subsection's start
 * under the column's top padding. Null for an id the page does not draw.
 */
export function subsectionScrollTop(
  anchors: readonly SubsectionAnchor[],
  id: string
): number | null {
  const index = anchors.findIndex((anchor) => anchor.id === id);
  const anchor = anchors[index];

  if (!anchor) {
    return null;
  }

  return index === 0 ? 0 : Math.max(0, anchor.top - SUBSECTION_SCROLL_INSET_PX);
}
