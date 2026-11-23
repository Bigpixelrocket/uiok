import { fireEvent, render, screen } from '@testing-library/react';
import { Table2, Trash2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { TypedNameDialog } from './TypedNameDialog.js';

const open = () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <TypedNameDialog
      confirmLabel="Drop Table"
      facts={[{ label: 'Connection', value: 'shop-prod' }]}
      icon={Trash2}
      itemIcon={Table2}
      items={[{ name: 'orders', detail: 'shop' }]}
      message="This drops the table from a production connection. It cannot be undone."
      name="orders"
      nameLabel="Table name"
      onCancel={onCancel}
      onConfirm={onConfirm}
      title="Drop Table?"
    />
  );
  return { onConfirm, onCancel, field: screen.getByLabelText('Table name') };
};

const deleteNow = { key: 'Backspace', altKey: true, metaKey: true };

describe('the typed-name confirmation', () => {
  it('keeps the verb off until the name is typed exactly, case included', () => {
    const { onConfirm, field } = open();

    fireEvent.change(field, { target: { value: 'Orders' } });
    fireEvent.keyDown(screen.getByRole('dialog'), deleteNow);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: 'orders' } });
    fireEvent.keyDown(screen.getByRole('dialog'), deleteNow);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('never runs the verb on Return, which a drop for good leaves inert', () => {
    const { onConfirm, field } = open();

    fireEvent.change(field, { target: { value: 'orders' } });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('says what to type, and leaves on Escape', () => {
    const { onCancel } = open();

    expect(screen.getByText('Type the name to confirm.')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('draws what the caller adds before the name field', () => {
    render(
      <TypedNameDialog
        confirmLabel="Drop Table"
        icon={Trash2}
        message="This drops the table."
        name="orders"
        nameLabel="Table name"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        title="Drop Table?"
      >
        <label>
          <input type="checkbox" /> Cascade
        </label>
      </TypedNameDialog>
    );

    const cascade = screen.getByLabelText('Cascade');
    const field = screen.getByLabelText('Table name');
    expect(cascade.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
