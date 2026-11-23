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
});
