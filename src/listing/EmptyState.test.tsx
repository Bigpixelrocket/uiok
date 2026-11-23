import { render, screen } from '@testing-library/react';
import { FolderX, Layers } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './EmptyState.js';

describe('EmptyState', () => {
  it('heads the pane, says what it is for, and offers its ways on with their steps', () => {
    render(
      <EmptyState
        actions={
          <>
            <button type="button">Add Runtime…</button>
            <button type="button">Add Service…</button>
          </>
        }
        body="Runtimes come from mise, services from Homebrew."
        detail="Homebrew 4.6.11 · mise 2026.11.2"
        icon={Layers}
        note="Bigpixelrocket's projects.toml holds 3 projects."
        steps={[
          { title: 'Pick a folder', detail: 'any folder of this Mac' },
          { title: 'Start them' }
        ]}
        title="Nothing installed yet"
      />
    );
    const block = screen.getByRole('heading', { level: 2, name: 'Nothing installed yet' })
      .parentElement as HTMLElement;

    expect(block.getAttribute('role')).toBeNull();
    expect(block.querySelector(':scope > svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(block.querySelectorAll('.pane-empty-actions > button')).toHaveLength(2);
    expect(block.querySelector('.pane-empty-note')?.textContent).toContain('3 projects');
    expect(block.querySelector('.pane-empty-detail')?.textContent).toContain('mise');
    expect(screen.getAllByRole('listitem').map((step) => step.textContent)).toEqual([
      '1Pick a folderany folder of this Mac',
      '2Start them'
    ]);
  });

  it('announces a pane that could not load, a host mark in the glyph’s place', () => {
    render(
      <EmptyState
        failure
        icon={FolderX}
        mark={<svg data-testid="mark" />}
        title="The folder could not be read"
      />
    );

    expect(screen.getByRole('alert').textContent).toBe('The folder could not be read');
    expect(screen.getByTestId('mark')).toBeTruthy();
    expect(screen.getByRole('alert').querySelectorAll('svg')).toHaveLength(1);
    expect(screen.queryByRole('list')).toBeNull();
  });
});
