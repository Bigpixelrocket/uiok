# SelectAllBar (`uiok/selectall`)

The footer of a list whose rows have checkboxes: Check all, then "With selected:" and the list's bulk actions. The checkbox is ticked when every row is, ticked and mixed when some are, clear when none are, and disabled when the list offers no row to check. `checkedAfterClick` gives the rows themselves Shift-click ranges.

## Example

```tsx
import { checkedAfterClick, SelectAllBar } from 'uiok/selectall';

const onRowClick = (id: string, shift: boolean) => {
  setChecked(checkedAfterClick(checked, visibleIds, anchor, id, shift));
  setAnchor(id);
};

<SelectAllBar
  checked={checked.size}
  onCheckAll={(on) => setChecked(on ? new Set(visibleIds) : new Set())}
  total={visibleIds.length}
>
  <Button size="small" onClick={removeChecked}>
    Delete
  </Button>
</SelectAllBar>;
```

## Props (`SelectAllBarProps`)

| Prop         | Type                    | Meaning                                                                 |
| ------------ | ----------------------- | ----------------------------------------------------------------------- |
| `total`      | `number`                | Rows the list offers to check (its filter's survivors, no disabled row) |
| `checked`    | `number`                | How many of those are checked                                           |
| `onCheckAll` | `(on: boolean) => void` | Check every offered row (true) or clear them (false)                    |
| `children`   | `ReactNode`             | The bulk actions                                                        |
| `label`      | `string`                | The toolbar's accessible name; the `selectAll.label` default otherwise  |

### `checkedAfterClick(checked, order, anchor, clicked, shift)`

Returns the new checked set. A plain click turns the clicked row alone. A Shift-click turns every row from `anchor` (the row clicked last) to `clicked`, in `order`, to the state the clicked row takes. With no anchor, or one no longer in `order`, it turns the row alone.

## Keyboard

The checkbox and the actions are ordinary Tab stops; Space toggles the checkbox.

## Styling

`.select-all-bar`, `.select-all-check`, `.select-all-with`.

## Labels read

`selectAll` (`SelectAllLabels`): `checkAll`, `withSelected`, `label`. See `docs/labels.md`.
