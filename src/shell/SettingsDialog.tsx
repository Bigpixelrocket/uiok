import { CircleAlert, Settings, type LucideIcon } from 'lucide-react';
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentType, MouseEvent, ReactElement, ReactNode } from 'react';

import { Button } from '../button/Button.js';
import { ModalDialog } from '../dialog/ModalDialog.js';
import { ICON_MD } from '../icon/sizes.js';
import { useLabels } from '../labels/UiokProvider.js';
import { cutTooltip } from '../tooltip/Tooltip.logic.js';
import {
  spiedSubsection,
  subsectionScrollTop,
  type SubsectionAnchor
} from './SettingsDialog.logic.js';
import {
  SettingsPageKeysContext,
  settingsLegend,
  type SettingsPageKeys
} from './SettingsPageKeys.js';
import {
  SETTINGS_PAGE_HEAD_ATTRIBUTE,
  SETTINGS_REVEAL_ATTRIBUTE,
  SETTINGS_SUBSECTION_ATTRIBUTE
} from './SettingsSubsection.js';

/** A subsection of a Settings page: the sidebar lists it and scrolls the page to it. */
export interface SettingsSubsectionEntry {
  /** Matches the `id` the page passes to its `SettingsSubsection`. */
  readonly id: string;
  readonly title: string;
}

/** One page of the Settings dialog, with its body ready to draw. */
export interface SettingsPage {
  /** Unique across every page in the dialog. */
  readonly id: string;
  /** The sidebar row's label and the page's title. */
  readonly title: string;
  /** The sidebar row's glyph. */
  readonly Icon: ComponentType<{ readonly size?: number; readonly 'aria-hidden'?: boolean }>;
  /** The page's subsections, in the order its body draws them; the sidebar unfolds them under the chosen page. */
  readonly subsections: readonly SettingsSubsectionEntry[];
  /**
   * The body takes the column's whole height, so a part of it can scroll in
   * its own box (an updates page's notes) while the rest stays put.
   */
  readonly fills?: boolean;
  /** A short label the page's sidebar row shows after its title as a warning chip (an offered build's version); none for none. */
  readonly chip?: string | null;
  readonly body: ReactNode;
}

/** A sidebar header and the pages under it, in the order they are listed. */
export interface SettingsGroup {
  readonly id: string;
  readonly title: string;
  readonly pages: readonly SettingsPage[];
}

/**
 * A request to show Settings on one page: the page's id and a number that
 * grows with every request, so a repeat for the page already chosen still
 * counts as a new one.
 */
export interface SettingsPageRequest {
  readonly pageId: string;
  readonly seq: number;
}

/** Props for {@link SettingsDialog}. */
export interface SettingsDialogProps {
  /** The pages under their headers; the dialog opens on the first page unless `pageRequest` names another. */
  readonly groups: readonly SettingsGroup[];
  /** The page to open on, and to turn to whenever a new request arrives; null for the first page. */
  readonly pageRequest?: SettingsPageRequest | null;
  /** Hears the id of each page as it comes into view, the first included. */
  readonly onPageShown?: (pageId: string) => void;
  /**
   * What stands over the page column, outside its scroll, on the page in
   * view (a change a settings file could not take: `SettingsSaveFailure`);
   * `choosePage` turns the dialog to another page.
   */
  readonly notice?: (pageId: string, choosePage: (pageId: string) => void) => ReactNode;
  /** The title strip's glyph; a gear unless given. */
  readonly icon?: LucideIcon;
  /** Done, Escape, or a press outside the dialog with no page keys of its own. */
  readonly onClose: () => void;
}

const DIALOG_LABEL_ID = 'settings-dialog-title';
const PAGE_TITLE_ID = 'settings-page-title';

/**
 * Where each subsection drawn in the content column starts, in page order,
 * less the height of a sticky page head, so a subsection reads as reaching
 * the top once it reaches the head's lower edge.
 */
const subsectionAnchors = (column: HTMLElement): SubsectionAnchor[] => {
  const columnTop = column.getBoundingClientRect().top - column.scrollTop;
  const head =
    column.querySelector<HTMLElement>(`[${SETTINGS_PAGE_HEAD_ATTRIBUTE}]`)?.offsetHeight ?? 0;

  return [...column.querySelectorAll<HTMLElement>(`[${SETTINGS_SUBSECTION_ATTRIBUTE}]`)].map(
    (section) => ({
      id: section.getAttribute(SETTINGS_SUBSECTION_ATTRIBUTE) ?? '',
      top: section.getBoundingClientRect().top - columnTop - head
    })
  );
};

/**
 * Opens a page's view: the column at its top, and, when the page marks a
 * control to reveal (`SETTINGS_REVEAL_ATTRIBUTE`) that is not wholly in
 * view there, the column scrolled to show it whole, resting where an edge
 * starts at the page's top padding: the edge of the group that holds it
 * where the column can scroll that far, else the nearest edge of a row in
 * the group past the least scroll that shows the control. Where no edge
 * fits because the page ends too soon, the page gains just the room at its
 * foot that lets it rest on the nearest edge, so it never opens on a row
 * half under the top fade. A control already in view moves nothing. Where
 * the row above the group ends below that edge, it rests on that row's foot
 * instead, so the first thing in view is whole. It measures in layout
 * pixels (the column's rendered height over its layout height), since the
 * dialog opens scaling up and a reselect runs at whatever frame that
 * animation has reached.
 */
function openPageView(column: HTMLElement): void {
  column.style.paddingBlockEnd = '';
  column.scrollTop = 0;

  const chosen = column.querySelector<HTMLElement>(`[${SETTINGS_REVEAL_ATTRIBUTE}]`);

  if (chosen === null) return;

  const view = column.getBoundingClientRect();
  const scale = column.offsetHeight > 0 ? view.height / column.offsetHeight || 1 : 1;
  const top = (element: Element): number =>
    (element.getBoundingClientRect().top - view.top) / scale;
  const bottom = (element: Element): number =>
    (element.getBoundingClientRect().bottom - view.top) / scale;
  const height = column.offsetHeight;
  const cardTop = top(chosen);
  const cardBottom = bottom(chosen);

  if (cardTop >= 0 && cardBottom <= height) return;

  const inset = Number.parseFloat(getComputedStyle(column).paddingTop) || 0;
  const group = chosen.closest<HTMLElement>('[role="radiogroup"]') ?? chosen;
  const edge = (element: Element): number => top(element) - inset;
  const margin = Number.parseFloat(getComputedStyle(chosen).scrollMarginBlockEnd) || 0;
  const least = cardBottom + margin > height ? cardBottom + margin - height : cardTop - inset;
  const range = column.scrollHeight - column.clientHeight;
  const marginTop = Number.parseFloat(getComputedStyle(chosen).scrollMarginBlockStart) || 0;
  const furthest = cardTop - Math.max(inset, marginTop);
  const most = Math.min(range, furthest);
  const reachable = [group, ...column.querySelectorAll('[role="radiogroup"] > *')]
    .map(edge)
    .filter((offset) => offset >= least && offset <= furthest)
    .sort((left, right) => left - right);
  const edges = reachable.filter((offset) => offset <= most);
  const groupEdge = edge(group);
  const chosenRest =
    groupEdge >= least && groupEdge <= most ? groupEdge : (edges[0] ?? reachable[0] ?? least);
  // The foot of the row before the group: the lowest of the cells before
  // the group's own cell in its grid that end above the group.
  const cell = group.parentElement ?? group;
  const groupTop = top(group);
  let previousFoot = Number.NEGATIVE_INFINITY;
  let previousCell: Element | null = null;

  for (
    let sibling = cell.previousElementSibling;
    sibling;
    sibling = sibling.previousElementSibling
  ) {
    const foot = bottom(sibling);

    if (foot <= groupTop && foot > previousFoot) {
      previousFoot = foot;
      previousCell = sibling;
    }
  }

  const lastLine = previousCell?.lastElementChild ?? previousCell;
  const back = lastLine === null ? Number.NaN : top(lastLine) - inset;
  let rest = chosenRest;

  if (previousFoot > chosenRest && previousFoot < groupTop) {
    if (previousFoot <= furthest) {
      rest = previousFoot;
    } else if (back >= least && back < chosenRest) {
      rest = back;
    }
  }

  if (rest > range) {
    const padding = Number.parseFloat(getComputedStyle(column).paddingBlockEnd) || 0;

    column.style.paddingBlockEnd = `${padding + rest - range}px`;
  }

  column.scrollTop = rest;
  chosen.scrollIntoView?.({ block: 'nearest' });
}

/** A press on a sidebar row leaves the focus where it was, as a list row's does. */
const keepFocus = (event: MouseEvent): void => event.preventDefault();

/**
 * The sidebar: the pages under their headers, the chosen page unfolding its
 * subsections on a rail, the one in view marked. Every row is a button in
 * the Tab order that leaves the focus where it was when pressed.
 */
function SettingsSidebar({
  groups,
  page,
  subsectionId,
  onPage,
  onSubsection
}: {
  readonly groups: readonly SettingsGroup[];
  readonly page: SettingsPage;
  readonly subsectionId: string | null;
  readonly onPage: (id: string) => void;
  readonly onSubsection: (id: string) => void;
}): ReactElement {
  const labels = useLabels().settings;

  return (
    <nav aria-label={labels.sidebar} className="settings-sidebar scroll-fade">
      {groups.map((group) => (
        <div
          aria-labelledby={`settings-group-${group.id}`}
          className="settings-sidebar-group"
          key={group.id}
          role="group"
        >
          <span className="settings-sidebar-header overline" id={`settings-group-${group.id}`}>
            {group.title}
          </span>
          {group.pages.map((item) => (
            <Fragment key={item.id}>
              <button
                aria-current={item.id === page.id ? 'page' : undefined}
                className="settings-sidebar-page"
                data-settings-page={item.id}
                onClick={() => onPage(item.id)}
                onMouseDown={keepFocus}
                type="button"
              >
                <item.Icon aria-hidden size={ICON_MD} />
                <span {...cutTooltip(item.title)}>{item.title}</span>
                {item.chip ? <span className="settings-sidebar-chip">{item.chip}</span> : null}
              </button>
              {item.id === page.id && item.subsections.length > 0 ? (
                <div className="settings-sidebar-subsections">
                  {item.subsections.map((subsection) => (
                    <button
                      aria-current={subsection.id === subsectionId ? 'location' : undefined}
                      className="settings-sidebar-subsection"
                      key={subsection.id}
                      onClick={() => onSubsection(subsection.id)}
                      onMouseDown={keepFocus}
                      type="button"
                      {...cutTooltip(subsection.title)}
                    >
                      {subsection.title}
                    </button>
                  ))}
                </div>
              ) : null}
            </Fragment>
          ))}
        </div>
      ))}
    </nav>
  );
}

/**
 * The Settings dialog: a fixed frame on the frosted wash, the sidebar of
 * pages at its left, and the chosen page in a column that scrolls beside
 * it. It opens on the page a request names, or on the first page, and keeps
 * the chosen one until it closes or a new request names another
 * (`pageRequest`). The title strip says Settings alone; the page's name
 * heads its content, and the sidebar marks the page and the subsection in
 * view, following the column's scroll. Every control applies its change at
 * once, so there is nothing to commit: the legend's one verb is Done on
 * Return, which Escape runs too, and a focused field, pop-up menu, or
 * button keeps Return. A page that has keys of its own takes the legend and
 * Escape over while it shows (`useSettingsPageKeys`) and gives them back
 * when it goes. A new page starts at its top, its first subsection marked,
 * and shows whole the control it marks to reveal.
 */
export function SettingsDialog({
  groups,
  pageRequest = null,
  onPageShown,
  notice,
  icon = Settings,
  onClose
}: SettingsDialogProps): ReactElement {
  const labels = useLabels().settings;
  const pages = groups.flatMap((group) => group.pages);
  const [pageId, setPageId] = useState(pageRequest?.pageId ?? pages[0]?.id);
  const [requestSeq, setRequestSeq] = useState(pageRequest?.seq);

  if (pageRequest && pageRequest.seq !== requestSeq) {
    setRequestSeq(pageRequest.seq);
    setPageId(pageRequest.pageId);
  }

  const page = pages.find((candidate) => candidate.id === pageId) ?? pages[0];

  if (page === undefined) {
    throw new Error('SettingsDialog needs at least one page.');
  }

  useEffect(() => {
    onPageShown?.(page.id);
  }, [onPageShown, page.id]);

  const [subsectionId, setSubsectionId] = useState<string | null>(null);
  const columnRef = useRef<HTMLElement>(null);
  // Set while the column scrolls to the subsection a sidebar row chose, so
  // that scroll keeps the choice marked even where the column cannot bring
  // it to the top.
  const chosenScrollRef = useRef(false);

  // A row press leaves the focus where it was, so a control the old page
  // held is gone with it: the dialog takes the focus back, or Escape and
  // Tab would stop reaching it.
  useLayoutEffect(() => {
    const column = columnRef.current;

    if (column) {
      const dialog = column.closest<HTMLElement>('[role="dialog"]');

      if (dialog && !dialog.contains(dialog.ownerDocument.activeElement)) {
        dialog.focus({ preventScroll: true });
      }

      openPageView(column);
      chosenScrollRef.current = false;
      setSubsectionId(spiedSubsection(subsectionAnchors(column), column));
    }
  }, [page.id]);

  // A page that adds or drops subsections as it is used moves the one in
  // view without a scroll, so the mark follows the page's content too.
  useLayoutEffect(() => {
    const column = columnRef.current;

    if (!column || typeof MutationObserver === 'undefined') {
      return undefined;
    }

    const observer = new MutationObserver(() => {
      if (!chosenScrollRef.current) {
        setSubsectionId(spiedSubsection(subsectionAnchors(column), column));
      }
    });

    observer.observe(column, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [page.id]);

  const handleScroll = (): void => {
    const column = columnRef.current;

    if (chosenScrollRef.current) {
      chosenScrollRef.current = false;
    } else if (column) {
      setSubsectionId(spiedSubsection(subsectionAnchors(column), column));
    }
  };

  const choosePage = (id: string): void => {
    if (id === page.id && columnRef.current) {
      openPageView(columnRef.current);
    }

    setPageId(id);
  };

  const showSubsection = (id: string): void => {
    const column = columnRef.current;
    const top = column ? subsectionScrollTop(subsectionAnchors(column), id) : null;

    setSubsectionId(id);

    if (column && top !== null) {
      const before = column.scrollTop;

      column.scrollTop = top;
      chosenScrollRef.current = column.scrollTop !== before;
    }
  };

  const [pageKeys, setPageKeys] = useState<SettingsPageKeys | null>(null);

  return (
    <ModalDialog
      className="settings-dialog"
      frosted
      icon={icon}
      labelId={DIALOG_LABEL_ID}
      legend={settingsLegend(pageKeys, onClose, labels.done)}
      onCancel={pageKeys?.onLeave ?? onClose}
      title={labels.title}
    >
      <div className="settings-dialog-body">
        <SettingsSidebar
          groups={groups}
          onPage={choosePage}
          onSubsection={showSubsection}
          page={page}
          subsectionId={subsectionId}
        />
        <div className="settings-column">
          {notice?.(page.id, choosePage)}
          <section
            aria-labelledby={PAGE_TITLE_ID}
            className={page.fills ? 'settings-page scroll-fade fills' : 'settings-page scroll-fade'}
            onScroll={handleScroll}
            ref={columnRef}
          >
            <h3 className="settings-page-title" id={PAGE_TITLE_ID}>
              {page.title}
            </h3>
            <SettingsPageKeysContext.Provider value={setPageKeys}>
              <Fragment key={page.id}>{page.body}</Fragment>
            </SettingsPageKeysContext.Provider>
          </section>
        </div>
      </div>
    </ModalDialog>
  );
}

/** Props for {@link SettingsSaveFailure}. */
export interface SettingsSaveFailureProps {
  /** What the file could not take, in the system's or the app's words. */
  readonly message: string;
  /** The verb that shows where the problem is (Show Files); none on that page itself. */
  readonly action?: { readonly label: string; readonly onRun: () => void } | null;
}

/**
 * A change a settings file could not take, over the Settings page column
 * (`SettingsDialog`'s `notice`), outside the page's scroll so it stays in
 * view however far the page is scrolled: a danger notice, its words
 * announced, and a verb that turns to the page that lists it.
 */
export function SettingsSaveFailure({
  message,
  action = null
}: SettingsSaveFailureProps): ReactElement {
  return (
    <div className="settings-save-failure notice notice-danger">
      <CircleAlert aria-hidden size={ICON_MD} />
      <p className="notice-text" role="alert">
        {message}
      </p>
      {action === null ? null : (
        <div className="notice-actions">
          <Button onClick={action.onRun} size="small">
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
