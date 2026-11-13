# Form controls (`@bigpixelrocket/uiok/field`)

One look for everything a user types in or toggles: text fields, textareas, selects, number fields, checkboxes, radios, and switches, with their labels, help, and problems. The look is a set of classes on the native elements, so a form keeps its own markup, keyboard behaviour, and screen reader semantics; the stylesheet ships in `@bigpixelrocket/uiok/styles.css`. `Check` is the one component, for a checkbox whose state can be mixed, and `labelHelp` puts a control's help in its label's tooltip.

## Example

```tsx
import { Check, labelHelp } from '@bigpixelrocket/uiok/field';

const hostHelp = labelHelp('A name or an address this computer can reach.');

<div className="field-grid">
  <label className="field-label" htmlFor="host" {...hostHelp.label}>
    Host
  </label>
  <div className="field-value">
    <input
      aria-describedby="host-problem"
      aria-invalid={problem !== ''}
      className="field field-sm"
      id="host"
      {...hostHelp.control}
    />
    {problem === '' ? null : (
      <p className="field-problem" id="host-problem">
        {problem}
      </p>
    )}
  </div>
</div>;

<select className="field field-sm">…</select>;

<label className="field-choice">
  <input className="check" type="checkbox" />
  Show hidden files
</label>;

<label className="field-choice">
  <Check checked={some ? 'mixed' : all} onChange={toggleAll} />
  Check all
</label>;

<label className="field-choice">
  <input className="check" type="checkbox" />
  Start at login
</label>;

<label className="field-choice">
  <input className="switch" role="switch" type="checkbox" />
  Sharing
</label>;
```

## Classes

| Class           | On                                               | What it draws                                                                                                                                                                                                                                                                                                                                                                   |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `field`         | `input`, `select`, `textarea`                    | A well in the window ground, outlined in `--control-border`, 28px (`--control-height`): a dialog or a single prompt; its value in the code face at 12px. A textarea has no corner grip; its pane or dialog sizes it                                                                                                                                                             |
| `field-sm`      | with `field`                                     | 24px (`--control-height-sm`): a page form, a toolbar, a settings row                                                                                                                                                                                                                                                                                                            |
| `field-xs`      | with `field`                                     | 20px (`--control-height-xs`), 4px corners: an editor inside a row or a path bar                                                                                                                                                                                                                                                                                                 |
| `field-short`   | with `field`, on an `input`                      | A field for a short value (a port, a count, a code): eight characters of the code face wide, starting at its column's edge, wherever it stands (a `field-grid`, a dialog's form, a line of options). A field without it keeps its column's width                                                                                                                                |
| (none)          | `select.field`                                   | The platform arrow is replaced by an up and down chevron pair in `--text-dim`; a list box (`multiple` or `size`) has none. In a `field-value` a pop-up is as wide as its longest item, starting at the column's edge, never stretched across the column; a text field keeps the column's width                                                                                  |
| (none)          | `input.field[type=number]`                       | A stepper at the end: a 16px cap parted from the value by a `--control-border` hairline the field's height, an up arrow centred in its top half and a down arrow in its bottom half, so it reads as two buttons and not as a pop-up. The platform's spin buttons fill the cap and stay the hit area (top half up, bottom half down) but draw nothing; the arrow keys still step |
| `field-box`     | a `label` or `div` around a glyph and an `input` | The field's frame, heights (`field-sm`, `field-xs` on it), hover, and focus edge round a leading glyph (`ICON_SM`, in `--text-dim`) and a bare input: a filter box. Invalid takes `aria-invalid="true"` on the box                                                                                                                                                              |
| `check`         | `input[type=checkbox]`, `[type=radio]`           | A 14px box (`--icon-md`; a disc for a radio); on, an accent fill with the tick, dash (a checkbox's indeterminate state), or dot in `--on-accent`                                                                                                                                                                                                                                |
| `switch`        | `input[type=checkbox][role=switch]`              | A 24 by 14 track for a running thing turned on or off at once (a service, sharing); a setting is a `check`. The knob at the start on `--control-border`, at the end on `--accent` when on; it moves at once                                                                                                                                                                     |
| `range`         | `input[type=range]`                              | A 4px trough on `--control-track` inside a `--control-border` hairline, filled in the accent up to `--range-fill` (`style={{ '--range-fill': '40%' }}`), and a 12px knob                                                                                                                                                                                                        |
| `field-label`   | `label`, or any element                          | What the field is for: interface face, 12px on 16px, `--text-dim`                                                                                                                                                                                                                                                                                                               |
| `field-note`    | `p`                                              | One short line under a control that says what the current choice does ("Worn while the system is light.", "The next check is at 14:00."), so it changes with the choice; set as the label. Help that explains the control is its label's tooltip (`labelHelp`), unless a user must read it to fill the field                                                                    |
| `field-problem` | `p`                                              | What is wrong with the value, as a status line: the danger glyph (`CircleAlert` in `--danger`, drawn by the class) hung before its words in `--text`; name it in the field's `aria-describedby`                                                                                                                                                                                 |
| `field-group`   | `div`, `fieldset`                                | A group of choices on a `fieldset` under its `legend`, 4px apart. A field with its label is a `field-grid` row, never a label stacked over a field                                                                                                                                                                                                                              |
| `field-choice`  | `label` around a check, radio, or switch         | The control and its words 6px apart, at least 24px high; the whole label is the target                                                                                                                                                                                                                                                                                          |
| `field-grid`    | a container                                      | Rows of `field-label` then value on one label column, as wide as the longest label and capped at 40% of the form (a longer label wraps), the rest to the controls; a host sets `--field-label-width` for a column of its own (a Settings window's `settings-page` sets 136px on every page); each label centred on a 24px control                                               |
| `field-value`   | in `field-grid`                                  | A value of several lines (options, then a note), 4px apart                                                                                                                                                                                                                                                                                                                      |
| `field-option`  | in `field-value`                                 | One line of a value: choices or a field, wrapping, at least 24px high                                                                                                                                                                                                                                                                                                           |

## Help (`labelHelp`)

A desktop form shows a label and its control; what the control is for lives in the label's tooltip, not in a sentence under the field. `labelHelp(help)` returns both halves: spread `label` on the `field-label` (the help as its hover tooltip, from `tooltip()`) and `control` on the input or select it names (the help as its `aria-description`, which a screen reader reads when the control takes focus; a description on a label is never read). A label with help shows a cue, a dashed underline in `--text-faint` (`data-label-help`), so it reads apart from a label without, and its tooltip opens above the label (at its end where the window has no room above), never over the control it explains. Without help both halves are empty, so a settings row may pass an optional note straight through. `TooltipLayer` must be mounted once, as for every tooltip. The tooltip opens under the pointer only, as every tooltip does, so a keyboard user without a screen reader never sees it: help that a user must read to fill the field correctly stays visible, as a `field-note` under the control.

```tsx
const help = labelHelp(row.help);

<label className="field-label" htmlFor={id} {...help.label}>
  {row.label}
</label>
<div className="field-value">
  <select className="field field-sm" id={id} {...help.control}>…</select>
</div>
```

Keep a `field-note` under a control for a line whose meaning changes with the choice made, or for help a user must read to fill the field. A problem with the value stays a `field-problem` under the field. In a dialog the same holds: a form's explanation goes in its labels' tooltips (and a button's in its tooltip), not in a paragraph under the form.

## Heights by place

One rule in every app: `field` (28px) in a dialog or a single prompt, `field-sm` (24px) in a page form or a toolbar, `field-xs` (20px) inside a row or a path bar. A button or segmented choice beside a field takes the same height (`size="small"` beside `field-sm`; `--segmented-height` set to the field's height).

## States

Every control reads tokens only, in every theme. The demo shows each control in each state side by side.

- **Hover:** the outline steps up to `--text`, a visible step in light and dark themes alike; a checked box or a switch takes the lit edge a filled button takes. A read-only field does not lift.
- **Pressed:** an empty box takes the pressed wash; a filled box takes its tone's pressed fill (`--accent-pressed`, or `--danger-pressed` and `--warning-pressed` for a toned or invalid box), at least 1.12:1 from the rest fill (darker in light themes, lighter on near-black grounds), with no inset shadow, which on a 14px box would cancel a lighter step; its edge keeps the rest fill. A switch's track sinks inside the shared hairline while held, its knob still; a slider's knob sinks on the pressed wash with a `--text` outline.
- **Focus:** a field (or a field box) draws a 2px accent edge on its own border (border plus a 1px ring at the flush offset), so nothing beside it moves; a check, radio, or switch takes the base ring; a slider rings its knob, not its box.
- **Invalid:** `aria-invalid="true"` outlines a field in `--danger` (and rings it in the danger tone when focused). On a check or radio it is the danger tone, off or on: an empty box outlines in `--danger`, and a box that is on fills in it with `--on-danger` marks, so a choice that is on still says it is wrong. Invalid wins over a warning tone. Pair it with a `field-problem`.
- **Warning:** `data-tone="warning"` on a field outlines it in `--warning` and draws a 2px `--warning` bar inside its leading edge (a value that works but needs a second look: out of date, risky). Invalid wins over it.
- **Changed:** `data-tone="accent"` on a field outlines it in `--accent`: a value changed from its default (an override). The accent is floored at 3:1 on every ground a field sits on, so a changed field is never fainter than a plain one. It stays a 1px outline, apart from the 2px focus edge, which it never imitates, with a 2px accent bar inside its leading edge, so the tone never rests on a hue alone (in several light themes the accent outline is a shade from the plain one). Invalid wins over it.
- **Tones on a check:** `data-tone="danger"` or `data-tone="warning"` on a check or radio outlines it in the tone when off and fills it in the tone, with `--on-danger` or `--on-warning` marks, when on: a choice whose effect is destructive or needs care.
- **Read-only:** a field loses its well, sits on its surface, and its outline drops to `--border-strong`: a value to copy, not a control.
- **On a tinted row:** a row that is hovered, the cursor, or marked sets `--check-edge: var(--control-border-strong)` on itself, and every check inside takes that stronger outline (3:1 on the tint).
- **Inactive window:** under `data-window-inactive` on the root (a window not in front) a check box or switch that is on greys, as the platform's does: the fill in `--control-border-strong` (the neutral edge tone a quiet row's marks take), the mark or knob in `--ground`; a quiet grid row cuts the mark in its `--fill`. A toned or invalid box keeps its tone.
- **Mixed:** only a checkbox can be mixed. A radio of a group with nothing chosen (or with no `name`) stays empty.
- **Disabled:** one fade, never two. The base rule fades a field, a switch, a slider, or a field box (and a label holding one, as a whole) to `--disabled-opacity`. A check box is left out of it: alone, an empty box keeps its full `--control-border` outline on a flat `--control-track` ground, so a column of boxes that cannot be ticked still reads, and a box that is on fades its fill once. Inside a disabled label the label's fade is the one fade, and an empty box there outlines in `--text` so it still reads after it. Do not fade a disabled control's row or text again.
- **No class:** a text input, textarea, or select without `field` still takes a zero-weight floor from the base sheet (a `--control-border` outline on `--ground`); a checkbox or radio with no class at all takes the `check` look. A checkbox or radio with a class of its own, and a slider without `range`, keep the platform's drawing in the accent (and its own disabled grey, which the base rule does not fade again). Give every control its class.
- **In running text:** a `field-choice` centres on the line (`vertical-align: middle`), so it does not move as its box changes state.

## Meter

The base sheet themes `<meter>` (a password's strength, a quota) with no class: a 4px pill trough on `--control-track` inside the `--control-border` hairline, as the slider's, filled in the tone of its value. The element's own `low`, `high`, and `optimum` choose the tone: `--success` in the optimum range, `--warning` one range away from it, `--danger` at the least good. A meter without them reads every value as optimum, so always set all three, with `optimum` in the range that is good. Name it with a label or `aria-label`; the value is not written beside it unless the host writes it.

```tsx
<meter aria-label="Strength" high={0.75} low={0.4} max={1} optimum={1} value={0.6} />
```

## `Check` (`CheckProps`)

A native checkbox in the `check` look whose `checked` may be `'mixed'`. The mixed state is the DOM's `indeterminate` property, which no attribute sets, so `Check` sets it after each render and adds `aria-checked="mixed"`. Every other prop is the input's.

| Prop      | Type                 | Meaning                      |
| --------- | -------------------- | ---------------------------- |
| `checked` | `boolean \| 'mixed'` | On, off, or some but not all |

## Keyboard

The native controls' own: Tab reaches each, Space toggles a check or switch, the arrow keys move between radios of a group and step a number, and a select opens on Space or the arrows.

## Typeface

A field's contents are a value, so they are set in the code face; the words around a field (label, note, problem, a choice's words) are the interface face, in dialogs too.

## Labels read

None. Every word is the form's own.
