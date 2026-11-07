/**
 * What every view that watches work in progress shares: where a run stands
 * and how long it has taken, for the progress header (`RunHeader`).
 */

/**
 * Where a run stands: waiting its turn, running, paused, or settled one way
 * or another (done, failed, or stopped before it finished).
 */
export type RunState = 'waiting' | 'running' | 'paused' | 'done' | 'failed' | 'stopped';

/** Settled: done, failed, or stopped. A settled run never changes again. */
export function isSettledRun(state: RunState): boolean {
  return state === 'done' || state === 'failed' || state === 'stopped';
}

/** The start and finish a run reports, in epoch milliseconds; null until each happens. */
export interface RunTimes {
  readonly startedMs: number | null;
  readonly finishedMs: number | null;
}

/**
 * How long a run has taken: from its start to `nowMs` while it goes on, from
 * its start to its finish once it settles. Null before it starts (waiting
 * its turn) and for a settled run that never reported its finish, so a
 * settled time never keeps counting.
 */
export function runElapsedMs(times: RunTimes, state: RunState, nowMs: number): number | null {
  if (state === 'waiting' || times.startedMs === null) return null;

  const end = isSettledRun(state) ? times.finishedMs : nowMs;

  return end === null ? null : Math.max(end - times.startedMs, 0);
}

/**
 * A duration as a clock: minutes and seconds ("0:07", "12:03"), with hours
 * in front once there is one ("1:02:03"). Partial seconds are dropped, so
 * the clock never shows a second that has not passed.
 */
export function runClock(ms: number): string {
  const seconds = Math.floor(Math.max(ms, 0) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const pad = (part: number): string => String(part).padStart(2, '0');

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds % 60)}`
    : `${minutes}:${pad(seconds % 60)}`;
}
