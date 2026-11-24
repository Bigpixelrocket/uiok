/**
 * A combined log of six processes, each prefix in its own colour, its
 * lines' ANSI colours read with `ansi` (the INFO and ERROR badges, a
 * dim run, a bold DONE), with a crash in the danger tone; a line arrives on Add line, and the well keeps
 * the newest in view while the reader is at its foot. Add 10,000 lines
 * fills it the way a long-running process does; the well draws only the
 * lines in view, so it scrolls and follows as lightly. Under it, a
 * service's own log, with no prefixes.
 */

import { useState } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { LogWell, type LogLine } from '@bigpixelrocket/uiok/log';

const FIRST: readonly LogLine[] = [
  { key: 1, source: 'vite', text: 'VITE v6.3.5  ready in 412 ms' },
  {
    key: 2,
    source: 'web',
    text: '\u001b[44;97m INFO \u001b[0m Server running on [\u001b[34mhttp://127.0.0.1:8000\u001b[39m].'
  },
  {
    key: 3,
    source: 'queue.1',
    text: '\u001b[44;97m INFO \u001b[0m Processing jobs from the [\u001b[33mdefault\u001b[39m] queue.'
  },
  {
    key: 4,
    source: 'queue.2',
    text: '\u001b[44;97m INFO \u001b[0m Processing jobs from the [\u001b[33mdefault\u001b[39m] queue.'
  },
  {
    key: 5,
    source: 'reverb',
    text: '\u001b[41;97m ERROR \u001b[0m Failed to listen on "tcp://0.0.0.0:8080": Address already in use.'
  },
  {
    key: 6,
    source: 'reverb',
    text: 'Not restarting: it exited 3 times within 10 s',
    tone: 'danger'
  },
  {
    key: 7,
    source: 'scheduler',
    text: "Running ['artisan' cache:prune-stale-tags] \u001b[2m...\u001b[22m 4ms \u001b[1;32mDONE\u001b[0m"
  },
  { key: 8, source: 'web', text: '2026-11-23 14:21:37 / ..................... ~ 503.12ms' }
];

/** The combined log's sources, in colour order. */
const SOURCES = ['vite', 'web', 'queue.1', 'queue.2', 'reverb', 'scheduler'];

/** The log page's demo. */
export function LogDemo() {
  const [lines, setLines] = useState<readonly LogLine[]>(FIRST);

  return (
    <div className="demo-stack">
      <div className="log-demo">
        <LogWell ansi label="Combined log" lines={lines} sources={SOURCES} />
      </div>
      <div className="demo-row">
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
        <Button
          onClick={() =>
            setLines((now) => [
              ...now,
              ...Array.from({ length: 10_000 }, (_, index) => {
                const at = now.length + index;
                const source = SOURCES[at % SOURCES.length] ?? 'web';

                return {
                  key: at + 1,
                  source,
                  text: `\u001b[2m#${at + 1}\u001b[22m ${source} handled /orders/${at % 997} in ${(at % 400) + 12} ms${at % 7 === 0 ? ', with a longer note that wraps where the well is narrow enough to need it' : ''}`
                };
              })
            ])
          }
          size="small"
        >
          Add 10,000 lines
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
