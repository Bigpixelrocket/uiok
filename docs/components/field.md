# Form controls (`@bigpixelrocket/uiok/field`)

One look for everything a user types in or toggles: text fields, textareas, selects, number fields, checkboxes, radios, and switches, with their labels, help, and problems. The look is a set of classes on the native elements, so a form keeps its own markup, keyboard behaviour, and screen reader semantics; the stylesheet ships in `@bigpixelrocket/uiok/styles.css`. `Check` is the one component, for a checkbox whose state can be mixed.

## Example

```tsx
import { Check } from '@bigpixelrocket/uiok/field';

<div className="field-group">
  <label className="field-label" htmlFor="host">
    Host
  </label>
  <input
    aria-describedby="host-problem"
    aria-invalid={problem !== ''}
    className="field"
    id="host"
  />
  {problem === '' ? null : (
    <p className="field-problem" id="host-problem">
      {problem}
    </p>
  )}
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
  <input className="switch" role="switch" type="checkbox" />
  Start at login
</label>;
```

## Classes

| Class           | On                                               | What it draws                                                                                                                                                                                                      |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `field`         | `input`, `select`, `textarea`                    | A well in the window ground, outlined in `--control-border`, 28px (`--control-height`): a dialog or a single prompt; its value in the code face at 12px                                                            |
| `field-sm`      | with `field`                                     | 24px (`--control-height-sm`): a page form, a toolbar, a settings row                                                                                                                                               |
| `field-xs`      | with `field`                                     | 20px (`--control-height-xs`), 4px corners: an editor inside a row or a path bar                                                                                                                                    |
| (none)          | `select.field`                                   | The platform arrow is replaced by an up and down chevron pair in `--text-dim`; a list box (`multiple` or `size`) has none                                                                                          |
| (none)          | `input.field[type=number]`                       | No spin buttons; the arrow keys still step                                                                                                                                                                         |
| `field-box`     | a `label` or `div` around a glyph and an `input` | The field's frame, heights (`field-sm`, `field-xs` on it), hover, and focus edge round a leading glyph (`ICON_SM`, in `--text-dim`) and a bare input: a filter box. Invalid takes `aria-invalid="true"` on the box |
| `check`         | `input[type=checkbox]`, `[type=radio]`           | A 14px box (`--icon-md`; a disc for a radio); on, an accent fill with the tick, dash (a checkbox's indeterminate state), or dot in `--on-accent`                                                                   |
| `switch`        | `input[type=checkbox][role=switch]`              | A 24 by 14 pill: the knob at the start on `--control-border`, at the end on `--accent` when on, the same "on" colour as a checked box                                                                              |
| `range`         | `input[type=range]`                              | A 4px trough on `--control-track` inside a `--control-border` hairline, filled in the accent up to `--range-fill` (`style={{ '--range-fill': '40%' }}`), and a 12px knob                                           |
| `field-label`   | `label`, or any element                          | What the field is for: interface face, 12px on 16px, `--text-dim`                                                                                                                                                  |
| `field-note`    | `p`                                              | Help under the field, as the label                                                                                                                                                                                 |
| `field-problem` | `p`                                              | What is wrong with the value, in `--danger-text`; name it in the field's `aria-describedby`                                                                                                                        |
| `field-group`   | `div`, `fieldset`                                | Label, field, and note stacked 4px apart; on a fieldset, its `legend` reads as a label                                                                                                                             |
| `field-choice`  | `label` around a check, radio, or switch         | The control and its words 6px apart, at least 24px high; the whole label is the target                                                                                                                             |
| `field-grid`    | a container                                      | Rows of `field-label` then value on one label column (`--field-label-width`, 136px by default); each label centred on a 24px control                                                                               |
| `field-value`   | in `field-grid`                                  | A value of several lines (options, then a note), 4px apart                                                                                                                                                         |
| `field-option`  | in `field-value`                                 | One line of a value: choices or a field, wrapping, at least 24px high                                                                                                                                              |

## Heights by place

One rule in every app: `field` (28px) in a dialog or a single prompt, `field-sm` (24px) in a page form or a toolbar, `field-xs` (20px) inside a row or a path bar. A button or segmented choice beside a field takes the same height (`size="small"` beside `field-sm`; `--segmented-height` set to the field's height).

## States

Every control reads tokens only, in every theme. The demo shows each control in each state side by side.

- **Hover:** the outline steps up to `--text`, a visible step in light and dark themes alike; a checked box or a switch takes the lit edge a filled button takes. A read-only field does not lift.
- **Pressed:** an empty box takes the pressed wash; a filled box keeps its fill and sinks as a button does. A switch's track sinks inside the shared hairline and its knob stretches toward the far end while held; a slider's knob sinks on the pressed wash with a `--text` outline.
- **Focus:** a field (or a field box) draws a 2px accent edge on its own border (border plus a 1px ring at the flush offset), so nothing beside it moves; a check, radio, or switch takes the base ring; a slider rings its knob, not its box.
- **Invalid:** `aria-invalid="true"` outlines a field or an empty box in `--danger` (and rings a field in it when focused). Pair it with a `field-problem`.
- **Warning:** `data-tone="warning"` on a field outlines it in `--warning` (a value that works but needs a second look: out of date, risky). Invalid wins over it.
- **Changed:** `data-tone="accent"` on a field outlines it in `--accent-line`: a value changed from its default (an override). Quieter than the focus edge, which it never imitates. Invalid wins over it.
- **Tones on a check:** `data-tone="danger"` or `data-tone="warning"` on a check or radio outlines it in the tone when off and fills it in the tone, with `--on-danger` or `--on-warning` marks, when on: a choice whose effect is destructive or needs care.
- **Read-only:** a field loses its well, sits on its surface, and its outline drops to `--border-strong`: a value to copy, not a control.
- **On a tinted row:** a row that is hovered, the cursor, or marked sets `--check-edge: var(--control-border-strong)` on itself, and every check inside takes that stronger outline (3:1 on the tint).
- **Mixed:** only a checkbox can be mixed. A radio of a group with nothing chosen (or with no `name`) stays empty.
- **Disabled:** one fade, never two. The base rule fades a field, a switch, a slider, or a field box (and a label holding one, as a whole) to `--disabled-opacity`. A check box is left out of it: alone, an empty box keeps its full `--control-border` outline on a flat `--control-track` ground, so a column of boxes that cannot be ticked still reads, and a box that is on fades its fill once. Inside a disabled label the label's fade is the one fade, and an empty box there outlines in `--text` so it still reads after it. Do not fade a disabled control's row or text again.
- **No class:** a text input, textarea, or select without `field` still takes a zero-weight floor from the base sheet (a `--control-border` outline on `--ground`); a checkbox or radio with no class at all takes the `check` look. A checkbox or radio with a class of its own, and a slider without `range`, keep the platform's drawing in the accent (and its own disabled grey, which the base rule does not fade again). Give every control its class.
- **In running text:** a `field-choice` centres on the line (`vertical-align: middle`), so it does not move as its box changes state.

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
