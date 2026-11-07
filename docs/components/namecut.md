# NameCut (`@bigpixelrocket/uiok/namecut`)

A one-line label that names a file, cut so the end of the name stays visible: `Copying "Better.Call.Saul…CtrlHD.mkv" to "Seed…`. The cut is CSS, so it follows the width the line has.

## Example

```tsx
import { labelParts, NameCut, nameParts } from '@bigpixelrocket/uiok/namecut';

<NameCut parts={labelParts('Copying "Better.Call.Saul.S01E01.1080p.BluRay.CtrlHD.mkv" to "Seedbox"')} />
<NameCut className="dialog-title" parts={nameParts(['"', { name: file }, '" already exists'])} />
```

## API

- `NameCut` (`NameCutProps`): `parts` and `className` (sets the line's type, colour, and size where it is drawn).
- `labelParts(line)`: cuts a line's first quoted name in its middle. It reads straight quotes and the quotation marks of translated lines: “ ” „ “ « » » « ” ”. The rest of the line follows as words.
- `nameParts(segments)`: builds a line from strings and `{ name }` segments. Empty strings are left out.
- `middleCut(name)`: splits a name into a head that gives way and a tail that stays. The tail is the extension and the six characters before it, 10 to 24 characters. A name of 20 characters or fewer is never cut.
- `partsText(parts)`, `CutPart` (`{ kind: 'text', text }` or `{ kind: 'name', head, tail }`).

## Behaviour

As the line narrows, the parts give way in this order:

1. The name's head (down to one character and its ellipsis) and the words after the name (at their end), together.
2. The words before the name, at their end.
3. The name's tail, at its front.

A short name is never cut in its middle; it joins the words around it. A cut name keeps its closing quote in its tail.

A line with a cut name is drawn for sight only (`aria-hidden`), and assistive technology reads one hidden copy of the whole line. The tooltip shows the whole line.

## Styling

`.name-cut`, `.name-cut-line`, `.name-cut-head`, `.name-cut-tail` (right to left for its front ellipsis; the name inside is a left-to-right `bdi`), `.name-cut-text`, `.name-cut-rest`. Inside a dialog title strip's `.dialog-context`, the line sits at the right edge.

## Labels read

None.
