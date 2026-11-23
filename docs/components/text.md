# Text (`@bigpixelrocket/uiok/text`)

`MarkedText` draws a name with the characters a fuzzy match hit tinted in place, for a filtered listing, a menu, or a palette. `Code` sets a command, a path, or a name inside a sentence.

## Example

```tsx
import { MarkedText } from '@bigpixelrocket/uiok/text';

// positions from your matcher: UTF-16 code unit indices, ascending
<Row name={<MarkedText positions={match.positions} text={entry.name} />} rowKey={entry.id} />;
```

## API

- `MarkedText` (`MarkedTextProps`): `text` and `positions`. Unmatched runs render as plain text, matched runs as `<span class="name-hit">`.
- `highlightSegments(text, positions)`: splits a text into alternating `{ text, hit }` runs (`HighlightSegment`), so a row marks whole runs instead of wrapping every character. A character outside the basic plane is hit by both its code units and lands whole in one run.

`matchQuery` from `@bigpixelrocket/uiok/menu` reports positions in this form (`docs/components/menu.md`); any other matcher that reports code unit positions works too.

## Styling

`.name-hit`, wherever MarkedText is used: a `--match-bg` wash behind the text, which keeps the text at 4.5:1 on a listing, a panel, and the cursor row, and a 2px `--match-mark` underline that carries the mark on any row colour. It never changes the text colour, so a name keeps the colour it already has. On a selected listing row the wash is `--selection-hit`.

A mark is an inline block, so where a name ends in an ellipsis a cut inside a mark replaces the whole mark: the ellipsis never wears a match's wash.

## Code

A command, a path, or a name inside a sentence (a note, a field's help, a notice), so it reads as something to type or find:

```tsx
import { Code } from '@bigpixelrocket/uiok/text';

<PageNote icon={Info}>
  Installing adds the tap <Code>shivammathur/php</Code> and runs <Code>brew install php@8.4</Code>.
</PageNote>;
```

`CodeProps`: `children`, the words as the user would type or see them. It draws `code.inline-code`: the code face at the size of the words round it, on the faint `--control-track` wash with `--radius-xs` ends and a `--space-2` pad, in `--text` (never the accent, which reads as a link). A long one wraps anywhere, each line keeping its pad and ends (`box-decoration-break: clone`). It can be swept and copied with its sentence. Where the sentence is translated, the app's rich-text formatter maps its tag (`<code>`) to `Code`.

## Labels read

None.
