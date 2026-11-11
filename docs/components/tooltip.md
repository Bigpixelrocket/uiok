# Tooltip (`@bigpixelrocket/uiok/tooltip`)

A hover tooltip the page draws itself, so it opens on a delay you control, looks like the rest of the UI, and can show a keyboard chord beside its title. One `TooltipLayer` serves every control; a control opts in through attributes.

## Example

```tsx
import { TooltipLayer, cutTooltip, describedTooltip, tooltip } from '@bigpixelrocket/uiok/tooltip';

<IconButton aria-label="New Tab" {...tooltip('New Tab', { key: 't', meta: true })}>
  <Plus />
</IconButton>
<span {...describedTooltip('/Users/me/projects/site', { value: true })}>site</span>
<span className="name" {...cutTooltip(name)}>{name}</span>
<IconButton aria-label="Save Page" {...tooltip('Save Page', null, { side: 'end' })}>
  <Save />
</IconButton>

// Once per window, near the root:
<TooltipLayer />
```

## API

- `TooltipLayer`: no props. Portals a `role="tooltip"` box into the body, or into `document.fullscreenElement` while one is set.
- `tooltip(label, shortcut?, options?)`: returns the attributes to spread. `shortcut` is a `Chord` (`{ key: 't', meta: true }`), which the tooltip draws with the key glyphs every legend uses (`data-tooltip-chord`, plus the text form in `data-tooltip-shortcut`), or a chord already written as text ("⌘T"), printed as given. No label means no tooltip. Never use `title` alongside. `options` is a `TooltipOptions`: `value: true` sets the text in monospace (`data-tooltip-value`), for a path, a name, or a command, which are monospace everywhere else; `side: 'end'` or `'start'` opens it beside the control on that inline side (`data-tooltip-side`), for a tool rail where a tooltip below would cover the next tool.
- `cutTooltip(label)`: an element's own text as its tooltip, opened only while the element cuts that text (`data-tooltip-cut`). The element must be the box that clips (`overflow: hidden` with an ellipsis); the layer opens it only while `cutsItsText(element)` (content wider or taller than the box). It takes its element's face: when the element's computed font is a monospace stack (a name, a status line), the tooltip is set in monospace too.
- `tooltipChord(data)`: reads back a chord written as data, or null.
- `describedTooltip(text, options?)`: the same, plus `aria-description`, for a tooltip that says more than the element's name (a full path, an error's detail). Pass `{ value: true }` for a path or a name.
- `placeTooltip(anchor, tip, viewport, pointerX, beside?)`: the placement rule, exported for testing and reuse. Under the control and centred; on a control wider than the tip, centred on the pointer within the control; above when there is no room below; kept 6px inside the window. With `beside` (`'left'` or `'right'`, which the layer resolves from `side` and the control's direction), 6px off that side and centred on the control's height; on the other side when the window ends too soon, and below as usual when neither side has room.
- `TOOLTIP_DELAY_MS` (500), `TooltipAttributes`, `TooltipOptions`, `TooltipSide`, `TooltipBeside`, `TooltipAnchorBox`, `TooltipExtent`, `TooltipPosition`.

## Behaviour

- Opens after the pointer rests 500ms on a `[data-tooltip]` element or its descendant. Never opens while a mouse button is held.
- Closes when the pointer leaves, on any mousedown, keydown, or wheel, on window resize or blur, and on entering or leaving full screen. After a press or key it stays shut until the pointer leaves the control and returns.
- The pointer alone opens it; keyboard users get the control's accessible name and, with `describedTooltip`, its description.

## Styling

`.tooltip`, `.tooltip-value` (a value: the label in `--font-mono` at regular weight), `.tooltip-label` (wraps with balanced lines, clamps at 12 lines), `.tooltip-shortcut` (a text chord in the key caps' monospace, in `--text-dim`), `.tooltip-chord` (a chord drawn as frameless key glyphs, in `--text-dim`, centred on the title's first line). Layered at `--z-tooltip`, on `--shadow-popover` under a lit top edge (`--glass-edge`), which lifts it in dark themes where a shadow barely shows.

## Labels read

None. Titles are per-instance props.
