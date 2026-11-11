# SegmentedChoice (`@bigpixelrocket/uiok/segmented`)

One choice of several, drawn as a segmented control and announced as a radio group.

## Example

```tsx
import { SegmentedChoice } from '@bigpixelrocket/uiok/segmented';

<span id="view-label">View</span>
<SegmentedChoice
  choices={['list', 'grid'] as const}
  labelId="view-label"
  onChange={setView}
  render={(choice) => (choice === 'list' ? 'List' : 'Grid')}
  value={view}
/>
```

## Props (`SegmentedChoiceProps<T>`)

`T` is `string | number | null`.

| Prop       | Type                       | Meaning                                          |
| ---------- | -------------------------- | ------------------------------------------------ |
| `labelId`  | `string`                   | Id of the element naming the group               |
| `choices`  | `readonly T[]`             | Every choice, in drawing order; distinct values  |
| `value`    | `T`                        | The chosen one                                   |
| `onChange` | `(value: T) => void`       | Called with a new choice; not for the chosen one |
| `render`   | `(choice: T) => ReactNode` | A segment's content                              |

## Keyboard

One Tab stop, the checked segment. Right and Down choose the next segment, Left and Up the previous, wrapping at the ends; focus follows the choice.

## Styling

`.segmented-choice`, `.segmented-choice-option` (`[aria-checked='true']` is raised).

- The trough is `--control-track` ringed in `--control-border`; the chosen segment is raised on the surface with a 1px `--control-border` ring, the glass edge, and `--shadow-raised`. Unchosen labels are `--text-on-surface`, which keeps 4.5:1 on the trough.
- Every segment has one weight, chosen or not, so a change of choice never shifts a label.
- Its outer height is a control height, `--control-height-sm` (24px) by default, so it lines up with small buttons and fields. A host sets `--segmented-height` on any ancestor for another: `var(--control-height)` among regular fields, `var(--control-height-xs)` in a dense row. The height is a minimum, so a host that lets the segments wrap gets a taller trough.
- Hover (a wash) and press (the pressed wash) come from the base sheet's track recipe; keyboard focus draws the ring inside the segment.

## Labels read

None. Segment words come from `render`.
