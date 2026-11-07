# Pager (`uiok/pager`)

The pager of a long list: Begin and Previous, a menu of page numbers, then Next and End. It draws nothing for a list of one page. Below 200 pages the menu lists every page; above, it lists both ends, even steps across the list, every page within ten of the current one, and pages at doubling distances from it (`selectorPages`).

## Example

```tsx
import { Pager, pageCount, pageSlice } from 'uiok/pager';

const pages = pageCount(rows.length, 50);
const shown = pageSlice(rows, page, 50);

<Pager kind="rows" onPage={setPage} page={page} pages={pages} />;
```

## Props (`PagerProps`)

| Prop       | Type                          | Meaning                                                                 |
| ---------- | ----------------------------- | ----------------------------------------------------------------------- |
| `kind`     | `string`                      | What the pages are of, passed to the `pager` labels; "items" by default |
| `page`     | `number`                      | The page shown, from 0                                                  |
| `pages`    | `number`                      | Pages in all, or so far                                                 |
| `onPage`   | `(page: number) => void`      | The page (from 0) a step or the menu asks for                           |
| `endKnown` | `boolean`                     | Whether `pages` is final; false hides End (a list counted only so far)  |
| `forward`  | `boolean`                     | Whether a later page can be reached; false hides Next and End           |
| `look`     | `'icons' \| 'text' \| 'both'` | How steps draw (`LinkLook`); icons, named on hover, by default          |

A hidden icon step keeps its place so the menu never moves; a hidden worded step takes no room.

### Logic

`pageCount(count, size)` (never below 1), `clampPage(page, pages)`, `pageSlice(items, page, size)`, `pageOf(index, size)`, and `selectorPages(pages, current)` (both from 1).

## Keyboard

Its steps and menu are ordinary Tab stops. The keys that page a list (Page Up, Page Down) stay the caller's.

## Styling

`.pager`, `.pager-step` (`.worded`; a hidden icon step is an empty `span.pager-step`), `.pager-page`.

## Labels read

`pager` (`PagerLabels`): `begin`, `previous`, `next`, `end` (the steps' words and tooltips), `pages(kind)` (the pager's name), `page(kind)` (the menu's name), `step(step, kind)` (a step's name), `pageOption(page, pages)` (a menu entry, raw numbers from 1). An app that inflects its noun passes a code as `kind` and maps it in these functions. See `docs/labels.md`.
