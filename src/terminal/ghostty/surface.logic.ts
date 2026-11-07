/**
 * The terminal surface's pure decisions: font stacks, sizes, and line
 * pitch, cursor blink, the canvas backing store, grid geometry, scrollbar
 * math, link hit testing over snapshot rows, clipboard and IME key
 * classification, mouse reporting, wheel translation, and multi-click
 * counting.
 */

import type { GhosttyRow, GhosttyScrollbar } from './core.js';
import { collectWrappedTerminalLinkLine, extractTerminalLinks } from './links.logic.js';
import type { GhosttyCellMetrics, GhosttyCellRange } from './renderer.js';

/** The terminal's text size in CSS pixels when none is requested. */
const DEFAULT_TERMINAL_FONT_SIZE = 12;
const MIN_TERMINAL_FONT_SIZE = 6;
const MAX_TERMINAL_FONT_SIZE = 32;
/** A line's height as a multiple of the text size when no line height is requested. */
const DEFAULT_TERMINAL_LINE_HEIGHT_RATIO = 1.35;
// The glyph fallbacks only supply symbols the text faces are missing (powerline
// separators, devicons, and other private-use prompt symbols), so shells
// configured for a locally installed Nerd Font keep their prompt glyphs no
// matter which text face is active.
const TERMINAL_GLYPH_FALLBACKS =
  '"Symbols Nerd Font Mono", "Symbols Nerd Font", "JetBrainsMono Nerd Font", ' +
  '"JetBrainsMono NF", "FiraCode Nerd Font", "Hack Nerd Font", "MesloLGS NF", ' +
  '"CaskaydiaCove Nerd Font", "PowerlineSymbols", monospace';
/**
 * The platform's own monospace faces; concrete names only, because an
 * unknown keyword (like ui-monospace) makes canvas font shorthand parsing
 * reject the whole string.
 */
export const DEFAULT_TERMINAL_FONT_FAMILY =
  '"SF Mono", "SFMono-Regular", Menlo, ' + TERMINAL_GLYPH_FALLBACKS;
const MIN_SCROLLBAR_THUMB_HEIGHT = 18;
/** Two presses within this many milliseconds count as a double click. */
const SELECTION_MULTI_CLICK_INTERVAL_MS = 500;
const TERMINAL_LINK_DRAG_THRESHOLD_PX = 4;
const MONOSPACE_ADVANCE_TOLERANCE = 0.01;

function quoteTerminalFontFamilies(list: string): string {
  return list
    .split(',')
    .map((name) => {
      const bare = name.trim();
      if (bare.length === 0) return '';
      if (/^(['"]).*\1$/.test(bare)) return bare;
      if (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(bare)) return bare;
      return `"${bare.replaceAll('"', '')}"`;
    })
    .filter((name) => name.length > 0)
    .join(', ');
}

/**
 * A requested family list, quoted for canvas font shorthand and followed by
 * the glyph fallbacks; the default stack when nothing usable is requested.
 * Quoting matters: an unquoted non-ident name ("3270 Nerd Font", "M+ 1m")
 * makes the whole canvas font string invalid and the assignment silently
 * no-ops.
 */
export function terminalFontStack(family?: string): string {
  const custom = family === undefined ? '' : quoteTerminalFontFamilies(family);
  return custom.length === 0
    ? DEFAULT_TERMINAL_FONT_FAMILY
    : `${custom}, ${TERMINAL_GLYPH_FALLBACKS}`;
}

/** Whether the given family list names no face at all. */
export function isEmptyTerminalFontFamily(family?: string): boolean {
  return family === undefined || quoteTerminalFontFamilies(family).length === 0;
}

/** Clamps a requested text size to whole pixels in the supported range. */
export function terminalFontSize(size?: number): number {
  if (size === undefined || !Number.isFinite(size)) return DEFAULT_TERMINAL_FONT_SIZE;
  return Math.max(MIN_TERMINAL_FONT_SIZE, Math.min(MAX_TERMINAL_FONT_SIZE, Math.round(size)));
}

/**
 * The line pitch a cell asks for, in whole pixels: the requested one, or
 * 1.35 times the text size when none is. The cell measurement still grows it
 * to fit a face whose glyphs are taller (`measureGhosttyCell`).
 */
export function terminalLineHeight(fontSize: number, lineHeight?: number): number {
  if (lineHeight === undefined || !Number.isFinite(lineHeight)) {
    return Math.round(fontSize * DEFAULT_TERMINAL_LINE_HEIGHT_RATIO);
  }
  return Math.max(1, Math.round(lineHeight));
}

/**
 * Whether a face's measured glyph advances are all equal. Unmeasurable
 * advances answer true, so a missing measurement never blocks a face.
 */
export function areFontAdvancesMonospace(advances: readonly number[]): boolean {
  const reference = advances[0];
  if (
    reference === undefined ||
    reference <= 0 ||
    advances.some((advance) => !Number.isFinite(advance) || advance <= 0)
  ) {
    return true;
  }
  return advances.every((advance) => Math.abs(advance - reference) < MONOSPACE_ADVANCE_TOLERANCE);
}

/**
 * Whether the cursor should keep toggling. An unfocused surface draws a steady
 * hollow cursor instead of blinking, and a reduced-motion reader gets a steady
 * cursor too rather than a permanently animating element.
 */
export function shouldBlinkTerminalCursor(state: {
  readonly focused: boolean;
  readonly cursorBlinking: boolean;
  readonly cursorVisible: boolean;
  readonly reducedMotion: boolean;
}): boolean {
  return state.focused && state.cursorBlinking && state.cursorVisible && !state.reducedMotion;
}

/** A canvas backing store: its size in device pixels and the ratio its transform scales by. */
export interface TerminalCanvasBacking {
  readonly width: number;
  readonly height: number;
  readonly ratio: number;
}

/**
 * The backing store a mount of `cssWidth` by `cssHeight` needs at `ratio`, or
 * null when the installed one already matches. A ratio change alone still needs
 * a new transform, and a fresh canvas (`installed` null) always needs one, even
 * when its default size happens to match.
 */
export function terminalCanvasBackingChange(
  installed: TerminalCanvasBacking | null,
  cssWidth: number,
  cssHeight: number,
  ratio: number
): TerminalCanvasBacking | null {
  const width = Math.max(1, Math.round(cssWidth * ratio));
  const height = Math.max(1, Math.round(cssHeight * ratio));
  if (
    installed !== null &&
    installed.width === width &&
    installed.height === height &&
    installed.ratio === ratio
  ) {
    return null;
  }
  return { width, height, ratio };
}

/** The scrollbar thumb's size and position in pixels. */
export interface TerminalScrollbarGeometry {
  readonly thumbHeight: number;
  readonly thumbTop: number;
  readonly maxOffset: number;
}

/** The thumb for a scrollback position in a track; null when nothing can scroll. */
export function terminalScrollbarGeometry(
  state: GhosttyScrollbar,
  trackHeight: number
): TerminalScrollbarGeometry | null {
  const total = Math.max(0, state.total);
  const len = Math.max(0, Math.min(state.len, total));
  const maxOffset = Math.max(0, total - len);
  if (trackHeight <= 0 || len <= 0 || maxOffset === 0) return null;
  const thumbHeight = Math.min(
    trackHeight,
    Math.max(MIN_SCROLLBAR_THUMB_HEIGHT, (trackHeight * len) / total)
  );
  const travel = Math.max(0, trackHeight - thumbHeight);
  const offset = Math.max(0, Math.min(state.offset, maxOffset));
  return {
    thumbHeight,
    thumbTop: travel * (offset / maxOffset),
    maxOffset
  };
}

/** The scrollback row offset for a thumb dragged to `pointerY`, holding the grab point. */
export function terminalScrollbarOffsetAtPointer(
  state: GhosttyScrollbar,
  trackHeight: number,
  pointerY: number,
  pointerOffset: number
): number {
  const geometry = terminalScrollbarGeometry(state, trackHeight);
  if (geometry === null) return 0;
  const travel = Math.max(0, trackHeight - geometry.thumbHeight);
  if (travel === 0) return 0;
  const thumbTop = Math.max(0, Math.min(pointerY - pointerOffset, travel));
  return Math.round((thumbTop / travel) * geometry.maxOffset);
}

/** The viewport cell under a point, or null outside the drawn grid (padding included). */
export function terminalGridCellAt(options: {
  bounds: { left: number; top: number };
  clientX: number;
  clientY: number;
  cols: number;
  rows: number;
  metrics: Pick<GhosttyCellMetrics, 'width' | 'height'>;
  padding: number;
}): { x: number; y: number } | null {
  const { bounds, clientX, clientY, cols, rows, metrics, padding } = options;
  const gridX = clientX - bounds.left - padding;
  const gridY = clientY - bounds.top - padding;
  if (gridX < 0 || gridY < 0 || gridX >= cols * metrics.width || gridY >= rows * metrics.height) {
    return null;
  }
  return {
    x: Math.floor(gridX / metrics.width),
    y: Math.floor(gridY / metrics.height)
  };
}

function terminalRowText(row: GhosttyRow, trimRight: boolean): string {
  const text = row.cells.map((cell) => cell.text || ' ').join('');
  return trimRight ? text.trimEnd() : text;
}

function terminalColumnOffset(row: GhosttyRow, column: number): number {
  let offset = 0;
  for (let cellIndex = 0; cellIndex < column; cellIndex += 1) {
    offset += row.cells[cellIndex]?.text.length || 1;
  }
  return offset;
}

/** A link and the viewport cells it covers. */
export interface TerminalLinkWithRange {
  readonly text: string;
  readonly range: GhosttyCellRange;
}

/** Whether two hit-tested links are the same link over the same cells. */
export function isSameTerminalLink(
  left: TerminalLinkWithRange,
  right: TerminalLinkWithRange | null
): boolean {
  return (
    right?.text === left.text &&
    right.range.start.x === left.range.start.x &&
    right.range.start.y === left.range.start.y &&
    right.range.end.x === left.range.end.x &&
    right.range.end.y === left.range.end.y
  );
}

function terminalColumnAtOffset(row: GhosttyRow, offset: number): number {
  for (let column = 0; column < row.cells.length; column += 1) {
    const nextOffset = terminalColumnOffset(row, column + 1);
    if (offset < nextOffset) return column;
  }
  return Math.max(0, row.cells.length - 1);
}

/** The URL printed under a viewport cell, rebuilt across soft wraps; null when absent or cut off. */
export function terminalLinkAtPositionWithRange(
  rows: readonly GhosttyRow[],
  rowIndex: number,
  column: number
): TerminalLinkWithRange | null {
  const wrappedLine = collectWrappedTerminalLinkLine(rowIndex + 1, (index) => {
    const row = rows[index];
    if (!row) return null;
    return {
      isWrapped: row.isWrapContinuation,
      translateToString: (trimRight = false) => terminalRowText(row, trimRight)
    };
  });
  if (!wrappedLine) return null;
  // Only viewport rows are available: a wrapped line whose head scrolled above
  // the viewport would resolve a truncated match into a wrong link.
  const firstSegment = wrappedLine.segments[0];
  if (firstSegment && rows[firstSegment.bufferLineNumber - 1]?.isWrapContinuation) {
    return null;
  }
  const segment = wrappedLine.segments.find((value) => value.bufferLineNumber === rowIndex + 1);
  const row = rows[rowIndex];
  if (!segment || !row) return null;
  const lastSegment = wrappedLine.segments.at(-1);
  const lastRow = lastSegment ? rows[lastSegment.bufferLineNumber - 1] : undefined;
  // Ghostty's soft-wrap flag is authoritative: when the last collected row
  // still wraps onward, its continuation is outside the viewport.
  const continuesBelowViewport = lastRow !== undefined && lastRow.wrapsToNext;
  const offset = segment.startIndex + terminalColumnOffset(row, column);
  for (const match of extractTerminalLinks(wrappedLine.text)) {
    if (offset >= match.start && offset < match.end) {
      // A truncated tail must not activate as a complete link.
      if (match.end === wrappedLine.text.length && continuesBelowViewport) return null;
      const startSegment = wrappedLine.segments.find(
        (value) => match.start >= value.startIndex && match.start < value.endIndex
      );
      const endSegment = wrappedLine.segments.find(
        (value) => match.end - 1 >= value.startIndex && match.end - 1 < value.endIndex
      );
      const startRow = startSegment ? rows[startSegment.bufferLineNumber - 1] : undefined;
      const endRow = endSegment ? rows[endSegment.bufferLineNumber - 1] : undefined;
      if (!startSegment || !endSegment || !startRow || !endRow) return null;
      return {
        text: match.text,
        range: {
          start: {
            x: terminalColumnAtOffset(startRow, match.start - startSegment.startIndex),
            y: startSegment.bufferLineNumber - 1
          },
          end: {
            x: terminalColumnAtOffset(endRow, match.end - 1 - endSegment.startIndex),
            y: endSegment.bufferLineNumber - 1
          }
        }
      };
    }
  }
  return null;
}

/**
 * Command-C copies. Control-C stays the shell's interrupt, and the produced
 * character decides, so a layout that moves C keeps the chord on C.
 */
export function isTerminalCopyShortcut(
  event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'key' | 'metaKey'>
): boolean {
  return event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'c';
}

/** Command-V pastes; Control-V stays the shell's literal-next. */
export function isTerminalPasteShortcut(
  event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'key' | 'metaKey'>
): boolean {
  return event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'v';
}

/**
 * Canvas terminals have no DOM selection. A copy command run from the Edit
 * menu reads the focused textarea, so an empty IME field would write
 * blankness to the clipboard. Park the Ghostty selection there first.
 */
export function primeTerminalCopyInput(
  input: Pick<HTMLTextAreaElement, 'value' | 'select'>,
  selection: string
): void {
  input.value = selection;
  if (selection.length === 0) return;
  input.select();
}

/**
 * Only blank the copy we parked. The same textarea holds the IME candidate;
 * wiping whatever is there would cancel CJK composition.
 */
export function clearPrimedTerminalCopyInput(
  input: Pick<HTMLTextAreaElement, 'value'>,
  primedSelection: string
): void {
  if (primedSelection.length === 0 || input.value !== primedSelection) return;
  input.value = '';
}

/**
 * A copy event may only be claimed (default prevented) when it actually
 * received the selection; a copy event without clipboardData keeps its
 * native default so the primed textarea is what gets copied.
 */
export function applyTerminalCopyEvent(
  selection: string,
  clipboardData: { setData: (type: string, data: string) => void } | null | undefined
): { preventDefault: boolean } {
  if (selection.length === 0 || !clipboardData) return { preventDefault: false };
  clipboardData.setData('text/plain', selection);
  return { preventDefault: true };
}

/** Whether an input event is the browser's follow-up to a finished IME composition. */
export function isTerminalCompositionCommitInput(event: Pick<InputEvent, 'inputType'>): boolean {
  return (
    event.inputType === '' ||
    event.inputType === 'insertCompositionText' ||
    event.inputType === 'insertFromComposition'
  );
}

/** IME keydowns must not touch the hidden textarea; it holds the candidate. */
export function isTerminalCompositionKey(
  event: Pick<KeyboardEvent, 'isComposing' | 'key' | 'keyCode'>,
  composing: boolean
): boolean {
  return event.isComposing || composing || event.key === 'Process' || event.keyCode === 229;
}

/** AltGr text arrives through the textarea's input event, not the key encoder. */
export function isTerminalAltGraphText(
  event: Pick<KeyboardEvent, 'getModifierState' | 'key'>
): boolean {
  return event.getModifierState('AltGraph') && [...event.key].length === 1;
}

/**
 * Whether a pointer event goes to the program's mouse reporting. Shift, and
 * the link and copy modifiers, keep the pointer for selection and links.
 */
export function shouldReportTerminalMouse(
  tracking: boolean,
  event: Pick<MouseEvent, 'ctrlKey' | 'metaKey' | 'shiftKey'>
): boolean {
  return tracking && !event.shiftKey && !event.ctrlKey && !event.metaKey;
}

/**
 * Whether a press is a secondary click: the right button, or Control with
 * the primary one, which macOS turns into the same `contextmenu`. It asks for
 * the terminal's menu, so it is never a mouse report and never starts or ends
 * a selection, which the menu's Copy then still has.
 */
export function isTerminalSecondaryPress(event: Pick<MouseEvent, 'button' | 'ctrlKey'>): boolean {
  return event.button === 2 || (event.button === 0 && event.ctrlKey);
}

/** A mouse report's kind. */
export type TerminalMouseAction = 'press' | 'release' | 'motion';

/** Drops a motion report identical to the last one, so hovering within a cell sends nothing. */
export function resolveTerminalMouseData(
  action: TerminalMouseAction,
  data: string,
  previousMotionData: string
): { readonly send: boolean; readonly nextMotionData: string } {
  const nextMotionData = action === 'motion' ? data : '';
  return {
    send: data.length > 0 && (action !== 'motion' || data !== previousMotionData),
    nextMotionData
  };
}

/** Restarts motion deduplication whenever the program toggles motion tracking. */
export function resolveTerminalMouseTrackingState(
  previousTracking: boolean,
  tracking: boolean,
  motionData: string
): { readonly tracking: boolean; readonly motionData: string } {
  return {
    tracking,
    motionData: previousTracking === tracking ? motionData : ''
  };
}

/** Converts a wheel delta into whole rows, carrying the fractional remainder forward. */
export function terminalWheelDeltaRows(
  event: Pick<WheelEvent, 'deltaY' | 'deltaMode'>,
  cellHeight: number,
  viewportRows: number,
  remainder: number
): { readonly rows: number; readonly remainder: number } {
  // deltaMode: 0 pixels, 1 lines, 2 pages.
  const pixels =
    event.deltaMode === 1
      ? event.deltaY * cellHeight
      : event.deltaMode === 2
        ? event.deltaY * viewportRows * cellHeight
        : event.deltaY;
  const total = remainder + pixels / cellHeight;
  const rows = Math.trunc(total);
  return { rows, remainder: total - rows };
}

/** Arrow keys standing in for wheel rows on the alternate screen, which has no scrollback. */
export function terminalWheelArrowData(rows: number, applicationCursorKeys: boolean): string {
  if (rows === 0) return '';
  const sequence =
    rows < 0
      ? applicationCursorKeys
        ? '\u001bOA'
        : '\u001b[A'
      : applicationCursorKeys
        ? '\u001bOB'
        : '\u001b[B';
  return sequence.repeat(Math.abs(rows));
}

/** Ghostty's mouse button for a DOM `button`; null for buttons it does not know. */
export function ghosttyMouseButton(button: number): number | null {
  switch (button) {
    case 0:
      return 1;
    case 1:
      return 3;
    case 2:
      return 2;
    case 3:
      return 4;
    case 4:
      return 5;
    default:
      return null;
  }
}

/** The running click count and where and when the last press landed. */
export interface TerminalSelectionClickSequence {
  readonly count: number;
  readonly time: number;
  readonly x: number;
  readonly y: number;
}

/** Whether a pointer moved far enough from its press to become a drag. */
export function isTerminalPointerDrag(
  origin: { readonly x: number; readonly y: number },
  event: Pick<PointerEvent, 'clientX' | 'clientY'>
): boolean {
  return (
    Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > TERMINAL_LINK_DRAG_THRESHOLD_PX
  );
}

/**
 * Counts stationary presses within the double-click interval (single, word,
 * line, then back to single), since PointerEvent.detail is not reliable.
 */
export function advanceTerminalSelectionClickSequence(
  previous: TerminalSelectionClickSequence | null,
  event: Pick<PointerEvent, 'clientX' | 'clientY' | 'timeStamp'>
): TerminalSelectionClickSequence {
  const repeats =
    previous !== null &&
    event.timeStamp - previous.time <= SELECTION_MULTI_CLICK_INTERVAL_MS &&
    !isTerminalPointerDrag(previous, event);
  return {
    count: repeats ? (previous.count >= 3 ? 1 : previous.count + 1) : 1,
    time: event.timeStamp,
    x: event.clientX,
    y: event.clientY
  };
}
