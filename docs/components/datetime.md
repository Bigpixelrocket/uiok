# DateTimePicker (`@bigpixelrocket/uiok/datetime`)

The button beside a date or time field that opens a picker under it (above it when the room below is short): a month's days, the previous and next month, Today or Now, and for a time its hour, minute, second, and optional fraction. The field stays the caller's, so a user can still type any value; the picker only writes what it picks.

## Example

```tsx
import { DateTimePicker } from '@bigpixelrocket/uiok/datetime';

<input value={due} onChange={(event) => setDue(event.target.value)} />
<DateTimePicker kind="date" label="Pick the due date" onChange={setDue} value={due} />
```

A store that joins date and time with a space instead of ISO's `T`:

```tsx
import { DateTimePicker, formatPicker } from '@bigpixelrocket/uiok/datetime';

<DateTimePicker
  format={(kind, parts, fraction) => formatPicker(kind, parts, fraction, ' ')}
  fraction={6}
  hint="Values the picker cannot pick can be typed into the field."
  kind="datetime"
  label="Pick the start"
  onChange={setStart}
  value={start}
/>;
```

## Props (`DateTimePickerProps`)

| Prop       | Type                                | Meaning                                                                   |
| ---------- | ----------------------------------- | ------------------------------------------------------------------------- |
| `kind`     | `'date' \| 'time' \| 'datetime'`    | What it picks                                                             |
| `value`    | `string`                            | The field's value as typed                                                |
| `onChange` | `(value: string) => void`           | The picked value, written by `format`                                     |
| `label`    | `string`                            | The button's accessible name                                              |
| `hint`     | `string`                            | What hovering the button says; `label` by default                         |
| `fraction` | `number`                            | Digits of a second a time keeps, 0 to 6; 0                                |
| `firstDay` | `number`                            | The week's first day, 1 Monday to 7 Sunday; 1                             |
| `disabled` | `boolean`                           | Disables the button                                                       |
| `format`   | `(kind, parts, fraction) => string` | Writes picked parts; `formatPicker` (ISO 8601) by default                 |
| `parse`    | `(value) => PickerParts \| null`    | Reads the value; `parsePicker` by default; null opens the picker on today |

## Value format

`parsePicker` reads `YYYY-MM-DD`, `HH:MM`, `HH:MM:SS[.f…]` (up to six fraction digits), and a date and a time joined by `T` or a space. It returns null for anything else (a keyword such as `now`, the zero date `0000-00-00`, an impossible day), and the field keeps that value as typed until a pick.

`formatPicker(kind, parts, fraction, separator = 'T')` writes `YYYY-MM-DD`, `HH:MM:SS` with `fraction` digits after a point when `fraction` is above 0, or both joined by `separator`.

Other helpers: `nowParts`, `daysIn`, `monthGrid`, `stepMonth`, `weekdayNames`.

## Keyboard

The button opens and closes the panel. In the panel, Tab moves through its controls, Escape closes it, and a day button picks with Return or Space. Picking a day closes a `date` picker; a `datetime` picker stays open for its time. A pointer outside the panel closes it. The panel stays beside its button in the document, so Tab reaches it next and a dialog keeps it, but is placed in the window with `position: fixed`, flipped above the button when the room below is short and kept 8px inside every window edge, so no scrolling pane or dialog cuts it. Today carries `aria-current="date"` and is outlined in the month grid. The panel carries `data-overlay`, so a window key policy that watches overlays (`watchOverlays`) treats it as open.

## Styling

`.date-picker`, `.date-picker-panel` (fixed, so no scrolling pane or dialog cuts it, at `--z-menu` in the stacking context it is drawn in), `.date-picker-head`, `.date-picker-days`, `.date-picker-week`, `.date-picker-weekday`, `.date-picker-day` (`.outside`, `.today`, `.current`), `.date-picker-time` (one row that never wraps: hour, minute, second, and a short fraction in equal columns; a long fraction on a row of its own across them), `.date-picker-field`, `.date-picker-input` (`.long`; also the shared `.field.field-sm`, its value two digits), `.date-picker-foot`. A fraction field of more than three digits is `.long` and sets `--date-picker-digits` to its digit count, which its width reads.

## Labels read

`dateTime` (`DateTimeLabels`): `locale` for month and weekday names through `Intl`, `previousMonth`, `nextMonth`, `hour`, `minute`, `second`, `millisecond` (fraction up to 3 digits), `microsecond` (4 to 6), `today`, `now`, `done`. See `docs/labels.md`.
