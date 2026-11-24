# Icon sizes, the spinner, toned icons, and product marks (`@bigpixelrocket/uiok/icon`)

The four sizes an icon may take, as numbers for lucide's `size` prop. They mirror the `--icon-sm`, `--icon-md`, `--icon-lg`, and `--icon-xl` tokens, which size an icon drawn from CSS ([tokens](../tokens.md)).

| Constant  | Value | Use                                                                                                                      |
| --------- | ----- | ------------------------------------------------------------------------------------------------------------------------ |
| `ICON_SM` | 12    | Beside 11 and 12 px text, and in 20px inline controls                                                                    |
| `ICON_MD` | 14    | Beside 13px text in rows, tabs, and buttons                                                                              |
| `ICON_LG` | 16    | A dialog's title icon, an empty state's action, a row's product mark                                                     |
| `ICON_XL` | 28    | A picture-sized mark in an About window or a splash (with `absoluteStrokeWidth`); never over an empty state or a failure |

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

Every icon has one stroke weight, lucide's default (2 on its 24-unit grid), so no icon looks bolder or thinner than the ones beside it. Pass no `strokeWidth`: a 12px icon at 2.5 or 3 reads as filled in, a tab icon at 1.8 as faint. A glyph drawn larger than `ICON_LG` (`ICON_XL` over an empty state, or a viewer's hero glyph, which an app lists as its own exception) passes `absoluteStrokeWidth`, which keeps the line at 2px on screen instead of scaling it up with the glyph. `test/iconStroke.test.ts` fails on a `strokeWidth` or a numeric `size` (`size={14}` instead of `ICON_MD`) in the library, the docs site, or the docs' code examples.

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

## ToneIcon

`ToneIcon` draws an icon in a theme tone of its own, apart from the words around it: an amber update arrow after a version in a listing `Cell`, or in a `TreeRow`'s trailing column. A `Cell`'s `tone` colours its words; `ToneIcon` colours the glyph alone, the words keeping theirs.

| Prop    | Type         | Use                                                                                                |
| ------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `icon`  | `LucideIcon` | The glyph                                                                                          |
| `tone`  | `IconTone`   | `'accent'` (something offered), `'ready'`, `'warning'` (an update waiting), `'danger'` (a failure) |
| `label` | `string`     | What it says when it stands alone (`role="img"`, and its tooltip); absent, it is decorative        |
| `size`  | `number`     | One of the icon sizes; `ICON_MD` unless given                                                      |

Each tone is its text colour (`--accent-text`, `--success-text`, `--warning-text`, `--danger-text`, drawn as `.tone-icon[data-tone]`), which keeps 4.5:1 on the listing, the cursor and hover fills, and a mark in every theme, so the quiet-word rules over a row's cells leave it alone. On a selection that holds the keys it takes the selection's words (`--on-selected`), as a row's icon and states do, since a tone would vanish on the accent fill. It sits on the line of the words beside it.

```tsx
import { CircleArrowUp } from 'lucide-react';
import { ToneIcon } from '@bigpixelrocket/uiok/icon';

<Cell>
  3.4.1 <ToneIcon icon={CircleArrowUp} label="Update available" tone="warning" />
</Cell>;
<TreeRow
  name="This Mac"
  rowKey="mac"
  trailing={<ToneIcon icon={CircleArrowUp} label="Updates available" tone="warning" />}
/>;
```

## ProductMark

`ProductMark` draws a product's brand mark (a language, a database, a tool) beside its name: in a row's icon column, a crumb's mark slot, a palette's option, or a menu item's `mark`. The library ships no marks and no brand colours: the app owns its table of products and hands one mark in as data, so the library stays free of any product list.

| Prop       | Type                       | Use                                                                                           |
| ---------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| `mark`     | `ProductMarkShape \| null` | The mark; null or absent draws `fallback`                                                     |
| `fallback` | `LucideIcon`               | The glyph drawn with no mark (a database's, a terminal's), in the quiet icon tone or a row's  |
| `label`    | `string`                   | The mark's name when it stands alone (`role="img"`); absent, it is decorative beside its name |

A `ProductMarkShape` is `title` (the product's name, the mark's tooltip), `path` (path data on a 24-unit square), `colour` (the brand's colour as a CSS colour, or `currentColor` for a mark published in plain black, which then takes the quiet icon tone, or in a row's icon column that column's tone, on the cursor and a selection too), and optionally `viewBox` (the part of the artwork to show) and `stroke` (an outline in viewBox units for a mark published in hairlines).

```tsx
import { Database } from 'lucide-react';
import { ProductMark, type ProductMarkShape } from '@bigpixelrocket/uiok/icon';

const PHP: ProductMarkShape = { title: 'PHP', colour: '#777bb4', path: 'M7.01 10.207h-.944l…' };

<Row mark={<ProductMark mark={PHP} />} name="PHP" rowKey="php" />;
<Row mark={<ProductMark fallback={Database} />} name="CouchDB" rowKey="couchdb" />;
```

### How the brand colour is carried

The brand colour is data, not a theme colour: no theme can know a product's colour, and the library may hold no colour literal. So the app passes it in, and the mark sets it as `--product-mark-colour` on itself. The theme still decides how it shows: the fill is `color-mix(in srgb, var(--product-mark-colour) var(--product-mark-mix), var(--text))`, where `--product-mark-mix` is a theme token, `100%` in a light theme and `78%` in a dark one, lifting a dark brand colour toward the text so it does not sink into a dark ground. The mark draws at `--icon-md`, as every row glyph.
