import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  ViewerByteRange,
  ViewerFileInfo,
  ViewerLineNumber,
  ViewerReader,
  ViewerResult
} from './types.js';

import { HIGHLIGHT_MAX_FILE_BYTES } from './SyntaxLanguage.logic.js';
import type { LineTokenizer } from './SyntaxSession.logic.js';
import {
  openSyntaxWorker,
  serveSyntax,
  type SyntaxPort,
  type SyntaxScope,
  type SyntaxWorkerFactory
} from './SyntaxService.js';
import TextView from './TextView.js';

const SELECTION_TOO_LARGE =
  'The selection is too large to copy. Select up to 1 MB of text at a time.';

// jsdom has no workers, so a highlighted file runs the worker's service in
// the page, on a tokenizer that marks the word "const".
vi.mock('./SyntaxService.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./SyntaxService.js')>();
  const { createContext } = await import('react');
  const openSyntaxWorker = vi.fn<SyntaxWorkerFactory>();

  return {
    ...actual,
    openSyntaxWorker,
    SyntaxWorkerContext: createContext<SyntaxWorkerFactory | null>(() => openSyntaxWorker())
  };
});

const keywordTokenizer: LineTokenizer<null> = {
  initial: null,
  styles: [
    { color: null, italic: false, bold: false, strikethrough: false },
    { color: 'var(--syntax-mauve)', italic: false, bold: false, strikethrough: false }
  ],
  tokenizeLine: (text, state) => ({
    tokens: [...text.matchAll(/const/gu)].map((match) => ({
      start: match.index,
      end: match.index + 5,
      style: 1
    })),
    state
  })
};

/** A worker whose service runs in the page, answering a turn later as a worker would. */
function workerInPage(): SyntaxPort {
  const port: SyntaxPort = {
    postMessage: (message) =>
      void Promise.resolve().then(() =>
        scope.onmessage?.({ data: message } as MessageEvent<typeof message>)
      ),
    onmessage: null,
    onerror: null,
    terminate: () => undefined
  };
  const scope: SyntaxScope = {
    postMessage: (message) =>
      void Promise.resolve().then(() =>
        port.onmessage?.({ data: message } as MessageEvent<typeof message>)
      ),
    onmessage: null
  };
  serveSyntax(scope, () => Promise.resolve(keywordTokenizer));
  return port;
}

const ok = <A,>(value: A): Promise<ViewerResult<A>> => Promise.resolve({ ok: true, value });

const infoFor = (sizeBytes: number, generation = 0, name = 'app.log'): ViewerFileInfo => ({
  generation,
  name,
  sizeBytes,
  modifiedMs: 0,
  content: { kind: 'text', mimeType: 'text/plain' },
  change: 'none',
  mediaUrl: 'viewer-media://file/0000000000000000000000000000000000000000000000000000000000000000'
});

/** A file the reader reads in ranges: bytes in memory, or computed for a huge one. */
type Source = (offset: number, length: number) => Uint8Array;

const memory =
  (bytes: Uint8Array): Source =>
  (offset, length) =>
    bytes.slice(offset, offset + length);

/** A 1.2 GB log of 16-byte lines, each its own index in 15 digits, never held in memory. */
const HUGE_SIZE = 1_200_000_000;
const hugeLog: Source = (offset, length) => {
  const end = Math.min(HUGE_SIZE, offset + length);
  const bytes = new Uint8Array(Math.max(0, end - offset));
  for (let index = 0; index < bytes.length; index += 1) {
    const position = offset + index;
    const column = position % 16;
    const digit = Math.floor(Math.floor(position / 16) / 10 ** (14 - column)) % 10;
    bytes[index] = column === 15 ? 0x0a : 0x30 + digit;
  }
  return bytes;
};
const FIRST_LINE = '000000000000000';

/** A log of 1,000-byte lines, so a few dozen pages cover more than one read. */
const WIDE_SIZE = 5_000_000;
const wideLog: Source = (offset, length) => {
  const end = Math.min(WIDE_SIZE, offset + length);
  const bytes = new Uint8Array(Math.max(0, end - offset));
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = (offset + index) % 1000 === 999 ? 0x0a : 0x78;
  }
  return bytes;
};

/** A ResizeObserver that measures every observed box at `height` pixels. */
const measuredAt = (height: number) =>
  class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(): void {
      this.callback(
        [{ contentRect: { height } } as ResizeObserverEntry],
        this as unknown as ResizeObserver
      );
    }
    unobserve(): void {}
    disconnect(): void {}
  };

function bridgeOver(
  source: Source,
  size: number,
  options: {
    generation?: number;
    lineNumber?: ViewerReader['lineNumber'];
  } = {}
) {
  return {
    inspect: vi.fn<ViewerReader['inspect']>(() => ok(infoFor(size))),
    readRange: vi.fn<ViewerReader['readRange']>(({ offset, length }) =>
      ok<ViewerByteRange>({
        generation: options.generation ?? 0,
        offset,
        bytes: source(offset, length),
        endOfFile: offset + length >= size
      })
    ),
    reload: vi.fn<ViewerReader['reload']>(() => ok(infoFor(size))),
    lineNumber: vi.fn<ViewerReader['lineNumber']>(
      options.lineNumber ??
        // The index has not reached anything yet.
        ((request) => ok<ViewerLineNumber>({ generation: 0, offset: request.offset, line: null }))
    )
  };
}

/**
 * The budget of a case that moves 100,000 rows up a huge file, and of its wait
 * for the move to land: the view decodes and lays out several full reads, which
 * takes seconds when other processes share the machine.
 */
const LONG_MOVE_TIMEOUT_MS = 30_000;

const textBox = (): HTMLElement => screen.getByRole('textbox');
const gutters = (): string[] =>
  [...document.querySelectorAll('.text-gutter')].map((gutter) => gutter.textContent ?? '');

/** Dispatches the copy the Edit menu's Copy item sends the page; returns what it put on the clipboard. */
function copy(): ReturnType<typeof vi.fn> {
  const setData = vi.fn();
  const event = new Event('copy', { cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: { setData } });
  act(() => {
    window.dispatchEvent(event);
  });
  return setData;
}

/** The window's mousemove and mouseup listeners added from now on and not yet removed. */
function liveDragListeners(): () => { mousemove: number; mouseup: number } {
  const add = vi.spyOn(window, 'addEventListener');
  const remove = vi.spyOn(window, 'removeEventListener');
  return () => {
    const live = (type: string): number => {
      const removed = new Set(remove.mock.calls.filter(([t]) => t === type).map(([, l]) => l));
      return add.mock.calls.filter(([t, l]) => t === type && !removed.has(l)).length;
    };
    return { mousemove: live('mousemove'), mouseup: live('mouseup') };
  };
}

describe('TextView', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows byte offsets until the line index answers, then line numbers', async () => {
    const bytes = new TextEncoder().encode('alpha\nbeta\ngamma\n');
    let answer!: (result: ViewerResult<ViewerLineNumber>) => void;
    const reader = bridgeOver(memory(bytes), bytes.length, {
      lineNumber: () => new Promise((resolve) => (answer = resolve))
    });
    render(<TextView reader={reader} info={infoFor(bytes.length)} />);

    expect(await screen.findByText('gamma')).toBeTruthy();
    expect(gutters()).toEqual(['0', '6', '11']);
    expect(screen.getByText(/Counting lines/)).toBeTruthy();
    expect(reader.lineNumber).toHaveBeenCalledWith({ offset: 0, encoding: 'utf-8' });

    await act(async () => answer({ ok: true, value: { generation: 0, offset: 0, line: 1 } }));

    expect(gutters()).toEqual(['1', '2', '3']);
    expect(screen.getByText('Line 1')).toBeTruthy();
    expect(screen.getByText('UTF-8')).toBeTruthy();
  });

  it('decodes UTF-16 with its byte order mark and names the encoding', async () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0x68, 0x00, 0xe9, 0x00, 0x0a, 0x00, 0x21, 0x00]);
    render(
      <TextView reader={bridgeOver(memory(bytes), bytes.length)} info={infoFor(bytes.length)} />
    );

    expect(await screen.findByText('hé')).toBeTruthy();
    expect(screen.getByText('!')).toBeTruthy();
    expect(screen.getByText('UTF-16 LE')).toBeTruthy();
  });

  it('reads a file that ends on a Latin-1 accent as Latin-1', async () => {
    const bytes = new Uint8Array([0x63, 0x61, 0x66, 0xe9]);
    render(
      <TextView reader={bridgeOver(memory(bytes), bytes.length)} info={infoFor(bytes.length)} />
    );

    expect(await screen.findByText('café')).toBeTruthy();
    expect(screen.getByText('Latin-1')).toBeTruthy();
  });

  it('draws nothing from a read of the file a reload replaced', async () => {
    const bytes = new TextEncoder().encode('from the old file\n');
    const reader = bridgeOver(memory(bytes), bytes.length, { generation: 1 });
    render(<TextView reader={reader} info={infoFor(bytes.length, 0)} />);

    await waitFor(() => expect(reader.readRange).toHaveBeenCalled());
    await act(async () => {});

    expect(screen.queryByText('from the old file')).toBeNull();
    expect(reader.readRange).toHaveBeenCalledTimes(1);
  });

  it('opens a 1.2 GB log with one bounded read and jumps to its end with one more', async () => {
    const reader = bridgeOver(hugeLog, HUGE_SIZE);
    render(<TextView reader={reader} info={infoFor(HUGE_SIZE)} />);

    expect(await screen.findByText(FIRST_LINE)).toBeTruthy();
    expect(reader.readRange).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(textBox(), { key: 'End' });

    await waitFor(() =>
      expect(gutters().at(-1)).toBe(String((HUGE_SIZE - 16).toLocaleString('en-US')))
    );
    expect(reader.readRange).toHaveBeenCalledTimes(2);
    const [{ offset, length } = { offset: 0, length: 0 }] = reader.readRange.mock.calls[1] ?? [];
    expect(offset + length).toBeGreaterThanOrEqual(HUGE_SIZE - 1);
    expect(length).toBeLessThanOrEqual(1024 * 1024);
  });

  it('scrolls rows it holds without reading, and a fling reads only for the newest place', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const reader = bridgeOver(hugeLog, HUGE_SIZE);
    render(<TextView reader={reader} info={infoFor(HUGE_SIZE)} />);
    await screen.findByText(FIRST_LINE);

    fireEvent.keyDown(textBox(), { key: 'ArrowDown' });
    expect(gutters()[0]).toBe('16');
    expect(reader.readRange).toHaveBeenCalledTimes(1);

    // Hold the next read, then fling.
    const read = reader.readRange.getMockImplementation();
    reader.readRange.mockImplementation(async (request) => {
      await gate;
      return read!(request);
    });
    fireEvent.keyDown(textBox(), { key: 'End' });
    for (let step = 0; step < 200; step += 1) fireEvent.keyDown(textBox(), { key: 'PageUp' });

    expect(reader.readRange).toHaveBeenCalledTimes(2);
    await act(async () => release());

    // Every page pressed while the read was held still counts: End shows
    // the last 40 rows, and each Page Up moves 39 rows.
    await waitFor(() =>
      expect(gutters()[0]).toBe((HUGE_SIZE - 16 * (40 + 200 * 39)).toLocaleString('en-US'))
    );
    expect(reader.readRange).toHaveBeenCalledTimes(2);
  });

  it('shows the last row whole at the end of the file, whatever the window height', async () => {
    // 616 pixels hold 34 whole rows and part of a 35th.
    vi.stubGlobal('ResizeObserver', measuredAt(616));
    render(<TextView reader={bridgeOver(hugeLog, HUGE_SIZE)} info={infoFor(HUGE_SIZE)} />);
    await screen.findByText(FIRST_LINE);

    fireEvent.keyDown(textBox(), { key: 'End' });

    await waitFor(() => expect(gutters().at(-1)).toBe((HUGE_SIZE - 16).toLocaleString('en-US')));
    expect(gutters()).toHaveLength(34);
  });

  it('asks for the line again when it comes back to a row it asked about before', async () => {
    const reader = bridgeOver(wideLog, WIDE_SIZE, {
      lineNumber: ({ offset }) =>
        ok<ViewerLineNumber>({ generation: 0, offset, line: Math.floor(offset / 1000) + 1 })
    });
    render(<TextView reader={reader} info={infoFor(WIDE_SIZE)} />);
    expect(await screen.findByText('Line 1')).toBeTruthy();

    // Page down past the first read, carrying the line number along.
    for (let step = 0; step < 40; step += 1) {
      fireEvent.keyDown(textBox(), { key: 'PageDown' });
      await act(async () => {});
    }
    expect(await screen.findByText('Line 1,561')).toBeTruthy();
    expect(reader.lineNumber).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(textBox(), { key: 'Home' });

    expect(await screen.findByText('Line 1')).toBeTruthy();
    expect(reader.lineNumber).toHaveBeenCalledTimes(2);
  });

  it('copies a selection it holds, and refuses one larger than a bounded read', async () => {
    const bytes = new TextEncoder().encode('one\ntwo\n');
    render(
      <TextView reader={bridgeOver(memory(bytes), bytes.length)} info={infoFor(bytes.length)} />
    );
    await screen.findByText('two');

    fireEvent.keyDown(textBox(), { key: 'a', metaKey: true });
    expect(copy()).toHaveBeenCalledWith('text/plain', 'one\ntwo\n');
  });

  it('copies line breaks as the file spells them', async () => {
    const bytes = new TextEncoder().encode('one\r\ntwo');
    render(
      <TextView reader={bridgeOver(memory(bytes), bytes.length)} info={infoFor(bytes.length)} />
    );
    await screen.findByText('two');

    fireEvent.keyDown(textBox(), { key: 'a', metaKey: true });
    expect(copy()).toHaveBeenCalledWith('text/plain', 'one\r\ntwo');
  });

  it('says so when a selection is too large to copy', async () => {
    render(<TextView reader={bridgeOver(hugeLog, HUGE_SIZE)} info={infoFor(HUGE_SIZE)} />);
    await screen.findByText(FIRST_LINE);

    fireEvent.keyDown(textBox(), { key: 'a', metaKey: true });
    expect(copy()).not.toHaveBeenCalled();
    expect(screen.getByText(SELECTION_TOO_LARGE)).toBeTruthy();
  });

  it('wraps long lines when asked', async () => {
    const bytes = new TextEncoder().encode('x'.repeat(300));
    render(
      <TextView reader={bridgeOver(memory(bytes), bytes.length)} info={infoFor(bytes.length)} />
    );
    await screen.findByText('x'.repeat(300));

    fireEvent.click(screen.getByRole('checkbox', { name: 'Wrap' }));

    expect(textBox().className).toContain('text-rows-wrap');
  });

  /**
   * A 3,000-byte line in wrap mode, whose every row wraps to 500 pixels in a
   * 200-pixel box (jsdom has no layout, so both are stubbed): 300 pixels of
   * each row lie below the box. Returns the box's scroll position and top row.
   */
  async function tallWrappedRows() {
    const bytes = new TextEncoder().encode('x'.repeat(3000));
    render(
      <TextView reader={bridgeOver(memory(bytes), bytes.length)} info={infoFor(bytes.length)} />
    );
    await waitFor(() => expect(document.querySelectorAll('.text-row')).toHaveLength(3));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Wrap' }));

    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(500);
    let scrollTop = 0;
    Object.defineProperties(textBox(), {
      clientHeight: { configurable: true, get: () => 200 },
      scrollTop: {
        configurable: true,
        get: () => scrollTop,
        set: (value: number) => (scrollTop = value)
      }
    });

    return (): [string | null, number] => [
      document.querySelector('.text-row')?.getAttribute('data-row') ?? null,
      scrollTop
    ];
  }

  it('scrolls within a wrapped row taller than the window before moving on', async () => {
    const at = await tallWrappedRows();

    fireEvent.keyDown(textBox(), { key: 'ArrowDown' });
    expect(at()).toEqual(['0', 18]);
    fireEvent.keyDown(textBox(), { key: 'ArrowUp' });
    expect(at()).toEqual(['0', 0]);

    // A page moves a screen less one line, within the row while it lasts.
    fireEvent.keyDown(textBox(), { key: 'PageDown' });
    expect(at()).toEqual(['0', 182]);
    fireEvent.keyDown(textBox(), { key: 'PageUp' });
    expect(at()).toEqual(['0', 0]);
    fireEvent.keyDown(textBox(), { key: 'PageDown' });
    fireEvent.keyDown(textBox(), { key: 'PageDown' });
    expect(at()).toEqual(['0', 364]);

    fireEvent.keyDown(textBox(), { key: 'ArrowDown' });
    expect(at()).toEqual(['1024', 0]);

    // Stepping back up brings the row in from its end, so no part is skipped.
    fireEvent.keyDown(textBox(), { key: 'ArrowUp' });
    expect(at()).toEqual(['0', 300]);

    // Home shows the start of the file even though its row is already on top.
    fireEvent.keyDown(textBox(), { key: 'Home' });
    expect(at()).toEqual(['0', 0]);
  });

  it('scrolls a drag held below the window within a tall wrapped row first', async () => {
    const at = await tallWrappedRows();
    const firstRow = document.querySelector('.text-row');
    document.elementFromPoint = () => firstRow;
    vi.useFakeTimers();

    try {
      fireEvent.mouseDown(textBox(), { button: 0, clientX: 5, clientY: 0 });
      fireEvent.mouseMove(window, { clientX: 5, clientY: 50 });
      act(() => vi.advanceTimersByTime(50));
      expect(at()).toEqual(['0', 18]);
      fireEvent.mouseUp(window);
    } finally {
      vi.useRealTimers();
      Reflect.deleteProperty(document, 'elementFromPoint');
    }
  });

  it('selects along the nearest edge of the text when a drag leaves it on any side', async () => {
    const bytes = new TextEncoder().encode('alpha\nbeta\ngamma\n');
    render(
      <TextView reader={bridgeOver(memory(bytes), bytes.length)} info={infoFor(bytes.length)} />
    );
    await screen.findByText('gamma');

    // A 400 by 200 pixel box of 18-pixel rows; nothing is hit outside it.
    vi.spyOn(textBox(), 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 400, height: 200 })
    );
    const rows = [...document.querySelectorAll('.text-row')];
    document.elementFromPoint = (x, y) =>
      x >= 0 && x < 400 && y >= 0 && y < 200 ? (rows[Math.floor(y / 18)] ?? null) : null;

    try {
      fireEvent.mouseDown(textBox(), { button: 0, clientX: 5, clientY: 40 });
      // Up and out past the left edge: the focus is the top row, not the last.
      fireEvent.mouseMove(window, { clientX: -50, clientY: -20 });
      fireEvent.mouseUp(window);
    } finally {
      Reflect.deleteProperty(document, 'elementFromPoint');
    }

    expect(copy()).toHaveBeenCalledWith('text/plain', '\nbeta\ngamma');
  });

  it('ends a drag with the view: no listener or scroll timer survives an unmount', async () => {
    const bytes = new TextEncoder().encode('alpha\nbeta\ngamma\n');
    const { unmount } = render(
      <TextView reader={bridgeOver(memory(bytes), bytes.length)} info={infoFor(bytes.length)} />
    );
    await screen.findByText('gamma');
    vi.spyOn(textBox(), 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 400, height: 200 })
    );
    const firstRow = document.querySelector('.text-row');
    document.elementFromPoint = () => firstRow;
    const live = liveDragListeners();
    vi.useFakeTimers();

    try {
      fireEvent.mouseDown(textBox(), { button: 0, clientX: 5, clientY: 5 });
      // Held below the box: the drag scrolls on a timer.
      fireEvent.mouseMove(window, { clientX: 5, clientY: 300 });
      unmount();
      expect(live()).toEqual({ mousemove: 0, mouseup: 0 });

      const interval = vi.spyOn(globalThis, 'setInterval');
      fireEvent.mouseMove(window, { clientX: 5, clientY: 100 });
      fireEvent.mouseMove(window, { clientX: 5, clientY: 300 });
      fireEvent.mouseUp(window);
      expect(interval).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
      Reflect.deleteProperty(document, 'elementFromPoint');
    }
  });

  it('ends a drag whose mouseup never came when the next one starts', async () => {
    const bytes = new TextEncoder().encode('alpha\nbeta\ngamma\n');
    render(
      <TextView reader={bridgeOver(memory(bytes), bytes.length)} info={infoFor(bytes.length)} />
    );
    await screen.findByText('gamma');
    vi.spyOn(textBox(), 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 400, height: 200 })
    );
    const firstRow = document.querySelector('.text-row');
    document.elementFromPoint = () => firstRow;
    const live = liveDragListeners();
    vi.useFakeTimers();

    try {
      fireEvent.mouseDown(textBox(), { button: 0, clientX: 5, clientY: 5 });
      fireEvent.mouseMove(window, { clientX: 5, clientY: 300 });
      fireEvent.mouseDown(textBox(), { button: 0, clientX: 5, clientY: 5 });
      expect(live()).toEqual({ mousemove: 1, mouseup: 1 });
      expect(vi.getTimerCount()).toBe(0);

      fireEvent.mouseUp(window);
      expect(live()).toEqual({ mousemove: 0, mouseup: 0 });
    } finally {
      vi.useRealTimers();
      Reflect.deleteProperty(document, 'elementFromPoint');
    }
  });

  it('pages wrapped text by the lines in view, so no wrapped line is skipped', async () => {
    // Lines that wrap at 40 characters to 3, 5, 1, 8, and 2 lines, then short ones.
    const lengths = [100, 200, 30, 300, 50, ...Array.from({ length: 60 }, () => 10)];
    const lines = lengths.map((length, index) =>
      String.fromCharCode(97 + (index % 26)).repeat(length)
    );
    const starts = lines.map((_, index) =>
      lines.slice(0, index).reduce((sum, line) => sum + line.length + 1, 0)
    );
    const bytes = new TextEncoder().encode(`${lines.join('\n')}\n`);
    render(
      <TextView reader={bridgeOver(memory(bytes), bytes.length)} info={infoFor(bytes.length)} />
    );
    await waitFor(() => expect(document.querySelectorAll('.text-row').length).toBeGreaterThan(5));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Wrap' }));

    const heightOf = (row: Element): number =>
      Math.max(1, Math.ceil((row.querySelector('.text-content')?.textContent?.length ?? 0) / 40)) *
      18;
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
      this: HTMLElement
    ) {
      return this.classList.contains('text-row') ? heightOf(this) : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (
      this: HTMLElement
    ) {
      let top = 0;
      for (let row = this.previousElementSibling; row; row = row.previousElementSibling) {
        if (row.classList.contains('text-row')) top += heightOf(row);
      }
      return top;
    });
    let scrollTop = 0;
    Object.defineProperties(textBox(), {
      clientHeight: { configurable: true, get: () => 200 },
      scrollTop: {
        configurable: true,
        get: () => scrollTop,
        set: (value: number) => (scrollTop = value)
      }
    });
    const at = (): [string | null, number] => [
      document.querySelector('.text-row')?.getAttribute('data-row') ?? null,
      scrollTop
    ];

    // The line 182 pixels down (a 200-pixel screen less one line) comes to
    // the top: the fourth line's second visual line.
    fireEvent.keyDown(textBox(), { key: 'PageDown' });
    expect(at()).toEqual([String(starts[3]), 20]);
    fireEvent.keyDown(textBox(), { key: 'PageDown' });
    expect(at()).toEqual([String(starts[6]), 4]);

    // Paging up puts the line at the top back at the bottom.
    fireEvent.keyDown(textBox(), { key: 'PageUp' });
    expect(at()).toEqual([String(starts[3]), 20]);
    fireEvent.keyDown(textBox(), { key: 'PageUp' });
    expect(at()).toEqual([String(starts[0]), 0]);
  });

  it(
    'lands a long move up on the end of a tall wrapped row, past every screen it carried over',
    async () => {
      const reader = bridgeOver(hugeLog, HUGE_SIZE);
      render(<TextView reader={reader} info={infoFor(HUGE_SIZE)} />);
      await screen.findByText(FIRST_LINE);
      fireEvent.click(screen.getByRole('checkbox', { name: 'Wrap' }));
      fireEvent.keyDown(textBox(), { key: 'End' });
      await waitFor(() => expect(reader.readRange).toHaveBeenCalledTimes(2));
      const endTop = HUGE_SIZE - 16 * 40;
      await waitFor(() =>
        expect(document.querySelector('.text-row')?.getAttribute('data-row')).toBe(String(endTop))
      );

      // Every row now wraps taller than the 200-pixel box.
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(500);
      let scrollTop = 0;
      Object.defineProperties(textBox(), {
        clientHeight: { configurable: true, get: () => 200 },
        scrollTop: {
          configurable: true,
          get: () => scrollTop,
          set: (value: number) => (scrollTop = value)
        }
      });

      // 100,000 rows up: more than the bytes held, so the move draws a screen
      // wherever the held bytes end, reads on, and lands after the last read.
      fireEvent.wheel(textBox(), { deltaY: -100_000 * 18 });

      await waitFor(
        () =>
          expect(document.querySelector('.text-row')?.getAttribute('data-row')).toBe(
            String(endTop - 100_000 * 16)
          ),
        { timeout: LONG_MOVE_TIMEOUT_MS }
      );
      expect(scrollTop).toBe(300);
    },
    LONG_MOVE_TIMEOUT_MS
  );

  it(
    'asks the size once when a huge file shrank far under the screen, and settles in two reads',
    async () => {
      let size = HUGE_SIZE;
      const reader = bridgeOver(hugeLog, HUGE_SIZE);
      reader.readRange.mockImplementation(({ offset, length }) =>
        ok<ViewerByteRange>({
          generation: 0,
          offset,
          bytes: hugeLog(offset, Math.max(0, Math.min(size, offset + length) - offset)),
          endOfFile: offset + length >= size
        })
      );
      reader.inspect.mockImplementation(() => ok(infoFor(size)));
      render(<TextView reader={reader} info={infoFor(HUGE_SIZE)} />);
      await screen.findByText(FIRST_LINE);
      fireEvent.keyDown(textBox(), { key: 'End' });
      await waitFor(() => expect(gutters().at(-1)).toBe((HUGE_SIZE - 16).toLocaleString('en-US')));

      size = 1000;
      const reads = reader.readRange.mock.calls.length;
      // Far up, past the bytes held, onto bytes the file no longer has.
      fireEvent.wheel(textBox(), { deltaY: -100_000 * 18 });

      await waitFor(() => expect(gutters()[0]).toBe('0'), { timeout: LONG_MOVE_TIMEOUT_MS });
      expect(screen.getByText(FIRST_LINE)).toBeTruthy();
      expect(reader.readRange.mock.calls.length - reads).toBe(2);
      expect(reader.inspect).toHaveBeenCalledTimes(1);

      // The end is now the shrunk file's.
      fireEvent.keyDown(textBox(), { key: 'End' });
      await waitFor(() => expect(gutters().at(-1)).toBe('992'));
      expect(reader.readRange.mock.calls.length - reads).toBe(2);
    },
    LONG_MOVE_TIMEOUT_MS
  );

  /** A huge log the test shrinks to `shrunk()` bytes while it is open; reads and the size see the new end. */
  function shrinkingLog(shrunk: () => number) {
    const reader = bridgeOver(hugeLog, HUGE_SIZE);
    reader.readRange.mockImplementation(({ offset, length }) => {
      const size = shrunk();
      return ok<ViewerByteRange>({
        generation: 0,
        offset,
        bytes: hugeLog(offset, Math.max(0, Math.min(size, offset + length) - offset)),
        endOfFile: offset + length >= size
      });
    });
    reader.inspect.mockImplementation(() => ok(infoFor(shrunk())));
    return reader;
  }

  it('reads again rather than draw held bytes past an end the file shrank to', async () => {
    let size = HUGE_SIZE;
    const reader = shrinkingLog(() => size);
    render(<TextView reader={reader} info={infoFor(HUGE_SIZE)} />);
    await screen.findByText(FIRST_LINE);

    // The first read still holds the start, well past the new end.
    size = 1000;
    fireEvent.keyDown(textBox(), { key: 'End' });

    await waitFor(() => expect(reader.inspect).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(gutters().at(-1)).toBe('992'));
    expect(reader.readRange).toHaveBeenCalledTimes(3);

    // Nothing past the new end draws, however far the view is moved.
    fireEvent.keyDown(textBox(), { key: 'ArrowDown' });
    expect(gutters().at(-1)).toBe('992');
  });

  it('shows a file emptied while open as empty, not the bytes it held', async () => {
    let size = HUGE_SIZE;
    const reader = shrinkingLog(() => size);
    render(<TextView reader={reader} info={infoFor(HUGE_SIZE)} />);
    await screen.findByText(FIRST_LINE);

    size = 0;
    fireEvent.keyDown(textBox(), { key: 'End' });

    expect(await screen.findByText('The file is empty.')).toBeTruthy();
    expect(screen.queryByText(FIRST_LINE)).toBeNull();
  });

  /**
   * Wrapped text with one visual line per row, 18 pixels each, in a
   * 200-pixel box, where every read returns 400 bytes (25 lines) so each
   * page needs a read; once `hold` is set, reads wait for the test, and
   * `size` shrinks the file.
   */
  async function wrappedPaging() {
    vi.stubGlobal('ResizeObserver', measuredAt(200));
    const reader = bridgeOver(hugeLog, HUGE_SIZE);
    const waiting: Array<(failed: boolean) => void> = [];
    const state = { hold: false, size: HUGE_SIZE };
    reader.readRange.mockImplementation(({ offset }) => {
      const result: ViewerResult<ViewerByteRange> = {
        ok: true,
        value: {
          generation: 0,
          offset,
          bytes: hugeLog(offset, Math.max(0, Math.min(400, state.size - offset))),
          endOfFile: offset + 400 >= state.size
        }
      };
      const failure: ViewerResult<ViewerByteRange> = {
        ok: false,
        error: { message: 'Could not read “app.log”.' }
      };
      return state.hold
        ? new Promise((resolve) => waiting.push((failed) => resolve(failed ? failure : result)))
        : Promise.resolve(result);
    });
    render(<TextView reader={reader} info={infoFor(HUGE_SIZE)} />);
    await screen.findByText(FIRST_LINE);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Wrap' }));
    await waitFor(() => expect(reader.readRange).toHaveBeenCalledTimes(2));

    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
      this: HTMLElement
    ) {
      return this.classList.contains('text-row') ? 18 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (
      this: HTMLElement
    ) {
      return [...(this.parentElement?.querySelectorAll('.text-row') ?? [])].indexOf(this) * 18;
    });
    let scrollTop = 0;
    Object.defineProperties(textBox(), {
      clientHeight: { configurable: true, get: () => 200 },
      scrollTop: {
        configurable: true,
        get: () => scrollTop,
        set: (value: number) => (scrollTop = value)
      }
    });

    return {
      reader,
      state,
      at: (): [string | null, number] => [
        document.querySelector('.text-row')?.getAttribute('data-row') ?? null,
        scrollTop
      ],
      /** Answers the waiting reads, and any they lead to, in order; the first fails with `failFirst`. */
      answerReads: async (failFirst = false): Promise<void> => {
        let failed = failFirst;
        while (waiting.length > 0) {
          await act(async () => {
            waiting.shift()?.(failed);
            await Promise.resolve();
          });
          failed = false;
        }
      }
    };
  }

  it('pages wrapped text once per press, even while a page is still being read', async () => {
    const { state, at, answerReads } = await wrappedPaging();

    state.hold = true;
    // Two pages down, the second pressed before the first one's read is answered.
    fireEvent.keyDown(textBox(), { key: 'PageDown' });
    fireEvent.keyDown(textBox(), { key: 'PageDown' });
    await answerReads();
    await waitFor(() => expect(at()).toEqual(['320', 4]));

    // And two back up the same way.
    fireEvent.keyDown(textBox(), { key: 'PageUp' });
    fireEvent.keyDown(textBox(), { key: 'PageUp' });
    await answerReads();
    await waitFor(() => expect(at()).toEqual(['0', 0]));
  });

  it('pages wrapped text afresh after a page whose read failed', async () => {
    const { reader, state, at, answerReads } = await wrappedPaging();

    state.hold = true;
    fireEvent.keyDown(textBox(), { key: 'PageDown' });
    await answerReads(true);
    expect(await screen.findByText('Could not read “app.log”.')).toBeTruthy();

    // The next press reads again instead of waiting on the failed page.
    const reads = reader.readRange.mock.calls.length;
    fireEvent.keyDown(textBox(), { key: 'PageDown' });
    expect(reader.readRange.mock.calls.length).toBe(reads + 1);
    await answerReads();
    await waitFor(() => expect(at()).toEqual(['160', 2]));

    // Up the same way, from the screen in view rather than the failed page.
    fireEvent.keyDown(textBox(), { key: 'PageDown' });
    await answerReads();
    await waitFor(() => expect(at()).toEqual(['320', 4]));
    fireEvent.keyDown(textBox(), { key: 'PageUp' });
    await answerReads(true);
    fireEvent.keyDown(textBox(), { key: 'PageUp' });
    await answerReads();
    await waitFor(() => expect(at()).toEqual(['160', 2]));
  });

  it('pages wrapped text after a page that came back to the same top row', async () => {
    const { state, at, answerReads } = await wrappedPaging();
    state.hold = true;
    fireEvent.keyDown(textBox(), { key: 'PageDown' });
    await answerReads();
    await waitFor(() => expect(at()).toEqual(['160', 2]));

    // The file now ends inside the top row, so the next page comes back to it.
    state.size = 170;
    fireEvent.keyDown(textBox(), { key: 'PageDown' });
    await answerReads();
    await waitFor(() => expect(document.querySelectorAll('.text-row')).toHaveLength(1));
    expect(at()).toEqual(['160', 2]);

    // Paging up still works instead of waiting on that page.
    fireEvent.keyDown(textBox(), { key: 'PageUp' });
    await answerReads();
    await waitFor(() => expect(at()).toEqual(['0', 0]));
  });

  /** Points a caret at character `char` of the row on screen, as the page's hit test would. */
  const caretAt = (char: number): CaretPosition | null => {
    const part = [...document.querySelectorAll<HTMLElement>('.text-content [data-char]')]
      .reverse()
      .find((element) => Number(element.dataset['char']) <= char);
    return part?.firstChild
      ? ({
          offsetNode: part.firstChild,
          offset: char - Number(part.dataset['char'])
        } as unknown as CaretPosition)
      : null;
  };

  it('selects from the start of the wrapped line level with a drag past the left edge', async () => {
    const text = 'abcdefghij'.repeat(10);
    const bytes = new TextEncoder().encode(text);
    render(
      <TextView reader={bridgeOver(memory(bytes), bytes.length)} info={infoFor(bytes.length)} />
    );
    await screen.findByText(text);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Wrap' }));

    // The row wraps at 40 characters of 8 pixels, its text starting 60
    // pixels in, past the gutter.
    const box = textBox();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      if (this === box) return DOMRect.fromRect({ x: 0, y: 0, width: 400, height: 200 });
      if (this.classList.contains('text-content')) {
        return DOMRect.fromRect({ x: 60, y: 0, width: 320, height: 54 });
      }
      if (this.classList.contains('text-gutter')) {
        return DOMRect.fromRect({ x: 0, y: 0, width: 50, height: 54 });
      }
      return DOMRect.fromRect();
    });
    const row = document.querySelector('.text-row');
    document.elementFromPoint = () => row;
    document.caretPositionFromPoint = (x, y) =>
      x < 60 ? null : caretAt(Math.floor(y / 18) * 40 + Math.min(39, Math.floor((x - 60) / 8)));

    try {
      fireEvent.mouseDown(box, { button: 0, clientX: 100, clientY: 5 });
      // Left of the text, level with its second line.
      fireEvent.mouseMove(window, { clientX: -50, clientY: 25 });
      fireEvent.mouseUp(window);
    } finally {
      Reflect.deleteProperty(document, 'elementFromPoint');
      Reflect.deleteProperty(document, 'caretPositionFromPoint');
    }

    expect(copy()).toHaveBeenCalledWith('text/plain', text.slice(5, 40));
  });

  it('selects the word under a double click', async () => {
    const bytes = new TextEncoder().encode('const value = 42;\n');
    render(
      <TextView reader={bridgeOver(memory(bytes), bytes.length)} info={infoFor(bytes.length)} />
    );
    await screen.findByText('const value = 42;');
    document.caretPositionFromPoint = () => caretAt(8);

    try {
      fireEvent.mouseDown(textBox(), { button: 0, detail: 2, clientX: 5, clientY: 5 });
      fireEvent.mouseUp(window);
    } finally {
      Reflect.deleteProperty(document, 'caretPositionFromPoint');
    }

    expect(copy()).toHaveBeenCalledWith('text/plain', 'value');
  });

  it('highlights code in a worker, and copies it as the plain text it is', async () => {
    vi.mocked(openSyntaxWorker).mockImplementation(workerInPage);
    const bytes = new TextEncoder().encode('const a = 1;\nlet b = "const";\n');
    render(
      <TextView
        reader={bridgeOver(memory(bytes), bytes.length)}
        info={infoFor(bytes.length, 0, 'app.js')}
      />
    );

    await waitFor(() =>
      expect(
        [...document.querySelectorAll<HTMLElement>('.text-content span')]
          .filter((span) => span.style.color === 'var(--syntax-mauve)')
          .map((span) => span.textContent)
      ).toEqual(['const', 'const'])
    );
    expect(screen.getByText('JavaScript')).toBeTruthy();

    fireEvent.keyDown(textBox(), { key: 'a', metaKey: true });
    expect(copy()).toHaveBeenCalledWith('text/plain', 'const a = 1;\nlet b = "const";\n');
  });

  it('names a script by its interpreter line', async () => {
    vi.mocked(openSyntaxWorker).mockImplementation(workerInPage);
    const bytes = new TextEncoder().encode('#!/bin/sh\necho hi\n');
    render(
      <TextView
        reader={bridgeOver(memory(bytes), bytes.length)}
        info={infoFor(bytes.length, 0, 'deploy')}
      />
    );

    expect(await screen.findByText('Shell')).toBeTruthy();
  });

  it('highlights the source of a file detected as SVG as XML, whatever its name', async () => {
    vi.mocked(openSyntaxWorker).mockImplementation(workerInPage);
    const bytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>\n');
    render(
      <TextView
        reader={bridgeOver(memory(bytes), bytes.length)}
        info={{
          ...infoFor(bytes.length, 0, 'logo.js'),
          content: { kind: 'svg', mimeType: 'image/svg+xml' }
        }}
      />
    );

    expect(await screen.findByText('XML')).toBeTruthy();
  });

  it('says why a long line shows plain', async () => {
    vi.mocked(openSyntaxWorker).mockImplementation(workerInPage);
    const bytes = new TextEncoder().encode(`const a = "${'y'.repeat(5000)}";\nconst b = 1;\n`);
    render(
      <TextView
        reader={bridgeOver(memory(bytes), bytes.length)}
        info={infoFor(bytes.length, 0, 'app.js')}
      />
    );

    expect(await screen.findByText('JavaScript · Lines over 4 KB not highlighted')).toBeTruthy();
  });

  it('shows a file past the size limit plain, says why, and starts no worker', async () => {
    vi.mocked(openSyntaxWorker).mockClear();
    const size = HIGHLIGHT_MAX_FILE_BYTES + 16;
    render(<TextView reader={bridgeOver(hugeLog, size)} info={infoFor(size, 0, 'dump.js')} />);
    await screen.findByText(FIRST_LINE);

    expect(screen.getByText('JavaScript · Not highlighted, file over 16 MB')).toBeTruthy();
    expect(openSyntaxWorker).not.toHaveBeenCalled();
  });

  it('takes the focus as it opens without a ring, until the focus leaves and comes back', async () => {
    const bytes = new TextEncoder().encode('alpha\n');
    render(
      <>
        <TextView reader={bridgeOver(memory(bytes), bytes.length)} info={infoFor(bytes.length)} />
        <button type="button">elsewhere</button>
      </>
    );
    const rows = screen.getByRole('textbox');

    expect(document.activeElement).toBe(rows);
    expect(rows.hasAttribute('data-quiet-focus')).toBe(true);
    expect(rows.closest('.viewer-rows-frame')).toBeTruthy();

    act(() => screen.getByRole('button', { name: 'elsewhere' }).focus());

    expect(rows.hasAttribute('data-quiet-focus')).toBe(false);
  });

  it('says the file is empty', async () => {
    render(<TextView reader={bridgeOver(memory(new Uint8Array()), 0)} info={infoFor(0)} />);

    expect(await screen.findByText('The file is empty.')).toBeTruthy();
  });

  it('shows why the file could not be read', async () => {
    const reader = bridgeOver(memory(new Uint8Array()), 10);
    reader.readRange.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        error: {
          message: 'Could not open “app.log”. It no longer exists.',
          path: '',
          reason: 'not-found',
          detail: null
        }
      })
    );
    render(<TextView reader={reader} info={infoFor(10)} />);

    expect((await screen.findByRole('alert')).textContent).toContain('It no longer exists.');
  });
});
