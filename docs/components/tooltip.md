# Tooltip (`@bigpixelrocket/uiok/tooltip`)

A hover tooltip the page draws itself, so it opens on a delay you control, looks like the rest of the UI, and can show a keyboard chord beside its title. One `TooltipLayer` serves every control; a control opts in through attributes.

## Example

```tsx
import { chordGlyphs } from '@bigpixelrocket/uiok/keyboard';
import { TooltipLayer, describedTooltip, tooltip } from '@bigpixelrocket/uiok/tooltip';

<IconButton aria-label="New Tab" {...tooltip('New Tab', chordGlyphs({ key: 't', meta: true }))}>
  <Plus />
</IconButton>
<span {...describedTooltip('/Users/me/projects/site')}>site</span>

// Once per window, near the root:
<TooltipLayer />
```

## API

- `TooltipLayer`: no props. Portals a `role="tooltip"` box into the body, or into `document.fullscreenElement` while one is set.
- `tooltip(label, shortcut?)`: returns `data-tooltip` and `data-tooltip-shortcut` attributes to spread. No label means no tooltip. Never use `title` alongside.
- `describedTooltip(text)`: the same, plus `aria-description`, for a tooltip that says more than the element's name (a full path, an error's detail).
- `placeTooltip(anchor, tip, viewport, pointerX)`: the placement rule, exported for testing and reuse. Under the control and centred; on a control wider than the tip, centred on the pointer within the control; above when there is no room below; kept 6px inside the window.
- `TOOLTIP_DELAY_MS` (500), `TooltipAttributes`, `TooltipAnchorBox`, `TooltipExtent`, `TooltipPosition`.

## Behaviour

- Opens after the pointer rests 500ms on a `[data-tooltip]` element or its descendant. Never opens while a mouse button is held.
- Closes when the pointer leaves, on any mousedown, keydown, or wheel, on window resize or blur, and on entering or leaving full screen. After a press or key it stays shut until the pointer leaves the control and returns.
- The pointer alone opens it; keyboard users get the control's accessible name and, with `describedTooltip`, its description.

## Styling

`.tooltip`, `.tooltip-label` (wraps with balanced lines, clamps at 12 lines), `.tooltip-shortcut` (the chord in the key caps' monospace). Layered at `--z-tooltip`, on `--shadow-popover` under a lit top edge (`--glass-edge`), which lifts it in dark themes where a shadow barely shows.

## Labels read

None. Titles are per-instance props.
