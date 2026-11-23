# Notices, cards, swatches, tags, fact tables, selection, and shared recipes (`@bigpixelrocket/uiok/surface`)

Surfaces a page draws round its own content, each a component: `Notice`, `Card`, `FactTable` with `FactRow`, `GroupSwatch`, and `Tag`, with their looks in `@bigpixelrocket/uiok/styles.css`, and the shared recipes below.

## GroupSwatch

A group's colour beside its name (a tab, a tree row, a menu entry): an 8px square (`--space-4`, `--radius-xs` corners) in the theme's `--group-<hue>`, with the `--group-dot-ring` hairline. A square, because a round dot is a state mark (`StateMark`) and a group's colour is a category, never a status.

```tsx
import { GroupSwatch } from '@bigpixelrocket/uiok/surface';

<GroupSwatch group="purple" />
<GroupSwatch group="teal" hollow />
<GroupSwatch group={null} label="No group" />
```

| Prop     | Type               | Meaning                                                                                                                                                                     |
| -------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `group`  | `GroupHue \| null` | The hue (`GroupHue` from `@bigpixelrocket/uiok/themes`: `blue`, `green`, `purple`, `orange`, `teal`, `pink`, `yellow`, `red`); `null` for no group, drawn in `--text-faint` |
| `hollow` | `boolean`          | Its outline alone (a 2px inner ring in the hue): a group that is closed or off                                                                                              |
| `label`  | `string`           | Given, the swatch is an image with that name and tooltip; omitted, it is hidden from assistive technology, since the name beside it says it                                 |

Classes: `.group-swatch[data-group]`, `.hollow`.

## Tag

A small worded tag beside a name: an environment ("Production", "Staging", "Local"), a kind ("Template", "System"), a default, a pending state ("Restart pending"). A pill washed in its tone with the words in the tone's text role, in the caption size, its words kept in their case unless `caps`. Each tone's words keep 4.5:1 on its wash and on the listing's cursor and marked rows.

```tsx
import { Tag } from '@bigpixelrocket/uiok/surface';

<Tag tone="danger">Production</Tag>
<Tag tip="The value the server starts with">default</Tag>
```

| Prop       | Type      | Meaning                                                            |
| ---------- | --------- | ------------------------------------------------------------------ |
| `children` | `string`  | The words                                                          |
| `tone`     | `TagTone` | `neutral` (default), `accent`, `ready`, `warning`, `danger`        |
| `caps`     | `boolean` | Small capitals with the caps tracking, as a release channel's tag  |
| `tip`      | `string`  | More than the words say, as its tooltip and accessible description |

| Tone      | Wash             | Words               |
| --------- | ---------------- | ------------------- |
| `neutral` | `--fill`         | `--text-on-surface` |
| `accent`  | `--accent-wash`  | `--accent-text`     |
| `ready`   | `--success-wash` | `--success-text`    |
| `warning` | `--warning-wash` | `--warning-text`    |
| `danger`  | `--danger-wash`  | `--danger-text`     |

Which tone an environment takes is the app's call; a common choice is Production `danger`, Staging `warning`, Local `ready`. Classes: `.tag[data-tone]`, `.caps`. A tag cut by its column ends in an ellipsis.

## FactTable

A short table of facts on a settings page or a detail page, one thing a row: what a page checks and reports (the tools it runs, where each is, its version), not what the user edits (a `FieldRow`'s) and not a list the keys move through (a `Listing`).

```tsx
import { FactRow, FactTable } from '@bigpixelrocket/uiok/surface';

<FactTable label="Tools">
  <FactRow
    detail="/opt/homebrew/bin/brew"
    name="Homebrew"
    tone="ready"
    toneLabel="Found"
    value="4.6.11"
  />
  <FactRow
    detail="~/.zshrc"
    name="Shell activation"
    tone="warning"
    toneLabel="Not found"
    value="missing"
  />
</FactTable>;
```

| Part        | Props                                                       | Draws                                                                                        |
| ----------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `FactTable` | `label` (the table's accessible name), `children`           | `.fact-table` (`role="table"`), the rows' columns shared through a subgrid, a hairline above |
| `FactRow`   | `tone` (`FactTone`), `toneLabel`, `name`, `detail`, `value` | `.fact-row[data-tone]`: the state glyph, the name, the detail, the value, a hairline under   |

`FactTone` is `'ready'` (a check, `--success-text`), `'warning'` (a triangle, `--warning-text`), `'danger'` (a cross, `--danger-text`), or `'muted'` (a dashed ring, `--text-dim`): each a shape of its own, so the state reads without its hue, named by `toneLabel` as an image with that tooltip. The name is in the interface face, the detail and the value in the code face, the value right-aligned in figures of one width; a name or a string detail cut short shows whole in its tooltip. The words can be swept and copied. Put a page's note about the table under it as a `FieldNote`.

## Notice

A message about something on the page, drawn as a desktop application's status text, never a web page's alert: a plain line on the surface it sits on, a small status glyph in the tone's colour, then the words in `--text`, and an optional small button after the words. It has no tinted fill, no frame, and no side bar.

```tsx
import { Notice } from '@bigpixelrocket/uiok/surface';

<Notice actions={<Button size="small">Try Again</Button>} role="alert" tone="danger">
  The settings file could not be saved.
</Notice>;

<Notice band cutText={message} tone="warning">
  {message}
</Notice>;
```

| Prop       | Type                                           | Meaning                                                                                                                     |
| ---------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `children` | `ReactNode`                                    | The words; `<code>` inside for a server's or system's own words                                                             |
| `tone`     | `'note' \| 'success' \| 'warning' \| 'danger'` | The glyph's tone; `note` by default                                                                                         |
| `glyph`    | `ReactNode`                                    | Replaces the tone's glyph (Info, CircleCheck, TriangleAlert, CircleAlert): a `Spinner` while work runs; `null` for none     |
| `actions`  | `ReactNode`                                    | Small buttons after the words                                                                                               |
| `band`     | `boolean`                                      | The window's status line under a header (`notice-card`): one line cut with an ellipsis, `cutText` as its tooltip while cut  |
| `cutText`  | `string`                                       | The words as plain text, for a band's tooltip                                                                               |
| `role`     | `'status' \| 'alert' \| null`                  | `status` by default; `alert` for a failure the user should act on; `null` for a notice that is part of the page as it loads |

It draws these classes:

| Class                                               | Meaning                                                                                                                                                                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notice`                                            | The line in the page's flow; a note (`--text-faint` glyph) unless a tone class is set                                                                                                                                 |
| `notice-danger`, `notice-warning`, `notice-success` | The tone of the glyph (`--danger`, `--warning`, `--success`); the words stay in `--text`                                                                                                                              |
| `notice-card`                                       | The window's status line under a header: the same plain line at the window's inset, a hairline under it; its words stay on one line, cut with an ellipsis, so give the `notice-text` `cutTooltip` with its whole text |
| `notice-text`                                       | The message; wraps (one line in a `notice-card`); its words can be selected and copied                                                                                                                                |
| `notice-glyph`                                      | A glyph that is not the first `svg`                                                                                                                                                                                   |
| `notice-actions`                                    | A small button or two right after the words, centred on the first line                                                                                                                                                |
| `code` inside a notice                              | The server's or system's own words (an error code, a statement) in the code face at the notice's size                                                                                                                 |

A notice that reports a failure the user should act on takes `role="alert"`; one that reports a state takes `role="status"`.

### Where a message goes

- **A line where its subject is.** A message about one thing sits beside or under that thing: a field's problem under the field (`field-problem`, which draws its own glyph), a step's failure under the step, a refusal in a listing (`pane-message danger`, which draws its own glyph), a file's problem under the file. This is the default.
- **The status line** for what concerns the whole pane or window and needs no action: a count, a state, a finished step. A status line under the header (`notice-card`) is for a state that stands until the user fixes it elsewhere, such as a settings file with a mistake: glyph, words, a small button to show the problem, and no close cross, since it goes when its cause does.
- **An alert dialog** for a message that must stop the user, or that asks a decision before anything goes on. A message never borrows weight from a box, a tint, or a coloured bar: if a line is not enough, it is a dialog.

A failure told in two parts, what failed and why, colours them one way everywhere: the glyph carries the danger tone, the headline stays in `--text`, and the reason stays in the body's quiet colour (`--text-dim`, in the code face when it is a raw line the system returned, such as an error code and a host). `RunHeader`'s failed state, a load failure, a palette's failure note, and every notice follow it, and no notice sets its words in red. The one exception is the Updates card, a designed surface: a failure that is the card's headline (its `error` tone, or a failed download under its head) takes `--danger-text` and its reason `--text`, as the card had it before ([Settings, themes, and updates](shell.md)).

Each tone has one glyph, drawn first in a notice, a problem line, or a status card, in the tone's colour (`ICON_MD` in a notice and a problem line):

| Tone    | Glyph           | Where                                                                                                                                                                                                                                       |
| ------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Danger  | `CircleAlert`   | A failure the user should act on: `notice-danger`, `field-problem`, `pane-message danger`, `palette-failure`, a settings file's problem, the settings folder's path (`settings-file-path`), a load failure, a terminal that could not start |
| Warning | `TriangleAlert` | A state that works but needs a second look: `notice-warning`                                                                                                                                                                                |
| Success | `CircleCheck`   | A finished step: `notice-success`, and a `RunHeader` that is done                                                                                                                                                                           |
| Note    | `Info`          | A neutral `notice`: a fact the user may want, nothing wrong                                                                                                                                                                                 |

`CircleX` marks one thing only: a run that failed, as `RunHeader`'s failed state draws it (and a host's list of runs that follows `RunHeader`'s run states). A notice or a status line that reports a failure takes `CircleAlert`, never `CircleX`.

## Card

```tsx
import { Card } from '@bigpixelrocket/uiok/surface';

<Card label="Updates">
  <SectionHead>Updates</SectionHead>…
</Card>;
```

`Card` takes its `children` and an optional `label`, which names it as a `region` landmark; leave `label` out for a card that is one part of a page among many alike. It draws `card`: a lifted panel (`--card-bg`, a `--border-strong` frame like every framed surface, `--radius-md`, 12px inset) grouping one subject's lines, such as the Updates page's check cadence and its status ([Settings, themes, and updates](shell.md)). Its first child starts at the inset and its last ends there, whatever margins a heading or a paragraph brings; the space between children stays the content's own. Parts inside a card are parted by a hairline (`--border`). A card groups content; it is never a message's box: a notice stays a plain line ([Notice](#notice)).

## Selection

Chrome cannot be selected: the base sheet sets `user-select: none` on the body, so labels, buttons, tabs, headings, menu items, and a row's parts cannot be swept or double-clicked into a selection, and a drag never smears a highlight across the window. Content opts back in, at zero weight so a host rule wins:

- Fields (text inputs, textareas, anything `contenteditable`).
- `selectable`, on a host's own content: a value, a name, a path, output, anything a user would copy. A `code`, `pre`, or `samp` element is not content by its tag: a command named in a label or a token in a menu is chrome, so a value a user copies takes `selectable` (`<code className="selectable">`).
- Each component's content, in its own rule: a listing's summary, messages, empty space, and well (`pane-summary`, `pane-filter-summary`, `pane-message`, `pane-empty`, `pane-well`); a grid's empty line (`data-grid-empty`); a dialog's message, values, fact counts and values, and statements (`dialog-message`, `dialog-value`, `dialog-fact-count`, `dialog-fact-value`, `dialog-statement code`); a message's words (`notice-text`, `field-problem`, a settings file's problem, the settings folder's path (`settings-file-path`), a load failure's headline and reason, the update card's fact, a palette's note and failure); a run's reason, figure, and facts; a pie's value; the terminal's copy buffer; the About window's version; a host key's fingerprint.

A listing and a grid select rows, not text, as a file manager does: a drag, Shift-click, or double-click on a row never starts a text selection, even inside a `selectable` host, and a grid copies its cursor cell with ⌘C.

Inside selectable text the pointer is the I-beam (the browser draws it only over text that can be selected); everywhere else it is the arrow. A selection in a window that is not in front greys to `--fill`.

## Shared recipes in the base sheet

| Class or rule    | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `overline`       | The small uppercase heading over a group (a menu's `entry-menu-heading` wears it too): caption size, strong weight, `--tracking-caps`, `--text-dim`, interface face, no margin; with `keep-case`, a heading that is a name of its own (a schema, a host) keeps its case and drops the caps tracking                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `scroll-fade`    | On a scrolling element: its top and bottom edge fade over `--scroll-fade-size` (12px) while more content lies past that edge. `scroll-fade-end` fades the bottom edge only, for a scroller with a sticky header at its top; `scroll-fade-x` fades the inline edges and combines with either. The fade covers the padding box only: the element's own border, corners, and scrollbar stay solid, so a framed scroller keeps its frame. What scrolls fades with the element's own background, so a scroller whose ground differs from what is behind it paints that ground on a wrapper (frame outside, fade inside). A list of whole rows sets `--scroll-fade-size: var(--row-height)` so its last row fades through its words. A mask clips `position: fixed` children too (a popover's panel, a full-screen surface), so a scroller that can hold an open popover drops the class while it is open, or the popover mounts outside it                                                                                                                                                                                                                                                                                     |
| `frost`          | The one frost recipe (`backdrop-filter: var(--frost)`) for a translucent layer over scrolling content; its wash is the layer's own (`--scrim` for a backdrop)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Hover and press  | Quiet controls (pager steps, legend slots and verbs, quiet and icon actions, the path star, crumbs, a strip's actions) hover with the frosted wash and ring; tabs, segments, day cells, sort labels, and the Settings sidebar's page and subsection rows with the wash alone; all of them and the grid-sort and palette-level controls press with `--pressed-wash` and `--press-frost` (`--shadow-pressed` and an inner `--border-strong` hairline), words in `--text`. A quiet control or track item whose menu or popover is open (`aria-expanded="true"` together with `aria-haspopup`, or on a crumb, which only ever opens its menu) keeps its hovered face, from the same rule, so a host writes no open state of its own; a host gives every pop-up trigger `aria-haspopup`. A fold or disclosure that is open (`aria-expanded="true"` without `aria-haspopup`) keeps its rest face, since its glyph already says it is open. Hover and press each weigh one pseudo-class, so press wins while held and a component's state rule wins over both; a component must not give its own hover more weight. The chosen item (`aria-selected="true"`, `aria-checked="true"`, `aria-current` naming a place) takes neither |
| Joining a recipe | A host's own control takes a recipe by class instead of restating it, and so follows every later change to it: `quiet-control` takes the quiet control's hover (frosted wash and ring) and press; `quiet-track-item` takes the track item's hover (the wash alone) and press, for a tab or segment inside a frame the host draws. Each carries states only, never a rest face, so the host keeps its size and shape. A host that writes a press of its own uses `--press-frost` (the pressed shadow and the inner `--border-strong` hairline) for its `box-shadow`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `toggle-chip`    | A toggle on a `button` with `aria-pressed`: off, a `--control-border` outline on a clear ground with words in `--text-dim`, small interface type, so an unpressed toggle reads as a control; hover and press are the quiet control's; on, the toggle-on look below. 28px high, `toggle-chip-sm` 24px, `toggle-chip-xs` 20px inside a row; the corner follows the height (`--radius-md`, `--radius-sm` at 20px). A host sets only its place (margins, a gap, a minimum width)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Toggle on        | A `button` with `aria-pressed="true"` (a mode, a filter chip, an open menu's chip) takes the current item's look: `--current-bg`, an inner `--current-ring` hairline, `--current-text`. Every hover and press recipe (the base sheet's and each component's own) leaves it out, so it holds under the pointer; a press sinks it under the pressed shadow inside the same ring; a host that paints the button's rest face with more weight leaves the on state to it (`:not([aria-pressed='true'])`). A toggle that mirrors a held key keeps its own solid accent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Native colours   | `::selection` (`--text-selection-bg` with `--text`, the one colour the tint is floored for), `::placeholder` (`--text-placeholder`), the caret and native checks (`--accent`), and scrollbars (`--scrollbar-thumb`) follow the theme, on the root and in a theme preview. A text input, textarea, or select with no class takes a zero-weight floor: a `--control-border` outline on `--ground` in `--text`, so a control a page forgot to class is never the browser's white or grey box; `field` and any host rule win over it. A checkbox or radio with no class takes the `check` look ([Field](field.md)). Selected text greys to `--fill` in a window that is not in front (`:window-inactive`). Every control and link shows the arrow, never the hand, through a zero-weight `cursor: default`                                                                                                                                                                                                                                                                                                                                                                                                                    |
