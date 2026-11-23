import type { LucideIcon } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject
} from 'react';
import { createPortal } from 'react-dom';

import { ICON_MD } from '../icon/sizes.js';
import type { Chord } from '../keyboard/Keyboard.logic.js';
import { KeyChord } from '../keychord/KeyChord.js';
import { CurrentDot } from '../listing/CurrentDot.js';
import { describedTooltip } from '../tooltip/Tooltip.logic.js';
import {
  menuKeyAction,
  placeMenu,
  type MenuFrom,
  type MenuKeyAction,
  type MenuPoint
} from './Menu.logic.js';
import { movedPickableCursor, pickableCursor, type PickableRow } from './MenuQuery.logic.js';

/** An item of a menu: a verb that runs, or a place to go. */
export interface MenuItemEntry {
  readonly kind?: 'item';
  /** Names the item to `onPick`; unique in the menu. */
  readonly id: string;
  /** The verb or the place, in words: "Open in Terminal", "17 · 17.7". */
  readonly label: string;
  /** A lucide glyph in the icon column. */
  readonly icon?: LucideIcon;
  /** Anything else in the icon column (a `ProductMark`, a state dot), when `icon` is absent. */
  readonly mark?: ReactNode;
  /** The chord that runs the same verb, drawn as key caps at the row's end. */
  readonly chord?: Chord;
  /** A destructive verb (Delete, Remove): the danger tone, its glyph with it. */
  readonly danger?: boolean;
  /** Listed but not runnable now: dimmed and passed over by the keys. Say why in `tip`. */
  readonly disabled?: boolean;
  /**
   * A setting the item turns on and off: true draws the check mark in the
   * icon column (`menuitemcheckbox`); absent, it is a plain item.
   */
  readonly checked?: boolean;
  /** Marks the current one (the place shown), with what current means as the dot's name: "Shown". */
  readonly current?: string | null;
  /** More about the item, or why it is disabled: its tooltip and description. */
  readonly tip?: string;
}

/** A hairline between groups of items that need no name. */
export interface MenuSeparatorEntry {
  readonly kind: 'separator';
}

/** A group's name over its items. */
export interface MenuHeadingEntry {
  readonly kind: 'heading';
  readonly label: string;
}

/**
 * An item that opens a submenu beside it ("Copy As", opening Path and File
 * URL): its glyph and words, and a chevron at its end in place of a chord.
 * It runs nothing itself; its submenu's items do.
 */
export interface MenuSubmenuEntry {
  readonly kind: 'submenu';
  /** Names the item; unique in the menu, its submenus' items included. Never passed to `onPick`. */
  readonly id: string;
  /** The submenu's name, in words: "Copy As", "Open With". */
  readonly label: string;
  /** A lucide glyph in the icon column. */
  readonly icon?: LucideIcon;
  /** Anything else in the icon column, when `icon` is absent. */
  readonly mark?: ReactNode;
  /** Listed but not openable now: dimmed and passed over by the keys. Say why in `tip`. */
  readonly disabled?: boolean;
  /** More about the item, or why it is disabled: its tooltip and description. */
  readonly tip?: string;
  /** The submenu's entries, in order: items, separators, and headings, never another submenu. */
  readonly entries: readonly MenuLeafEntry[];
}

/** An entry a submenu can hold: any but another submenu, so a menu nests one level deep. */
export type MenuLeafEntry = MenuItemEntry | MenuSeparatorEntry | MenuHeadingEntry;

/** One entry of a menu, in order. */
export type MenuEntry = MenuLeafEntry | MenuSubmenuEntry;

/** Props for {@link Menu}. */
export interface MenuProps {
  /** The menu's accessible name: "Actions", "Other versions". */
  readonly label: string;
  /** Its entries, in order. */
  readonly entries: readonly MenuEntry[];
  /** Opens it at a point in window coordinates (a secondary click). */
  readonly at?: MenuPoint;
  /**
   * Drops it from an element (a crumb, a button), under its leading edge.
   * Presses on the element do not close the menu, so the element can
   * toggle it. Used when `at` is absent.
   */
  readonly anchor?: HTMLElement | null;
  /**
   * The item the cursor starts on (the current one), in the menu itself,
   * not a submenu; the first that can run when absent.
   */
  readonly initial?: string | null;
  /** The small size, for a menu of short commands (`.folder-menu-compact`). */
  readonly compact?: boolean;
  /**
   * The direction it reads in, which its keys, a submenu's side, and the
   * chevron follow; when absent, the direction of `anchor`, or of the place
   * it is rendered in, as it opens (the document body it is drawn on may
   * read the other way).
   */
  readonly dir?: 'ltr' | 'rtl';
  /** Runs an item that can run, by its id, a submenu's items included; the caller closes the menu. */
  readonly onPick: (id: string) => void;
  /**
   * Closes the menu, saying how it was dismissed: by a key in it (Escape,
   * Tab), after which the caller puts the focus back where it was, or by a
   * press or a focus elsewhere, which has its own destination.
   */
  readonly onClose: (by: 'keyboard' | 'pointer') => void;
}

/** Scrolls a menu's item at `position` into the menu's view, the least it takes; jsdom has no scrollIntoView. */
const revealItem = (itemId: string, position: number | null): void => {
  if (position === null) return;
  document.getElementById(`${itemId}-${position}`)?.scrollIntoView?.({ block: 'nearest' });
};

/** An entry the cursor can stand on: an item, or one that opens a submenu. */
type MenuRowEntry = MenuItemEntry | MenuSubmenuEntry;

const isRow = (entry: MenuEntry): entry is MenuRowEntry =>
  entry.kind === undefined || entry.kind === 'item' || entry.kind === 'submenu';

const isItem = (entry: MenuEntry): entry is MenuItemEntry =>
  entry.kind === undefined || entry.kind === 'item';

const pickableRows = (rows: readonly MenuRowEntry[]): readonly PickableRow[] =>
  rows.map((row) => ({ key: row.id, taken: row.disabled === true }));

/** Whether an element reads right to left, where a submenu stands on the left. */
const isRtl = (element: Element): boolean => getComputedStyle(element).direction === 'rtl';

const NO_BOX = { left: 0, top: 0, right: 0, bottom: 0 };

/**
 * How long the pointer may cross other items on its way into an open
 * submenu, in milliseconds, before the item it stays on takes the cursor
 * and the submenu gives way.
 */
const SUBMENU_GRACE_MS = 250;

/** Props for the surface a menu, or its submenu, is drawn on. */
interface MenuSurfaceProps {
  readonly surfaceRef: RefObject<HTMLDivElement | null>;
  readonly id?: string;
  readonly label?: string;
  /** The submenu's item, which names it. */
  readonly labelledBy?: string;
  readonly entries: readonly MenuEntry[];
  /** The cursor's place among the rows; null for none. */
  readonly cursor: number | null;
  /** The id prefix of the rows, each `${itemId}-${place}`. */
  readonly itemId: string;
  /** The submenu item whose submenu shows, and that submenu's id. */
  readonly expanded: { readonly id: string; readonly menu: string } | null;
  readonly compact: boolean;
  readonly at?: MenuPoint;
  readonly anchor: HTMLElement | null;
  /** The id of the item a submenu stands beside. */
  readonly besideId?: string;
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly onBlur: (event: FocusEvent<HTMLDivElement>) => void;
  readonly onMouseMove?: () => void;
  readonly onMouseLeave: () => void;
  readonly dir: 'ltr' | 'rtl' | undefined;
  readonly onRowClick: (row: MenuRowEntry) => void;
  readonly onRowMove: (row: MenuRowEntry) => void;
}

/**
 * The surface a menu or its submenu is drawn on, through a portal on the
 * document's body (or the element shown full screen), placed after layout,
 * when its size is known, and placed again when the window resizes, the
 * cursor's item kept in view.
 */
function MenuSurface({
  surfaceRef,
  id,
  label,
  labelledBy,
  entries,
  cursor,
  itemId,
  expanded,
  compact,
  at,
  anchor,
  besideId,
  onKeyDown,
  onBlur,
  onMouseMove,
  onMouseLeave,
  dir,
  onRowClick,
  onRowMove
}: MenuSurfaceProps): ReactElement {
  const cursorRef = useRef(cursor);

  useLayoutEffect(() => {
    cursorRef.current = cursor;
  });

  // Placed again when its menu moves or turns direction: a submenu is given
  // its menu's point and anchor too, so it follows the item it stands beside,
  // and turns sides with the direction, which places a menu itself nowhere new.
  const turn = besideId === undefined ? undefined : dir;

  useLayoutEffect(() => {
    const menu = surfaceRef.current;
    if (menu === null) return;
    const from = (): MenuFrom => {
      if (besideId !== undefined) {
        const item = document.getElementById(besideId);
        return {
          beside: item?.getBoundingClientRect() ?? NO_BOX,
          rtl: item !== null && isRtl(item)
        };
      }
      return at !== undefined ? { point: at } : { box: anchor?.getBoundingClientRect() ?? NO_BOX };
    };
    const place = (): void => {
      const size = { width: menu.offsetWidth, height: menu.offsetHeight };
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const spot = placeMenu(from(), size, viewport);
      menu.style.left = `${spot.left}px`;
      menu.style.top = `${spot.top}px`;
    };

    // A window that shrinks under a tall menu can hide the cursor's item.
    const replace = (): void => {
      place();
      revealItem(itemId, cursorRef.current);
    };

    place();
    // A menu taller than the window scrolls; it opens with its cursor in view.
    revealItem(itemId, cursorRef.current);
    window.addEventListener('resize', replace);
    return () => window.removeEventListener('resize', replace);
  }, [at, anchor, besideId, turn, itemId, surfaceRef]);

  let index = -1;

  return createPortal(
    <div
      aria-activedescendant={cursor === null ? undefined : `${itemId}-${cursor}`}
      aria-label={label}
      aria-labelledby={labelledBy}
      className={compact ? 'folder-menu folder-menu-compact menu-popup' : 'folder-menu menu-popup'}
      data-native-keyboard
      data-overlay
      dir={dir}
      id={id}
      onBlur={onBlur}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={onKeyDown}
      // A press on an item must not take the focus from the menu, which holds the keys.
      onMouseDown={(event) => event.preventDefault()}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
      ref={surfaceRef}
      role="menu"
      tabIndex={-1}
    >
      {entries.map((entry, entryIndex) => {
        if (entry.kind === 'separator') {
          return (
            <div
              className="folder-menu-separator"
              key={`separator-${entryIndex}`}
              role="separator"
            />
          );
        }
        if (entry.kind === 'heading') {
          return (
            <div className="entry-menu-heading" key={`heading-${entryIndex}`} role="presentation">
              {entry.label}
            </div>
          );
        }
        index += 1;
        const position = index;
        const Icon = entry.icon;
        const submenu = entry.kind === 'submenu';
        const open = submenu && expanded?.id === entry.id;
        const classes = [
          'folder-menu-option',
          position === cursor ? 'cursor' : '',
          !submenu && entry.danger === true ? 'danger' : ''
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div
            aria-checked={submenu ? undefined : entry.checked}
            aria-controls={open ? expanded.menu : undefined}
            aria-disabled={entry.disabled === true || undefined}
            aria-expanded={submenu ? open : undefined}
            aria-haspopup={submenu ? 'menu' : undefined}
            className={classes}
            id={`${itemId}-${position}`}
            key={entry.id}
            onClick={() => onRowClick(entry)}
            onMouseMove={() => onRowMove(entry)}
            role={submenu || entry.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
            {...describedTooltip(entry.tip)}
          >
            <span aria-hidden className="row-icon">
              {Icon === undefined ? entry.mark : <Icon size={ICON_MD} />}
            </span>
            <span className="menu-label">
              <span className="menu-label-text">{entry.label}</span>
              {submenu || entry.current === undefined || entry.current === null ? null : (
                <CurrentDot label={entry.current} />
              )}
            </span>
            {submenu || entry.chord === undefined ? null : <KeyChord chord={entry.chord} />}
          </div>
        );
      })}
    </div>,
    document.fullscreenElement ?? document.body
  );
}

/** The submenu shown: its item's id, its cursor, and whether it holds the keys. */
interface OpenSubmenu {
  readonly id: string;
  readonly pointed: string | null;
  readonly keys: boolean;
}

/**
 * A menu of verbs or places, opened at a point (a secondary click's) or
 * dropped from an element (a crumb's ⌄, an Actions button): each item its
 * glyph, its words, and its chord as key caps; a destructive one in the
 * danger tone; a setting with its check; the current place with its dot;
 * separators and group headings between them; and items that open a
 * submenu beside them, one level deep. It is the menu look
 * (`.folder-menu`) drawn through a portal on the document's body (or the
 * element shown full screen), so no pane or dialog clips it, placed inside
 * the window (`placeMenu`); React still carries its events to its owner.
 *
 * It takes the focus and holds the keys while open (`menuKeyAction`: ↑ ↓,
 * Home, End, Return and Space, → and ←, Escape and Tab), which travel no
 * further, so neither a dialog nor the page hears them; `data-native-keyboard`
 * keeps the browser-key guard and a page's own key handlers out
 * (`isNativeKeyboardTarget`), and `data-overlay` marks it an open overlay
 * while it shows. A press on it never takes the focus from it; a press or
 * a focus anywhere else closes it. A menu taller than the window less its
 * margins scrolls, and the keys keep the cursor's item in view.
 *
 * A submenu opens beside its item (on the inline-end side, or the other
 * when the window has no room there) when the pointer rests on the item or
 * presses it, showing without the keys, or with the keys and its cursor on
 * its first item that can run on → (← in a right-to-left page), Return,
 * or Space. ← goes back to its item, and Escape closes the submenu alone;
 * Tab closes the whole menu. The pointer crossing other items on its way
 * into the submenu leaves it open for a moment, and moving over the
 * submenu gives it the keys.
 */
export function Menu({
  label,
  entries,
  at,
  anchor = null,
  initial = null,
  compact = false,
  dir: dirGiven,
  onPick,
  onClose
}: MenuProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLSpanElement>(null);
  const [dirFound, setDirFound] = useState<'ltr' | 'rtl' | undefined>(undefined);
  const dir = dirGiven ?? dirFound;
  const subRef = useRef<HTMLDivElement>(null);
  const itemId = useId();
  const subItemId = useId();
  const [pointed, setPointed] = useState<string | null>(initial);
  const [subState, setSub] = useState<OpenSubmenu | null>(null);
  const grace = useRef<{ readonly timer: number; to: MenuRowEntry } | null>(null);
  const rows = entries.filter(isRow);
  const pickable = pickableRows(rows);
  const cursor = pickableCursor(pickable, pointed);
  const cursorRow = cursor === null ? null : (rows[cursor] ?? null);
  const subPlace =
    subState === null
      ? -1
      : rows.findIndex((row) => row.kind === 'submenu' && row.id === subState.id && !row.disabled);
  const subEntry = subPlace === -1 ? null : (rows[subPlace] as MenuSubmenuEntry);
  // The submenu shown: none once its item is disabled or gone from `entries`.
  const sub = subEntry === null ? null : subState;
  const subRows = subEntry === null ? [] : subEntry.entries.filter(isItem);
  const subPickable = pickableRows(subRows);
  const subCursor =
    sub === null || sub.pointed === null ? null : pickableCursor(subPickable, sub.pointed);
  const subCursorRow = subCursor === null ? null : (subRows[subCursor] ?? null);
  const keysInSub = subEntry !== null && sub?.keys === true;
  const onCloseRef = useRef(onClose);
  const subCursorRef = useRef(subCursor);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    subCursorRef.current = subCursor;
  });

  // Drawn on the body, it reads in the direction of what opened it.
  useLayoutEffect(() => {
    const opener = anchor ?? originRef.current;
    if (opener !== null) setDirFound(isRtl(opener) ? 'rtl' : 'ltr');
  }, [anchor]);

  // An item disabled or gone takes its submenu with it.
  useEffect(() => {
    if (subState !== null && subEntry === null) setSub(null);
  }, [subState, subEntry]);

  // The keys stay where the menu holds them, the menu or its submenu, and
  // come back to it when it moves (the anchor may have taken them). Keys
  // taking over a submenu the pointer opened bring its cursor into view.
  useLayoutEffect(() => {
    (keysInSub ? subRef : rootRef).current?.focus({ preventScroll: true });
    if (keysInSub) revealItem(subItemId, subCursorRef.current);
  }, [keysInSub, at, anchor, subItemId]);

  // A press outside closes it, but one on its anchor, which toggles it.
  useEffect(() => {
    const listener = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        rootRef.current?.contains(target) ||
        subRef.current?.contains(target) ||
        anchor?.contains(target)
      )
        return;
      onCloseRef.current('pointer');
    };
    document.addEventListener('mousedown', listener, true);
    return () => document.removeEventListener('mousedown', listener, true);
  }, [anchor]);

  useEffect(
    () => () => {
      if (grace.current !== null) window.clearTimeout(grace.current.timer);
    },
    []
  );

  const clearGrace = (): void => {
    if (grace.current === null) return;
    window.clearTimeout(grace.current.timer);
    grace.current = null;
  };

  const run = (item: MenuRowEntry | null): void => {
    if (item !== null && item.kind !== 'submenu' && item.disabled !== true) onPick(item.id);
  };

  // The keys go back to the menu before the submenu goes, so its unmount never drops the focus.
  const closeSub = (): void => {
    clearGrace();
    if (subRef.current?.contains(document.activeElement)) {
      rootRef.current?.focus({ preventScroll: true });
    }
    setSub(null);
  };

  // With the keys, its cursor starts on its first item that can run; for the pointer, on none.
  const openSub = (item: MenuSubmenuEntry, keys: boolean): void => {
    clearGrace();
    const items = item.entries.filter(isItem);
    const first = keys ? pickableCursor(pickableRows(items), null) : null;
    setPointed(item.id);
    setSub({ id: item.id, keys, pointed: first === null ? null : (items[first]?.id ?? null) });
  };

  // The pointer rests on a row of the menu: it takes the cursor, and a submenu's opens.
  const pointAt = (row: MenuRowEntry): void => {
    clearGrace();
    if (sub?.id === row.id) return;
    if (sub !== null) closeSub();
    if (row.disabled === true) return;
    if (row.kind === 'submenu') openSub(row, false);
    else setPointed(row.id);
  };

  const within = (to: EventTarget | null): boolean =>
    to instanceof Node &&
    (rootRef.current?.contains(to) === true ||
      subRef.current?.contains(to) === true ||
      anchor?.contains(to) === true);

  const onBlur = (event: FocusEvent<HTMLDivElement>): void => {
    if (!within(event.relatedTarget)) onClose('pointer');
  };

  const take = (event: KeyboardEvent<HTMLDivElement>): MenuKeyAction | null => {
    const action = menuKeyAction(event, isRtl(event.currentTarget));
    if (action === null) return null;
    event.preventDefault();
    event.stopPropagation();
    return action;
  };

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    const action = take(event);
    if (action === null) return;
    switch (action.kind) {
      case 'close':
        // Escape closes a submenu the pointer opened before the menu.
        if (action.all || sub === null) onClose('keyboard');
        else closeSub();
        return;
      case 'back':
        if (sub !== null) closeSub();
        return;
      case 'open':
      case 'run':
        if (cursorRow?.kind === 'submenu') openSub(cursorRow, true);
        else if (action.kind === 'run') run(cursorRow);
        return;
      default: {
        const next =
          action.kind === 'move'
            ? movedPickableCursor(pickable, cursor, action.delta)
            : movedPickableCursor(pickable, null, action.to === 'first' ? 1 : -1);
        if (sub !== null) closeSub();
        setPointed(next === null ? null : (rows[next]?.id ?? null));
        // Only the keys scroll: an item under the pointer is already in view.
        revealItem(itemId, next);
      }
    }
  };

  const onSubKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    const action = take(event);
    if (action === null || sub === null) return;
    switch (action.kind) {
      case 'close':
        if (action.all) onClose('keyboard');
        else closeSub();
        return;
      case 'back':
        closeSub();
        return;
      case 'open':
        return;
      case 'run':
        run(subCursorRow);
        return;
      default: {
        const next =
          action.kind === 'move'
            ? movedPickableCursor(subPickable, subCursor, action.delta)
            : movedPickableCursor(subPickable, null, action.to === 'first' ? 1 : -1);
        setSub({ ...sub, pointed: next === null ? null : (subRows[next]?.id ?? null) });
        revealItem(subItemId, next);
      }
    }
  };

  const subMenuId = `${subItemId}-menu`;

  return (
    <>
      {/* Where it is rendered, so it reads in that place's direction. */}
      {dirGiven === undefined && anchor === null ? <span hidden ref={originRef} /> : null}
      <MenuSurface
        anchor={anchor}
        at={at}
        compact={compact}
        cursor={cursor}
        dir={dir}
        entries={entries}
        expanded={subEntry === null ? null : { id: subEntry.id, menu: subMenuId }}
        itemId={itemId}
        label={label}
        onBlur={onBlur}
        onKeyDown={onMenuKey}
        onMouseLeave={clearGrace}
        onRowClick={(row) => {
          if (row.kind === 'submenu') pointAt(row);
          else run(row);
        }}
        onRowMove={(row) => {
          if (sub === null || row.id === sub.id) {
            pointAt(row);
            return;
          }
          // On its way into the submenu the pointer may cross other items:
          // the one it stays on takes the cursor once the moment passes.
          if (grace.current !== null) {
            grace.current.to = row;
            return;
          }
          grace.current = {
            to: row,
            timer: window.setTimeout(() => {
              const to = grace.current?.to;
              grace.current = null;
              if (to !== undefined) pointAt(to);
            }, SUBMENU_GRACE_MS)
          };
        }}
        surfaceRef={rootRef}
      />
      {subEntry === null ? null : (
        <MenuSurface
          anchor={anchor}
          at={at}
          besideId={`${itemId}-${subPlace}`}
          compact={compact}
          cursor={subCursor}
          dir={dir}
          entries={subEntry.entries}
          expanded={null}
          id={subMenuId}
          itemId={subItemId}
          labelledBy={`${itemId}-${subPlace}`}
          onBlur={onBlur}
          onKeyDown={onSubKey}
          onMouseLeave={clearGrace}
          onMouseMove={clearGrace}
          onRowClick={run}
          onRowMove={(row) => {
            clearGrace();
            if (row.disabled !== true && sub !== null)
              setSub({ ...sub, pointed: row.id, keys: true });
          }}
          surfaceRef={subRef}
        />
      )}
    </>
  );
}
