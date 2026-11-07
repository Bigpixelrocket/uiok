import { ClipboardPaste, Copy, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement } from 'react';

import { KeyChord } from '../keychord/KeyChord.js';
import { movedPickableCursor, pickableCursor } from '../menu/MenuQuery.logic.js';
import {
  placeTerminalMenu,
  terminalMenuKeyAction,
  type TerminalMenuBox,
  type TerminalMenuItem,
  type TerminalMenuVerb
} from './TerminalMenu.logic.js';

/** Each verb's glyph. */
const ICONS: Readonly<Record<TerminalMenuVerb, LucideIcon>> = {
  copy: Copy,
  paste: ClipboardPaste
};

/** What opens the menu, and what its choices reach. */
export interface TerminalMenuProps {
  /** The point the secondary click landed on, in window coordinates. */
  readonly at: { readonly x: number; readonly y: number };
  /** The terminal's screen, in window coordinates, which the menu stays over when it fits. */
  readonly within: TerminalMenuBox;
  /** The items to list, in order (`terminalMenuItems`). */
  readonly items: readonly TerminalMenuItem[];
  /** The menu's accessible name, read by assistive technology only. */
  readonly label: string;
  /** Runs an enabled item's verb; the caller closes the menu. */
  readonly onRun: (verb: TerminalMenuVerb) => void;
  /**
   * Closes the menu, saying how it was dismissed: by a key pressed in it,
   * after which the terminal takes the keys back, or by a press or a focus
   * elsewhere, which has its own destination.
   */
  readonly onClose: (by: 'keyboard' | 'pointer') => void;
}

/**
 * The terminal's menu: Copy and Paste with their chords, in the menu look,
 * opened at the point a secondary click landed.
 *
 * It holds the keys while open (↑ ↓, Return and Space, Escape;
 * `terminalMenuKeyAction`), which travel no further, so neither a dialog
 * around the terminal nor the page hears them; `data-native-keyboard` keeps
 * a page's own key handlers out, and `data-overlay` marks it an open overlay
 * (`OVERLAY_SELECTOR`) while it shows. A press on it never takes the focus
 * from it; a press or a focus anywhere else closes it.
 */
export function TerminalMenu({
  at,
  within,
  items,
  label,
  onRun,
  onClose
}: TerminalMenuProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const itemId = useId();
  const [pointed, setPointed] = useState<TerminalMenuVerb | null>(null);
  const rows = items.map((item) => ({ key: item.verb, taken: !item.enabled }));
  const cursor = pickableCursor(rows, pointed);
  const cursorItem = cursor === null ? null : (items[cursor] ?? null);
  const onCloseRef = useRef(onClose);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  // Placed after layout, when its own size is known, and given the keys.
  useLayoutEffect(() => {
    const menu = rootRef.current;
    if (menu === null) return;
    const place = placeTerminalMenu(
      at,
      { width: menu.offsetWidth, height: menu.offsetHeight },
      within,
      { width: window.innerWidth, height: window.innerHeight }
    );
    menu.style.left = `${place.left}px`;
    menu.style.top = `${place.top}px`;
    menu.focus({ preventScroll: true });
  }, [at, within]);

  // A press outside closes it; the press goes on to whatever it landed on.
  useEffect(() => {
    const listener = (event: MouseEvent): void => {
      if (!(event.target instanceof Node) || !rootRef.current?.contains(event.target)) {
        onCloseRef.current('pointer');
      }
    };
    document.addEventListener('mousedown', listener, true);
    return () => document.removeEventListener('mousedown', listener, true);
  }, []);

  const run = (item: TerminalMenuItem | null): void => {
    if (item?.enabled === true) onRun(item.verb);
  };

  return (
    <div
      aria-activedescendant={cursor === null ? undefined : `${itemId}-${cursor}`}
      aria-label={label}
      className="terminal-menu"
      data-native-keyboard
      data-overlay
      // The focus left for somewhere else: another control, or another window.
      onBlur={(event) => {
        if (!(
          event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)
        )) {
          onClose('pointer');
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        const action = terminalMenuKeyAction(event);
        if (action === null) return;
        event.preventDefault();
        event.stopPropagation();
        if (action.kind === 'close') onClose('keyboard');
        else if (action.kind === 'run') run(cursorItem);
        else {
          const next = movedPickableCursor(rows, cursor, action.delta);
          setPointed(next === null ? null : (items[next]?.verb ?? null));
        }
      }}
      // A press on an item must not take the focus from the menu, which holds the keys.
      onMouseDown={(event) => event.preventDefault()}
      ref={rootRef}
      role="menu"
      tabIndex={-1}
    >
      {items.map((item, index) => {
        const Icon = ICONS[item.verb];
        return (
          <div
            aria-disabled={!item.enabled}
            className={index === cursor ? 'terminal-menu-item cursor' : 'terminal-menu-item'}
            id={`${itemId}-${index}`}
            key={item.verb}
            onClick={() => run(item)}
            onMouseMove={() => {
              if (item.enabled) setPointed(item.verb);
            }}
            role="menuitem"
          >
            <span className="terminal-menu-icon">
              <Icon aria-hidden size={13} />
            </span>
            <span className="terminal-menu-label">{item.label}</span>
            <KeyChord chord={item.chord} />
          </div>
        );
      })}
    </div>
  );
}
