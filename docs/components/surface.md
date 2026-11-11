# Notices, cards, and shared recipes

Looks a page puts on its own markup, shipped in `@bigpixelrocket/uiok/styles.css`. None is a component: the words are the page's.

## Notice

A message about the page or a value on it: a 2px bar in the tone on its leading edge, an optional glyph in the tone, the message in `--text`, and an optional action at the end.

```tsx
<div className="notice notice-danger" role="alert">
  <CircleAlert size={ICON_MD} />
  <p className="notice-text">The settings file could not be saved.</p>
  <div className="notice-actions">
    <Button size="small">Try Again</Button>
  </div>
</div>
```

| Class                                               | Meaning                                                                                 |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `notice`                                            | The notice in the page's flow; neutral tone (`--text-faint`) unless a tone class is set |
| `notice-danger`, `notice-warning`, `notice-success` | The tone of the bar and the glyph (`--danger`, `--warning`, `--success`)                |
| `notice-card`                                       | Floated on a raised panel (border, `--shadow-popover`), for a notice over the page      |
| `notice-text`                                       | The message; wraps                                                                      |
| `notice-glyph`                                      | A glyph that is not the first `svg`                                                     |
| `notice-actions`                                    | Actions at the end, centred on the first line                                           |

A notice that reports a failure the user should act on takes `role="alert"`; one that reports a state takes `role="status"`.

## Card

`card`: a lifted panel (`--card-bg`, a `--border` outline, `--radius-md`, 12px inset) grouping one subject's lines.

## Shared recipes in the base sheet

| Class or rule   | What it does                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `overline`      | The small uppercase heading over a group: caption size, strong weight, `--tracking-caps`, `--text-dim`, interface face, no margin                                                                                                                                                                                                                                             |
| `scroll-fade`   | On a scrolling element: its top and bottom edge fade over `--scroll-fade-size` (12px) while more content lies past that edge. `scroll-fade-x` fades the inline edges; both classes fade all four. The mask covers the element's border and any sticky strip, so put it on a borderless scroller                                                                               |
| `frost`         | The one frost recipe (`backdrop-filter: var(--frost)`) for a translucent layer over scrolling content; its wash is the layer's own (`--scrim` for a backdrop)                                                                                                                                                                                                                 |
| Hover and press | Quiet controls (pager steps, legend slots and verbs, quiet and icon actions, the path star) hover with the frosted wash and ring; tabs, segments, and day cells with the wash alone; all of them and the crumb, sort, strip-link, and palette-level controls press with `--pressed-wash` and `--shadow-pressed`. Each rule weighs one class, so a component's state rule wins |
| Native colours  | `::selection` (`--text-selection-bg`), `::placeholder` (`--text-placeholder`), the caret and native checks (`--accent`), and scrollbars (`--scrollbar-thumb`) follow the theme, on the root and in a theme preview                                                                                                                                                            |
