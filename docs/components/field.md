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

| Class           | On                                       | What it draws                                                                                                                                               |
| --------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `field`         | `input`, `select`, `textarea`            | A well in the window ground, outlined in `--control-border`, 28px (`--control-height`); its value in the code face at 12px                                  |
| `field-sm`      | with `field`                             | 24px (`--control-height-sm`): dense forms, toolbars, settings rows                                                                                          |
| `field-xs`      | with `field`                             | 20px (`--control-height-xs`), 4px corners: an editor inside a 24 to 26 px row or bar                                                                        |
| (none)          | `select.field`                           | The platform arrow is replaced by an up and down chevron pair in `--text-dim`; a list box (`multiple` or `size`) has none                                   |
| (none)          | `input.field[type=number]`               | No spin buttons; the arrow keys still step                                                                                                                  |
| `check`         | `input[type=checkbox]`, `[type=radio]`   | A 14px box (a disc for a radio); on, an accent fill with the tick, dash (indeterminate), or dot in `--on-accent`                                            |
| `switch`        | `input[type=checkbox][role=switch]`      | A 24 by 14 pill: the knob at the start on `--control-border`, at the end on `--primary` when on                                                             |
| `range`         | `input[type=range]`                      | A 4px trough in `--control-border`, filled in the accent up to `--range-fill` (set it from the value: `style={{ '--range-fill': '40%' }}`), and a 12px knob |
| `field-label`   | `label`, or any element                  | What the field is for: interface face, 12px on 16px, `--text-dim`                                                                                           |
| `field-note`    | `p`                                      | Help under the field, as the label                                                                                                                          |
| `field-problem` | `p`                                      | What is wrong with the value, in `--danger-text`; name it in the field's `aria-describedby`                                                                 |
| `field-group`   | `div`, `fieldset`                        | Label, field, and note stacked 4px apart; on a fieldset, its `legend` reads as a label                                                                      |
| `field-choice`  | `label` around a check, radio, or switch | The control and its words 6px apart, at least 24px high; the whole label is the target                                                                      |
| `field-grid`    | a container                              | Rows of `field-label` then value on one label column (`--field-label-width`, 136px by default); each label centred on a 24px control                        |
| `field-value`   | in `field-grid`                          | A value of several lines (options, then a note), 4px apart                                                                                                  |
| `field-option`  | in `field-value`                         | One line of a value: choices or a field, wrapping, at least 24px high                                                                                       |

## States

Every control reads tokens only, in every theme.

- **Hover:** the outline steps up to `--text-dim`; a checked box or a switch takes the lit edge a filled button takes.
- **Pressed:** an empty box takes the pressed wash; a filled box sinks as a button does.
- **Focus:** a field draws a 2px accent edge on its own border (border plus a 1px ring at the flush offset), so nothing beside it moves; a check, radio, or switch takes the base ring.
- **Invalid:** `aria-invalid="true"` outlines in `--danger` (and rings in it when focused). Pair it with a `field-problem`.
- **Read-only:** a field loses its well and sits on its surface.
- **Disabled:** the base rule fades the control (and a label holding it) to `--disabled-opacity`.

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
