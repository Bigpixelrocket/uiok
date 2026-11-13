# PageTabs (`@bigpixelrocket/uiok/tabs`)

The tab strip a page draws under its path bar: one tab per page of the level shown, each a small cornered tab inside the strip, the current one on the current item's tint and ring, as a desktop tab control draws it. `pills` draws the second strip a tab's own pages take under the first: the same tabs on a shorter row, in smaller type.

The strip has room above and below its tabs, as the toolbars around it have round their controls: the tabs are 24px (`--control-height-sm`) with 6px (`--space-3`) clear above them and above the strip's hairline, a 36px strip; the `pills` strip holds 20px tabs (`--control-height-xs`) with 4px (`--space-2`) clear, a 28px strip. The tabs never touch the strip's edges, in any look (icons, words, both) or with the chevrons showing.

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

A strip too narrow for its tabs scrolls sideways, its scrollbar hidden, and draws whole tabs only. Each edge that hides tabs shows a small chevron in a 24px room of its own: the strip carries `data-overflow` with `start`, `end`, or both, and drops the attribute when every tab fits. A tab that does not lie whole between the chevrons is not drawn (it carries `data-clipped`, is transparent, and takes no click), so the strip ends after the last tab that fits and the chevron beside it says there are more. A tab wider than the span between both chevrons, which may never lie whole in the clear span, is drawn cut while it crosses the span, and a chevron pages past it by its start. A tab not drawn stays in the accessibility tree and within reach of the arrow keys, which bring it in. A click on a chevron pages the strip by whole tabs: toward the end, the first tab not drawn comes to rest at the start chevron's inner edge; toward the start, the strip rests on the earliest tab start that still shows the last tab not drawn there whole.

The current tab is kept whole and in view when the strip first draws its tabs (at once, before it paints) and whenever `current` or the tabs change (at once: the strip moves by a step and never glides). Only the strip scrolls, never the page. A scrolled strip always comes to rest with a tab's start at the start chevron's inner edge, or at either end of its scroll (scroll snapping, `mandatory`, by tab starts only; a tab wider than the strip is a snap area the reader can scroll within). A current tab past the end edge is brought in by the first tab start that clears it, so the snap keeps it where it was revealed. The chevron is outside the tab order and hidden from assistive technology, where the arrow keys already reach every tab.

## Keyboard

A tablist with roving focus: one Tab stop, the current tab (the first when none is current). Left and Right move to the neighbouring tab and open it, stopping at the ends; the strip keeps those keys from any listing cursor around it.

## Styling

`.page-tabs-frame` (`.pills`; holds the strip and its chevrons), `.page-tabs` (`.pills`, `[data-overflow~='start']`, `[data-overflow~='end']`), `.page-tabs-more` (`.start`, `.end`: the chevrons, shown only at a marked edge), `.page-tab` (`[data-clipped]` is not drawn; `[aria-selected='true']` is current: `--current-bg` with a `--current-ring` edge and `--current-text`, in both strips). A tab's name carries `data-label`, which reserves the width of its bold self, so no tab moves when the current one changes. Hover and pressed come from the base stylesheet's track recipe; the focus ring sits inside the tab, so the strip never clips it.

## Labels read

None. Tab names and the strip's name are props.
