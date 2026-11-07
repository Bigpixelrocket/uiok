/**
 * A value held outside React state: the buttons set it, and only the
 * component that subscribes renders. Each line stamps the time it last
 * rendered, so the owner's stamp stays put while the follower's moves.
 */

import { useState, useSyncExternalStore } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { createValueStore, type ValueStore } from '@bigpixelrocket/uiok/store';

const stamp = (): string => new Date().toISOString().slice(11, 23);

/** Follows the store. */
function Follower({ store }: { readonly store: ValueStore<number> }) {
  const value = useSyncExternalStore(store.subscribe, store.get);
  return (
    <code className="demo-readout">
      follower: reads {value}, rendered at {stamp()}
    </code>
  );
}

/** The store page's demo. */
export function StoreDemo() {
  const [store] = useState(() => createValueStore(0));
  return (
    <div className="demo-stack">
      <div className="demo-row">
        <Button onClick={() => store.set(store.get() + 1)} size="small" variant="tonal">
          Add one
        </Button>
        <Button onClick={() => store.set(store.get())} size="small">
          Set the same value
        </Button>
      </div>
      <Follower store={store} />
      <code className="demo-readout">owner: holds the store, rendered at {stamp()}</code>
    </div>
  );
}
