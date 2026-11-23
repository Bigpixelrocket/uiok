/**
 * A combined log of six processes, each prefix in its own colour, with a
 * crash in the danger tone; a line arrives on Add line, and the well keeps
 * the newest in view while the reader is at its foot. Under it, a
 * service's own log, with no prefixes.
 */

import { useState } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { LogWell, type LogLine } from '@bigpixelrocket/uiok/log';

const FIRST: readonly LogLine[] = [
  { key: 1, source: 'vite', text: 'VITE v6.3.5  ready in 412 ms' },
  { key: 2, source: 'web', text: 'INFO  Server running on [http://127.0.0.1:8000].' },
  { key: 3, source: 'queue.1', text: 'INFO  Processing jobs from the [default] queue.' },
  { key: 4, source: 'queue.2', text: 'INFO  Processing jobs from the [default] queue.' },
  {
    key: 5,
    source: 'reverb',
    text: 'ERROR  Failed to listen on "tcp://0.0.0.0:8080": Address already in use.',
    tone: 'danger'
  },
  {
    key: 6,
    source: 'reverb',
    text: 'Not restarting: it exited 3 times within 10 s',
    tone: 'danger'
  },
  { key: 7, source: 'scheduler', text: "Running ['artisan' cache:prune-stale-tags] ... 4ms DONE" },
  { key: 8, source: 'web', text: '2026-11-23 14:21:37 / ..................... ~ 503.12ms' }
];

/** The log page's demo. */
export function LogDemo() {
  const [lines, setLines] = useState<readonly LogLine[]>(FIRST);

  return (
    <div className="demo-stack">
      <div className="log-demo">
        <LogWell
          label="Combined log"
          lines={lines}
          sources={['vite', 'web', 'queue.1', 'queue.2', 'reverb', 'scheduler']}
        />
      </div>
      <div>
        <Button
          onClick={() =>
            setLines((now) => [
              ...now,
              {
                key: now.length + 1,
                source: 'web',
                text: `2026-11-23 14:22:${String(now.length).padStart(2, '0')} /checkout ~ 388.40ms`
              }
            ])
          }
          size="small"
        >
          Add line
        </Button>
      </div>
      <div className="log-demo">
        <LogWell
          label="postgresql@18.log"
          lines={[
            { key: 1, text: 'LOG:  database system is ready to accept connections' },
            {
              key: 2,
              text: 'ERROR:  relation "order_items" does not exist at character 15',
              tone: 'danger'
            },
            { key: 3, text: 'checkpoint starting: time', tone: 'dim' }
          ]}
        />
      </div>
    </div>
  );
}
