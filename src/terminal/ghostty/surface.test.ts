import { afterEach, describe, expect, it, vi } from 'vitest';

import { serveFileUrls } from '../../../test/fileFetch.js';

import { GhosttyTerminalCore, ghosttyPageRows } from './core.js';
import {
  GhosttyTerminalSurface,
  terminalFontFamily,
  type GhosttyTerminalSurfaceOptions
} from './surface.js';
import { DEFAULT_TERMINAL_FONT_FAMILY } from './surface.logic.js';

serveFileUrls();

interface KeyInit {
  readonly key: string;
  readonly code: string;
  readonly metaKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
  readonly shiftKey?: boolean;
  readonly repeat?: boolean;
}

describe('GhosttyTerminalSurface', () => {
  const surfaces = new Set<GhosttyTerminalSurface>();

  // Keep the real surface, renderer, and WASM core. Only browser layout and
  // scheduling are replaced so tests can count work and drive frames.
  function createHarness() {
    vi.useFakeTimers();
    const frames = new Map<number, FrameRequestCallback>();
    const resizeCallbacks = new Set<() => void>();
    const paint = vi.fn<(operation: string, args: ReadonlyArray<unknown>) => void>();
    let frameId = 0;
    let pointerTime = 0;
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frames.set(++frameId, callback);
      return frameId;
    });

    class TerminalTestElement extends EventTarget {
      style: Record<string, string> = {};
      parentElement: TerminalTestElement | null = null;
      children: TerminalTestElement[] = [];
      className = '';
      textContent = '';
      clientWidth = 168;
      clientHeight = 104;
      width = 300;
      height = 150;
      value = '';
      hidden = false;
      tabIndex = -1;
      private readonly captures = new Set<number>();

      setAttribute() {}
      append(...children: TerminalTestElement[]) {
        for (const child of children) child.parentElement = this;
        this.children.push(...children);
      }
      replaceChildren(...children: TerminalTestElement[]) {
        this.children = [];
        this.append(...children);
      }
      remove() {
        this.parentElement = null;
      }
      contains(node: unknown) {
        return node === this;
      }
      select() {}
      getContext() {
        return context;
      }
      focus() {
        this.dispatchEvent(new Event('focus'));
      }
      setPointerCapture(pointerId: number) {
        this.captures.add(pointerId);
      }
      hasPointerCapture(pointerId: number) {
        return this.captures.has(pointerId);
      }
      releasePointerCapture(pointerId: number) {
        this.captures.delete(pointerId);
      }
      getBoundingClientRect() {
        return { left: 0, top: 0, right: 168, bottom: 104, width: 168, height: 104 };
      }
    }

    const canvas = new TerminalTestElement();
    const mount = new TerminalTestElement();
    const context = {
      canvas,
      beginPath() {},
      clip() {},
      rect() {},
      resetTransform() {},
      restore() {},
      save() {},
      setTransform() {},
      fillRect: (...args: number[]) => paint('fillRect', args),
      strokeRect: (...args: number[]) => paint('strokeRect', args),
      fillText: (...args: [string, number, number, number?]) => paint('fillText', args),
      measureText: (text: string) => ({
        width: text.length * 8,
        actualBoundingBoxAscent: 9,
        actualBoundingBoxDescent: 3
      })
    };
    const documentSelection = { selectAllChildren: vi.fn(), removeAllRanges: vi.fn() };
    vi.stubGlobal('document', {
      createElement: (tag: string) => (tag === 'canvas' ? canvas : new TerminalTestElement()),
      fonts: Object.assign(new EventTarget(), { load: async () => [], add() {} }),
      getSelection: () => documentSelection
    });
    vi.stubGlobal(
      'window',
      Object.assign(new EventTarget(), {
        devicePixelRatio: 1,
        requestAnimationFrame: requestFrame,
        cancelAnimationFrame: (id: number) => frames.delete(id),
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        matchMedia: () => Object.assign(new EventTarget(), { matches: false })
      })
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly callback: () => void) {
          resizeCallbacks.add(callback);
        }
        observe() {}
        disconnect() {
          resizeCallbacks.delete(this.callback);
        }
      }
    );
    const snapshot = vi.spyOn(GhosttyTerminalCore.prototype, 'snapshot');
    const onData = vi.fn<(data: string) => void>();
    const onResize = vi.fn<(cols: number, rows: number) => void>();
    const onParsed = vi.fn<(units: number) => void>();

    return {
      mount,
      canvas,
      frames,
      paint,
      requestFrame,
      snapshot,
      documentSelection,
      onData,
      onResize,
      onParsed,
      get renderedSnapshot() {
        const result = snapshot.mock.results.at(-1);
        if (result?.type !== 'return') throw new Error('No terminal snapshot was rendered');
        return result.value;
      },
      flushFrame() {
        const queued = [...frames.values()];
        frames.clear();
        for (const callback of queued) callback(0);
      },
      resize() {
        for (const callback of resizeCallbacks) callback();
      },
      pointer(
        type: string,
        clientX: number,
        buttons: number,
        modifiers: { shiftKey?: boolean; metaKey?: boolean } = {}
      ) {
        const event = Object.assign(new Event(type, { cancelable: true }), {
          clientX,
          clientY: 5,
          pointerId: 1,
          button: 0,
          buttons,
          shiftKey: modifiers.shiftKey ?? false,
          metaKey: modifiers.metaKey ?? false,
          ctrlKey: false,
          altKey: false
        });
        // Presses a second apart never chain into a double click by accident.
        pointerTime += 1_000;
        Object.defineProperty(event, 'timeStamp', { value: pointerTime });
        canvas.dispatchEvent(event);
      },
      /** A pointer event with any button and Control, as a secondary click makes. */
      press(
        type: string,
        init: { readonly button: number; readonly buttons: number; readonly ctrlKey?: boolean }
      ) {
        const event = Object.assign(new Event(type, { cancelable: true }), {
          clientX: 13,
          clientY: 5,
          pointerId: 1,
          shiftKey: false,
          metaKey: false,
          altKey: false,
          ctrlKey: false,
          ...init
        });
        pointerTime += 1_000;
        Object.defineProperty(event, 'timeStamp', { value: pointerTime });
        canvas.dispatchEvent(event);
        return event;
      },
      /** Drags a selection over the first `cells` cells of row 0. */
      select(cells: number) {
        this.pointer('pointerdown', 5, 1);
        this.pointer('pointermove', 5 + (cells - 1) * 8, 1);
        this.pointer('pointerup', 5 + (cells - 1) * 8, 0);
      },
      key(target: EventTarget, init: KeyInit, type = 'keydown') {
        const event = Object.assign(new Event(type, { cancelable: true }), {
          metaKey: false,
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          repeat: false,
          isComposing: false,
          keyCode: 0,
          getModifierState: () => false,
          ...init
        });
        target.dispatchEvent(event);
        return event;
      },
      clipboardEvent(target: EventTarget, type: 'copy' | 'paste', text = '') {
        const setData = vi.fn();
        const event = Object.assign(new Event(type, { cancelable: true }), {
          clipboardData: { setData, getData: () => text }
        });
        target.dispatchEvent(event);
        return { event, setData };
      },
      async create(options: Partial<GhosttyTerminalSurfaceOptions> = {}) {
        const surface = await GhosttyTerminalSurface.create(mount as unknown as HTMLElement, {
          theme: {
            foreground: { r: 255, g: 255, b: 255 },
            background: { r: 0, g: 0, b: 0 },
            cursor: { r: 255, g: 255, b: 255 }
          },
          scrollbackLines: 1_000,
          onData,
          onResize,
          onParsed,
          ...options
        });
        surfaces.add(surface);
        return surface;
      }
    };
  }

  afterEach(() => {
    for (const surface of surfaces) surface.dispose();
    surfaces.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('output', () => {
    it('parses queued chunks in the next frame and reports each one', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      harness.flushFrame();
      harness.snapshot.mockClear();

      surface.enqueue('one ');
      surface.enqueue('two ');
      surface.enqueue('🙂');
      expect(harness.onParsed).not.toHaveBeenCalled();
      expect(harness.frames.size).toBe(1);

      harness.flushFrame();
      expect(harness.onParsed.mock.calls).toEqual([[4], [4], [2]]);
      expect(harness.snapshot).toHaveBeenCalledTimes(1);
      expect(harness.renderedSnapshot.rowData[0]?.text).toBe('one two 🙂');
      // The parse and the paint share the frame; nothing is left scheduled.
      expect(harness.frames.size).toBe(0);
    });

    it('parses queued output on a deadline when no frame arrives', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      harness.flushFrame();

      surface.enqueue('occluded');
      vi.advanceTimersByTime(49);
      expect(harness.onParsed).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(harness.onParsed).toHaveBeenCalledWith(8);
    });

    it('keeps parsing and answering queries while the mount has no size', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      surface.write('visible');
      harness.flushFrame();
      harness.snapshot.mockClear();
      harness.paint.mockClear();
      harness.mount.clientWidth = 0;
      harness.resize();
      harness.requestFrame.mockClear();

      surface.enqueue('!');
      surface.enqueue('\x1b[5n');
      for (let index = 0; index < 8; index += 1) surface.write('x');
      vi.advanceTimersByTime(2_000);

      expect(harness.onParsed.mock.calls).toEqual([[1], [4]]);
      expect(harness.onData).toHaveBeenCalledWith('\x1b[0n');
      expect(harness.snapshot).not.toHaveBeenCalled();
      expect(harness.paint).not.toHaveBeenCalled();
      expect(harness.requestFrame).not.toHaveBeenCalled();
      harness.mount.clientWidth = 168;
      harness.resize();
      expect(harness.snapshot).toHaveBeenCalledTimes(1);
      expect(harness.renderedSnapshot.rowData[0]?.text).toContain('visible!xxxxxxxx');
      expect(harness.paint).toHaveBeenCalled();
    });

    it('reports queued output it drops on dispose', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      const dispose = vi.spyOn(GhosttyTerminalCore.prototype, 'dispose');
      surface.enqueue('never parsed');
      surface.dispose();
      expect(harness.onParsed).toHaveBeenCalledWith(12);
      expect(dispose).toHaveBeenCalledOnce();
      expect(harness.mount.children.every((child) => child.parentElement === null)).toBe(true);
    });

    it('clears the scrollback and the rows above the cursor', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      surface.write(Array.from({ length: 20 }, (_, index) => `line ${index}`).join('\r\n'));
      surface.write('\r\n$ ');
      harness.flushFrame();

      surface.clearToStart();
      harness.flushFrame();
      const rows = harness.renderedSnapshot.rowData.map((row: { text: string }) => row.text);
      expect(rows[0]).toBe('$');
      expect(rows.slice(1).every((text: string) => text === '')).toBe(true);
      expect(harness.renderedSnapshot).toMatchObject({ cursorX: 2, cursorY: 0 });
    });
  });

  describe('synchronized output', () => {
    const rowTexts = (snapshot: { rowData: ReadonlyArray<{ text: string }> }, count: number) =>
      snapshot.rowData.slice(0, count).map((row) => row.text);

    it('holds the complete frame across split markers and a pixel ratio change', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      surface.write('\x1b[?1049h\x1b[HOLD first\x1b[2;1HOLD second');
      harness.flushFrame();
      expect(rowTexts(harness.renderedSnapshot, 2)).toEqual(['OLD first', 'OLD second']);
      const { width, height } = harness.canvas;
      harness.snapshot.mockClear();
      harness.paint.mockClear();

      surface.write('\x1b[?20');
      surface.write('26h\x1b[HNEW first\x1b[5n');
      expect(harness.onData).toHaveBeenCalledWith('\x1b[0n');
      harness.flushFrame();
      window.devicePixelRatio = 2;
      harness.resize();
      vi.advanceTimersByTime(200);
      surface.write('\x1b[2;1HNEW second\x1b[?2026');
      harness.flushFrame();
      expect(harness.snapshot).not.toHaveBeenCalled();
      expect(harness.paint).not.toHaveBeenCalled();
      // Resizing the backing store would have cleared the frame on screen.
      expect([harness.canvas.width, harness.canvas.height]).toEqual([width, height]);

      surface.write('l');
      harness.flushFrame();
      expect(harness.snapshot).toHaveBeenCalledTimes(1);
      expect(rowTexts(harness.renderedSnapshot, 2)).toEqual(['NEW first', 'NEW second']);
      expect([harness.canvas.width, harness.canvas.height]).toEqual([width * 2, height * 2]);
      expect(
        harness.paint.mock.calls
          .filter(([operation]) => operation === 'fillText')
          .map(([, args]) => args[0])
      ).toEqual(expect.arrayContaining(['NEW first', 'NEW second']));
      vi.advanceTimersByTime(1_000);
      harness.flushFrame();
      expect(harness.snapshot).toHaveBeenCalledTimes(1);
    });

    it('keeps parsing and acknowledging queued output while an update holds the paint', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      surface.write('old');
      harness.flushFrame();
      harness.snapshot.mockClear();
      harness.paint.mockClear();

      surface.enqueue('\x1b[?2026h\rnew');
      harness.flushFrame();
      expect(harness.onParsed.mock.calls).toEqual([[12]]);
      surface.enqueue(' frame');
      expect(harness.frames.size).toBe(1);
      harness.flushFrame();
      expect(harness.onParsed.mock.calls).toEqual([[12], [6]]);
      expect(harness.snapshot).not.toHaveBeenCalled();
      expect(harness.paint).not.toHaveBeenCalled();

      surface.enqueue('\x1b[?2026l');
      harness.flushFrame();
      expect(harness.snapshot).toHaveBeenCalledTimes(1);
      expect(harness.renderedSnapshot.rowData[0]?.text).toBe('new frame');
    });

    it('ends an unterminated update and paints it at 500 ms despite later output', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      surface.write('before');
      harness.flushFrame();
      harness.snapshot.mockClear();
      harness.paint.mockClear();

      surface.write('\x1b[?2026h\rpartial');
      vi.advanceTimersByTime(499);
      surface.write(' frame');
      harness.flushFrame();
      expect(harness.snapshot).not.toHaveBeenCalled();
      expect(harness.paint).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      harness.flushFrame();
      expect(harness.snapshot).toHaveBeenCalledTimes(1);
      expect(harness.renderedSnapshot.rowData[0]?.text).toBe('partial frame');
      vi.advanceTimersByTime(1_000);
      harness.flushFrame();
      expect(harness.snapshot).toHaveBeenCalledTimes(1);

      surface.write('!');
      harness.flushFrame();
      expect(harness.renderedSnapshot.rowData[0]?.text).toBe('partial frame!');
    });

    it('paints at the deadline even when output queued before it opens an update', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      surface.write('before');
      harness.flushFrame();
      harness.snapshot.mockClear();

      surface.write('\x1b[?2026h\rpartial');
      vi.advanceTimersByTime(499);
      surface.enqueue('\x1b[?2026h frame');
      vi.advanceTimersByTime(1);
      expect(harness.snapshot).toHaveBeenCalledTimes(1);
      expect(harness.renderedSnapshot.rowData[0]?.text).toBe('partial frame');
      expect(harness.onParsed.mock.calls).toEqual([[14]]);
    });

    it('gives an update that output queued before the deadline opens its own deadline', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      surface.write('old');
      harness.flushFrame();
      harness.snapshot.mockClear();

      surface.write('\x1b[?2026h\rAAA');
      vi.advanceTimersByTime(499);
      surface.enqueue('\x1b[?2026l\x1b[?2026h\rBBB');
      vi.advanceTimersByTime(1);
      harness.flushFrame();
      expect(harness.snapshot).not.toHaveBeenCalled();
      vi.advanceTimersByTime(499);
      harness.flushFrame();
      expect(harness.snapshot).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(harness.snapshot).toHaveBeenCalledTimes(1);
      expect(harness.renderedSnapshot.rowData[0]?.text).toBe('BBB');
    });

    it('gives an update its own deadline when one write ends the last and opens it', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      surface.write('old');
      harness.flushFrame();
      harness.snapshot.mockClear();
      harness.paint.mockClear();

      surface.write('\x1b[?2026h\rAAA');
      vi.advanceTimersByTime(450);
      surface.write('\x1b[?2026l\x1b[?2026h\rBBB');
      vi.advanceTimersByTime(50);
      harness.flushFrame();
      expect(harness.snapshot).not.toHaveBeenCalled();
      expect(harness.paint).not.toHaveBeenCalled();
      vi.advanceTimersByTime(449);
      harness.flushFrame();
      expect(harness.snapshot).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      harness.flushFrame();
      expect(harness.snapshot).toHaveBeenCalledTimes(1);
      expect(harness.renderedSnapshot.rowData[0]?.text).toBe('BBB');
    });

    it.each(['zero size', 'dispose'] as const)(
      'leaves no deadline behind on %s',
      async (action) => {
        const harness = createHarness();
        const surface = await harness.create();
        surface.write('old');
        harness.flushFrame();
        surface.write('\x1b[?2026h\rnew');
        harness.snapshot.mockClear();
        harness.paint.mockClear();

        if (action === 'dispose') {
          surface.dispose();
        } else {
          harness.mount.clientWidth = 0;
          harness.resize();
        }
        vi.advanceTimersByTime(1_000);
        harness.flushFrame();
        expect(harness.snapshot).not.toHaveBeenCalled();
        expect(harness.paint).not.toHaveBeenCalled();
        if (action === 'dispose') return;

        harness.mount.clientWidth = 168;
        harness.resize();
        expect(harness.snapshot).not.toHaveBeenCalled();
        surface.write('\x1b[?2026l');
        harness.flushFrame();
        expect(harness.renderedSnapshot.rowData[0]?.text).toBe('new');
      }
    );

    it('replaces an open update on reset without a late deadline paint', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      surface.write('\x1b[?2026hpartial');
      harness.snapshot.mockClear();

      surface.resetAndWrite('replacement');
      harness.flushFrame();
      expect(harness.snapshot).toHaveBeenCalledTimes(1);
      expect(harness.renderedSnapshot.rowData[0]?.text).toBe('replacement');
      vi.advanceTimersByTime(1_000);
      harness.flushFrame();
      expect(harness.snapshot).toHaveBeenCalledTimes(1);
    });

    it('gives an update the replay opens its own deadline', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      surface.write('\x1b[?2026hpartial');
      vi.advanceTimersByTime(400);
      harness.snapshot.mockClear();

      surface.resetAndWrite('\x1b[?2026hreplay');
      vi.advanceTimersByTime(499);
      harness.flushFrame();
      expect(harness.snapshot).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(harness.snapshot).toHaveBeenCalledTimes(1);
      expect(harness.renderedSnapshot.rowData[0]?.text).toBe('replay');
    });

    it('paints a grid resize at once, since resizing ends the update', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      surface.write('old');
      harness.flushFrame();
      surface.write('\x1b[?2026h\rnew');
      harness.snapshot.mockClear();

      harness.mount.clientWidth = 176;
      harness.resize();
      expect(harness.snapshot).toHaveBeenCalledTimes(1);
      expect(harness.canvas.width).toBe(176);
      expect(harness.renderedSnapshot.rowData[0]?.text).toBe('new');
      vi.advanceTimersByTime(1_000);
      harness.flushFrame();
      expect(harness.snapshot).toHaveBeenCalledTimes(1);
    });
  });

  describe('sizing', () => {
    it('reports the first size at once and later sizes once they settle', async () => {
      const harness = createHarness();
      await harness.create();
      // (168 - 8) / 8 columns, (104 - 8) / 16 rows.
      expect(harness.onResize.mock.calls).toEqual([[20, 6]]);

      harness.mount.clientWidth = 248;
      harness.resize();
      harness.mount.clientWidth = 328;
      harness.resize();
      expect(harness.onResize).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(150);
      expect(harness.onResize.mock.calls.at(-1)).toEqual([40, 6]);
      expect(harness.onResize).toHaveBeenCalledTimes(2);
    });

    it('sizes rows by the requested line pitch', async () => {
      const harness = createHarness();
      await harness.create({ font: { size: 13, lineHeight: 19 } });
      // (168 - 8) / 8 columns, (104 - 8) / 19 rows.
      expect(harness.onResize.mock.calls).toEqual([[20, 5]]);
    });

    it('reports nothing until a mount without a size gets one', async () => {
      const harness = createHarness();
      harness.mount.clientHeight = 0;
      await harness.create();
      expect(harness.onResize).not.toHaveBeenCalled();
      harness.mount.clientHeight = 104;
      harness.resize();
      expect(harness.onResize.mock.calls).toEqual([[20, 6]]);
    });

    it('keeps the chosen lines after opening hidden and widening', async () => {
      const harness = createHarness();
      harness.mount.clientWidth = 0;
      harness.mount.clientHeight = 0;
      const surface = await harness.create({ scrollbackLines: 5_000 });
      // (2,400 - 8) / 8 columns.
      harness.mount.clientWidth = 2_400;
      harness.mount.clientHeight = 104;
      harness.resize();
      expect(harness.onResize.mock.calls).toEqual([[299, 6]]);

      surface.write(Array.from({ length: 20_000 }, (_, index) => `line ${index}\r\n`).join(''));

      const history = (coreOf(surface).scrollbarState()?.total ?? 0) - 6;
      expect(history).toBeGreaterThanOrEqual(5_000);
      expect(history).toBeLessThanOrEqual(5_000 + ghosttyPageRows(299));
    });

    it('takes a new scrollback length while it runs', async () => {
      const harness = createHarness();
      const surface = await harness.create({ scrollbackLines: 5_000 });
      surface.write(Array.from({ length: 20_000 }, (_, index) => `line ${index}\r\n`).join(''));
      harness.flushFrame();

      surface.setScrollbackLines(1_000);

      const history = (coreOf(surface).scrollbarState()?.total ?? 0) - 6;
      expect(history).toBeGreaterThanOrEqual(1_000);
      expect(history).toBeLessThanOrEqual(1_000 + ghosttyPageRows(20));
    });
  });

  describe('keyboard', () => {
    it('encodes keys under the terminal modes and leaves Command chords to the app', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      const input = surface.input!;

      expect(harness.key(input, { key: 'a', code: 'KeyA' }).defaultPrevented).toBe(true);
      harness.key(input, { key: 'Enter', code: 'Enter' });
      harness.key(input, { key: 'c', code: 'KeyC', ctrlKey: true });
      expect(harness.onData.mock.calls).toEqual([['a'], ['\r'], ['\x03']]);

      harness.onData.mockClear();
      expect(harness.key(input, { key: 'w', code: 'KeyW', metaKey: true }).defaultPrevented).toBe(
        false
      );
      expect(harness.key(input, { key: 'v', code: 'KeyV', metaKey: true }).defaultPrevented).toBe(
        false
      );
      expect(harness.onData).not.toHaveBeenCalled();

      surface.write('\x1b[?1h');
      harness.key(input, { key: 'ArrowUp', code: 'ArrowUp' });
      expect(harness.onData).toHaveBeenLastCalledWith('\x1bOA');
    });

    it('lets the host claim keys and skips chords an earlier listener claimed', async () => {
      const harness = createHarness();
      const beforeKey = vi.fn((event: KeyboardEvent) => event.key !== 'k');
      const surface = await harness.create({ beforeKey });
      const input = surface.input!;

      harness.key(input, { key: 'k', code: 'KeyK' });
      expect(harness.onData).not.toHaveBeenCalled();

      const claimed = (init: KeyInit) => {
        const event = Object.assign(new Event('keydown', { cancelable: true }), {
          metaKey: false,
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          repeat: false,
          isComposing: false,
          keyCode: 0,
          getModifierState: () => false,
          ...init
        });
        event.preventDefault();
        input.dispatchEvent(event);
      };
      // A space switch the shell already handled is not typed into the shell.
      claimed({ key: 'Tab', code: 'Tab', ctrlKey: true });
      expect(harness.onData).not.toHaveBeenCalled();
      // A page-level scroll guard does not take Backspace away from the shell.
      claimed({ key: 'Backspace', code: 'Backspace' });
      expect(harness.onData).toHaveBeenCalledWith('\x7f');
    });

    it('reports a Kitty release only for a press the terminal encoded', async () => {
      const harness = createHarness();
      const surface = await harness.create({ beforeKey: (event) => event.key !== 'k' });
      const input = surface.input!;
      // Disambiguate, report event types, and report every key as an escape code.
      surface.write('\x1b[>11u');
      const press = (init: KeyInit, target: EventTarget = input) => harness.key(target, init);
      const release = (init: KeyInit) => harness.key(input, init, 'keyup');

      press({ key: 'a', code: 'KeyA' });
      press({ key: 'a', code: 'KeyA', repeat: true });
      release({ key: 'a', code: 'KeyA' });
      // The host claims k, and Command chords are the app's.
      press({ key: 'k', code: 'KeyK' });
      release({ key: 'k', code: 'KeyK' });
      press({ key: 'w', code: 'KeyW', metaKey: true });
      release({ key: 'w', code: 'KeyW' });
      // An ancestor's capture listener stops a shell verb before the terminal
      // sees it; only the window's capture phase runs.
      press({ key: 'b', code: 'KeyB' }, window);
      release({ key: 'b', code: 'KeyB' });

      expect(harness.onData.mock.calls).toEqual([['\x1b[97u'], ['\x1b[97;1:2u'], ['\x1b[97;1:3u']]);
    });

    it('sends no release for a press made before the focus arrived', async () => {
      const harness = createHarness();
      let claimRepeat = false;
      const surface = await harness.create({ beforeKey: () => !claimRepeat });
      const input = surface.input!;
      surface.write('\x1b[>11u');

      // The press lands elsewhere, which hands the focus to the shell.
      harness.key(window, { key: 'c', code: 'KeyC' });
      input.focus();
      harness.key(input, { key: 'c', code: 'KeyC' }, 'keyup');
      expect(harness.onData).not.toHaveBeenCalled();

      // A press released outside the terminal leaves nothing for a later press
      // the app claims to inherit.
      harness.key(input, { key: 'd', code: 'KeyD' });
      input.dispatchEvent(new Event('blur'));
      harness.key(window, { key: 'd', code: 'KeyD' }, 'keyup');
      harness.key(window, { key: 'd', code: 'KeyD' });
      input.focus();
      harness.key(input, { key: 'd', code: 'KeyD' }, 'keyup');
      expect(harness.onData.mock.calls).toEqual([['\x1b[100u']]);

      // A key held through a focus round trip keeps its release, even when the
      // app claims a later repeat.
      harness.onData.mockClear();
      harness.key(input, { key: 'e', code: 'KeyE' });
      input.dispatchEvent(new Event('blur'));
      input.focus();
      claimRepeat = true;
      harness.key(input, { key: 'e', code: 'KeyE', repeat: true });
      harness.key(input, { key: 'e', code: 'KeyE' }, 'keyup');
      expect(harness.onData.mock.calls).toEqual([['\x1b[101u'], ['\x1b[101;1:3u']]);
    });

    it('commits IME text once and ignores the follow-up input event', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      const input = surface.input!;

      input.dispatchEvent(new Event('compositionstart'));
      input.value = 'に';
      input.dispatchEvent(Object.assign(new Event('input'), { isComposing: true, data: 'に' }));
      input.dispatchEvent(Object.assign(new Event('compositionend'), { data: 'に' }));
      input.value = 'に';
      input.dispatchEvent(
        Object.assign(new Event('input'), {
          isComposing: false,
          data: 'に',
          inputType: 'insertFromComposition'
        })
      );
      expect(harness.onData.mock.calls).toEqual([['に']]);
    });

    it('returns a reader in scrollback to the live screen on input', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      surface.write(Array.from({ length: 30 }, (_, index) => `line ${index}`).join('\r\n'));
      harness.flushFrame();
      harness.canvas.dispatchEvent(
        Object.assign(new Event('wheel', { cancelable: true }), { deltaY: -64, deltaMode: 0 })
      );
      expect(GhosttyTerminalCore.prototype.isViewportActive.call(coreOf(surface))).toBe(false);

      harness.key(surface.input!, { key: 'a', code: 'KeyA' });
      expect(GhosttyTerminalCore.prototype.isViewportActive.call(coreOf(surface))).toBe(true);
    });
  });

  describe('clipboard', () => {
    it('parks a settled selection in the input for the copy event', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      surface.write('hello world');
      harness.flushFrame();
      harness.select(5);
      expect(surface.getSelection()).toBe('hello');
      expect(surface.input!.value).toBe('hello');

      const { event, setData } = harness.clipboardEvent(surface.input!, 'copy');
      expect(setData).toHaveBeenCalledWith('text/plain', 'hello');
      expect(event.defaultPrevented).toBe(true);
    });

    it('ends the selection and its parked copy when typing goes to the shell', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      surface.write('hello world');
      harness.flushFrame();
      harness.select(5);

      harness.key(surface.input!, { key: 'x', code: 'KeyX' });
      expect(surface.getSelection()).toBe('');
      expect(surface.input!.value).toBe('');
      expect(harness.onData).toHaveBeenCalledWith('x');
    });

    it('pastes text a host read itself as a paste event would', async () => {
      const harness = createHarness();
      const surface = await harness.create();

      surface.paste('ls -la\n');
      surface.write('\x1b[?2004h');
      surface.paste('echo hi\n');
      surface.paste('');
      expect(harness.onData.mock.calls).toEqual([['ls -la\r'], ['\x1b[200~echo hi\n\x1b[201~']]);
    });

    it('cancels a cut, so the selection and its parked copy stay', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      surface.write('hello world');
      harness.flushFrame();
      harness.select(5);

      const cut = new Event('cut', { cancelable: true });
      surface.input!.dispatchEvent(cut);
      expect(cut.defaultPrevented).toBe(true);
      expect(surface.input!.value).toBe('hello');
      expect(surface.getSelection()).toBe('hello');
      expect(harness.onData).not.toHaveBeenCalled();
    });

    it('pastes plain text, bracketed once the program asks for it', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      const input = surface.input!;

      expect(harness.clipboardEvent(input, 'paste', 'ls -la\n').event.defaultPrevented).toBe(true);
      surface.write('\x1b[?2004h');
      harness.clipboardEvent(input, 'paste', 'echo hi\n');
      expect(harness.onData.mock.calls).toEqual([['ls -la\r'], ['\x1b[200~echo hi\n\x1b[201~']]);
    });
  });

  describe('read-only', () => {
    it('has no input, draws no cursor, and sends nothing', async () => {
      const harness = createHarness();
      const surface = await harness.create({ readOnly: true });
      expect(surface.input).toBeNull();
      expect(harness.mount.children.map((child) => child.className)).toEqual([
        'terminal-canvas',
        'terminal-copy-buffer',
        'terminal-scrollbar'
      ]);

      surface.focus();
      surface.write('ready\x1b[5n');
      harness.flushFrame();
      expect(harness.renderedSnapshot).toMatchObject({ cursorX: 5, cursorVisible: true });
      // A block cursor at column 5 would fill [44, 4, 8, 16].
      expect(harness.paint.mock.calls).not.toContainEqual(['fillRect', [44, 4, 8, 16]]);

      harness.key(harness.mount, { key: 'a', code: 'KeyA' });
      harness.canvas.dispatchEvent(
        Object.assign(new Event('wheel', { cancelable: true }), { deltaY: 64, deltaMode: 0 })
      );
      expect(harness.onData).not.toHaveBeenCalled();
    });

    it('pastes nothing and cuts nothing', async () => {
      const harness = createHarness();
      const surface = await harness.create({ readOnly: true });

      surface.paste('ls\n');
      harness.clipboardEvent(harness.mount, 'paste', 'ls\n');
      const cut = new Event('cut', { cancelable: true });
      harness.mount.dispatchEvent(cut);
      expect(cut.defaultPrevented).toBe(true);
      expect(harness.onData).not.toHaveBeenCalled();
    });

    it('selects and copies through a hidden copy buffer', async () => {
      const harness = createHarness();
      const surface = await harness.create({ readOnly: true });
      surface.write('hello world');
      harness.flushFrame();
      harness.select(5);

      const buffer = harness.mount.children[1]!;
      expect(buffer.textContent).toBe('hello');
      expect(harness.documentSelection.selectAllChildren).toHaveBeenCalledWith(buffer);
      const { event, setData } = harness.clipboardEvent(harness.mount, 'copy');
      expect(setData).toHaveBeenCalledWith('text/plain', 'hello');
      expect(event.defaultPrevented).toBe(true);

      surface.clearSelection();
      expect(buffer.textContent).toBe('');
    });
  });

  describe('secondary click', () => {
    it('asks the host for its menu and keeps the selection for its Copy', async () => {
      const harness = createHarness();
      const onContextMenu = vi.fn();
      const surface = await harness.create({ onContextMenu });
      surface.write('hello world');
      harness.flushFrame();
      harness.select(5);

      expect(harness.press('pointerdown', { button: 2, buttons: 2 }).defaultPrevented).toBe(false);
      const mousedown = harness.press('mousedown', { button: 2, buttons: 2 });
      expect(mousedown.defaultPrevented).toBe(true);
      const menu = Object.assign(new Event('contextmenu', { cancelable: true }), {
        clientX: 13,
        clientY: 5
      });
      harness.canvas.dispatchEvent(menu);
      harness.press('pointerup', { button: 2, buttons: 0 });
      expect(menu.defaultPrevented).toBe(true);
      expect(onContextMenu).toHaveBeenCalledWith({ clientX: 13, clientY: 5 });

      // A Control-click is the same click, never a press that ends the selection.
      harness.press('pointerdown', { button: 0, buttons: 1, ctrlKey: true });
      harness.press('pointermove', { button: -1, buttons: 1, ctrlKey: true });
      harness.press('pointerup', { button: 0, buttons: 0, ctrlKey: true });
      expect(surface.getSelection()).toBe('hello');
      expect(surface.input!.value).toBe('hello');
      expect(harness.onData).not.toHaveBeenCalled();
    });

    it('keeps the right button from a program tracking the mouse', async () => {
      const harness = createHarness();
      const onContextMenu = vi.fn();
      const surface = await harness.create({ onContextMenu });
      surface.write('\x1b[?1003h\x1b[?1006h');
      harness.flushFrame();

      harness.press('pointerdown', { button: 2, buttons: 2 });
      harness.press('pointermove', { button: -1, buttons: 2 });
      harness.press('pointerup', { button: 2, buttons: 0 });
      harness.canvas.dispatchEvent(
        Object.assign(new Event('contextmenu', { cancelable: true }), { clientX: 13, clientY: 5 })
      );
      expect(harness.onData).not.toHaveBeenCalled();
      expect(onContextMenu).toHaveBeenCalledOnce();

      // The primary button still goes to the program.
      harness.press('pointerdown', { button: 0, buttons: 1 });
      expect(harness.onData).toHaveBeenCalledWith('\x1b[<0;2;1M');
    });

    it('opens the menu from a read-only terminal too', async () => {
      const harness = createHarness();
      const onContextMenu = vi.fn();
      await harness.create({ readOnly: true, onContextMenu });

      harness.canvas.dispatchEvent(
        Object.assign(new Event('contextmenu', { cancelable: true }), { clientX: 1, clientY: 2 })
      );
      expect(onContextMenu).toHaveBeenCalledWith({ clientX: 1, clientY: 2 });
    });
  });

  describe('links', () => {
    it('opens a web link only on a Command-click', async () => {
      const harness = createHarness();
      const onLinkActivate = vi.fn();
      const surface = await harness.create({ onLinkActivate });
      surface.write('https://example.com');
      harness.flushFrame();

      harness.pointer('pointerdown', 5, 1);
      harness.pointer('pointerup', 5, 0);
      expect(onLinkActivate).not.toHaveBeenCalled();

      harness.pointer('pointerdown', 5, 1, { metaKey: true });
      harness.pointer('pointermove', 6, 1, { metaKey: true });
      harness.pointer('pointerup', 6, 0, { metaKey: true });
      expect(onLinkActivate).toHaveBeenCalledOnce();
      expect(onLinkActivate.mock.calls[0]?.[0]).toBe('https://example.com');
    });

    it('starts a selection when a Command-press on a link drags', async () => {
      const harness = createHarness();
      const onLinkActivate = vi.fn();
      const surface = await harness.create({ onLinkActivate });
      surface.write('https://example.com');
      harness.flushFrame();

      harness.pointer('pointerdown', 5, 1, { metaKey: true });
      harness.pointer('pointermove', 37, 1, { metaKey: true });
      harness.pointer('pointerup', 37, 0, { metaKey: true });

      expect(onLinkActivate).not.toHaveBeenCalled();
      expect(surface.getSelection()).toBe('https');
    });

    it('does not activate a link replaced before pointer release', async () => {
      const harness = createHarness();
      const onLinkActivate = vi.fn();
      const surface = await harness.create({ onLinkActivate });
      surface.write('https://first.example');
      harness.flushFrame();

      harness.pointer('pointerdown', 5, 1, { metaKey: true });
      surface.write('\x1b[2J\x1b[Hhttps://second.example');
      harness.flushFrame();
      harness.pointer('pointerup', 5, 0, { metaKey: true });

      expect(onLinkActivate).not.toHaveBeenCalled();
    });

    it('leaves links inert without a handler', async () => {
      const harness = createHarness();
      const surface = await harness.create();
      surface.write('https://example.com');
      harness.flushFrame();

      harness.pointer('pointermove', 5, 0, { metaKey: true });
      expect(harness.canvas.style['cursor']).toBe('');
    });
  });
});

/** The surface's private core, for assertions about Ghostty state the surface does not expose. */
function coreOf(surface: GhosttyTerminalSurface): GhosttyTerminalCore {
  return (surface as unknown as { core: GhosttyTerminalCore }).core;
}

describe('terminal font resolution', () => {
  it('falls back to the default stack for an empty request', () => {
    expect(terminalFontFamily()).toBe(DEFAULT_TERMINAL_FONT_FAMILY);
    expect(terminalFontFamily(' , ')).toBe(DEFAULT_TERMINAL_FONT_FAMILY);
  });

  it('refuses a proportional face the cell grid cannot lay out', async () => {
    vi.resetModules();
    const widths: Record<string, number> = { i: 4, M: 12 };
    vi.spyOn(document, 'createElement').mockReturnValue({
      getContext: () => ({
        font: '',
        measureText: (glyph: string) => ({ width: widths[glyph] ?? 8 })
      })
    } as unknown as HTMLElement);
    const fresh = await import('./surface.js');
    expect(fresh.terminalFontFamily('Helvetica Neue')).toBe(DEFAULT_TERMINAL_FONT_FAMILY);
  });
});
