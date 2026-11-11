import { describe, expect, it, vi } from 'vitest';

import { GHOSTTY_CELL_WIDE, type GhosttyCell, type GhosttySnapshot } from './core.js';
import {
  GhosttyTextInkCache,
  ghosttyInkInside,
  ghosttyTextRunEnd,
  measureGhosttyCell,
  renderGhosttySnapshot,
  terminalGridSize
} from './renderer.js';

const cell = (text: string, wide = 0): GhosttyCell => ({
  text,
  wide,
  foreground: { r: 255, g: 255, b: 255 },
  background: { r: 0, g: 0, b: 0 },
  bold: false,
  italic: false,
  invisible: false,
  strikethrough: false,
  overline: false,
  underline: false,
  selected: false
});

describe('terminalGridSize', () => {
  it("matches the mobile renderer's cell-and-padding sizing model", () => {
    expect(terminalGridSize(808, 408, { width: 10, height: 20, baseline: 15 }, 4)).toEqual({
      cols: 80,
      rows: 20
    });
  });

  it('never sends an invalid zero-sized terminal to libghostty', () => {
    expect(terminalGridSize(0, 0, { width: 10, height: 20, baseline: 15 }, 4)).toEqual({
      cols: 1,
      rows: 1
    });
  });
});

describe('measureGhosttyCell', () => {
  const contextFor = (ascent: number, descent: number) =>
    ({
      font: '',
      measureText: (text: string) =>
        text === 'M'
          ? { width: 7.8, actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: 0 }
          : { width: 15.6, actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent }
    }) as unknown as CanvasRenderingContext2D;

  it('keeps the requested line pitch and centres the glyphs in it', () => {
    // A 12px glyph box in a 19px line: 3.5px above, so the baseline lands at 13.
    expect(measureGhosttyCell(contextFor(9, 3), 13, 'monospace', 19)).toEqual({
      width: 7.8,
      height: 19,
      baseline: 13
    });
  });

  it('grows the line to fit glyphs taller than the requested pitch', () => {
    expect(measureGhosttyCell(contextFor(14, 6.5), 13, 'monospace', 19)).toEqual({
      width: 7.8,
      height: 21,
      baseline: 14
    });
  });
});

describe('ghosttyTextRunEnd', () => {
  it('includes wide spacer tails in the visual clip without rendering spaces', () => {
    const cells = [
      cell('界', GHOSTTY_CELL_WIDE.wide),
      cell('', GHOSTTY_CELL_WIDE.spacerTail),
      cell('🙂', GHOSTTY_CELL_WIDE.wide),
      cell('', GHOSTTY_CELL_WIDE.spacerTail),
      cell('')
    ];
    expect(ghosttyTextRunEnd(cells, 0, () => true)).toBe(4);
  });
});

describe('renderGhosttySnapshot', () => {
  it('underlines every cell in a hovered wrapped link', () => {
    const fillRectCalls: number[][] = [];
    const context = {
      canvas: { width: 200, height: 80 },
      beginPath: () => {},
      clip: () => {},
      fillRect: (...args: number[]) => fillRectCalls.push(args),
      fillText: () => {},
      rect: () => {},
      resetTransform: () => {},
      restore: () => {},
      save: () => {},
      set fillStyle(_value: string) {},
      set font(_value: string) {},
      set textBaseline(_value: string) {}
    } as unknown as CanvasRenderingContext2D;
    const snapshot: GhosttySnapshot = {
      cols: 4,
      rows: 2,
      foreground: { r: 255, g: 255, b: 255 },
      background: { r: 0, g: 0, b: 0 },
      cursor: { r: 255, g: 255, b: 255 },
      cursorX: -1,
      cursorY: -1,
      cursorVisible: false,
      cursorBlinking: false,
      cursorStyle: 1,
      dirtyRows: new Set([0, 1]),
      rowData: [0, 1].map(() => ({
        cells: [cell('a'), cell('b'), cell('c'), cell('d')],
        text: 'abcd',
        isWrapContinuation: false,
        wrapsToNext: false
      }))
    };

    renderGhosttySnapshot({
      context,
      snapshot,
      metrics: { width: 10, height: 20, baseline: 15 },
      fontSize: 12,
      fontFamily: 'monospace',
      padding: 4,
      forceFull: false,
      cursorOn: false,
      hoveredLinkRange: { start: { x: 2, y: 0 }, end: { x: 1, y: 1 } }
    });

    expect(fillRectCalls.filter(([, , , height]) => height === 1)).toEqual([
      [24, 22, 10, 1],
      [34, 22, 10, 1],
      [4, 42, 10, 1],
      [14, 42, 10, 1]
    ]);
  });

  it('constrains text runs and cursor glyphs to their terminal cells', () => {
    const fillTextCalls: unknown[][] = [];
    const context = {
      canvas: { width: 200, height: 40 },
      beginPath: () => {},
      clip: () => {},
      fillRect: () => {},
      fillText: (...args: unknown[]) => fillTextCalls.push(args),
      rect: () => {},
      resetTransform: () => {},
      restore: () => {},
      save: () => {},
      set fillStyle(_value: string) {},
      set font(_value: string) {},
      set textBaseline(_value: string) {}
    } as unknown as CanvasRenderingContext2D;
    const cells = [cell('a'), cell('b'), cell('x')];
    const snapshot: GhosttySnapshot = {
      cols: 3,
      rows: 1,
      foreground: { r: 255, g: 255, b: 255 },
      background: { r: 0, g: 0, b: 0 },
      cursor: { r: 255, g: 255, b: 255 },
      cursorX: 2,
      cursorY: 0,
      cursorVisible: true,
      cursorBlinking: false,
      cursorStyle: 1,
      dirtyRows: new Set([0]),
      rowData: [{ cells, text: 'abx', isWrapContinuation: false, wrapsToNext: false }]
    };

    renderGhosttySnapshot({
      context,
      snapshot,
      metrics: { width: 7.2, height: 16, baseline: 11 },
      fontSize: 12,
      fontFamily: 'monospace',
      padding: 4,
      forceFull: false,
      cursorOn: true
    });

    expect(fillTextCalls).toEqual([
      ['abx', 4, 15, 21.6],
      ['x', 18.4, 15, 7.2]
    ]);
  });

  it.each([
    ['draws no cursor on an unfocused screen with nothing on it', ['', ' ', ''], 0],
    [
      'draws a quiet text-coloured outline cursor on an unfocused screen with text',
      ['a', 'b', ''],
      1
    ]
  ])('%s', (_name, texts, outlines) => {
    const strokes: { style: string; alpha: number }[] = [];
    let strokeStyle = '';
    const context = {
      canvas: { width: 100, height: 40 },
      globalAlpha: 1,
      beginPath: () => {},
      clip: () => {},
      fillRect: () => {},
      fillText: () => {},
      rect: () => {},
      resetTransform: () => {},
      restore: () => {},
      save: () => {},
      strokeRect(this: { globalAlpha: number }) {
        strokes.push({ style: strokeStyle, alpha: this.globalAlpha });
      },
      set fillStyle(_value: string) {},
      set font(_value: string) {},
      set strokeStyle(value: string) {
        strokeStyle = value;
      },
      set textBaseline(_value: string) {}
    } as unknown as CanvasRenderingContext2D;
    const cells = texts.map((text) => cell(text));
    const snapshot: GhosttySnapshot = {
      cols: 3,
      rows: 1,
      foreground: { r: 200, g: 200, b: 200 },
      background: { r: 0, g: 0, b: 0 },
      cursor: { r: 255, g: 120, b: 0 },
      cursorX: 2,
      cursorY: 0,
      cursorVisible: true,
      cursorBlinking: false,
      cursorStyle: 1,
      dirtyRows: new Set([0]),
      rowData: [{ cells, text: texts.join(''), isWrapContinuation: false, wrapsToNext: false }]
    };

    renderGhosttySnapshot({
      context,
      snapshot,
      metrics: { width: 10, height: 20, baseline: 15 },
      fontSize: 12,
      fontFamily: 'monospace',
      padding: 4,
      forceFull: true,
      cursorOn: true,
      focused: false
    });

    expect(strokes).toEqual(outlines === 0 ? [] : [{ style: 'rgb(200, 200, 200)', alpha: 0.5 }]);
  });

  it('batches text around block glyphs and paints the glyphs as shapes that share edges', () => {
    const fillTextCalls: unknown[][] = [];
    const foregroundRects: number[][] = [];
    let fillStyle = '';
    const context = {
      canvas: { width: 200, height: 40 },
      beginPath: () => {},
      clip: () => {},
      fillRect: (...args: number[]) => {
        if (fillStyle === 'rgb(255, 255, 255)') foregroundRects.push(args);
      },
      fillText: (...args: unknown[]) => fillTextCalls.push(args),
      rect: () => {},
      resetTransform: () => {},
      restore: () => {},
      save: () => {},
      set fillStyle(value: string) {
        fillStyle = value;
      },
      set font(_value: string) {},
      set textBaseline(_value: string) {}
    } as unknown as CanvasRenderingContext2D;
    const cells = [cell('a'), cell('b'), cell('█'), cell('█'), cell('c'), cell('d')];
    const snapshot: GhosttySnapshot = {
      cols: 6,
      rows: 1,
      foreground: { r: 255, g: 255, b: 255 },
      background: { r: 0, g: 0, b: 0 },
      cursor: { r: 255, g: 255, b: 255 },
      cursorX: -1,
      cursorY: -1,
      cursorVisible: false,
      cursorBlinking: false,
      cursorStyle: 1,
      dirtyRows: new Set([0]),
      rowData: [{ cells, text: 'ab██cd', isWrapContinuation: false, wrapsToNext: false }]
    };

    renderGhosttySnapshot({
      context,
      snapshot,
      metrics: { width: 7.2, height: 16, baseline: 11 },
      fontSize: 12,
      fontFamily: 'monospace',
      padding: 4,
      forceFull: false,
      cursorOn: false,
      pixelRatio: 2
    });

    expect(fillTextCalls).toEqual([
      ['ab', 4, 15, 14.4],
      ['cd', 32.8, 15, 14.4]
    ]);
    // Cell edges round to device pixels (36.8 to 37, 51.2 to 51, 65.6 to 66),
    // so the second block starts exactly where the first ends.
    expect(foregroundRects).toEqual([
      [18.5, 4, 7, 16],
      [25.5, 4, 7.5, 16]
    ]);
    const [first, second] = foregroundRects;
    expect(first![0]! + first![2]!).toBe(second![0]);
  });

  it('snaps cell backgrounds and the block cursor to the shapes device edges', () => {
    const fills: Array<[string, ...number[]]> = [];
    let fillStyle = '';
    const context = {
      canvas: { width: 200, height: 80 },
      beginPath: () => {},
      clip: () => {},
      fillRect: (...args: number[]) => fills.push([fillStyle, ...args]),
      fillText: () => {},
      rect: () => {},
      resetTransform: () => {},
      restore: () => {},
      save: () => {},
      set fillStyle(value: string) {
        fillStyle = value;
      },
      set font(_value: string) {},
      set textBaseline(_value: string) {}
    } as unknown as CanvasRenderingContext2D;
    const red = { ...cell(''), background: { r: 255, g: 0, b: 0 } };
    const blue = { ...cell(''), background: { r: 0, g: 0, b: 255 } };
    const snapshot: GhosttySnapshot = {
      cols: 2,
      rows: 1,
      foreground: { r: 255, g: 255, b: 255 },
      background: { r: 0, g: 0, b: 0 },
      cursor: { r: 0, g: 255, b: 0 },
      cursorX: 1,
      cursorY: 0,
      cursorVisible: true,
      cursorBlinking: false,
      cursorStyle: 1,
      dirtyRows: new Set([0]),
      rowData: [{ cells: [red, blue], text: '', isWrapContinuation: false, wrapsToNext: false }]
    };

    renderGhosttySnapshot({
      context,
      snapshot,
      metrics: { width: 7.2, height: 16, baseline: 11 },
      fontSize: 12,
      fontFamily: 'monospace',
      padding: 4,
      forceFull: false,
      cursorOn: true,
      pixelRatio: 2
    });

    // Device edges 8, 22.4 to 22, and 36.8 to 37: the cells meet at 22 (11 CSS).
    const rectsIn = (style: string) =>
      fills.filter(([fill]) => fill === style).map(([, ...rect]) => rect);
    expect(rectsIn('rgb(255, 0, 0)')).toEqual([[4, 4, 7, 16]]);
    expect(rectsIn('rgb(0, 0, 255)')).toEqual([[11, 4, 7.5, 16]]);
    expect(rectsIn('rgb(0, 255, 0)')).toEqual([[11, 4, 7.5, 16]]);
  });

  it('starts the next row on the device row where a vertical line ends', () => {
    const fills: Array<[string, ...number[]]> = [];
    let fillStyle = '';
    const context = {
      canvas: { width: 200, height: 80 },
      beginPath: () => {},
      clip: () => {},
      fillRect: (...args: number[]) => fills.push([fillStyle, ...args]),
      fillText: () => {},
      rect: () => {},
      resetTransform: () => {},
      restore: () => {},
      save: () => {},
      set fillStyle(value: string) {
        fillStyle = value;
      },
      set font(_value: string) {},
      set textBaseline(_value: string) {}
    } as unknown as CanvasRenderingContext2D;
    const snapshot: GhosttySnapshot = {
      cols: 1,
      rows: 2,
      foreground: { r: 255, g: 255, b: 255 },
      background: { r: 0, g: 0, b: 0 },
      cursor: { r: 255, g: 255, b: 255 },
      cursorX: -1,
      cursorY: -1,
      cursorVisible: false,
      cursorBlinking: false,
      cursorStyle: 1,
      dirtyRows: new Set([0, 1]),
      rowData: [0, 1].map(() => ({
        cells: [cell('│')],
        text: '│',
        isWrapContinuation: false,
        wrapsToNext: false
      }))
    };

    renderGhosttySnapshot({
      context,
      snapshot,
      metrics: { width: 8, height: 17, baseline: 12 },
      fontSize: 12,
      fontFamily: 'monospace',
      padding: 4,
      forceFull: false,
      cursorOn: false,
      pixelRatio: 1.5
    });

    // At 1.5x the boundary between the rows is CSS 21, device 31.5; both the
    // line and the second row's background round it to device row 32.
    const deviceRects = fills.map(([style, , top, , height]) => ({
      style,
      top: Math.round(top! * 1.5 * 1e6) / 1e6,
      bottom: Math.round((top! + height!) * 1.5 * 1e6) / 1e6
    }));
    const lines = deviceRects.filter(({ style }) => style === 'rgb(255, 255, 255)');
    const backgrounds = deviceRects.filter(({ style }) => style === 'rgb(0, 0, 0)');
    expect(backgrounds.map(({ top, bottom }) => [top, bottom])).toEqual([
      [6, 32],
      [32, 57]
    ]);
    const firstRowLineBottom = Math.max(
      ...lines.filter(({ top }) => top < 32).map(({ bottom }) => bottom)
    );
    expect(firstRowLineBottom).toBe(32);
    expect(lines.filter(({ top }) => top >= 32).map(({ top }) => top)[0]).toBe(32);
  });

  it('clips a rounded corner to its cell where the curve would reach the neighbour', () => {
    const calls: unknown[][] = [];
    const record =
      (name: string) =>
      (...args: unknown[]) =>
        calls.push([name, ...args]);
    const context = {
      canvas: { width: 200, height: 80 },
      beginPath: () => {},
      bezierCurveTo: record('bezierCurveTo'),
      clip: record('clip'),
      fillRect: () => {},
      fillText: () => {},
      lineTo: record('lineTo'),
      moveTo: record('moveTo'),
      rect: record('rect'),
      resetTransform: () => {},
      restore: record('restore'),
      save: record('save'),
      stroke: record('stroke'),
      set fillStyle(_value: string) {},
      set font(_value: string) {},
      set lineCap(_value: string) {},
      set lineWidth(_value: number) {},
      set strokeStyle(_value: string) {},
      set textBaseline(_value: string) {}
    } as unknown as CanvasRenderingContext2D;
    const snapshot: GhosttySnapshot = {
      cols: 1,
      rows: 1,
      foreground: { r: 255, g: 255, b: 255 },
      background: { r: 0, g: 0, b: 0 },
      cursor: { r: 255, g: 255, b: 255 },
      cursorX: -1,
      cursorY: -1,
      cursorVisible: false,
      cursorBlinking: false,
      cursorStyle: 1,
      dirtyRows: new Set([0]),
      rowData: [{ cells: [cell('╮')], text: '╮', isWrapContinuation: false, wrapsToNext: false }]
    };

    renderGhosttySnapshot({
      context,
      snapshot,
      metrics: { width: 7.5, height: 16, baseline: 11 },
      fontSize: 12,
      fontFamily: 'monospace',
      padding: 4,
      forceFull: false,
      cursorOn: false,
      pixelRatio: 2
    });

    // A 15 by 32 device cell with 2-pixel lines: the curve ends half a device
    // pixel left of the cell, at CSS 3.75, so only the clip keeps it inside.
    expect(calls.find(([name]) => name === 'bezierCurveTo')?.[5]).toBe(3.75);
    expect(calls.map(([name]) => name)).toEqual([
      'save',
      'rect',
      'clip',
      'moveTo',
      'lineTo',
      'bezierCurveTo',
      'lineTo',
      'stroke',
      'restore'
    ]);
    expect(calls[1]).toEqual(['rect', 4, 4, 7.5, 16]);
  });

  it('keeps an invisible cell hidden under a focused block cursor', () => {
    const fills: string[] = [];
    const fillTextCalls: unknown[][] = [];
    let fillStyle = '';
    const context = {
      canvas: { width: 200, height: 40 },
      beginPath: () => {},
      clip: () => {},
      fillRect: () => fills.push(fillStyle),
      fillText: (...args: unknown[]) => fillTextCalls.push(args),
      rect: () => {},
      resetTransform: () => {},
      restore: () => {},
      save: () => {},
      set fillStyle(value: string) {
        fillStyle = value;
      },
      set font(_value: string) {},
      set textBaseline(_value: string) {}
    } as unknown as CanvasRenderingContext2D;
    const hidden = (text: string) => ({ ...cell(text), invisible: true });
    const render = (text: string) => {
      fills.length = 0;
      renderGhosttySnapshot({
        context,
        snapshot: {
          cols: 1,
          rows: 1,
          foreground: { r: 255, g: 255, b: 255 },
          background: { r: 0, g: 0, b: 0 },
          cursor: { r: 0, g: 255, b: 0 },
          cursorX: 0,
          cursorY: 0,
          cursorVisible: true,
          cursorBlinking: false,
          cursorStyle: 1,
          dirtyRows: new Set([0]),
          rowData: [{ cells: [hidden(text)], text, isWrapContinuation: false, wrapsToNext: false }]
        },
        metrics: { width: 8, height: 16, baseline: 11 },
        fontSize: 12,
        fontFamily: 'monospace',
        padding: 4,
        forceFull: false,
        cursorOn: true
      });
    };

    // The row's background, then the cursor, and nothing drawn over it.
    render('▀');
    expect(fills).toEqual(['rgb(0, 0, 0)', 'rgb(0, 255, 0)']);
    render('x');
    expect(fills).toEqual(['rgb(0, 0, 0)', 'rgb(0, 255, 0)']);
    expect(fillTextCalls).toEqual([]);
  });

  it('repaints the cell without an overlay during the blink off phase', () => {
    const fillTextCalls: unknown[][] = [];
    const context = {
      canvas: { width: 200, height: 40 },
      beginPath: () => {},
      clip: () => {},
      fillRect: () => {},
      fillText: (...args: unknown[]) => fillTextCalls.push(args),
      rect: () => {},
      resetTransform: () => {},
      restore: () => {},
      save: () => {},
      set fillStyle(_value: string) {},
      set font(_value: string) {},
      set textBaseline(_value: string) {}
    } as unknown as CanvasRenderingContext2D;
    const snapshot: GhosttySnapshot = {
      cols: 3,
      rows: 1,
      foreground: { r: 255, g: 255, b: 255 },
      background: { r: 0, g: 0, b: 0 },
      cursor: { r: 255, g: 255, b: 255 },
      cursorX: 2,
      cursorY: 0,
      cursorVisible: true,
      cursorBlinking: true,
      cursorStyle: 1,
      dirtyRows: new Set(),
      rowData: [
        {
          cells: [cell('a'), cell('b'), cell('x')],
          text: 'abx',
          isWrapContinuation: false,
          wrapsToNext: false
        }
      ]
    };

    renderGhosttySnapshot({
      context,
      snapshot,
      metrics: { width: 7.2, height: 16, baseline: 11 },
      fontSize: 12,
      fontFamily: 'monospace',
      padding: 4,
      forceFull: false,
      cursorOn: false
    });

    // The cursor row still repaints so the block disappears, but the inverted
    // glyph the on phase draws over the cell is gone.
    expect(fillTextCalls).toEqual([['abx', 4, 15, 21.6]]);
  });

  it('repaints the previous cursor row after the cursor moves', () => {
    const clearedRows: number[] = [];
    const context = {
      canvas: { width: 200, height: 80 },
      beginPath: () => {},
      clip: () => {},
      fillRect: (_left: number, top: number, _width: number, height: number) => {
        if (height === 16) clearedRows.push(top);
      },
      fillText: () => {},
      rect: () => {},
      resetTransform: () => {},
      restore: () => {},
      save: () => {},
      set fillStyle(_value: string) {},
      set font(_value: string) {},
      set textBaseline(_value: string) {}
    } as unknown as CanvasRenderingContext2D;
    const snapshot: GhosttySnapshot = {
      cols: 1,
      rows: 3,
      foreground: { r: 255, g: 255, b: 255 },
      background: { r: 0, g: 0, b: 0 },
      cursor: { r: 255, g: 255, b: 255 },
      cursorX: 0,
      cursorY: 2,
      cursorVisible: true,
      cursorBlinking: false,
      cursorStyle: 1,
      dirtyRows: new Set(),
      rowData: [0, 1, 2].map(() => ({
        cells: [cell('')],
        text: '',
        isWrapContinuation: false,
        wrapsToNext: false
      }))
    };

    renderGhosttySnapshot({
      context,
      snapshot,
      metrics: { width: 7.2, height: 16, baseline: 11 },
      fontSize: 12,
      fontFamily: 'monospace',
      padding: 4,
      forceFull: false,
      cursorOn: true,
      previousCursorY: 0
    });

    expect(clearedRows).toEqual([4, 36, 36]);
  });
});

describe('ghosttyInkInside', () => {
  const ink = { left: 0.5, right: 6, ascent: 9, descent: 3 };
  const box = { left: 0, top: 0, right: 10, bottom: 20 };

  it('takes ink that keeps the margin on every side', () => {
    expect(ghosttyInkInside(ink, 2, 12, box, 1)).toBe(true);
  });

  it('refuses ink that reaches into the margin on any side', () => {
    expect(ghosttyInkInside(ink, 1, 12, box, 1)).toBe(false);
    expect(ghosttyInkInside(ink, 3.5, 12, box, 1)).toBe(false);
    expect(ghosttyInkInside(ink, 2, 9.5, box, 1)).toBe(false);
    expect(ghosttyInkInside(ink, 2, 16.5, box, 1)).toBe(false);
  });
});

describe('GhosttyTextInkCache', () => {
  it('measures each text once per font and forgets everything on clear', () => {
    const measureText = vi.fn(() => ({
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: 5,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2
    }));
    const context = { measureText } as unknown as CanvasRenderingContext2D;
    const cache = new GhosttyTextInkCache();

    expect(cache.measure(context, 'normal 400 12px mono', 'ab')).toEqual({
      left: 0,
      right: 5,
      ascent: 8,
      descent: 2
    });
    cache.measure(context, 'normal 400 12px mono', 'ab');
    cache.measure(context, 'normal 700 12px mono', 'ab');
    expect(measureText).toHaveBeenCalledTimes(2);
    cache.clear();
    cache.measure(context, 'normal 400 12px mono', 'ab');
    expect(measureText).toHaveBeenCalledTimes(3);
  });
});

describe('renderGhosttySnapshot with measured ink', () => {
  const colored = (text: string, r: number): GhosttyCell => ({
    ...cell(text),
    foreground: { r, g: 255, b: 0 }
  });

  /** A context that records clips, the rectangles each clip is built from, and text draws. */
  function recordingContext(inkFor: (text: string) => { ascent: number; descent: number }) {
    const events: string[] = [];
    let path: number[][] = [];
    let fillStyle = '';
    const context = {
      canvas: { width: 400, height: 80 },
      beginPath: () => {
        path = [];
      },
      rect: (...args: number[]) => path.push(args),
      clip: () => events.push(`clip ${JSON.stringify(path)}`),
      fillRect: () => {},
      strokeRect: () => {},
      fillText: (text: string, x: number, y: number, maxWidth: number) =>
        events.push(`text ${fillStyle} ${text} ${x} ${y} ${maxWidth}`),
      measureText: (text: string) => ({
        actualBoundingBoxLeft: -1,
        actualBoundingBoxRight: 6,
        actualBoundingBoxAscent: inkFor(text).ascent,
        actualBoundingBoxDescent: inkFor(text).descent
      }),
      resetTransform: () => {},
      restore: () => events.push('restore'),
      save: () => events.push('save'),
      set fillStyle(value: string) {
        fillStyle = value;
      },
      set font(_value: string) {},
      set strokeStyle(_value: string) {},
      set textBaseline(_value: string) {}
    } as unknown as CanvasRenderingContext2D;
    return { context, events };
  }

  const snapshotOf = (rows: GhosttyCell[][]): GhosttySnapshot => ({
    cols: rows[0]!.length,
    rows: rows.length,
    foreground: { r: 255, g: 255, b: 255 },
    background: { r: 0, g: 0, b: 0 },
    cursor: { r: 255, g: 255, b: 255 },
    cursorX: -1,
    cursorY: -1,
    cursorVisible: false,
    cursorBlinking: false,
    cursorStyle: 1,
    dirtyRows: new Set(rows.map((_, index) => index)),
    rowData: rows.map((cells) => ({
      cells,
      text: cells.map((each) => each.text).join(''),
      isWrapContinuation: false,
      wrapsToNext: false
    }))
  });

  const render = (context: CanvasRenderingContext2D, snapshot: GhosttySnapshot) =>
    renderGhosttySnapshot({
      context,
      snapshot,
      metrics: { width: 10, height: 20, baseline: 15 },
      fontSize: 12,
      fontFamily: 'monospace',
      padding: 4,
      forceFull: false,
      cursorOn: false,
      textInk: new GhosttyTextInkCache()
    });

  it('draws every run of one font and colour under one clip of their cells', () => {
    const { context, events } = recordingContext(() => ({ ascent: 9, descent: 3 }));
    render(
      context,
      snapshotOf([
        [colored('a', 1), colored('b', 2), colored('c', 1)],
        [colored('d', 1), colored('e', 2), colored('f', 2)]
      ])
    );

    expect(events).toEqual([
      'save',
      `clip ${JSON.stringify([
        [4, 4, 10, 20],
        [24, 4, 10, 20],
        [4, 24, 10, 20]
      ])}`,
      'text rgb(1, 255, 0) a 4 19 10',
      'text rgb(1, 255, 0) c 24 19 10',
      'text rgb(1, 255, 0) d 4 39 10',
      'restore',
      'save',
      `clip ${JSON.stringify([
        [14, 4, 10, 20],
        [14, 24, 20, 20]
      ])}`,
      'text rgb(2, 255, 0) b 14 19 10',
      'text rgb(2, 255, 0) ef 14 39 20',
      'restore'
    ]);
  });

  // The cursor sits past the text, so its glyph adds no draw of its own.
  const withCursor = (snapshot: GhosttySnapshot, cursorStyle: number): GhosttySnapshot => ({
    ...snapshot,
    cursorX: 3,
    cursorY: 0,
    cursorVisible: true,
    cursorStyle
  });

  const twoRows = () =>
    snapshotOf([
      [colored('a', 1), colored('b', 2), colored('c', 1), cell('')],
      [colored('d', 1), colored('e', 2), colored('f', 2), cell('')]
    ]);

  const clipCount = (events: string[]) => events.filter((event) => event.startsWith('clip')).length;

  it('keeps the shared clip in a frame that draws a focused block cursor', () => {
    const { context, events } = recordingContext(() => ({ ascent: 9, descent: 3 }));
    renderGhosttySnapshot({
      context,
      snapshot: withCursor(twoRows(), 1),
      metrics: { width: 10, height: 20, baseline: 15 },
      fontSize: 12,
      fontFamily: 'monospace',
      padding: 4,
      forceFull: false,
      cursorOn: true,
      focused: true,
      pixelRatio: 2,
      textInk: new GhosttyTextInkCache()
    });

    expect(clipCount(events)).toBe(2);
  });

  // A shared clip turns the GPU canvas to multisampling for the frame, which
  // shades these cursors' edges inside a device pixel differently.
  it.each([
    ['an unfocused cursor', { cursorStyle: 1, focused: false }],
    ['a bar cursor', { cursorStyle: 0, focused: true }],
    ['an underline cursor', { cursorStyle: 2, focused: true }],
    ['an outline cursor', { cursorStyle: 3, focused: true }]
  ])('clips every run on its own in a frame with %s', (_name, { cursorStyle, focused }) => {
    const { context, events } = recordingContext(() => ({ ascent: 9, descent: 3 }));
    renderGhosttySnapshot({
      context,
      snapshot: withCursor(twoRows(), cursorStyle),
      metrics: { width: 10, height: 20, baseline: 15 },
      fontSize: 12,
      fontFamily: 'monospace',
      padding: 4,
      forceFull: false,
      cursorOn: true,
      focused,
      textInk: new GhosttyTextInkCache()
    });

    expect(clipCount(events)).toBe(5);
  });

  it('draws text near its own background at the minimum contrast, and the background as asked', () => {
    const { context, events } = recordingContext(() => ({ ascent: 9, descent: 3 }));
    const near: GhosttyCell = { ...cell('n'), foreground: { r: 10, g: 10, b: 10 } };
    const onWhite: GhosttyCell = {
      ...cell('w'),
      foreground: { r: 250, g: 250, b: 250 },
      background: { r: 255, g: 255, b: 255 }
    };
    render(context, snapshotOf([[near, onWhite, colored('k', 1)]]));
    const texts = events.filter((event) => event.startsWith('text '));

    // Near-black on the black ground lifts toward the terminal's text colour;
    // near-white on a white cell darkens, since that text colour fails there.
    expect(texts).toEqual([
      'text rgb(117, 117, 117) n 4 19 10',
      'text rgb(118, 118, 118) w 14 19 10',
      'text rgb(1, 255, 0) k 24 19 10'
    ]);
  });

  it('gives a run whose ink leaves its row a clip of its own', () => {
    const { context, events } = recordingContext((text) =>
      text === 'g' ? { ascent: 9, descent: 6 } : { ascent: 9, descent: 3 }
    );
    render(context, snapshotOf([[colored('g', 1), colored('h', 2), colored('i', 1)]]));

    expect(events).toEqual([
      'save',
      `clip ${JSON.stringify([[4, 4, 10, 20]])}`,
      'text rgb(1, 255, 0) g 4 19 10',
      'restore',
      'save',
      `clip ${JSON.stringify([[14, 4, 10, 20]])}`,
      'text rgb(2, 255, 0) h 14 19 10',
      'restore',
      'save',
      `clip ${JSON.stringify([[24, 4, 10, 20]])}`,
      'text rgb(1, 255, 0) i 24 19 10',
      'restore'
    ]);
  });
});
