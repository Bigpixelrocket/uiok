# ActivityBar (`@bigpixelrocket/uiok/activity`)

A progress bar that shows a fill for a known fraction, or moving diagonal stripes for work that reports no fraction.

## Example

```tsx
import { ActivityBar } from '@bigpixelrocket/uiok/activity';

<ActivityBar
  className="upload-track"
  fillClassName="upload-fill"
  fraction={total ? done / total : null}
  label="Uploading 3 files"
  moving={state === 'running'}
/>;
```

## Props (`ActivityBarProps`)

| Prop            | Type             | Meaning                                                          |
| --------------- | ---------------- | ---------------------------------------------------------------- |
| `fraction`      | `number \| null` | Done, in [0, 1] (clamped for the fill); `null` for indeterminate |
| `label`         | `string`         | Accessible name of the `progressbar`                             |
| `moving`        | `boolean`        | Whether the work is running now; only then do the stripes scroll |
| `className`     | `string`         | The track's class; the caller sizes and colours the track        |
| `fillClassName` | `string`         | The fill's class, also put on the stripes                        |

## Behaviour

- Determinate: `aria-valuenow` is the rounded percentage; the fill's width is the fraction.
- Indeterminate: the track gets `indeterminate` (and `moving` while running), `aria-busy` follows `moving`, and there is no value. The stripes scroll only while `moving`, and never under `prefers-reduced-motion: reduce`; say that the work is running in words or a clock.
- Stripe colour is `--stripe-ink` (the accent by default) over `--stripe-ground` (38%). To dim a paused run, set both on `.indeterminate > .activity-stripes` from a more specific selector.

## Labels read

None.
