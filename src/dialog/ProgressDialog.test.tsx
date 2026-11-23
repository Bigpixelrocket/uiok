import { fireEvent, render, screen } from '@testing-library/react';
import { Download } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { ProgressDialog } from './ProgressDialog.js';

describe('the progress dialog', () => {
  it('offers Stop on Escape and Run in Background on Return while it runs', () => {
    const onStop = vi.fn();
    const onBackground = vi.fn();
    render(
      <ProgressDialog
        icon={Download}
        onBackground={onBackground}
        onClose={vi.fn()}
        onStop={onStop}
        run={{ state: 'running', headline: 'Exporting shop' }}
        title="Export"
      />
    );

    expect(screen.getByRole('dialog', { name: 'Export' })).toBeTruthy();
    expect(screen.getByText('Exporting shop')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onStop).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
    expect(onBackground).toHaveBeenCalledTimes(1);
  });

  it('does not stop twice while stopping', () => {
    const onStop = vi.fn();
    render(
      <ProgressDialog
        icon={Download}
        onClose={vi.fn()}
        onStop={onStop}
        run={{ state: 'running', headline: 'Stopping…' }}
        stopping
        title="Export"
      />
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onStop).not.toHaveBeenCalled();
  });

  it('offers OK alone once the run settled, on Return and Escape', () => {
    const onClose = vi.fn();
    render(
      <ProgressDialog
        icon={Download}
        onBackground={vi.fn()}
        onClose={onClose}
        onStop={vi.fn()}
        run={{ state: 'failed', headline: 'The export stopped.', reason: 'Disk full' }}
        title="Export"
      />
    );

    expect(screen.getByText('Disk full')).toBeTruthy();
    expect(screen.queryByText('Run in Background')).toBeNull();
    expect(screen.queryByText('Stop')).toBeNull();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('offers Cancel and Try Again on a run that could not start', () => {
    const onTryAgain = vi.fn();
    const onClose = vi.fn();
    render(
      <ProgressDialog
        icon={Download}
        onClose={onClose}
        onTryAgain={onTryAgain}
        run={{ state: 'failed', headline: 'The file could not be read.' }}
        title="Import"
      />
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
    expect(onTryAgain).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
