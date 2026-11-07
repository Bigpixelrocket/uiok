import { render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { DEFAULT_LABELS } from './UiokLabels.js';
import { mergeLabels, UiokProvider, useLabels } from './UiokProvider.js';

describe('useLabels', () => {
  it('gives the English defaults without a provider', () => {
    const { result } = renderHook(() => useLabels());

    expect(result.current).toBe(DEFAULT_LABELS);
    expect(result.current.keys.modifiers.meta).toBe('Command');
  });

  it('merges a partial override over the defaults, record by record', () => {
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <UiokProvider
        labels={{ keys: { modifiers: { meta: 'Befehl' }, names: { Enter: 'Eingabe' } } }}
      >
        {children}
      </UiokProvider>
    );
    const { result } = renderHook(() => useLabels(), { wrapper });

    expect(result.current.keys.modifiers).toEqual({
      ...DEFAULT_LABELS.keys.modifiers,
      meta: 'Befehl'
    });
    expect(result.current.keys.names.Enter).toBe('Eingabe');
    expect(result.current.keys.names.Tab).toBe('Tab');
    expect(result.current.keys.escapeCap).toBe('esc');
  });

  it('lets an inner provider change one label over the outer one', () => {
    function Shift() {
      return (
        <span>{useLabels().keys.modifiers.shift + ' ' + useLabels().keys.modifiers.meta}</span>
      );
    }

    render(
      <UiokProvider labels={{ keys: { modifiers: { meta: 'Cmd' } } }}>
        <UiokProvider labels={{ keys: { modifiers: { shift: 'Umschalt' } } }}>
          <Shift />
        </UiokProvider>
      </UiokProvider>
    );

    expect(screen.getByText('Umschalt Cmd')).toBeDefined();
  });

  it('keeps the merged labels while the override object is the same', () => {
    const labels = { keys: { spaceCap: 'leer' } };
    const { result, rerender } = renderHook(() => useLabels(), {
      wrapper: ({ children }: { readonly children: ReactNode }) => (
        <UiokProvider labels={labels}>{children}</UiokProvider>
      )
    });
    const first = result.current;

    rerender();
    expect(result.current).toBe(first);
  });
});

describe('mergeLabels', () => {
  it('returns the base for no override and skips fields set to undefined', () => {
    expect(mergeLabels(DEFAULT_LABELS, undefined)).toBe(DEFAULT_LABELS);
    expect(mergeLabels(DEFAULT_LABELS, { keys: { spaceCap: undefined } }).keys.spaceCap).toBe(
      'space'
    );
  });

  it('leaves the base untouched', () => {
    mergeLabels(DEFAULT_LABELS, { keys: { modifiers: { alt: 'Alt' } } });

    expect(DEFAULT_LABELS.keys.modifiers.alt).toBe('Option');
  });
});
