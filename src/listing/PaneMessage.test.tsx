import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ModalDialog } from '../dialog/ModalDialog.js';
import { PageNote } from '../frame/PageParts.js';
import { PaneMessage } from './PaneMessage.js';

describe('PaneMessage and PageNote outside a listing scope', () => {
  it('carry the scope themselves, so they keep their look anywhere', () => {
    render(
      <>
        <PaneMessage>Start the server to see its databases.</PaneMessage>
        <PageNote>Installs from the tap.</PageNote>
      </>
    );

    expect(
      screen.getByText('Start the server to see its databases.').parentElement?.className
    ).toBe('listing-root');
    expect(screen.getByText('Installs from the tap.').closest('.listing-root')).not.toBeNull();
  });

  it('add no second scope inside one', () => {
    render(
      <ModalDialog labelId="d" onCancel={() => undefined} title="Install">
        <PaneMessage tone="warning">The tap is not trusted.</PaneMessage>
      </ModalDialog>
    );

    const message = screen.getByText('The tap is not trusted.');

    expect(message.className).toBe('pane-message warning');
    expect(message.parentElement?.getAttribute('role')).toBe('dialog');
  });
});
