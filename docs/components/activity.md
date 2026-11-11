# ActivityBar (`@bigpixelrocket/uiok/activity`)

A progress bar that shows a fill for a known fraction, or moving diagonal stripes for work that reports no fraction.

## Example

```tsx
import { ActivityBar } from '@bigpixelrocket/uiok/activity';

<ActivityBar
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
| `className`     | `string?`        | A class beside the track's own, for placement or a state colour  |
| `fillClassName` | `string?`        | A class beside the fill's own, also put on the stripes           |

## Behaviour

- Determinate: `aria-valuenow` is the rounded percentage; the fill's width is the fraction.
- Indeterminate: the track gets `indeterminate` (and `moving` while running), `aria-busy` follows `moving`, and there is no value. The stripes scroll only while `moving`, and never under `prefers-reduced-motion: reduce`; say that the work is running in words or a clock.
- Stripe colour is `--stripe-ink` (the accent while moving) over `--stripe-ground` (38%). Standing still, the stripes dim to `--progress-idle` over a 16% band, so a waiting bar never looks like a working one. A state of the caller's (a failed run) sets both on `.indeterminate > .activity-stripes` from a more specific selector.

## Styling

The bar draws its own look, so every bar is the same picture: `.activity-bar`, an 8px trough in `--control-track` ringed in `--control-border`, and `.activity-fill`, the accent with rounded ends, widening over `--duration-fast`. Both rules weigh nothing (`:where()`), so the caller's `className` and `fillClassName` win for placement and state colours.

## Labels read

None.
