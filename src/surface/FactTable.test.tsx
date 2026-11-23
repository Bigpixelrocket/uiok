import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { FactRow, FactTable } from './FactTable.js';

describe('FactTable', () => {
  it('is a named table of rows, each with its state glyph named and its cells', () => {
    render(
      <FactTable label="Tools">
        <FactRow
          detail="/opt/homebrew/bin/brew"
          name="Homebrew"
          tone="ready"
          toneLabel="Found"
          value="4.6.11"
        />
        <FactRow name="mise" tone="danger" toneLabel="Missing" />
      </FactTable>
    );
    const table = screen.getByRole('table', { name: 'Tools' });
    const [found, missing] = within(table).getAllByRole('row');

    expect(within(found as HTMLElement).getByRole('img', { name: 'Found' })).toBeTruthy();
    expect(
      within(found as HTMLElement)
        .getAllByRole('cell')
        .map((cell) => cell.textContent)
    ).toEqual(['', 'Homebrew', '/opt/homebrew/bin/brew', '4.6.11']);
    expect(within(missing as HTMLElement).getByRole('img', { name: 'Missing' })).toBeTruthy();
    expect((missing as HTMLElement).dataset.tone).toBe('danger');
  });

  it('draws each state glyph in its text tone', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const { container } = render(
      <FactTable label="Tools">
        <FactRow name="a" tone="ready" toneLabel="Found" />
        <FactRow name="b" tone="warning" toneLabel="Old" />
        <FactRow name="c" tone="danger" toneLabel="Missing" />
        <FactRow name="d" tone="muted" toneLabel="Not checked" />
      </FactTable>
    );
    const tones = [...container.querySelectorAll('.fact-state')].map((state) =>
      declaredValues(state as HTMLElement, 'color').at(-1)
    );

    expect(tones).toEqual([
      'var(--success-text)',
      'var(--warning-text)',
      'var(--danger-text)',
      'var(--text-dim)'
    ]);
  });
});
