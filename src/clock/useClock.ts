import { useEffect, useMemo, useState } from 'react';

/**
 * The longest the clock waits before it reads the wall clock again. A timer
 * counts on a clock that stops while the computer sleeps, so one set for a
 * label minutes away would fire that much after a wake; reading every second
 * keeps a label no more than a second late after a sleep or a change of the
 * system time, as a clock that ticked every second did, and renders nothing
 * until a label reads otherwise.
 */
const LOOK_MS = 1000;

/** A clock for labels that count seconds: the next second. */
const everySecond = (now: number): number => now + 1000;

/**
 * The time a component's labels read from. While `active` it wakes, and
 * renders, at the first instant `changesAt` says one of its labels reads
 * otherwise (every second unless given), and holds still between them, so
 * nothing renders for a label that would read the same. A render for any
 * other reason that comes after such an instant or after the clock was set
 * back, the first one after the component comes back into view among them,
 * reads the time afresh, so a label never shows a time other than the
 * render's. `changesAt` takes a time and returns the first instant after it
 * at which a label changes, or Infinity (or NaN) when none ever does; a new
 * function schedules the wake again.
 * While inactive it returns the current time without holding a timer.
 */
export function useClock(
  active: boolean,
  changesAt: (now: number) => number = everySecond
): number {
  const [now, setNow] = useState(() => Date.now());
  const due = useMemo(() => (active ? changesAt(now) : now), [active, changesAt, now]);

  // Each wake starts from the time the last one held, so a change that
  // comes between a render and this effect is never skipped.
  useEffect(() => {
    if (!active || !Number.isFinite(due)) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const look = (): void => {
      timer = setTimeout(
        () => {
          const at = Date.now();

          // Before the change, on a clock that has not gone back: nothing
          // reads otherwise yet.
          if (at < due && at >= now) {
            look();
            return;
          }

          setNow(at);
        },
        Math.min(Math.max(due - Date.now(), 0), LOOK_MS)
      );
    };

    look();

    return () => clearTimeout(timer);
  }, [active, due, now]);

  if (!active) return Date.now();

  const current = Date.now();

  // The time held, while no label has changed since and the clock has not
  // gone back before it.
  return current < due && current >= now ? now : current;
}
