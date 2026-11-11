# Icon sizes and the spinner (`@bigpixelrocket/uiok/icon`)

The three sizes an icon may take, as numbers for lucide's `size` prop. They mirror the `--icon-sm`, `--icon-md`, and `--icon-lg` tokens, which size an icon drawn from CSS ([tokens](../tokens.md)).

| Constant  | Value | Use                                                   |
| --------- | ----- | ----------------------------------------------------- |
| `ICON_SM` | 12    | Beside 11 and 12 px text, and in 20px inline controls |
| `ICON_MD` | 14    | Beside 13px text in rows, tabs, and buttons           |
| `ICON_LG` | 16    | A dialog's title icon, an empty state's action        |

## Example

```tsx
import { RefreshCw } from 'lucide-react';
import { ICON_MD } from '@bigpixelrocket/uiok/icon';

function Refresh() {
  return <RefreshCw size={ICON_MD} aria-hidden="true" />;
}
```

Pick the size by what the icon sits beside, so the same role is the same size everywhere. A size between the steps (15px) or a literal in CSS is not used: CSS sizes an icon with `var(--icon-sm)`, `var(--icon-md)`, or `var(--icon-lg)`.

## Stroke weight

Every icon has one stroke weight, lucide's default (2 on its 24-unit grid), so no icon looks bolder or thinner than the ones beside it. Pass no `strokeWidth`: a 12px icon at 2.5 or 3 reads as filled in, a tab icon at 1.8 as faint. A glyph drawn larger than `ICON_LG` (an empty state's or a viewer's hero glyph) passes `absoluteStrokeWidth`, which keeps the line at 2px on screen instead of scaling it up with the glyph. `test/iconStroke.test.ts` fails on a `strokeWidth` or a numeric `size` (`size={14}` instead of `ICON_MD`) in the library or the docs site.

## Spinner

`Spinner` is the library's one turning ring for work under way. `StateMark` draws it for a busy state and `RunHeader` for a running one, so every spinner turns at the same pace and stops in the same way.

| Prop        | Type     | Use                                                          |
| ----------- | -------- | ------------------------------------------------------------ |
| `size`      | `number` | One of the icon sizes; `ICON_SM` unless given                |
| `className` | `string` | The host's classes for its place and colour, after `spinner` |

It draws in the current text colour, so the host colours it (`color: var(--accent)`). It turns once per `--duration-spin` and stands still under `prefers-reduced-motion: reduce`; say what is busy in words beside it, since the ring is hidden from assistive technology. The `.spinner` rule is in the base stylesheet.

```tsx
import { Spinner } from '@bigpixelrocket/uiok/icon';

<span className="saving">
  <Spinner /> Saving
</span>;
```
