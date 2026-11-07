# SegmentedChoice (`uiok/segmented`)

One choice of several, drawn as a segmented control and announced as a radio group.

## Example

```tsx
import { SegmentedChoice } from 'uiok/segmented';

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

## Labels read

None. Segment words come from `render`.
