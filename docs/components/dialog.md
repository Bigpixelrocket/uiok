# Dialogs (`@bigpixelrocket/uiok/dialog`)

Every modal dialog shares one frame and one footer: a title strip that says what the dialog does and where, the body, and a key legend that says how to leave and how to commit. The legend reads as part of the keyboard, not as a web form.

- `ModalDialog`: the frame, its focus rules, and the one keydown path for its keys.
- `DialogLegend`: the key legend footer, with `legendKeyAction` deciding which slot a keystroke runs.
- `ConfirmDialog`: the one confirmation, built on both.

## Example

```tsx
import { useId, useState } from 'react';
import { FilePen, Trash2 } from 'lucide-react';
import { ConfirmDialog, ModalDialog } from '@bigpixelrocket/uiok/dialog';

function RenameDialog({ name, onRename, onCancel }) {
  const labelId = useId();
  const [value, setValue] = useState(name);

  return (
    <ModalDialog
      icon={FilePen}
      labelId={labelId}
      legend={{
        leave: { label: 'Cancel' },
        primary: { label: 'Rename', disabled: value === '', onRun: () => onRename(value) }
      }}
      onCancel={onCancel}
      title="Rename"
      titleAside="~/Documents"
    >
      <input autoFocus aria-label="Name" value={value} onChange={(e) => setValue(e.target.value)} />
    </ModalDialog>
  );
}

<ConfirmDialog
  confirmLabel="Move to Trash"
  context="~/Downloads"
  icon={Trash2}
  message={
    <>
      Move <strong>notes.txt</strong> to the Trash?
    </>
  }
  onCancel={close}
  onConfirm={trash}
  title="Move to Trash"
/>;
```

## `ModalDialog` (`ModalDialogProps`)

| Prop             | Type                                | Default    | Meaning                                                                                                 |
| ---------------- | ----------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| `title`          | `ReactNode`                         |            | What the dialog does; a string is also its tooltip                                                      |
| `labelId`        | `string`                            |            | The heading's id, wired to `aria-labelledby`; unique per dialog (`useId`)                               |
| `describedBy`    | `string`                            |            | The id of the body element that says what the dialog is about (`aria-describedby`)                      |
| `className`      | `string`                            |            | Extra class on the box, for its width and its body's layout                                             |
| `icon`           | `LucideIcon`                        |            | The verb's icon at the start of the title strip                                                         |
| `tone`           | `'accent' \| 'danger' \| 'warning'` | `'accent'` | The strip's rule and icon colour; `danger` also lights the primary red                                  |
| `titleAside`     | `ReactNode`                         |            | Context at the strip's right edge, cut with an ellipsis (where the dialog acts)                         |
| `frosted`        | `boolean`                           | `false`    | Frost the window behind; only for a self-contained overlay (a shortcuts list, settings)                 |
| `pinTop`         | `boolean`                           | `false`    | Keep the top edge where it opened, so a growing body extends downward; a window resize centres it again |
| `legend`         | `DialogLegendModel`                 |            | The key legend footer, drawn last and bound to its keys                                                 |
| `onCancel`       | `() => void`                        |            | Escape and the esc slot                                                                                 |
| `onOutsidePress` | `() => void`                        | `onCancel` | A press on the backdrop                                                                                 |
| `children`       | `ReactNode`                         |            | The body                                                                                                |

`containTab(event, container)` is the frame's Tab containment, exported for a modal surface without the frame (a palette) to call from its keydown handler.

### The frame

- The box is the surface colour with a strong hairline, radius 8, and a soft lift, centred over a clear backdrop that covers the whole viewport (`--z-dialog`), so the page stays readable behind it. `frosted` washes and blurs the window instead.
- The title strip is 34px of `--surface-header`, ruled at the bottom in the tone: the icon, the title at 12px, and the context pushed to the right edge.
- `aria-modal="true"` is the overlay contract's modal cue (`MODAL_SELECTOR` in `@bigpixelrocket/uiok/keyboard`), which an app shell reads to mute its own chords while a dialog is open.
- A caller sets a dialog's size and body layout through `className`, never the frame's look.

### Focus

- A control that asks for focus as it mounts (`autoFocus` on a name field) keeps it, and so does a dialog portalled from inside it that opens in the same render (a confirmation shown at once); otherwise the dialog itself takes the focus, so Return and Escape work before anything is chosen. The dialog draws no focus ring.
- Tab cycles the body controls and wraps at either end. From the dialog itself, Tab enters at the first control and Shift-Tab at the last. With nothing tabbable, the focus stays where it is. Disabled controls (those inside a disabled `<fieldset>` too), hidden inputs, and the legend's slots are not Tab stops, and Tab moves on past a control that refuses the focus (hidden by a stylesheet, inert); a focusable scroll region (`tabindex="0"`) is a Tab stop.
- A dialog portalled from inside another answers its own keys only; the one under it hears nothing.

## The legend (`DialogLegendModel`)

The footer is 34px under a hairline, with no fill of its own. Each verb is a slot: its key cap, then the verb. A legend holds four slots at most.

| Field       | Type                        | Meaning                                                                           |
| ----------- | --------------------------- | --------------------------------------------------------------------------------- |
| `leave`     | `DialogLegendVerb`          | Escape's verb, first at the left edge; the slot runs the dialog's `onCancel`      |
| `secondary` | up to two `LegendSecondary` | After the leave verb, in order of use, each on its own `chord`, with its `onRun`  |
| `primary`   | `LegendPrimary`             | The forward verb, alone at the right edge, lit; on Return unless it has a `chord` |

Every verb has a `label` and may be `disabled`. `LegendPrimary` adds `chord` (its key when not Return) and `yieldsReturn`.

The rules:

1. **Escape is the way out, labelled Cancel.** Escape leaves every dialog, and the esc slot runs what Escape runs. A situational label may say better what the next press does: Clear while a filter field holds text (`filterLeaveLabel(query, useLabels().dialog)`), or Keep Editing where leaving lets something go on. It is never Close, and Escape is never part of a chord.
2. **Escape and Return never share a slot.** When the primary already does all Escape would (an outcome's OK, a sheet's Done), leave out `leave`: Escape still runs `onCancel`, unshown.
3. **One primary, lit, named for what it does** (Create, Rename, Install), OK only to acknowledge an outcome, Done for a sheet. Return runs it from anywhere in the dialog, a focused text field or body button included, so Return never presses the focused button instead. Return does nothing while the primary is disabled, while an input method composes, or when the key repeats.
4. **Secondary verbs carry a modifier** (`⌘[`), or are a named key Option leaves alone (`⌥⏎`), or a bare key (Space) the dialog answers only while it holds the focus itself; a focused body control keeps its own Space. A text field holding text keeps Backspace and Delete under any modifier; the slot runs once the field is empty. Escape is the only cancel key: no slot is ever `⌘.` (`test/cancelKey.test.ts`).
5. **More verbs move into the body** as a control; the legend only says how to leave and how to commit.
6. **Slots are not Tab stops and draw no focus ring.** A press on one leaves the focus where it was.

A held key runs its slot once. A key the browser-key guard cancelled still reaches the legend; one a body control kept (`isKeyKept`) does not.

`yieldsReturn` leaves Return to a focused text field, pop-up menu, or button and runs the primary only from elsewhere: for a sheet where every control applies at once and a field adds what it holds on Return.

`legendKeyAction(legend, stroke)` is the rule as a pure function, for a surface without the frame that binds the keys itself; it returns `{ kind: 'run', run }`, `{ kind: 'keep' }` (prevent the default, run nothing), or `null`. `legendSignature(legend)` is a string of what a legend draws, to pass a rebuilt model on only when it changes.

`DialogLegend` (`DialogLegendProps`: `legend`, `onLeave`) draws the footer alone.

## `ConfirmDialog` (`ConfirmDialogProps`)

| Prop           | Type                                 | Default    | Meaning                                                                    |
| -------------- | ------------------------------------ | ---------- | -------------------------------------------------------------------------- |
| `title`        | `string`                             |            | The action                                                                 |
| `message`      | `ReactNode`                          |            | The consequence; a name in `<strong>` reads in the text colour             |
| `confirmLabel` | `string`                             |            | The primary's verb                                                         |
| `cancelLabel`  | `string`                             | labels     | The leave verb; `dialog.cancel` unless given                               |
| `icon`         | `LucideIcon`                         |            | The action's icon                                                          |
| `context`      | `ReactNode`                          |            | Where it acts, on the strip's right edge                                   |
| `tone`         | `'danger' \| 'warning' \| 'primary'` | `'danger'` | `warning` for a safe yes that still ends work; `primary` for a plain grant |
| `paths`        | `readonly string[]`                  | `[]`       | Every path it touches, in a focusable scrolling list                       |
| `children`     | `ReactNode`                          |            | A choice drawn under the message; the caller holds its state               |
| `className`    | `string`                             |            | Extra class on the box                                                     |
| `forGood`      | `boolean`                            | `false`    | A delete that cannot be undone                                             |
| `onConfirm`    | `() => void`                         |            | The primary                                                                |
| `onCancel`     | `() => void`                         |            | Escape, the leave slot, a press outside                                    |

The message is the dialog's description, so a screen reader reads it with the title. The dialog carries its own type and box sizing, so it renders the same portalled to the body.

### Deletes that cannot be undone

People confirm a delete out of habit, ⌘⌫ then Return, without reading. With `forGood` the confirm verb still stands at the right edge, lit red, but its key is ⌥⌘⌫ (Finder's Delete Immediately), Return runs nothing, and a held chord never runs it on a repeat.

## Styling

`.dialog-backdrop`, `.frosted`, `.dialog` (`data-tone`, `data-pinned`), `.dialog-heading`, `.dialog-icon`, `.dialog-context`, `.dialog-legend`, `.legend-slot`, `.legend-slot-key`, `.legend-primary`, `.confirm-dialog`, `.dialog-message`, `.dialog-paths`. The frame declares `--dialog-tone` and `--dialog-icon` and reads `--dialog-top`.

## Labels read

`dialog`: `cancel` (ConfirmDialog's default leave verb, `filterLeaveLabel`), `clear` (`filterLeaveLabel`), `affectedItems(count)` (the path list's name). `keys` through `KeyChord` for the slots' caps. See [labels](../labels.md).
