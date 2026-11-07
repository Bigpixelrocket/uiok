import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ghosttyPageRows } from './core.js';
import { ghosttyKeyForCode } from './keyCodes.logic.js';

type WasmFunction = (...args: number[]) => number;

interface ManifestType {
  readonly kind: string;
  readonly size?: number;
  readonly values?: Readonly<Record<string, number>>;
}

/** The vendored folder, found from this file's path (a `new URL` here would be rewritten by Vite). */
const VENDOR = join(dirname(fileURLToPath(import.meta.url)), 'vendor');

/** A vendored file's bytes. */
function vendored(name: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(readFileSync(join(VENDOR, name)));
}

const wasmBytes = vendored('ghostty-vt.wasm');
const effectsWasmBytes = vendored('ghostty-effects.wasm');
const pinnedVersion = readFileSync(join(VENDOR, 'VERSION'), 'utf8');

/** `GHOSTTY_TERMINAL_OPT_SCROLLBACK_MAX_BYTES`. */
const OPTION_SCROLLBACK_MAX_BYTES = 27;
/** `GHOSTTY_TERMINAL_OPT_SCROLLBACK_MAX_LINES`. */
const OPTION_SCROLLBACK_MAX_LINES = 28;
/** `GHOSTTY_TERMINAL_DATA_SCROLLBACK_ROWS`. */
const DATA_SCROLLBACK_ROWS = 15;
/** `GHOSTTY_TERMINAL_DATA_MODE`. */
const DATA_MODE = 37;

/** A fresh instance of the vendored engine and the raw calls these tests make. */
async function loadEngine() {
  const result = await WebAssembly.instantiate(wasmBytes.buffer, {});
  const instance = result instanceof WebAssembly.Instance ? result : result.instance;
  const memory = instance.exports.memory as WebAssembly.Memory;
  const call = (name: string, ...args: number[]) =>
    (instance.exports[name] as WasmFunction)(...args);
  const alloc = (size: number) => call('ghostty_wasm_alloc', size);
  const free = (pointer: number, size: number) => call('ghostty_wasm_free', pointer, size);
  /** Sets a terminal option that takes a `size_t*`. */
  const setSizeOption = (terminal: number, option: number, size: number) => {
    const value = alloc(4);
    new DataView(memory.buffer, value, 4).setUint32(0, size, true);
    expect(call('ghostty_terminal_set', terminal, option, value)).toBe(0);
    free(value, 4);
  };
  /** Creates a terminal, optionally with a history budget in bytes; returns it and its slot. */
  const newTerminal = (cols: number, rows: number, scrollbackBytes?: number) => {
    const slot = call('ghostty_wasm_alloc_opaque');
    expect(call('ghostty_terminal_new', 0, slot, cols, rows)).toBe(0);
    const terminal = new DataView(memory.buffer).getUint32(slot, true);
    if (scrollbackBytes !== undefined) {
      setSizeOption(terminal, OPTION_SCROLLBACK_MAX_BYTES, scrollbackBytes);
    }
    return { terminal, slot };
  };
  const freeTerminal = ({ terminal, slot }: { terminal: number; slot: number }) => {
    call('ghostty_terminal_free', terminal);
    call('ghostty_wasm_free_opaque', slot);
  };
  const write = (terminal: number, data: string) => {
    const bytes = new TextEncoder().encode(data);
    const pointer = alloc(bytes.length);
    new Uint8Array(memory.buffer, pointer, bytes.length).set(bytes);
    call('ghostty_terminal_vt_write', terminal, pointer, bytes.length);
    free(pointer, bytes.length);
  };
  /** Whether a DEC private mode is set, read through a `GhosttyTerminalModeConfig`. */
  const decMode = (terminal: number, mode: number) => {
    const config = alloc(4);
    const view = new DataView(memory.buffer, config, 4);
    view.setUint16(0, mode, true);
    view.setUint8(2, 0);
    expect(call('ghostty_terminal_get', terminal, DATA_MODE, config)).toBe(0);
    const value = new DataView(memory.buffer, config, 4).getUint8(2) !== 0;
    free(config, 4);
    return value;
  };
  return {
    instance,
    memory,
    call,
    alloc,
    free,
    setSizeOption,
    newTerminal,
    freeTerminal,
    write,
    decMode
  };
}

function readTypeManifest(memory: WebAssembly.Memory, pointer: number) {
  const bytes = new Uint8Array(memory.buffer, pointer);
  return JSON.parse(new TextDecoder().decode(bytes.subarray(0, bytes.indexOf(0)))) as {
    schema: number;
    abi: { pointer_size: number; usize_size: number };
    types: Record<string, ManifestType>;
  };
}

describe('vendored libghostty-vt WebAssembly', () => {
  it('stays pinned to the canonical revision and size budget', async () => {
    expect(wasmBytes.byteLength).toBeLessThan(900_000);

    // The artifact carries its own provenance: the build embeds the pinned
    // revision as semver build metadata, so the vendored VERSION
    // file is the single source of truth and drift is caught here without a copy.
    const { memory, call, alloc, free } = await loadEngine();
    const out = alloc(8);
    expect(call('ghostty_build_info', 10, out)).toBe(0);
    const view = new DataView(memory.buffer, out, 8);
    const embeddedRevision = new TextDecoder().decode(
      new Uint8Array(memory.buffer, view.getUint32(0, true), view.getUint32(4, true))
    );
    free(out, 8);
    expect(embeddedRevision).toBe(pinnedVersion.trim());
  });

  it('describes its ABI with the manifest schema and constants the adapter reads', async () => {
    const { memory, call } = await loadEngine();
    const manifest = readTypeManifest(memory, call('ghostty_type_json'));
    expect(manifest.schema).toBe(1);
    expect(manifest.abi).toMatchObject({ pointer_size: 4, usize_size: 4 });
    const values = (name: string) => manifest.types[name]?.values ?? {};

    // The adapter hardcodes these numbers; a re-vendored engine that moves one
    // fails here instead of reading the wrong data.
    expect(values('GhosttyTerminalOption')).toMatchObject({
      USERDATA: 0,
      WRITE_PTY: 1,
      BELL: 2,
      COLOR_SCHEME: 7,
      COLOR_FOREGROUND: 11,
      COLOR_BACKGROUND: 12,
      COLOR_CURSOR: 13,
      COLOR_PALETTE: 14,
      SELECTION: 21,
      DEFAULT_CURSOR_BLINK: 23,
      SCROLLBACK_MAX_BYTES: OPTION_SCROLLBACK_MAX_BYTES,
      SCROLLBACK_MAX_LINES: OPTION_SCROLLBACK_MAX_LINES,
      MODE: 34
    });
    expect(values('GhosttyTerminalData')).toMatchObject({
      CURSOR_Y: 4,
      ACTIVE_SCREEN: 6,
      SCROLLBAR: 9,
      MOUSE_TRACKING: 11,
      SCROLLBACK_ROWS: DATA_SCROLLBACK_ROWS,
      VIEWPORT_ACTIVE: 32,
      MODE: DATA_MODE
    });
    expect(values('GhosttyRenderStateData')).toMatchObject({
      COLS: 1,
      ROWS: 2,
      DIRTY: 3,
      ROW_ITERATOR: 4,
      COLOR_BACKGROUND: 5,
      COLOR_FOREGROUND: 6,
      COLOR_CURSOR: 7,
      COLOR_CURSOR_HAS_VALUE: 8,
      CURSOR_VISUAL_STYLE: 10,
      CURSOR_VISIBLE: 11,
      CURSOR_BLINKING: 12,
      CURSOR_VIEWPORT_HAS_VALUE: 14,
      CURSOR_VIEWPORT_X: 15,
      CURSOR_VIEWPORT_Y: 16
    });
    expect(values('GhosttyRenderStateRowData')).toMatchObject({ DIRTY: 1, RAW: 2, CELLS: 3 });
    expect(values('GhosttyRenderStateRowCellsData')).toMatchObject({
      RAW: 1,
      STYLE: 2,
      GRAPHEMES_LEN: 3,
      GRAPHEMES_BUF: 4,
      BG_COLOR: 5,
      FG_COLOR: 6,
      SELECTED: 7
    });
    expect(values('GhosttyRowData')).toMatchObject({ WRAP: 1, WRAP_CONTINUATION: 2 });
    expect(values('GhosttyCellData')).toMatchObject({ WIDE: 3 });
    expect(values('GhosttyCellWide')).toMatchObject({
      NARROW: 0,
      WIDE: 1,
      SPACER_TAIL: 2,
      SPACER_HEAD: 3
    });
    expect(values('GhosttyMouseEncoderOption')).toMatchObject({
      SIZE: 2,
      ANY_BUTTON_PRESSED: 3,
      TRACK_LAST_CELL: 4
    });
    expect(values('GhosttyColorScheme')).toMatchObject({ LIGHT: 0, DARK: 1 });
    expect(values('GhosttyTerminalScrollViewportTag')).toMatchObject({ BOTTOM: 1, DELTA: 2 });
    expect(values('GhosttyPointTag')).toMatchObject({ VIEWPORT: 1, SCREEN: 2 });
    expect(manifest.types['GhosttyTerminalModeConfig']?.size).toBe(4);
  });

  it('creates, writes multi-codepoint graphemes, and frees repeated terminals', async () => {
    const { newTerminal, freeTerminal, write } = await loadEngine();
    for (let iteration = 0; iteration < 25; iteration += 1) {
      const handle = newTerminal(80, 24, 5_000);
      write(handle.terminal, 'e\u0301 👨‍👩‍👧‍👦 العربية\r\n');
      freeTerminal(handle);
    }
  });

  it('blinks the default cursor until a program asks for a steady one', async () => {
    const { memory, call, alloc, free, newTerminal, freeTerminal, write } = await loadEngine();
    const handle = newTerminal(80, 24);
    const { terminal } = handle;
    const renderStateSlot = call('ghostty_wasm_alloc_opaque');
    expect(call('ghostty_render_state_new', 0, renderStateSlot)).toBe(0);
    const renderState = new DataView(memory.buffer).getUint32(renderStateSlot, true);
    const scratch = alloc(4);

    const blinking = () => {
      expect(call('ghostty_render_state_update', renderState, terminal)).toBe(0);
      expect(call('ghostty_render_state_get', renderState, 12, scratch)).toBe(0);
      return new DataView(memory.buffer, scratch, 4).getUint8(0) !== 0;
    };
    const setDefaultCursorBlink = (blink: boolean) => {
      const value = alloc(1);
      new Uint8Array(memory.buffer, value, 1)[0] = blink ? 1 : 0;
      expect(call('ghostty_terminal_set', terminal, 23, value)).toBe(0);
      free(value, 1);
    };

    // Ghostty's own default is a steady cursor, so the blink the web terminal
    // inherited from xterm.js only exists because option 23 asks for it.
    expect(blinking()).toBe(false);
    setDefaultCursorBlink(true);
    expect(blinking()).toBe(true);

    // Programs still own the cursor: DECSCUSR steady block and DEC mode 12 both
    // stop the blink, and DECSCUSR reset returns to the embedder default.
    write(terminal, '\u001b[2 q');
    expect(blinking()).toBe(false);
    write(terminal, '\u001b[0 q');
    expect(blinking()).toBe(true);
    write(terminal, '\u001b[?12l');
    expect(blinking()).toBe(false);
    write(terminal, '\u001b[?12h');
    expect(blinking()).toBe(true);

    // RIS returns to the embedder's default, so a session replay keeps the blink.
    write(terminal, '\u001b[2 q');
    call('ghostty_terminal_reset', terminal);
    expect(blinking()).toBe(true);

    free(scratch, 4);
    call('ghostty_render_state_free', renderState);
    call('ghostty_wasm_free_opaque', renderStateSlot);
    freeTerminal(handle);
  });

  it("reports and scrolls the viewport with Ghostty's scrollbar state", async () => {
    const { memory, call, alloc, free, newTerminal, freeTerminal, write } = await loadEngine();
    const handle = newTerminal(80, 10, 1_000);
    const { terminal } = handle;
    write(terminal, Array.from({ length: 50 }, (_, index) => `${index + 1}\r\n`).join(''));

    const scrollbar = alloc(24);
    const scrollbarView = () => new DataView(memory.buffer, scrollbar, 24);
    expect(call('ghostty_terminal_get', terminal, 9, scrollbar)).toBe(0);
    expect([0, 8, 16].map((offset) => Number(scrollbarView().getBigUint64(offset, true)))).toEqual([
      51, 41, 10
    ]);

    const scroll = alloc(24);
    const scrollView = new DataView(memory.buffer, scroll, 24);
    scrollView.setUint32(0, 2, true);
    scrollView.setInt32(8, -5, true);
    call('ghostty_terminal_scroll_viewport', terminal, scroll);
    expect(call('ghostty_terminal_get', terminal, 9, scrollbar)).toBe(0);
    expect(Number(scrollbarView().getBigUint64(8, true))).toBe(36);

    free(scroll, 24);
    free(scrollbar, 24);
    freeTerminal(handle);
  });

  // Fills a page of history at each of 329 widths in the engine: seconds of WebAssembly on a busy machine.
  it('holds the rows a page that ghosttyPageRows predicts at every width', async () => {
    const { memory, call, alloc, free, setSizeOption, newTerminal, freeTerminal } =
      await loadEngine();
    const newline = alloc(3);
    new Uint8Array(memory.buffer, newline, 3).set(new TextEncoder().encode('x\r\n'));
    const history = alloc(4);
    const historyRows = (terminal: number) => {
      expect(call('ghostty_terminal_get', terminal, DATA_SCROLLBACK_ROWS, history)).toBe(0);
      return new DataView(memory.buffer, history, 4).getUint32(0, true);
    };
    // Under the smallest line limit the engine allows, one page, history
    // grows until the first page is wholly history and one more row arrives;
    // the engine then drops that page, so the most it held is one page.
    const pageRows = (cols: number) => {
      const handle = newTerminal(cols, 2);
      setSizeOption(handle.terminal, OPTION_SCROLLBACK_MAX_BYTES, 2 ** 31);
      setSizeOption(handle.terminal, OPTION_SCROLLBACK_MAX_LINES, 1);
      let most = 0;
      for (;;) {
        call('ghostty_terminal_vt_write', handle.terminal, newline, 3);
        const rows = historyRows(handle.terminal);
        if (rows < most) break;
        most = rows;
      }
      freeTerminal(handle);
      return most;
    };

    const widths = [
      ...Array.from({ length: 320 }, (_, index) => index + 1),
      ...[400, 445, 500, 640, 800, 1_000, 1_500, 2_000, 4_000]
    ];
    const measured = widths.map((cols) => [cols, pageRows(cols)]);
    expect(measured).toEqual(widths.map((cols) => [cols, ghosttyPageRows(cols)]));
    expect([80, 200, 300].map(ghosttyPageRows)).toEqual([673, 271, 181]);

    free(history, 4);
    free(newline, 3);
  }, 20_000);

  it('routes terminal effects through the shared callback table', async () => {
    const { instance, memory, call, alloc, free, newTerminal, freeTerminal, write, decMode } =
      await loadEngine();
    let reply = '';
    let bells = 0;
    let scheme: number | null = 1;
    const trampolineResult = await WebAssembly.instantiate(effectsWasmBytes.buffer, {
      env: {
        write_pty: (_terminal: number, _userdata: number, pointer: number, length: number) => {
          reply += new TextDecoder().decode(new Uint8Array(memory.buffer, pointer, length));
        },
        bell: () => {
          bells += 1;
        },
        color_scheme: (_terminal: number, _userdata: number, out: number) => {
          if (scheme === null) return false;
          new DataView(memory.buffer).setInt32(out, scheme, true);
          return true;
        }
      }
    });
    const trampolines =
      trampolineResult instanceof WebAssembly.Instance
        ? trampolineResult
        : trampolineResult.instance;
    const table = instance.exports.__indirect_function_table as WebAssembly.Table;
    const callbackIndex = (name: string) => {
      const index = table.length;
      table.grow(1);
      table.set(index, trampolines.exports[name] as CallableFunction);
      return index;
    };
    const writePty = callbackIndex('ghostty_write_pty');
    const bell = callbackIndex('ghostty_bell');
    const colorScheme = callbackIndex('ghostty_color_scheme');
    const handle = newTerminal(80, 24);
    const { terminal } = handle;
    call('ghostty_terminal_set', terminal, 0, 1);
    call('ghostty_terminal_set', terminal, 1, writePty);
    call('ghostty_terminal_set', terminal, 2, bell);
    call('ghostty_terminal_set', terminal, 7, colorScheme);

    write(terminal, '\u001b[5n');
    expect(reply).toBe('\u001b[0n');
    reply = '';
    call('ghostty_terminal_set', terminal, 1, 0);
    call('ghostty_terminal_set', terminal, 0, 0);
    write(terminal, '\u001b[5n');
    expect(reply).toBe('');
    call('ghostty_terminal_set', terminal, 0, 1);
    call('ghostty_terminal_set', terminal, 1, writePty);
    write(terminal, '\u001b[5n');
    expect(reply).toBe('\u001b[0n');

    write(terminal, '\u0007');
    expect(bells).toBe(1);

    // The engine answers CSI ? 996 n with whatever the callback fills in, and
    // nothing when it declines; it never reports a scheme on its own.
    reply = '';
    write(terminal, '\u001b[?996n');
    scheme = 0;
    write(terminal, '\u001b[?996n');
    scheme = null;
    write(terminal, '\u001b[?996n\u001b[?2031h');
    expect(reply).toBe('\u001b[?997;1n\u001b[?997;2n');
    expect(decMode(terminal, 2031)).toBe(true);

    // Color queries are the engine's own, in order with the replies around them;
    // a color with no default and no program override goes unreported.
    reply = '';
    write(terminal, '\u001b]11;?\u001b\\\u001b[c');
    expect(reply).toBe('\u001b[?62;22c');
    const background = alloc(3);
    new Uint8Array(memory.buffer, background, 3).set([0xef, 0xf1, 0xf5]);
    expect(call('ghostty_terminal_set', terminal, 12, background)).toBe(0);
    free(background, 3);
    reply = '';
    write(terminal, '\u001b]11;?\u001b\\\u001b[c');
    expect(reply).toBe('\u001b]11;rgb:efef/f1f1/f5f5\u001b\\\u001b[?62;22c');

    freeTerminal(handle);
  });

  it("formats the active selection with Ghostty's copy semantics", async () => {
    const { memory, call, alloc, free, newTerminal, freeTerminal, write } = await loadEngine();
    const handle = newTerminal(80, 24);
    const { terminal } = handle;
    write(terminal, 'a\r\n\r\nb');

    const selection = alloc(32);
    new Uint8Array(memory.buffer, selection, 32).fill(0);
    new DataView(memory.buffer, selection, 32).setUint32(0, 32, true);
    expect(call('ghostty_terminal_select_all', terminal, selection)).toBe(0);
    expect(call('ghostty_terminal_set', terminal, 21, selection)).toBe(0);
    const formatOptions = plainFormatOptions(memory, alloc);
    const written = alloc(4);
    expect(
      call('ghostty_terminal_selection_format_buf', terminal, formatOptions, 0, 0, written)
    ).toBe(-3);
    const outputSize = new DataView(memory.buffer, written, 4).getUint32(0, true);
    const output = alloc(outputSize);
    expect(
      call(
        'ghostty_terminal_selection_format_buf',
        terminal,
        formatOptions,
        output,
        outputSize,
        written
      )
    ).toBe(0);
    expect(new TextDecoder().decode(new Uint8Array(memory.buffer, output, outputSize))).toBe(
      'a\n\nb'
    );

    free(output, outputSize);
    free(written, 4);
    free(formatOptions, 16);
    free(selection, 32);
    freeTerminal(handle);
  });

  it('formats a cell-drag selection installed from screen grid refs', async () => {
    const { memory, call, alloc, free, newTerminal, freeTerminal, write } = await loadEngine();
    const handle = newTerminal(80, 24);
    const { terminal } = handle;
    write(terminal, 'hello\r\nworld');

    const gridRefAt = (x: number, y: number) => {
      const point = alloc(24);
      new Uint8Array(memory.buffer, point, 24).fill(0);
      const pointView = new DataView(memory.buffer, point, 24);
      pointView.setUint32(0, 2, true);
      pointView.setUint16(8, x, true);
      pointView.setUint32(12, y, true);
      const ref = alloc(12);
      new Uint8Array(memory.buffer, ref, 12).fill(0);
      new DataView(memory.buffer, ref, 12).setUint32(0, 12, true);
      expect(call('ghostty_terminal_grid_ref', terminal, point, ref)).toBe(0);
      free(point, 24);
      return ref;
    };
    const start = gridRefAt(0, 0);
    const end = gridRefAt(4, 1);
    const selection = alloc(32);
    const selectionBytes = new Uint8Array(memory.buffer, selection, 32);
    selectionBytes.fill(0);
    new DataView(memory.buffer, selection, 32).setUint32(0, 32, true);
    selectionBytes.set(new Uint8Array(memory.buffer, start, 12), 4);
    selectionBytes.set(new Uint8Array(memory.buffer, end, 12), 16);
    expect(call('ghostty_terminal_set', terminal, 21, selection)).toBe(0);

    const formatOptions = plainFormatOptions(memory, alloc);
    const written = alloc(4);
    expect(
      call('ghostty_terminal_selection_format_buf', terminal, formatOptions, 0, 0, written)
    ).toBe(-3);
    const outputSize = new DataView(memory.buffer, written, 4).getUint32(0, true);
    const output = alloc(outputSize);
    expect(
      call(
        'ghostty_terminal_selection_format_buf',
        terminal,
        formatOptions,
        output,
        outputSize,
        written
      )
    ).toBe(0);
    expect(new TextDecoder().decode(new Uint8Array(memory.buffer, output, outputSize))).toBe(
      'hello\nworld'
    );

    free(output, outputSize);
    free(written, 4);
    free(formatOptions, 16);
    free(selection, 32);
    free(end, 12);
    free(start, 12);
    freeTerminal(handle);
  });

  it('uses Ghostty for mouse encoding, word selection, and OSC 8 hit testing', async () => {
    const { memory, call, alloc, free, newTerminal, freeTerminal, write, decMode } =
      await loadEngine();
    const handle = newTerminal(80, 24);
    const { terminal } = handle;
    write(
      terminal,
      '\u001b[?1000h\u001b[?1006h\u001b]8;;https://example.com/docs\u001b\\linked\u001b]8;;\u001b\\ plain'
    );

    const modeFlag = alloc(1);
    new Uint8Array(memory.buffer, modeFlag, 1)[0] = 0;
    expect(call('ghostty_terminal_get', terminal, 11, modeFlag)).toBe(0);
    expect(new Uint8Array(memory.buffer, modeFlag, 1)[0]).toBe(1);
    free(modeFlag, 1);
    expect(decMode(terminal, 1003)).toBe(false);
    write(terminal, '\u001b[?1003h');
    expect(decMode(terminal, 1003)).toBe(true);
    write(terminal, '\u001b[?1003l\u001b[?1000h');
    expect(decMode(terminal, 1003)).toBe(false);

    const point = alloc(24);
    new Uint8Array(memory.buffer, point, 24).fill(0);
    const pointView = new DataView(memory.buffer, point, 24);
    pointView.setUint32(0, 1, true);
    pointView.setUint16(8, 1, true);
    pointView.setUint32(12, 0, true);
    const gridRef = alloc(12);
    new Uint8Array(memory.buffer, gridRef, 12).fill(0);
    new DataView(memory.buffer, gridRef, 12).setUint32(0, 12, true);
    expect(call('ghostty_terminal_grid_ref', terminal, point, gridRef)).toBe(0);

    const written = alloc(4);
    expect(call('ghostty_grid_ref_hyperlink_uri', gridRef, 0, 0, written)).toBe(-3);
    const hyperlinkSize = new DataView(memory.buffer, written, 4).getUint32(0, true);
    const hyperlink = alloc(hyperlinkSize);
    expect(call('ghostty_grid_ref_hyperlink_uri', gridRef, hyperlink, hyperlinkSize, written)).toBe(
      0
    );
    expect(new TextDecoder().decode(new Uint8Array(memory.buffer, hyperlink, hyperlinkSize))).toBe(
      'https://example.com/docs'
    );

    const wordOptions = alloc(24);
    new Uint8Array(memory.buffer, wordOptions, 24).fill(0);
    new DataView(memory.buffer, wordOptions, 24).setUint32(0, 24, true);
    new Uint8Array(memory.buffer, wordOptions + 4, 12).set(
      new Uint8Array(memory.buffer, gridRef, 12)
    );
    const selection = alloc(32);
    new Uint8Array(memory.buffer, selection, 32).fill(0);
    new DataView(memory.buffer, selection, 32).setUint32(0, 32, true);
    expect(call('ghostty_terminal_select_word', terminal, wordOptions, selection)).toBe(0);
    expect(call('ghostty_terminal_set', terminal, 21, selection)).toBe(0);
    const formatOptions = plainFormatOptions(memory, alloc);
    expect(
      call('ghostty_terminal_selection_format_buf', terminal, formatOptions, 0, 0, written)
    ).toBe(-3);
    const selectionSize = new DataView(memory.buffer, written, 4).getUint32(0, true);
    const selectionText = alloc(selectionSize);
    expect(
      call(
        'ghostty_terminal_selection_format_buf',
        terminal,
        formatOptions,
        selectionText,
        selectionSize,
        written
      )
    ).toBe(0);
    expect(
      new TextDecoder().decode(new Uint8Array(memory.buffer, selectionText, selectionSize))
    ).toBe('linked');

    const lineOptions = alloc(28);
    new Uint8Array(memory.buffer, lineOptions, 28).fill(0);
    new DataView(memory.buffer, lineOptions, 28).setUint32(0, 28, true);
    new Uint8Array(memory.buffer, lineOptions + 4, 12).set(
      new Uint8Array(memory.buffer, gridRef, 12)
    );
    expect(call('ghostty_terminal_select_line', terminal, lineOptions, selection)).toBe(0);
    expect(call('ghostty_terminal_set', terminal, 21, selection)).toBe(0);
    expect(
      call('ghostty_terminal_selection_format_buf', terminal, formatOptions, 0, 0, written)
    ).toBe(-3);
    const lineSelectionSize = new DataView(memory.buffer, written, 4).getUint32(0, true);
    const lineSelectionText = alloc(lineSelectionSize);
    expect(
      call(
        'ghostty_terminal_selection_format_buf',
        terminal,
        formatOptions,
        lineSelectionText,
        lineSelectionSize,
        written
      )
    ).toBe(0);
    expect(
      new TextDecoder().decode(new Uint8Array(memory.buffer, lineSelectionText, lineSelectionSize))
    ).toBe('linked plain');

    const mouseEncoderSlot = call('ghostty_wasm_alloc_opaque');
    const mouseEventSlot = call('ghostty_wasm_alloc_opaque');
    expect(call('ghostty_mouse_encoder_new', 0, mouseEncoderSlot)).toBe(0);
    expect(call('ghostty_mouse_event_new', 0, mouseEventSlot)).toBe(0);
    const view = new DataView(memory.buffer);
    const mouseEncoder = view.getUint32(mouseEncoderSlot, true);
    const mouseEvent = view.getUint32(mouseEventSlot, true);
    call('ghostty_mouse_encoder_setopt_from_terminal', mouseEncoder, terminal);
    const mouseSize = alloc(36);
    new Uint8Array(memory.buffer, mouseSize, 36).fill(0);
    const mouseSizeView = new DataView(memory.buffer, mouseSize, 36);
    for (const [offset, value] of [
      [0, 36],
      [4, 800],
      [8, 480],
      [12, 10],
      [16, 20]
    ] as const) {
      mouseSizeView.setUint32(offset, value, true);
    }
    call('ghostty_mouse_encoder_setopt', mouseEncoder, 2, mouseSize);
    call('ghostty_mouse_event_set_action', mouseEvent, 0);
    call('ghostty_mouse_event_set_button', mouseEvent, 1);
    const mousePositionPointer = alloc(8);
    const mousePosition = new DataView(memory.buffer, mousePositionPointer, 8);
    mousePosition.setFloat32(0, 15, true);
    mousePosition.setFloat32(4, 25, true);
    call('ghostty_mouse_event_set_position', mouseEvent, mousePositionPointer);
    const mouseOutput = alloc(128);
    expect(
      call('ghostty_mouse_encoder_encode', mouseEncoder, mouseEvent, mouseOutput, 128, written)
    ).toBe(0);
    const mouseOutputSize = new DataView(memory.buffer, written, 4).getUint32(0, true);
    expect(
      new TextDecoder().decode(new Uint8Array(memory.buffer, mouseOutput, mouseOutputSize))
    ).toBe('\u001b[<0;2;2M');

    call('ghostty_mouse_event_free', mouseEvent);
    call('ghostty_mouse_encoder_free', mouseEncoder);
    call('ghostty_wasm_free_opaque', mouseEventSlot);
    call('ghostty_wasm_free_opaque', mouseEncoderSlot);
    free(mousePositionPointer, 8);
    free(mouseOutput, 128);
    free(mouseSize, 36);
    free(lineSelectionText, lineSelectionSize);
    free(lineOptions, 28);
    free(selectionText, selectionSize);
    free(formatOptions, 16);
    free(selection, 32);
    free(wordOptions, 24);
    free(hyperlink, hyperlinkSize);
    free(written, 4);
    free(gridRef, 12);
    free(point, 24);
    freeTerminal(handle);
  });

  it('encodes modified printable keys in Kitty keyboard mode', async () => {
    const { memory, call, alloc, free, newTerminal, freeTerminal, write } = await loadEngine();
    const handle = newTerminal(80, 24);
    const { terminal } = handle;
    write(terminal, '\u001b[>1u');

    const encoderSlot = call('ghostty_wasm_alloc_opaque');
    const eventSlot = call('ghostty_wasm_alloc_opaque');
    expect(call('ghostty_key_encoder_new', 0, encoderSlot)).toBe(0);
    expect(call('ghostty_key_event_new', 0, eventSlot)).toBe(0);
    const view = new DataView(memory.buffer);
    const keyEncoder = view.getUint32(encoderSlot, true);
    const keyEvent = view.getUint32(eventSlot, true);
    const written = alloc(4);
    const encode = () => {
      const sizeResult = call('ghostty_key_encoder_encode', keyEncoder, keyEvent, 0, 0, written);
      const size = new DataView(memory.buffer, written, 4).getUint32(0, true);
      if (sizeResult === 0 && size === 0) return '';
      expect(sizeResult).toBe(-3);
      const output = alloc(size);
      expect(call('ghostty_key_encoder_encode', keyEncoder, keyEvent, output, size, written)).toBe(
        0
      );
      const length = new DataView(memory.buffer, written, 4).getUint32(0, true);
      const encoded = new TextDecoder().decode(new Uint8Array(memory.buffer, output, length));
      free(output, size);
      return encoded;
    };
    const setText = (text: string) => {
      const bytes = new TextEncoder().encode(text);
      const pointer = alloc(bytes.length);
      new Uint8Array(memory.buffer, pointer, bytes.length).set(bytes);
      call('ghostty_key_event_set_unshifted_codepoint', keyEvent, text.codePointAt(0)!);
      call('ghostty_key_event_set_utf8', keyEvent, pointer, bytes.length);
      return () => free(pointer, bytes.length);
    };

    call('ghostty_key_encoder_setopt_from_terminal', keyEncoder, terminal);
    call('ghostty_key_event_set_action', keyEvent, 1);
    call('ghostty_key_event_set_key', keyEvent, ghosttyKeyForCode('KeyC'));
    call('ghostty_key_event_set_mods', keyEvent, 1 << 1);
    call('ghostty_key_event_set_consumed_mods', keyEvent, 0);
    call('ghostty_key_event_set_composing', keyEvent, 0);
    const freeC = setText('c');
    expect(encode()).toBe('\u001b[99;5u');

    const freeJ = setText('j');
    expect(encode()).toBe('\u001b[106;5u');

    // Without the Kitty report-event-types flag a release encodes nothing, so
    // the surface's keyup handler stays silent for legacy sessions.
    call('ghostty_key_event_set_action', keyEvent, 0);
    expect(encode()).toBe('');

    // With report-event-types enabled the same release encodes an event-typed code.
    write(terminal, '\u001b[>3u');
    call('ghostty_key_encoder_setopt_from_terminal', keyEncoder, terminal);
    expect(encode()).toBe('\u001b[106;5:3u');

    freeJ();
    freeC();
    free(written, 4);
    call('ghostty_key_event_free', keyEvent);
    call('ghostty_key_encoder_free', keyEncoder);
    call('ghostty_wasm_free_opaque', eventSlot);
    call('ghostty_wasm_free_opaque', encoderSlot);
    freeTerminal(handle);
  });
});

/** A `GhosttyTerminalSelectionFormatOptions` for unwrapped, trimmed plain text of the selection. */
function plainFormatOptions(memory: WebAssembly.Memory, alloc: (size: number) => number): number {
  const options = alloc(16);
  new Uint8Array(memory.buffer, options, 16).fill(0);
  const view = new DataView(memory.buffer, options, 16);
  view.setUint32(0, 16, true);
  view.setUint8(8, 1);
  view.setUint8(9, 1);
  return options;
}
