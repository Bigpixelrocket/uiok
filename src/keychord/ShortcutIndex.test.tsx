import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ShortcutGroup, ShortcutIndex, ShortcutRow } from './ShortcutIndex.js';

describe('ShortcutIndex', () => {
  it('lists each group under its name, each verb with its chords named in words', () => {
    render(
      <ShortcutIndex label="Keyboard shortcuts">
        <ShortcutGroup title="Services">
          <ShortcutRow chords={[{ key: 'Enter', meta: true }]} verb="Stop" />
          <ShortcutRow changed chords={[{ key: 'r', meta: true }, { key: 'F5' }]} verb="Refresh" />
        </ShortcutGroup>
        <ShortcutGroup title="Window">
          <ShortcutRow
            chords={[]}
            detail="Opens the log in the dock"
            none="No shortcut"
            verb="Console"
          />
        </ShortcutGroup>
      </ShortcutIndex>
    );

    const index = screen.getByRole('region', { name: 'Keyboard shortcuts' });
    const services = screen.getByRole('region', { name: 'Services' });

    expect(index.contains(services)).toBe(true);
    expect(
      screen.getByText('Stop').nextElementSibling?.querySelector('kbd')?.getAttribute('aria-label')
    ).toBe('Command Return');
    expect(
      services.querySelectorAll('.shortcut-row')[1]?.querySelectorAll('kbd[data-tone="accent"]')
    ).toHaveLength(2);
    expect(screen.getByText('No shortcut')).toBeTruthy();
    expect(screen.getByText('Opens the log in the dock')).toBeTruthy();
  });

  it('dims a verb not available where the index was opened', () => {
    render(
      <ShortcutIndex label="Keyboard shortcuts">
        <ShortcutGroup title="Rows">
          <ShortcutRow chords={[{ key: 'Backspace', meta: true }]} dim verb="Delete" />
        </ShortcutGroup>
      </ShortcutIndex>
    );

    expect(screen.getByText('Delete').closest('.shortcut-row')?.classList.contains('dim')).toBe(
      true
    );
  });
});
