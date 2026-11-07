import { afterEach, describe, expect, it, vi } from 'vitest';

import { serveFileUrls } from '../../../test/fileFetch.js';

import {
  GHOSTTY_BUDGETED_TERMINALS,
  GHOSTTY_CELL_WIDE,
  GhosttyTerminalCore,
  ghosttyCellText,
  ghosttyPageRows
} from './core.js';
import type { GhosttyColor } from './core.js';
import { GhosttyRuntime, loadGhosttyRuntime } from './runtime.js';

serveFileUrls();

function codepointView(codepoints: ReadonlyArray<number>): DataView {
  const view = new DataView(new ArrayBuffer(codepoints.length * 4));
  codepoints.forEach((codepoint, index) => view.setUint32(index * 4, codepoint, true));
  return view;
}

describe('ghosttyCellText', () => {
  it('converts oversized grapheme clusters without hitting engine spread limits', () => {
    // The engine caps a cell's cluster well below this, but the conversion
    // must not depend on that cap: spreading this many arguments into
    // String.fromCodePoint once overflows the call stack.
    const graphemeLength = 130_000;
    const view = new DataView(new ArrayBuffer(graphemeLength * 4));
    for (let index = 0; index < graphemeLength; index += 1) {
      view.setUint32(index * 4, index === 0 ? 'a'.codePointAt(0)! : 0x301, true);
    }
    const text = ghosttyCellText(view, graphemeLength);
    expect(text.length).toBe(graphemeLength);
    expect(text.codePointAt(0)).toBe('a'.codePointAt(0));
    expect(text.codePointAt(1)).toBe(0x301);
    expect(text.codePointAt(graphemeLength - 1)).toBe(0x301);
  });

  it('converts small clusters including astral codepoints', () => {
    const text = ghosttyCellText(codepointView([0x1f642, 0x20e3]), 2);
    expect([...text]).toEqual(['\u{1F642}', '\u{20E3}']);
  });

  it('converts a single astral codepoint', () => {
    expect(ghosttyCellText(codepointView([0x1f642]), 1)).toBe('🙂');
  });

  it('returns an empty string for empty cells', () => {
    expect(ghosttyCellText(codepointView([]), 0)).toBe('');
  });
});

describe('GhosttyTerminalCore snapshots', () => {
  const cores = new Set<GhosttyTerminalCore>();

  const defaultTheme = {
    foreground: { r: 255, g: 255, b: 255 },
    background: { r: 0, g: 0, b: 0 },
    cursor: { r: 255, g: 255, b: 255 }
  };

  async function createCore(onData: (data: string) => void = () => {}) {
    const core = await GhosttyTerminalCore.create(12, 3, 8, 16, defaultTheme, 1_000, onData);
    cores.add(core);
    return core;
  }

  afterEach(() => {
    for (const core of cores) core.dispose();
    cores.clear();
    vi.restoreAllMocks();
  });

  it('preserves styles, wide cells, and selection after shared memory grows', async () => {
    const core = await createCore();
    const runtime = await loadGhosttyRuntime();
    const grapheme = `e${'\u0301'.repeat(64)}`;
    core.write(`\x1b[1;3;4;8;9;53;38;2;123;45;67;48;2;9;8;7m${grapheme}\x1b[0m界🙂`);
    const cells = core.snapshot().rowData[0]!.cells;
    expect(cells[0]).toEqual({
      text: grapheme,
      wide: 0,
      foreground: { r: 123, g: 45, b: 67 },
      background: { r: 9, g: 8, b: 7 },
      bold: true,
      italic: true,
      invisible: true,
      strikethrough: true,
      overline: true,
      underline: true,
      selected: false
    });
    expect(cells.slice(1, 5).map(({ text, wide }) => ({ text, wide }))).toEqual([
      { text: '界', wide: 0 },
      { text: '', wide: GHOSTTY_CELL_WIDE.spacerTail },
      { text: '🙂', wide: 0 },
      { text: '', wide: GHOSTTY_CELL_WIDE.spacerTail }
    ]);

    runtime.memory.grow(1);
    core.setSelection({ x: 0, y: 0 }, { x: 2, y: 0 });
    expect(core.snapshot().rowData[0]!.cells[0]).toEqual({ ...cells[0], selected: true });
    core.clearSelection();
    expect(core.snapshot().rowData[0]!.cells[0]).toEqual(cells[0]);

    core.resetAndWrite('\x1b[2;7;38;2;40;100;200;48;2;12;34;56mC\x1b[0m');
    expect(core.snapshot().rowData[0]!.cells[0]).toMatchObject({
      text: 'C',
      foreground: { r: 22, g: 59, b: 112 },
      background: { r: 40, g: 100, b: 200 },
      bold: false,
      underline: false,
      selected: false
    });
  });

  it('reuses a grown grapheme buffer and releases it on disposal', async () => {
    const core = await createCore();
    const runtime = await loadGhosttyRuntime();
    core.write('ASCII');
    core.snapshot();

    // The engine keeps up to 64 combining marks on a cell and drops the rest.
    const grapheme = `z${'\u0301'.repeat(64)}`;
    core.resetAndWrite(`${grapheme}X`);
    const alloc = vi.spyOn(runtime, 'alloc');
    const free = vi.spyOn(runtime, 'free');
    expect(
      core
        .snapshot()
        .rowData[0]!.cells.slice(0, 2)
        .map((cell) => cell.text)
    ).toEqual([grapheme, 'X']);
    expect(alloc).toHaveBeenCalledTimes(1);
    const allocation = alloc.mock.results[0]!;
    if (allocation.type !== 'return') throw new Error('Grapheme allocation did not return');
    const buffer = allocation.value;
    const capacity = alloc.mock.calls[0]![0];

    core.write('\rQ\u0301');
    alloc.mockClear();
    expect(core.snapshot().rowData[0]!.cells[0]!.text).toBe('Q\u0301');
    expect(alloc).not.toHaveBeenCalled();
    core.dispose();
    expect(free).toHaveBeenCalledWith(buffer, capacity);
  });

  it('parses output split anywhere, inside escape sequences and UTF-8 alike', async () => {
    const [core, reference] = await Promise.all([createCore(), createCore()]);
    const inputs = [
      `${'a'.repeat(16_383)}🙂`,
      '\x1b[3',
      '1m',
      'e',
      '\u0301界🙂',
      '\x1b[0',
      'm\r\n',
      '\x1b]8;;https://example.com\x1b',
      '\\link',
      '\x1b]8;;\x1b',
      '\\\x1b[?1049h',
      'alternate',
      '\x1b[?1049l',
      '\r\nend'
    ];
    for (const data of inputs) core.write(data);
    // Byte-level splits of a multi-byte character survive too.
    const bytes = new TextEncoder().encode('\r\n界');
    core.write(bytes.subarray(0, 3));
    core.write(bytes.subarray(3));

    reference.write(`${inputs.join('')}\r\n界`);
    expect(core.snapshot()).toEqual(reference.snapshot());
  });

  it('answers live VT queries and replays history without answering it', async () => {
    const replies: string[] = [];
    const core = await createCore((data) => replies.push(data));
    core.write('\x1b[5n');
    expect(replies).toEqual(['\x1b[0n']);

    replies.length = 0;
    core.resetAndWrite('old output\x1b[5n\x1b[6n');
    expect(replies).toEqual([]);
    expect(core.snapshot().rowData[0]?.text).toBe('old output');
    core.write('\x1b[5n');
    expect(replies).toEqual(['\x1b[0n']);
  });

  it('answers color queries with the theme colors and the query terminator', async () => {
    const replies: string[] = [];
    const core = await createCore((data) => replies.push(data));
    core.setTheme({
      foreground: { r: 0x12, g: 0x34, b: 0x56 },
      background: { r: 0xef, g: 0xee, b: 0xed },
      cursor: { r: 0x01, g: 0x02, b: 0x03 }
    });
    core.write('\x1b]11;?\x1b\\');
    core.write('\x1b]10;?\x07');
    core.write('\x1b]12;?\x07');
    // OSC 10 with more fields asks for the background and cursor in turn.
    core.write('\x1b]10;?;?;?\x07');
    expect(replies).toEqual([
      '\x1b]11;rgb:efef/eeee/eded\x1b\\',
      '\x1b]10;rgb:1212/3434/5656\x07',
      '\x1b]12;rgb:0101/0202/0303\x07',
      '\x1b]10;rgb:1212/3434/5656\x07\x1b]11;rgb:efef/eeee/eded\x07\x1b]12;rgb:0101/0202/0303\x07'
    ]);
  });

  it('answers a color query before the DA1 query that follows it', async () => {
    const replies: string[] = [];
    const core = await createCore((data) => replies.push(data));
    core.write('\x1b[5n\x1b]11;?\x1b\\\x1b[c');
    expect(replies).toEqual(['\x1b[0n', '\x1b]11;rgb:0000/0000/0000\x1b\\', '\x1b[?62;22c']);
  });

  it('answers a query split a byte at a time exactly once', async () => {
    const replies: string[] = [];
    const core = await createCore((data) => replies.push(data));
    for (const byte of new TextEncoder().encode('界\x1b]11;?\x1b\\\x1b[c')) {
      core.write(new Uint8Array([byte]));
    }
    expect(replies).toEqual(['\x1b]11;rgb:0000/0000/0000\x1b\\', '\x1b[?62;22c']);
  });

  it("reports a program's own colors and the palette", async () => {
    const replies: string[] = [];
    const core = await createCore((data) => replies.push(data));
    const palette: GhosttyColor[] = Array.from({ length: 256 }, (_, index) =>
      index === 196 ? { r: 0xab, g: 0xcd, b: 0xef } : { r: 0, g: 0, b: 0 }
    );
    core.setTheme({ ...defaultTheme, palette });
    core.write('\x1b]11;rgb:12/34/56\x1b\\\x1b]11;?\x07');
    core.write('\x1b]4;196;?;1;rgb:01/02/03;1;?\x1b\\');
    expect(replies).toEqual([
      '\x1b]11;rgb:1212/3434/5656\x07',
      '\x1b]4;196;rgb:abab/cdcd/efef\x1b\\\x1b]4;1;rgb:0101/0202/0303\x1b\\'
    ]);
  });

  it('replays history without answering its color queries', async () => {
    const replies: string[] = [];
    const core = await createCore((data) => replies.push(data));
    core.resetAndWrite('old\x1b]11;?\x07\x1b]4;1;?\x1b\\');
    expect(replies).toEqual([]);
    core.write('\x1b]11;?\x07');
    expect(replies).toEqual(['\x1b]11;rgb:0000/0000/0000\x07']);
  });

  it('reports the color a query names before a set that follows it in the same OSC', async () => {
    const replies: string[] = [];
    const core = await createCore((data) => replies.push(data));
    const palette: GhosttyColor[] = Array.from({ length: 256 }, () => ({ r: 0, g: 0, b: 0 }));
    core.setTheme({ ...defaultTheme, palette });
    core.write('\x1b]4;1;?;1;#123456\x07\x1b]4;1;?\x07');
    expect(replies).toEqual(['\x1b]4;1;rgb:0000/0000/0000\x07', '\x1b]4;1;rgb:1212/3434/5656\x07']);
  });

  it("answers a color scheme query from the theme background's luminance", async () => {
    const replies: string[] = [];
    const core = await createCore((data) => replies.push(data));
    core.write('\x1b[?996n');
    core.setTheme({ ...defaultTheme, background: { r: 0xef, g: 0xf1, b: 0xf5 } });
    core.write('\x1b[?996n');
    // A program's own background does not change the scheme the theme sets.
    core.write('\x1b]11;#000000\x07\x1b[?996n');
    core.resetAndWrite('\x1b[?996n');
    expect(replies).toEqual(['\x1b[?997;1n', '\x1b[?997;2n', '\x1b[?997;2n']);
  });

  it('reports a change of scheme to a program that enabled mode 2031, and only then', async () => {
    const replies: string[] = [];
    const core = await createCore((data) => replies.push(data));
    const light = { ...defaultTheme, background: { r: 0xef, g: 0xf1, b: 0xf5 } };
    const otherDark = { ...defaultTheme, background: { r: 0x1e, g: 0x1e, b: 0x2e } };
    core.setTheme(light);
    core.setTheme(defaultTheme);
    expect(replies).toEqual([]);

    core.write('\x1b[?2031h');
    core.setTheme(otherDark);
    core.setTheme(light);
    core.setTheme(light);
    core.setTheme(defaultTheme);
    expect(replies).toEqual(['\x1b[?997;2n', '\x1b[?997;1n']);

    replies.length = 0;
    core.write('\x1b[?2031l');
    core.setTheme(light);
    core.write('\x1b[?2031h');
    // A replay resets the mode with everything else.
    core.resetAndWrite('history');
    core.setTheme(defaultTheme);
    expect(replies).toEqual([]);
  });

  it('reads a background past one half luminance as light, and one below as dark', async () => {
    const replies: string[] = [];
    const core = await createCore((data) => replies.push(data));
    core.setTheme({ ...defaultTheme, background: { r: 0x80, g: 0x80, b: 0x80 } });
    core.write('\x1b[?996n');
    core.setTheme({ ...defaultTheme, background: { r: 0x7f, g: 0x7f, b: 0x7f } });
    core.write('\x1b[?996n');
    expect(replies).toEqual(['\x1b[?997;2n', '\x1b[?997;1n']);
  });

  it("routes each terminal's replies, scheme, and bell to that terminal alone", async () => {
    const create = async (theme: typeof defaultTheme) => {
      const replies: string[] = [];
      const onBell = vi.fn();
      const core = await GhosttyTerminalCore.create(
        12,
        3,
        8,
        16,
        theme,
        1_000,
        (data) => replies.push(data),
        onBell
      );
      cores.add(core);
      return { core, replies, onBell };
    };
    const dark = await create(defaultTheme);
    const light = await create({ ...defaultTheme, background: { r: 0xef, g: 0xf1, b: 0xf5 } });

    dark.core.write('\x1b[5n\x1b[?996n\x07');
    expect(dark.replies).toEqual(['\x1b[0n', '\x1b[?997;1n']);
    expect(dark.onBell).toHaveBeenCalledOnce();
    expect(light.replies).toEqual([]);
    expect(light.onBell).not.toHaveBeenCalled();

    light.core.write('\x1b[?996n');
    expect(light.replies).toEqual(['\x1b[?997;2n']);
    expect(dark.replies).toHaveLength(2);
  });

  it('copies a selection with soft wraps joined and trailing blanks trimmed', async () => {
    const core = await createCore();
    // Twelve columns wrap the line after "l".
    core.write('abcdefghijklmnop\r\nq   ');
    core.setSelection({ x: 0, y: 0 }, { x: 11, y: 2 });
    expect(core.selectionText()).toBe('abcdefghijklmnop\nq');
  });

  it('blinks the cursor from creation and keeps the blink through a replay', async () => {
    const core = await createCore();
    expect(core.snapshot().cursorBlinking).toBe(true);
    core.resetAndWrite('\x1b[2 qhistory');
    core.write('\x1b[0 q');
    expect(core.snapshot().cursorBlinking).toBe(true);
  });

  it('reads the application cursor keys and any-event mouse modes a program sets', async () => {
    const core = await createCore();
    expect(core.isApplicationCursorKeys()).toBe(false);
    expect(core.isMouseAnyEventTracking()).toBe(false);
    core.write('\x1b[?1h\x1b[?1003h');
    expect(core.isApplicationCursorKeys()).toBe(true);
    expect(core.isMouseAnyEventTracking()).toBe(true);
  });

  it('frees every handle and allocation it made, and hears no more effects, once disposed', async () => {
    const runtime = await loadGhosttyRuntime();
    const call = runtime.call.bind(runtime);
    const live = new Map<string, number>();
    const mismatched: string[] = [];
    vi.spyOn(runtime, 'call').mockImplementation((name, ...args) => {
      const result = call(name, ...args);
      const [first, second] = args as number[];
      if (name === 'ghostty_wasm_alloc') live.set(`alloc ${result >>> 0}`, first!);
      else if (name === 'ghostty_wasm_alloc_opaque') live.set(`slot ${result >>> 0}`, 0);
      else if (name === 'ghostty_wasm_free') {
        if (live.get(`alloc ${first}`) !== second) mismatched.push(`free ${first} (${second})`);
        live.delete(`alloc ${first}`);
      } else if (name === 'ghostty_wasm_free_opaque') live.delete(`slot ${first}`);
      else if (name.endsWith('_new') && result === 0) {
        live.set(`${name.slice(0, -'_new'.length)} ${runtime.readPointer(second!)}`, 0);
      } else if (name.endsWith('_free')) live.delete(`${name.slice(0, -'_free'.length)} ${first}`);
      return result;
    });

    const replies: string[] = [];
    const core = await createCore((data) => replies.push(data));
    core.write(`\x1b]8;;https://example.com\x1b\\z${'́'.repeat(8)}link\x1b]8;;\x1b\\\x1b[5n`);
    core.snapshot();
    core.setSelection({ x: 0, y: 0 }, { x: 3, y: 0 });
    core.selectionText();
    core.hyperlinkAt(1, 0);
    core.encodePaste('paste');
    core.resetAndWrite('replay');
    expect(live.size).toBeGreaterThan(0);

    const { effectsId } = core as unknown as { readonly effectsId: number };
    core.dispose();
    expect(mismatched).toEqual([]);
    expect([...live.keys()]).toEqual([]);

    // The trampoline the engine would call with the disposed terminal's userdata.
    const { exports, writePtyFunctionIndex } = runtime as unknown as {
      readonly exports: WebAssembly.Exports;
      readonly writePtyFunctionIndex: number;
    };
    const table = exports['__indirect_function_table'] as WebAssembly.Table;
    const writePty = table.get(writePtyFunctionIndex) as (...args: number[]) => void;
    const reply = runtime.alloc(5);
    runtime.bytes(reply, 5).set(new TextEncoder().encode('stale'));
    replies.length = 0;
    writePty(0, effectsId, reply, 5);
    runtime.free(reply, 5);
    expect(replies).toEqual([]);
  });

  it('answers a query after a large Kitty graphics APC once', async () => {
    const replies: string[] = [];
    const core = await createCore((data) => replies.push(data));
    core.write(`\x1b_Ga=T,f=100;${'QUJD'.repeat(1 << 20)}\x1b\\\x1b]11;?\x07\x1b[c`);
    expect(replies).toEqual(['\x1b]11;rgb:0000/0000/0000\x07', '\x1b[?62;22c']);
  });

  it('leaves other OSCs, long OSCs, and strings unanswered, and answers after them', async () => {
    const replies: string[] = [];
    const core = await createCore((data) => replies.push(data));
    core.write('\x1b]8;;https://example.com/?\x1b\\link\x1b]8;;\x1b\\');
    core.write('\x1b]0;11;?\x07\x1b]111;?\x07\x1b]11;\x07');
    core.write(`\x1b]11;${'x'.repeat(4_096)};?\x07`);
    // DCS and APC payloads carry the same bytes as data.
    core.write('\x1bP]11;?\x07\x1b\\');
    core.write('\x1b_G]11');
    core.write(';?\x07\x1b\\');
    expect(replies).toEqual([]);
    core.write('\x1b]11;?\x07');
    expect(replies).toEqual(['\x1b]11;rgb:0000/0000/0000\x07']);
  });

  it('rings the bell for a BEL the parser executes, never for one inside a string', async () => {
    const onBell = vi.fn();
    const core = await GhosttyTerminalCore.create(
      12,
      3,
      8,
      16,
      defaultTheme,
      1_000,
      () => {},
      onBell
    );
    cores.add(core);
    const rings = (...chunks: string[]): number => {
      onBell.mockClear();
      for (const chunk of chunks) core.write(chunk);
      return onBell.mock.calls.length;
    };

    // In ground state, and once per write however many ring in it.
    expect(rings('done\x07')).toBe(1);
    expect(rings('\x07\x07\x07')).toBe(1);
    expect(rings('\x07', '\x07')).toBe(2);
    // A control sequence executes a BEL in its middle, as xterm does.
    expect(rings('\x1b[3\x07m')).toBe(1);

    // BEL ends an OSC string (a title set) instead of ringing.
    expect(rings('\x1b]0;title\x07')).toBe(0);
    expect(rings('\x1b]2;title\x1b\\')).toBe(0);
    // A BEL inside an OSC ended by ST ends it there; the rest is text.
    expect(rings('\x1b]0;ti\x07tle\x1b\\')).toBe(0);
    // DCS, APC, PM, and SOS payloads carry BEL as data.
    expect(rings('\x1bP1$r\x07x\x1b\\')).toBe(0);
    expect(rings('\x1b_G\x07\x07\x1b\\')).toBe(0);
    expect(rings('\x1b^x\x07\x1b\\')).toBe(0);
    expect(rings('\x1bXx\x07\x1b\\')).toBe(0);

    // The parser keeps its state across writes, so a split string still holds its BEL.
    expect(rings('\x1b]0;ti', 'tle\x07')).toBe(0);
    expect(rings('\x1b]0;title\x1b', '\\', '\x07')).toBe(1);
    expect(rings('\x1bP', '1$r\x07', '\x1b\\')).toBe(0);
  });

  it('replays history without ringing its bells, and rings again after', async () => {
    const onBell = vi.fn();
    const core = await GhosttyTerminalCore.create(
      12,
      3,
      8,
      16,
      defaultTheme,
      1_000,
      () => {},
      onBell
    );
    cores.add(core);

    core.resetAndWrite('old\x07output\x07');
    expect(onBell).not.toHaveBeenCalled();
    core.write('\x07');
    expect(onBell).toHaveBeenCalledOnce();
  });

  it('applies a theme palette to ANSI, bright, and 256-color output', async () => {
    const core = await createCore();
    const palette: GhosttyColor[] = Array.from({ length: 256 }, (_, index) => ({
      r: index,
      g: 255 - index,
      b: 7
    }));
    core.setTheme({
      foreground: { r: 10, g: 20, b: 30 },
      background: { r: 40, g: 50, b: 60 },
      cursor: { r: 70, g: 80, b: 90 },
      palette
    });
    core.write('\x1b[31mR\x1b[94mB\x1b[38;5;196mX\x1b[0mD');
    const snapshot = core.snapshot();
    const cells = snapshot.rowData[0]!.cells;
    expect(cells.slice(0, 4).map((cell) => cell.foreground)).toEqual([
      palette[1],
      palette[12],
      palette[196],
      { r: 10, g: 20, b: 30 }
    ]);
    expect(snapshot.background).toEqual({ r: 40, g: 50, b: 60 });
    expect(() => core.setTheme({ ...defaultTheme, palette: palette.slice(0, 16) })).toThrow(
      /256 colors/
    );
  });

  it('follows output at the bottom and holds a reader who scrolled up', async () => {
    const core = await createCore();
    core.write(Array.from({ length: 20 }, (_, index) => `line ${index}`).join('\r\n'));
    expect(core.isViewportActive()).toBe(true);

    core.write('\r\nmore');
    expect(core.isViewportActive()).toBe(true);
    expect(core.snapshot().rowData.at(-1)?.text).toBe('more');

    core.scroll(-5);
    const held = core.scrollbarState();
    const viewport = core.snapshot().rowData.map((row) => row.text);
    // New lines, cursor moves, and erase-below on the live screen do not move
    // the reader.
    core.write('\r\nnew line\x1b[2A\x1b[J\x1b[H');
    expect(core.isViewportActive()).toBe(false);
    expect(core.scrollbarState()?.offset).toBe(held?.offset);
    expect(core.snapshot().rowData.map((row) => row.text)).toEqual(viewport);

    core.scrollToBottom();
    expect(core.isViewportActive()).toBe(true);
  });

  /** A terminal of `cols` by 24 cells that keeps `lines` rows of history. */
  async function createSized(cols: number, lines: number) {
    const core = await GhosttyTerminalCore.create(cols, 24, 8, 16, defaultTheme, lines, () => {});
    cores.add(core);
    return core;
  }
  /**
   * Writes `count` lines of at least `length` characters, short enough by
   * default for one row, a thousand at a time: one larger write would leave
   * a freed block that the 2 GiB test below would be handed again.
   */
  const fill = (core: GhosttyTerminalCore, count: number, length = 0) => {
    for (let first = 0; first < count; first += 1_000) {
      const batch = Math.min(1_000, count - first);
      core.write(
        Array.from(
          { length: batch },
          (_, index) => `${`line ${first + index}`.padEnd(length, '.')}\r\n`
        ).join('')
      );
    }
  };
  /** The rows of history above a 24-row screen. */
  const history = (core: GhosttyTerminalCore) => (core.scrollbarState()?.total ?? 0) - 24;

  it.each([
    { cols: 80, lines: 1_000 },
    { cols: 80, lines: 10_000 },
    { cols: 300, lines: 1_000 },
    { cols: 300, lines: 10_000 }
  ])(
    'keeps the chosen $lines lines at $cols columns, and at most a page more',
    async ({ cols, lines }) => {
      const core = await createSized(cols, lines);
      // Every count crosses the limit at a different point in a page.
      for (const count of [lines * 2, 97, 311, ghosttyPageRows(cols) - 1]) {
        fill(core, count);
        expect(history(core)).toBeGreaterThanOrEqual(lines);
        expect(history(core)).toBeLessThanOrEqual(lines + ghosttyPageRows(cols));
      }
    }
  );

  it.each([
    { from: 300, to: 80, length: 0 },
    { from: 80, to: 300, length: 0 },
    // One row each at 300 columns and two at 80, so the reflow adds rows.
    { from: 300, to: 80, length: 150 }
  ])(
    'follows a resize from $from to $to columns, lines of $length',
    async ({ from, to, length }) => {
      const lines = 5_000;
      const core = await createSized(from, lines);
      fill(core, lines * 2, length);

      core.resize(to, 24, 8, 16);
      // The reflow keeps every line the chosen length holds, then the limit
      // follows the new width's pages.
      expect(history(core)).toBeGreaterThanOrEqual(lines);
      expect(history(core)).toBeLessThanOrEqual(lines + ghosttyPageRows(to));
      for (const count of [lines * 2, 211]) {
        fill(core, count);
        expect(history(core)).toBeGreaterThanOrEqual(lines);
        expect(history(core)).toBeLessThanOrEqual(lines + ghosttyPageRows(to));
      }
    }
  );

  it('keeps the chosen lines once shown wide after opening hidden at a token width', async () => {
    const core = await createSized(2, 5_000);
    core.resize(300, 24, 8, 16);
    fill(core, 20_000);
    expect(history(core)).toBeGreaterThanOrEqual(5_000);
    expect(history(core)).toBeLessThanOrEqual(5_000 + ghosttyPageRows(300));
  });

  it('takes a new length while it runs', async () => {
    const core = await createSized(80, 10_000);
    fill(core, 20_000);
    expect(history(core)).toBeGreaterThanOrEqual(10_000);

    // A shorter length drops the oldest rows at once and keeps the newest.
    core.setScrollbackLines(1_000);
    expect(history(core)).toBeGreaterThanOrEqual(1_000);
    expect(history(core)).toBeLessThanOrEqual(1_000 + ghosttyPageRows(80));
    core.scroll(-history(core));
    expect(core.snapshot().rowData[0]?.text).toBe(`line ${20_000 - 24 - history(core) + 1}`);

    // A longer one keeps what comes next.
    core.setScrollbackLines(50_000);
    fill(core, 60_000);
    expect(history(core)).toBeGreaterThanOrEqual(50_000);
    expect(history(core)).toBeLessThanOrEqual(50_000 + ghosttyPageRows(80));
  });

  it('caps the history of one terminal so a full window stays within the shared memory', async () => {
    const runtime = await loadGhosttyRuntime();
    const call = runtime.call.bind(runtime);
    const budgets: number[] = [];
    vi.spyOn(runtime, 'call').mockImplementation((name, ...args) => {
      const [, option, value] = args as number[];
      // `GHOSTTY_TERMINAL_OPT_SCROLLBACK_MAX_BYTES`, read before the core frees it.
      if (name === 'ghostty_terminal_set' && option === 27) {
        budgets.push(runtime.view(value!, 4).getUint32(0, true));
      }
      return call(name, ...args);
    });
    await createSized(80, 1_000);
    expect(budgets).toHaveLength(1);
    const [budget = 0] = budgets;

    // Every budgeted terminal together, under 3 GiB of the wasm32 ceiling.
    expect(budget * GHOSTTY_BUDGETED_TERMINALS).toBeLessThanOrEqual(3 * 1024 ** 3);
    // Below about 445 columns, the 448 KiB pages of the longest history and
    // its screen fit under it.
    const pages = Math.ceil((50_000 + ghosttyPageRows(400)) / ghosttyPageRows(400)) + 1;
    expect(pages * 448 * 1024).toBeLessThanOrEqual(budget);
  });

  it('reads, writes, and replies at addresses past 2 GiB', async () => {
    // Several full histories put later allocations past 2 GiB, where the
    // module's i32 pointers read as negative numbers in JavaScript.
    const runtime = await loadGhosttyRuntime();
    runtime.memory.grow(Math.ceil((2 ** 31 - runtime.memory.buffer.byteLength) / 65_536));
    const high = runtime.alloc(1 << 20);
    expect(high).toBeGreaterThanOrEqual(2 ** 31);
    runtime.free(high, 1 << 20);

    const replies: string[] = [];
    const core = await createCore((data) => replies.push(data));
    core.write('high\x1b[5n');

    expect(
      core
        .snapshot()
        .rowData[0]!.cells.slice(0, 4)
        .map((cell) => cell.text)
    ).toEqual(['h', 'i', 'g', 'h']);
    expect(replies).toEqual(['\x1b[0n']);
    expect(core.encodePaste('paste')).toBe('paste');

    // A reply the module hands the PTY callback from a buffer past 2 GiB.
    const { terminal, effectsId } = core as unknown as {
      readonly terminal: number;
      readonly effectsId: number;
    };
    const { exports, writePtyFunctionIndex } = runtime as unknown as {
      readonly exports: WebAssembly.Exports;
      readonly writePtyFunctionIndex: number;
    };
    const table = exports['__indirect_function_table'] as WebAssembly.Table;
    const writePty = table.get(writePtyFunctionIndex) as (
      terminal: number,
      userdata: number,
      pointer: number,
      length: number
    ) => void;
    const reply = runtime.alloc(1 << 20);
    expect(reply).toBeGreaterThanOrEqual(2 ** 31);
    runtime.bytes(reply, 5).set(new TextEncoder().encode('reply'));
    writePty(terminal, effectsId, reply, 5);
    runtime.free(reply, 1 << 20);
    expect(replies).toEqual(['\x1b[0n', 'reply']);
  });

  it('parses 5 MB of mixed ANSI output in well under a second', async () => {
    const core = await createCore();
    core.resize(120, 40, 8, 16);
    // Shell-like traffic: colored prompts, ls-style columns, truecolor runs,
    // progress frames redrawn in place, wide glyphs, and plain log lines.
    const block = [
      '\x1b[1;32muser@host\x1b[0m:\x1b[1;34m~/project\x1b[0m$ ls --color\r\n',
      '\x1b[34mdist\x1b[0m  \x1b[32mbuild.sh\x1b[0m  README.md  \x1b[36mlink\x1b[0m\r\n',
      '\x1b[38;2;255;128;0mtruecolor\x1b[48;2;0;64;128m background\x1b[0m\r\n',
      'progress 42% [=========>          ]\r\x1b[2Kprogress 43% [==========>         ]\r\n',
      '日本語のテキスト 🙂 and some ascii after it\r\n',
      `${'log line with plain text and numbers 0123456789 '.repeat(2)}\r\n`
    ].join('');
    const target = 5 * 1024 * 1024;
    const chunk = block.repeat(Math.ceil((64 * 1024) / block.length));
    const chunks = Math.ceil(target / chunk.length);

    const started = performance.now();
    for (let index = 0; index < chunks; index += 1) core.write(chunk);
    core.snapshot();
    const elapsed = performance.now() - started;

    expect(chunks * chunk.length).toBeGreaterThanOrEqual(target);
    expect(elapsed).toBeLessThan(1_000);
  });
});

describe('GhosttyRuntime type manifest', () => {
  /** A module that exports only memory and a type manifest. */
  function runtimeFor(manifest: object): GhosttyRuntime {
    const memory = new WebAssembly.Memory({ initial: 1 });
    const json = new TextEncoder().encode(JSON.stringify(manifest));
    new Uint8Array(memory.buffer).set(json);
    const instance = { exports: { memory, ghostty_type_json: () => 0 } };
    const Runtime = GhosttyRuntime as unknown as new (instance: unknown) => GhosttyRuntime;
    return new Runtime(instance);
  }
  const wasm32 = { schema: 1, abi: { pointer_size: 4, usize_size: 4 }, types: {} };

  it('reads the wasm32 manifest schema it was written for', () => {
    expect(() => runtimeFor(wasm32)).not.toThrow();
  });

  it.each([
    { schema: 2 },
    { abi: { pointer_size: 8, usize_size: 4 } },
    { abi: { pointer_size: 4, usize_size: 8 } }
  ])('refuses a manifest it cannot read: %o', (change) => {
    expect(() => runtimeFor({ ...wasm32, ...change })).toThrow(/Unsupported libghostty-vt/);
  });
});
