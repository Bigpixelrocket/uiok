import { useEffect, useState } from 'react';

/**
 * How long a refusal's classes stay on, in milliseconds. Longer than the
 * 240 ms nudge and the red flash in menu.css, so both finish before their
 * class is taken away.
 */
const BELL_BEAT_MS = 300;

/**
 * The visual bell for a count of refused keystrokes: the count's parity from
 * a ring until the count has settled for one beat, null at rest. The parity
 * alternates per ring so the stylesheet can restart its animation for every
 * refused key, including the repeats of a held one. Put it on a menu's query
 * row as `bell-0` or `bell-1` (`.folder-menu-query.bell-0`).
 */
export function useBellBeat(bell: number): 0 | 1 | null {
  const [settledBell, setSettledBell] = useState(bell);
  const ringing = bell !== settledBell;

  useEffect(() => {
    if (!ringing) {
      return;
    }

    const timer = setTimeout(() => setSettledBell(bell), BELL_BEAT_MS);

    return () => clearTimeout(timer);
  }, [bell, ringing]);

  return ringing ? (bell % 2 === 0 ? 0 : 1) : null;
}
