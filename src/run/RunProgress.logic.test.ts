// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { isSettledRun, runClock, runElapsedMs, type RunState } from './RunProgress.logic.js';

describe('isSettledRun', () => {
  it('counts done, failed, and stopped as settled, and nothing that can still move', () => {
    const states: RunState[] = ['waiting', 'running', 'paused', 'done', 'failed', 'stopped'];

    expect(states.filter(isSettledRun)).toEqual(['done', 'failed', 'stopped']);
  });
});

describe('runElapsedMs', () => {
  it('counts from the start to now while the run goes on', () => {
    expect(runElapsedMs({ startedMs: 1_000, finishedMs: null }, 'running', 8_500)).toBe(7_500);
    expect(runElapsedMs({ startedMs: 1_000, finishedMs: null }, 'paused', 4_000)).toBe(3_000);
  });

  it('stops at the finish once the run settles, whatever the time now', () => {
    const times = { startedMs: 1_000, finishedMs: 22_000 };

    expect(runElapsedMs(times, 'done', 99_000)).toBe(21_000);
    expect(runElapsedMs(times, 'failed', 99_000)).toBe(21_000);
    expect(runElapsedMs(times, 'stopped', 99_000)).toBe(21_000);
  });

  it('has no time before the start, or for a settled run without a finish', () => {
    expect(runElapsedMs({ startedMs: null, finishedMs: null }, 'waiting', 5_000)).toBeNull();
    expect(runElapsedMs({ startedMs: 1_000, finishedMs: null }, 'waiting', 5_000)).toBeNull();
    expect(runElapsedMs({ startedMs: null, finishedMs: 3_000 }, 'stopped', 5_000)).toBeNull();
    expect(runElapsedMs({ startedMs: 1_000, finishedMs: null }, 'done', 5_000)).toBeNull();
  });

  it('never counts backwards when the clock reads before the start', () => {
    expect(runElapsedMs({ startedMs: 5_000, finishedMs: null }, 'running', 4_000)).toBe(0);
  });
});

describe('runClock', () => {
  it('reads minutes and seconds, dropping partial seconds', () => {
    expect(runClock(0)).toBe('0:00');
    expect(runClock(7_999)).toBe('0:07');
    expect(runClock(16_000)).toBe('0:16');
    expect(runClock(723_000)).toBe('12:03');
    expect(runClock(3_599_999)).toBe('59:59');
  });

  it('puts the hours in front once there is one', () => {
    expect(runClock(3_600_000)).toBe('1:00:00');
    expect(runClock(3_723_000)).toBe('1:02:03');
  });

  it('reads a negative duration as none', () => {
    expect(runClock(-2_000)).toBe('0:00');
  });
});
