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

  it('keeps its title to one line with nothing beside it, its text a tooltip only while cut', () => {
    const { dialog } = renderDialog();
    const title = screen.getByRole('heading', { name: 'Move to Trash' });

    expect(title.dataset.tooltip).toBe('Move to Trash');
    expect(title.hasAttribute('data-tooltip-cut')).toBe(true);
    expect(dialog.querySelector('.dialog-heading')?.children).toHaveLength(2);
  });

  it('lists its facts as one-line rows of a label, a count, and names', () => {
    render(
      <ConfirmDialog
        confirmLabel="Quit"
        icon={TriangleAlert}
        message="Quitting stops them; their logs are kept."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        facts={[
          { label: 'Terminals', count: 6, value: 'zsh, npm run dev, vite' },
          { label: 'Schedules', value: 'nightly backup' }
        ]}
        title="Quit and Stop 6 Processes?"
      />
    );

    const rows = [...document.querySelectorAll('.dialog-fact')];

    expect(rows.map((row) => row.querySelector('dt')?.textContent)).toEqual([
      'Terminals',
      'Schedules'
    ]);
    expect(rows[0]?.querySelector('.dialog-fact-count')?.textContent).toBe('6');
    expect(rows[0]?.querySelector('.dialog-fact-value')?.getAttribute('data-tooltip-cut')).toBe('');
    // A row without a count draws no count cell.
    expect(rows[1]?.querySelector('.dialog-fact-count')).toBeNull();
  });

  it('lists its paths one line each, the first few and then +N more, out of the Tab order', () => {
    const onConfirm = vi.fn();
    const paths = Array.from({ length: 7 }, (_, index) => `~/projects/site/file-${index}.txt`);

    render(
      <ConfirmDialog
        confirmLabel="Delete"
        icon={Trash2}
        message="Delete these 7 items? This cannot be undone."
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        paths={paths}
        title="Delete 7 Items Now?"
      />
    );

    const dialog = screen.getByRole('dialog');
    const list = screen.getByRole('list', { name: 'Affected items' });
    const items = screen.getAllByRole('listitem');

    expect(items).toHaveLength(5);
    expect(items[0]?.querySelector('.name-cut')).toBeTruthy();
    expect(items.at(-1)?.textContent).toBe('+3 more');
    expect(list.hasAttribute('tabindex')).toBe(false);

    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows every path when they fit its lines', () => {
    render(
      <ConfirmDialog
        confirmLabel="Delete"
        icon={Trash2}
        message="Delete these 2 items?"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        paths={['/a', '/b']}
        title="Delete 2 Items?"
      />
    );

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['/a', '/b']);
  });

  it('takes its leave verb and list name from the labels, and a cancel label over them', () => {
    const { rerender } = render(
      <UiokProvider
        labels={{
          dialog: {
            cancel: 'Abbrechen',
            affectedItems: (count) => `${count} Objekte`,
            moreItems: (count) => `+${count} weitere`
          }
        }}
      >
        <ConfirmDialog
          confirmLabel="Löschen"
          icon={Trash2}
          message="6 Objekte löschen?"
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          paths={['/a', '/b', '/c', '/d', '/e', '/f']}
          title="Löschen"
        />
      </UiokProvider>
    );

    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeTruthy();
    expect(screen.getByRole('list', { name: '6 Objekte' })).toBeTruthy();
    expect(screen.getByText('+2 weitere')).toBeTruthy();

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
          title="Delete Now?"
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
