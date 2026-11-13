# Filter field marks (`@bigpixelrocket/uiok/filter`)

The two marks around a filter field's input: `FilterIcon` at the start and `FilterEscape`, a pressable Escape key cap, at the end.

## Example

```tsx
import { FilterEscape, FilterIcon } from '@bigpixelrocket/uiok/filter';

<div className="listing-root">
  <label className="filter-field">
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

The rules apply inside the listing scope, `.listing-root`:

- `.filter-field` on the row that holds the marks and the input draws the field: as tall as the path bar (`--pane-path-height`), inset like a row, mono text, a `--border` foot that turns into a 2px `--accent` edge while the field holds the keys. A host may lay out its own row instead; the marks work in either.
- `.filter-icon` is `--icon-column` (20px) wide, so the query lines up with row names. It rests in `--text-dim` and lights with the accent while the field has the focus or a query.
- `.filter-escape .keychord` is the shared key cap (`docs/components/keychord.md`). It answers hover with the frosted wash and ring and a press with the pressed wash, and its hit area grows to `--hit-target`.

## Labels read

`keys.escapeCap`, through `KeyChord`.
