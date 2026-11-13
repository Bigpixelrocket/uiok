/**
 * One terminal's libghostty-vt handles: VT parsing, render snapshots, key,
 * paste, and mouse encoding, selection, and scrollback, translated from the C
 * ABI into plain values. Every handle is freed by `dispose`.
 */

import {
  type GhosttyKeyboardLayoutMap,
  ghosttyConsumedMods,
  ghosttyKeyForCode,
  ghosttyUnshiftedCodepoint
} from './keyCodes.logic.js';
import {
  type GhosttyColorScheme,
  GhosttyRuntime,
  type GhosttyTerminalEffects,
  loadGhosttyRuntime
} from './runtime.js';
import { ENGINE_DEFAULT_BACKGROUND, ENGINE_DEFAULT_FOREGROUND } from './fallbackColors.js';

/**
 * How many terminals one page's shared engine memory is budgeted for: sixteen
 * interactive terminals and one read-only log. Every terminal on a page
 * shares one WebAssembly memory, which wasm32 caps at 4 GiB, so each
 * terminal's history ceiling is a share of it.
 */
export const GHOSTTY_BUDGETED_TERMINALS = 17;

const GHOSTTY_SUCCESS = 0;
const GHOSTTY_OUT_OF_SPACE = -3;
/**
 * The most memory one terminal's history may take. Every terminal in a
 * window shares one WebAssembly memory, which wasm32 caps at 4 GiB; at this
 * ceiling a full page (`GHOSTTY_BUDGETED_TERMINALS` terminals) holds at most 3 GiB of history, leaving the rest for screens and
 * parsing. It binds only at the largest length on very wide grids (50,000
 * lines past about 445 columns), where a terminal keeps fewer lines instead
 * of exhausting the shared memory.
 */
const SCROLLBACK_MAX_BYTES = Math.floor((3 * 1024 ** 3) / GHOSTTY_BUDGETED_TERMINALS);
/**
 * The bytes a standard page of the engine's grid holds for row headers and
 * cells (Ghostty `fb13fa9`, wasm32: a 448 KiB page less its style, grapheme,
 * string, and hyperlink tables). `runtimeAbi.test.ts` pins it, through
 * `ghosttyPageRows`, against the engine's own pages.
 */
const PAGE_GRID_BYTES = 436_784;
/** Bytes of a row header (`Row`) and of a cell (`Cell`) in the engine's grid. */
const PAGE_ROW_BYTES = 8;
const PAGE_CELL_BYTES = 8;
/** The alignment of a page's cell array, which follows its row headers. */
const PAGE_CELLS_ALIGN = 64;
/** The rows of a page too wide for a standard one, which the engine sizes up instead. */
const PAGE_STANDARD_ROWS = 215;
/** `GHOSTTY_TERMINAL_OPT_COLOR_PALETTE`: the default 256-color palette, as `GhosttyColorRgb[256]`. */
const OPTION_COLOR_PALETTE = 14;
/** Entries in the palette the option takes. */
const GHOSTTY_PALETTE_SIZE = 256;
/** `GHOSTTY_TERMINAL_OPT_SCROLLBACK_MAX_BYTES`: the history's byte budget, as `size_t*`. */
const OPTION_SCROLLBACK_MAX_BYTES = 27;
/** `GHOSTTY_TERMINAL_OPT_SCROLLBACK_MAX_LINES`: the history's physical row limit, as `size_t*`. */
const OPTION_SCROLLBACK_MAX_LINES = 28;
/** `GHOSTTY_TERMINAL_OPT_MODE`: sets a mode's current value, as `GhosttyTerminalModeConfig*`. */
const OPTION_MODE = 34;
/** `GHOSTTY_TERMINAL_DATA_MODE`: reads a mode's current value into a `GhosttyTerminalModeConfig`. */
const DATA_MODE = 37;
/** The DEC private modes the adapter reads or sets (`GhosttyMode` without the ANSI bit). */
const DEC_MODE = {
  cursorKeys: 1,
  anyEventMouse: 1003,
  bracketedPaste: 2004,
  synchronizedOutput: 2026,
  colorSchemeReport: 2031
} as const;
/** wasm32's `size_t`, the width of every written-length out-parameter. */
const USIZE_BYTES = 4;
/**
 * The unsolicited reports a program that enabled DEC mode 2031 receives when
 * the scheme changes; they are byte for byte the engine's own `CSI ? 996 n`
 * answers.
 */
const COLOR_SCHEME_REPORT: Readonly<Record<GhosttyColorScheme, string>> = {
  dark: '\x1b[?997;1n',
  light: '\x1b[?997;2n'
};

const RENDER_DATA = {
  cols: 1,
  rows: 2,
  dirty: 3,
  rowIterator: 4,
  background: 5,
  foreground: 6,
  cursor: 7,
  cursorHasValue: 8,
  cursorStyle: 10,
  cursorVisible: 11,
  cursorBlinking: 12,
  cursorInViewport: 14,
  cursorX: 15,
  cursorY: 16
} as const;

const ROW_DATA = {
  dirty: 1,
  raw: 2,
  cells: 3
} as const;

const CELL_DATA = {
  raw: 1,
  style: 2,
  graphemesLength: 3,
  graphemes: 4,
  background: 5,
  foreground: 6,
  selected: 7
} as const;

/** The `GhosttyStyle` fields a drawn cell reads; `underline` is an `i32`, the rest single bytes. */
const STYLE_FLAGS = [
  'inverse',
  'faint',
  'bold',
  'italic',
  'invisible',
  'strikethrough',
  'overline',
  'underline'
] as const;
type StyleFlag = (typeof STYLE_FLAGS)[number];

/** Colors kept as shared objects before the table is dropped wholesale. */
const COLOR_TABLE_LIMIT = 4096;

const RAW_CELL_DATA = {
  wide: 3
} as const;

/** Ghostty's cell width classes: a wide glyph's second column is its spacer tail. */
export const GHOSTTY_CELL_WIDE = {
  narrow: 0,
  wide: 1,
  spacerTail: 2,
  spacerHead: 3
} as const;

/** An sRGB color with 8-bit channels. */
export interface GhosttyColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** Default colors a terminal starts from; programs may still override them with OSC sequences. */
export interface GhosttyTheme {
  readonly foreground: GhosttyColor;
  readonly background: GhosttyColor;
  readonly cursor: GhosttyColor;
  /** CSS color the renderer overlays on selected cells; not sent to Ghostty. */
  readonly selectionBackground?: string;
  /**
   * The one colour selected text is drawn in, floored by the renderer against
   * the selection over each cell; each cell's own foreground when absent. Not
   * sent to Ghostty.
   */
  readonly selectionForeground?: GhosttyColor;
  /** The full 256-color palette (16 ANSI colors, color cube, gray ramp); Ghostty's own when absent. */
  readonly palette?: readonly GhosttyColor[];
}

/** One drawn cell of a render snapshot. */
export interface GhosttyCell {
  readonly text: string;
  readonly wide: number;
  readonly foreground: GhosttyColor;
  readonly background: GhosttyColor;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly invisible: boolean;
  readonly strikethrough: boolean;
  readonly overline: boolean;
  readonly underline: boolean;
  readonly selected: boolean;
}

/** One viewport row of a render snapshot. */
export interface GhosttyRow {
  readonly cells: readonly GhosttyCell[];
  readonly text: string;
  readonly isWrapContinuation: boolean;
  /** Whether this row soft-wraps onto the next row. */
  readonly wrapsToNext: boolean;
}

/** The viewport as last rendered: grid, colors, cursor, and the rows that changed. */
export interface GhosttySnapshot {
  readonly cols: number;
  readonly rows: number;
  readonly foreground: GhosttyColor;
  readonly background: GhosttyColor;
  readonly cursor: GhosttyColor;
  readonly cursorX: number;
  readonly cursorY: number;
  readonly cursorVisible: boolean;
  readonly cursorBlinking: boolean;
  readonly cursorStyle: number;
  readonly dirtyRows: ReadonlySet<number>;
  readonly rowData: readonly GhosttyRow[];
}

/** A selection's endpoints in viewport and in screen (scrollback-inclusive) coordinates. */
export interface GhosttySelectionRange {
  readonly viewport: {
    readonly start: { readonly x: number; readonly y: number };
    readonly end: { readonly x: number; readonly y: number };
  };
  readonly screen: {
    readonly start: { readonly x: number; readonly y: number };
    readonly end: { readonly x: number; readonly y: number };
  };
}

/** Scrollback position in rows: total rows, the viewport's first row, and its height. */
export interface GhosttyScrollbar {
  readonly total: number;
  readonly offset: number;
  readonly len: number;
}

/** Grid position tagged with its Ghostty coordinate space: 1 viewport, 2 screen. */
export interface GhosttyPointInput {
  readonly x: number;
  readonly y: number;
  readonly tag?: 1 | 2;
}

/** A pointer event in the terms Ghostty's mouse encoder needs. */
export interface GhosttyMouseInput {
  readonly action: 'press' | 'release' | 'motion';
  readonly button: number | null;
  readonly mods: number;
  readonly x: number;
  readonly y: number;
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly paddingLeft: number;
  readonly paddingRight: number;
  readonly paddingTop: number;
  readonly paddingBottom: number;
  readonly anyButtonPressed: boolean;
}

const decoder = new TextDecoder();
const encoder = new TextEncoder();

let keyboardLayoutMapPromise: Promise<GhosttyKeyboardLayoutMap | undefined> | undefined;

/** The browser's keyboard layout map, read once per page; undefined where the API is missing. */
function loadGhosttyKeyboardLayoutMap(): Promise<GhosttyKeyboardLayoutMap | undefined> {
  if (keyboardLayoutMapPromise) return keyboardLayoutMapPromise;
  const browserNavigator = globalThis.navigator as
    | (Navigator & {
        readonly keyboard?: {
          getLayoutMap(): Promise<GhosttyKeyboardLayoutMap>;
        };
      })
    | undefined;
  const keyboard = browserNavigator?.keyboard;
  const promise = keyboard?.getLayoutMap().catch(() => undefined) ?? Promise.resolve(undefined);
  keyboardLayoutMapPromise = promise;
  return promise;
}

function blend(foreground: GhosttyColor, background: GhosttyColor): GhosttyColor {
  const channel = (front: number, back: number) => Math.floor((front * 155 + back * 100) / 255);
  return {
    r: channel(foreground.r, background.r),
    g: channel(foreground.g, background.g),
    b: channel(foreground.b, background.b)
  };
}

/** A little-endian 32-bit value at `offset`, unsigned. */
function readU32(heap: Uint8Array, offset: number): number {
  return (
    (heap[offset]! |
      (heap[offset + 1]! << 8) |
      (heap[offset + 2]! << 16) |
      (heap[offset + 3]! << 24)) >>>
    0
  );
}

/**
 * A row read from the engine. Its plain text is only wanted for links,
 * selection, and tests, so it is joined on first use rather than per frame.
 */
class SnapshotRow implements GhosttyRow {
  private joinedText: string | undefined;

  constructor(
    readonly cells: readonly GhosttyCell[],
    readonly isWrapContinuation: boolean,
    readonly wrapsToNext: boolean
  ) {}

  get text(): string {
    this.joinedText ??= this.cells
      .map((cell) => cell.text || ' ')
      .join('')
      .trimEnd();
    return this.joinedText;
  }
}

function sameColor(left: GhosttyColor, right: GhosttyColor): boolean {
  return left.r === right.r && left.g === right.g && left.b === right.b;
}

/**
 * A cell's codepoints as a string, converted in bounded chunks: JavaScript
 * engines cap spread-call arguments, and a cell's cluster is only as short as
 * the engine keeps it (64 combining marks since Ghostty `fb13fa9`; earlier
 * revisions kept hundreds of thousands). Exported for `core.test.ts`, which
 * feeds it clusters too large to build through a terminal.
 */
export function ghosttyCellText(codepointView: DataView, graphemeLength: number): string {
  if (graphemeLength === 1) return String.fromCodePoint(codepointView.getUint32(0, true));
  const CHUNK_SIZE = 4_096;
  let text = '';
  for (let start = 0; start < graphemeLength; start += CHUNK_SIZE) {
    const count = Math.min(CHUNK_SIZE, graphemeLength - start);
    const codes = new Array<number>(count);
    for (let index = 0; index < count; index += 1) {
      codes[index] = codepointView.getUint32((start + index) * 4, true);
    }
    text += String.fromCodePoint(...codes);
  }
  return text;
}

/**
 * The rows one page of the engine's history holds at `cols` columns: as many
 * as fit their headers, then their cells on a cache-line boundary, in a
 * standard page's grid (`Capacity.adjust` in Ghostty's `page.zig`). A grid
 * too wide for one standard row gets a larger page of 215 rows.
 */
export function ghosttyPageRows(cols: number): number {
  const fits = (rows: number) =>
    Math.ceil((rows * PAGE_ROW_BYTES) / PAGE_CELLS_ALIGN) * PAGE_CELLS_ALIGN +
      rows * cols * PAGE_CELL_BYTES <=
    PAGE_GRID_BYTES;
  let rows = Math.floor(PAGE_GRID_BYTES / (PAGE_ROW_BYTES + PAGE_CELL_BYTES * cols));
  while (rows > 0 && !fits(rows)) rows -= 1;
  return rows > 0 ? rows : PAGE_STANDARD_ROWS;
}

/**
 * The engine's line limit (`GHOSTTY_TERMINAL_OPT_SCROLLBACK_MAX_LINES`) that
 * keeps at least `lines` rows of history at `cols` columns. The engine drops
 * the oldest history a whole page at a time, so under a limit of N it keeps
 * at most N rows and as few as N less one page; one page more than `lines`
 * keeps at least `lines` and at most a page beyond them.
 */
function ghosttyScrollbackLimit(lines: number, cols: number): number {
  return lines + ghosttyPageRows(cols);
}

/** A grid dimension as the engine takes it: whole cells, 1 to 65,535. */
function gridCount(cells: number): number {
  return Math.max(1, Math.min(65_535, cells));
}

/** A libghostty-vt terminal: create with `GhosttyTerminalCore.create`, release with `dispose`. */
export class GhosttyTerminalCore {
  private readonly runtime: GhosttyRuntime;
  private terminalSlot = 0;
  private terminal = 0;
  private renderStateSlot = 0;
  private renderState = 0;
  private rowIteratorSlot = 0;
  private rowCellsSlot = 0;
  private keyEncoderSlot = 0;
  private keyEncoder = 0;
  private keyEventSlot = 0;
  private keyEvent = 0;
  private mouseEncoderSlot = 0;
  private mouseEncoder = 0;
  private mouseEventSlot = 0;
  private mouseEvent = 0;
  private effectsId = 0;
  private effects: GhosttyTerminalEffects | null = null;
  private onBell: (() => void) | undefined;
  /** Whether the bell rang during the write in progress, which reports it once it returns. */
  private bellRang = false;
  /** The scheme the theme's background reads as, which `CSI ? 996 n` reports. */
  private colorScheme: GhosttyColorScheme = 'dark';
  private scratch = 0;
  private graphemes = 0;
  private graphemeCapacity = 0;
  private style = 0;
  /** A zeroed `GhosttyStyle` with its size set, copied over `style` before each cell's read. */
  private styleTemplate = new Uint8Array(0);
  /** Byte offsets of the `GhosttyStyle` fields a cell reads. */
  private styleOffsets: Readonly<Record<StyleFlag, number>> | null = null;
  private cellsNext: ((iterator: number) => number) | null = null;
  private cellsGet: ((iterator: number, data: number, out: number) => number) | null = null;
  /** One object per color a snapshot reads, so a cell's colors allocate nothing. */
  private readonly colors = new Map<number, GhosttyColor>();
  private scrollbar = 0;
  private rows: GhosttyRow[] = [];
  /** The rows of history kept above the screen, and the grid width the engine's limit is set for. */
  private scrollbackLines = 0;
  private gridCols = 0;
  private disposed = false;
  private keyboardLayoutMap: GhosttyKeyboardLayoutMap | undefined;

  private constructor(runtime: GhosttyRuntime) {
    this.runtime = runtime;
    void loadGhosttyKeyboardLayoutMap().then((layoutMap) => {
      if (!this.disposed) this.keyboardLayoutMap = layoutMap;
    });
  }

  /**
   * Loads the shared runtime and allocates a terminal that keeps at least
   * `scrollbackLines` rows of history above its screen at any width (see
   * `setScrollbackLines`); `onPtyData` receives the terminal's replies, and
   * `onBell` hears of the bell once per `write` in which the program rang it.
   */
  static async create(
    cols: number,
    rows: number,
    cellWidth: number,
    cellHeight: number,
    theme: GhosttyTheme,
    scrollbackLines: number,
    onPtyData: (data: string) => void,
    onBell?: () => void
  ): Promise<GhosttyTerminalCore> {
    const core = new GhosttyTerminalCore(await loadGhosttyRuntime());
    core.onBell = onBell;
    try {
      core.initialize(cols, rows, cellWidth, cellHeight, theme, scrollbackLines, onPtyData);
      return core;
    } catch (error) {
      core.dispose();
      throw error;
    }
  }

  private initialize(
    cols: number,
    rows: number,
    cellWidth: number,
    cellHeight: number,
    theme: GhosttyTheme,
    scrollbackLines: number,
    onPtyData: (data: string) => void
  ): void {
    this.terminalSlot = this.runtime.allocOpaque();
    this.assertSuccess(
      'ghostty_terminal_new',
      this.runtime.call('ghostty_terminal_new', 0, this.terminalSlot, cols, rows)
    );
    this.terminal = this.runtime.readPointer(this.terminalSlot);
    // The byte budget is only the shared memory's ceiling; the line limit,
    // which follows the grid's width, decides how much history is kept.
    this.setSizeOption(OPTION_SCROLLBACK_MAX_BYTES, SCROLLBACK_MAX_BYTES, 'scrollback bytes');
    this.gridCols = gridCount(cols);
    this.scrollbackLines = scrollbackLines;
    this.applyScrollbackLimit(this.gridCols);
    this.applyDefaultCursorBlink();
    // The bell is only noted here: the callback runs inside the engine's
    // parse, which must not be entered again, so `write` reports it after.
    this.effects = {
      writePty: onPtyData,
      bell: () => {
        this.bellRang = true;
      },
      colorScheme: () => this.colorScheme
    };
    this.effectsId = this.runtime.attachEffects(this.terminal, this.effects);

    this.renderStateSlot = this.runtime.allocOpaque();
    this.assertSuccess(
      'ghostty_render_state_new',
      this.runtime.call('ghostty_render_state_new', 0, this.renderStateSlot)
    );
    this.renderState = this.runtime.readPointer(this.renderStateSlot);

    this.rowIteratorSlot = this.runtime.allocOpaque();
    this.assertSuccess(
      'ghostty_render_state_row_iterator_new',
      this.runtime.call('ghostty_render_state_row_iterator_new', 0, this.rowIteratorSlot)
    );
    this.rowCellsSlot = this.runtime.allocOpaque();
    this.assertSuccess(
      'ghostty_render_state_row_cells_new',
      this.runtime.call('ghostty_render_state_row_cells_new', 0, this.rowCellsSlot)
    );

    this.keyEncoderSlot = this.runtime.allocOpaque();
    this.assertSuccess(
      'ghostty_key_encoder_new',
      this.runtime.call('ghostty_key_encoder_new', 0, this.keyEncoderSlot)
    );
    this.keyEncoder = this.runtime.readPointer(this.keyEncoderSlot);
    this.keyEventSlot = this.runtime.allocOpaque();
    this.assertSuccess(
      'ghostty_key_event_new',
      this.runtime.call('ghostty_key_event_new', 0, this.keyEventSlot)
    );
    this.keyEvent = this.runtime.readPointer(this.keyEventSlot);

    this.mouseEncoderSlot = this.runtime.allocOpaque();
    this.assertSuccess(
      'ghostty_mouse_encoder_new',
      this.runtime.call('ghostty_mouse_encoder_new', 0, this.mouseEncoderSlot)
    );
    this.mouseEncoder = this.runtime.readPointer(this.mouseEncoderSlot);
    this.mouseEventSlot = this.runtime.allocOpaque();
    this.assertSuccess(
      'ghostty_mouse_event_new',
      this.runtime.call('ghostty_mouse_event_new', 0, this.mouseEventSlot)
    );
    this.mouseEvent = this.runtime.readPointer(this.mouseEventSlot);

    this.scratch = this.runtime.alloc(16);
    const styleSize = this.runtime.layout('GhosttyStyle').size;
    this.style = this.runtime.alloc(styleSize);
    this.runtime.setField(this.style, 'GhosttyStyle', 'size', styleSize);
    this.styleTemplate = this.runtime.bytes(this.style, styleSize).slice();
    const styleFields = this.runtime.layout('GhosttyStyle').fields;
    this.styleOffsets = Object.fromEntries(
      STYLE_FLAGS.map((flag) => [flag, styleFields[flag]!.offset])
    ) as Record<StyleFlag, number>;
    this.cellsNext = this.runtime.exportedFunction('ghostty_render_state_row_cells_next');
    this.cellsGet = this.runtime.exportedFunction('ghostty_render_state_row_cells_get');
    this.scrollbar = this.runtime.alloc(this.runtime.layout('GhosttyTerminalScrollbar').size);
    this.setTheme(theme);
    this.resize(cols, rows, cellWidth, cellHeight);
  }

  /**
   * Parses output from the program, then tells `onBell` if the program rang
   * the bell in it, however many times. With `onSynchronizedOutputEnd`, a write
   * that starts inside a synchronized update (DEC 2026) calls it as soon as
   * that update ends, before any later byte can open the next one, so each
   * update can be given its own paint deadline.
   */
  write(data: string | Uint8Array, onSynchronizedOutputEnd?: () => void): void {
    this.ensureActive();
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    if (bytes.length === 0) return;
    const pointer = this.runtime.alloc(bytes.length);
    this.runtime.bytes(pointer, bytes.length).set(bytes);
    // Feeding the open update one escape at a time is enough to see where it
    // ends: Ghostty keeps its parser state across calls, so a sequence split
    // here still parses whole. Once it ends, the rest goes in one call.
    let synchronized = onSynchronizedOutputEnd !== undefined && this.isSynchronizedOutput();
    let rang: boolean;
    try {
      for (let start = 0; start < bytes.length;) {
        const nextEscape = synchronized ? bytes.indexOf(0x1b, start + 1) : -1;
        const end = nextEscape === -1 ? bytes.length : nextEscape;
        this.runtime.call('ghostty_terminal_vt_write', this.terminal, pointer + start, end - start);
        start = end;
        if (synchronized && !this.isSynchronizedOutput()) {
          synchronized = false;
          onSynchronizedOutputEnd?.();
        }
      }
    } finally {
      this.runtime.free(pointer, bytes.length);
      rang = this.bellRang;
      this.bellRang = false;
    }
    if (rang) this.onBell?.();
  }

  /**
   * Resets every mode, the screen, and scrollback, then replays `data`
   * without answering its queries or ringing its bells.
   */
  resetAndWrite(data: string): void {
    this.ensureActive();
    // RIS keeps the embedder's defaults (colors and the cursor's blink).
    this.runtime.call('ghostty_terminal_reset', this.terminal);
    this.rows = [];
    if (data.length === 0) return;
    const effects = this.effects;
    if (this.effectsId !== 0) {
      this.runtime.detachEffects(this.terminal, this.effectsId);
      this.effectsId = 0;
    }
    try {
      this.write(data);
    } finally {
      if (effects !== null && !this.disposed) {
        this.effectsId = this.runtime.attachEffects(this.terminal, effects);
      }
    }
  }

  /**
   * Resizes the grid in cells; the pixel cell size feeds pixel-based reports.
   * The line limit follows the new width, since a page holds fewer rows the
   * wider it is.
   */
  resize(cols: number, rows: number, cellWidth: number, cellHeight: number): void {
    this.ensureActive();
    const nextCols = gridCount(cols);
    // The engine prunes to its limit during the reflow, while its pages
    // change from one width's to the other's; a limit with room for a page at
    // either width keeps every line the chosen length does through it.
    if (nextCols !== this.gridCols) {
      this.applyScrollbackLimit(
        ghosttyPageRows(this.gridCols) > ghosttyPageRows(nextCols) ? this.gridCols : nextCols
      );
    }
    this.assertSuccess(
      'ghostty_terminal_resize',
      this.runtime.call(
        'ghostty_terminal_resize',
        this.terminal,
        nextCols,
        gridCount(rows),
        Math.max(1, Math.round(cellWidth)),
        Math.max(1, Math.round(cellHeight))
      )
    );
    if (nextCols !== this.gridCols) {
      this.gridCols = nextCols;
      this.applyScrollbackLimit(nextCols);
    }
  }

  /**
   * Keeps at least `lines` rows of history above the screen from now on, and
   * at most one page more. A shorter length drops the oldest history at once.
   */
  setScrollbackLines(lines: number): void {
    this.ensureActive();
    if (lines === this.scrollbackLines) return;
    this.scrollbackLines = lines;
    this.applyScrollbackLimit(this.gridCols);
  }

  /** Sets the engine's line limit for the chosen length at `cols` columns. */
  private applyScrollbackLimit(cols: number): void {
    this.setSizeOption(
      OPTION_SCROLLBACK_MAX_LINES,
      ghosttyScrollbackLimit(this.scrollbackLines, cols),
      'scrollback lines'
    );
  }

  /** Sets a terminal option that takes a `size_t*`. */
  private setSizeOption(option: number, value: number, name: string): void {
    const pointer = this.runtime.alloc(USIZE_BYTES);
    this.runtime.view(pointer, USIZE_BYTES).setUint32(0, value, true);
    const result = this.runtime.call('ghostty_terminal_set', this.terminal, option, pointer);
    this.runtime.free(pointer, USIZE_BYTES);
    this.assertSuccess(`ghostty_terminal_set(${name})`, result);
  }

  /**
   * Ghostty's built-in default cursor is steady, while a macOS terminal's
   * cursor blinks. Option 23 is the embedder's
   * default blink, which is the state a session starts in and returns to on
   * DECSCUSR reset (CSI 0 q), so programs that ask for a specific cursor
   * through DECSCUSR or DEC mode 12 still win.
   */
  private applyDefaultCursorBlink(): void {
    const blink = this.runtime.alloc(1);
    this.runtime.bytes(blink, 1)[0] = 1;
    this.runtime.call('ghostty_terminal_set', this.terminal, 23, blink);
    this.runtime.free(blink, 1);
  }

  /**
   * Sets the default colors; colors a program set through OSC sequences stay
   * in force. The background decides the scheme `CSI ? 996 n` reports, light
   * where Ghostty's perceived luminance exceeds one half, and a change of
   * scheme is reported to a program that enabled DEC mode 2031.
   */
  setTheme(theme: GhosttyTheme): void {
    this.ensureActive();
    const color = this.runtime.alloc(3);
    for (const [option, value] of [
      [11, theme.foreground],
      [12, theme.background],
      [13, theme.cursor]
    ] as const) {
      this.runtime.bytes(color, 3).set([value.r, value.g, value.b]);
      this.runtime.call('ghostty_terminal_set', this.terminal, option, color);
    }
    this.runtime.bytes(color, 3).set([theme.background.r, theme.background.g, theme.background.b]);
    const scheme: GhosttyColorScheme =
      this.runtime.call('ghostty_color_perceived_luminance', color) > 0.5 ? 'light' : 'dark';
    this.runtime.free(color, 3);
    if (scheme !== this.colorScheme) {
      this.colorScheme = scheme;
      if (
        this.effects !== null &&
        this.effectsId !== 0 &&
        this.getMode(DEC_MODE.colorSchemeReport)
      ) {
        this.effects.writePty(COLOR_SCHEME_REPORT[scheme]);
      }
    }
    if (theme.palette === undefined) return;
    if (theme.palette.length !== GHOSTTY_PALETTE_SIZE) {
      throw new Error(`A terminal palette needs ${GHOSTTY_PALETTE_SIZE} colors`);
    }
    const size = GHOSTTY_PALETTE_SIZE * 3;
    const palette = this.runtime.alloc(size);
    const bytes = this.runtime.bytes(palette, size);
    theme.palette.forEach((entry, index) => bytes.set([entry.r, entry.g, entry.b], index * 3));
    this.runtime.call('ghostty_terminal_set', this.terminal, OPTION_COLOR_PALETTE, palette);
    this.runtime.free(palette, size);
  }

  /**
   * Erases the scrollback and the rows above the cursor, moving the cursor's
   * row to the top: Terminal.app's Clear to Start. The alternate screen (a
   * full-screen program) is left alone. The erase runs through the VT parser,
   * so it assumes the program is idle between sequences, as a prompt is.
   */
  clearToStart(): void {
    this.ensureActive();
    if (this.isAlternateScreen()) return;
    this.runtime.bytes(this.scratch, 2).fill(0);
    const row =
      this.runtime.call('ghostty_terminal_get', this.terminal, 4, this.scratch) === GHOSTTY_SUCCESS
        ? this.runtime.view(this.scratch, 2).getUint16(0, true)
        : 0;
    // SU scrolls the region without feeding scrollback; ED 3 then drops the history.
    this.write(`${row > 0 ? `\x1b[${row}S\x1b[${row}A` : ''}\x1b[3J`);
  }

  /** Scrolls the viewport through scrollback by whole rows. */
  scroll(deltaRows: number): void {
    this.ensureActive();
    const layout = this.runtime.layout('GhosttyTerminalScrollViewport');
    const scroll = this.runtime.alloc(layout.size);
    this.runtime.setField(scroll, 'GhosttyTerminalScrollViewport', 'tag', 2);
    const value = layout.fields.value!;
    this.runtime.view(scroll + value.offset, value.size).setInt32(0, deltaRows, true);
    this.runtime.call('ghostty_terminal_scroll_viewport', this.terminal, scroll);
    this.runtime.free(scroll, layout.size);
  }

  /** Returns the viewport to the live screen. */
  scrollToBottom(): void {
    this.ensureActive();
    const layout = this.runtime.layout('GhosttyTerminalScrollViewport');
    const scroll = this.runtime.alloc(layout.size);
    this.runtime.setField(scroll, 'GhosttyTerminalScrollViewport', 'tag', 1);
    this.runtime.call('ghostty_terminal_scroll_viewport', this.terminal, scroll);
    this.runtime.free(scroll, layout.size);
  }

  /** Whether the viewport shows the live screen rather than scrollback. */
  isViewportActive(): boolean {
    this.ensureActive();
    this.runtime.bytes(this.scratch, 1)[0] = 0;
    return (
      this.runtime.call('ghostty_terminal_get', this.terminal, 32, this.scratch) ===
        GHOSTTY_SUCCESS && this.runtime.bytes(this.scratch, 1)[0] !== 0
    );
  }

  /** The scrollback position, or null when Ghostty cannot report it. */
  scrollbarState(): GhosttyScrollbar | null {
    this.ensureActive();
    const layout = this.runtime.layout('GhosttyTerminalScrollbar');
    this.runtime.bytes(this.scrollbar, layout.size).fill(0);
    if (
      this.runtime.call('ghostty_terminal_get', this.terminal, 9, this.scrollbar) !==
      GHOSTTY_SUCCESS
    ) {
      return null;
    }
    return {
      total: this.runtime.readField(this.scrollbar, 'GhosttyTerminalScrollbar', 'total'),
      offset: this.runtime.readField(this.scrollbar, 'GhosttyTerminalScrollbar', 'offset'),
      len: this.runtime.readField(this.scrollbar, 'GhosttyTerminalScrollbar', 'len')
    };
  }

  /** Whether the program asked for mouse reports. */
  isMouseTracking(): boolean {
    this.ensureActive();
    this.runtime.bytes(this.scratch, 1)[0] = 0;
    return (
      this.runtime.call('ghostty_terminal_get', this.terminal, 11, this.scratch) ===
        GHOSTTY_SUCCESS && this.runtime.bytes(this.scratch, 1)[0] !== 0
    );
  }

  /** Whether the program asked for motion reports without a pressed button (DEC 1003). */
  isMouseAnyEventTracking(): boolean {
    this.ensureActive();
    return this.getMode(DEC_MODE.anyEventMouse);
  }

  /** Whether the program has a synchronized update open (DEC 2026): its frame is still being drawn. */
  isSynchronizedOutput(): boolean {
    this.ensureActive();
    return this.getMode(DEC_MODE.synchronizedOutput);
  }

  /** Ends an open synchronized update, as a program that never closes one would have. */
  endSynchronizedOutput(): void {
    this.ensureActive();
    this.writeModeConfig(DEC_MODE.synchronizedOutput, false);
    this.assertSuccess(
      'ghostty_terminal_set(mode)',
      this.runtime.call('ghostty_terminal_set', this.terminal, OPTION_MODE, this.scratch)
    );
  }

  /** Whether a full-screen program switched to the alternate screen. */
  isAlternateScreen(): boolean {
    this.ensureActive();
    this.runtime.bytes(this.scratch, 4).fill(0);
    return (
      this.runtime.call('ghostty_terminal_get', this.terminal, 6, this.scratch) ===
        GHOSTTY_SUCCESS && this.runtime.view(this.scratch, 4).getUint32(0, true) === 1
    );
  }

  /** Whether cursor keys send application sequences (DECCKM). */
  isApplicationCursorKeys(): boolean {
    this.ensureActive();
    return this.getMode(DEC_MODE.cursorKeys);
  }

  /** Encodes a key event under the terminal's current keyboard modes; empty when it sends nothing. */
  encodeKey(event: KeyboardEvent, action: 'press' | 'release' = 'press'): string {
    this.ensureActive();
    this.runtime.call('ghostty_key_encoder_setopt_from_terminal', this.keyEncoder, this.terminal);
    this.runtime.call(
      'ghostty_key_event_set_action',
      this.keyEvent,
      action === 'release' ? 0 : event.repeat ? 2 : 1
    );
    this.runtime.call('ghostty_key_event_set_key', this.keyEvent, ghosttyKeyForCode(event.code));
    const mods =
      (event.shiftKey ? 1 : 0) |
      (event.ctrlKey ? 1 << 1 : 0) |
      (event.altKey ? 1 << 2 : 0) |
      (event.metaKey ? 1 << 3 : 0) |
      (event.getModifierState('CapsLock') ? 1 << 4 : 0) |
      (event.getModifierState('NumLock') ? 1 << 5 : 0);
    this.runtime.call('ghostty_key_event_set_mods', this.keyEvent, mods);
    this.runtime.call(
      'ghostty_key_event_set_consumed_mods',
      this.keyEvent,
      ghosttyConsumedMods(event)
    );
    this.runtime.call('ghostty_key_event_set_composing', this.keyEvent, event.isComposing ? 1 : 0);
    this.runtime.call(
      'ghostty_key_event_set_unshifted_codepoint',
      this.keyEvent,
      ghosttyUnshiftedCodepoint(event, this.keyboardLayoutMap)
    );

    const text = event.key.length === 1 ? event.key : '';
    const textBytes = encoder.encode(text);
    const textPointer = textBytes.length === 0 ? 0 : this.runtime.alloc(textBytes.length);
    if (textPointer !== 0) this.runtime.bytes(textPointer, textBytes.length).set(textBytes);
    this.runtime.call('ghostty_key_event_set_utf8', this.keyEvent, textPointer, textBytes.length);

    const written = this.runtime.alloc(USIZE_BYTES);
    const encoded = this.encodeOutput(written, (output, outputSize) =>
      this.runtime.call(
        'ghostty_key_encoder_encode',
        this.keyEncoder,
        this.keyEvent,
        output,
        outputSize,
        written
      )
    );
    this.runtime.free(written, USIZE_BYTES);
    if (textPointer !== 0) this.runtime.free(textPointer, textBytes.length);
    return encoded;
  }

  /** Encodes pasted text, bracketed when the program enabled bracketed paste (mode 2004). */
  encodePaste(data: string): string {
    this.ensureActive();
    const input = encoder.encode(data);
    if (input.length === 0) return '';
    const inputPointer = this.runtime.alloc(input.length);
    this.runtime.bytes(inputPointer, input.length).set(input);
    const bracketed = this.getMode(DEC_MODE.bracketedPaste);
    const written = this.runtime.alloc(USIZE_BYTES);
    let encoded = '';
    const sizeResult = this.runtime.call(
      'ghostty_paste_encode',
      inputPointer,
      input.length,
      bracketed ? 1 : 0,
      0,
      0,
      written
    );
    const outputSize = this.runtime.view(written, 4).getUint32(0, true);
    if (sizeResult === GHOSTTY_OUT_OF_SPACE && outputSize > 0) {
      const output = this.runtime.alloc(outputSize);
      const result = this.runtime.call(
        'ghostty_paste_encode',
        inputPointer,
        input.length,
        bracketed ? 1 : 0,
        output,
        outputSize,
        written
      );
      const outputLength = this.runtime.view(written, 4).getUint32(0, true);
      encoded =
        result === GHOSTTY_SUCCESS ? decoder.decode(this.runtime.bytes(output, outputLength)) : '';
      this.runtime.free(output, outputSize);
    }
    this.runtime.free(written, USIZE_BYTES);
    this.runtime.free(inputPointer, input.length);
    return encoded;
  }

  /** Encodes a pointer event under the program's mouse modes; empty when it sends nothing. */
  encodeMouse(input: GhosttyMouseInput): string {
    this.ensureActive();
    this.runtime.call(
      'ghostty_mouse_encoder_setopt_from_terminal',
      this.mouseEncoder,
      this.terminal
    );

    const sizeLayout = this.runtime.layout('GhosttyMouseEncoderSize');
    const size = this.runtime.alloc(sizeLayout.size);
    for (const [field, value] of [
      ['size', sizeLayout.size],
      ['screen_width', input.screenWidth],
      ['screen_height', input.screenHeight],
      ['cell_width', input.cellWidth],
      ['cell_height', input.cellHeight],
      ['padding_top', input.paddingTop],
      ['padding_bottom', input.paddingBottom],
      ['padding_right', input.paddingRight],
      ['padding_left', input.paddingLeft]
    ] as const) {
      this.runtime.setField(size, 'GhosttyMouseEncoderSize', field, Math.max(0, Math.round(value)));
    }
    this.runtime.call('ghostty_mouse_encoder_setopt', this.mouseEncoder, 2, size);
    this.runtime.free(size, sizeLayout.size);

    this.runtime.bytes(this.scratch, 1)[0] = input.anyButtonPressed ? 1 : 0;
    this.runtime.call('ghostty_mouse_encoder_setopt', this.mouseEncoder, 3, this.scratch);
    this.runtime.bytes(this.scratch, 1)[0] = 1;
    this.runtime.call('ghostty_mouse_encoder_setopt', this.mouseEncoder, 4, this.scratch);

    this.runtime.call(
      'ghostty_mouse_event_set_action',
      this.mouseEvent,
      input.action === 'press' ? 0 : input.action === 'release' ? 1 : 2
    );
    if (input.button === null) {
      this.runtime.call('ghostty_mouse_event_clear_button', this.mouseEvent);
    } else {
      this.runtime.call('ghostty_mouse_event_set_button', this.mouseEvent, input.button);
    }
    this.runtime.call('ghostty_mouse_event_set_mods', this.mouseEvent, input.mods);
    const positionLayout = this.runtime.layout('GhosttyMousePosition');
    const position = this.runtime.alloc(positionLayout.size);
    const positionView = this.runtime.view(position, positionLayout.size);
    positionView.setFloat32(positionLayout.fields.x!.offset, input.x, true);
    positionView.setFloat32(positionLayout.fields.y!.offset, input.y, true);
    this.runtime.call('ghostty_mouse_event_set_position', this.mouseEvent, position);
    this.runtime.free(position, positionLayout.size);

    const written = this.runtime.alloc(USIZE_BYTES);
    const encoded = this.encodeOutput(written, (output, outputSize) =>
      this.runtime.call(
        'ghostty_mouse_encoder_encode',
        this.mouseEncoder,
        this.mouseEvent,
        output,
        outputSize,
        written
      )
    );
    this.runtime.free(written, USIZE_BYTES);
    return encoded;
  }

  /** Selects the cells between two grid points. */
  setSelection(anchor: GhosttyPointInput, end: GhosttyPointInput): void {
    this.ensureActive();
    const selectionLayout = this.runtime.layout('GhosttySelection');
    const gridRefSize = this.runtime.layout('GhosttyGridRef').size;
    const selection = this.runtime.alloc(selectionLayout.size);
    let start = 0;
    let endRef = 0;
    try {
      this.runtime.setField(selection, 'GhosttySelection', 'size', selectionLayout.size);
      start = this.gridRef(anchor.x, anchor.y, anchor.tag ?? 1);
      endRef = this.gridRef(end.x, end.y, end.tag ?? 1);
      const startField = selectionLayout.fields.start!;
      const endField = selectionLayout.fields.end!;
      this.runtime
        .bytes(selection + startField.offset, startField.size)
        .set(this.runtime.bytes(start, startField.size));
      this.runtime
        .bytes(selection + endField.offset, endField.size)
        .set(this.runtime.bytes(endRef, endField.size));
      this.runtime.call('ghostty_terminal_set', this.terminal, 21, selection);
    } finally {
      this.runtime.free(start, gridRefSize);
      this.runtime.free(endRef, gridRefSize);
      this.runtime.free(selection, selectionLayout.size);
    }
  }

  /** Selects the word at a viewport cell. */
  selectWord(col: number, row: number): GhosttySelectionRange | null {
    return this.selectAt(
      'GhosttyTerminalSelectWordOptions',
      'ghostty_terminal_select_word',
      col,
      row
    );
  }

  /** Selects the line at a viewport cell. */
  selectLine(col: number, row: number): GhosttySelectionRange | null {
    return this.selectAt(
      'GhosttyTerminalSelectLineOptions',
      'ghostty_terminal_select_line',
      col,
      row
    );
  }

  /** The OSC 8 hyperlink at a viewport cell, if any. */
  hyperlinkAt(col: number, row: number): string | null {
    this.ensureActive();
    const ref = this.gridRef(col, row);
    const written = this.runtime.alloc(USIZE_BYTES);
    const sizeResult = this.runtime.call('ghostty_grid_ref_hyperlink_uri', ref, 0, 0, written);
    const outputSize = this.runtime.view(written, 4).getUint32(0, true);
    let hyperlink: string | null = null;
    if (sizeResult === GHOSTTY_OUT_OF_SPACE && outputSize > 0) {
      const output = this.runtime.alloc(outputSize);
      const result = this.runtime.call(
        'ghostty_grid_ref_hyperlink_uri',
        ref,
        output,
        outputSize,
        written
      );
      const outputLength = this.runtime.view(written, 4).getUint32(0, true);
      if (result === GHOSTTY_SUCCESS && outputLength > 0) {
        hyperlink = decoder.decode(this.runtime.bytes(output, outputLength));
      }
      this.runtime.free(output, outputSize);
    }
    this.runtime.free(written, USIZE_BYTES);
    this.runtime.free(ref, this.runtime.layout('GhosttyGridRef').size);
    return hyperlink;
  }

  /** Removes the selection. */
  clearSelection(): void {
    this.ensureActive();
    this.runtime.call('ghostty_terminal_set', this.terminal, 21, 0);
  }

  /** Reads the viewport, re-reading only the rows Ghostty marked dirty since the last call. */
  snapshot(): GhosttySnapshot {
    this.ensureActive();
    this.assertSuccess(
      'ghostty_render_state_update',
      this.runtime.call('ghostty_render_state_update', this.renderState, this.terminal)
    );
    const cols = this.getU16(RENDER_DATA.cols);
    const rowCount = this.getU16(RENDER_DATA.rows);
    const dirty = this.getU32(RENDER_DATA.dirty);
    const foreground = this.getColor(RENDER_DATA.foreground, ENGINE_DEFAULT_FOREGROUND);
    const background = this.getColor(RENDER_DATA.background, ENGINE_DEFAULT_BACKGROUND);
    const cursorHasValue = this.getBool(RENDER_DATA.cursorHasValue);
    const cursor = cursorHasValue ? this.getColor(RENDER_DATA.cursor, foreground) : foreground;
    const cursorInViewport = this.getBool(RENDER_DATA.cursorInViewport);
    const cursorVisible = this.getBool(RENDER_DATA.cursorVisible) && cursorInViewport;
    const cursorX = cursorInViewport ? this.getU16(RENDER_DATA.cursorX) : -1;
    const cursorY = cursorInViewport ? this.getU16(RENDER_DATA.cursorY) : -1;

    if (this.rows.length !== rowCount || this.rows.some((row) => row.cells.length !== cols)) {
      this.rows = Array.from({ length: rowCount }, () => ({
        cells: Array.from({ length: cols }, () => this.emptyCell(foreground, background)),
        text: '',
        isWrapContinuation: false,
        wrapsToNext: false
      }));
    }

    const dirtyRows = new Set<number>();
    if (dirty !== 0) {
      this.assertSuccess(
        'ghostty_render_state_get(row iterator)',
        this.runtime.call(
          'ghostty_render_state_get',
          this.renderState,
          RENDER_DATA.rowIterator,
          this.rowIteratorSlot
        )
      );
      const iterator = this.runtime.readPointer(this.rowIteratorSlot);
      let rowIndex = 0;
      while (
        rowIndex < rowCount &&
        this.runtime.call('ghostty_render_state_row_iterator_next', iterator) !== 0
      ) {
        const rowDirty = dirty === 2 || this.getRowBool(iterator, ROW_DATA.dirty);
        if (rowDirty) {
          this.rows[rowIndex] = this.readRow(iterator, cols, foreground, background);
          dirtyRows.add(rowIndex);
          this.runtime.bytes(this.scratch, 1)[0] = 0;
          this.runtime.call('ghostty_render_state_row_set', iterator, 0, this.scratch);
        }
        rowIndex += 1;
      }
      this.runtime.view(this.scratch, 4).setUint32(0, 0, true);
      this.runtime.call('ghostty_render_state_set', this.renderState, 0, this.scratch);
    }

    return {
      cols,
      rows: rowCount,
      foreground,
      background,
      cursor,
      cursorX,
      cursorY,
      cursorVisible,
      cursorBlinking: this.getBool(RENDER_DATA.cursorBlinking),
      cursorStyle: this.getU32(RENDER_DATA.cursorStyle),
      dirtyRows,
      rowData: this.rows
    };
  }

  /** The selection as plain text with Ghostty's copy semantics (soft wraps joined, trailing blanks trimmed). */
  selectionText(): string {
    this.ensureActive();
    // Plain text (`emit` 0) of the terminal's own selection (`selection` null).
    const optionsName = 'GhosttyTerminalSelectionFormatOptions';
    const optionsSize = this.runtime.layout(optionsName).size;
    const options = this.runtime.alloc(optionsSize);
    this.runtime.setField(options, optionsName, 'size', optionsSize);
    this.runtime.setField(options, optionsName, 'unwrap', 1);
    this.runtime.setField(options, optionsName, 'trim', 1);
    const written = this.runtime.alloc(USIZE_BYTES);
    const sizeResult = this.runtime.call(
      'ghostty_terminal_selection_format_buf',
      this.terminal,
      options,
      0,
      0,
      written
    );
    const outputSize = this.runtime.view(written, 4).getUint32(0, true);
    let text = '';
    if (sizeResult === GHOSTTY_OUT_OF_SPACE && outputSize > 0) {
      const output = this.runtime.alloc(outputSize);
      const result = this.runtime.call(
        'ghostty_terminal_selection_format_buf',
        this.terminal,
        options,
        output,
        outputSize,
        written
      );
      const outputLength = this.runtime.view(written, 4).getUint32(0, true);
      if (result === GHOSTTY_SUCCESS) {
        text = decoder.decode(this.runtime.bytes(output, outputLength));
      }
      this.runtime.free(output, outputSize);
    }
    this.runtime.free(written, USIZE_BYTES);
    this.runtime.free(options, optionsSize);
    return text;
  }

  /** Converts a viewport cell to screen coordinates. */
  viewportPointToScreen(col: number, row: number): { x: number; y: number } | null {
    return this.convertPoint(col, row, 1, 2);
  }

  private convertPoint(
    col: number,
    row: number,
    fromTag: 1 | 2,
    toTag: 1 | 2
  ): { x: number; y: number } | null {
    this.ensureActive();
    const ref = this.gridRef(col, row, fromTag);
    const point = this.pointFromGridRef(ref, toTag);
    this.runtime.free(ref, this.runtime.layout('GhosttyGridRef').size);
    return point;
  }

  /** Frees every handle and allocation; the core is unusable afterwards. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.mouseEvent) this.runtime.call('ghostty_mouse_event_free', this.mouseEvent);
    if (this.mouseEncoder) this.runtime.call('ghostty_mouse_encoder_free', this.mouseEncoder);
    if (this.keyEvent) this.runtime.call('ghostty_key_event_free', this.keyEvent);
    if (this.keyEncoder) this.runtime.call('ghostty_key_encoder_free', this.keyEncoder);
    if (this.rowCellsSlot) {
      const cells = this.runtime.readPointer(this.rowCellsSlot);
      if (cells) this.runtime.call('ghostty_render_state_row_cells_free', cells);
    }
    if (this.rowIteratorSlot) {
      const iterator = this.runtime.readPointer(this.rowIteratorSlot);
      if (iterator) this.runtime.call('ghostty_render_state_row_iterator_free', iterator);
    }
    if (this.renderState) this.runtime.call('ghostty_render_state_free', this.renderState);
    if (this.terminal) {
      if (this.effectsId) this.runtime.detachEffects(this.terminal, this.effectsId);
      this.runtime.call('ghostty_terminal_free', this.terminal);
    }
    if (this.style) this.runtime.free(this.style, this.runtime.layout('GhosttyStyle').size);
    if (this.scrollbar) {
      this.runtime.free(this.scrollbar, this.runtime.layout('GhosttyTerminalScrollbar').size);
    }
    if (this.scratch) this.runtime.free(this.scratch, 16);
    if (this.graphemes) this.runtime.free(this.graphemes, this.graphemeCapacity);
    for (const slot of [
      this.mouseEventSlot,
      this.mouseEncoderSlot,
      this.keyEventSlot,
      this.keyEncoderSlot,
      this.rowCellsSlot,
      this.rowIteratorSlot,
      this.renderStateSlot,
      this.terminalSlot
    ]) {
      this.runtime.freeOpaque(slot);
    }
  }

  private encodeOutput(
    written: number,
    encode: (output: number, outputSize: number) => number
  ): string {
    const sizeResult = encode(0, 0);
    const outputSize = this.runtime.view(written, 4).getUint32(0, true);
    if (sizeResult === GHOSTTY_SUCCESS && outputSize === 0) return '';
    if (sizeResult !== GHOSTTY_OUT_OF_SPACE || outputSize === 0) return '';

    const output = this.runtime.alloc(outputSize);
    const result = encode(output, outputSize);
    const outputLength = this.runtime.view(written, 4).getUint32(0, true);
    const encoded =
      result === GHOSTTY_SUCCESS ? decoder.decode(this.runtime.bytes(output, outputLength)) : '';
    this.runtime.free(output, outputSize);
    return encoded;
  }

  private readRow(
    iterator: number,
    cols: number,
    defaultForeground: GhosttyColor,
    defaultBackground: GhosttyColor
  ): GhosttyRow {
    this.assertSuccess(
      'ghostty_render_state_row_get(raw)',
      this.runtime.call('ghostty_render_state_row_get', iterator, ROW_DATA.raw, this.scratch)
    );
    const rawRow = this.runtime.view(this.scratch, 8).getBigUint64(0, true);
    this.runtime.bytes(this.scratch + 8, 1)[0] = 0;
    this.assertSuccess(
      'ghostty_row_get(wrap continuation)',
      this.runtime.call('ghostty_row_get', rawRow, 2, this.scratch + 8)
    );
    const isWrapContinuation = this.runtime.bytes(this.scratch + 8, 1)[0] !== 0;
    this.runtime.bytes(this.scratch + 8, 1)[0] = 0;
    this.assertSuccess(
      'ghostty_row_get(wrap)',
      this.runtime.call('ghostty_row_get', rawRow, 1, this.scratch + 8)
    );
    const wrapsToNext = this.runtime.bytes(this.scratch + 8, 1)[0] !== 0;

    this.assertSuccess(
      'ghostty_render_state_row_get(cells)',
      this.runtime.call('ghostty_render_state_row_get', iterator, ROW_DATA.cells, this.rowCellsSlot)
    );
    const cellsIterator = this.runtime.readPointer(this.rowCellsSlot);
    const cellsNext = this.cellsNext!;
    const cellsGet = this.cellsGet!;
    const offsets = this.styleOffsets!;
    const style = this.style;
    const scratch = this.scratch;
    const cells: GhosttyCell[] = [];
    // Values are read straight from one view of module memory rather than a
    // fresh typed array per value; the view is fetched again after every
    // call, since any of them could grow memory.
    while (cells.length < cols && cellsNext(cellsIterator) !== 0) {
      let foreground = this.readCellColor(cellsIterator, CELL_DATA.foreground, defaultForeground);
      let background = this.readCellColor(cellsIterator, CELL_DATA.background, defaultBackground);
      this.runtime.heapBytes().set(this.styleTemplate, style);
      cellsGet(cellsIterator, CELL_DATA.style, style);
      let heap = this.runtime.heapBytes();
      heap.fill(0, scratch, scratch + 4);
      const graphemeLength =
        cellsGet(cellsIterator, CELL_DATA.graphemesLength, scratch) === GHOSTTY_SUCCESS
          ? readU32(this.runtime.heapBytes(), scratch)
          : 0;
      let text = '';
      if (graphemeLength > 0) {
        const bufferSize = graphemeLength * 4;
        if (bufferSize > this.graphemeCapacity) {
          const capacity = Math.max(bufferSize, this.graphemeCapacity * 2);
          const buffer = this.runtime.alloc(capacity);
          this.runtime.free(this.graphemes, this.graphemeCapacity);
          this.graphemes = buffer;
          this.graphemeCapacity = capacity;
        }
        if (cellsGet(cellsIterator, CELL_DATA.graphemes, this.graphemes) === GHOSTTY_SUCCESS) {
          // A lone codepoint, nearly every cell, is read in place; a cluster
          // goes through a DataView, which takes the codepoints as
          // little-endian whatever the buffer's alignment.
          text =
            graphemeLength === 1
              ? String.fromCodePoint(readU32(this.runtime.heapBytes(), this.graphemes))
              : ghosttyCellText(this.runtime.view(this.graphemes, bufferSize), graphemeLength);
        }
      }
      let wide = 0;
      if (text.length === 0 && cells.at(-1)?.text.length) {
        this.assertSuccess(
          'ghostty_render_state_row_cells_get(raw)',
          this.runtime.call(
            'ghostty_render_state_row_cells_get',
            cellsIterator,
            CELL_DATA.raw,
            this.scratch
          )
        );
        const rawCell = this.runtime.view(this.scratch, 8).getBigUint64(0, true);
        this.runtime.view(this.scratch + 8, 4).setUint32(0, 0, true);
        this.assertSuccess(
          'ghostty_cell_get(wide)',
          this.runtime.call('ghostty_cell_get', rawCell, RAW_CELL_DATA.wide, this.scratch + 8)
        );
        wide = this.runtime.view(this.scratch + 8, 4).getUint32(0, true);
      }
      this.runtime.heapBytes()[scratch] = 0;
      const selected =
        cellsGet(cellsIterator, CELL_DATA.selected, scratch) === GHOSTTY_SUCCESS &&
        this.runtime.heapBytes()[scratch] !== 0;
      // Read the style after allocation and ABI calls, which can grow WASM memory.
      heap = this.runtime.heapBytes();
      if (heap[style + offsets.inverse] !== 0) {
        [foreground, background] = [background, foreground];
      }
      if (heap[style + offsets.faint] !== 0) {
        foreground = blend(foreground, background);
      }
      cells.push({
        text,
        wide,
        foreground,
        background,
        bold: heap[style + offsets.bold] !== 0,
        italic: heap[style + offsets.italic] !== 0,
        invisible: heap[style + offsets.invisible] !== 0,
        strikethrough: heap[style + offsets.strikethrough] !== 0,
        overline: heap[style + offsets.overline] !== 0,
        underline: readU32(heap, style + offsets.underline) !== 0,
        selected
      });
    }
    while (cells.length < cols) cells.push(this.emptyCell(defaultForeground, defaultBackground));
    return new SnapshotRow(cells, isWrapContinuation, wrapsToNext);
  }

  /** A cell's color, or `fallback` when the cell has none of its own. */
  private readCellColor(iterator: number, data: number, fallback: GhosttyColor): GhosttyColor {
    if (this.cellsGet!(iterator, data, this.scratch) !== GHOSTTY_SUCCESS) return fallback;
    const heap = this.runtime.heapBytes();
    const r = heap[this.scratch]!;
    const g = heap[this.scratch + 1]!;
    const b = heap[this.scratch + 2]!;
    const key = (r << 16) | (g << 8) | b;
    let color = this.colors.get(key);
    if (color === undefined) {
      if (this.colors.size >= COLOR_TABLE_LIMIT) this.colors.clear();
      color = { r, g, b };
      this.colors.set(key, color);
    }
    return color;
  }

  private gridRef(col: number, row: number, tag: 1 | 2 = 1): number {
    const pointLayout = this.runtime.layout('GhosttyPoint');
    const point = this.runtime.alloc(pointLayout.size);
    this.runtime.setField(point, 'GhosttyPoint', 'tag', tag);
    const pointValue = pointLayout.fields.value!;
    const valueOffset = pointValue.offset;
    const view = this.runtime.view(point + valueOffset, pointValue.size);
    view.setUint16(0, Math.max(0, col), true);
    view.setUint32(4, Math.max(0, row), true);
    const gridRefSize = this.runtime.layout('GhosttyGridRef').size;
    const gridRef = this.runtime.alloc(gridRefSize);
    this.runtime.setField(gridRef, 'GhosttyGridRef', 'size', gridRefSize);
    const result = this.runtime.call('ghostty_terminal_grid_ref', this.terminal, point, gridRef);
    this.runtime.free(point, pointLayout.size);
    if (result !== GHOSTTY_SUCCESS) {
      this.runtime.free(gridRef, gridRefSize);
      this.assertSuccess('ghostty_terminal_grid_ref', result);
    }
    return gridRef;
  }

  private selectAt(
    optionsName: 'GhosttyTerminalSelectWordOptions' | 'GhosttyTerminalSelectLineOptions',
    operation: 'ghostty_terminal_select_word' | 'ghostty_terminal_select_line',
    col: number,
    row: number
  ): GhosttySelectionRange | null {
    this.ensureActive();
    const optionsLayout = this.runtime.layout(optionsName);
    const selectionLayout = this.runtime.layout('GhosttySelection');
    const options = this.runtime.alloc(optionsLayout.size);
    let ref = 0;
    let selection = 0;
    let range: GhosttySelectionRange | null = null;
    try {
      this.runtime.setField(options, optionsName, 'size', optionsLayout.size);
      ref = this.gridRef(col, row);
      const refField = optionsLayout.fields.ref!;
      this.runtime
        .bytes(options + refField.offset, refField.size)
        .set(this.runtime.bytes(ref, refField.size));
      selection = this.runtime.alloc(selectionLayout.size);
      this.runtime.setField(selection, 'GhosttySelection', 'size', selectionLayout.size);
      const result = this.runtime.call(operation, this.terminal, options, selection);
      if (result === GHOSTTY_SUCCESS) {
        const start = selection + selectionLayout.fields.start!.offset;
        const end = selection + selectionLayout.fields.end!.offset;
        const viewportStart = this.pointFromGridRef(start, 1);
        const viewportEnd = this.pointFromGridRef(end, 1);
        const screenStart = this.pointFromGridRef(start, 2);
        const screenEnd = this.pointFromGridRef(end, 2);
        if (viewportStart && viewportEnd && screenStart && screenEnd) {
          range = {
            viewport: { start: viewportStart, end: viewportEnd },
            screen: { start: screenStart, end: screenEnd }
          };
        }
        this.runtime.call('ghostty_terminal_set', this.terminal, 21, selection);
      }
    } finally {
      this.runtime.free(selection, selectionLayout.size);
      this.runtime.free(ref, this.runtime.layout('GhosttyGridRef').size);
      this.runtime.free(options, optionsLayout.size);
    }
    return range;
  }

  private pointFromGridRef(ref: number, tag: 1 | 2): { x: number; y: number } | null {
    const coordinateLayout = this.runtime.layout('GhosttyPointCoordinate');
    const coordinate = this.runtime.alloc(coordinateLayout.size);
    const result = this.runtime.call(
      'ghostty_terminal_point_from_grid_ref',
      this.terminal,
      ref,
      tag,
      coordinate
    );
    const point =
      result === GHOSTTY_SUCCESS
        ? {
            x: this.runtime.readField(coordinate, 'GhosttyPointCoordinate', 'x'),
            y: this.runtime.readField(coordinate, 'GhosttyPointCoordinate', 'y')
          }
        : null;
    this.runtime.free(coordinate, coordinateLayout.size);
    return point;
  }

  /** Whether a DEC private mode is set. */
  private getMode(mode: number): boolean {
    this.writeModeConfig(mode, false);
    return (
      this.runtime.call('ghostty_terminal_get', this.terminal, DATA_MODE, this.scratch) ===
        GHOSTTY_SUCCESS &&
      this.runtime.readField(this.scratch, 'GhosttyTerminalModeConfig', 'value') !== 0
    );
  }

  /** Fills the scratch buffer with a `GhosttyTerminalModeConfig` for a DEC private mode. */
  private writeModeConfig(mode: number, value: boolean): void {
    this.runtime.setField(this.scratch, 'GhosttyTerminalModeConfig', 'mode', mode);
    this.runtime.setField(this.scratch, 'GhosttyTerminalModeConfig', 'value', value ? 1 : 0);
  }

  private getU16(data: number): number {
    this.runtime.bytes(this.scratch, 2).fill(0);
    this.assertSuccess(
      'ghostty_render_state_get',
      this.runtime.call('ghostty_render_state_get', this.renderState, data, this.scratch)
    );
    return this.runtime.view(this.scratch, 2).getUint16(0, true);
  }

  private getU32(data: number): number {
    this.runtime.bytes(this.scratch, 4).fill(0);
    this.assertSuccess(
      'ghostty_render_state_get',
      this.runtime.call('ghostty_render_state_get', this.renderState, data, this.scratch)
    );
    return this.runtime.view(this.scratch, 4).getUint32(0, true);
  }

  private getBool(data: number): boolean {
    this.runtime.bytes(this.scratch, 1)[0] = 0;
    this.assertSuccess(
      'ghostty_render_state_get',
      this.runtime.call('ghostty_render_state_get', this.renderState, data, this.scratch)
    );
    return this.runtime.bytes(this.scratch, 1)[0] !== 0;
  }

  private getColor(data: number, fallback: GhosttyColor): GhosttyColor {
    this.runtime.bytes(this.scratch, 3).fill(0);
    const result = this.runtime.call(
      'ghostty_render_state_get',
      this.renderState,
      data,
      this.scratch
    );
    return result === GHOSTTY_SUCCESS ? this.readColor(this.scratch) : fallback;
  }

  private getRowBool(iterator: number, data: number): boolean {
    this.runtime.bytes(this.scratch, 1)[0] = 0;
    return (
      this.runtime.call('ghostty_render_state_row_get', iterator, data, this.scratch) ===
        GHOSTTY_SUCCESS && this.runtime.bytes(this.scratch, 1)[0] !== 0
    );
  }

  private getCellU32(iterator: number, data: number): number {
    this.runtime.bytes(this.scratch, 4).fill(0);
    const result = this.runtime.call(
      'ghostty_render_state_row_cells_get',
      iterator,
      data,
      this.scratch
    );
    return result === GHOSTTY_SUCCESS ? this.runtime.view(this.scratch, 4).getUint32(0, true) : 0;
  }

  private getCellBool(iterator: number, data: number): boolean {
    this.runtime.bytes(this.scratch, 1)[0] = 0;
    return (
      this.runtime.call('ghostty_render_state_row_cells_get', iterator, data, this.scratch) ===
        GHOSTTY_SUCCESS && this.runtime.bytes(this.scratch, 1)[0] !== 0
    );
  }

  private getCellColor(iterator: number, data: number, fallback: GhosttyColor): GhosttyColor {
    this.runtime.bytes(this.scratch, 3).fill(0);
    const result = this.runtime.call(
      'ghostty_render_state_row_cells_get',
      iterator,
      data,
      this.scratch
    );
    return result === GHOSTTY_SUCCESS ? this.readColor(this.scratch) : fallback;
  }

  private readColor(pointer: number): GhosttyColor {
    const bytes = this.runtime.bytes(pointer, 3);
    return { r: bytes[0] ?? 0, g: bytes[1] ?? 0, b: bytes[2] ?? 0 };
  }

  private emptyCell(foreground: GhosttyColor, background: GhosttyColor): GhosttyCell {
    return {
      text: '',
      wide: 0,
      foreground,
      background,
      bold: false,
      italic: false,
      invisible: false,
      strikethrough: false,
      overline: false,
      underline: false,
      selected: false
    };
  }

  private assertSuccess(operation: string, result: number): void {
    if (result !== GHOSTTY_SUCCESS) throw new Error(`${operation} failed with result ${result}`);
  }

  private ensureActive(): void {
    if (this.disposed) throw new Error('libghostty-vt terminal has been disposed');
  }
}

/** Whether two colors are the same. */
export function ghosttyColorsEqual(left: GhosttyColor, right: GhosttyColor): boolean {
  return sameColor(left, right);
}
