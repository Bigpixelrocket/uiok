import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBellBeat } from './useBellBeat.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useBellBeat', () => {
  it('rests until a refusal, rings with the count’s parity, and settles after one beat', () => {
    const { result, rerender } = renderHook(({ bell }) => useBellBeat(bell), {
      initialProps: { bell: 0 }
    });

    expect(result.current).toBeNull();

    rerender({ bell: 1 });
    expect(result.current).toBe(1);

    // A held key's repeat flips the parity, so the animation restarts.
    rerender({ bell: 2 });
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBeNull();
  });
});
