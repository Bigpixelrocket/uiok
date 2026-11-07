# useClock (`uiok/clock`)

The current time for labels that count ("5 seconds ago", "in 2 minutes"), rendering only when a label would read differently.

## Example

```tsx
import { useCallback } from 'react';
import { useClock } from 'uiok/clock';

const MINUTE = 60_000;

function Since({ at, visible }: { at: number; visible: boolean }) {
  // The label turns over a whole minute after `at`, not on the wall clock's minute.
  const nextMinute = useCallback(
    (now: number) => at + (Math.floor((now - at) / MINUTE) + 1) * MINUTE,
    [at]
  );
  const now = useClock(visible, nextMinute);
  return <span>{Math.floor((now - at) / MINUTE)} min ago</span>;
}
```

Define `changesAt` outside the component (or memoize it); a new function reschedules the timer.

## Signature

`useClock(active: boolean, changesAt?: (now: number) => number): number`

- `active`: whether to keep a timer. While false it returns `Date.now()` and holds none, so a hidden view costs nothing.
- `changesAt`: given a time, the first later instant at which any label changes. Defaults to every second. Return `Infinity` (or `NaN`) when nothing will change, and no timer is kept.

## Behaviour

- Renders at each instant `changesAt` names and not between.
- Re-reads the wall clock at least once a second, so after the computer sleeps or the system time changes, labels are at most a second late.
- A render for any other reason reads the time afresh if a change instant has passed or the clock went back, so a label never shows a stale time.

## Labels read

None.
