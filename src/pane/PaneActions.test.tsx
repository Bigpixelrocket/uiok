import { render, screen } from '@testing-library/react';
import { Trash2 } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { RowIconAction } from './PaneActions.js';

describe('RowIconAction shortcut', () => {
  it('writes its chord after the words in its tooltip', () => {
    render(<RowIconAction icon={Trash2} label="Drop…" onClick={() => undefined} shortcut="⌘⌫" />);

    const drop = screen.getByRole('button', { name: 'Drop…' });

    expect(drop.dataset.tooltip).toBe('Drop…');
    expect(drop.dataset.tooltipShortcut).toBe('⌘⌫');
  });

  it('keeps a described tooltip and its chord together', () => {
    render(
      <RowIconAction
        icon={Trash2}
        label="Drop orders"
        onClick={() => undefined}
        shortcut="⌘⌫"
        tip="Drop the table orders"
      />
    );

    const drop = screen.getByRole('button', { name: 'Drop orders' });

    expect(drop.dataset.tooltipShortcut).toBe('⌘⌫');
  });

  it('names no chord without one', () => {
    render(<RowIconAction icon={Trash2} label="Drop…" onClick={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Drop…' }).dataset.tooltipShortcut).toBeUndefined();
  });
});
