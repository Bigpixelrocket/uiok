# Dialogs (`@bigpixelrocket/uiok/dialog`)

Every modal dialog shares one frame and one footer: a title strip that says what the dialog does and where, the body, and a key legend that says how to leave and how to commit. The legend reads as part of the keyboard, not as a web form.

- `ModalDialog`: the frame, its focus rules, and the one keydown path for its keys.
- `DialogLegend`: the key legend footer, with `legendKeyAction` deciding which slot a keystroke runs.
- `ConfirmDialog`: the one confirmation, built on both.
- `DialogLayer`: where a host's dialogs mount, so they paint above every pane.

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
| `container`      | `Element`                           |            | Where the dialog mounts; left out, the enclosing `DialogLayer`, or in place without one                 |

`containTab(event, container)` is the frame's Tab containment, exported for a modal surface without the frame (a palette) to call from its keydown handler.

### Where a dialog mounts (`DialogLayer`)

A dialog must paint above every pane, the ones drawn after it included. Rendered in place, inside a pane that isolates its layers (every `.pane` under `.listing-root` sets `isolation: isolate`), its backdrop's `--z-dialog` counts only inside that pane, and a later pane (a console docked under the page) paints over the box and its legend.

Wrap a host's content once in `DialogLayer` (`DialogLayerProps`: `children`), inside the element that carries its scoping classes and outside every pane:

```tsx
import { DialogLayer } from '@bigpixelrocket/uiok/dialog';

<section className="space-root my-space listing-root">
  <DialogLayer>
    <MySpace />
  </DialogLayer>
</section>;
```

Every `ModalDialog` and `ConfirmDialog` rendered anywhere inside then mounts into the layer, an element drawn after the content with `display: contents`, so it takes no room. What stays the same:

- Rules written under the root (`.my-space .my-form`) still reach the dialog body, since the layer sits inside the root.
- Context, focus handling, Tab containment, and React event bubbling are unchanged: the dialog keeps its place in the React tree, and its keydown handler already ignores keys from a dialog portalled out of it. Native listeners on the root still hear its keys, since the layer is inside the root.
- Theme tokens follow it, since the theme attributes live on the document's root element.

A dialog's own `container` prop overrides the layer, for one mounted elsewhere (`document.body`, which loses any rule scoped under a root). A dialog rendered before the layer's element exists waits one commit for it rather than open in place and move. Without a layer or a `container`, a dialog renders in place, as before.

### Size

The box hugs its form: pick the narrowest step that holds the body's widest row (labels and fields at their natural width, plus the 12px insets), by adding its class through `className`. Every step shrinks with a narrow window, since the box never passes the backdrop's inset area, so no `min(…, 100vw - …)` is needed.

| Step            | Class             | Width | For                                                                             |
| --------------- | ----------------- | ----- | ------------------------------------------------------------------------------- |
| small (default) | none              | 360px | A question, a name field, a short choice                                        |
| medium          | `.dialog-size-md` | 480px | A form with a label column and one-line fields (a connection, a server, a user) |
| large           | `.dialog-size-lg` | 640px | Two columns of fields, a short table or list, a code field                      |
| extra large     | `.dialog-size-xl` | 880px | A wide table, a log, a chart or a map                                           |

A dialog whose form is narrower than its step by a column's width or more is on the wrong step. Set a width of your own only for a body with a fixed natural size (a picture at its pixel size).

### The frame

- The box is the surface colour with a strong hairline, radius 8, the lit top edge (`--glass-edge`), and the modal layer's lift (`--shadow-modal`, stronger in dark themes), centred over a clear backdrop that covers the whole viewport (`--z-dialog`), so the page stays readable behind it. `frosted` lays the modal scrim (`--scrim`) and the shared frost (`--frost`) over the window instead.
- The backdrop keeps 16px round the box. Its top inset is the hook `--dialog-inset-top`: a host whose window draws its own title bar sets it to that bar's height plus a margin (for example `calc(48px + 8px)` on its shell root), so no dialog ever covers the bar.
- The box is never taller than the backdrop's inset area. Past that it scrolls, with the title strip pinned at the top and the legend at the bottom. A fade hangs above the legend while more of the body lies below and under the strip once the body has scrolled past its start, following the box's own scroll, so a box that does not scroll shows neither. A body that should scroll on its own (a long form between fixed parts) takes `.dialog-body` with the shared `.scroll-fade`, and shrinks first.
- The title strip is at least 34px of `--surface-header` with the lit top edge, ruled at the bottom in the tone: the icon (16px, in the tone too, so each tone is one hue), the title at 12px, and the context pushed to the right edge. The title takes the room; the context keeps at least 12 characters (or 40% of the strip), so where the dialog acts never vanishes. Both are cut with an ellipsis and a string of either is its own tooltip.
- `aria-modal="true"` is the overlay contract's modal cue (`MODAL_SELECTOR` in `@bigpixelrocket/uiok/keyboard`), which an app shell reads to mute its own chords while a dialog is open.
- A caller sets a dialog's size and body layout through `className`, never the frame's look.

### Type

The frame sets its own type, so a dialog reads the same under any page root and in any app: monospace for what the user could type or copy, the interface font for sentences and for labels.

| Part                                                                   | Face                          |
| ---------------------------------------------------------------------- | ----------------------------- |
| The title and the context on the strip                                 | monospace                     |
| The body, paragraphs, the legend's verbs                               | the interface font, 13px      |
| `.dialog-help`: help, a note, a description under a field              | the interface font, 12px, dim |
| `.dialog-label`: a label that heads a field or a value                 | the interface font, 12px      |
| `.dialog-value`, `code`, `samp`, `pre`: a name, path, command, or host | monospace                     |
| A confirmation's `<strong>` name and its path list                     | monospace                     |

Field contents take their face from the shared form controls. The hooks weigh one class, so a body's own class can still set its face.

### Focus

- A control that asks for focus as it mounts (`autoFocus` on a name field) keeps it, and so does a dialog portalled from inside it that opens in the same render (a confirmation shown at once); otherwise the dialog itself takes the focus, so Return and Escape work before anything is chosen. The dialog draws no focus ring.
- Tab cycles the body controls and wraps at either end. From the dialog itself, Tab enters at the first control and Shift-Tab at the last. With nothing tabbable, the focus stays where it is. Disabled controls (those inside a disabled `<fieldset>` too), hidden inputs, and the legend's slots are not Tab stops, and Tab moves on past a control that refuses the focus (hidden by a stylesheet, inert); a focusable scroll region (`tabindex="0"`) is a Tab stop.
- A dialog portalled from inside another answers its own keys only; the one under it hears nothing.

## The legend (`DialogLegendModel`)

The footer is at least 34px under a hairline, with 4px above and below its slots, so a legend whose verbs wrap to a second row keeps them off the hairline and the box's edge, 2px apart, with no fill of its own (in the frame it takes the box's fill, since a tall body scrolls under it). Each verb is a slot: its key cap, then the verb. A legend holds four slots at most. Each cap is 18px with the key cap's 2px foot. A slot eases into the shared quiet hover and sinks into the shared pressed look (`src/styles.css`), so a press reads apart from a hover. The primary's cap is lit in the accent; in a destructive dialog the cap is `--danger` with its glyph in `--on-danger`, and the verb is `--danger-text`. A lit cap's foot is its fill under the fixed `--key-foot-shade`, so it is darker than the face in every theme. A secondary verb with `danger: true` (a Delete… beside the primary) reads in `--danger-text`, with `--danger-wash` under the pointer and `--danger-wash-strong` pressed; its cap stays a plain key.

| Field       | Type                        | Meaning                                                                           |
| ----------- | --------------------------- | --------------------------------------------------------------------------------- |
| `leave`     | `DialogLegendVerb`          | Escape's verb, first at the left edge; the slot runs the dialog's `onCancel`      |
| `secondary` | up to two `LegendSecondary` | After the leave verb, in order of use, each on its own `chord`, with its `onRun`  |
| `primary`   | `LegendPrimary`             | The forward verb, alone at the right edge, lit; on Return unless it has a `chord` |

Every verb has a `label` and may be `disabled`. `LegendSecondary` adds `danger`, for a verb that destroys; the primary takes its colour from the dialog's tone instead. `LegendPrimary` adds `chord` (its key when not Return) and `yieldsReturn`.

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

The message is the dialog's description, so a screen reader reads it with the title. The frame carries the type and box sizing, so it renders the same portalled to the body.

- The title is the question being asked, so it wraps to a second line rather than lose its end, and the strip grows with it; past two lines it ends in an ellipsis and its tooltip holds the whole question.
- The order is the platform's: the leave verb at the left edge, the action alone at the right, lit. A `danger` action is lit red; a `warning` question rules the strip amber and lights its action in the accent, since its yes is the safe choice.
- Pick the tone by what the yes destroys. `danger` (the default) is for an action that destroys something saved: a delete, a drop, an overwrite. Throwing away input the user has not saved yet (leave with unsaved changes, discard an edit) destroys nothing saved, so it is `warning`; pass the tone, since the default would paint it red.
- The path list shows every path whole, in monospace, its text 12px in from the frame as in every framed well. A long path breaks only after a slash, its later lines hang under the first, and the list shows eight lines before it scrolls, framed in `--border-strong` like every framed well, with the shared scroll fade at a cut edge (the fade covers the list's content, never its frame).

### Deletes that cannot be undone

People confirm a delete out of habit, ⌘⌫ then Return, without reading. With `forGood` the confirm verb still stands at the right edge, lit red, but its key is ⌥⌘⌫ (Finder's Delete Immediately), Return runs nothing, and a held chord never runs it on a repeat.

## Styling

`.dialog-backdrop`, `.frosted`, `.dialog-layer`, `.dialog` (`data-tone`, `data-pinned`), `.dialog-heading`, `.dialog-icon`, `.dialog-context`, `.dialog-body`, `.dialog-help`, `.dialog-label`, `.dialog-value`, `.dialog-legend`, `.legend-slot`, `.legend-slot-key`, `.legend-primary`, `.legend-danger`, `.confirm-dialog`, `.dialog-message`, `.dialog-paths`. The frame declares `--dialog-tone` and `--dialog-icon`, reads `--dialog-top` and the host hook `--dialog-inset-top` (16px unless set).

## Labels read

`dialog`: `cancel` (ConfirmDialog's default leave verb, `filterLeaveLabel`), `clear` (`filterLeaveLabel`), `affectedItems(count)` (the path list's name). `keys` through `KeyChord` for the slots' caps. See [labels](../labels.md).
