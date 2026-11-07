# Run progress (`uiok/run`)

`RunHeader` is the header a view watching work in progress opens with (a dialog following an install, a transfer, an export), so a run reads the same wherever it is watched. `RunProgress` helpers say where a run stands and how long it has taken.

## Example

```tsx
import { useClock } from 'uiok/clock';
import { isSettledRun, RunHeader, runClock, runElapsedMs } from 'uiok/run';

// Ticks every second until the run settles.
const now = useClock(!isSettledRun(state));
const elapsed = runElapsedMs({ startedMs, finishedMs }, state, now);

<RunHeader
  bar={{ fraction: total ? done / total : null, label: 'Whole transfer' }}
  facts={['67.9 MB of 175 MB', '167 of 412 files']}
  figure={elapsed === null ? null : runClock(elapsed)}
  headline="Copying 412 files"
  state={state}
/>;
```

## `RunHeader` (`RunHeaderProps`)

| Prop           | Type                   | Default | Meaning                                                                                              |
| -------------- | ---------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `state`        | `RunState`             |         | `waiting`, `running`, `paused`, `done`, `failed`, or `stopped`                                       |
| `headline`     | `string`               |         | One sentence: where the run stands, or its outcome once it settles                                   |
| `announcement` | `string`               |         | What the status region says instead, for a headline that ticks (time left); the headline stays shown |
| `figure`       | `string \| null`       | `null`  | One big figure at the right edge (a clock, a percentage)                                             |
| `reason`       | `string \| null`       | `null`  | Why it failed, under the headline                                                                    |
| `bar`          | `RunHeaderBar`         |         | `{ fraction, label }`; a `null` fraction draws the activity stripes                                  |
| `facts`        | `readonly ReactNode[]` | `[]`    | Short facts in a row, dot-separated; the first gives way when room runs out                          |

### Look

- States and glyphs: waiting (hourglass, dim), running (a turning circle in the accent, still under reduced motion), paused (dim), done (a check, green), failed (a cross, red), stopped (a slashed circle, dim).
- The headline is 14px semibold in the text colour; red when failed, with the reason under it. A done headline stays in the text colour because a light theme's green can be too faint for text; the glyph carries it.
- The figure is 18px tabular and dims while waiting and once the run settles.
- The bar is 8px: in the accent while running, dimmed once it stops short (paused, failed, stopped), green when done. Without a fraction it is `ActivityBar`'s stripes, moving only while running and dimmed through `--stripe-ink` and `--stripe-ground` once stopped short.
- Facts sit closer to the bar than the bar sits to the headline; without a bar they line up under the headline, past the glyph.
- The header keeps the surrounding dialog's font family.

### Accessibility

The headline (and a failure's reason) is a status region, replaced by a new alert element once the run fails, so each change of state is announced once. The figure sits outside it, so a ticking clock is never read out. With `announcement`, the headline is shown outside the region and only the announcement is read.

## Helpers

- `RunState` and `isSettledRun(state)`: done, failed, and stopped never change again.
- `RunTimes`: `{ startedMs, finishedMs }`, epoch milliseconds or null.
- `runElapsedMs(times, state, nowMs)`: start to now while running or paused, start to finish once settled; null while waiting or for a settled run with no finish.
- `runClock(ms)`: `0:07`, `12:03`, `1:02:03`; partial seconds dropped, negatives read as `0:00`.

## Styling

`.run-header` (`data-state`), `.run-header-top`, `.run-header-glyph`, `.run-header-said`, `.run-header-headline`, `.run-header-reason`, `.run-header-figure`, `.run-header-bar`, `.run-header-fill`, `.run-header-facts` (`.indented`), `.run-header-fact`.

## Labels read

None; every word is a prop.
