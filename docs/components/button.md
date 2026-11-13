# Buttons (`@bigpixelrocket/uiok/button`)

`Button` is the one text action button; `IconButton` is its square, icon-only sibling. Both look the same wherever they render because their stylesheet sets font, size, and box model.

## Example

```tsx
import { Button, IconButton } from '@bigpixelrocket/uiok/button';
import { ICON_MD } from '@bigpixelrocket/uiok/icon';
import { tooltip } from '@bigpixelrocket/uiok/tooltip';

<Button variant="primary" onClick={save}>Save</Button>
<Button size="small" variant="tonal">Install</Button>
<Button variant="danger" onClick={remove}>Delete</Button>
<IconButton aria-label="Refresh" {...tooltip('Refresh', { key: 'r', meta: true })}>
  <RefreshCw size={ICON_MD} />
</IconButton>
```

## Props

`Button` (`ButtonProps`) takes every `<button>` attribute plus:

| Prop      | Type                                            | Default     | Meaning                                                                                                                                                    |
| --------- | ----------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant` | `'primary' \| 'tonal' \| 'danger' \| 'neutral'` | `'neutral'` | `primary` for a view's one main action, `tonal` for a row's routine positive action, `danger` for a button that destroys something, `neutral` for the rest |
| `size`    | `'regular' \| 'small'`                          | `'regular'` | 28px or 24px tall                                                                                                                                          |
| `type`    | button type                                     | `'button'`  | Pass `'submit'` explicitly to submit a form                                                                                                                |
| `ref`     | `Ref<HTMLButtonElement>`                        |             |                                                                                                                                                            |

`IconButton` (`IconButtonProps`) takes every `<button>` attribute, a required `aria-label`, `size` (`regular` 28px square, `small` 24px), and `ref`. It is always `type="button"`.

`className` on either is for layout (width, alignment), never for look.

## Behaviour

- A neutral button and an icon button are outlined in `--control-border`, the 3:1 line every control outline shares. Primary and tonal fills carry a lit top edge (`--glass-edge`) at rest.
- A danger button is outlined, never filled: a `--danger` outline and `--danger-text` label and glyph on the panel. Hover lays `--danger-wash` with `--hover-frost`; a press takes `--danger-wash-strong`. Use it for every destructive button (Delete, Remove) and for nothing else; a confirmation's destructive verb stays the red lit slot of its dialog's key legend.
- Hover moves a fill to its hover token (`--primary-hover`, `--tonal-hover`) under `--hover-lit`, and lays `--hover-wash` with `--hover-frost` on an outline. A press sinks the face under `--shadow-pressed`: a fill steps one tone past hover (`--primary-pressed`, `--tonal-pressed`), an outline takes `--pressed-wash`, so pressed never looks like hovered or like rest. Every change eases with `--transition-control`.
- Disabled or `aria-disabled="true"` buttons get no hover or press. A disabled primary, tonal, or danger button drops its fill or red outline and is drawn as a disabled neutral one, faded to `--disabled-opacity` like every disabled control, so its label stays readable in every theme.
- A glyph inside takes the button's icon size whatever its `size` prop says: 14px (`--icon-md`) in a regular button, 12px (`--icon-sm`) in a small one.
- Keyboard focus draws a 2px `--accent` ring outside the button.

## Styling

`.button`, `.button-primary`, `.button-tonal`, `.button-danger`, `.button-neutral`, `.button-small`, `.icon-button`, `.icon-button-small`.

A toggle (a mode, a filter, a reading of a field) is not a Button: put the base sheet's `toggle-chip` class on a plain `button` with `aria-pressed`, `toggle-chip-sm` (24px) or `toggle-chip-xs` (20px, inside a row) for a smaller place. Off is borderless words in `--text-dim`, as a scope bar's item; hover and press are the quiet control's; on is the one look every `aria-pressed="true"` button wears. The host sets only the chip's place, never its faces, so every toggle chip in an app reads the same and follows the library ([surface](surface.md)).

A section a user shows or hides (Extra options, Advanced options) is not a Button either: put `disclosure` on a plain `button` with `aria-expanded` and `aria-controls`. It draws a disclosure chevron (the icon family's `ChevronRight`, the glyph trees and folds use) and the label with no bezel: the chevron points to the label's end while closed and down while open, turning at once, and the words are dim at rest and in `--text` under the pointer, with the keyboard focus, and while open. While held it takes the shared press (`--pressed-wash` and `--press-frost`) on a face that reaches back over its padding, so the words keep their edge, and its focus ring follows `--radius-sm`. Several disclosures stack as plain lines, never as an accordion of push buttons.

## Labels read

None.
