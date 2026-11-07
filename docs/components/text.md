# Text (`uiok/text`)

`MarkedText` draws a name with the characters a fuzzy match hit tinted in place, for a filtered listing, a menu, or a palette.

## Example

```tsx
import { MarkedText } from 'uiok/text';

// positions from your matcher: UTF-16 code unit indices, ascending
<Row name={<MarkedText positions={match.positions} text={entry.name} />} rowKey={entry.id} />;
```

## API

- `MarkedText` (`MarkedTextProps`): `text` and `positions`. Unmatched runs render as plain text, matched runs as `<span class="name-hit">`.
- `highlightSegments(text, positions)`: splits a text into alternating `{ text, hit }` runs (`HighlightSegment`), so a row marks whole runs instead of wrapping every character. A character outside the basic plane is hit by both its code units and lands whole in one run.

`matchQuery` from `uiok/menu` reports positions in this form (`docs/components/menu.md`); any other matcher that reports code unit positions works too.

## Styling

`.name-hit`, inside the listing scope (`.listing-root`): a 22% accent tint behind the text. It never changes the text colour, so a name keeps the colour it already has.

## Labels read

None.
