# Filter field marks (`@bigpixelrocket/uiok/filter`)

The two marks around a filter field's input: `FilterIcon` at the start and `FilterEscape`, a pressable Escape key cap, at the end.

## Example

```tsx
import { FilterEscape, FilterIcon } from '@bigpixelrocket/uiok/filter';

<div className="listing-root">
  <label>
    <FilterIcon />
    <input aria-label="Filter" value={query} onChange={(e) => setQuery(e.target.value)} />
    {query && <FilterEscape label="Clear filter" onEscape={() => setQuery('')} />}
  </label>
</div>;
```

## Props

- `FilterIcon`: none. Decorative (`aria-hidden`); the input's own label names the field.
- `FilterEscape` (`FilterEscapeProps`): `label` (what a press does, used as the accessible name and tooltip) and `onEscape` (do what Escape does in the field: clear the query, or close).

## Behaviour

- `FilterEscape` takes no focus (`tabIndex={-1}`, mousedown cancelled), so the input keeps the keys while it is pressed. Where focus goes after the field closes is the caller's decision.
- Pressing Escape on the keyboard is the caller's to handle; the key cap only gives the pointer the same action.

## Styling

The rules apply inside the listing scope, `.listing-root`: `.filter-icon` is 20px wide, the width of a row's icon column, so the query lines up with row names; `.filter-escape .keychord` draws as a 16px key cap that lights on hover. The field itself (the row that holds the marks and the input) is the app's to lay out; UIOK styles only the marks.

## Labels read

`keys.escapeCap`, through `KeyChord`.
