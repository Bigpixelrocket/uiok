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

| Prop              | Type                       | Meaning                                           |
| ----------------- | -------------------------- | ------------------------------------------------- |
| `labelId`         | `string`                   | Id of the element naming the group                |
| `choices`         | `readonly T[]`             | Every choice, in drawing order; distinct values   |
| `value`           | `T`                        | The chosen one                                    |
| `onChange`        | `(value: T) => void`       | Called with a new choice; not for the chosen one  |
| `render`          | `(choice: T) => ReactNode` | A segment's content                               |
| `disabledChoices` | `readonly T[]?`            | Choices that cannot be taken now; none by default |

## Keyboard

One Tab stop, the checked segment. Right and Down choose the next segment, Left and Up the previous, wrapping at the ends and passing over a disabled choice; focus follows the choice. A disabled segment ignores a click.

## Styling

`.segmented-choice`, `.segmented-choice-option` (`[aria-checked='true']` is raised).

A host that cannot use the component, such as a row of presets inside a menu whose arrow keys step them, draws the row with these classes on plain buttons: `segmented-choice` on the row, `segmented-choice-option` on each button, and `aria-pressed="true"` on the chosen one. It takes the same trough, raised segment, hover, and press, so a change to the component reaches it; the host keeps only its own sizing and cursor.

- The trough is `--control-track` ringed in `--control-border`; the chosen segment is raised on the surface with a 1px `--control-border-strong` ring (3:1 on the trough) drawn inside it. The track pads by its own ring plus 2px, so 2px of trough shows on every side of the chosen segment, the same as between two segments, the glass edge, and `--shadow-raised`. Unchosen labels are `--text-on-surface`, which keeps 4.5:1 on the trough.
- Every segment has one weight, chosen or not, so a change of choice never shifts a label.
- Each segment is a flex box: an icon passed in `render` is drawn 12px (`--icon-sm`) whatever size it was given, centred on the words with the Button's 6px gap. Pass the icon and the words as siblings, with no spaces between them.
- A segment's side padding is `--segmented-inset` (`var(--space-6)` by default); a narrow host sets the variable instead of restyling the padding.
- A disabled segment keeps its place, faded to `--disabled-opacity` like every disabled control, with no hover or press.
- Its outer height is a control height, `--control-height-sm` (24px) by default, so it lines up with small buttons and fields. A host sets `--segmented-height` on any ancestor for another: `var(--control-height)` among regular fields, `var(--control-height-xs)` in a dense row. The height is a minimum, so a host that lets the segments wrap gets a taller trough.
- Hover (a wash) and press (the pressed wash) come from the base sheet's track recipe; keyboard focus draws the ring inside the segment.

## Labels read

None. Segment words come from `render`.
