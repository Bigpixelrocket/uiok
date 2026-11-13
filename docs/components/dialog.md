# Dialogs (`@bigpixelrocket/uiok/dialog`)

Every modal dialog shares one frame and one footer: a title strip that says what the dialog does in one line, the body, and a key legend that says how to leave and how to commit. The legend reads as part of the keyboard, not as a web form.

- `ModalDialog`: the frame, its focus rules, and the one keydown path for its keys.
- `DialogLegend`: the key legend footer, with `legendKeyAction` deciding which slot a keystroke runs.
- `ConfirmDialog`: the one confirmation, built on both.
- `DialogItems` and `DialogFacts`: the framed list of what a confirmation acts on, and the property list of facts about an action.
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
    >
      <p className="dialog-help">
        In <span className="dialog-value">~/Documents</span>
      </p>
      <input autoFocus aria-label="Name" value={value} onChange={(e) => setValue(e.target.value)} />
    </ModalDialog>
  );
}

<ConfirmDialog
  confirmLabel="Move to Trash"
  icon={Trash2}
  message={
    <>
      Move <strong>notes.txt</strong> from ~/Downloads to the Trash?
    </>
  }
  onCancel={close}
  onConfirm={trash}
  title="Move to Trash"
/>;
```

## `ModalDialog` (`ModalDialogProps`)

| Prop             | Type                                | Default    | Meaning                                                                                                          |
| ---------------- | ----------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `title`          | `ReactNode`                         |            | What the dialog does, in at most five words; one line, cut with an ellipsis, a string's text a tooltip while cut |
| `labelId`        | `string`                            |            | The heading's id, wired to `aria-labelledby`; unique per dialog (`useId`)                                        |
| `describedBy`    | `string`                            |            | The id of the body element that says what the dialog is about (`aria-describedby`)                               |
| `className`      | `string`                            |            | Extra class on the box, for its width and its body's layout                                                      |
| `icon`           | `LucideIcon`                        |            | The verb's icon at the start of the title strip                                                                  |
| `tone`           | `'accent' \| 'danger' \| 'warning'` | `'accent'` | The strip's rule and icon colour; `danger` also lights the primary red                                           |
| `frosted`        | `boolean`                           | `false`    | Frost the window behind; only for a self-contained overlay (a shortcuts list, settings)                          |
| `pinTop`         | `boolean`                           | `false`    | Keep the top edge where it opened, so a growing body extends downward; a window resize centres it again          |
| `legend`         | `DialogLegendModel`                 |            | The key legend footer, drawn last and bound to its keys                                                          |
| `onCancel`       | `() => void`                        |            | Escape and the esc slot                                                                                          |
| `onOutsidePress` | `() => void`                        | `onCancel` | A press on the backdrop                                                                                          |
| `children`       | `ReactNode`                         |            | The body                                                                                                         |
| `container`      | `Element`                           |            | Where the dialog mounts; left out, the enclosing `DialogLayer`, or in place without one                          |

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
- The title strip is at least 34px of `--surface-header` with the lit top edge, ruled at the bottom in the tone: the icon (16px, in the tone too, so each tone is one hue) and the title at 12px, nothing else. The title is always one line, in every dialog, every size step, and every tone: a title too long for the strip is cut with an ellipsis at its end, and a string title shows its whole text in a tooltip only while it is cut.
- `aria-modal="true"` is the overlay contract's modal cue (`MODAL_SELECTOR` in `@bigpixelrocket/uiok/keyboard`), which an app shell reads to mute its own chords while a dialog is open.
- A caller sets a dialog's size and body layout through `className`, never the frame's look.

### The title

A title names the action in at most five words. It is not a sentence: it says what will happen, and the body says what it means.

| Good                       | Not                                               |
| -------------------------- | ------------------------------------------------- |
| `Delete Now?`              | `Delete 7 Items Now?`                             |
| `Move to Trash?`           | `Move 1,000 Items to the Trash?`                  |
| `Quit and Stop Processes?` | `Close the window and stop 15 running processes?` |
| `Rename`                   | `Rename the file in ~/Documents`                  |
| `Trust This Host?`         | `Trust build.example.com?`                        |

A title carries no data: no count, no name, no path, no other value the body shows. The body carries them: the count in the message ("These 7 items cannot be recovered.") or a fact row, the names in the names list, a host or a file as a value in the first line. A title that named its data would say it twice, and would change length with the data, so the same dialog would look different every time.

Nothing stands beside the title either: no path, no count, no item name at the strip's end. Context a dialog needs (where it acts, the item it asks about) goes in the body's first line, a sentence (`dialog-help` or the confirmation's message) with the name as a value (`dialog-value` or `<strong>`).

### Type

The frame sets its own type, so a dialog reads the same under any page root and in any app: monospace for what the user could type or copy, the interface font for sentences and for labels.

| Part                                                                   | Face                          |
| ---------------------------------------------------------------------- | ----------------------------- |
| The title on the strip                                                 | monospace                     |
| The body, paragraphs, the legend's verbs                               | the interface font, 13px      |
| `.dialog-help`: a note in the body (never help under a field)          | the interface font, 12px, dim |
| `.dialog-label`: a heading over a group of values, a fact's label      | the interface font, 12px      |
| `.dialog-value`, `code`, `samp`, `pre`: a name, path, command, or host | monospace                     |
| A confirmation's `<strong>` name, its names list, its facts' values    | monospace                     |

Field contents take their face from the shared form controls. The hooks weigh one class, so a body's own class can still set its face.

### Fields

A dialog's fields sit as a desktop form has them, not as a web form stacks them. A labelled field is a row of the label column (`.field-grid`): the `.field-label` leads and the field fills the value column, as Connect and Edit Command show. A dialog with one field its title already names (Rename) needs no label. `.dialog-label` never sits on its own line over a field; it heads a group of values. Help that explains a field is its label's tooltip (`labelHelp` from `@bigpixelrocket/uiok/field`), and what a legend verb does is its slot's tooltip (`help`), so no sentence of help stands under the form.

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

Every verb has a `label` and may be `disabled`; a verb whose label does not say it all gives its `help` ("Checks the connection without saving it."), the slot's tooltip and accessible description. `LegendSecondary` adds `danger`, for a verb that destroys; the primary takes its colour from the dialog's tone instead. `LegendPrimary` adds `chord` (its key when not Return) and `yieldsReturn`.

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

| Prop           | Type                                 | Default        | Meaning                                                                                                                                                       |
| -------------- | ------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`        | `string`                             |                | What will happen, at most five words, one line                                                                                                                |
| `message`      | `ReactNode?`                         |                | One short sentence of consequence; a name in `<strong>` reads in the text colour. Leave it out (or `''`) when the title says all: no empty paragraph is drawn |
| `confirmLabel` | `string`                             |                | The primary's verb                                                                                                                                            |
| `cancelLabel`  | `string`                             | labels         | The leave verb; `dialog.cancel` unless given                                                                                                                  |
| `icon`         | `LucideIcon`                         |                | The action's icon                                                                                                                                             |
| `tone`         | `'danger' \| 'warning' \| 'primary'` | `'danger'`     | `warning` for a safe yes that still ends work; `primary` for a plain grant                                                                                    |
| `items`        | `readonly DialogItem[]`              |                | The things the action acts on: name, optional detail, optional glyph (`DialogItems`)                                                                          |
| `itemIcon`     | `LucideIcon`                         |                | The kind's glyph on every item row that names no other                                                                                                        |
| `itemCount`    | `number`                             | `items.length` | The total, when `items` holds only the first few                                                                                                              |
| `groups`       | `readonly DialogItemGroup[]`         | `[]`           | Labelled lists for several kinds of things (a quit's processes and terminals)                                                                                 |
| `facts`        | `readonly DialogFact[]`              | `[]`           | Facts about the action, never the things it acts on (`DialogFacts`), under the items                                                                          |
| `paths`        | `readonly string[]`                  |                | Deprecated: drawn as `items`, the last part the name and its folder the detail                                                                                |
| `children`     | `ReactNode`                          |                | A choice drawn under the message; the caller holds its state                                                                                                  |
| `className`    | `string`                             |                | Extra class on the box                                                                                                                                        |
| `forGood`      | `boolean`                            | `false`        | A delete that cannot be undone                                                                                                                                |
| `onConfirm`    | `() => void`                         |                | The primary                                                                                                                                                   |
| `onCancel`     | `() => void`                         |                | Escape, the leave slot, a press outside                                                                                                                       |

The dialog's description reads the lead, then the count (`dialog.itemCount`, for screen readers only), then the names, so a screen reader reads what will happen and to what with the title. Without a lead or items the facts list is the description; with none of them, the dialog has none, never an `aria-describedby` that points at nothing. The frame carries the type and box sizing, so it renders the same portalled to the body.

- The title is one line, like every dialog's (see [The title](#the-title)).
- The order is the platform's: the leave verb at the left edge, the action alone at the right, lit. A `danger` action is lit red; a `warning` question rules the strip amber and lights its action in the accent, since its yes is the safe choice.
- Pick the tone by what the yes destroys. `danger` (the default) is for an action that destroys something saved: a delete, a drop, an overwrite. Throwing away input the user has not saved yet (leave with unsaved changes, discard an edit) destroys nothing saved, so it is `warning`; pass the tone, since the default would paint it red.
- The key legend, the leave-then-action order, the tones, and the focus rules are the frame's; a confirmation adds no controls of its own beyond the caller's choice.

### One anatomy for every case

Every confirmation has the same four parts, in this order, whether it acts on one thing, three, ten, or a thousand, so a user reads every one the same way:

1. **The title** names the action and the kind of thing, in Title Case, at most five words, with no count and no name: "Delete Server?", "Delete Servers?", "Move to Trash?", "Quit?".
2. **The lead** (`message`) is one sentence that says what will happen and to how many things, and, where it matters, one more that says what will not happen or cannot be undone: "This removes 3 servers from the list. Their databases stay where they are."
3. **The items** (`items`, with `itemIcon`) are the things the action acts on, always as one framed list, one row each: the kind's glyph, the name in monospace, and one dim detail at the row's end where the kind has one (a host, a file's folder, a size). One item is a list of one row. Up to five items show in full; more show the first five and a last row "+N more" (`dialog.moreItems`), since the lead carries the total. A name wraps (up to three lines, breaking after `/`, `_`, `.`, `:`, or `@` where it can) before it is cut, and one still cut shows its whole text in a tooltip. A dialog that names several kinds of things passes `groups`: each group's short label and count stand above the same list.
4. **The buttons**: Cancel on Escape at the start, the action at the end, named by its verb, red when it destroys.

A confirmation with items is the medium width (480px) whatever their number, and its height comes from its content: the list never draws more than six rows, so it never scrolls.

#### Item or fact?

- **An item** is a thing the action acts on: a server deleted, a file moved, a process stopped. It goes in `items` (or a group), even when there is only one. "Name: Production" as a fact row is wrong: Production is the item.
- **A fact** is about the action itself: where it acts ("Where", a folder), what it costs, what it keeps. It goes in `facts`, a property list drawn under the items: a label in the leading column, then an optional count in its own column and the value. A value wraps (up to three lines) before it is cut, so a path or a statement that identifies what the action touches stays readable; pass how many names a value leaves out as `more` and the row ends in "+N more".

Deleting servers, one or a thousand:

```tsx
import { Server, Trash2 } from 'lucide-react';

<ConfirmDialog
  confirmLabel="Delete"
  icon={Trash2}
  itemIcon={Server}
  items={servers.map((server) => ({ name: server.name, detail: server.host }))}
  message={`This removes ${count} servers from the list. Their databases stay where they are.`}
  onCancel={cancel}
  onConfirm={remove}
  title={count === 1 ? 'Delete Server?' : 'Delete Servers?'}
/>;
```

A quit that names two kinds of things:

```tsx
import { Cog, Power, SquareTerminal } from 'lucide-react';

<ConfirmDialog
  cancelLabel="Keep Running"
  confirmLabel="Quit"
  groups={[
    { label: 'Running processes', icon: Cog, items: processes },
    { label: 'Open terminals', icon: SquareTerminal, items: terminals }
  ]}
  icon={Power}
  message="Quitting stops 3 running processes and closes 2 open terminals. Their logs are kept."
  onCancel={keepRunning}
  onConfirm={quit}
  title="Quit?"
  tone="warning"
/>;
```

Pass every item; the dialog draws the first five. A host that holds only the first few passes the total as `itemCount` (or a group's `count`).

## `DialogItems` (`DialogItemsProps`) and `DialogFacts` (`DialogFactsProps`)

The lists `ConfirmDialog` draws, for any other dialog body (an alert or a form on `ModalDialog`).

| Component     | Prop    | Type                    | Default        | Meaning                                                                 |
| ------------- | ------- | ----------------------- | -------------- | ----------------------------------------------------------------------- |
| `DialogItems` | `items` | `readonly DialogItem[]` |                | The items, in reading order; the first five are drawn                   |
| `DialogItems` | `icon`  | `LucideIcon`            |                | The kind's glyph on every row that names no other                       |
| `DialogItems` | `count` | `number`                | `items.length` | The total, for "+N more" and the count read with the list               |
| `DialogItems` | `label` | `string`                |                | A group's label, drawn with its count above the frame                   |
| `DialogFacts` | `facts` | `readonly DialogFact[]` |                | The rows, in reading order                                              |
| `DialogFacts` | `label` | `string`                |                | The list's accessible name, when the message does not say what it lists |
| both          | `id`    | `string`                |                | The block's id, for a dialog that names it as its description           |

A `DialogItem` is `{ name: string; detail?: string; icon?: LucideIcon }`; a `DialogItemGroup` is `{ label: string; items: readonly DialogItem[]; icon?: LucideIcon; count?: number }`. `shownItems(available, count)` returns how many rows a list draws and how many "+N more" counts; `DIALOG_ITEMS_SHOWN` is five.

A `DialogFact` is `{ label: string; count?: number | string; value?: ReactNode; more?: number }`; the host formats the count. A string value carries its whole text in a tooltip while it is cut; a node value passes its own `cutTooltip`.

`DialogNames` (`names`, `id`) is deprecated: it draws its names as `DialogItems` without glyphs or details. Pass items instead.

### Deletes that cannot be undone

People confirm a delete out of habit, ⌘⌫ then Return, without reading. With `forGood` the confirm verb still stands at the right edge, lit red, but its key is ⌥⌘⌫ (the Delete Now chord, Finder's chord for a delete that skips the Trash), Return runs nothing, and a held chord never runs it on a repeat.

## Styling

Nothing animates in: a dialog and a frosted wash are there on the frame they open, with no fade, drop, or scale, as a desktop sheet appears. The lead, item names and details, counts, and values in a body can be selected and copied; the title, labels, and legend cannot.

`.dialog-backdrop`, `.frosted`, `.dialog-layer`, `.dialog` (`data-tone`, `data-pinned`), `.dialog-heading`, `.dialog-icon`, `.dialog-body`, `.dialog-help`, `.dialog-label`, `.dialog-value`, `.dialog-legend`, `.legend-slot`, `.legend-slot-key`, `.legend-primary`, `.legend-danger`, `.confirm-dialog`, `.dialog-message`, `.dialog-facts`, `.dialog-fact`, `.dialog-fact-count`, `.dialog-fact-value`, `.dialog-fact-value-more`, `.dialog-fact-names`, `.dialog-fact-more`, `.confirm-items` (a confirmation with items, 480px), `.confirm-items-lists`, `.dialog-items-block`, `.dialog-items-head`, `.dialog-items-count`, `.dialog-items`, `.dialog-item`, `.dialog-item-glyph`, `.dialog-item-name`, `.dialog-item-detail`, `.dialog-items-more`. The frame declares `--dialog-tone` and `--dialog-icon`, reads `--dialog-top` and the host hook `--dialog-inset-top` (16px unless set).

## Labels read

`dialog`: `cancel` (ConfirmDialog's default leave verb, `filterLeaveLabel`), `clear` (`filterLeaveLabel`), `affectedItems(count)` (an item list's accessible name when it has no label), `itemCount(count)` (the count read before the names), `moreItems(count)` (the "+N more" row). `keys` through `KeyChord` for the slots' caps. See [labels](../labels.md).
