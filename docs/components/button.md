# Buttons (`@bigpixelrocket/uiok/button`)

`Button` is the one text action button; `IconButton` is its square, icon-only sibling. Both look the same wherever they render because their stylesheet sets font, size, and box model.

## Example

```tsx
import { Button, IconButton } from '@bigpixelrocket/uiok/button';
import { tooltip } from '@bigpixelrocket/uiok/tooltip';

<Button variant="primary" onClick={save}>Save</Button>
<Button size="small" variant="tonal">Install</Button>
<IconButton aria-label="Refresh" {...tooltip('Refresh')}>
  <RefreshCw size={14} />
</IconButton>
```

## Props

`Button` (`ButtonProps`) takes every `<button>` attribute plus:

| Prop      | Type                                | Default     | Meaning                                                                                                                                    |
| --------- | ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `variant` | `'primary' \| 'tonal' \| 'neutral'` | `'neutral'` | `primary` for a view's one main action, `tonal` for a row's routine positive action, `neutral` for the rest, destructive triggers included |
| `size`    | `'regular' \| 'small'`              | `'regular'` | 28px or 24px tall                                                                                                                          |
| `type`    | button type                         | `'button'`  | Pass `'submit'` explicitly to submit a form                                                                                                |
| `ref`     | `Ref<HTMLButtonElement>`            |             |                                                                                                                                            |

`IconButton` (`IconButtonProps`) takes every `<button>` attribute, a required `aria-label`, `size` (`regular` 28px square, `small` 24px), and `ref`. It is always `type="button"`.

`className` on either is for layout (width, alignment), never for look.

## Behaviour

- Hover lifts fills (`--hover-lit`, brightness) and washes outlines (`--hover-wash`, `--hover-frost`); a press sinks the face (`--shadow-pressed`). Disabled or `aria-disabled="true"` buttons get neither.
- Keyboard focus draws a 2px `--accent` ring outside the button.

## Styling

`.button`, `.button-primary`, `.button-tonal`, `.button-neutral`, `.button-small`, `.icon-button`, `.icon-button-small`.

## Labels read

None.
