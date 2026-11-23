import { ChevronDown, Pin, Plus, X } from 'lucide-react';
import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode
} from 'react';
import { createPortal } from 'react-dom';

import { ICON_MD, ICON_SM } from '../icon/index.js';
import type { Chord } from '../keyboard/Keyboard.logic.js';
import type { PaneTabsLabels } from '../labels/paneTabs.js';
import { useLabels } from '../labels/UiokProvider.js';
import { StateMark } from '../listing/Listing.js';
import { movedPickableCursor, pickableCursor } from '../menu/MenuQuery.logic.js';
import { cutTooltip, describedTooltip, tooltip } from '../tooltip/Tooltip.logic.js';
import { foldOrder, foldsNeeded, tabLabelFloor } from './PaneTabs.logic.js';
import { useTabDrag } from './useTabDrag.js';

/** One tab of a pane's strip. */
export interface PaneTabItem {
  /** Names the tab to every callback; also its `data-pane-tab` attribute. */
  readonly id: string;
  /** What the tab shows. */
  readonly name: string;
  /**
   * Dim words before the name and a slash, to tell two tabs of one name
   * apart (`shop` / `orders`). They give way to an ellipsis before the
   * name loses a character.
   */
  readonly context?: string;
  /** A node ahead of the name: a group's swatch or a lucide icon at `ICON_SM`. Decorative. */
  readonly mark?: ReactNode;
  /** The tooltip, at every width: the tab's whole path. Also its accessible description. */
  readonly tip?: string;
  /** The next place opened takes this tab over: its name is set in italic. */
  readonly following?: boolean;
  /**
   * The tab holds changes not saved: the warning mark stands where its close
   * control is, and the control comes back under the pointer.
   */
  readonly dirty?: boolean;
  /** Stands before the pin rule, keeps its width, and carries a pin in place of a close control. */
  readonly pinned?: boolean;
  /** `'danger'` outlines the tab in the danger colour at every width (a place that needs care). */
  readonly tone?: 'danger';
  /** False draws no close control, and a middle click closes nothing. True by default. */
  readonly closable?: boolean;
}

/** Props for {@link PaneTabs}. */
export interface PaneTabsProps {
  /** The tablist's accessible name. */
  readonly label: string;
  /** The tabs in strip order; pinned tabs must come first. */
  readonly tabs: readonly PaneTabItem[];
  /** The id of the tab in front: exactly one, among `tabs`. */
  readonly front: string;
  /**
   * The ids picked beside the tab in front, which the host keeps
   * (`togglePick`, `pickRun`, `pickedTabs`). A picked tab wears the marked
   * look and a drag of it carries every pick.
   */
  readonly picked?: readonly string[];
  /** A press on a tab, or a choice in the folded tabs' menu: bring that tab to the front. */
  readonly onSelect: (id: string) => void;
  /** A tab's close control, or a middle click on a tab that has one. */
  readonly onClose: (id: string) => void;
  /** ⌘-click picks or drops a tab (`'toggle'`); ⇧-click picks the run from the front tab (`'run'`). */
  readonly onPick?: (id: string, how: 'toggle' | 'run') => void;
  /** A double-click on a tab: keeps a following tab. */
  readonly onKeep?: (id: string) => void;
  /** After a drag drops, the full order, folded tabs included. Omit to turn dragging off. */
  readonly onReorder?: (order: readonly string[]) => void;
  /** The New Tab button, and a double-click on the strip's empty end. Omit to draw no button. */
  readonly onNew?: () => void;
  /** The chord New Tab's tooltip shows; ⌘T by default. */
  readonly newChord?: Chord;
  /** A secondary click on a tab; the host decides whether to prevent the browser's menu. */
  readonly onTabContextMenu?: (id: string, event: MouseEvent) => void;
  /** Drawn after the folded tabs' count, at the strip's end (an update pill). */
  readonly trailing?: ReactNode;
}

/** New Tab's chord when the host names none. */
const NEW_TAB_CHORD: Chord = { key: 't', meta: true };

/** No picks. */
const NO_PICKS: readonly string[] = [];

/** Keeps the focus where it was on a press, so a press on the strip leaves the keys where they were. */
const keepFocus = (event: MouseEvent): void => event.preventDefault();

/** The words a tab is called by: its context and name, as the strip shows them. */
const spokenTab = (tab: PaneTabItem): string =>
  tab.context === undefined ? tab.name : `${tab.context}/${tab.name}`;

/** Whether the tab draws a close control. */
const closes = (tab: PaneTabItem): boolean => tab.pinned !== true && tab.closable !== false;

/** A tab's label: the context giving way to its floor before the name gives a character. */
function TabLabel({ tab }: { readonly tab: PaneTabItem }): ReactElement {
  const floor = tabLabelFloor(tab);
  // A tab with no tip of its own shows its whole words while a narrow strip
  // cuts its context or its name; a tip already names it whole.
  const cut = tab.tip === undefined || tab.tip === '' ? cutTooltip(spokenTab(tab)) : {};

  return (
    <span className="pane-tab-label">
      {tab.context === undefined ? null : (
        <>
          <span className="pane-tab-context" style={{ minWidth: `${floor.context}ch` }} {...cut}>
            {tab.context}
          </span>
          <span className="pane-tab-context pane-tab-slash">/</span>
        </>
      )}
      <span className="pane-tab-name" {...cut}>
        {tab.name}
      </span>
    </span>
  );
}

/** Props of the folded tabs' count and its menu. */
interface FoldedProps {
  readonly folded: readonly PaneTabItem[];
  readonly labels: PaneTabsLabels;
  readonly onSelect: (id: string) => void;
}

/**
 * The folded tabs' count at the strip's end: "+N" and a chevron, the
 * warning mark before it while a folded tab is dirty. It opens the menu of
 * the folded tabs, in strip order; the menu holds the keys (↑ ↓, Return,
 * Escape) and hands the focus back to where it was when it opened.
 */
function FoldedTabs({ folded, labels, onSelect }: FoldedProps): ReactElement {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const returnRef = useRef<Element | null>(null);
  const menuId = useId();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [pointed, setPointed] = useState<string | null>(null);
  const dirty = folded.filter((tab) => tab.dirty === true).length;
  const words = labels.folded(folded.length, dirty);
  const rows = folded.map((tab) => ({ key: tab.id, taken: false }));
  const cursor = host === null ? null : pickableCursor(rows, pointed);

  const close = (by: 'keyboard' | 'pointer'): void => {
    setHost(null);
    setPointed(null);

    const back = returnRef.current;

    returnRef.current = null;

    if (by === 'keyboard' && back instanceof HTMLElement && back.isConnected) {
      back.focus({ preventScroll: true });
    }
  };
  const closeRef = useRef(close);

  useLayoutEffect(() => {
    closeRef.current = close;
  });

  // Placed under the count, its trailing edge on the count's, and given the
  // keys; over the count instead when the window has no room for it below
  // and has room above, so no row the keys reach falls out of the window.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const button = buttonRef.current;

    if (host === null || menu === null || button === null) {
      return;
    }

    const box = button.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(menu).getPropertyValue('--space-2')) || 0;
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const above = box.top - gap - height;
    const below = box.bottom + gap;

    menu.style.top = `${below + height > window.innerHeight - gap && above >= gap ? above : below}px`;
    menu.style.left = `${Math.max(gap, Math.min(box.right - width, window.innerWidth - width - gap))}px`;
    menu.focus({ preventScroll: true });
  }, [host]);

  // The row the keys move to scrolls into the list's view, so Return never
  // chooses a row out of sight. Optional call: jsdom has no scrollIntoView.
  useLayoutEffect(() => {
    if (host === null || cursor === null) {
      return;
    }

    menuRef.current
      ?.querySelector('.pane-tabs-folded-option.cursor')
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [host, cursor]);

  // A press outside closes it; the press goes on to whatever it landed on.
  useEffect(() => {
    if (host === null) {
      return;
    }

    const listener = (event: globalThis.MouseEvent): void => {
      if (
        !(event.target instanceof Node) ||
        !(menuRef.current?.contains(event.target) || buttonRef.current?.contains(event.target))
      ) {
        closeRef.current('pointer');
      }
    };

    // A window that changes size moves the count out from under the menu:
    // the menu closes, and the keys go back to where they were.
    const resized = (): void => closeRef.current('keyboard');

    document.addEventListener('mousedown', listener, true);
    window.addEventListener('resize', resized);

    return () => {
      document.removeEventListener('mousedown', listener, true);
      window.removeEventListener('resize', resized);
    };
  }, [host]);

  const choose = (tab: PaneTabItem | undefined): void => {
    if (tab !== undefined) {
      close('keyboard');
      onSelect(tab.id);
    }
  };

  return (
    <>
      <button
        aria-expanded={host !== null}
        aria-haspopup="menu"
        aria-label={labels.foldedName(folded.length)}
        className="pane-tabs-folded hit-target quiet-control"
        onClick={() => {
          if (host !== null) {
            close('pointer');

            return;
          }

          returnRef.current = document.activeElement;
          setHost(buttonRef.current?.closest<HTMLElement>('.listing-root') ?? document.body);
        }}
        onMouseDown={keepFocus}
        ref={buttonRef}
        type="button"
        {...describedTooltip(words)}
      >
        {dirty > 0 ? (
          <span aria-hidden className="pane-tab-dirty">
            <StateMark tone="warning" word="" />
          </span>
        ) : null}
        <span className="pane-tabs-folded-count">{`+${folded.length.toLocaleString('en-US')}`}</span>
        <ChevronDown aria-hidden size={ICON_SM} />
      </button>
      {host === null
        ? null
        : createPortal(
            <div
              aria-activedescendant={cursor === null ? undefined : `${menuId}-${cursor}`}
              aria-label={labels.foldedHeading}
              className="folder-menu folder-menu-compact pane-tabs-folded-menu"
              data-native-keyboard
              data-overlay
              onBlur={(event) => {
                if (!(
                  event.relatedTarget instanceof Node &&
                  event.currentTarget.contains(event.relatedTarget)
                )) {
                  close('pointer');
                }
              }}
              onKeyDown={(event) => {
                if (event.metaKey || event.ctrlKey || event.altKey) {
                  return;
                }

                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  const next = movedPickableCursor(
                    rows,
                    cursor,
                    event.key === 'ArrowDown' ? 1 : -1
                  );

                  setPointed(next === null ? null : (folded[next]?.id ?? null));
                } else if (event.key === 'Enter' || event.key === ' ') {
                  choose(cursor === null ? undefined : folded[cursor]);
                } else if (event.key === 'Escape') {
                  close('keyboard');
                } else if (event.key === 'Tab') {
                  close('pointer');

                  return;
                } else {
                  return;
                }

                event.preventDefault();
                event.stopPropagation();
              }}
              // A press on a row must not take the focus from the menu, which holds the keys.
              onMouseDown={keepFocus}
              ref={menuRef}
              role="menu"
              tabIndex={-1}
            >
              <div aria-hidden className="entry-menu-heading overline">
                {labels.foldedHeading}
              </div>
              <div className="folder-menu-options" role="none">
                {folded.map((tab, index) => (
                  <div
                    aria-description={
                      [tab.tip, tab.dirty === true ? labels.notSaved : undefined]
                        .filter((part) => part !== undefined && part !== '')
                        .join(', ') || undefined
                    }
                    aria-label={spokenTab(tab)}
                    className={
                      index === cursor
                        ? 'folder-menu-option pane-tabs-folded-option cursor'
                        : 'folder-menu-option pane-tabs-folded-option'
                    }
                    data-tone={tab.tone}
                    id={`${menuId}-${index}`}
                    key={tab.id}
                    onClick={() => choose(tab)}
                    onMouseMove={() => setPointed(tab.id)}
                    role="menuitem"
                    {...tooltip(tab.tip, null, { value: true })}
                  >
                    <span aria-hidden className="pane-tabs-folded-mark">
                      {tab.mark}
                    </span>
                    <span className="pane-tabs-folded-label">
                      {tab.context === undefined ? null : (
                        <>
                          <span className="pane-tab-context">{tab.context}</span>
                          <span className="pane-tab-context pane-tab-slash">/</span>
                        </>
                      )}
                      <span className="pane-tab-name">{tab.name}</span>
                    </span>
                    <span aria-hidden className="pane-tabs-folded-marks">
                      {tab.dirty === true ? <StateMark tone="warning" word="" /> : null}
                      {tab.tone === 'danger' ? <StateMark tone="danger" word="" /> : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>,
            host
          )}
    </>
  );
}

/**
 * The tabs a pane hangs from: the first child of a `.pane` under
 * `.listing-root`, whose frame hangs from the tab in front. A tab wears its
 * place's name, with dim context before it when two tabs share a name; the
 * one in front joins the frame, the others stand behind it, shorter and
 * fainter. A following tab's name is italic, a dirty tab carries the
 * warning mark in its close control's place, a pinned tab stands before the
 * pin rule with a pin, and a danger-toned tab keeps its danger outline.
 *
 * The strip never wraps or scrolls. Tabs behind the front one shrink
 * together to a floor (eight characters of the name, three of the
 * context), then fold into a count after New Tab, farthest from the front
 * tab first; pinned, front, and following tabs never fold, and pinned and
 * front never shrink. The count's menu names the folded tabs.
 *
 * A press brings a tab to the front at once and, with `onReorder`, may
 * start a drag (past a 4px slop): the held tab follows the pointer, its
 * neighbours step aside at half cover, it stays its side of the pin rule,
 * picked tabs ride with it, Escape puts every tab back, and release hands
 * the full order to `onReorder`. ⌘-click and ⇧-click pick (`onPick`), a
 * middle click closes, a double-click keeps (`onKeep`), and a double-click
 * on the strip's empty end opens a new tab (`onNew`).
 *
 * Tabs take no focus: the host's verbs are the keyboard's way in. Words
 * come from `useLabels().paneTabs`.
 */
export function PaneTabs({
  label,
  tabs,
  front,
  picked = NO_PICKS,
  onSelect,
  onClose,
  onPick,
  onKeep,
  onReorder,
  onNew,
  newChord = NEW_TAB_CHORD,
  onTabContextMenu,
  trailing
}: PaneTabsProps): ReactElement {
  const labels = useLabels().paneTabs;
  const headerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const trailingRef = useRef<HTMLSpanElement>(null);
  const [room, setRoom] = useState('');
  const drag = useTabDrag();
  const liveOrder = drag.liveOrder;
  const hasTrailing = trailing !== undefined;
  const byId = new Map(tabs.map((tab) => [tab.id, tab]));
  const order = tabs.map((tab) => tab.id);
  // While a drag runs the strip draws the hand's order; the host's comes back on release.
  const drawn =
    liveOrder !== null && liveOrder.length === order.length && liveOrder.every((id) => byId.has(id))
      ? liveOrder
      : order;

  // Whatever changes the strip's natural width starts the folding over.
  const shape = `${room}|${front}|${onNew === undefined ? '' : 'new'}|${tabs
    .map(
      (tab) =>
        `${tab.id}:${tab.pinned === true ? 'p' : ''}${tab.following === true ? 'f' : ''}${
          tab.mark === undefined ? '' : 'm'
        }${closes(tab) ? 'x' : ''}${tab.dirty === true ? 'd' : ''}:${tab.context ?? ''}/${tab.name}`
    )
    .join('|')}`;
  const [folding, setFolding] = useState({ shape, count: 0 });
  const count = folding.shape === shape ? folding.count : 0;

  if (folding.shape !== shape) {
    setFolding({ shape, count: 0 });
  }

  const folds = foldOrder(tabs, front);
  const folded = new Set(folds.slice(0, count));
  const foldRank = new Map(folds.map((id, rank) => [id, rank]));
  const foldedTabs = tabs.filter((tab) => folded.has(tab.id));
  const pinnedIds = new Set(tabs.filter((tab) => tab.pinned === true).map((tab) => tab.id));
  const shown = drawn.filter((id) => !folded.has(id));
  const lastPinned = shown.reduce((last, id, index) => (pinnedIds.has(id) ? index : last), -1);
  const carried = drawn.filter((id) => id === front || picked.includes(id));
  const hasPicks = carried.length > 1;

  // While the tabs on show, each at its floor, run past the strip's room,
  // fold as many as cover the overrun in one step; the count taking its own
  // room costs a pass or two more. Box widths, not offsets: each offset
  // rounds on its own, and a tab in the hand is drawn away from its place.
  useLayoutEffect(() => {
    const strip = stripRef.current;

    if (!strip || count >= folds.length) {
      return;
    }

    const boxes = [...strip.children].map((element) => ({
      rank: element instanceof HTMLElement ? element.dataset.foldRank : undefined,
      width: element.getBoundingClientRect().width
    }));
    const gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
    const run =
      boxes.reduce((sum, box) => sum + box.width, 0) + gap * Math.max(0, boxes.length - 1);
    const deficit = run - strip.getBoundingClientRect().width;

    if (deficit <= 0.5) {
      return;
    }

    const widths = boxes
      .flatMap((box) =>
        box.rank === undefined ? [] : [{ rank: Number(box.rank), width: box.width }]
      )
      .sort((a, b) => a.rank - b.rank)
      .map((box) => box.width);

    setFolding({ shape, count: count + foldsNeeded(deficit, widths, gap) });
  }, [count, folds.length, shape]);

  // The header's width and the trailing slot's, which the folding starts over on.
  useEffect(() => {
    const header = headerRef.current;

    // Optional: jsdom has no ResizeObserver.
    if (!header || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() =>
      setRoom(`${header.clientWidth}:${trailingRef.current?.offsetWidth ?? 0}`)
    );

    observer.observe(header);

    if (trailingRef.current) {
      observer.observe(trailingRef.current);
    }

    return () => observer.disconnect();
  }, [hasTrailing]);

  // After every layout, since any of them may have moved a tab.
  useLayoutEffect(() => {
    drag.afterLayout({
      order: drawn,
      pinned: pinnedIds,
      strip: stripRef.current,
      commit: (next) => onReorder?.(next)
    });
  });

  const tabElement = (tab: PaneTabItem): ReactElement => {
    const isFront = tab.id === front;
    const isPicked = hasPicks && !isFront && picked.includes(tab.id);
    const spoken = spokenTab(tab);
    const floor = tabLabelFloor(tab);
    const description = [
      tab.tip,
      tab.pinned === true ? labels.pinned : undefined,
      tab.dirty === true ? labels.notSaved : undefined
    ]
      .filter((part) => part !== undefined && part !== '')
      .join(', ');

    // The box draws the tab and takes its presses; the tab a screen reader
    // meets is its face, which holds no control. The close control stands
    // beside the face in the box, so it is never inside the tab, and is the
    // pointer's alone.
    return (
      <div
        {...tooltip(tab.tip, null, { value: true })}
        className={[
          'pane-tab',
          isFront ? 'active' : '',
          tab.following === true ? 'following' : '',
          tab.dirty === true ? 'dirty' : '',
          tab.pinned === true ? 'pinned' : '',
          isPicked ? 'picked' : '',
          drag.draggingIds.includes(tab.id) ? 'dragging' : ''
        ]
          .filter(Boolean)
          .join(' ')}
        data-fold-rank={foldRank.get(tab.id)}
        data-pane-tab={tab.id}
        data-tone={tab.tone}
        onAuxClick={(event) => {
          if (event.button === 1 && closes(tab)) {
            onClose(tab.id);
          }
        }}
        onContextMenu={(event) => onTabContextMenu?.(tab.id, event)}
        onDoubleClick={() => onKeep?.(tab.id)}
        onMouseDown={keepFocus}
        onPointerDown={(event) => {
          if (event.button !== 0 || event.ctrlKey) {
            return;
          }

          if (onPick !== undefined && (event.metaKey || event.shiftKey)) {
            onPick(tab.id, event.metaKey ? 'toggle' : 'run');

            return;
          }

          // A press on a picked tab waits for its release: it may start a drag of every pick.
          if (onReorder !== undefined && hasPicks && carried.includes(tab.id)) {
            drag.begin(tab.id, event.currentTarget, event.clientX, {
              ids: carried,
              onClick: () => onSelect(tab.id)
            });

            return;
          }

          if (!isFront || hasPicks) {
            onSelect(tab.id);
          }

          if (onReorder !== undefined) {
            drag.begin(tab.id, event.currentTarget, event.clientX);
          }
        }}
        ref={drag.tabRef(tab.id)}
        role="presentation"
        style={
          {
            '--pane-tab-floor': `${floor.context + (tab.context === undefined ? 0 : 1) + floor.name}ch`
          } as CSSProperties
        }
      >
        <span
          aria-description={description === '' ? undefined : description}
          aria-label={isPicked ? labels.picked(spoken) : spoken}
          aria-selected={isFront}
          className="pane-tab-face"
          role="tab"
        >
          {tab.mark === undefined ? null : (
            <span aria-hidden className="pane-tab-mark">
              {tab.mark}
            </span>
          )}
          <TabLabel tab={tab} />
          {tab.dirty === true ? (
            <span aria-hidden className="pane-tab-dirty" {...tooltip(labels.notSaved)}>
              <StateMark tone="warning" word="" />
            </span>
          ) : null}
          {tab.pinned === true ? (
            <span aria-hidden className="pane-tab-pin" {...tooltip(labels.pinned)}>
              <Pin size={ICON_SM} />
            </span>
          ) : null}
        </span>
        {tab.pinned !== true && closes(tab) ? (
          <button
            // A pointer's control: a tab list owns tabs alone, and a tab's
            // own children are presentational, so assistive technology meets
            // no close button and closes a tab with the host's close chord.
            aria-hidden
            aria-label={labels.close(spoken)}
            className="pane-tab-close hit-target quiet-control"
            onClick={(event) => {
              event.stopPropagation();
              onClose(tab.id);
            }}
            onDoubleClick={(event) => event.stopPropagation()}
            onMouseDown={keepFocus}
            // A press on the control is not the start of a drag of its tab.
            onPointerDown={(event) => event.stopPropagation()}
            tabIndex={-1}
            type="button"
            {...tooltip(labels.close(spoken))}
          >
            <X aria-hidden size={ICON_SM} />
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="pane-header" ref={headerRef}>
      <div aria-label={label} className="pane-tabs" ref={stripRef} role="tablist">
        {shown.map((id, index) => {
          const tab = byId.get(id);

          return tab === undefined ? null : (
            <Fragment key={id}>
              {tabElement(tab)}
              {index === lastPinned && index < shown.length - 1 ? (
                <span aria-hidden className="pane-pin-rule" />
              ) : null}
            </Fragment>
          );
        })}
      </div>
      {onNew === undefined ? null : (
        <button
          aria-label={labels.newTab}
          className="pane-tab-new hit-target quiet-control"
          onClick={onNew}
          onMouseDown={keepFocus}
          tabIndex={-1}
          type="button"
          {...tooltip(labels.newTab, newChord)}
        >
          <Plus aria-hidden size={ICON_MD} />
        </button>
      )}
      <span aria-hidden className="pane-tabs-rest" onDoubleClick={onNew} />
      {foldedTabs.length === 0 ? null : (
        <FoldedTabs folded={foldedTabs} labels={labels} onSelect={onSelect} />
      )}
      {!hasTrailing ? null : (
        <span className="pane-tabs-trailing" ref={trailingRef}>
          {trailing}
        </span>
      )}
    </div>
  );
}
