import type { LucideIcon } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode
} from 'react';
import { createPortal } from 'react-dom';

import { ICON_MD } from '../icon/sizes.js';
import type { Chord } from '../keyboard/Keyboard.logic.js';
import { KeyChord } from '../keychord/KeyChord.js';
import { CurrentDot } from '../listing/CurrentDot.js';
import { describedTooltip } from '../tooltip/Tooltip.logic.js';
import { menuKeyAction, placeMenu, type MenuPoint } from './Menu.logic.js';
import { movedPickableCursor, pickableCursor } from './MenuQuery.logic.js';

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

/** One entry of a menu, in order. */
export type MenuEntry = MenuItemEntry | MenuSeparatorEntry | MenuHeadingEntry;

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
  /** The item the cursor starts on (the current one); the first that can run when absent. */
  readonly initial?: string | null;
  /** The small size, for a menu of short commands (`.folder-menu-compact`). */
  readonly compact?: boolean;
  /** Runs an item that can run, by its id; the caller closes the menu. */
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

const isItem = (entry: MenuEntry): entry is MenuItemEntry =>
  entry.kind === undefined || entry.kind === 'item';

/**
 * A menu of verbs or places, opened at a point (a secondary click's) or
 * dropped from an element (a crumb's ⌄, an Actions button): each item its
 * glyph, its words, and its chord as key caps; a destructive one in the
 * danger tone; a setting with its check; the current place with its dot;
 * separators and group headings between them. It is the menu look
 * (`.folder-menu`) drawn through a portal on the document's body (or the
 * element shown full screen), so no pane or dialog clips it, placed inside
 * the window (`placeMenu`); React still carries its events to its owner.
 *
 * It takes the focus and holds the keys while open (`menuKeyAction`: ↑ ↓,
 * Home, End, Return and Space, Escape and Tab), which travel no further, so
 * neither a dialog nor the page hears them; `data-native-keyboard` keeps
 * the browser-key guard and a page's own key handlers out
 * (`isNativeKeyboardTarget`), and `data-overlay` marks it an open overlay
 * while it shows. A press on it never takes the focus from it; a press or
 * a focus anywhere else closes it. A menu taller than the window less its
 * margins scrolls, and the keys keep the cursor's item in view.
 */
export function Menu({
  label,
  entries,
  at,
  anchor = null,
  initial = null,
  compact = false,
  onPick,
  onClose
}: MenuProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const itemId = useId();
  const [pointed, setPointed] = useState<string | null>(initial);
  const items = entries.filter(isItem);
  const rows = items.map((item) => ({ key: item.id, taken: item.disabled === true }));
  const cursor = pickableCursor(rows, pointed);
  const cursorItem = cursor === null ? null : (items[cursor] ?? null);
  const onCloseRef = useRef(onClose);
  const cursorRef = useRef(cursor);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    cursorRef.current = cursor;
  });

  // Placed after layout, when its own size is known, and given the keys;
  // placed again when the window resizes, so it never stands outside it,
  // with the cursor's item kept in view and the focus left where it is.
  useLayoutEffect(() => {
    const menu = rootRef.current;
    if (menu === null) return;
    const place = (): void => {
      const size = { width: menu.offsetWidth, height: menu.offsetHeight };
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const spot = placeMenu(
        at !== undefined
          ? { point: at }
          : { box: anchor?.getBoundingClientRect() ?? { left: 0, top: 0, right: 0, bottom: 0 } },
        size,
        viewport
      );
      menu.style.left = `${spot.left}px`;
      menu.style.top = `${spot.top}px`;
    };

    // A window that shrinks under a tall menu can hide the cursor's item.
    const replace = (): void => {
      place();
      revealItem(itemId, cursorRef.current);
    };

    place();
    menu.focus({ preventScroll: true });
    // A menu taller than the window scrolls; it opens with its cursor in view.
    revealItem(itemId, cursorRef.current);
    window.addEventListener('resize', replace);
    return () => window.removeEventListener('resize', replace);
  }, [at, anchor, itemId]);

  // A press outside closes it, but one on its anchor, which toggles it.
  useEffect(() => {
    const listener = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target) || anchor?.contains(target)) return;
      onCloseRef.current('pointer');
    };
    document.addEventListener('mousedown', listener, true);
    return () => document.removeEventListener('mousedown', listener, true);
  }, [anchor]);

  const run = (item: MenuItemEntry | null): void => {
    if (item !== null && item.disabled !== true) onPick(item.id);
  };

  let index = -1;

  return createPortal(
    <div
      aria-activedescendant={cursor === null ? undefined : `${itemId}-${cursor}`}
      aria-label={label}
      className={compact ? 'folder-menu folder-menu-compact menu-popup' : 'folder-menu menu-popup'}
      data-native-keyboard
      data-overlay
      onBlur={(event) => {
        const to = event.relatedTarget;
        if (to instanceof Node && (event.currentTarget.contains(to) || anchor?.contains(to)))
          return;
        onClose('pointer');
      }}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        const action = menuKeyAction(event);
        if (action === null) return;
        event.preventDefault();
        event.stopPropagation();
        if (action.kind === 'close') onClose('keyboard');
        else if (action.kind === 'run') run(cursorItem);
        else {
          const next =
            action.kind === 'move'
              ? movedPickableCursor(rows, cursor, action.delta)
              : movedPickableCursor(rows, null, action.to === 'first' ? 1 : -1);
          setPointed(next === null ? null : (items[next]?.id ?? null));
          // Only the keys scroll: an item under the pointer is already in view.
          revealItem(itemId, next);
        }
      }}
      // A press on an item must not take the focus from the menu, which holds the keys.
      onMouseDown={(event) => event.preventDefault()}
      ref={rootRef}
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
        const classes = [
          'folder-menu-option',
          position === cursor ? 'cursor' : '',
          entry.danger === true ? 'danger' : ''
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div
            aria-checked={entry.checked}
            key={entry.id}
            aria-disabled={entry.disabled === true || undefined}
            className={classes}
            id={`${itemId}-${position}`}
            onClick={() => run(entry)}
            onMouseMove={() => {
              if (entry.disabled !== true) setPointed(entry.id);
            }}
            role={entry.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
            {...describedTooltip(entry.tip)}
          >
            <span aria-hidden className="row-icon">
              {Icon === undefined ? entry.mark : <Icon size={ICON_MD} />}
            </span>
            <span className="menu-label">
              <span className="menu-label-text">{entry.label}</span>
              {entry.current === undefined || entry.current === null ? null : (
                <CurrentDot label={entry.current} />
              )}
            </span>
            {entry.chord === undefined ? null : <KeyChord chord={entry.chord} />}
          </div>
        );
      })}
    </div>,
    document.fullscreenElement ?? document.body
  );
}
