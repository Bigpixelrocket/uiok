/**
 * Canvas 2D drawing of a Ghostty render snapshot: backgrounds and selection
 * in runs, text in same-style runs clipped to their cells and drawn at the
 * terminal's minimum contrast against each cell's own background, block elements and
 * box drawing as shapes snapped to device pixels, decorations, and the cursor.
 * Only dirty rows are repainted unless a full frame is forced.
 */

import {
  GHOSTTY_CELL_WIDE,
  ghosttyColorsEqual,
  type GhosttyCell,
  type GhosttyColor,
  type GhosttySnapshot
} from './core.js';
import { legibleForeground } from './contrast.logic.js';
import { DEFAULT_SELECTION_BACKGROUND } from './fallbackColors.js';
import {
  ghosttySpriteCodepoint,
  ghosttySpriteGlyph,
  ghosttySpriteThickness,
  type GhosttySpriteGlyph
} from './spriteGlyphs.logic.js';

/** One cell's size in CSS pixels and its text baseline offset. */
export interface GhosttyCellMetrics {
  readonly width: number;
  readonly height: number;
  readonly baseline: number;
}

/** An inclusive range of viewport cells. */
export interface GhosttyCellRange {
  readonly start: { readonly x: number; readonly y: number };
  readonly end: { readonly x: number; readonly y: number };
}

// The engine hands out one object per color, so its CSS text is built once.
const cssColors = new WeakMap<GhosttyColor, string>();

function cssColor(color: GhosttyColor): string {
  let text = cssColors.get(color);
  if (text === undefined) {
    text = `rgb(${color.r}, ${color.g}, ${color.b})`;
    cssColors.set(color, text);
  }
  return text;
}

// By a cell's background, then its foreground: the colour its text is
// drawn in. The engine hands out one object per color, so each pair is
// floored once and keeps one CSS text.
const inks = new WeakMap<GhosttyColor, WeakMap<GhosttyColor, GhosttyColor>>();

/**
 * The colour a cell's text is drawn in: its foreground, moved only as far
 * as the terminal's minimum contrast against the cell's own background
 * needs (`legibleForeground`). A background stays as the program asked.
 */
function cellInk(cell: GhosttyCell): GhosttyColor {
  let byForeground = inks.get(cell.background);
  if (byForeground === undefined) {
    byForeground = new WeakMap();
    inks.set(cell.background, byForeground);
  }
  let ink = byForeground.get(cell.foreground);
  if (ink === undefined) {
    ink = legibleForeground(cell.foreground, cell.background);
    byForeground.set(cell.foreground, ink);
  }
  return ink;
}

function sameTextStyle(left: GhosttyCell, right: GhosttyCell): boolean {
  // Selection deliberately does not participate: it only tints the background
  // overlay, and splitting a text run at a selection boundary visibly shifts
  // glyph spacing whenever the face's true advance differs from the cell width.
  return (
    ghosttyColorsEqual(left.foreground, right.foreground) &&
    left.bold === right.bold &&
    left.italic === right.italic &&
    left.invisible === right.invisible
  );
}

/**
 * The end (exclusive) of the text run starting at `start`, absorbing
 * wide-glyph spacer tails. Exported for `renderer.test.ts`, which checks the
 * run boundaries directly.
 */
export function ghosttyTextRunEnd(
  cells: readonly GhosttyCell[],
  start: number,
  sameStyle: (cell: GhosttyCell) => boolean
): number {
  let end = start + 1;
  while (end < cells.length) {
    const next = cells[end];
    if (!next) break;
    if (next.wide === GHOSTTY_CELL_WIDE.spacerTail) {
      end += 1;
      continue;
    }
    if (next.text.length === 0 || !sameStyle(next)) break;
    end += 1;
  }
  return end;
}

// Sprite shapes depend only on the codepoint and three whole-pixel sizes, so
// each combination is built once. Cells in one grid take at most two widths and
// two heights at a fractional cell size, which keeps the cache small; it is
// dropped wholesale if font or zoom changes ever fill it.
const SPRITE_CACHE_LIMIT = 4096;
const spriteCache = new Map<number, GhosttySpriteGlyph | null>();

function cachedSpriteGlyph(
  codepoint: number,
  width: number,
  height: number,
  thickness: number
): GhosttySpriteGlyph | null {
  // Box Drawing and Block Elements span 160 codepoints; sizes stay well under
  // the field widths, and the key stays an exact integer below 2^53.
  const key = codepoint - 0x2500 + 160 * (thickness + 256 * (width + 4096 * height));
  let glyph = spriteCache.get(key);
  if (glyph === undefined) {
    glyph = ghosttySpriteGlyph(codepoint, width, height, thickness);
    if (spriteCache.size >= SPRITE_CACHE_LIMIT) spriteCache.clear();
    spriteCache.set(key, glyph);
  }
  return glyph;
}

/**
 * Where a cell boundary lands on the device pixel grid: `index` cells of
 * `size` CSS pixels past `padding`, scaled by `pixelRatio` and rounded. Every
 * fill that meets a neighbouring cell (row and cell backgrounds, selection,
 * the cursor, decorations, and the block and box shapes) takes its edges from
 * here, so two cells always share an edge exactly, with no seam where a
 * fractional edge would leave a pixel half covered.
 */
function deviceGridEdge(index: number, size: number, padding: number, pixelRatio: number): number {
  return Math.round((padding + index * size) * pixelRatio);
}

/**
 * Fills a rectangle given by device pixel edges in the current fill style. The
 * context is scaled by `pixelRatio`, so the edges are divided back into CSS
 * pixels and land on whole device pixels again.
 */
function fillDeviceRect(
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  right: number,
  bottom: number,
  pixelRatio: number
): void {
  context.fillRect(
    left / pixelRatio,
    top / pixelRatio,
    (right - left) / pixelRatio,
    (bottom - top) / pixelRatio
  );
}

/**
 * Paints one block or box-drawing cell in the current fill style, inside the
 * cell's device pixel edges (`deviceGridEdge` for its column, and the row's
 * `deviceTop` and `deviceBottom`).
 */
function paintSpriteCell(
  context: CanvasRenderingContext2D,
  codepoint: number,
  column: number,
  deviceTop: number,
  deviceBottom: number,
  padding: number,
  cellWidth: number,
  pixelRatio: number,
  thickness: number,
  color: string
): void {
  const deviceLeft = deviceGridEdge(column, cellWidth, padding, pixelRatio);
  const deviceRight = deviceGridEdge(column + 1, cellWidth, padding, pixelRatio);
  const glyph = cachedSpriteGlyph(
    codepoint,
    deviceRight - deviceLeft,
    deviceBottom - deviceTop,
    thickness
  );
  if (glyph === null) return;
  if (glyph.alpha !== 1) context.globalAlpha = glyph.alpha;
  for (const rect of glyph.rects) {
    fillDeviceRect(
      context,
      deviceLeft + rect.left,
      deviceTop + rect.top,
      deviceLeft + rect.right,
      deviceTop + rect.bottom,
      pixelRatio
    );
  }
  if (glyph.alpha !== 1) context.globalAlpha = 1;
  const arc = glyph.arc;
  if (arc !== null) {
    // A corner's curve can reach past the cell's edge (as upstream's does at
    // some sizes), so the stroke is clipped to the cell's device pixels, the
    // same ones its neighbours' backgrounds fill. The restore drops the clip
    // and the stroke state and keeps the run's fill style.
    context.save();
    context.beginPath();
    context.rect(
      deviceLeft / pixelRatio,
      deviceTop / pixelRatio,
      (deviceRight - deviceLeft) / pixelRatio,
      (deviceBottom - deviceTop) / pixelRatio
    );
    context.clip();
    context.strokeStyle = color;
    context.lineWidth = arc.lineWidth / pixelRatio;
    context.lineCap = 'butt';
    // Arc points are device pixels from the cell's corner, converted inline
    // so a frame allocates nothing per cell.
    context.beginPath();
    context.moveTo((deviceLeft + arc.startX) / pixelRatio, (deviceTop + arc.startY) / pixelRatio);
    context.lineTo(
      (deviceLeft + arc.bendStartX) / pixelRatio,
      (deviceTop + arc.bendStartY) / pixelRatio
    );
    context.bezierCurveTo(
      (deviceLeft + arc.control1X) / pixelRatio,
      (deviceTop + arc.control1Y) / pixelRatio,
      (deviceLeft + arc.control2X) / pixelRatio,
      (deviceTop + arc.control2Y) / pixelRatio,
      (deviceLeft + arc.bendEndX) / pixelRatio,
      (deviceTop + arc.bendEndY) / pixelRatio
    );
    context.lineTo((deviceLeft + arc.endX) / pixelRatio, (deviceTop + arc.endY) / pixelRatio);
    context.stroke();
    context.restore();
  }
}

/** Where a string inks when drawn at the origin on the alphabetic baseline, in CSS pixels. */
export interface GhosttyTextInk {
  readonly left: number;
  readonly right: number;
  readonly ascent: number;
  readonly descent: number;
}

/** A box in CSS pixels, by its edges. */
export interface GhosttyInkBox {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

// Text repeats from frame to frame (a redraw, a scroll), so most runs measure
// once; a font's entries are dropped wholesale once it holds this many.
const TEXT_INK_CACHE_LIMIT = 4096;

/**
 * Painted glyph pixels reach up to about 1.3 device pixels past the ink box
 * `measureText` reports (antialiasing and the rasterizer's smoothing, measured
 * in Chromium for SF Mono, Menlo, Fira Code, and Courier New in every style),
 * so ink is judged with two device pixels to spare.
 */
const INK_MARGIN_DEVICE_PIXELS = 2;

/**
 * The ink of each run of text a surface draws, measured once per font and
 * text, so the renderer knows which runs can share one clip with every other
 * run of their font and colour.
 */
export class GhosttyTextInkCache {
  private readonly fonts = new Map<string, Map<string, GhosttyTextInk>>();

  /** The ink of `text` in `font`, which must be the context's current font. */
  measure(context: CanvasRenderingContext2D, font: string, text: string): GhosttyTextInk {
    let entries = this.fonts.get(font);
    if (entries === undefined) {
      // A surface draws in at most four fonts (bold and italic) until its
      // family or size changes, which leaves the old ones unused.
      if (this.fonts.size >= 8) this.fonts.clear();
      entries = new Map();
      this.fonts.set(font, entries);
    }
    let ink = entries.get(text);
    if (ink === undefined) {
      const metrics = context.measureText(text);
      ink = {
        left: metrics.actualBoundingBoxLeft,
        right: metrics.actualBoundingBoxRight,
        ascent: metrics.actualBoundingBoxAscent,
        descent: metrics.actualBoundingBoxDescent
      };
      if (entries.size >= TEXT_INK_CACHE_LIMIT) entries.clear();
      entries.set(text, ink);
    }
    return ink;
  }

  /** Forgets every measurement, for when a face loads and its glyphs change under the same font. */
  clear(): void {
    this.fonts.clear();
  }
}

/**
 * Whether text with this ink, drawn at (`x`, `y`), stays inside `box` with
 * `margin` to spare on every side, so it paints no pixel outside the box.
 * The canvas only ever squeezes text drawn wider than its maximum width, so
 * the unsqueezed ink is the widest it can paint.
 */
export function ghosttyInkInside(
  ink: GhosttyTextInk,
  x: number,
  y: number,
  box: GhosttyInkBox,
  margin: number
): boolean {
  return (
    x - ink.left >= box.left + margin &&
    x + ink.right <= box.right - margin &&
    y - ink.ascent >= box.top + margin &&
    y + ink.descent <= box.bottom - margin
  );
}

/**
 * The text runs of one font and colour in a frame, drawn under one clip to
 * the union of their cells. Two runs of one style are never neighbours (a
 * run takes every following cell of its style), so the union cuts each run
 * exactly where its own clip would, provided its ink stays inside its row
 * and short of the cells past its neighbours.
 */
interface TextGroup {
  readonly font: string;
  readonly color: string;
  readonly texts: string[];
  /** Per run: x, y, max width, then the clip's left, top, width, and height. */
  readonly geometry: number[];
}

function fontForCell(
  cell: Pick<GhosttyCell, 'bold' | 'italic'>,
  fontSize: number,
  fontFamily: string
): string {
  const style = cell.italic ? 'italic' : 'normal';
  const weight = cell.bold ? '700' : '400';
  return `${style} ${weight} ${fontSize}px ${fontFamily}`;
}

/**
 * Measures a cell for the face: the `M` advance, the requested line height
 * (never shorter than the face's ascent plus descent), and a baseline that
 * centres the glyphs in it.
 */
export function measureGhosttyCell(
  context: CanvasRenderingContext2D,
  fontSize: number,
  fontFamily: string,
  lineHeight: number
): GhosttyCellMetrics {
  context.font = `normal 400 ${fontSize}px ${fontFamily}`;
  const widthMeasurement = context.measureText('M');
  const verticalMeasurement = context.measureText('Mg');
  const ascent = verticalMeasurement.actualBoundingBoxAscent || fontSize;
  const descent = verticalMeasurement.actualBoundingBoxDescent;
  const glyphHeight = ascent + descent;
  const height = Math.max(1, Math.round(lineHeight), Math.ceil(glyphHeight));
  return {
    width: Math.max(1, widthMeasurement.width),
    height,
    baseline: Math.round((height - glyphHeight) / 2 + ascent)
  };
}

/** How many whole cells fit in a box after padding; never less than one by one. */
export function terminalGridSize(
  width: number,
  height: number,
  metrics: GhosttyCellMetrics,
  padding: number
): { cols: number; rows: number } {
  return {
    cols: Math.max(1, Math.floor((width - padding * 2) / metrics.width)),
    rows: Math.max(1, Math.floor((height - padding * 2) / metrics.height))
  };
}

/** How strongly an unfocused terminal's hollow cursor is drawn: the text colour at half strength. */
const UNFOCUSED_CURSOR_ALPHA = 0.5;

/** Whether no cell of the snapshot's screen shows a glyph. */
function screenIsBlank(snapshot: GhosttySnapshot): boolean {
  return snapshot.rowData.every((row) =>
    row.cells.every((cell) => cell.text === '' || cell.text === ' ')
  );
}

/** Paints a snapshot onto the canvas context. */
export function renderGhosttySnapshot(options: {
  readonly context: CanvasRenderingContext2D;
  readonly snapshot: GhosttySnapshot;
  readonly metrics: GhosttyCellMetrics;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly padding: number;
  readonly forceFull: boolean;
  readonly cursorOn: boolean;
  readonly previousCursorY?: number | null;
  readonly focused?: boolean;
  readonly selectionBackground?: string;
  readonly hoveredLinkRange?: GhosttyCellRange | null;
  /** The device pixels per CSS pixel the context's transform scales by; 1 when omitted. */
  readonly pixelRatio?: number;
  /**
   * Measured text ink, so runs that ink near their cells share one clip per
   * font and colour; without it, and in a frame that draws a bar, underline,
   * or outline cursor (an unfocused terminal's included), every run gets a
   * clip of its own.
   */
  readonly textInk?: GhosttyTextInkCache;
}): void {
  const {
    context,
    snapshot,
    metrics,
    fontSize,
    fontFamily,
    padding,
    forceFull,
    cursorOn,
    previousCursorY
  } = options;
  const focused = options.focused ?? true;
  const selectionBackground = options.selectionBackground ?? DEFAULT_SELECTION_BACKGROUND;
  const hoveredLinkRange = options.hoveredLinkRange ?? null;
  const pixelRatio = options.pixelRatio ?? 1;
  // A clip of several rectangles turns Chromium's GPU canvas to multisampling
  // for the whole frame, which shades an edge that falls inside a device pixel
  // differently. The bar, underline, and outline cursors, and the outline an
  // unfocused terminal draws, have such edges, so a frame that draws one clips
  // each run on its own.
  const cursorOffDevicePixels =
    cursorOn &&
    snapshot.cursorVisible &&
    snapshot.cursorX >= 0 &&
    snapshot.cursorY >= 0 &&
    (!focused ||
      snapshot.cursorStyle === 0 ||
      snapshot.cursorStyle === 2 ||
      snapshot.cursorStyle === 3);
  const textInk = cursorOffDevicePixels ? null : (options.textInk ?? null);
  const spriteThickness = ghosttySpriteThickness(fontSize, pixelRatio);
  const rowsToDraw = forceFull
    ? Array.from({ length: snapshot.rows }, (_, index) => index)
    : [...snapshot.dirtyRows];
  if (
    previousCursorY !== null &&
    previousCursorY !== undefined &&
    previousCursorY >= 0 &&
    !rowsToDraw.includes(previousCursorY)
  ) {
    rowsToDraw.push(previousCursorY);
  }
  if (snapshot.cursorVisible && snapshot.cursorY >= 0 && !rowsToDraw.includes(snapshot.cursorY)) {
    rowsToDraw.push(snapshot.cursorY);
  }

  if (forceFull) {
    context.save();
    context.resetTransform();
    context.fillStyle = cssColor(snapshot.background);
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    context.restore();
  }

  context.textBaseline = 'alphabetic';
  // By font, then by color.
  const textGroups = new Map<string, Map<string, TextGroup>>();
  // The four fonts a frame can draw in, by bold and italic.
  const fonts = [false, true].flatMap((bold) =>
    [false, true].map((italic) => fontForCell({ bold, italic }, fontSize, fontFamily))
  );
  for (const rowIndex of rowsToDraw) {
    const row = snapshot.rowData[rowIndex];
    if (!row) continue;
    const top = padding + rowIndex * metrics.height;
    const deviceTop = deviceGridEdge(rowIndex, metrics.height, padding, pixelRatio);
    const deviceBottom = deviceGridEdge(rowIndex + 1, metrics.height, padding, pixelRatio);
    const columnEdge = (column: number) =>
      deviceGridEdge(column, metrics.width, padding, pixelRatio);

    context.fillStyle = cssColor(snapshot.background);
    fillDeviceRect(
      context,
      columnEdge(0),
      deviceTop,
      columnEdge(snapshot.cols),
      deviceBottom,
      pixelRatio
    );

    let backgroundStart = 0;
    while (backgroundStart < row.cells.length) {
      const first = row.cells[backgroundStart];
      if (!first) break;
      let backgroundEnd = backgroundStart + 1;
      while (backgroundEnd < row.cells.length) {
        const next = row.cells[backgroundEnd];
        if (
          !next ||
          next.selected !== first.selected ||
          !ghosttyColorsEqual(next.background, first.background)
        ) {
          break;
        }
        backgroundEnd += 1;
      }
      if (first.selected || !ghosttyColorsEqual(first.background, snapshot.background)) {
        const left = columnEdge(backgroundStart);
        const right = columnEdge(backgroundEnd);
        if (!ghosttyColorsEqual(first.background, snapshot.background)) {
          context.fillStyle = cssColor(first.background);
          fillDeviceRect(context, left, deviceTop, right, deviceBottom, pixelRatio);
        }
        if (first.selected) {
          context.fillStyle = selectionBackground;
          fillDeviceRect(context, left, deviceTop, right, deviceBottom, pixelRatio);
        }
      }
      backgroundStart = backgroundEnd;
    }

    let runStart = 0;
    while (runStart < row.cells.length) {
      const first = row.cells[runStart];
      if (!first) break;
      if (first.text.length === 0) {
        runStart += 1;
        continue;
      }
      if (ghosttySpriteCodepoint(first.text) >= 0) {
        // Block and box-drawing cells leave the text batch and paint as
        // shapes, a same-style stretch of them under one fill style.
        let runEnd = runStart + 1;
        while (runEnd < row.cells.length) {
          const next = row.cells[runEnd];
          if (!next || ghosttySpriteCodepoint(next.text) < 0 || !sameTextStyle(next, first)) break;
          runEnd += 1;
        }
        // Block and box shapes keep the program's colour: they draw a
        // picture or a frame, whose colour is the point, not text to read.
        if (!first.invisible) {
          const color = cssColor(first.foreground);
          context.fillStyle = color;
          for (let column = runStart; column < runEnd; column += 1) {
            paintSpriteCell(
              context,
              ghosttySpriteCodepoint(row.cells[column]?.text ?? ''),
              column,
              deviceTop,
              deviceBottom,
              padding,
              metrics.width,
              pixelRatio,
              spriteThickness,
              color
            );
          }
        }
        runStart = runEnd;
        continue;
      }
      const firstInk = cellInk(first);
      // A run splits where the floor draws its text in another colour, so
      // each cell's text keeps the contrast of its own background.
      const runEnd = ghosttyTextRunEnd(
        row.cells,
        runStart,
        (cell) =>
          ghosttySpriteCodepoint(cell.text) < 0 &&
          sameTextStyle(cell, first) &&
          ghosttyColorsEqual(cellInk(cell), firstInk)
      );
      const text =
        runEnd === runStart + 1
          ? first.text
          : row.cells
              .slice(runStart, runEnd)
              .map((cell) => cell.text)
              .join('');
      if (!first.invisible && text.trim().length > 0) {
        const font = fonts[(first.bold ? 2 : 0) + (first.italic ? 1 : 0)]!;
        const color = cssColor(firstInk);
        const x = padding + runStart * metrics.width;
        const y = top + metrics.baseline;
        const maxWidth = (runEnd - runStart) * metrics.width;
        // The clip shares the backgrounds' device edges, so a glyph never
        // spills half a pixel into its neighbour's background.
        const clipLeft = columnEdge(runStart);
        const clipRight = columnEdge(runEnd);
        context.font = font;
        if (
          textInk !== null &&
          ghosttyInkInside(
            textInk.measure(context, font, text),
            x,
            y,
            {
              left: columnEdge(runStart - 1) / pixelRatio,
              top: deviceTop / pixelRatio,
              right: columnEdge(runEnd + 1) / pixelRatio,
              bottom: deviceBottom / pixelRatio
            },
            INK_MARGIN_DEVICE_PIXELS / pixelRatio
          )
        ) {
          let groups = textGroups.get(font);
          if (groups === undefined) {
            groups = new Map();
            textGroups.set(font, groups);
          }
          let group = groups.get(color);
          if (group === undefined) {
            group = { font, color, texts: [], geometry: [] };
            groups.set(color, group);
          }
          group.texts.push(text);
          group.geometry.push(
            x,
            y,
            maxWidth,
            clipLeft / pixelRatio,
            deviceTop / pixelRatio,
            (clipRight - clipLeft) / pixelRatio,
            (deviceBottom - deviceTop) / pixelRatio
          );
        } else {
          context.fillStyle = color;
          context.save();
          context.beginPath();
          context.rect(
            clipLeft / pixelRatio,
            deviceTop / pixelRatio,
            (clipRight - clipLeft) / pixelRatio,
            (deviceBottom - deviceTop) / pixelRatio
          );
          context.clip();
          context.fillText(text, x, y, maxWidth);
          context.restore();
        }
      }
      runStart = runEnd;
    }
  }

  // Every run in a group is clipped to its own cells by one clip, so a frame
  // changes canvas state once per font and colour rather than once per run.
  // Text never shares a pixel with another row's backgrounds or another
  // group's text, so drawing it after them paints the same frame.
  for (const group of [...textGroups.values()].flatMap((groups) => [...groups.values()])) {
    const { geometry, texts } = group;
    context.font = group.font;
    context.fillStyle = group.color;
    context.save();
    context.beginPath();
    for (let index = 0; index < texts.length; index += 1) {
      const at = index * 7;
      context.rect(geometry[at + 3]!, geometry[at + 4]!, geometry[at + 5]!, geometry[at + 6]!);
    }
    context.clip();
    for (let index = 0; index < texts.length; index += 1) {
      const at = index * 7;
      context.fillText(texts[index]!, geometry[at]!, geometry[at + 1]!, geometry[at + 2]!);
    }
    context.restore();
  }

  // Decorations paint over the text of their row, as they always have.
  for (const rowIndex of rowsToDraw) {
    const row = snapshot.rowData[rowIndex];
    if (!row) continue;
    const top = padding + rowIndex * metrics.height;
    const columnEdge = (column: number) =>
      deviceGridEdge(column, metrics.width, padding, pixelRatio);
    for (let column = 0; column < row.cells.length; column += 1) {
      const cell = row.cells[column];
      const hoveredLink =
        hoveredLinkRange !== null &&
        rowIndex >= hoveredLinkRange.start.y &&
        rowIndex <= hoveredLinkRange.end.y &&
        (rowIndex > hoveredLinkRange.start.y || column >= hoveredLinkRange.start.x) &&
        (rowIndex < hoveredLinkRange.end.y || column <= hoveredLinkRange.end.x);
      if (!cell || (!cell.underline && !cell.strikethrough && !cell.overline && !hoveredLink)) {
        continue;
      }
      context.fillStyle = cssColor(cellInk(cell));
      // Decorations span the cell's device edges so a decorated run is unbroken.
      const left = columnEdge(column) / pixelRatio;
      const width = (columnEdge(column + 1) - columnEdge(column)) / pixelRatio;
      if (cell.underline || hoveredLink) {
        context.fillRect(left, top + metrics.height - 2, width, 1);
      }
      if (cell.strikethrough) {
        context.fillRect(left, top + Math.floor(metrics.height * 0.55), width, 1);
      }
      if (cell.overline) context.fillRect(left, top + 1, width, 1);
    }
  }

  if (
    cursorOn &&
    snapshot.cursorVisible &&
    snapshot.cursorX >= 0 &&
    snapshot.cursorY >= 0 &&
    // An unfocused screen with nothing on it shows no cursor: a lone box in
    // an empty output well reads as an error mark, not as a place to type.
    (focused || !screenIsBlank(snapshot))
  ) {
    const left = padding + snapshot.cursorX * metrics.width;
    const top = padding + snapshot.cursorY * metrics.height;
    const deviceLeft = deviceGridEdge(snapshot.cursorX, metrics.width, padding, pixelRatio);
    const deviceRight = deviceGridEdge(snapshot.cursorX + 1, metrics.width, padding, pixelRatio);
    const deviceTop = deviceGridEdge(snapshot.cursorY, metrics.height, padding, pixelRatio);
    const deviceBottom = deviceGridEdge(snapshot.cursorY + 1, metrics.height, padding, pixelRatio);
    context.fillStyle = cssColor(snapshot.cursor);
    if (!focused) {
      // An unfocused terminal draws a quiet hollow cursor, a 1px outline in
      // the text colour at half strength, so the active pane is obvious and
      // the resting one keeps its place without the cursor colour's alarm.
      const alpha = context.globalAlpha;
      context.globalAlpha = alpha * UNFOCUSED_CURSOR_ALPHA;
      context.strokeStyle = cssColor(snapshot.foreground);
      context.strokeRect(left + 0.5, top + 0.5, metrics.width - 1, metrics.height - 1);
      context.globalAlpha = alpha;
    } else if (snapshot.cursorStyle === 0) {
      context.fillRect(left, top, 2, metrics.height);
    } else if (snapshot.cursorStyle === 2) {
      context.fillRect(left, top + metrics.height - 2, metrics.width, 2);
    } else if (snapshot.cursorStyle === 3) {
      context.strokeStyle = cssColor(snapshot.cursor);
      context.strokeRect(left + 0.5, top + 0.5, metrics.width - 1, metrics.height - 1);
    } else {
      // The block covers exactly the cell's device pixels, the same ones its
      // background and any block or box shape under it fill.
      fillDeviceRect(context, deviceLeft, deviceTop, deviceRight, deviceBottom, pixelRatio);
      // An invisible cell stays hidden under the block, as it is beside it.
      const cell = snapshot.rowData[snapshot.cursorY]?.cells[snapshot.cursorX];
      const shown = cell !== undefined && !cell.invisible;
      const spriteCodepoint = shown ? ghosttySpriteCodepoint(cell.text) : -1;
      if (spriteCodepoint >= 0) {
        const background = cssColor(snapshot.background);
        context.fillStyle = background;
        paintSpriteCell(
          context,
          spriteCodepoint,
          snapshot.cursorX,
          deviceTop,
          deviceBottom,
          padding,
          metrics.width,
          pixelRatio,
          spriteThickness,
          background
        );
      } else if (shown && cell.text) {
        context.font = fontForCell(cell, fontSize, fontFamily);
        context.fillStyle = cssColor(snapshot.background);
        context.fillText(cell.text, left, top + metrics.baseline, metrics.width);
      }
    }
  }
}
