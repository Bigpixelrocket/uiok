import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useClock } from './useClock.js';

const MINUTE_MS = 60_000;
const START = Date.UTC(2026, 0, 1);

/** A label that reads otherwise at each whole minute. */
const nextMinute = (now: number): number => (Math.floor(now / MINUTE_MS) + 1) * MINUTE_MS;

/** Runs `ms` of timers, letting each render land. */
const advance = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

/** Waits `ms` a second at a time, so each second's timers render before the next runs. */
const idle = async (ms: number): Promise<void> => {
  for (let elapsed = 0; elapsed < ms; elapsed += 1000) await advance(Math.min(1000, ms - elapsed));
};

/** The clock over `changesAt`, counting its renders. */
const mount = (active: boolean, changesAt?: (now: number) => number) => {
  let renders = 0;
  const hook = renderHook(
    ({ shown }: { readonly shown: boolean }) => {
      renders += 1;

      return useClock(shown, changesAt);
    },
    { initialProps: { shown: active } }
  );

  return { ...hook, renders: () => renders };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useClock', () => {
  it('renders at each instant a label changes and not between', async () => {
    const { result, renders } = mount(true, nextMinute);
    const settled = renders();

    await idle(MINUTE_MS - 1);
    expect(renders()).toBe(settled);

    await advance(1);
    expect(result.current).toBe(START + MINUTE_MS);

    await idle(4 * MINUTE_MS);
    expect(renders() - settled).toBe(5);
  });

  it('ticks every second without a schedule', async () => {
    const { result, renders } = mount(true);
    const settled = renders();

    await idle(5000);

    expect(renders() - settled).toBe(5);
    expect(result.current).toBe(START + 5000);
  });

  it('reads the wall clock within a second after the computer sleeps', async () => {
    const { result } = mount(true, nextMinute);

    await advance(10_000);
    // Asleep for 8 hours: the wall clock moves on while no timer runs.
    vi.setSystemTime(Date.now() + 8 * 60 * MINUTE_MS);
    await advance(1000);

    expect(result.current).toBe(Date.now());
  });

  it('reads the wall clock within a second after the time is set back', async () => {
    const { result } = mount(true, nextMinute);

    await advance(10_000);
    vi.setSystemTime(Date.now() - 60 * MINUTE_MS);
    await advance(1000);

    expect(result.current).toBe(Date.now());
  });

  it('reads the time afresh back in view after the time was set back meanwhile', async () => {
    const { result, rerender } = mount(true, nextMinute);

    await idle(10 * MINUTE_MS);
    rerender({ shown: false });
    vi.setSystemTime(START);
    rerender({ shown: true });

    expect(result.current).toBe(START);
  });

  it('renders a change that comes between a render and its wake', async () => {
    const boundary = START + MINUTE_MS;
    const wall = Date.now;
    let reads = 0;

    vi.setSystemTime(boundary - 3);
    // Each read of the clock 2 ms after the last: the render reads it before
    // the minute turns, and the wake's schedule after.
    const stepping = vi.spyOn(Date, 'now').mockImplementation(() => wall() + 2 * reads++);
    const { result } = mount(true, nextMinute);

    stepping.mockRestore();
    expect(result.current).toBeLessThan(boundary);

    await advance(1000);

    expect(result.current).toBeGreaterThanOrEqual(boundary);
  });

  it('holds no timer when no label ever changes, while inactive, or once gone', async () => {
    mount(true, () => Infinity);
    expect(vi.getTimerCount()).toBe(0);

    mount(true, () => Number.NaN);
    expect(vi.getTimerCount()).toBe(0);

    const hidden = mount(false, nextMinute);

    expect(vi.getTimerCount()).toBe(0);

    hidden.rerender({ shown: true });
    expect(vi.getTimerCount()).toBe(1);

    hidden.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reads the time afresh on its first render back in view', async () => {
    const { result, rerender } = mount(true, nextMinute);

    rerender({ shown: false });
    await advance(10 * MINUTE_MS);
    rerender({ shown: true });

    expect(result.current).toBe(START + 10 * MINUTE_MS);
  });
});
