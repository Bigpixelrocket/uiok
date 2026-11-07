import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useStableHandlers } from './useStableHandlers.js';

describe('useStableHandlers', () => {
  it('keeps each handler under one identity that calls the latest one passed', () => {
    const first = vi.fn((value: number) => value + 1);
    const latest = vi.fn((value: number) => value + 2);
    const { result, rerender } = renderHook(({ add }) => useStableHandlers({ add }), {
      initialProps: { add: first }
    });
    const stable = result.current;

    rerender({ add: latest });

    expect(result.current).toBe(stable);
    expect(result.current.add).toBe(stable.add);
    expect(stable.add(1)).toBe(3);
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledWith(1);
  });
});
