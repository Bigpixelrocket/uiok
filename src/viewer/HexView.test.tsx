import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ViewerByteRange, ViewerFileInfo, ViewerReader, ViewerResult } from './types.js';

import HexView from './HexView.js';

const HEX_SELECTION_TOO_LARGE = 'The selection is too large to copy. Select up to 1 MB at a time.';

const ok = <A,>(value: A): Promise<ViewerResult<A>> => Promise.resolve({ ok: true, value });

const infoFor = (sizeBytes: number, generation = 0): ViewerFileInfo => ({
  generation,
  name: 'disk.iso',
  sizeBytes,
  modifiedMs: 0,
  content: { kind: 'binary', mimeType: 'application/octet-stream' },
  change: 'none',
  mediaUrl: 'viewer-media://file/0000000000000000000000000000000000000000000000000000000000000000'
});

/** A file the reader reads in ranges, up to `size()` bytes, which a test may shrink. */
function bridgeOver(byteAt: (offset: number) => number, size: () => number, generation = 0) {
  return {
    inspect: vi.fn<ViewerReader['inspect']>(() => ok(infoFor(size()))),
    readRange: vi.fn<ViewerReader['readRange']>(({ offset, length }) => {
      const end = Math.min(size(), offset + length);
      const bytes = new Uint8Array(Math.max(0, end - offset));
      for (let index = 0; index < bytes.length; index += 1) bytes[index] = byteAt(offset + index);
      return ok<ViewerByteRange>({
        generation,
        offset,
        bytes,
        endOfFile: offset + length >= size()
      });
    }),
    reload: vi.fn<ViewerReader['reload']>(() => ok(infoFor(size()))),
    lineNumber: vi.fn<ViewerReader['lineNumber']>()
  };
}

const GB = 1024 ** 3;
const HUGE = 128 * GB;
/** A sparse 128 GB file: zeros, with "MZ" at the start and "END!" in its last 4 bytes. */
const sparse = (offset: number): number =>
  offset === 0
    ? 0x4d
    : offset === 1
      ? 0x5a
      : offset >= HUGE - 4
        ? 'END!'.charCodeAt(offset - (HUGE - 4))
        : 0;

const bytesBox = (): HTMLElement => screen.getByRole('textbox', { name: /^Bytes of/ });
const offsets = (): string[] =>
  [...document.querySelectorAll('.hex-offset')].map((cell) => cell.textContent ?? '');
const lines = (): string[] =>
  [...document.querySelectorAll('.hex-line')].map((line) => line.textContent ?? '');

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

describe('HexView', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('opens a 128 GB file with one bounded read and shows its last row on End', async () => {
    const reader = bridgeOver(sparse, () => HUGE);
    render(<HexView reader={reader} info={infoFor(HUGE)} />);

    await waitFor(() => expect(offsets()[0]).toBe('0000000000'));
    expect(lines()[0]).toBe(
      '0000000000  4D 5A 00 00 00 00 00 00-00 00 00 00 00 00 00 00  MZ..............'
    );
    expect(reader.readRange).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(bytesBox(), { key: 'End' });

    await waitFor(() => expect(offsets().at(-1)).toBe('1FFFFFFFF0'));
    expect(lines().at(-1)).toMatch(/00 00 00 00 45 4E 44 21 {2}\.{12}END!$/);
    expect(offsets()).toHaveLength(40);
    expect(reader.readRange).toHaveBeenCalledTimes(2);
    for (const [{ length }] of reader.readRange.mock.calls) {
      expect(length).toBeLessThanOrEqual(64 * 1024);
    }
  });

  it('keeps one read in flight through a fling and reads only for the newest row', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const reader = bridgeOver(sparse, () => HUGE);
    render(<HexView reader={reader} info={infoFor(HUGE)} />);
    await waitFor(() => expect(offsets()[0]).toBe('0000000000'));

    fireEvent.keyDown(bytesBox(), { key: 'ArrowDown' });
    expect(offsets()[0]).toBe('0000000010');
    expect(reader.readRange).toHaveBeenCalledTimes(1);

    const read = reader.readRange.getMockImplementation();
    reader.readRange.mockImplementation(async (request) => {
      await gate;
      return read!(request);
    });
    fireEvent.keyDown(bytesBox(), { key: 'End' });
    for (let step = 0; step < 500; step += 1) fireEvent.keyDown(bytesBox(), { key: 'PageUp' });

    expect(reader.readRange).toHaveBeenCalledTimes(2);
    await act(async () => release());

    // End is the last 40 rows; each Page Up moves 39, and every one counts.
    const top = HUGE / 16 - 40 - 500 * 39;
    await waitFor(() =>
      expect(offsets()[0]).toBe((top * 16).toString(16).toUpperCase().padStart(10, '0'))
    );
    expect(reader.readRange).toHaveBeenCalledTimes(3);
  });

  it('draws nothing from a read of the file a reload replaced', async () => {
    const reader = bridgeOver(
      () => 0x41,
      () => 64,
      1
    );
    render(<HexView reader={reader} info={infoFor(64, 0)} />);

    await waitFor(() => expect(reader.readRange).toHaveBeenCalled());
    await act(async () => {});

    expect(offsets()).toEqual([]);
    expect(reader.readRange).toHaveBeenCalledTimes(1);
  });

  it('pulls the screen back to the new end when the file shrank under it', async () => {
    let size = 100_000;
    const reader = bridgeOver(
      () => 0x41,
      () => size
    );
    render(<HexView reader={reader} info={infoFor(100_000)} />);
    await waitFor(() => expect(offsets()[0]).toBe('00000000'));

    size = 1000;
    fireEvent.keyDown(bytesBox(), { key: 'End' });

    // 1,000 bytes are 63 rows, the last of 8 bytes, so the last screen starts at row 23.
    await waitFor(() => expect(offsets().at(-1)).toBe('000003E0'));
    expect(offsets()[0]).toBe('00000170');
    expect(lines().at(-1)).toMatch(/^000003E0 {2}(41 ){7}41 {26}AAAAAAAA {8}$/);
  });

  it('asks the size once when a 128 GB file shrank far under the screen, and keeps the new end', async () => {
    let size = HUGE;
    const reader = bridgeOver(
      () => 0x41,
      () => size
    );
    render(<HexView reader={reader} info={infoFor(HUGE)} />);
    await waitFor(() => expect(offsets()[0]).toBe('0000000000'));

    size = 1000;
    fireEvent.keyDown(bytesBox(), { key: 'End' });

    // One empty read from past the new end, one size check, then the last screen.
    await waitFor(() => expect(offsets().at(-1)).toBe('00000003E0'));
    expect(offsets()[0]).toBe('0000000170');
    expect(reader.inspect).toHaveBeenCalledTimes(1);
    expect(reader.readRange).toHaveBeenCalledTimes(2);

    // The new end outlives the bytes that found it: back at the start and
    // then at the end again, nothing reads past it.
    fireEvent.keyDown(bytesBox(), { key: 'Home' });
    await waitFor(() => expect(offsets()[0]).toBe('0000000000'));
    fireEvent.keyDown(bytesBox(), { key: 'End' });
    await waitFor(() => expect(offsets().at(-1)).toBe('00000003E0'));
    expect(reader.inspect).toHaveBeenCalledTimes(1);
    expect(reader.readRange).toHaveBeenCalledTimes(2);
  });

  it('widens the offset column for a file past 4 GB', async () => {
    const size = 5 * GB;
    render(
      <HexView
        reader={bridgeOver(
          () => 0,
          () => size
        )}
        info={infoFor(size)}
      />
    );

    await waitFor(() => expect(offsets()[0]).toBe('000000000'));
    fireEvent.keyDown(bytesBox(), { key: 'End' });
    await waitFor(() => expect(offsets().at(-1)).toBe('13FFFFFF0'));
  });

  it('jumps to a hex offset, selecting its byte, and refuses one past the end', async () => {
    const reader = bridgeOver(sparse, () => HUGE);
    render(<HexView reader={reader} info={infoFor(HUGE)} />);
    await waitFor(() => expect(offsets()[0]).toBe('0000000000'));

    fireEvent.keyDown(bytesBox(), { key: 'l', metaKey: true });
    const field = screen.getByRole('textbox', { name: 'Offset in hex' });
    expect(document.activeElement).toBe(field);

    fireEvent.change(field, { target: { value: '0x3000000000' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(
      screen.getByText(
        'Offset 3000000000 is past the end of the file. The last offset is 1FFFFFFFFF.'
      )
    ).toBeTruthy();

    fireEvent.change(field, { target: { value: '1000000008' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    await waitFor(() => expect(offsets()[0]).toBe('1000000000'));
    expect(screen.queryByRole('textbox', { name: 'Offset in hex' })).toBeNull();
    expect(screen.getByText('Offset 1000000008 selected')).toBeTruthy();
    expect(document.querySelector('.hex-selected-primary')?.textContent).toBe('00');
    expect(document.activeElement).toBe(bytesBox());
  });

  it('copies the selection as hex from the Edit menu, and as text from the status bar', async () => {
    const bytes = new TextEncoder().encode('MZ\0hello\n');
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(
      <HexView
        reader={bridgeOver(
          (offset) => bytes[offset] ?? 0,
          () => bytes.length
        )}
        info={infoFor(bytes.length)}
      />
    );
    await waitFor(() => expect(offsets()).toEqual(['00000000']));

    fireEvent.keyDown(bytesBox(), { key: 'a', metaKey: true });
    expect(copy()).toHaveBeenCalledWith('text/plain', '4D 5A 00 68 65 6C 6C 6F 0A');

    fireEvent.click(screen.getByRole('button', { name: 'Copy Text' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('MZ.hello.'));
  });

  it('extends a selection with Shift and the arrows', async () => {
    const bytes = new Uint8Array(64).map((_, index) => index);
    render(
      <HexView
        reader={bridgeOver(
          (offset) => bytes[offset] ?? 0,
          () => bytes.length
        )}
        info={infoFor(bytes.length)}
      />
    );
    await waitFor(() => expect(offsets()).toHaveLength(4));

    fireEvent.keyDown(bytesBox(), { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(bytesBox(), { key: 'ArrowRight', shiftKey: true });

    expect(screen.getByText('00000000–00000011 · 18 bytes')).toBeTruthy();
    expect(copy()).toHaveBeenCalledWith(
      'text/plain',
      [...bytes.slice(0, 18)]
        .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
        .join(' ')
    );
  });

  it('clears a selection on Escape, and leaves Escape to the window with nothing selected', async () => {
    const bytes = new Uint8Array(64).map((_, index) => index);
    render(
      <HexView
        reader={bridgeOver(
          (offset) => bytes[offset] ?? 0,
          () => bytes.length
        )}
        info={infoFor(bytes.length)}
      />
    );
    await waitFor(() => expect(offsets()).toHaveLength(4));
    fireEvent.keyDown(bytesBox(), { key: 'ArrowRight', shiftKey: true });
    expect(screen.getByText('00000000–00000001 · 2 bytes')).toBeTruthy();

    // The offset field's Escape closes the field alone.
    fireEvent.keyDown(bytesBox(), { key: 'l', metaKey: true });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Offset in hex' }), { key: 'Escape' });
    expect(screen.queryByRole('textbox', { name: 'Offset in hex' })).toBeNull();
    expect(screen.getByText('00000000–00000001 · 2 bytes')).toBeTruthy();

    // fireEvent answers false when the view took the key, even from a status bar button.
    const copyText = screen.getByRole('button', { name: 'Copy Text' });
    expect(fireEvent.keyDown(copyText, { key: 'Escape' })).toBe(false);
    expect(screen.queryByText('00000000–00000001 · 2 bytes')).toBeNull();
    expect(fireEvent.keyDown(bytesBox(), { key: 'Escape' })).toBe(true);
  });

  it('selects bytes with the mouse in the text column, which Copy then copies as text', async () => {
    const bytes = new TextEncoder().encode('0123456789abcdefGHIJKLMNOPQRSTUV');
    render(
      <HexView
        reader={bridgeOver(
          (offset) => bytes[offset] ?? 0,
          () => bytes.length
        )}
        info={infoFor(bytes.length)}
      />
    );
    await waitFor(() => expect(offsets()).toHaveLength(2));

    // Rows of 18 pixels from the top of the box; each line is 75 characters of 7 pixels.
    vi.spyOn(bytesBox(), 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 800, height: 400 })
    );
    for (const [index, line] of document.querySelectorAll('.hex-line').entries()) {
      vi.spyOn(line, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({ x: 8, y: index * 18, width: 75 * 7, height: 18 })
      );
    }
    const textChar = (char: number): number => 8 + (59 + char) * 7 + 3;

    fireEvent.mouseDown(bytesBox(), { button: 0, clientX: textChar(14), clientY: 5 });
    fireEvent.mouseMove(window, { clientX: textChar(2), clientY: 23 });
    fireEvent.mouseUp(window);

    expect(copy()).toHaveBeenCalledWith('text/plain', 'efGHI');
    expect(document.querySelector('.hex-selected-primary')?.closest('.hex-text')).toBeTruthy();
  });

  it('says a selection is too large to copy instead of reading it', async () => {
    const reader = bridgeOver(sparse, () => HUGE);
    render(<HexView reader={reader} info={infoFor(HUGE)} />);
    await waitFor(() => expect(offsets()[0]).toBe('0000000000'));

    fireEvent.keyDown(bytesBox(), { key: 'a', metaKey: true });

    expect(copy()).not.toHaveBeenCalled();
    expect(screen.getByText(HEX_SELECTION_TOO_LARGE)).toBeTruthy();
    expect(reader.readRange).toHaveBeenCalledTimes(1);
  });

  it('says the file is empty', async () => {
    render(
      <HexView
        reader={bridgeOver(
          () => 0,
          () => 0
        )}
        info={infoFor(0)}
      />
    );

    expect(await screen.findByText('The file is empty.')).toBeTruthy();
  });

  it('shows why the file could not be read', async () => {
    const reader = bridgeOver(
      () => 0,
      () => 10
    );
    reader.readRange.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        error: {
          message: 'Could not open “disk.iso”. It no longer exists.',
          path: '',
          reason: 'not-found',
          detail: null
        }
      })
    );
    render(<HexView reader={reader} info={infoFor(10)} />);

    expect((await screen.findByRole('alert')).textContent).toContain('It no longer exists.');
  });
});
