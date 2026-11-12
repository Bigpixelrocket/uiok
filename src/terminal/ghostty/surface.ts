/**
 * The browser side of one terminal: a Canvas 2D view over a libghostty-vt
 * core plus everything a terminal needs from the DOM. It owns sizing (a
 * ResizeObserver fit), frame scheduling, batched output parsing, keyboard and
 * IME input through a hidden textarea, clipboard, selection, scrollback and
 * its scrollbar, mouse reporting, web links, and cursor blinking. React never
 * runs in its frame loop.
 *
 * A read-only surface creates no input element and draws no cursor; it keeps
 * selection and copy, with the mount itself as the keyboard target.
 *
 * Copy and paste run through the DOM `copy` and `paste` events, because a
 * host's Edit menu may answer Command-C and Command-V with the
 * document's copy and paste commands whether or not the page saw the keydown. A settled
 * selection is therefore always parked in a real DOM selection (the input
 * element, or a hidden copy buffer when read-only) so the copy command has
 * something to act on. The Edit menu's Cut does nothing here: its `cut`
 * event is cancelled, so neither the clipboard nor the parked copy changes.
 * `paste` is the same paste for a host that read the clipboard itself.
 *
 * A secondary click (the right button, or a Control-click) is the host's
 * (`onContextMenu`): it never reaches a program tracking the mouse and leaves
 * the selection as it was, and the browser's own menu never shows.
 */

import {
  GhosttyTerminalCore,
  type GhosttyScrollbar,
  type GhosttySnapshot,
  type GhosttyTheme
} from './core.js';
import { isTerminalUrl } from './links.logic.js';
import {
  GhosttyTextInkCache,
  measureGhosttyCell,
  renderGhosttySnapshot,
  terminalGridSize,
  type GhosttyCellMetrics
} from './renderer.js';
import {
  DEFAULT_TERMINAL_FONT_FAMILY,
  advanceTerminalSelectionClickSequence,
  applyTerminalCopyEvent,
  areFontAdvancesMonospace,
  clearPrimedTerminalCopyInput,
  ghosttyMouseButton,
  isEmptyTerminalFontFamily,
  isSameTerminalLink,
  isTerminalAltGraphText,
  isTerminalCompositionCommitInput,
  isTerminalCompositionKey,
  isTerminalCopyShortcut,
  isTerminalPasteShortcut,
  isTerminalPointerDrag,
  isTerminalSecondaryPress,
  primeTerminalCopyInput,
  resolveTerminalMouseData,
  resolveTerminalMouseTrackingState,
  shouldBlinkTerminalCursor,
  shouldReportTerminalMouse,
  terminalCanvasBackingChange,
  terminalFontSize,
  terminalFontStack,
  terminalGridCellAt,
  terminalLineHeight,
  terminalLinkAtPositionWithRange,
  terminalScrollbarGeometry,
  terminalScrollbarOffsetAtPointer,
  terminalWheelArrowData,
  terminalWheelDeltaRows,
  type TerminalCanvasBacking,
  type TerminalLinkWithRange,
  type TerminalMouseAction,
  type TerminalSelectionClickSequence
} from './surface.logic.js';
import { DEFAULT_TERMINAL_LABELS } from '../../labels/terminal.js';

// The symbols font is named as the engine's WebAssembly is (runtime.ts): a
// relative string literal beside import.meta.url, which bundlers emit.
const SYMBOLS_FONT_URL = new URL('./fonts/SymbolsNerdFontMono-Regular.woff2', import.meta.url);

const CONTENT_PADDING = 4;
/** Half a blink cycle: the visible and hidden phases are equally long. */
const CURSOR_BLINK_INTERVAL_MS = 500;
/**
 * Queued output normally parses in the next animation frame, right before it
 * is drawn. An occluded window gets no frames, so a timer parses the queue
 * anyway: output keeps flowing (and keeps being acknowledged) while nobody
 * can see it.
 */
const QUEUED_OUTPUT_DEADLINE_MS = 50;
/**
 * A synchronized update (DEC 2026) holds every paint until the program ends
 * it, so a frame is never shown half drawn. One left open this long is ended
 * and painted instead of freezing the last frame.
 */
const SYNCHRONIZED_OUTPUT_RENDER_TIMEOUT_MS = 500;
/** How long the overlay scroll thumb stays after the scrollback stops moving. */
const SCROLLBAR_LINGER_MS = 1000;
const TERMINAL_FONT_LOAD_TEXT = 'iMW0@# .';
const TERMINAL_FONT_LOAD_VARIANTS = [
  'normal 400',
  'normal 700',
  'italic 400',
  'italic 700'
] as const;
const MONOSPACE_PROBE_GLYPHS = ['i', 'M', 'W', '0', '@', '#', '.', ' '] as const;

/** Requested terminal font; omitted fields fall back to the defaults. */
interface GhosttyTerminalFont {
  readonly family?: string;
  readonly size?: number;
  /** The line pitch in CSS pixels; 1.35 times the size when omitted (`terminalLineHeight`). */
  readonly lineHeight?: number;
}

let symbolsFontLoad: Promise<void> | null = null;

/**
 * Register the bundled symbols-only Nerd Font once per page. It loads lazily
 * with the first terminal, and because it carries no regular text glyphs it
 * composes with any text face without changing metrics: prompt symbols and
 * devicons render even on machines without a locally installed Nerd Font.
 */
function ensureTerminalSymbolsFont(): Promise<void> {
  if (symbolsFontLoad !== null) return symbolsFontLoad;
  symbolsFontLoad = (async () => {
    try {
      const face = new FontFace('Symbols Nerd Font Mono', `url(${SYMBOLS_FONT_URL.href})`);
      document.fonts.add(await face.load());
    } catch {
      // Locally installed fallback faces still apply.
    }
  })();
  return symbolsFontLoad;
}

let fontProbeContext: CanvasRenderingContext2D | null | undefined;

/**
 * Whether a family renders every character on the same advance. The cell
 * grid requires it: a proportional face draws its text narrower than the
 * lattice the cursor and selection are placed on. Unmeasurable environments
 * answer true, so a missing canvas never blocks a legitimate font.
 */
function isMonospaceFamily(families: string): boolean {
  try {
    if (fontProbeContext === undefined) {
      fontProbeContext = document.createElement('canvas').getContext('2d');
    }
    if (fontProbeContext === null) return true;
    const context = fontProbeContext;
    // Fall back to a generic mono so an absent face measures as monospace and
    // is left for the normal fallback chain to resolve.
    for (const variant of TERMINAL_FONT_LOAD_VARIANTS) {
      context.font = `${variant} 32px ${families}, monospace`;
      const advances = MONOSPACE_PROBE_GLYPHS.map((glyph) => context.measureText(glyph).width);
      if (!areFontAdvancesMonospace(advances)) return false;
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * The font stack the canvas uses for a requested family: the family with the
 * glyph fallbacks behind it, or the default stack when the family is empty or
 * proportional (a ragged grid with a stranded cursor is worse than a
 * different face). Exported for `surface.test.ts`, which checks the
 * proportional-face guard against measured advances.
 */
export function terminalFontFamily(family?: string): string {
  if (isEmptyTerminalFontFamily(family)) return DEFAULT_TERMINAL_FONT_FAMILY;
  const stack = terminalFontStack(family);
  return isMonospaceFamily(stack) ? stack : DEFAULT_TERMINAL_FONT_FAMILY;
}

/** Loads every style the renderer can request, then validates the actual face. */
async function loadTerminalFontFamily(family: string | undefined, size: number): Promise<string> {
  const candidate = terminalFontStack(family);
  try {
    await Promise.all(
      TERMINAL_FONT_LOAD_VARIANTS.map((variant) =>
        document.fonts.load(`${variant} ${size}px ${candidate}`, TERMINAL_FONT_LOAD_TEXT)
      )
    );
  } catch {
    // The fixed-width fallback stack remains available if a face cannot load.
  }
  return terminalFontFamily(family);
}

/** What a surface draws and whom it tells about input, size, and parsed output. */
export interface GhosttyTerminalSurfaceOptions {
  readonly theme: GhosttyTheme;
  readonly font?: GhosttyTerminalFont;
  /** Rows of history the terminal keeps above its screen until `setScrollbackLines` changes it. */
  readonly scrollbackLines: number;
  /** No input element, no cursor, no input sent anywhere; selection and copy remain. */
  readonly readOnly?: boolean;
  /** Accessible name of the input element of an interactive surface. */
  readonly inputLabel?: string;
  /** Accessible name of the scrollbar; `scrollbar` is public, so a host renames it in place. */
  readonly scrollbackLabel?: string;
  /** Keystrokes, pastes, IME text, mouse reports, and the terminal's own replies. */
  readonly onData: (data: string) => void;
  /** Settled grid size changes, debounced while a resize is in progress. */
  readonly onResize: (cols: number, rows: number) => void;
  /** Called with each `enqueue`d chunk's length in UTF-16 code units once it is parsed. */
  readonly onParsed?: (units: number) => void;
  /**
   * Called after a parse in which the program rang the bell, once however
   * many times it rang; never for a read-only surface or a replay.
   */
  readonly onBell?: () => void;
  /** Sees every keydown first; returning false leaves the key to the host and the browser. */
  readonly beforeKey?: (event: KeyboardEvent) => boolean;
  /** Opens a web link Command-clicked in the terminal; links stay inert when absent. */
  readonly onLinkActivate?: (url: string, event: MouseEvent) => void;
  /**
   * Asked for the terminal's menu by a secondary click on the screen, at the
   * point it landed in window coordinates; read-only surfaces ask too.
   */
  readonly onContextMenu?: (point: { readonly clientX: number; readonly clientY: number }) => void;
}

/** One mounted terminal; create with `GhosttyTerminalSurface.create`, release with `dispose`. */
export class GhosttyTerminalSurface {
  readonly canvas: HTMLCanvasElement;
  /** The hidden IME textarea; null for a read-only surface. */
  readonly input: HTMLTextAreaElement | null;
  /** The read-only surface's hidden copy buffer, holding the selection as DOM text; null otherwise. */
  private readonly copyBuffer: HTMLElement | null;
  readonly scrollbar: HTMLDivElement;
  cols = 1;
  rows = 1;

  private readonly mount: HTMLElement;
  /** The element keyboard focus lives on: the textarea, or the mount when read-only. */
  private readonly keyTarget: HTMLElement;
  private readonly readOnly: boolean;
  private readonly context: CanvasRenderingContext2D;
  private readonly core: GhosttyTerminalCore;
  private readonly options: GhosttyTerminalSurfaceOptions;
  private hasSize = false;
  private metrics: GhosttyCellMetrics;
  private fontFamily: string;
  private readonly requestedFontFamily: string | undefined;
  private readonly fontSize: number;
  private readonly lineHeight: number;
  private readonly resizeObserver: ResizeObserver;
  private readonly scrollbarThumb: HTMLDivElement;
  private snapshot: GhosttySnapshot | null = null;
  private frame = 0;
  private cursorTimer: number | null = null;
  private synchronizedRenderTimer: number | null = null;
  private pendingOutput: string[] = [];
  private pendingOutputTimer: number | null = null;
  private compositionInputToSuppress: string | null = null;
  private compositionSuppressionTimer: number | null = null;
  private cursorOn = true;
  private renderedCursorY: number | null = null;
  private forceFullRender = true;
  private scrollbarDirty = true;
  private scrollbarState: GhosttyScrollbar | null = null;
  private scrollbarPointerId: number | null = null;
  private scrollbarPointerOffset = 0;
  private disposed = false;
  private resizeNotifyTimer: number | null = null;
  private selectionEnd: { x: number; y: number } | null = null;
  private selectionAnchorScreen: { x: number; y: number } | null = null;
  private selectionMode: 'cell' | 'word' | 'line' = 'cell';
  // Word/line selection base in screen coordinates so streaming output cannot
  // shift the origin of a drag selection.
  private selectionBase: {
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null = null;
  private selectionScrollTimer: number | null = null;
  private scrollbarShowTimer: number | null = null;
  private selectionScrollDelta = 0;
  private selectionPointer: { x: number; y: number } | null = null;
  private mouseReportingPointerId: number | null = null;
  private mouseReportingButton: number | null = null;
  /** The secondary press under way, which belongs to the host's menu until its release. */
  private secondaryPointerId: number | null = null;
  private linkActivationPointerId: number | null = null;
  private linkActivationLink: TerminalLinkWithRange | null = null;
  private linkActivationOrigin: {
    x: number;
    y: number;
    clickCount: number;
  } | null = null;
  private hoveredLink: TerminalLinkWithRange | null = null;
  private hoverPointer: { x: number; y: number } | null = null;
  private selectionClickSequence: TerminalSelectionClickSequence | null = null;
  private selectionMoved = false;
  private composing = false;
  private focused = false;
  private resizeNotified = false;
  /** The canvas backing store installed; null until the first paint installs one. */
  private canvasBacking: TerminalCanvasBacking | null = null;
  /** A backing store a fit asked for, installed by the next paint (resizing clears the canvas). */
  private pendingCanvasBacking: TerminalCanvasBacking | null = null;
  private theme: GhosttyTheme;
  // Codes whose press this surface encoded and sent. Only these earn a release:
  // a press stopped before the terminal saw it, or one made while the focus was
  // elsewhere, must not reach a Kitty report-event-types program as a release.
  private readonly encodedKeyCodes = new Set<string>();
  private readonly textInk = new GhosttyTextInkCache();
  private primedCopySelection = '';
  private wheelRemainder = 0;
  private lastMouseMotionData = '';
  private mouseAnyEventTracking = false;
  private dprMedia: MediaQueryList | null = null;
  // Read live on every blink decision, and watched so that dropping the
  // preference restarts a blink cycle that has no timer left to notice it.
  private readonly reducedMotionMedia = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  private inputLeft = -1;
  private inputTop = -1;

  private constructor(
    mount: HTMLElement,
    canvas: HTMLCanvasElement,
    input: HTMLTextAreaElement | null,
    copyBuffer: HTMLElement | null,
    scrollbar: HTMLDivElement,
    scrollbarThumb: HTMLDivElement,
    context: CanvasRenderingContext2D,
    core: GhosttyTerminalCore,
    metrics: GhosttyCellMetrics,
    fontFamily: string,
    options: GhosttyTerminalSurfaceOptions
  ) {
    this.mount = mount;
    this.canvas = canvas;
    this.input = input;
    this.copyBuffer = copyBuffer;
    this.keyTarget = input ?? mount;
    this.readOnly = input === null;
    this.scrollbar = scrollbar;
    this.scrollbarThumb = scrollbarThumb;
    this.context = context;
    this.core = core;
    this.mouseAnyEventTracking = core.isMouseAnyEventTracking();
    this.metrics = metrics;
    this.options = options;
    this.theme = options.theme;
    this.fontFamily = fontFamily;
    this.requestedFontFamily = options.font?.family;
    this.fontSize = terminalFontSize(options.font?.size);
    this.lineHeight = terminalLineHeight(this.fontSize, options.font?.lineHeight);
    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.installEvents();
    this.watchDevicePixelRatio();
    this.reducedMotionMedia?.addEventListener('change', this.onReducedMotionChange);
    document.fonts.addEventListener('loadingdone', this.onFontsLoaded);
    this.resizeObserver.observe(mount);
  }

  /** Builds the surface inside `mount`, replacing its children, once fonts and WASM are loaded. */
  static async create(
    mount: HTMLElement,
    options: GhosttyTerminalSurfaceOptions
  ): Promise<GhosttyTerminalSurface> {
    const canvas = document.createElement('canvas');
    canvas.className = 'terminal-canvas';
    canvas.setAttribute('aria-hidden', 'true');

    let input: HTMLTextAreaElement | null = null;
    let copyBuffer: HTMLElement | null = null;
    if (options.readOnly === true) {
      copyBuffer = document.createElement('span');
      copyBuffer.className = 'terminal-copy-buffer';
      copyBuffer.setAttribute('aria-hidden', 'true');
    } else {
      input = document.createElement('textarea');
      input.className = 'terminal-input';
      input.setAttribute('aria-label', options.inputLabel ?? DEFAULT_TERMINAL_LABELS.input);
      input.autocapitalize = 'off';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.style.cssText =
        'position:absolute;left:4px;top:4px;width:1px;height:1px;opacity:0;padding:0;border:0;resize:none;pointer-events:none;';
    }

    const scrollbar = document.createElement('div');
    scrollbar.className = 'terminal-scrollbar';
    scrollbar.setAttribute('role', 'scrollbar');
    scrollbar.setAttribute(
      'aria-label',
      options.scrollbackLabel ?? DEFAULT_TERMINAL_LABELS.scrollback
    );
    scrollbar.setAttribute('aria-orientation', 'vertical');
    scrollbar.tabIndex = 0;
    scrollbar.hidden = true;
    const scrollbarThumb = document.createElement('div');
    scrollbarThumb.className = 'terminal-scrollbar-thumb';
    scrollbar.append(scrollbarThumb);
    const keyElement: HTMLElement | null = input ?? copyBuffer;
    if (keyElement === null) mount.replaceChildren(canvas, scrollbar);
    else mount.replaceChildren(canvas, keyElement, scrollbar);

    try {
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Canvas 2D is unavailable');
      // An opaque canvas backing store initializes to solid black, and the font
      // and WASM loads below leave it on screen for the whole setup window; paint
      // the theme background first so the mount never flashes a black box.
      context.fillStyle = `rgb(${options.theme.background.r}, ${options.theme.background.g}, ${options.theme.background.b})`;
      context.fillRect(0, 0, canvas.width, canvas.height);
      const fontSize = terminalFontSize(options.font?.size);
      try {
        // Cell metrics must come from the faces that will render; measuring before
        // the bundled webfonts load would size the grid from a fallback font.
        await ensureTerminalSymbolsFont();
      } catch {
        // Metrics fall back to whichever faces are already available.
      }
      const fontFamily = await loadTerminalFontFamily(options.font?.family, fontSize);
      const metrics = measureGhosttyCell(
        context,
        fontSize,
        fontFamily,
        terminalLineHeight(fontSize, options.font?.lineHeight)
      );
      const grid = terminalGridSize(
        mount.clientWidth,
        mount.clientHeight,
        metrics,
        CONTENT_PADDING
      );
      const core = await GhosttyTerminalCore.create(
        grid.cols,
        grid.rows,
        metrics.width,
        metrics.height,
        options.theme,
        options.scrollbackLines,
        // A read-only terminal has no program listening for its replies, nor
        // one whose bell anyone waits on.
        options.readOnly === true ? () => {} : options.onData,
        options.readOnly === true ? undefined : options.onBell
      );
      const surface = new GhosttyTerminalSurface(
        mount,
        canvas,
        input,
        copyBuffer,
        scrollbar,
        scrollbarThumb,
        context,
        core,
        metrics,
        fontFamily,
        options
      );
      surface.fit();
      return surface;
    } catch (error) {
      // Leave the mount empty, as it was found, for the host to show a failure.
      mount.replaceChildren();
      throw error;
    }
  }

  /** Parses output now and schedules its paint. */
  write(data: string): void {
    if (this.disposed) return;
    this.parseQueuedOutput();
    this.parse(data);
    this.requestRender();
  }

  /**
   * Queues output to parse in the next frame, right before it is painted, so
   * a burst of chunks costs one parse and one paint. `onParsed` reports each
   * chunk once it is parsed.
   */
  enqueue(data: string): void {
    if (this.disposed || data.length === 0) return;
    this.pendingOutput.push(data);
    if (!this.canRender()) {
      // Nothing will be painted, so there is no frame worth waiting for.
      this.parseQueuedOutput();
      return;
    }
    this.requestRender();
    this.pendingOutputTimer ??= window.setTimeout(() => {
      this.pendingOutputTimer = null;
      this.parseQueuedOutput();
    }, QUEUED_OUTPUT_DEADLINE_MS);
  }

  /** Resets every mode, the screen, and scrollback, then replays `data` without answering its queries. */
  resetAndWrite(data: string): void {
    if (this.disposed) return;
    this.parseQueuedOutput();
    // The reset ends any open update; one the replay opens gets its own deadline.
    this.cancelSynchronizedRenderTimer();
    this.lastMouseMotionData = '';
    this.core.resetAndWrite(data);
    this.synchronizeMouseTrackingState();
    // A replayed session starts from the visible phase like any other write:
    // reattaching mid-blink must not open on an invisible cursor.
    this.cursorOn = true;
    this.forceFullRender = true;
    this.scrollbarDirty = true;
    this.requestRender();
  }

  /**
   * Erases the scrollback and the rows above the cursor (Command-K). The
   * program is not told; a shell keeps its prompt and line where they are.
   */
  clearToStart(): void {
    if (this.disposed) return;
    this.parseQueuedOutput();
    this.clearSelection();
    this.core.clearToStart();
    this.forceFullRender = true;
    this.scrollbarDirty = true;
    this.requestRender();
  }

  /** Replaces the default colors and repaints. */
  setTheme(theme: GhosttyTheme): void {
    if (this.disposed) return;
    this.theme = theme;
    this.core.setTheme(theme);
    this.forceFullRender = true;
    this.requestRender();
  }

  /**
   * Keeps at least `lines` rows of history from now on; a shorter length
   * drops the oldest rows at once, so the scrollbar and the view repaint.
   */
  setScrollbackLines(lines: number): void {
    if (this.disposed) return;
    this.core.setScrollbackLines(lines);
    this.forceFullRender = true;
    this.scrollbarDirty = true;
    this.requestRender();
  }

  private parse(data: string): void {
    // An update's deadline ends with it: one the same data opens next starts its own.
    this.core.write(
      data,
      this.synchronizedRenderTimer === null ? undefined : () => this.cancelSynchronizedRenderTimer()
    );
    this.synchronizeMouseTrackingState();
    // Restart the blink cycle from the visible phase so the cursor never sits
    // invisible through a stream of output or a burst of typing echo.
    this.cursorOn = true;
    this.scrollbarDirty = true;
  }

  private parseQueuedOutput(): void {
    if (this.pendingOutputTimer !== null) {
      window.clearTimeout(this.pendingOutputTimer);
      this.pendingOutputTimer = null;
    }
    if (this.pendingOutput.length === 0) return;
    const chunks = this.pendingOutput;
    this.pendingOutput = [];
    this.parse(chunks.length === 1 ? (chunks[0] ?? '') : chunks.join(''));
    // A parse that ran outside a frame still needs one to show its output.
    this.requestRender();
    const onParsed = this.options.onParsed;
    if (onParsed !== undefined) for (const chunk of chunks) onParsed(chunk.length);
  }

  private applyFontMetrics(): void {
    this.metrics = measureGhosttyCell(
      this.context,
      this.fontSize,
      this.fontFamily,
      this.lineHeight
    );
    this.core.resize(this.cols, this.rows, this.metrics.width, this.metrics.height);
    // Cached IME textarea coordinates are stale in the new cell geometry.
    this.inputLeft = -1;
    this.inputTop = -1;
    this.forceFullRender = true;
    this.scrollbarDirty = true;
    this.fit();
    this.requestRender();
  }

  private readonly onReducedMotionChange = () => {
    if (this.disposed) return;
    // Nothing else wakes an idle steady cursor: the blink timer only reschedules
    // from a render, and reduced motion is exactly the state that stopped it.
    this.cursorOn = true;
    this.requestRender();
  };

  private readonly onFontsLoaded = () => {
    if (this.disposed) return;
    // A loaded face draws different glyphs under the same font string.
    this.textInk.clear();
    // A face may become available after an earlier fallback measurement. Run
    // the fixed-width guard again before using its newly loaded metrics.
    const fontFamily = terminalFontFamily(this.requestedFontFamily);
    if (fontFamily !== this.fontFamily) {
      this.fontFamily = fontFamily;
      this.applyFontMetrics();
      return;
    }
    // A face that finished loading after the initial measurement changes glyph
    // advances; re-measure and refit so the grid matches what actually renders.
    const metrics = measureGhosttyCell(
      this.context,
      this.fontSize,
      this.fontFamily,
      this.lineHeight
    );
    if (
      metrics.width === this.metrics.width &&
      metrics.height === this.metrics.height &&
      metrics.baseline === this.metrics.baseline
    ) {
      return;
    }
    this.applyFontMetrics();
  };

  /** Sizes the canvas and grid to the mount; false while the mount has no size. */
  fit(): boolean {
    if (this.disposed) return false;
    const width = this.mount.clientWidth;
    const height = this.mount.clientHeight;
    if (width <= 0 || height <= 0) {
      this.hasSize = false;
      this.forceFullRender = true;
      this.cancelRender();
      return false;
    }
    this.hasSize = true;
    let shouldRender = false;
    // Resizing the backing store clears the canvas, so the paint installs it:
    // an open synchronized update then keeps its last frame on screen, and a
    // size that returns to the installed one before that paint cancels it.
    this.pendingCanvasBacking = terminalCanvasBackingChange(
      this.canvasBacking,
      width,
      height,
      window.devicePixelRatio || 1
    );
    if (this.pendingCanvasBacking !== null) {
      this.forceFullRender = true;
      this.scrollbarDirty = true;
      shouldRender = true;
    }
    const grid = terminalGridSize(width, height, this.metrics, CONTENT_PADDING);
    // onResize is the only PTY resize channel, so the first successful fit must
    // notify even when the measured grid equals the 1x1 construction sentinel.
    if (grid.cols !== this.cols || grid.rows !== this.rows || !this.resizeNotified) {
      this.cols = grid.cols;
      this.rows = grid.rows;
      this.core.resize(grid.cols, grid.rows, this.metrics.width, this.metrics.height);
      this.notifyResize();
      this.forceFullRender = true;
      this.scrollbarDirty = true;
      shouldRender = true;
    }
    // Rendering synchronously keeps the repaint inside the same frame as the
    // layout change: ResizeObserver fires before paint, so the browser never
    // composites the old backing store stretched into the new element box.
    if (shouldRender || this.forceFullRender) this.renderFrame();
    return true;
  }

  /**
   * The local grid reflows immediately, but the PTY only hears about settled
   * dimensions: notifying on every drag step makes the shell reprint its
   * prompt mid-drag, which reads as jitter. The first size goes out at once,
   * since a session cannot start before it knows it.
   */
  private notifyResize(): void {
    const first = !this.resizeNotified;
    this.resizeNotified = true;
    if (this.resizeNotifyTimer !== null) window.clearTimeout(this.resizeNotifyTimer);
    this.resizeNotifyTimer = null;
    if (first) {
      this.options.onResize(this.cols, this.rows);
      return;
    }
    this.resizeNotifyTimer = window.setTimeout(() => {
      this.resizeNotifyTimer = null;
      if (!this.disposed) this.options.onResize(this.cols, this.rows);
    }, 150);
  }

  /** Moves keyboard focus into the terminal. */
  focus(): void {
    if (this.disposed) return;
    this.keyTarget.focus({ preventScroll: true });
  }

  /** Whether any text is selected. */
  hasSelection(): boolean {
    return this.core.selectionText().length > 0;
  }

  /** The selection as plain text. */
  getSelection(): string {
    return this.core.selectionText();
  }

  /** Removes the selection and repaints. */
  clearSelection(): void {
    this.clearPrimedCopy();
    this.core.clearSelection();
    this.selectionEnd = null;
    this.selectionAnchorScreen = null;
    this.selectionMode = 'cell';
    this.selectionBase = null;
    this.setSelectionAutoscroll(0);
    // Selection highlights span rows Ghostty may not mark dirty for this change.
    this.forceFullRender = true;
    this.requestRender();
  }

  /**
   * Pastes `text` as Command-V does: bracketed when the program asked for
   * bracketed paste, and taking a reader in scrollback back to the live
   * screen. Nothing happens on a read-only surface.
   */
  paste(text: string): void {
    if (this.disposed || text.length === 0) return;
    this.sendInput(this.core.encodePaste(text));
  }

  /** Returns the viewport from scrollback to the live screen. */
  scrollToBottom(): void {
    this.core.scrollToBottom();
    this.forceFullRender = true;
    this.scrollbarDirty = true;
    this.requestRender();
  }

  /** Stops every listener, timer, and frame and frees the terminal's WASM handles. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resizeObserver.disconnect();
    document.fonts.removeEventListener('loadingdone', this.onFontsLoaded);
    this.dprMedia?.removeEventListener('change', this.onDevicePixelRatioChange);
    this.dprMedia = null;
    this.reducedMotionMedia?.removeEventListener('change', this.onReducedMotionChange);
    if (this.selectionScrollTimer !== null) window.clearInterval(this.selectionScrollTimer);
    if (this.scrollbarShowTimer !== null) window.clearTimeout(this.scrollbarShowTimer);
    if (this.resizeNotifyTimer !== null) {
      window.clearTimeout(this.resizeNotifyTimer);
      this.resizeNotifyTimer = null;
      // Flush the settled dimensions so the PTY keeps the final size even when
      // the surface unmounts inside the debounce window.
      this.options.onResize(this.cols, this.rows);
    }
    if (this.pendingOutputTimer !== null) window.clearTimeout(this.pendingOutputTimer);
    // Queued output is dropped unparsed but still reported, so a session that
    // outlives this surface is not left waiting on acknowledgements.
    const dropped = this.pendingOutput;
    this.pendingOutput = [];
    this.cancelRender();
    if (this.compositionSuppressionTimer !== null) {
      window.clearTimeout(this.compositionSuppressionTimer);
    }
    this.removeEvents();
    this.core.dispose();
    this.clearPrimedCopy();
    for (const element of [this.canvas, this.input, this.copyBuffer, this.scrollbar]) {
      if (element?.parentElement === this.mount) element.remove();
    }
    const onParsed = this.options.onParsed;
    if (onParsed !== undefined) for (const chunk of dropped) onParsed(chunk.length);
  }

  /** Sends user input, bringing a reader in scrollback back to the live screen first. */
  private sendInput(data: string): void {
    if (this.readOnly || data.length === 0) return;
    if (!this.core.isViewportActive()) this.scrollToBottom();
    this.options.onData(data);
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    // A fresh press starts over; a repeat the app claims still leaves the
    // original encoded press its release.
    if (!event.repeat) this.encodedKeyCodes.delete(event.code);
    // A modified chord an earlier listener already claimed (a space switch) is
    // not also typed into the shell. Unmodified keys are still the shell's:
    // page-level listeners cancel scrolling defaults for them, not their meaning.
    const claimedChord = event.defaultPrevented && (event.ctrlKey || event.metaKey);
    if (
      claimedChord ||
      isTerminalAltGraphText(event) ||
      (this.options.beforeKey !== undefined && !this.options.beforeKey(event))
    ) {
      return;
    }
    if (isTerminalCopyShortcut(event)) {
      // The default (the browser's copy, or the Edit menu's) fires the copy
      // event this surface answers; re-park the selection in case output
      // replaced it since it settled.
      if (this.hasSelection()) this.primeCopy(this.getSelection());
      return;
    }
    if (this.readOnly) return;
    if (isTerminalPasteShortcut(event)) {
      // The default fires the paste event this surface answers.
      return;
    }
    if (event.metaKey) {
      // Other Command chords are the app's menu accelerators, never shell input.
      return;
    }
    // keyCode 229 is Safari's only signal that this keydown opens an IME
    // composition; encoding it would double the committed text. Do not blank
    // the textarea first: onInput leaves the in-progress candidate there.
    if (isTerminalCompositionKey(event, this.composing)) {
      return;
    }
    const data = this.core.encodeKey(event);
    if (data.length === 0) return;
    // Typing ends the selection, as in Ghostty, so a parked copy never
    // outlives what the screen shows selected.
    if (this.primedCopySelection.length > 0) this.clearSelection();
    this.encodedKeyCodes.add(event.code);
    event.preventDefault();
    event.stopPropagation();
    this.sendInput(data);
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (!this.encodedKeyCodes.delete(event.code)) return;
    if (isTerminalCompositionKey(event, this.composing)) return;
    // Ghostty's encoder only emits release codes when the terminal enabled the
    // Kitty report-event-types flag, so legacy sessions send nothing here.
    const data = this.core.encodeKey(event, 'release');
    if (data.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.options.onData(data);
  };

  // A release outside the terminal ends its press, so a later press the app
  // claims cannot inherit that press's release.
  private readonly onWindowKeyUp = (event: KeyboardEvent) => {
    if (event.composedPath().includes(this.keyTarget)) return;
    this.encodedKeyCodes.delete(event.code);
  };

  // A fresh press anywhere proves an earlier release was missed. A repeat is
  // left alone, since a held key's repeats can span a focus round trip.
  private readonly onWindowKeyDown = (event: KeyboardEvent) => {
    if (!event.repeat) this.encodedKeyCodes.delete(event.code);
  };

  private readonly onFocus = () => {
    this.focused = true;
    this.cursorOn = true;
    this.requestRender();
  };

  private readonly onBlur = () => {
    this.focused = false;
    // The steady unfocused hollow cursor must not inherit an off blink phase.
    this.cursorOn = true;
    this.requestRender();
  };

  private readonly onDevicePixelRatioChange = () => {
    this.watchDevicePixelRatio();
    this.fit();
  };

  private watchDevicePixelRatio(): void {
    this.dprMedia?.removeEventListener('change', this.onDevicePixelRatioChange);
    // A resolution media query only fires once for the ratio it was created at,
    // so re-arm it after every change (display moves).
    this.dprMedia = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    this.dprMedia.addEventListener('change', this.onDevicePixelRatioChange);
  }

  private primeCopy(selection: string): void {
    this.primedCopySelection = selection;
    if (this.input !== null) {
      primeTerminalCopyInput(this.input, selection);
      return;
    }
    if (this.copyBuffer === null) return;
    this.copyBuffer.textContent = selection;
    if (selection.length > 0) document.getSelection()?.selectAllChildren(this.copyBuffer);
  }

  private clearPrimedCopy(): void {
    if (this.input !== null) {
      clearPrimedTerminalCopyInput(this.input, this.primedCopySelection);
    } else if (this.copyBuffer !== null && this.copyBuffer.textContent !== '') {
      this.copyBuffer.textContent = '';
      const selection = document.getSelection();
      if (
        selection?.anchorNode !== null &&
        this.copyBuffer.contains(selection?.anchorNode ?? null)
      ) {
        selection?.removeAllRanges();
      }
    }
    this.primedCopySelection = '';
  }

  /** Parks a settled selection where the copy command finds it. */
  private primeSettledSelection(): void {
    const selection = this.getSelection();
    if (selection.length > 0) this.primeCopy(selection);
  }

  /** The Edit menu's Copy, chosen with the pointer, arrives here rather than as a keydown. */
  private readonly onCopyEvent = (event: ClipboardEvent) => {
    const selection = this.hasSelection() ? this.getSelection() : (this.input?.value ?? '');
    // The native action reads the textarea, so park the current selection
    // there first, including when clipboardData is missing and the default
    // must run.
    this.primeCopy(selection);
    if (applyTerminalCopyEvent(selection, event.clipboardData).preventDefault) {
      event.preventDefault();
    }
  };

  private readonly onPaste = (event: ClipboardEvent) => {
    // Always suppress the browser's default insertion: content the textarea
    // would receive (for example an html-only clipboard converted to text)
    // leaks through onInput without bracketed-paste encoding.
    event.preventDefault();
    this.paste(event.clipboardData?.getData('text/plain') ?? '');
  };

  /**
   * Cut has no meaning in a terminal: the screen cannot give up its text,
   * and the Edit menu's Cut would otherwise copy the parked selection and
   * blank it. A cancelled cut that set no data leaves the clipboard alone.
   */
  private readonly onCut = (event: ClipboardEvent) => {
    event.preventDefault();
  };

  private readonly onCompositionStart = () => {
    // The textarea now holds the IME candidate, not the parked selection.
    if (this.primedCopySelection.length > 0) this.clearSelection();
    this.clearCompositionInputSuppression();
    this.composing = true;
  };

  private readonly onCompositionEnd = (event: CompositionEvent) => {
    if (this.input === null) return;
    this.composing = false;
    const data = this.input.value || event.data;
    this.sendInput(data);
    this.input.value = '';
    this.compositionInputToSuppress = data;
    this.compositionSuppressionTimer = window.setTimeout(() => {
      this.compositionInputToSuppress = null;
      this.compositionSuppressionTimer = null;
    }, 100);
  };

  private readonly onInput = (event: Event) => {
    if (this.input === null) return;
    const inputEvent = event as InputEvent;
    if (this.composing || inputEvent.isComposing) return;
    const data = this.input.value || inputEvent.data || '';
    if (data === this.compositionInputToSuppress && isTerminalCompositionCommitInput(inputEvent)) {
      this.clearCompositionInputSuppression();
      this.input.value = '';
      return;
    }
    this.clearCompositionInputSuppression();
    this.sendInput(data);
    this.input.value = '';
  };

  private clearCompositionInputSuppression(): void {
    if (this.compositionSuppressionTimer !== null) {
      window.clearTimeout(this.compositionSuppressionTimer);
      this.compositionSuppressionTimer = null;
    }
    this.compositionInputToSuppress = null;
  }

  private mouseTracking(): boolean {
    return !this.readOnly && this.core.isMouseTracking();
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    this.focus();
    this.secondaryPointerId = null;
    if (isTerminalSecondaryPress(event)) {
      // The menu its `contextmenu` opens is the press's whole meaning. The
      // capture brings the release back here, since the menu may open under
      // the pointer.
      this.secondaryPointerId = event.pointerId;
      this.canvas.setPointerCapture(event.pointerId);
      return;
    }
    if (shouldReportTerminalMouse(this.mouseTracking(), event)) {
      const button = ghosttyMouseButton(event.button);
      if (button === null) return;
      event.preventDefault();
      event.stopPropagation();
      this.clearHoveredLink('default');
      this.mouseReportingPointerId = event.pointerId;
      this.mouseReportingButton = button;
      this.sendMouse('press', button, event);
      this.canvas.setPointerCapture(event.pointerId);
      return;
    }
    if (event.button !== 0) return;
    const clickCount = this.recordSelectionClick(event);
    const link = event.metaKey ? this.linkAt(event.clientX, event.clientY) : null;
    if (link && !event.shiftKey && clickCount === 1) {
      event.preventDefault();
      event.stopPropagation();
      this.linkActivationPointerId = event.pointerId;
      this.linkActivationLink = link;
      this.linkActivationOrigin = {
        x: event.clientX,
        y: event.clientY,
        clickCount
      };
      this.canvas.setPointerCapture(event.pointerId);
      return;
    }
    this.clearHoveredLink();
    this.beginSelection(event, clickCount);
    this.canvas.setPointerCapture(event.pointerId);
  };

  private recordSelectionClick(
    event: Pick<PointerEvent, 'clientX' | 'clientY' | 'timeStamp'>
  ): number {
    this.selectionClickSequence = advanceTerminalSelectionClickSequence(
      this.selectionClickSequence,
      event
    );
    return this.selectionClickSequence.count;
  }

  private beginSelection(event: { clientX: number; clientY: number }, clickCount: number): void {
    const cell = this.cellAt(event.clientX, event.clientY);
    this.selectionMoved = false;
    this.selectionMode = clickCount >= 3 ? 'line' : clickCount === 2 ? 'word' : 'cell';
    const range =
      this.selectionMode === 'line'
        ? this.core.selectLine(cell.x, cell.y)
        : this.selectionMode === 'word'
          ? this.core.selectWord(cell.x, cell.y)
          : null;
    if (range) {
      this.selectionBase = range.screen;
      this.selectionEnd = range.viewport.end;
      this.selectionAnchorScreen = range.screen.start;
    } else {
      this.selectionMode = 'cell';
      this.selectionBase = null;
      this.selectionEnd = cell;
      const screen = this.core.viewportPointToScreen(cell.x, cell.y);
      this.selectionAnchorScreen = screen;
      if (screen) {
        this.core.setSelection({ ...screen, tag: 2 }, { ...screen, tag: 2 });
      } else {
        this.core.setSelection(cell, cell);
      }
    }
    this.forceFullRender = true;
    this.requestRender();
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    // A held secondary press drags neither a report nor a selection.
    if (this.secondaryPointerId === event.pointerId) return;
    if (this.linkActivationPointerId === event.pointerId) {
      const origin = this.linkActivationOrigin;
      if (origin === null || !isTerminalPointerDrag(origin, event)) {
        return;
      }
      this.linkActivationPointerId = null;
      this.linkActivationLink = null;
      this.linkActivationOrigin = null;
      this.clearHoveredLink();
      this.beginSelection(
        {
          clientX: origin.x,
          clientY: origin.y
        },
        origin.clickCount
      );
    }
    // Hover motion is only reportable in any-event tracking (DEC 1003); normal and
    // button-event tracking never report motion without a captured pressed button.
    const anyEventTracking = !this.readOnly && this.synchronizeMouseTrackingState();
    if (
      this.mouseReportingPointerId === event.pointerId ||
      shouldReportTerminalMouse(anyEventTracking, event)
    ) {
      event.preventDefault();
      this.hoverPointer = { x: event.clientX, y: event.clientY };
      // A drag whose press was already sent to the terminal application cannot
      // turn into link activation midway through, so link feedback would lie.
      this.setHoveredLink(null);
      this.canvas.style.cursor = 'default';
      this.sendMouse('motion', this.buttonFromButtons(event.buttons), event);
      return;
    }
    this.lastMouseMotionData = '';
    if (!this.selectionAnchorScreen || !this.canvas.hasPointerCapture(event.pointerId)) {
      this.updateHoverCursor(event);
      return;
    }
    this.clearHoveredLink();
    this.selectionPointer = { x: event.clientX, y: event.clientY };
    const bounds = this.canvas.getBoundingClientRect();
    this.setSelectionAutoscroll(
      event.clientY < bounds.top ? -1 : event.clientY > bounds.bottom ? 1 : 0
    );
    const cell = this.cellAt(event.clientX, event.clientY);
    if (cell.x === this.selectionEnd?.x && cell.y === this.selectionEnd.y) return;
    this.extendSelectionTo(event.clientX, event.clientY);
  };

  private extendSelectionTo(clientX: number, clientY: number): void {
    const anchorScreen = this.selectionAnchorScreen;
    if (anchorScreen === null) return;
    const cell = this.cellAt(clientX, clientY);
    this.selectionMoved = true;
    this.selectionEnd = cell;
    const range =
      this.selectionMode === 'line'
        ? this.core.selectLine(cell.x, cell.y)
        : this.selectionMode === 'word'
          ? this.core.selectWord(cell.x, cell.y)
          : null;
    const cellScreen = this.core.viewportPointToScreen(cell.x, cell.y);
    if (cellScreen === null) return;
    const base = this.selectionBase;
    const beforeBase =
      base !== null &&
      (cellScreen.y < base.start.y ||
        (cellScreen.y === base.start.y && cellScreen.x < base.start.x));
    const anchor = base === null ? anchorScreen : beforeBase ? base.end : base.start;
    const end = range === null ? cellScreen : beforeBase ? range.screen.start : range.screen.end;
    this.selectionAnchorScreen = anchor;
    this.core.setSelection({ ...anchor, tag: 2 }, { ...end, tag: 2 });
    this.forceFullRender = true;
    this.requestRender();
  }

  private setSelectionAutoscroll(delta: number): void {
    this.selectionScrollDelta = delta;
    if (delta === 0) {
      if (this.selectionScrollTimer !== null) {
        window.clearInterval(this.selectionScrollTimer);
        this.selectionScrollTimer = null;
      }
      return;
    }
    if (this.selectionScrollTimer !== null) return;
    // Dragging past the edge scrolls the viewport and keeps extending the
    // selection into the newly revealed rows, like xterm's drag scroller.
    this.selectionScrollTimer = window.setInterval(() => {
      if (this.disposed || this.selectionScrollDelta === 0) return;
      this.scrollViewport(this.selectionScrollDelta);
      const pointer = this.selectionPointer;
      if (pointer) this.extendSelectionTo(pointer.x, pointer.y);
    }, 80);
  }

  private updateHoverCursor(event: PointerEvent): void {
    // Links only light up while Command is held, the chord that opens them.
    this.hoverPointer = event.metaKey ? { x: event.clientX, y: event.clientY } : null;
    this.refreshHoveredLink();
  }

  private readonly onPointerLeave = () => {
    this.lastMouseMotionData = '';
    this.clearHoveredLink();
  };

  private clearHoveredLink(cursor = ''): void {
    this.hoverPointer = null;
    this.setHoveredLink(null);
    this.canvas.style.cursor = cursor;
  }

  private refreshHoveredLink(): void {
    const pointer = this.hoverPointer;
    const link = pointer ? this.linkAt(pointer.x, pointer.y) : null;
    this.setHoveredLink(link);
  }

  private setHoveredLink(link: TerminalLinkWithRange | null): void {
    const previous = this.hoveredLink;
    const unchanged =
      previous === null ? link === null : link !== null && isSameTerminalLink(previous, link);
    // The I-beam stays over a link, as everywhere on the canvas: a desktop
    // terminal shows a link by its underline, never by the hand.
    this.canvas.style.cursor = '';
    if (unchanged) return;
    this.hoveredLink = link;
    this.forceFullRender = true;
    this.requestRender();
  }

  private readonly onPointerUp = (event: PointerEvent) => {
    this.setSelectionAutoscroll(0);
    if (this.secondaryPointerId === event.pointerId) {
      this.secondaryPointerId = null;
      if (this.canvas.hasPointerCapture(event.pointerId)) {
        this.canvas.releasePointerCapture(event.pointerId);
      }
      return;
    }
    if (this.linkActivationPointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      const link = this.linkActivationLink;
      this.linkActivationPointerId = null;
      this.linkActivationLink = null;
      this.linkActivationOrigin = null;
      if (this.canvas.hasPointerCapture(event.pointerId)) {
        this.canvas.releasePointerCapture(event.pointerId);
      }
      if (event.type !== 'pointercancel') {
        if (link && isSameTerminalLink(link, this.linkAt(event.clientX, event.clientY))) {
          this.options.onLinkActivate?.(link.text, event);
        }
      }
      return;
    }
    if (this.mouseReportingPointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      this.sendMouse('release', this.mouseReportingButton, event);
      this.mouseReportingPointerId = null;
      this.mouseReportingButton = null;
      if (this.canvas.hasPointerCapture(event.pointerId)) {
        this.canvas.releasePointerCapture(event.pointerId);
      }
      if (event.type === 'pointercancel') {
        this.clearHoveredLink();
      } else {
        this.updateHoverCursor(event);
      }
      return;
    }
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    if (event.button !== 0) return;
    if (!this.selectionMoved && this.selectionMode === 'cell') {
      this.clearSelection();
      return;
    }
    this.primeSettledSelection();
  };

  private readonly onWheel = (event: WheelEvent) => {
    if (event.deltaY === 0) return;
    event.preventDefault();
    const delta = terminalWheelDeltaRows(
      event,
      this.metrics.height,
      this.rows,
      this.wheelRemainder
    );
    this.wheelRemainder = delta.remainder;
    if (delta.rows === 0) return;
    const magnitude = Math.abs(delta.rows);
    if (shouldReportTerminalMouse(this.mouseTracking(), event)) {
      const button = delta.rows < 0 ? 4 : 5;
      for (let index = 0; index < magnitude; index += 1) {
        this.sendMouse('press', button, event);
      }
      return;
    }
    if (!this.readOnly && this.core.isAlternateScreen()) {
      // The alternate screen has no scrollback: translate wheel motion into
      // arrow keys so full-screen apps like vim and less scroll, matching xterm.
      this.options.onData(terminalWheelArrowData(delta.rows, this.core.isApplicationCursorKeys()));
      return;
    }
    this.scrollViewport(delta.rows);
  };

  private readonly onMouseDown = (event: MouseEvent) => {
    // The canvas has no native selection or focus behavior worth keeping. A
    // secondary click's `contextmenu` still fires after a cancelled press.
    if (event.button === 0 || isTerminalSecondaryPress(event)) event.preventDefault();
    this.focus();
  };

  private readonly onContextMenu = (event: MouseEvent) => {
    // The browser's own menu has nothing for a canvas; the host draws one.
    event.preventDefault();
    this.options.onContextMenu?.({ clientX: event.clientX, clientY: event.clientY });
  };

  private readonly onScrollbarPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const state = this.readScrollbarState();
    if (state === null) return;
    const bounds = this.scrollbar.getBoundingClientRect();
    const geometry = terminalScrollbarGeometry(state, bounds.height);
    if (geometry === null) return;
    event.preventDefault();
    event.stopPropagation();
    this.scrollbarPointerId = event.pointerId;
    this.scrollbarPointerOffset =
      event.target === this.scrollbarThumb
        ? event.clientY - bounds.top - geometry.thumbTop
        : geometry.thumbHeight / 2;
    this.scrollbar.setPointerCapture(event.pointerId);
    this.scrollbarToPointer(event.clientY, bounds);
  };

  private readonly onScrollbarPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== this.scrollbarPointerId || this.scrollbarState === null) return;
    event.preventDefault();
    this.scrollbarToPointer(event.clientY, this.scrollbar.getBoundingClientRect());
  };

  private readonly onScrollbarPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.scrollbarPointerId) return;
    event.preventDefault();
    this.scrollbarPointerId = null;
    if (this.scrollbar.hasPointerCapture(event.pointerId)) {
      this.scrollbar.releasePointerCapture(event.pointerId);
    }
  };

  private readonly onScrollbarKeyDown = (event: KeyboardEvent) => {
    const state = this.readScrollbarState();
    if (state === null) return;
    let delta: number;
    switch (event.key) {
      case 'ArrowUp':
        delta = -1;
        break;
      case 'ArrowDown':
        delta = 1;
        break;
      case 'PageUp':
        delta = -Math.max(1, state.len);
        break;
      case 'PageDown':
        delta = Math.max(1, state.len);
        break;
      case 'Home':
        delta = -state.offset;
        break;
      case 'End':
        delta = state.total - state.len - state.offset;
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.scrollViewport(delta);
  };

  private installEvents(): void {
    this.keyTarget.addEventListener('keydown', this.onKeyDown);
    this.keyTarget.addEventListener('keyup', this.onKeyUp);
    // Capture on the window, ahead of any ancestor that stops a key before it
    // reaches the terminal.
    window.addEventListener('keyup', this.onWindowKeyUp, { capture: true });
    window.addEventListener('keydown', this.onWindowKeyDown, { capture: true });
    this.keyTarget.addEventListener('focus', this.onFocus);
    this.keyTarget.addEventListener('blur', this.onBlur);
    this.keyTarget.addEventListener('copy', this.onCopyEvent);
    this.keyTarget.addEventListener('cut', this.onCut);
    if (this.input !== null) {
      this.input.addEventListener('input', this.onInput);
      this.input.addEventListener('paste', this.onPaste);
      this.input.addEventListener('compositionstart', this.onCompositionStart);
      this.input.addEventListener('compositionend', this.onCompositionEnd);
    }
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    this.scrollbar.addEventListener('pointerdown', this.onScrollbarPointerDown);
    this.scrollbar.addEventListener('pointermove', this.onScrollbarPointerMove);
    this.scrollbar.addEventListener('pointerup', this.onScrollbarPointerUp);
    this.scrollbar.addEventListener('pointercancel', this.onScrollbarPointerUp);
    this.scrollbar.addEventListener('keydown', this.onScrollbarKeyDown);
  }

  private removeEvents(): void {
    this.keyTarget.removeEventListener('keydown', this.onKeyDown);
    this.keyTarget.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('keyup', this.onWindowKeyUp, { capture: true });
    window.removeEventListener('keydown', this.onWindowKeyDown, { capture: true });
    this.keyTarget.removeEventListener('focus', this.onFocus);
    this.keyTarget.removeEventListener('blur', this.onBlur);
    this.keyTarget.removeEventListener('copy', this.onCopyEvent);
    this.keyTarget.removeEventListener('cut', this.onCut);
    if (this.input !== null) {
      this.input.removeEventListener('input', this.onInput);
      this.input.removeEventListener('paste', this.onPaste);
      this.input.removeEventListener('compositionstart', this.onCompositionStart);
      this.input.removeEventListener('compositionend', this.onCompositionEnd);
    }
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.scrollbar.removeEventListener('pointerdown', this.onScrollbarPointerDown);
    this.scrollbar.removeEventListener('pointermove', this.onScrollbarPointerMove);
    this.scrollbar.removeEventListener('pointerup', this.onScrollbarPointerUp);
    this.scrollbar.removeEventListener('pointercancel', this.onScrollbarPointerUp);
    this.scrollbar.removeEventListener('keydown', this.onScrollbarKeyDown);
  }

  private scrollViewport(deltaRows: number): void {
    let delta = Math.trunc(deltaRows);
    const state = this.readScrollbarState();
    if (state !== null) {
      const maxOffset = Math.max(0, state.total - state.len);
      const offset = Math.max(0, Math.min(state.offset + delta, maxOffset));
      delta = offset - state.offset;
      this.scrollbarState = { ...state, offset };
    }
    if (delta === 0) return;
    this.core.scroll(delta);
    this.forceFullRender = true;
    this.scrollbarDirty = true;
    this.showScrollbarWhileScrolling();
    this.requestRender();
  }

  /**
   * The thumb rests hidden, as the platform's overlay scroll bar does, and
   * shows while the user moves the scrollback and for a moment after
   * (`data-scrolling`, which terminal.css reads). Output that arrives on its
   * own never shows it.
   */
  private showScrollbarWhileScrolling(): void {
    this.scrollbar.dataset['scrolling'] = '';
    if (this.scrollbarShowTimer !== null) window.clearTimeout(this.scrollbarShowTimer);
    this.scrollbarShowTimer = window.setTimeout(() => {
      this.scrollbarShowTimer = null;
      delete this.scrollbar.dataset['scrolling'];
    }, SCROLLBAR_LINGER_MS);
  }

  private scrollbarToPointer(clientY: number, bounds: DOMRect): void {
    const state = this.scrollbarState;
    if (state === null) return;
    const offset = terminalScrollbarOffsetAtPointer(
      state,
      bounds.height,
      clientY - bounds.top,
      this.scrollbarPointerOffset
    );
    this.scrollViewport(offset - state.offset);
  }

  private updateScrollbar(): void {
    const state = this.readScrollbarState();
    const geometry =
      state === null
        ? null
        : terminalScrollbarGeometry(
            state,
            Math.max(0, this.mount.clientHeight - CONTENT_PADDING * 2)
          );
    this.scrollbar.hidden = geometry === null;
    if (state === null || geometry === null) return;
    this.scrollbar.setAttribute('aria-valuemin', '0');
    this.scrollbar.setAttribute('aria-valuemax', String(geometry.maxOffset));
    this.scrollbar.setAttribute(
      'aria-valuenow',
      String(Math.max(0, Math.min(state.offset, geometry.maxOffset)))
    );
    this.scrollbarThumb.style.height = `${geometry.thumbHeight}px`;
    this.scrollbarThumb.style.transform = `translateY(${geometry.thumbTop}px)`;
  }

  private readScrollbarState(): GhosttyScrollbar | null {
    const state = this.core.scrollbarState();
    this.scrollbarState = state;
    return state;
  }

  private canRender(): boolean {
    return !this.disposed && this.hasSize;
  }

  private requestRender(): void {
    if (!this.canRender()) return;
    // During an open update a frame still parses and acknowledges queued
    // output; with none queued there is nothing for it to do.
    if (this.deferSynchronizedRender() && this.pendingOutput.length === 0) return;
    if (this.frame !== 0) return;
    this.frame = window.requestAnimationFrame(() => {
      this.frame = 0;
      this.renderFrame();
    });
  }

  private cancelRender(): void {
    this.cancelSynchronizedRenderTimer();
    if (this.frame !== 0) {
      window.cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
    if (this.cursorTimer !== null) {
      window.clearTimeout(this.cursorTimer);
      this.cursorTimer = null;
    }
  }

  private cancelSynchronizedRenderTimer(): void {
    if (this.synchronizedRenderTimer === null) return;
    window.clearTimeout(this.synchronizedRenderTimer);
    this.synchronizedRenderTimer = null;
  }

  /**
   * Whether painting must wait for an open synchronized update. The first
   * check that finds one open starts its deadline, which ends the update and
   * paints; the cursor holds its phase until then.
   */
  private deferSynchronizedRender(): boolean {
    if (!this.core.isSynchronizedOutput()) {
      this.cancelSynchronizedRenderTimer();
      return false;
    }
    if (this.cursorTimer !== null) {
      window.clearTimeout(this.cursorTimer);
      this.cursorTimer = null;
    }
    if (this.synchronizedRenderTimer === null) {
      const deadline = window.setTimeout(() => {
        // Output queued before the deadline belongs to the update it ends, so
        // it parses first; if it ends that update itself, the paint (or the
        // deadline of the update it opens next) is already scheduled.
        this.parseQueuedOutput();
        if (this.synchronizedRenderTimer !== deadline) return;
        this.synchronizedRenderTimer = null;
        this.core.endSynchronizedOutput();
        this.renderFrame();
      }, SYNCHRONIZED_OUTPUT_RENDER_TIMEOUT_MS);
      this.synchronizedRenderTimer = deadline;
    }
    return true;
  }

  private renderFrame(): void {
    if (this.disposed) return;
    if (this.frame !== 0) {
      window.cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
    // A hidden terminal stays mounted so showing it again is instant, but a
    // display:none canvas has nothing to show. Ghostty keeps parsing; the
    // ResizeObserver refits and repaints in full once the mount has a size.
    if (this.mount.clientWidth === 0 || this.mount.clientHeight === 0) {
      this.hasSize = false;
      this.forceFullRender = true;
      this.cancelRender();
      this.parseQueuedOutput();
      return;
    }
    this.parseQueuedOutput();
    // Parsing queued output asks for a frame; this one already paints it.
    if (this.frame !== 0) {
      window.cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
    // Output is parsed and acknowledged above whether or not it may be shown.
    if (this.deferSynchronizedRender()) return;
    const backing = this.pendingCanvasBacking;
    if (backing !== null) {
      this.pendingCanvasBacking = null;
      this.canvas.width = backing.width;
      this.canvas.height = backing.height;
      this.context.setTransform(backing.ratio, 0, 0, backing.ratio, 0, 0);
      this.canvasBacking = backing;
    }
    this.snapshot = this.core.snapshot();
    // A cursor that is not blinking right now must be drawn, never caught in an
    // off phase left behind by a blink that has since been turned off.
    if (!this.blinkEnabled()) this.cursorOn = true;
    this.refreshHoveredLink();
    const cursorOn = !this.readOnly && this.cursorOn;
    renderGhosttySnapshot({
      context: this.context,
      snapshot: this.snapshot,
      metrics: this.metrics,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      padding: CONTENT_PADDING,
      forceFull: this.forceFullRender,
      cursorOn,
      previousCursorY: this.renderedCursorY,
      focused: this.focused,
      hoveredLinkRange: this.hoveredLink?.range ?? null,
      pixelRatio: this.canvasBacking?.ratio ?? 1,
      textInk: this.textInk,
      ...(this.theme.selectionBackground !== undefined
        ? { selectionBackground: this.theme.selectionBackground }
        : {}),
      ...(this.theme.selectionForeground !== undefined
        ? { selectionForeground: this.theme.selectionForeground }
        : {})
    });
    this.positionInput();
    this.renderedCursorY =
      cursorOn && this.snapshot.cursorVisible && this.snapshot.cursorY >= 0
        ? this.snapshot.cursorY
        : null;
    if (this.scrollbarDirty) {
      this.scrollbarDirty = false;
      this.updateScrollbar();
    }
    this.forceFullRender = false;
    this.scheduleCursorBlink();
  }

  private scheduleCursorBlink(): void {
    if (this.cursorTimer !== null) window.clearTimeout(this.cursorTimer);
    this.cursorTimer = null;
    if (!this.blinkEnabled()) return;
    this.cursorTimer = window.setTimeout(() => {
      this.cursorTimer = null;
      this.cursorOn = !this.cursorOn;
      this.requestRender();
    }, CURSOR_BLINK_INTERVAL_MS);
  }

  private blinkEnabled(): boolean {
    const snapshot = this.snapshot;
    if (!snapshot || this.readOnly || !this.hasSize) return false;
    return shouldBlinkTerminalCursor({
      focused: this.focused,
      cursorBlinking: snapshot.cursorBlinking,
      cursorVisible: snapshot.cursorVisible,
      reducedMotion: this.reducedMotionMedia?.matches ?? false
    });
  }

  private positionInput(): void {
    const snapshot = this.snapshot;
    if (
      this.input === null ||
      !snapshot ||
      !snapshot.cursorVisible ||
      snapshot.cursorX < 0 ||
      snapshot.cursorY < 0
    ) {
      return;
    }
    // The IME candidate window anchors to the textarea, so it must follow the
    // terminal cursor for composition to appear where the user is typing.
    const left = CONTENT_PADDING + snapshot.cursorX * this.metrics.width;
    const top = CONTENT_PADDING + snapshot.cursorY * this.metrics.height;
    if (left === this.inputLeft && top === this.inputTop) return;
    this.inputLeft = left;
    this.inputTop = top;
    this.input.style.left = `${left}px`;
    this.input.style.top = `${top}px`;
    this.input.style.height = `${this.metrics.height}px`;
  }

  private cellAt(clientX: number, clientY: number): { x: number; y: number } {
    const bounds = this.canvas.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          this.cols - 1,
          Math.floor((clientX - bounds.left - CONTENT_PADDING) / this.metrics.width)
        )
      ),
      y: Math.max(
        0,
        Math.min(
          this.rows - 1,
          Math.floor((clientY - bounds.top - CONTENT_PADDING) / this.metrics.height)
        )
      )
    };
  }

  private linkAt(clientX: number, clientY: number): TerminalLinkWithRange | null {
    if (!this.snapshot || this.options.onLinkActivate === undefined) return null;
    const cell = terminalGridCellAt({
      bounds: this.canvas.getBoundingClientRect(),
      clientX,
      clientY,
      cols: this.cols,
      rows: this.rows,
      metrics: this.metrics,
      padding: CONTENT_PADDING
    });
    if (!cell) return null;
    const explicitHyperlink = this.core.hyperlinkAt(cell.x, cell.y);
    // Only web links open; an OSC 8 link to anything else (file:, custom
    // schemes) stays inert.
    if (explicitHyperlink !== null && isTerminalUrl(explicitHyperlink)) {
      const start = { ...cell };
      const end = { ...cell };
      while (true) {
        const previous =
          start.x > 0
            ? { x: start.x - 1, y: start.y }
            : start.y > 0 && this.snapshot.rowData[start.y]?.isWrapContinuation
              ? { x: this.cols - 1, y: start.y - 1 }
              : null;
        if (!previous || this.core.hyperlinkAt(previous.x, previous.y) !== explicitHyperlink) break;
        start.x = previous.x;
        start.y = previous.y;
      }
      while (true) {
        const next =
          end.x + 1 < this.cols
            ? { x: end.x + 1, y: end.y }
            : end.y + 1 < this.rows && this.snapshot.rowData[end.y]?.wrapsToNext
              ? { x: 0, y: end.y + 1 }
              : null;
        if (!next || this.core.hyperlinkAt(next.x, next.y) !== explicitHyperlink) break;
        end.x = next.x;
        end.y = next.y;
      }
      return {
        text: explicitHyperlink,
        range: { start, end }
      };
    }
    return terminalLinkAtPositionWithRange(this.snapshot.rowData, cell.y, cell.x);
  }

  private sendMouse(action: TerminalMouseAction, button: number | null, event: MouseEvent): void {
    const bounds = this.canvas.getBoundingClientRect();
    const data = this.core.encodeMouse({
      action,
      button,
      mods:
        (event.shiftKey ? 1 : 0) |
        (event.ctrlKey ? 1 << 1 : 0) |
        (event.altKey ? 1 << 2 : 0) |
        (event.metaKey ? 1 << 3 : 0),
      x: Math.max(0, event.clientX - bounds.left),
      y: Math.max(0, event.clientY - bounds.top),
      screenWidth: bounds.width,
      screenHeight: bounds.height,
      cellWidth: this.metrics.width,
      cellHeight: this.metrics.height,
      paddingLeft: CONTENT_PADDING,
      paddingRight: CONTENT_PADDING,
      paddingTop: CONTENT_PADDING,
      paddingBottom: Math.max(0, bounds.height - CONTENT_PADDING - this.rows * this.metrics.height),
      anyButtonPressed: event.buttons !== 0
    });
    const resolution = resolveTerminalMouseData(action, data, this.lastMouseMotionData);
    this.lastMouseMotionData = resolution.nextMotionData;
    if (resolution.send) this.options.onData(data);
  }

  private synchronizeMouseTrackingState(): boolean {
    // Output writes can toggle DEC 1003 without moving the pointer. Keep the
    // previous mode so the next same-cell motion starts a fresh tracking session.
    const tracking = this.core.isMouseAnyEventTracking();
    const state = resolveTerminalMouseTrackingState(
      this.mouseAnyEventTracking,
      tracking,
      this.lastMouseMotionData
    );
    this.mouseAnyEventTracking = state.tracking;
    this.lastMouseMotionData = state.motionData;
    return tracking;
  }

  private buttonFromButtons(buttons: number): number | null {
    if ((buttons & 1) !== 0) return 1;
    if ((buttons & 4) !== 0) return 3;
    if ((buttons & 2) !== 0) return 2;
    if ((buttons & 8) !== 0) return 4;
    if ((buttons & 16) !== 0) return 5;
    return null;
  }
}
