# Store and render economy (`@bigpixelrocket/uiok/store`)

Small tools that keep large views from rendering more than they must.

## ValueStore

A value held outside React state. Only components that subscribe with `useSyncExternalStore` render when it changes; the component that owns the store does not.

```tsx
import { createValueStore, unheard, type ValueStore } from '@bigpixelrocket/uiok/store';
import { useSyncExternalStore } from 'react';

const cursor = createValueStore(0);
cursor.set(4); // listeners hear it; set(4) again is ignored (Object.is)

function CursorLabel({ store }: { store: ValueStore<number> | null }) {
  const value = useSyncExternalStore(store?.subscribe ?? unheard, () => store?.get() ?? 0);
  return <span>{value}</span>;
}
```

`unheard` is a subscribe function that hears nothing, for when there is no store to follow yet.

## sameData and sameProps

- `sameData(a, b)`: true for the same value, or for plain arrays, plain objects, and React elements (same type and key) whose contents hold the same data. Functions, Sets, Maps, Dates, DOM nodes, and class instances equal only themselves.
- `sameProps`: a `memo` comparator over `sameData`, so a parent can rebuild arrays and elements every render. Function props must keep their identity (see below).

```tsx
const Row = memo(function Row(props: RowProps) { ... }, sameProps);
```

## useStableHandlers

`useStableHandlers({ onOpen, onClose })` returns handlers whose identities never change and that always call the latest versions. Name the same handlers every render, and call them from events only, not during render.

## keepUnchangedById and keepUnchangedBy

`keepUnchangedById(previous, next)` returns `next` with each item that holds the same data as the previous item of the same `id` replaced by that previous object, and returns `previous` itself when nothing changed. Memoized rows then skip updates that did not touch them. `keepUnchangedBy(previous, next, idOf, alike?)` does the same with another key and an optional looser comparison.

## Labels read

None.
