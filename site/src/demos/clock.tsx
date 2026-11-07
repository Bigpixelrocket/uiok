/** A label that counts, rendering only when its words change. */

import { useCallback, useState } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { useClock } from '@bigpixelrocket/uiok/clock';

const SECOND = 1000;

/** "saved 12 s ago", turning over a whole second after `at`. */
function Since({ at }: { readonly at: number }) {
  const nextSecond = useCallback(
    (now: number) => at + (Math.floor((now - at) / SECOND) + 1) * SECOND,
    [at]
  );
  const now = useClock(true, nextSecond);
  return (
    <code className="demo-readout">saved {Math.max(0, Math.floor((now - at) / SECOND))} s ago</code>
  );
}

/** The clock page's demo. */
export function ClockDemo() {
  const [at, setAt] = useState(() => Date.now());
  return (
    <div className="demo-row">
      <Button onClick={() => setAt(Date.now())} size="small" variant="tonal">
        Save now
      </Button>
      <Since at={at} />
    </div>
  );
}
