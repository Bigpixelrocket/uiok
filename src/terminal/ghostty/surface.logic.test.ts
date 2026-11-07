import { describe, expect, it, vi } from 'vitest';

import type { GhosttyCell, GhosttyRow } from './core.js';
import {
  advanceTerminalSelectionClickSequence,
  applyTerminalCopyEvent,
  areFontAdvancesMonospace,
  clearPrimedTerminalCopyInput,
  DEFAULT_TERMINAL_FONT_FAMILY,
  ghosttyMouseButton,
  isTerminalAltGraphText,
  isTerminalCompositionCommitInput,
  isTerminalCompositionKey,
  isTerminalCopyShortcut,
  isTerminalPasteShortcut,
  isTerminalSecondaryPress,
  primeTerminalCopyInput,
  resolveTerminalMouseData,
  resolveTerminalMouseTrackingState,
  shouldBlinkTerminalCursor,
  shouldReportTerminalMouse,
  terminalCanvasBackingChange,
  terminalFontSize,
  terminalLineHeight,
  terminalFontStack,
  terminalGridCellAt,
  terminalLinkAtPositionWithRange,
  terminalScrollbarGeometry,
  terminalScrollbarOffsetAtPointer,
  terminalWheelArrowData,
  terminalWheelDeltaRows
} from './surface.logic.js';

const cell = (text: string): GhosttyCell => ({
  text,
  wide: 0,
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

describe('isTerminalAltGraphText', () => {
  it('defers printable AltGr output to the textarea input event', () => {
    expect(
      isTerminalAltGraphText({
        key: '@',
        getModifierState: (modifier) => modifier === 'AltGraph'
      })
    ).toBe(true);
    expect(
      isTerminalAltGraphText({
        key: 'ArrowRight',
        getModifierState: (modifier) => modifier === 'AltGraph'
      })
    ).toBe(false);
  });
});

describe('terminalGridCellAt', () => {
  const options = {
    bounds: { left: 100, top: 200 },
    cols: 3,
    rows: 2,
    metrics: { width: 10, height: 20 },
    padding: 4
  };

  it('maps points inside the rendered grid without clamping its padding', () => {
    expect(terminalGridCellAt({ ...options, clientX: 104, clientY: 204 })).toEqual({
      x: 0,
      y: 0
    });
    expect(terminalGridCellAt({ ...options, clientX: 133, clientY: 243 })).toEqual({
      x: 2,
      y: 1
    });
    expect(terminalGridCellAt({ ...options, clientX: 103, clientY: 204 })).toBeNull();
    expect(terminalGridCellAt({ ...options, clientX: 104, clientY: 203 })).toBeNull();
    expect(terminalGridCellAt({ ...options, clientX: 134, clientY: 204 })).toBeNull();
    expect(terminalGridCellAt({ ...options, clientX: 104, clientY: 244 })).toBeNull();
  });
});

describe('shouldBlinkTerminalCursor', () => {
  const blinking = {
    focused: true,
    cursorBlinking: true,
    cursorVisible: true,
    reducedMotion: false
  };

  it('blinks a focused visible cursor the terminal asked to blink', () => {
    expect(shouldBlinkTerminalCursor(blinking)).toBe(true);
  });

  it('holds the cursor steady when blinking would be unwanted', () => {
    // Unfocused surfaces draw a steady hollow cursor, DECSCUSR steady styles and
    // DEC mode 12 turn blinking off, a hidden cursor has nothing to toggle, and
    // reduced-motion readers get no permanently animating element.
    expect(shouldBlinkTerminalCursor({ ...blinking, focused: false })).toBe(false);
    expect(shouldBlinkTerminalCursor({ ...blinking, cursorBlinking: false })).toBe(false);
    expect(shouldBlinkTerminalCursor({ ...blinking, cursorVisible: false })).toBe(false);
    expect(shouldBlinkTerminalCursor({ ...blinking, reducedMotion: true })).toBe(false);
  });
});

describe('terminalLinkAtPositionWithRange', () => {
  it('maps terminal cells to UTF-16 offsets after a wide emoji', () => {
    const cells = [
      cell('🙂'),
      cell(''),
      ...Array.from('https://t3.codes', (character) => cell(character))
    ];
    const row: GhosttyRow = {
      cells,
      text: cells
        .map((value) => value.text || ' ')
        .join('')
        .trimEnd(),
      isWrapContinuation: false,
      wrapsToNext: false
    };

    expect(terminalLinkAtPositionWithRange([row], 0, 2)?.text).toBe('https://t3.codes');
    expect(terminalLinkAtPositionWithRange([row], 0, cells.length - 1)?.text).toBe(
      'https://t3.codes'
    );
    expect(terminalLinkAtPositionWithRange([row], 0, 0)).toBeNull();
    expect(terminalLinkAtPositionWithRange([row], 0, 8)?.range).toEqual({
      start: { x: 2, y: 0 },
      end: { x: cells.length - 1, y: 0 }
    });
  });

  it('reconstructs soft-wrapped links and leaves file paths inert', () => {
    const row = (text: string, isWrapContinuation: boolean, wrapsToNext = false): GhosttyRow => ({
      cells: Array.from(text.padEnd(16), (character) => cell(character)),
      text: text.trimEnd(),
      isWrapContinuation,
      wrapsToNext
    });
    const rows = [
      row('https://example.', false),
      row('com/reference', true),
      row('~/project/file', false)
    ];

    expect(terminalLinkAtPositionWithRange(rows, 0, 8)?.text).toBe('https://example.com/reference');
    expect(terminalLinkAtPositionWithRange(rows, 1, 4)?.text).toBe('https://example.com/reference');
    expect(terminalLinkAtPositionWithRange(rows, 2, 2)).toBeNull();
    expect(terminalLinkAtPositionWithRange(rows, 1, 4)).toEqual({
      text: 'https://example.com/reference',
      range: {
        start: { x: 0, y: 0 },
        end: { x: 12, y: 1 }
      }
    });
  });

  it('refuses links truncated at the viewport edges instead of mis-resolving', () => {
    const row = (text: string, isWrapContinuation: boolean, wrapsToNext = false): GhosttyRow => ({
      cells: Array.from(text.padEnd(16), (character) => cell(character)),
      text: text.trimEnd(),
      isWrapContinuation,
      wrapsToNext
    });
    // The head of the wrapped line scrolled above the viewport.
    const headCut = [row('ple.com/missing', true), row('head', true)];
    expect(terminalLinkAtPositionWithRange(headCut, 0, 4)).toBeNull();
    // The bottom row soft-wraps on below the viewport.
    const tailCut = [row('https://t3.codes', false, true)];
    expect(terminalLinkAtPositionWithRange(tailCut, 0, 8)).toBeNull();
    // A partial bottom row is provably complete and still resolves.
    const complete = [row('https://t3.codes', false), row('', false)];
    expect(terminalLinkAtPositionWithRange(complete, 0, 8)?.text).toBe('https://t3.codes');
    // A wide grapheme earlier in the row must not break truncation detection:
    // the soft-wrap flag decides, not string-length-versus-cell-count.
    const wideFull: GhosttyRow = {
      cells: [
        { ...cell('🙂'), wide: 1 },
        { ...cell(''), wide: 2 },
        ...Array.from('https://t3.code', (character) => cell(character))
      ],
      text: '🙂 https://t3.code',
      isWrapContinuation: false,
      wrapsToNext: true
    };
    expect(terminalLinkAtPositionWithRange([wideFull], 0, 8)).toBeNull();
    // Unwritten trailing cells prove the bottom row is complete.
    const unwrittenTail: GhosttyRow = {
      cells: [
        ...Array.from('https://t3.codes', (character) => cell(character)),
        cell(''),
        cell('')
      ],
      text: 'https://t3.codes',
      isWrapContinuation: false,
      wrapsToNext: false
    };
    expect(terminalLinkAtPositionWithRange([unwrittenTail], 0, 8)?.text).toBe('https://t3.codes');
  });
});

describe('isTerminalCopyShortcut', () => {
  const event = (overrides: Partial<Parameters<typeof isTerminalCopyShortcut>[0]> = {}) => ({
    altKey: false,
    ctrlKey: false,
    key: 'c',
    metaKey: false,
    ...overrides
  });

  it('copies with Command-C and keeps Control-C for the interrupt', () => {
    expect(isTerminalCopyShortcut(event({ metaKey: true }))).toBe(true);
    expect(isTerminalCopyShortcut(event({ ctrlKey: true }))).toBe(false);
    expect(isTerminalCopyShortcut(event({ metaKey: true, altKey: true }))).toBe(false);
  });

  it('uses the produced character instead of the physical key position', () => {
    expect(isTerminalCopyShortcut(event({ key: 'C', metaKey: true }))).toBe(true);
    expect(isTerminalCopyShortcut(event({ key: 'j', metaKey: true }))).toBe(false);
  });
});

describe('applyTerminalCopyEvent', () => {
  it('writes the selection and claims the event when clipboardData is present', () => {
    const setData = vi.fn();
    expect(applyTerminalCopyEvent('ls -la', { setData })).toEqual({ preventDefault: true });
    expect(setData).toHaveBeenCalledWith('text/plain', 'ls -la');
  });

  it('leaves the native copy of the primed field alive when clipboardData is missing', () => {
    // A copy event without clipboardData must keep its default, which copies
    // the primed field; claiming it would copy nothing.
    expect(applyTerminalCopyEvent('ls -la', null)).toEqual({ preventDefault: false });
    expect(applyTerminalCopyEvent('', { setData: vi.fn() })).toEqual({ preventDefault: false });
  });
});

describe('primeTerminalCopyInput', () => {
  it('selects the Ghostty selection in the hidden textarea so native copy has text', () => {
    const input = {
      value: '',
      selectionStart: 0,
      selectionEnd: 0,
      select() {
        this.selectionStart = 0;
        this.selectionEnd = this.value.length;
      }
    };
    primeTerminalCopyInput(input, 'git status');
    expect(input.value).toBe('git status');
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(10);
    clearPrimedTerminalCopyInput(input, 'git status');
    expect(input.value).toBe('');
  });

  it('does not wipe an IME candidate that replaced the primed copy', () => {
    const input = { value: '', select() {} };
    primeTerminalCopyInput(input, 'git status');
    input.value = 'あ';
    clearPrimedTerminalCopyInput(input, 'git status');
    expect(input.value).toBe('あ');
  });
});

describe('isTerminalPasteShortcut', () => {
  const event = (overrides: Partial<Parameters<typeof isTerminalPasteShortcut>[0]> = {}) => ({
    altKey: false,
    ctrlKey: false,
    key: 'v',
    metaKey: false,
    ...overrides
  });

  it('pastes with Command-V and keeps Control-V for the shell', () => {
    expect(isTerminalPasteShortcut(event({ metaKey: true }))).toBe(true);
    expect(isTerminalPasteShortcut(event({ ctrlKey: true }))).toBe(false);
    expect(isTerminalPasteShortcut(event({ metaKey: true, altKey: true }))).toBe(false);
  });
});

describe('isTerminalCompositionCommitInput', () => {
  it('identifies browser composition follow-up input', () => {
    expect(isTerminalCompositionCommitInput({ inputType: '' })).toBe(true);
    expect(isTerminalCompositionCommitInput({ inputType: 'insertCompositionText' })).toBe(true);
    expect(isTerminalCompositionCommitInput({ inputType: 'insertFromComposition' })).toBe(true);
  });

  it('keeps a fast repeated input as legitimate text', () => {
    expect(isTerminalCompositionCommitInput({ inputType: 'insertText' })).toBe(false);
  });
});

describe('isTerminalCompositionKey', () => {
  const event = (
    overrides: Partial<Pick<KeyboardEvent, 'isComposing' | 'key' | 'keyCode'>> = {}
  ) => ({
    isComposing: false,
    key: 'a',
    keyCode: 65,
    ...overrides
  });

  it('treats in-progress IME keydowns as composition so the copy primer cannot wipe them', () => {
    expect(isTerminalCompositionKey(event({ isComposing: true }), false)).toBe(true);
    expect(isTerminalCompositionKey(event(), true)).toBe(true);
    expect(isTerminalCompositionKey(event({ key: 'Process' }), false)).toBe(true);
    expect(isTerminalCompositionKey(event({ keyCode: 229 }), false)).toBe(true);
  });

  it('lets ordinary keydowns clear a primed copy', () => {
    expect(isTerminalCompositionKey(event(), false)).toBe(false);
  });
});

describe('application mouse reporting', () => {
  const event = (overrides: Partial<Parameters<typeof shouldReportTerminalMouse>[1]> = {}) => ({
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...overrides
  });

  it('keeps Shift and link activation modifiers available to the browser', () => {
    expect(shouldReportTerminalMouse(true, event())).toBe(true);
    expect(shouldReportTerminalMouse(true, event({ shiftKey: true }))).toBe(false);
    expect(shouldReportTerminalMouse(true, event({ ctrlKey: true }))).toBe(false);
    expect(shouldReportTerminalMouse(true, event({ metaKey: true }))).toBe(false);
    expect(shouldReportTerminalMouse(false, event())).toBe(false);
  });

  it('takes the right button and a Control-click as the secondary click', () => {
    expect(isTerminalSecondaryPress({ button: 2, ctrlKey: false })).toBe(true);
    expect(isTerminalSecondaryPress({ button: 2, ctrlKey: true })).toBe(true);
    expect(isTerminalSecondaryPress({ button: 0, ctrlKey: true })).toBe(true);
    expect(isTerminalSecondaryPress({ button: 0, ctrlKey: false })).toBe(false);
    expect(isTerminalSecondaryPress({ button: 1, ctrlKey: true })).toBe(false);
  });

  it("maps browser buttons to Ghostty's button enum", () => {
    expect([0, 1, 2, 3, 4, 5].map(ghosttyMouseButton)).toEqual([1, 3, 2, 4, 5, null]);
  });

  it('drops repeated motion reports until another mouse action resets the cell', () => {
    const first = resolveTerminalMouseData('motion', '\u001b[<35;8;4M', '');
    expect(first).toEqual({ send: true, nextMotionData: '\u001b[<35;8;4M' });

    const duplicate = resolveTerminalMouseData('motion', '\u001b[<35;8;4M', first.nextMotionData);
    expect(duplicate).toEqual({ send: false, nextMotionData: '\u001b[<35;8;4M' });

    const press = resolveTerminalMouseData('press', '\u001b[<0;8;4M', duplicate.nextMotionData);
    expect(press).toEqual({ send: true, nextMotionData: '' });

    expect(resolveTerminalMouseData('motion', '\u001b[<35;8;4M', press.nextMotionData)).toEqual({
      send: true,
      nextMotionData: '\u001b[<35;8;4M'
    });
  });

  it('clears the motion baseline when application mouse tracking changes', () => {
    expect(resolveTerminalMouseTrackingState(true, false, '\u001b[<35;8;4M')).toEqual({
      tracking: false,
      motionData: ''
    });
    expect(resolveTerminalMouseTrackingState(false, true, '\u001b[<35;8;4M')).toEqual({
      tracking: true,
      motionData: ''
    });
    expect(resolveTerminalMouseTrackingState(true, true, '\u001b[<35;8;4M')).toEqual({
      tracking: true,
      motionData: '\u001b[<35;8;4M'
    });
    expect(resolveTerminalMouseTrackingState(false, false, '\u001b[<35;8;4M')).toEqual({
      tracking: false,
      motionData: '\u001b[<35;8;4M'
    });
  });
});

describe('terminalWheelDeltaRows', () => {
  it('converts line-mode deltas into whole rows', () => {
    const result = terminalWheelDeltaRows({ deltaY: 3, deltaMode: 1 }, 16, 24, 0);
    expect(result.rows).toBe(3);
    expect(result.remainder).toBe(0);
  });

  it('accumulates fractional pixel deltas across events', () => {
    let remainder = 0;
    let scrolled = 0;
    for (let index = 0; index < 4; index += 1) {
      const result = terminalWheelDeltaRows({ deltaY: 5, deltaMode: 0 }, 16, 24, remainder);
      remainder = result.remainder;
      scrolled += result.rows;
    }
    expect(scrolled).toBe(1);
    expect(remainder).toBeCloseTo(4 / 16);
  });

  it('keeps direction for negative page-mode deltas', () => {
    const result = terminalWheelDeltaRows({ deltaY: -1, deltaMode: 2 }, 16, 24, 0);
    expect(result.rows).toBe(-24);
    expect(result.remainder).toBe(0);
  });
});

describe('terminalWheelArrowData', () => {
  it('emits one arrow per row honoring application cursor keys', () => {
    expect(terminalWheelArrowData(-2, false)).toBe('\u001b[A\u001b[A');
    expect(terminalWheelArrowData(3, false)).toBe('\u001b[B\u001b[B\u001b[B');
    expect(terminalWheelArrowData(-1, true)).toBe('\u001bOA');
    expect(terminalWheelArrowData(0, true)).toBe('');
  });
});

describe('advanceTerminalSelectionClickSequence', () => {
  it('recognizes stationary double and triple pointer presses without PointerEvent.detail', () => {
    const first = advanceTerminalSelectionClickSequence(null, {
      clientX: 20,
      clientY: 30,
      timeStamp: 1_000
    });
    const second = advanceTerminalSelectionClickSequence(first, {
      clientX: 22,
      clientY: 29,
      timeStamp: 1_200
    });
    const third = advanceTerminalSelectionClickSequence(second, {
      clientX: 21,
      clientY: 31,
      timeStamp: 1_400
    });

    expect([first.count, second.count, third.count]).toEqual([1, 2, 3]);
  });

  it('starts over after movement, delay, or a completed triple click', () => {
    const previous = { count: 3, time: 1_000, x: 20, y: 30 };
    expect(
      advanceTerminalSelectionClickSequence(previous, {
        clientX: 20,
        clientY: 30,
        timeStamp: 1_100
      }).count
    ).toBe(1);
    expect(
      advanceTerminalSelectionClickSequence(previous, {
        clientX: 30,
        clientY: 30,
        timeStamp: 1_100
      }).count
    ).toBe(1);
    expect(
      advanceTerminalSelectionClickSequence(previous, {
        clientX: 20,
        clientY: 30,
        timeStamp: 1_501
      }).count
    ).toBe(1);
  });
});

describe('terminalCanvasBackingChange', () => {
  it('sizes a fresh canvas even when its default size already matches', () => {
    expect(terminalCanvasBackingChange(null, 300, 150, 1)).toEqual({
      width: 300,
      height: 150,
      ratio: 1
    });
  });

  it('rounds to whole device pixels and keeps a matching backing store', () => {
    const installed = terminalCanvasBackingChange(null, 100.4, 50.6, 2);
    expect(installed).toEqual({ width: 201, height: 101, ratio: 2 });
    expect(terminalCanvasBackingChange(installed, 100.4, 50.6, 2)).toBeNull();
  });

  it('installs a new transform when only the ratio changes', () => {
    const installed = { width: 300, height: 150, ratio: 1 };
    expect(terminalCanvasBackingChange(installed, 300, 150, 1.0001)).toEqual({
      width: 300,
      height: 150,
      ratio: 1.0001
    });
  });

  it('never asks for an empty backing store', () => {
    expect(terminalCanvasBackingChange(null, 0.2, 0.2, 1)).toEqual({
      width: 1,
      height: 1,
      ratio: 1
    });
  });
});

describe('terminal scrollbar', () => {
  it("maps Ghostty's viewport state to a proportional thumb", () => {
    expect(terminalScrollbarGeometry({ total: 100, offset: 40, len: 20 }, 200)).toEqual({
      thumbHeight: 40,
      thumbTop: 80,
      maxOffset: 80
    });
    expect(terminalScrollbarGeometry({ total: 100, offset: 0, len: 100 }, 200)).toBeNull();
  });

  it('keeps the thumb usable for large scrollback and maps dragging back to rows', () => {
    const state = { total: 10_000, offset: 0, len: 20 };
    expect(terminalScrollbarGeometry(state, 200)).toEqual({
      thumbHeight: 18,
      thumbTop: 0,
      maxOffset: 9_980
    });
    expect(terminalScrollbarOffsetAtPointer(state, 200, 191, 9)).toBe(9_980);
  });
});

describe('terminal font stacks', () => {
  it('keeps the glyph fallbacks behind a requested face', () => {
    expect(terminalFontStack()).toBe(DEFAULT_TERMINAL_FONT_FAMILY);
    expect(terminalFontStack('  ')).toBe(DEFAULT_TERMINAL_FONT_FAMILY);
    const custom = terminalFontStack('"Fira Code"');
    expect(custom.startsWith('"Fira Code", ')).toBe(true);
    expect(custom).toContain('"Symbols Nerd Font Mono"');
    expect(custom.endsWith('monospace')).toBe(true);
  });

  it('quotes families the canvas font shorthand would otherwise reject', () => {
    expect(terminalFontStack('3270 Nerd Font').startsWith('"3270 Nerd Font", ')).toBe(true);
    expect(terminalFontStack('M+ 1m').startsWith('"M+ 1m", ')).toBe(true);
    expect(terminalFontStack('Cascadia Code, Menlo').startsWith('"Cascadia Code", Menlo, ')).toBe(
      true
    );
    expect(terminalFontStack(' , ')).toBe(DEFAULT_TERMINAL_FONT_FAMILY);
  });

  it('clamps requested font sizes to the supported range', () => {
    expect(terminalFontSize()).toBe(12);
    expect(terminalFontSize(Number.NaN)).toBe(12);
    expect(terminalFontSize(13.4)).toBe(13);
    expect(terminalFontSize(2)).toBe(6);
    expect(terminalFontSize(90)).toBe(32);
  });

  it('keeps a requested line pitch in whole pixels, or derives one from the size', () => {
    expect(terminalLineHeight(13, 19)).toBe(19);
    expect(terminalLineHeight(13, 18.6)).toBe(19);
    expect(terminalLineHeight(12)).toBe(16);
    expect(terminalLineHeight(12, Number.NaN)).toBe(16);
    expect(terminalLineHeight(13, 0)).toBe(1);
  });

  it('accepts only faces whose measured advances agree', () => {
    expect(areFontAdvancesMonospace([10, 10, 10, 10])).toBe(true);
    expect(areFontAdvancesMonospace([10, 10, 7, 10])).toBe(false);
    expect(areFontAdvancesMonospace([10, 10.02])).toBe(false);
    expect(areFontAdvancesMonospace([])).toBe(true);
    expect(areFontAdvancesMonospace([Number.NaN, Number.NaN])).toBe(true);
  });
});
