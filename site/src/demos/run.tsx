/**
 * A simulated transfer (start it, pause it, let it finish, or make it fail),
 * then every state side by side, with and without a fraction.
 */

import { useEffect, useState } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { useClock } from '@bigpixelrocket/uiok/clock';
import {
  isSettledRun,
  RunHeader,
  runClock,
  runElapsedMs,
  type RunState
} from '@bigpixelrocket/uiok/run';

const FILES = 412;
const MB = 175;

/** One still header per state, each with the clock `runClock` writes. */
const GALLERY: readonly {
  readonly state: RunState;
  readonly headline: string;
  readonly done: number | null;
  readonly reason?: string;
}[] = [
  { state: 'waiting', headline: `Waiting to copy ${FILES} files`, done: null },
  { state: 'running', headline: `Copying ${FILES} files to backup`, done: 167 },
  { state: 'paused', headline: 'Paused', done: 230 },
  { state: 'done', headline: `Copied ${FILES} files`, done: FILES },
  {
    state: 'failed',
    headline: 'Copy failed',
    done: 301,
    reason: 'The backup disk was disconnected.'
  },
  { state: 'stopped', headline: 'Copy stopped', done: 96 }
];

/** The run page's demo. */
export function RunDemo() {
  const [state, setState] = useState<RunState>('waiting');
  const [done, setDone] = useState(0);
  const [times, setTimes] = useState<{ startedMs: number | null; finishedMs: number | null }>({
    startedMs: null,
    finishedMs: null
  });
  const now = useClock(!isSettledRun(state));
  const elapsed = runElapsedMs(times, state, now);

  useEffect(() => {
    if (state !== 'running') return;
    const timer = setInterval(() => {
      setDone((current) => {
        const next = Math.min(FILES, current + 3 + Math.floor(Math.random() * 6));
        if (next === FILES) {
          setState('done');
          setTimes((value) => ({ ...value, finishedMs: Date.now() }));
        }
        return next;
      });
    }, 120);
    return () => clearInterval(timer);
  }, [state]);

  const settle = (to: RunState) => {
    setState(to);
    setTimes((value) => ({ ...value, finishedMs: Date.now() }));
  };
  const restart = () => {
    setDone(0);
    setTimes({ startedMs: Date.now(), finishedMs: null });
    setState('running');
  };
  const headline = {
    waiting: `Waiting to copy ${FILES} files`,
    running: `Copying ${FILES} files to backup`,
    paused: 'Paused',
    done: `Copied ${FILES} files`,
    failed: 'Copy failed',
    stopped: 'Copy stopped'
  }[state];

  return (
    <div className="demo-stack">
      <div className="run-frame">
        <RunHeader
          bar={{ fraction: state === 'waiting' ? null : done / FILES, label: 'Whole transfer' }}
          facts={[
            `${((done / FILES) * MB).toFixed(1)} MB of ${MB} MB`,
            `${done} of ${FILES} files`
          ]}
          figure={elapsed === null ? null : runClock(elapsed)}
          headline={headline}
          reason={state === 'failed' ? 'The backup disk was disconnected.' : null}
          state={state}
        />
      </div>
      <div className="demo-row">
        {state === 'waiting' || isSettledRun(state) ? (
          <Button onClick={restart} size="small" variant="primary">
            {state === 'waiting' ? 'Start' : 'Run again'}
          </Button>
        ) : null}
        {state === 'running' ? (
          <Button onClick={() => setState('paused')} size="small">
            Pause
          </Button>
        ) : null}
        {state === 'paused' ? (
          <Button onClick={() => setState('running')} size="small" variant="tonal">
            Resume
          </Button>
        ) : null}
        {state === 'running' || state === 'paused' ? (
          <>
            <Button onClick={() => settle('stopped')} size="small">
              Stop
            </Button>
            <Button onClick={() => settle('failed')} size="small">
              Fail it
            </Button>
          </>
        ) : null}
      </div>
      <p className="demo-subhead">Every state</p>
      {GALLERY.map((still) => (
        <div className="run-frame" key={still.state}>
          <RunHeader
            bar={{
              fraction: still.done === null ? null : still.done / FILES,
              label: 'Whole transfer'
            }}
            facts={[
              `${(((still.done ?? 0) / FILES) * MB).toFixed(1)} MB of ${MB} MB`,
              `${still.done ?? 0} of ${FILES} files`
            ]}
            figure={still.state === 'waiting' ? null : runClock(83_000)}
            headline={still.headline}
            reason={still.reason ?? null}
            state={still.state}
          />
        </div>
      ))}
      <p className="demo-subhead">Without a fraction</p>
      {(['running', 'paused', 'failed'] as const).map((still) => (
        <div className="run-frame" key={still}>
          <RunHeader
            bar={{ fraction: null, label: 'Compressing' }}
            facts={['3 items', '1.2 GB']}
            figure={runClock(3_723_000)}
            headline={
              {
                running: 'Compressing 3 items',
                paused: 'Paused',
                failed: 'Compression failed'
              }[still]
            }
            reason={still === 'failed' ? 'The disk is full.' : null}
            state={still}
          />
        </div>
      ))}
    </div>
  );
}
