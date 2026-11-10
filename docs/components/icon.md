# Icon sizes (`@bigpixelrocket/uiok/icon`)

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

Pick the size by what the icon sits beside, so the same role is the same size everywhere. Leave `strokeWidth` at lucide's default.
