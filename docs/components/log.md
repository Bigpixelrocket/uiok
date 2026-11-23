# Log (`@bigpixelrocket/uiok/log`)

A log in a well: the lines a process or a service wrote, each source's prefix in a colour of its own, so a combined log of several processes reads at a glance (Overmind's and Foreman's coloured prefixes).

## Example

```tsx
import { LogWell } from '@bigpixelrocket/uiok/log';

<LogWell
  label="Combined log"
  sources={['web', 'vite', 'queue.1']}
  lines={[
    { key: 1, source: 'vite', text: 'ready in 412 ms' },
    { key: 2, source: 'web', text: 'Server running on http://127.0.0.1:8000' },
    { key: 3, source: 'reverb', text: 'Exited with code 1. Restarting in 1 s', tone: 'danger' }
  ]}
/>;
```

## `LogWell` (`LogWellProps`)

| Prop      | Type                 | Default | Purpose                                                                                                |
| --------- | -------------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `lines`   | `readonly LogLine[]` |         | `{ key, source?, text, tone? }`: what wrote it, its words, and a tone the host marks                   |
| `label`   | `string`             |         | The log's accessible name                                                                              |
| `sources` | `readonly string[]`  | `[]`    | The sources in the order their colours go, so each keeps its colour; any other takes the next          |
| `follow`  | `boolean`            | `true`  | Keeps the newest line in view while the reader is at the foot; a reader scrolled up stays put          |
| `empty`   | `string`             |         | The words shown while the log has no line                                                              |
| `ansi`    | `boolean`            | `false` | Reads the SGR escape sequences in each string line: colours, backgrounds, bold, dim, italic, underline |

### ANSI colour (`ansi`)

With `ansi`, a line whose text is a string is read by `ansiSegments(text)` into runs (`AnsiSegment`: `text`, `fg`, `bg` as `AnsiColour` names, `bold`, `dim`, `italic`, `underline`). The eight colours and their bright forms map to the theme's text tones, never the terminal's palette, which is tuned for the terminal's own ground: red `--danger-text`, green `--success-text`, yellow `--warning-text`, blue `--accent-text`, magenta and cyan the `--log-source-2` and `--log-source-5` hues, black `--text-dim`, white `--text`. A background draws a filled run, a badge, in the tone's solid fill and its on-colour (`--danger` with `--on-danger`, blue, magenta, and cyan on `--accent`). Dim sets a plain run in `--text-dim`; a dim filled run keeps its fill's on-colour, which stays legible on the fill. Inverse swaps them; 256-colour, true-colour, and underline-colour codes (38, 48, 58, in their `;` and `:` forms) are skipped whole, and a `:` group is one parameter (`4:3` a curly underline, drawn as underline, `4:0` underline off). Only a CSI ending in `m` with no private marker (`<`, `=`, `>`, `?`) and no intermediate byte is read as SGR; every other escape sequence (cursor moves, titles, DCS, SOS, PM, and APC strings with their payload, up to their BEL or string terminator) is dropped, in its 7-bit form (`ESC [`, `ESC ]`) or its 8-bit one (a C1 control, U+0080 to U+009F), and so is an escape cut off at the end of the line and any lone 8-bit control, so no control byte shows. Reading is linear in the line's length, and the text is never read as markup. Runs are `.log-ansi` spans with `data-fg`, `data-bg`, `data-bold`, `data-dim`, `data-italic`, and `data-underline`. Without `ansi`, a string is drawn as written.

A line's `tone` is `danger` (a failure, in `--danger-text`), `warning` (`--warning-text`), or `dim` (one of the log's own notes, `--text-dim`). With no source on any line the words stand alone, with no prefix column.

## Look

The code face at the small size on a panel in a framed well. Each source sits in a column as wide as the longest (`--log-source-width`), in its colour, then a quiet bar, then the words, which wrap only where a line is longer than the well. A source's colour is `--log-source-1` to `--log-source-6` in turn, starting over after the sixth: the palette's green, pink, blue, peach, teal, and mauve, each moved until it keeps 4.5:1 as text on a panel and the ground ([Themes](../themes.md)). `logSourceIndexes(sources, order)` gives each source its turn, `logSourceColour(index)` its token as a `var()`, and `logSourceWidth(sources)` the column's width in characters.

## Keyboard

The well takes the focus, so the arrow keys and Page Up and Down scroll it. It is a `log` region: a screen reader hears new lines without the focus moving. Its words can be selected and copied.

## Styling

`.log-well`, `.log-line` (`data-tone`), `.log-source` (reads `--log-source`), `.log-bar`, `.log-text`, `.log-empty`.

## Labels read

None: every word is a prop.
