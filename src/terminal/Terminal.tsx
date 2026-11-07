/**
 * A terminal surface: Ghostty's VT engine (libghostty-vt, as WebAssembly)
 * drawn on a canvas by `ghostty/surface`. React mounts it and relays props;
 * parsing, painting, input, and selection run outside React.
 *
 * Output written through the handle is queued, parsed in the next animation
 * frame right before it is painted, and acknowledged through `onConsumed`
 * once parsed. Writes, resets, and focus requests that arrive before the
 * engine has loaded (it loads lazily, once per page) are held and applied
 * when it is ready.
 *
 * The scrollback length comes from `TerminalScrollbackContext`, and the
 * engine follows a change to it while the terminal runs.
 *
 * With `actionForKey`, the host binds chords to the terminal's own actions
 * (`TerminalAction`: clear to start and the macOS line-editing moves): a
 * keystroke it maps to one runs it instead of reaching the program, and
 * every other key is encoded as typed. Without it no chord does.
 *
 * With `onBell`, a bell the program rings flashes the terminal, briefly and
 * at most twice a second however fast it rings (`bellFlashes`); under
 * reduced motion the flash is a still tint at the edges instead.
 *
 * Copy and paste work in every terminal through the document's copy and
 * paste events (⌘C and ⌘V, or an Edit menu's items), and through the menu a
 * secondary click opens (`TerminalMenu`): Copy while text is selected, and
 * Paste, which reads the clipboard with the web Clipboard API and pastes as
 * ⌘V does. There is no Cut, and an Edit menu's Cut does nothing here. The
 * click opens the menu even while a program tracks the mouse, which then
 * never hears the right button.
 *
 * Without `onInput` the terminal is read-only: no input element and no
 * cursor, but selection and copy still work, Paste is offered dimmed and ⌘V
 * does nothing, and the bell never rings. The canvas is hidden from
 * assistive technology either way; a read-only terminal's host is a
 * labelled, focusable group (hosts keep their own text alternative, such as
 * a log mirror), and an interactive terminal's label sits on its input
 * element.
 */

import {
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type Ref
} from 'react';

import { useLabels } from '../labels/UiokProvider.js';
import { subscribeThemeChange } from '../themes/attributes.js';
import type { GhosttyColor, GhosttyTheme } from './ghostty/core.js';
import { GhosttyTerminalSurface } from './ghostty/surface.js';
import {
  BELL_FLASH_MS,
  TERMINAL_FONT_SIZE,
  TERMINAL_LINE_HEIGHT,
  bellFlashes,
  parseCssColor,
  terminalActionInput,
  terminalFontFamilyFromCss,
  terminalThemeFromTokens,
  type TerminalAction,
  type TerminalKeyStroke
} from './Terminal.logic.js';
import { TerminalMenu } from './TerminalMenu.js';
import {
  DEFAULT_TERMINAL_MENU_CHORDS,
  terminalMenuItems,
  type TerminalMenuBox,
  type TerminalMenuChords,
  type TerminalMenuState,
  type TerminalMenuVerb
} from './TerminalMenu.logic.js';
import { TerminalScrollbackContext } from './TerminalScrollback.js';

/** Imperative control of a mounted terminal. */
export interface TerminalHandle {
  /** Feeds output (text with VT escape sequences) to the screen. */
  write: (data: string) => void;
  /** Clears the screen and scrollback and resets every terminal mode. */
  reset: () => void;
  /** Moves keyboard focus into the terminal; a read-only terminal takes focus for selection only. */
  focus: () => void;
  /**
   * Runs one of the terminal's own actions, as its chord would: a press on a
   * legend's slot. Nothing happens on a read-only terminal or before the
   * engine is ready.
   */
  perform: (action: TerminalAction) => void;
}

/** A terminal's grid in cells. */
export interface TerminalSize {
  readonly cols: number;
  readonly rows: number;
}

/** What the host supplies; omitting `onInput` makes the terminal read-only. */
export interface TerminalProps {
  /** Accessible name of the terminal region, e.g. "Install log" or "Terminal". */
  readonly ariaLabel: string;
  /**
   * Receives keystrokes, pastes, and the terminal's own replies to queries.
   * Absent means read-only: no cursor, no input, selection and copy only.
   */
  readonly onInput?: (data: string) => void;
  /** Called after the first layout and on every later change of the grid size. */
  readonly onResize?: (size: TerminalSize) => void;
  /**
   * Called once a written chunk is parsed, with its length in UTF-16 code
   * units, so a session can acknowledge output to the host.
   */
  readonly onConsumed?: (units: number) => void;
  /**
   * Turns the visual bell on: called for every bell the program rings, once
   * per parse, including those folded into a flash already showing, so a
   * host that marks a hidden terminal never misses one. Absent, a bell
   * neither flashes nor reports; a read-only terminal never rings.
   */
  readonly onBell?: () => void;
  /**
   * The chords the terminal answers itself: the action a keystroke runs, or
   * null for a key the program gets. Read on every key, so a host's new
   * bindings apply at once; absent, every key is the program's. Ignored by
   * a read-only terminal.
   */
  readonly actionForKey?: (stroke: TerminalKeyStroke) => TerminalAction | null;
  /**
   * The chords the menu shows beside Copy and Paste, the app's own for those
   * verbs; ⌘C and ⌘V when absent (`DEFAULT_TERMINAL_MENU_CHORDS`).
   */
  readonly menuChords?: TerminalMenuChords;
  /** Layout class for the host element (size and position only). */
  readonly className?: string;
  /** Receives the imperative handle: write, reset, focus, and perform. */
  readonly ref?: Ref<TerminalHandle>;
}

interface TerminalCallbacks {
  readonly onInput: ((data: string) => void) | undefined;
  readonly onResize: ((size: TerminalSize) => void) | undefined;
  readonly onConsumed: ((units: number) => void) | undefined;
  readonly onBell: (() => void) | undefined;
  readonly actionForKey: ((stroke: TerminalKeyStroke) => TerminalAction | null) | undefined;
}

/**
 * The open menu: where the click landed, the screen it stays over, and what
 * its items stood on then, which they are titled from with the labels in use.
 */
interface OpenMenu {
  readonly at: { readonly x: number; readonly y: number };
  readonly within: TerminalMenuBox;
  readonly state: TerminalMenuState;
}

let colorProbe: CanvasRenderingContext2D | null | undefined;

/**
 * Resolves a color the token parser does not read (a named color, `hsl()`,
 * `color-mix()`) by painting it; null where no canvas is available.
 */
function probeCssColor(value: string): GhosttyColor | null {
  const parsed = parseCssColor(value);
  if (parsed !== null || value.trim().length === 0) return parsed;
  try {
    if (colorProbe === undefined) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      colorProbe = canvas.getContext('2d', { willReadFrequently: true });
    }
    if (colorProbe === null) return null;
    colorProbe.clearRect(0, 0, 1, 1);
    colorProbe.fillStyle = value;
    colorProbe.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, alpha = 0] = colorProbe.getImageData(0, 0, 1, 1).data;
    return alpha === 0 ? null : { r, g, b };
  } catch {
    return null;
  }
}

/** Clears the screen, or sends an editing action's bytes to the program from the live screen. */
function performAction(
  surface: GhosttyTerminalSurface,
  action: TerminalAction,
  send: ((data: string) => void) | undefined
): void {
  const input = terminalActionInput(action);
  if (input === null) {
    surface.clearToStart();
  } else {
    surface.scrollToBottom();
    send?.(input);
  }
}

/**
 * Runs a menu verb. Copy writes the selection as plain text, the text ⌘C
 * copies; Paste reads the clipboard's text and pastes it as ⌘V does. Both go
 * through the web Clipboard API, which needs a secure context and, for
 * reading, the page's clipboard permission; a refusal is logged. A
 * clipboard with no text pastes nothing, as ⌘V does.
 */
function runMenuVerb(surface: GhosttyTerminalSurface, verb: TerminalMenuVerb): void {
  if (verb === 'copy') {
    const text = surface.getSelection();
    if (text.length === 0) return;
    navigator.clipboard.writeText(text).catch((error: unknown) => {
      console.error('Could not copy the selection', error);
    });
    return;
  }
  navigator.clipboard.readText().then(
    (text) => surface.paste(text),
    (error: unknown) => console.error('Could not read the clipboard', error)
  );
}

function readTheme(element: HTMLElement): GhosttyTheme {
  const styles = getComputedStyle(element);
  return terminalThemeFromTokens((token) => styles.getPropertyValue(token), probeCssColor);
}

/** A terminal for an interactive shell (with `onInput`) or a read-only log (without). */
export function Terminal({
  ariaLabel,
  onInput,
  onResize,
  onConsumed,
  onBell,
  actionForKey,
  menuChords = DEFAULT_TERMINAL_MENU_CHORDS,
  className,
  ref
}: TerminalProps): ReactElement {
  const labels = useLabels().terminal;
  const readOnly = onInput === undefined;
  const mountRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<GhosttyTerminalSurface | null>(null);
  // Output written before the engine is ready, applied in order once it is.
  const pendingRef = useRef<string[]>([]);
  const failedRef = useRef(false);
  const [failed, setFailed] = useState(false);
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const callbacksRef = useRef<TerminalCallbacks>({
    onInput,
    onResize,
    onConsumed,
    onBell,
    actionForKey
  });
  const ariaLabelRef = useRef(ariaLabel);
  const scrollbackLines = useContext(TerminalScrollbackContext);
  // Read when the engine starts; the effect below hands it later changes.
  const scrollbackLinesRef = useRef(scrollbackLines);

  // Latest-ref pattern: assigned at every commit, in the layout phase, so a
  // parent's layout effect that writes through the handle already sees it.
  useLayoutEffect(() => {
    callbacksRef.current = { onInput, onResize, onConsumed, onBell, actionForKey };
    ariaLabelRef.current = ariaLabel;
    scrollbackLinesRef.current = scrollbackLines;
    surfaceRef.current?.input?.setAttribute('aria-label', ariaLabel);
  });

  // A running engine follows the length; one still loading reads it when ready.
  useEffect(() => {
    surfaceRef.current?.setScrollbackLines(scrollbackLines);
  }, [scrollbackLines]);

  useImperativeHandle(
    ref,
    () => ({
      write: (data) => {
        if (data.length === 0) return;
        const surface = surfaceRef.current;
        if (surface !== null) surface.enqueue(data);
        // An engine that could not start still releases the session's output.
        else if (failedRef.current) callbacksRef.current.onConsumed?.(data.length);
        else pendingRef.current.push(data);
      },
      reset: () => {
        const surface = surfaceRef.current;
        if (surface !== null) {
          surface.resetAndWrite('');
          return;
        }
        const dropped = pendingRef.current;
        pendingRef.current = [];
        for (const chunk of dropped) callbacksRef.current.onConsumed?.(chunk.length);
      },
      // Before the engine is ready the host element holds focus, and hands it
      // to the input element once that exists.
      focus: () => (surfaceRef.current ?? mountRef.current)?.focus(),
      perform: (action) => {
        const surface = surfaceRef.current;
        if (surface !== null && !readOnly) {
          performAction(surface, action, callbacksRef.current.onInput);
        }
      }
    }),
    [readOnly]
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (mount === null) return;
    let disposed = false;
    let surface: GhosttyTerminalSurface | null = null;
    // The tokens change with the appearance and with the theme the window wears.
    const stopFollowingTheme = subscribeThemeChange(() => surface?.setTheme(readTheme(mount)));

    const beforeKey = (event: KeyboardEvent): boolean => {
      const action = callbacksRef.current.actionForKey?.(event) ?? null;
      if (action === null) return true;
      event.preventDefault();
      event.stopPropagation();
      if (surface !== null) performAction(surface, action, callbacksRef.current.onInput);
      return false;
    };

    // The flash is a data attribute the stylesheet draws over the canvas, set
    // here rather than through React, which stays out of the frame loop.
    let lastFlashAt: number | null = null;
    let flashTimer: number | null = null;
    const endFlash = () => {
      if (flashTimer !== null) window.clearTimeout(flashTimer);
      flashTimer = null;
      mount.removeAttribute('data-bell');
    };
    // Only the flash is rate-limited: every bell is reported.
    const ring = () => {
      const report = callbacksRef.current.onBell;
      if (report === undefined) return;
      const now = performance.now();
      if (bellFlashes(lastFlashAt, now)) {
        lastFlashAt = now;
        endFlash();
        mount.setAttribute('data-bell', '');
        flashTimer = window.setTimeout(endFlash, BELL_FLASH_MS);
      }
      report();
    };

    const startLines = scrollbackLinesRef.current;
    GhosttyTerminalSurface.create(mount, {
      theme: readTheme(mount),
      font: {
        family: terminalFontFamilyFromCss(getComputedStyle(mount).getPropertyValue('--font-mono')),
        size: TERMINAL_FONT_SIZE,
        lineHeight: TERMINAL_LINE_HEIGHT
      },
      scrollbackLines: startLines,
      readOnly,
      inputLabel: ariaLabelRef.current,
      onData: (data) => callbacksRef.current.onInput?.(data),
      onResize: (cols, rows) => callbacksRef.current.onResize?.({ cols, rows }),
      onParsed: (units) => callbacksRef.current.onConsumed?.(units),
      ...(readOnly ? {} : { beforeKey, onBell: ring }),
      // A host that opens web links elsewhere (a desktop shell's default
      // browser) intercepts window.open.
      onLinkActivate: (url) => {
        window.open(url, '_blank', 'noopener,noreferrer');
      },
      onContextMenu: ({ clientX, clientY }) => {
        if (surface === null) return;
        const box = mount.getBoundingClientRect();
        setMenu({
          at: { x: clientX, y: clientY },
          within: { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
          state: { readOnly, hasSelection: surface.hasSelection() }
        });
      }
    }).then(
      (created) => {
        if (disposed) {
          created.dispose();
          return;
        }
        surface = created;
        surfaceRef.current = created;
        // The appearance and the length may have changed while the engine loaded.
        created.setTheme(readTheme(mount));
        if (scrollbackLinesRef.current !== startLines) {
          created.setScrollbackLines(scrollbackLinesRef.current);
        }
        const pending = pendingRef.current;
        pendingRef.current = [];
        for (const chunk of pending) created.enqueue(chunk);
        if (document.activeElement === mount) created.focus();
      },
      (error: unknown) => {
        if (disposed) return;
        console.error('Could not start the terminal', error);
        failedRef.current = true;
        const dropped = pendingRef.current;
        pendingRef.current = [];
        for (const chunk of dropped) callbacksRef.current.onConsumed?.(chunk.length);
        setFailed(true);
      }
    );

    return () => {
      disposed = true;
      setMenu(null);
      stopFollowingTheme();
      endFlash();
      if (surfaceRef.current === surface) surfaceRef.current = null;
      surface?.dispose();
    };
  }, [readOnly]);

  // Titled on every render, so an open menu follows a change of labels.
  const menuItems = menu === null ? null : terminalMenuItems(menu.state, labels, menuChords);

  return (
    <div className={className === undefined ? 'terminal' : `terminal ${className}`}>
      <div
        aria-label={readOnly ? ariaLabel : undefined}
        className="terminal-mount"
        hidden={failed}
        ref={mountRef}
        role={readOnly ? 'group' : undefined}
        tabIndex={readOnly ? 0 : -1}
      />
      {failed && <p className="terminal-failure">{labels.startFailed}</p>}
      {menu !== null && (
        <TerminalMenu
          at={menu.at}
          items={menuItems ?? []}
          label={labels.menu}
          onClose={(by) => {
            setMenu(null);
            if (by === 'keyboard') surfaceRef.current?.focus();
          }}
          onRun={(verb) => {
            setMenu(null);
            const surface = surfaceRef.current;
            if (surface === null) return;
            surface.focus();
            runMenuVerb(surface, verb);
          }}
          within={menu.within}
        />
      )}
    </div>
  );
}
