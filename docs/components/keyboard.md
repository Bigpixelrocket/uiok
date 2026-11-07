# Keyboard (`uiok/keyboard`)

Keyboard policy for an app that owns its keys, and how chords are printed and spoken. No components; everything here is plain functions over DOM events and elements.

## Chords

```ts
import { chordGlyphs, chordSpoken, type Chord } from 'uiok/keyboard';

const newTab: Chord = { key: 't', meta: true };
chordGlyphs(newTab); // "⌘T", for a tooltip or a menu
chordSpoken(newTab); // "Command T", for an accessible name
```

- `Chord`: `{ key, ctrl?, meta?, alt?, shift? }`. `key` is `KeyboardEvent.key` for named keys (`ArrowUp`, `Enter`, `' '`) or a lowercase letter or symbol.
- `chordParts(chord)`: the keys in macOS order (Control, Option, Shift, Command, key).
- `chordSpoken(chord, labels?)`, `chordGlyphs(chord, labels?)`, `modifierName(modifier, labels?)`: take a `KeyLabels` group, English macOS by default. Inside React, pass `useLabels().keys` (see [labels](../labels.md)).
- `LAYER_MODIFIERS`, `LayerModifier`, `ChordPart`.

## The browser-key guard

A desktop or full-screen web app usually keeps Chromium's document keys away from the page: ⌘R reload, ⌘F find, ⌘P print, ⌘S save, ⌘U source, ⌘[ history, ⌘A select-all of the page, Backspace, and Space or Page Down scrolling the document. Install one capture listener on the window:

```ts
import { cancelBrowserDocumentKey, shouldSuppressBrowserDocumentKey } from 'uiok/keyboard';

window.addEventListener(
  'keydown',
  (event) => {
    if (shouldSuppressBrowserDocumentKey(event, event.target)) cancelBrowserDocumentKey(event);
  },
  true
);
```

- Text fields keep their editing keys (⌘A, ⌘←, Backspace). Buttons, selects, and focusable surfaces (`tabindex="0"`, or anything inside `[data-native-keyboard]`) keep Space and the page keys. A modal dialog keeps the page keys aimed into it.
- `isTextEditingTarget(target)` and `isNativeKeyboardTarget(target)` expose the two tests.
- `cancelBrowserDocumentKey(event)` calls `preventDefault` without stopping propagation, and remembers the cancel was only the guard's. `isKeyKept(event)` is true only when a control cancelled the key. A component that binds a chord the guard also cancels (a dialog legend's ⌘R) checks `isKeyKept`, not `defaultPrevented`.

## Overlays

The public overlay contract, shared by every UIOK overlay and the app around it. Changing it is a breaking change.

- `MODAL_SELECTOR` is `[aria-modal="true"]`. Any element with it holds the window's keys until it closes, as a native sheet does.
- `OVERLAY_SELECTOR` adds `[data-overlay]`: overlays Escape closes that leave the window's other keys alone (menus, find bars, popovers).
- `isModalOpen(root)` and `isOverlayOpen(root)` answer for any root. `isOverlayOpen` skips an overlay inside a `hidden` ancestor.
- `watchOverlays(document)` gives the same two answers (`modalOpen()`, `overlayOpen()`) without walking the document, plus `subscribe(listener)` for changes. One watch per document. Use it on every keystroke instead of the walking functions.

A typical use: while `overlayOpen()` is true, the app does not let ⌘W close a tab or the window behind the overlay.

## Page select-all

`holdPageSelectAll(document)` stops a native Select All (an Edit menu item, or ⌘A nobody handled) from selecting every word on the page. Fields and pointer selections are untouched. Install once before the first render; it returns the uninstall function.

## Labels read

`keys`, only through the `labels` argument.
