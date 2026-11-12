# Scale tokens

Themes change colour only. Every other value the library draws with (sizes, spaces, corners, line weights, timings, heights, layers, focus geometry, icon sizes) is a token in `src/tokens.css`, which `@bigpixelrocket/uiok/styles.css` imports, so it holds in every theme. A stylesheet reads the token, never the number: `test/tokenValues.test.ts` fails on a raw font size, weight, line height, radius, z-index, duration, easing, gap, padding, or margin where a token exists. An app reads the same tokens for its own surfaces, so a relationship (an icon to its label, a field beside a button) is drawn the same way in the library and the app.

Colour tokens are in [themes](themes.md).

## Type

| Token                 | Value | Role                                                                                 |
| --------------------- | ----- | ------------------------------------------------------------------------------------ |
| `--font-size-key`     | 10px  | A letter or a word inside a key cap                                                  |
| `--font-size-caption` | 11px  | Column and group labels, counts, pill tabs, chart labels, uppercase headings         |
| `--font-size-small`   | 12px  | Compact control labels, status lines, help text, dialog titles, grid cells, tooltips |
| `--font-size-body`    | 13px  | Listing rows, regular Button labels, body text, the terminal                         |
| `--font-size-heading` | 14px  | A run headline, an empty state's title, a card title                                 |
| `--font-size-figure`  | 18px  | A run header's big figure                                                            |
| `--font-size-display` | 20px  | A startup or splash title                                                            |

| Token                   | Value | Role                                       |
| ----------------------- | ----- | ------------------------------------------ |
| `--line-height-compact` | 16px  | 11 and 12 px text in one-line chrome       |
| `--line-height-body`    | 20px  | 13 and 14 px lines                         |
| `--line-height-prose`   | 1.5   | Wrapped sentences                          |
| `--line-height-heading` | 1.25  | Titles                                     |
| `1` (literal)           |       | A single-line control whose height it sets |

| Token                   | Value  | Role                                                        |
| ----------------------- | ------ | ----------------------------------------------------------- |
| `--font-weight-regular` | 400    | Running text; resets                                        |
| `--font-weight-medium`  | 500    | Labels that head data: column labels, strip links, tooltips |
| `--font-weight-strong`  | 600    | Control labels, titles, the current item                    |
| `--tracking-caps`       | 0.04em | Letter-spacing of a small uppercase heading                 |

Italic has one meaning: a value that stands for no value, or that is not literal. A grid's or a form's NULL, a "none" where a key or a setting has nothing, a name a rename leaves unchanged, a value marked as in use. It is set with `font-style: italic` on that value's own class, in the value's quiet colour (`--text-dim`), never on a label, an action, a heading, an alias, a session or connection name, or a comment, which stay upright in their own colour. The library's one use is the grid's NULL cell (`.cell-null`). Two kinds of text are not interface text and keep their own conventions: highlighted code keeps its language's (a code comment in italic, as every editor sets it), and a brand lockup keeps its own weights (300 and 700), which no weight token names.

Faces: `--font-mono` for what a user could type or copy (names, paths, values, commands, field contents, key caps, listing rows, title-strip titles, the terminal); `--font-ui` for sentences and for labels that head data (column labels, group headings, button and form labels).

## Space

On a 2px grid; the step number times 2 is the pixel value.

| Token        | Value | Use                                                                      |
| ------------ | ----- | ------------------------------------------------------------------------ |
| `--space-1`  | 2px   | Between items of one cluster (pager steps, tabs, key caps)               |
| `--space-2`  | 4px   | Icon to label in inline controls; label or help to its field; menu inset |
| `--space-3`  | 6px   | Icon to label in buttons and tabs; pane gutter                           |
| `--space-4`  | 8px   | Control to control; row inset; form row to row; small control padding    |
| `--space-5`  | 10px  | Page tab padding; column gap in facts lists                              |
| `--space-6`  | 12px  | Regular control padding; dialog, card, popover, and well inset           |
| `--space-8`  | 16px  | Section to section; form block inset                                     |
| `--space-10` | 20px  | The icon column of a row                                                 |
| `--space-12` | 24px  | Large gaps between groups on a page                                      |
| `--space-16` | 32px  | Empty-state padding                                                      |

A 1px line or optical nudge stays a literal. Listing columns space in `ch` (`--pane-column-gap: 1.5ch`), because they are measured in characters. A negative margin that cancels a parent's inset is `calc(-1 * var(--space-n))`; an indent past an icon column is `calc(<inset> + var(--icon-column))`.

## Relationships

| Between                          | Space                                                                                                                                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Icon and its label               | 6px (`--space-3`); 4px (`--space-2`) in a 20px inline control                                                                                                                                                   |
| Control and control              | 8px (`--space-4`); 2px (`--space-1`) inside one cluster                                                                                                                                                         |
| Label or help text and its field | 4px (`--space-2`)                                                                                                                                                                                               |
| Form row and row                 | 8px (`--space-4`)                                                                                                                                                                                               |
| Section and section              | 16px (`--space-8`)                                                                                                                                                                                              |
| Surface edge and content         | 12px (`--space-6`) on every side of a framed surface (card, dialog, well, a framed band of several lines); a band one line high may keep `var(--space-3) var(--space-6)`; 4px for a menu; 16px for a page block |
| Icon size and text size          | `--icon-sm` beside 11 and 12 px text; `--icon-md` beside 13px text; `--icon-lg` for a title icon                                                                                                                |
| Controls that share a row        | One height token; a field beside a Button takes the Button's height                                                                                                                                             |
| Corner and height                | Up to 22px high `--radius-sm`; from 24px `--radius-md`; overlays `--radius-lg`                                                                                                                                  |

## Corners and lines

| Token           | Value | Role                                                                              |
| --------------- | ----- | --------------------------------------------------------------------------------- |
| `--radius-xs`   | 2px   | Match highlights, marks, swatches                                                 |
| `--radius-sm`   | 4px   | Parts and controls up to 22px high; rows inside a menu; key caps                  |
| `--radius-md`   | 6px   | Controls from 24px; panes, cards, tooltips, grids                                 |
| `--radius-lg`   | 8px   | Menus, dialogs, palettes, popover panels                                          |
| `--radius-pill` | 999px | Pills, dots, switch tracks                                                        |
| `--line`        | 1px   | Every hairline, divider, and outline                                              |
| `--line-strong` | 2px   | State marks: a current tab's underline, a key cap's foot, drop marks, status bars |

Frames and dividers: a whole frame round a surface (a card, a well, a framed band, a pane) is `var(--line) solid var(--border-strong)`; a divider between parts inside it (a row rule, a column rule, a section's hairline) is `var(--border)`. A rule that draws a full `border` with a `border-radius` is a frame, so it reads `--border-strong`. A well that holds several lines (a path list in a confirmation, a shown SQL statement, a list of advice) is framed at `--radius-md`, whatever its height, so every well matches the cards and panes around it; `--radius-sm` stays for one-line parts and key caps.

A corner nested inside another keeps it concentric: `calc(var(--radius-md) - var(--space-1))` for a segment 2px inside its track, `calc(var(--radius-lg) - 1px)` for a dialog's title strip inside its border. A side that meets an edge is `0`.

## Motion

| Token               | Value                          | Use                                                                                            |
| ------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `--duration-fast`   | 120ms                          | Hover, focus, and press feedback; progress fills                                               |
| `--duration-base`   | 200ms                          | A surface entering or settling                                                                 |
| `--duration-slow`   | 280ms                          | Glides; a refusal's shake and red together; a bell                                             |
| `--duration-signal` | 280ms                          | A change shown by colour alone (a refusal's red under reduced motion); reduced motion keeps it |
| `--duration-spin`   | 1s                             | One turn of a spinner, a pulse, a cursor blink                                                 |
| `--duration-loop`   | 1.4s                           | One sweep of a slow loop that shows work without a figure: a loading shimmer                   |
| `--duration-notice` | 2.4s                           | One beat of a flash that must be seen before it ends: a key that just changed                  |
| `--ease-out`        | cubic-bezier(0.2, 0.8, 0.2, 1) | Entering and gliding                                                                           |
| `--ease-in-out`     | ease-in-out                    | Shakes and pulses                                                                              |

Progress and spinners run `linear`; a blink steps with `steps()`. Rows, menu options, and tabs change at once on hover, as native lists do; controls drawn with the frosted hover take `--duration-fast`.

`--transition-control` is the feedback transition every control writes on its rest state: background, border, shadow, text colour, and filter, each at `--duration-fast`. The base sheet sets it on every quiet control its hover and press recipes cover (`docs/components/surface.md`), and the Button and the form controls read the same steps.

Reduced motion: under `prefers-reduced-motion: reduce`, `tokens.css` sets the three one-shot durations to 0ms (`--duration-signal` keeps its length: it moves nothing, and a colour that carries meaning must stay visible), so a transition or one-shot animation written with them needs no query of its own. A loop (a spinner, stripes, a pulse, a blink) stops itself with `animation: none` in its own query. The base sheet's `uiok-spin` and `uiok-pulse` keyframes serve every spinner and pulse. Every "this is running" signal breathes at one rate, `uiok-pulse var(--duration-spin)`, whether it marks a listing row or a tab. A delay (`transition-delay`, `animation-delay`) is a motion token too.

## Heights

| Token                 | Value | Controls                                                                               |
| --------------------- | ----- | -------------------------------------------------------------------------------------- |
| `--control-height`    | 28px  | Button, IconButton, text field, select, page tab strip                                 |
| `--control-height-sm` | 24px  | Small Button, a dense form's field and select, segmented choice, legend slot, day cell |
| `--control-height-xs` | 20px  | Crumb, quiet action, row icon action, pager step and select, in-row editor             |
| `--row-height`        | 24px  | Listing row, menu option                                                               |
| `--row-height-dense`  | 22px  | Data grid row, column strip                                                            |
| `--bar-height`        | 26px  | Path bar, status line, tab strip, query row                                            |
| `--bar-height-lg`     | 34px  | Title strip, key legend, dialog legend                                                 |
| `--hit-target`        | 24px  | The smallest pointer target, whatever the drawn size                                   |

A control drawn smaller than `--hit-target` keeps its drawn size and grows its hit area with a pseudo-element: the `.hit-target` utility class, or the same `::after` in a component's sheet. Where neighbours sit closer than the growth (pager steps 2px apart), it grows in the block axis only. The segmented choice reads `--segmented-height` (small by default); a form of regular fields sets it to `var(--control-height)`.

A field's height follows its place, the same in every app: `--control-height` (`.field`) in a dialog or a single prompt, `--control-height-sm` (`.field-sm`) in a page form or a toolbar, `--control-height-xs` (`.field-xs`) inside a row or a path bar. A button or segmented choice on the same line takes the same height. A control, row, or bar height is always one of these tokens: `test/tokenValues.test.ts` fails on a raw `height`, `min-height`, or `max-height` of 12px or more.

## Focus

One ring for everything focusable. The base sheet draws it with zero weight (`:where(…):focus-visible`), so a component changes only the offset:

| Token                  | Value | Use                                                                                                                |
| ---------------------- | ----- | ------------------------------------------------------------------------------------------------------------------ |
| `--focus-ring-width`   | 2px   | The ring's width, drawn `solid var(--accent)`                                                                      |
| `--focus-offset`       | 1px   | The default: just outside the control, following its corner                                                        |
| `--focus-offset-flush` | 0px   | On the edge: a compact control in a bar with room around it keeps its corners                                      |
| `--focus-offset-inset` | -2px  | Inside: only where a parent clips (a tab in a scrolling strip, a segment in its track, a grid, a well, a day cell) |

The ring follows the control's `border-radius`, so a control with corners shows a rounded ring at the default and flush offsets. A text field draws the same 2px accent edge without growing: `border-color: var(--accent)` plus `outline: var(--line) solid var(--accent)` at `--focus-offset-flush`, and no soft halo. A container focused by script (`tabindex="-1"`) draws no ring. The shared form controls (`.field`, `docs/components/field.md`) draw this field edge for you. The ring's colour is written where it is drawn, not held in a token: a token resolves `var(--accent)` on `:root` and would miss a theme preview scope's own accent.

## Pointer

The pointer is the arrow (`cursor: default`) over every control: a button, a tab, a row, a link, a crumb, a toggle, enabled or disabled, as it is in a desktop application. A disabled control shows the arrow and its fade; never `not-allowed`. The I-beam (`text`) stays where text is typed or selected, the resize cursors (`col-resize`) on column edges and splitters, and the crosshair on a plot where a drag picks a region. A dragged grid heading keeps the arrow. `test/cursor.test.ts` fails on `pointer`, `grab`, `grabbing`, `not-allowed`, or `no-drop` in any stylesheet or inline style of `src/` or `site/src/`; a host mirrors it over its own stylesheets with the same pattern.

## Icons

| Token           | Value | Use                                                                                    |
| --------------- | ----- | -------------------------------------------------------------------------------------- |
| `--icon-sm`     | 12px  | Beside 11 and 12 px text; inside a 20px inline control                                 |
| `--icon-md`     | 14px  | Beside 13px text in rows, tabs, and buttons                                            |
| `--icon-lg`     | 16px  | A dialog's title icon, a run header's glyph, empty-state actions, a row's product mark |
| `--icon-xl`     | 28px  | The glyph over an empty state or a failure                                             |
| `--icon-column` | 20px  | The leading icon column of a row or menu option                                        |

`ICON_SM`, `ICON_MD`, `ICON_LG`, and `ICON_XL` (`@bigpixelrocket/uiok/icon`) are the same sizes for lucide's `size` prop. A media viewer's 64px placeholder glyph is the one size above `--icon-xl`, an app's documented exception.

Every icon keeps lucide's default stroke (2 on its 24-unit grid); a glyph larger than `--icon-lg` passes `absoluteStrokeWidth` ([icon](components/icon.md)). An icon takes its label's colour; a row's leading icon takes `--text-dim`.

## Marks

| Token       | Value | Use                                                                     |
| ----------- | ----- | ----------------------------------------------------------------------- |
| `--dot`     | 6px   | A status or presence dot beside a name: a state mark, a running marker  |
| `--space-4` | 8px   | A group's colour swatch, which reads as a colour rather than as a state |

A dot has one diameter everywhere; a mark that is not a state (a swatch) takes the next size, never one between.

## Layers

Inside a pane (its own stacking context): `--z-below` (-1, a backdrop under its own box's content), `--z-raised` (1, a sticky strip, a part lifted over its siblings), `--z-local-overlay` (2, an overlay inside a pane), `--z-menu` (3, a menu anchored in a pane), `--z-drag` (4, an item in the hand). On the page: `--z-panel` (10, floating panels), `--z-overlay` (15, a page-level surface such as a drop target or a full-screen page), `--z-dialog` (20), `--z-dialog-popover` (25, a popover opened from inside a dialog, such as the grid's inline editor), `--z-tooltip` (30).

## Exceptions

`test/tokenValues.test.ts` checks, in every hand-written stylesheet: type sizes, weights, and line heights; corners; layers; durations and easings; gaps, paddings, and margins (logical longhands included); border and outline widths (`--line`, `--line-strong`, a focus token, `0`, or `none`); heights (a token, a percentage, or glyph geometry under 12px); opacity (`0`, `1`, or a token); shadows (a blur only inside a `--shadow-*` token; a ring or edge is crisp); filters (`filter` and `backdrop-filter`: a token or `none`; a press is a token fill, never a brightness filter); `color-mix(` (a tint is a theme token; only a hook listed in the test's `MIXED_PROPERTIES`, whose ink the host or the theme passes in, may hold one); delays with durations; and a control's `width` and `min-width` (in a rule whose height is a control height token, a raw length fails: a square control repeats its height token). These stay literal, each with a comment where it is written, and the test lists them:

- Key caps: the 12px key box and its line height, 16 and 18 px cap heights. They are glyph geometry, never a pointer target by themselves.
- The slider's 12px knob on its 4px trough, glyph geometry.
- Plot heights in charts (an empty plot's 120px, a scatter plot's 380px drawing and 180px floor) and the Settings dialog's fixed 620px frame: layout sizes, not controls.
- The shared pulse's 0.35 low point: a keyframe of the motion, not a state's opacity.
- The docs site's demo frames and brand mark heights.
- The terminal's 13px on 19px cells (`.pane-well`): the engine's metric.
- The activity stripes' 0.9s loop, timed against the stripe period.
- The palette's fixed 104px drop from the window top: a placement.
- The docs site's prose sizes (`--site-font-*` in `site/src/site.css`), its wordmark, its page margins, and its loose list line height. A reading page is not the compact interface.
- `em` sizes for inline code in running text; `ch` spacing in listings; widths and component geometry no scale names (a key box, a swatch on the docs site).
