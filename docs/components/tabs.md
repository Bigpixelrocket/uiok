# PageTabs (`@bigpixelrocket/uiok/tabs`)

The tab strip a page draws under its path bar: one tab per page of the level shown, the current one underlined. `pills` draws the smaller second strip a tab's own pages take under the first.

## Example

```tsx
import { FileText, Settings, Users } from 'lucide-react';
import { PageTabs } from '@bigpixelrocket/uiok/tabs';

<PageTabs
  current={page}
  label="Project pages"
  onSelect={setPage}
  tabs={[
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]}
/>;
```

## Props (`PageTabsProps<Id>`)

`Id` is a string union of the tab ids.

| Prop       | Type                          | Meaning                                                               |
| ---------- | ----------------------------- | --------------------------------------------------------------------- |
| `label`    | `string`                      | The strip's accessible name                                           |
| `tabs`     | `readonly PageTab<Id>[]`      | `{ id, label, icon }` (a lucide icon), in drawing order               |
| `current`  | `Id \| null`                  | The shown page's tab; null marks none (a home page that is no tab)    |
| `onSelect` | `(id: Id) => void`            | The tab a click or an arrow opens                                     |
| `pills`    | `boolean`                     | The smaller, rounded second strip                                     |
| `look`     | `'icons' \| 'text' \| 'both'` | Icon and name (the default), name alone, or icon alone named on hover |

Each tab carries `data-page-tab="<id>"`.

## Overflow

A strip too narrow for its tabs scrolls sideways, its scrollbar hidden. Each edge that hides tabs fades out over 24px, so a reader can tell more tabs lie past it: the strip carries `data-overflow` with `start`, `end`, or both, and drops the attribute when every tab fits. The current tab is kept in view and clear of the fade when the strip first draws its tabs (at once, before it paints) and whenever `current` or the tabs change (smoothly, or at once under `prefers-reduced-motion: reduce`). Only the strip scrolls, never the page.

## Keyboard

A tablist with roving focus: one Tab stop, the current tab (the first when none is current). Left and Right move to the neighbouring tab and open it, stopping at the ends; the strip keeps those keys from any listing cursor around it.

## Styling

`.page-tabs` (`.pills`, `[data-overflow~='start']`, `[data-overflow~='end']`), `.page-tab` (`[aria-selected='true']` is current: the `--current-mark` underline and `--current-text`, or in pills `--current-bg` with a `--current-ring` edge). A tab's name carries `data-label`, which reserves the width of its bold self, so no tab moves when the current one changes. Hover and pressed come from the base stylesheet's track recipe; the focus ring sits inside the tab, so the strip never clips it.

## Labels read

None. Tab names and the strip's name are props.
