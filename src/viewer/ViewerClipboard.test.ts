import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_VIEWER_LABELS } from '../labels/viewer.js';
import { deliverCopy, useCopyTickets } from './ViewerClipboard.js';

const later = (): {
  readonly promise: Promise<string>;
  readonly answer: (text: string) => void;
} => {
  let answer: (text: string) => void = () => undefined;
  const promise = new Promise<string>((resolve) => {
    answer = resolve;
  });
  return { promise, answer };
};

describe('copy tickets', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes only the newest copy, and nothing once the view has gone', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const say = vi.fn();
    const { result, unmount } = renderHook(() => useCopyTickets());

    const older = later();
    const newer = later();
    deliverCopy({ pending: older.promise }, null, say, DEFAULT_VIEWER_LABELS, result.current());
    deliverCopy({ pending: newer.promise }, null, say, DEFAULT_VIEWER_LABELS, result.current());
    newer.answer('newer');
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('newer'));
    older.answer('older');
    await Promise.resolve();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledTimes(1);

    const gone = later();
    deliverCopy({ pending: gone.promise }, null, say, DEFAULT_VIEWER_LABELS, result.current());
    unmount();
    gone.answer('gone');
    await Promise.resolve();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it("never clears a newer copy's message when an older write finishes", async () => {
    let finishWrite: () => void = () => undefined;
    const writeText = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        })
    );
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const say = vi.fn();
    const { result } = renderHook(() => useCopyTickets());

    deliverCopy({ text: 'older' }, null, say, DEFAULT_VIEWER_LABELS, result.current());
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('older'));
    deliverCopy(
      { error: 'Selection too large.' },
      null,
      say,
      DEFAULT_VIEWER_LABELS,
      result.current()
    );
    finishWrite();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(say.mock.calls).toEqual([['Selection too large.']]);
  });

  it('never lets an older read overwrite a newer copy the copy event delivered', async () => {
    const written: string[] = [];
    const writeText = vi.fn((value: string) => {
      written.push(value);
      return Promise.resolve();
    });
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const clipboardData = {
      setData: (_: string, value: string) => void written.push(value)
    } as unknown as DataTransfer;
    const say = vi.fn();
    const { result } = renderHook(() => useCopyTickets());

    const older = later();
    deliverCopy({ pending: older.promise }, null, say, DEFAULT_VIEWER_LABELS, result.current());
    older.answer('older');
    // The read's callback runs first; the newer copy lands right after it,
    // in the same burst of microtasks.
    await Promise.resolve();
    deliverCopy({ text: 'newer' }, clipboardData, say, DEFAULT_VIEWER_LABELS, result.current());
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(written.at(-1)).toBe('newer');
  });

  it.each([
    ['no clipboard', {}],
    ['a clipboard without writeText', { clipboard: {} }],
    [
      'a writeText that throws',
      {
        clipboard: {
          writeText: () => {
            throw new TypeError('Illegal invocation');
          }
        }
      }
    ]
  ])('says the copy failed on a page with %s', async (_, clipboard) => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined, ...clipboard });
    const say = vi.fn();

    deliverCopy({ text: 'abc' }, null, say, DEFAULT_VIEWER_LABELS);

    await vi.waitFor(() => expect(say).toHaveBeenCalled());
    expect(say.mock.calls).toEqual([[DEFAULT_VIEWER_LABELS.copyFailed]]);
  });
});
