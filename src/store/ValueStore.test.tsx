import { act, render, screen } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createValueStore, unheard, type ValueStore } from './ValueStore.js';

describe('createValueStore', () => {
  it('holds its value and tells listeners of a change, not of the same value again', () => {
    const store = createValueStore(1);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set(1);
    expect(listener).not.toHaveBeenCalled();

    store.set(2);
    expect(store.get()).toBe(2);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.set(3);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('draws only the component that follows it', () => {
    const store = createValueStore('idle');
    let outerRenders = 0;

    function Status({ value }: { readonly value: ValueStore<string> }) {
      return <output>{useSyncExternalStore(value.subscribe, value.get)}</output>;
    }

    function Page() {
      outerRenders += 1;
      return <Status value={store} />;
    }

    render(<Page />);
    act(() => store.set('busy'));

    expect(screen.getByRole('status').textContent).toBe('busy');
    expect(outerRenders).toBe(1);
  });
});

describe('unheard', () => {
  it('stands in for a store that is not there yet, then hands over to it', () => {
    function Status({ value }: { readonly value: ValueStore<string> | null }) {
      return (
        <output>
          {useSyncExternalStore(value?.subscribe ?? unheard, () => value?.get() ?? 'none')}
        </output>
      );
    }

    const store = createValueStore('ready');
    const { rerender } = render(<Status value={null} />);
    expect(screen.getByRole('status').textContent).toBe('none');

    rerender(<Status value={store} />);
    act(() => store.set('done'));
    expect(screen.getByRole('status').textContent).toBe('done');
  });
});
