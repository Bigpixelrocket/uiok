import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Trash2, TriangleAlert } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { UiokProvider } from '../labels/UiokProvider.js';
import { ConfirmDialog } from './ConfirmDialog.js';

function renderDialog(tone?: 'danger' | 'primary') {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  render(
    <ConfirmDialog
      confirmLabel="Move to Trash"
      context="~/Downloads"
      icon={Trash2}
      message='Move "notes.txt" to the Trash?'
      onCancel={onCancel}
      onConfirm={onConfirm}
      title="Move to Trash"
      tone={tone}
    />
  );

  return { onConfirm, onCancel, dialog: screen.getByRole('dialog') };
}

describe('ConfirmDialog', () => {
  it('confirms on Return from the dialog it focuses, and through its primary slot', () => {
    const { onConfirm, dialog } = renderDialog();

    expect(document.activeElement).toBe(dialog);

    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Move to Trash' }));
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it('cancels on Escape and through the Cancel slot', () => {
    const { onCancel, onConfirm, dialog } = renderDialog();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('wears the danger tone by default and the accent for a primary grant', () => {
    expect(renderDialog().dialog.dataset.tone).toBe('danger');
    cleanup();
    expect(renderDialog('primary').dialog.dataset.tone).toBe('accent');
  });

  it('names where it acts on the title strip', () => {
    const { dialog } = renderDialog();

    expect(dialog.querySelector('.dialog-context')?.textContent).toBe('~/Downloads');
  });

  it('keeps the affected-path list in the keyboard focus cycle, and Return still confirms from it', () => {
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        confirmLabel="Delete Permanently"
        icon={Trash2}
        message="Delete 2 items permanently?"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        paths={['/Library/Example/a', '/Library/Example/b']}
        title="Delete Permanently"
      />
    );

    const dialog = screen.getByRole('dialog');
    const list = screen.getByRole('list', { name: 'Affected items' });

    // The list is the one Tab stop: the slots are reached by their keys.
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(list);
    fireEvent.keyDown(list, { key: 'Tab' });
    expect(document.activeElement).toBe(list);

    fireEvent.keyDown(list, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('takes its leave verb and list name from the labels, and a cancel label over them', () => {
    const { rerender } = render(
      <UiokProvider
        labels={{ dialog: { cancel: 'Abbrechen', affectedItems: (count) => `${count} Objekte` } }}
      >
        <ConfirmDialog
          confirmLabel="Löschen"
          icon={Trash2}
          message="2 Objekte löschen?"
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          paths={['/a', '/b']}
          title="Löschen"
        />
      </UiokProvider>
    );

    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeTruthy();
    expect(screen.getByRole('list', { name: '2 Objekte' })).toBeTruthy();

    rerender(
      <UiokProvider labels={{ dialog: { cancel: 'Abbrechen' } }}>
        <ConfirmDialog
          cancelLabel="Weiter bearbeiten"
          confirmLabel="Verwerfen"
          icon={Trash2}
          message="Änderungen verwerfen?"
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          title="Verwerfen"
        />
      </UiokProvider>
    );

    expect(screen.getByRole('button', { name: 'Weiter bearbeiten' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Abbrechen' })).toBeNull();
  });

  describe('for a delete that cannot be undone', () => {
    function renderForGood() {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      render(
        <ConfirmDialog
          confirmLabel="Delete"
          icon={TriangleAlert}
          message="Storage has no Trash, so “a.txt” will be deleted immediately. You can’t undo this action."
          onCancel={onCancel}
          onConfirm={onConfirm}
          forGood
          title="Delete Immediately"
        />
      );

      return { onConfirm, onCancel, dialog: screen.getByRole('dialog') };
    }

    it('does nothing on Return, so a habit cannot delete for good', () => {
      const { onConfirm, onCancel, dialog } = renderForGood();

      fireEvent.keyDown(dialog, { key: 'Enter' });

      expect(onConfirm).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('stands Delete at the right edge, lit, on its own chord', () => {
      const { dialog } = renderForGood();
      const slots = [...dialog.querySelectorAll('.legend-slot')];

      expect(slots.map((slot) => slot.textContent)).toEqual(['escCancel', 'Delete']);
      expect(slots.at(-1)?.classList.contains('legend-primary')).toBe(true);
      // Its cap draws the chord, Option, Command, and Delete, not Return.
      expect(slots.at(-1)?.querySelectorAll('.key')).toHaveLength(3);
    });

    it('confirms on Option Command Delete, and through its slot', () => {
      const { onConfirm, dialog } = renderForGood();

      fireEvent.keyDown(dialog, { key: 'Backspace', metaKey: true });
      expect(onConfirm).not.toHaveBeenCalled();

      fireEvent.keyDown(dialog, { key: 'Backspace', metaKey: true, altKey: true });
      expect(onConfirm).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(onConfirm).toHaveBeenCalledTimes(2);
    });

    it('ignores the chord while it repeats, so a held key from ⌘⌫ cannot confirm', () => {
      const { onConfirm, dialog } = renderForGood();

      fireEvent.keyDown(dialog, { key: 'Backspace', metaKey: true, altKey: true, repeat: true });

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('still cancels on Escape and through the Cancel slot', () => {
      const { onCancel, dialog } = renderForGood();

      fireEvent.keyDown(dialog, { key: 'Escape' });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onCancel).toHaveBeenCalledTimes(2);
    });
  });
});
